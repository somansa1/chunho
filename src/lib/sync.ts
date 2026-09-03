import { createClient, type RealtimeChannel, type SupabaseClient } from "@supabase/supabase-js";
import type { HistoryEntry, Menu, Settings, Tonight } from "../types";

export interface SyncConfig {
  url: string;
  anonKey: string;
  roomCode: string;
}

/** 두 기기가 공유하는 저녁 기록 문서 */
export interface SyncDoc {
  menus: Menu[];
  history: HistoryEntry[];
  settings: Settings;
  tonight: Tonight | null;
  /** 마지막으로 저장한 시각 (ms) — 나중 값이 이긴다 */
  savedAt: number;
}

export type SyncStatus = "off" | "connecting" | "online" | "error";

const TABLE = "dinner_sync";

const ROOM_WORDS = [
  "비빔",
  "김치",
  "순두부",
  "제육",
  "잡채",
  "떡볶이",
  "불고기",
  "만두",
  "갈비",
  "찌개",
  "부침개",
  "달걀",
];

const SUFFIX_CHARS = "abcdefghjkmnpqrstuvwxyz23456789";

export function generateRoomCode(): string {
  const word = ROOM_WORDS[Math.floor(Math.random() * ROOM_WORDS.length)];
  const num = Math.floor(1000 + Math.random() * 9000);
  let suffix = "";
  for (let i = 0; i < 3; i++) suffix += SUFFIX_CHARS[Math.floor(Math.random() * SUFFIX_CHARS.length)];
  return `${word}-${num}-${suffix}`;
}

/** 배포할 때 환경변수(VITE_SYNC_URL / VITE_SYNC_ANON_KEY)가 들어있으면 → 내장 연결 모드 */
export function getEmbeddedSyncConfig(): { url: string; anonKey: string } | null {
  const url = import.meta.env.VITE_SYNC_URL?.trim();
  const anonKey = import.meta.env.VITE_SYNC_ANON_KEY?.trim();
  if (url && anonKey) return { url, anonKey };
  return null;
}

export function validateSyncInput(url: string, anonKey: string): string | null {
  const u = url.trim();
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(u)) {
    return "프로젝트 URL 형식이 아니에요. 예) https://xxxxsupabase.co";
  }
  const k = anonKey.trim();
  if (!k.startsWith("eyJ") || k.length < 40) {
    return "anon public 키가 아니에요. Project Settings → API에서 「anon」「public」 키를 복사하세요.";
  }
  return null;
}

export interface SyncEvents {
  onStatus: (status: SyncStatus, message: string) => void;
  /** 상대방(또는 처음 연결 시 방에 있던) 데이터 도착 */
  onRemote: (doc: SyncDoc, kind: "initial" | "live") => void;
  /** 내 데이터 업로드 성공 */
  onPushed: (savedAt: number) => void;
  /** 초기 로딩(방 확인/생성) 완료 — 이 시점 이후부터 업로드 허용 */
  onReady: () => void;
  /** 지금 방에 접속 중인 기기 수 */
  onPresence?: (count: number) => void;
  /** 파트너가 손 흔들기 보냄 */
  onWave?: () => void;
}

export interface SyncHandle {
  push: (doc: SyncDoc) => Promise<boolean>;
  disconnect: () => void;
  /** 파트너에게 손 흔들기 */
  wave: () => void;
}

function isSyncDoc(x: unknown): x is SyncDoc {
  const d = x as SyncDoc;
  return !!d && Array.isArray(d.menus) && Array.isArray(d.history) && typeof d.savedAt === "number";
}

/** 자동 새로고침 주기 — 실시간이 안 되는 환경에서도 이 간격으로 최신 상태를 가져와요 */
const POLL_MS = 12000;

export function connectSync(cfg: SyncConfig, getInitialDoc: () => SyncDoc, ev: SyncEvents): SyncHandle {
  const client: SupabaseClient = createClient(cfg.url.trim(), cfg.anonKey.trim());
  let disposed = false;
  let realtimeOk = false;
  let ready = false;

  const setOnline = () =>
    ev.onStatus("online", realtimeOk ? "실시간 연결됨 — 바뀌는 즉시 반영돼요." : "자동 새로고침(12초)으로 동기화 중이에요.");

  /** 서버에서 방 문서 가져오기 — 최신이면 화면에 반영 */
  const pull = async () => {
    if (disposed) return;
    const { data, error } = await client.from(TABLE).select("payload").eq("doc_id", cfg.roomCode).maybeSingle();
    if (disposed) return;
    if (error) {
      ev.onStatus("error", `서버 확인 실패: ${error.message}`);
      return;
    }
    setOnline();
    const doc = data?.payload;
    if (isSyncDoc(doc)) ev.onRemote(doc, "live");
  };

  // 실시간 채널 — 필터 없이 구독하고(한글 방 코드 필터 문제 회피) 방 코드는 여기서 비교
  const channel: RealtimeChannel = client
    .channel(`dinner-duo-${cfg.roomCode}`)
    .on("postgres_changes", { event: "*", schema: "public", table: TABLE }, (payload) => {
      const next = payload.new as { doc_id?: string; payload?: unknown } | null;
      if (next && next.doc_id === cfg.roomCode && isSyncDoc(next.payload)) ev.onRemote(next.payload, "live");
    })
    // 지금 방에 몇 명이 있는지 실시간 감지
    .on("presence", { event: "sync" }, () => {
      if (disposed) return;
      ev.onPresence?.(Object.keys(channel.presenceState()).length);
    })
    // 파트너의 손 흔들기 수신
    .on("broadcast", { event: "wave" }, () => {
      if (!disposed) ev.onWave?.();
    })
    .subscribe(async (status) => {
      if (disposed) return;
      if (status === "SUBSCRIBED") {
        realtimeOk = true;
        // 접속자 등록 — 이걸로 상대 화면에 내가 보여요
        try {
          await channel.track({ joinedAt: Date.now() });
        } catch {
          /* presence 미지원 시 무시 */
        }
        setOnline();
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        realtimeOk = false;
        if (ready) setOnline(); // 실시간이 죽어도 자동 새로고침으로 계속 동작
      }
    });

  ev.onStatus("connecting", "공유 냉장고 문을 여는 중…");

  // 방에 문서가 없으면 내 데이터로 만들고, 있으면 그걸로 시작
  (async () => {
    const { data, error } = await client.from(TABLE).select("payload").eq("doc_id", cfg.roomCode).maybeSingle();
    if (disposed) return;
    if (error) {
      ev.onStatus("error", `Supabase에 연결하지 못했어요: ${error.message}`);
      return;
    }
    const existing = data?.payload;
    if (isSyncDoc(existing)) {
      ev.onRemote(existing, "initial");
      ev.onStatus("online", "방에 연결됐어요. 이제 둘이 같이 써요!");
    } else {
      const seed = getInitialDoc();
      const { error: upErr } = await client
        .from(TABLE)
        .upsert({ doc_id: cfg.roomCode, payload: seed, updated_at: new Date().toISOString() });
      if (disposed) return;
      if (upErr) {
        ev.onStatus("error", `방을 만들지 못했어요: ${upErr.message}`);
        return;
      }
      ev.onPushed(seed.savedAt);
      ev.onStatus("online", "새 같이쓰기 방을 열었어요. 초대 링크를 보내세요!");
    }
    ready = true;
    setOnline();
    ev.onReady();
  })();

  // 자동 새로고침 + 화면을 켤 때마다 즉시 확인 (폰에서 앱 열면 바로 최신!)
  const interval = window.setInterval(() => void pull(), POLL_MS);
  const onVisible = () => {
    if (!disposed && document.visibilityState === "visible") void pull();
  };
  document.addEventListener("visibilitychange", onVisible);

  return {
    async push(doc) {
      if (disposed) return false;
      const { error } = await client
        .from(TABLE)
        .upsert({ doc_id: cfg.roomCode, payload: doc, updated_at: new Date().toISOString() });
      if (error) {
        ev.onStatus("error", `동기화 실패: ${error.message}`);
        return false;
      }
      ev.onPushed(doc.savedAt);
      setOnline();
      return true;
    },
    wave() {
      if (disposed) return;
      void channel.send({ type: "broadcast", event: "wave", payload: { at: Date.now() } });
    },
    disconnect() {
      disposed = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      client.removeChannel(channel).catch(() => {
        /* 이미 닫힘 */
      });
    },
  };
}

/** 초대 링크 — 방 코드에 URL·키까지 담아서 보내면 상대방은 누르기만 하면 돼요 */
export function inviteLinkFor(roomCode: string, url?: string, anonKey?: string): string {
  const base = `${location.origin}${location.pathname}`;
  const params = new URLSearchParams({ room: roomCode });
  if (url) params.set("u", url);
  if (anonKey) params.set("k", anonKey);
  return `${base}?${params.toString()}`;
}

export interface InviteParams {
  room: string | null;
  url: string | null;
  key: string | null;
}

export function readInviteParams(): InviteParams {
  const sp = new URLSearchParams(location.search);
  return { room: sp.get("room"), url: sp.get("u"), key: sp.get("k") };
}
