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

export function generateRoomCode(): string {
  const word = ROOM_WORDS[Math.floor(Math.random() * ROOM_WORDS.length)];
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${word}-${num}`;
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
}

export interface SyncHandle {
  push: (doc: SyncDoc) => Promise<boolean>;
  disconnect: () => void;
}

function isSyncDoc(x: unknown): x is SyncDoc {
  const d = x as SyncDoc;
  return !!d && Array.isArray(d.menus) && Array.isArray(d.history) && typeof d.savedAt === "number";
}

export function connectSync(cfg: SyncConfig, getInitialDoc: () => SyncDoc, ev: SyncEvents): SyncHandle {
  const client: SupabaseClient = createClient(cfg.url.trim(), cfg.anonKey.trim());
  const channelName = `dinner-duo-${cfg.roomCode}`;
  let disposed = false;

  const channel: RealtimeChannel = client
    .channel(channelName)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: TABLE, filter: `doc_id=eq.${cfg.roomCode}` },
      (payload) => {
        const next = (payload.new as { payload?: unknown } | null)?.payload;
        if (isSyncDoc(next)) ev.onRemote(next, "live");
      }
    )
    .subscribe((status) => {
      if (disposed) return;
      if (status === "SUBSCRIBED") ev.onStatus("online", "실시간 연결 완료 — 변경사항이 바로 동기화돼요.");
      else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT")
        ev.onStatus("error", "실시간 연결에 실패했어요. 인터넷 연결을 확인해 주세요.");
    });

  ev.onStatus("connecting", "공유 냉장고 문을 여는 중…");

  // 1) 방에 이미 문서가 있나 확인 → 있으면 가져오고, 없으면 내 데이터로 방 만들기
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
      ev.onStatus("online", "새 같이쓰기 방을 열었어요. 방 코드를 와이프께 알려주세요!");
    }
    ev.onReady();
  })();

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
      ev.onStatus("online", "");
      return true;
    },
    disconnect() {
      disposed = true;
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
