import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { SyncConfig, SyncStatus } from "../lib/sync";
import {
  generateRoomCode,
  getEmbeddedSyncConfig,
  inviteLinkFor,
  readInviteParams,
  validateSyncInput,
} from "../lib/sync";
import {
  CheckIcon,
  CloudIcon,
  CopyIcon,
  LinkIcon,
  PhoneIcon,
  RefreshIcon,
  ShareIcon,
  TrashIcon,
  XIcon,
} from "./icons";

interface Props {
  config: SyncConfig | null;
  status: SyncStatus;
  statusMessage: string;
  lastSyncAt: number | null;
  menuCount: number;
  historyCount: number;
  onlineCount: number;
  onEnable: (cfg: SyncConfig) => void;
  onDisable: () => void;
  onForceSync: () => void;
  onWave: () => void;
}

const SETUP_SQL = `-- 1) 동기화 테이블 만들기
create table if not exists public.dinner_sync (
  doc_id text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

-- 2) 웹에서 anon 키로 접근 허용 (RLS)
alter table public.dinner_sync enable row level security;
drop policy if exists "dinner duo sync" on public.dinner_sync;
create policy "dinner duo sync" on public.dinner_sync
  for all to anon using (true) with check (true);

-- 3) 실시간 동기화 켜기 (선택 — 안 돼도 12초 자동 새로고침으로 동기화돼요)
-- (이미 추가돼 있다는 에러가 나오면 무시하고 넘어가면 돼요)
alter publication supabase_realtime add table public.dinner_sync;`;

function timeAgo(ts: number | null): string {
  if (!ts) return "아직 없음";
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 8) return "방금 전";
  if (s < 60) return `${s}초 전`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

function useCopy() {
  const [copiedKey, setCopiedKey] = useState("");
  const copy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } catch {
        /* 복사 불가 환경 */
      }
      ta.remove();
    }
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey((k) => (k === key ? "" : k)), 1800);
  };
  return { copiedKey, copy };
}

export default function SyncTab({
  config,
  status,
  statusMessage,
  lastSyncAt,
  menuCount,
  historyCount,
  onlineCount,
  onEnable,
  onDisable,
  onForceSync,
  onWave,
}: Props) {
  const invited = useMemo(() => readInviteParams(), []);
  const embedded = useMemo(() => getEmbeddedSyncConfig(), []);
  const easyMode = !!embedded;
  const effectiveUrl = invited.url ?? embedded?.url ?? null;
  const effectiveKey = invited.key ?? embedded?.anonKey ?? null;

  const [url, setUrl] = useState(() => invited.url ?? embedded?.url ?? "");
  const [anonKey, setAnonKey] = useState(() => invited.key ?? embedded?.anonKey ?? "");
  const [room, setRoom] = useState(() => invited.room ?? generateRoomCode());
  const [formError, setFormError] = useState("");
  const [armedStop, setArmedStop] = useState(false);
  const [, setTick] = useState(0);
  const { copiedKey, copy } = useCopy();
  const autoStarted = useRef(false);

  useEffect(() => {
    if (!config) return;
    const t = window.setInterval(() => setTick((n) => n + 1), 15000);
    return () => window.clearInterval(t);
  }, [config]);

  // 초대 링크로 오거나 내장 연결이 있으면 알아서 연결 시작
  useEffect(() => {
    if (config || autoStarted.current) return;
    if (!invited.room || !effectiveUrl || !effectiveKey) return;
    if (validateSyncInput(effectiveUrl, effectiveKey)) return;
    autoStarted.current = true;
    const t = window.setTimeout(() => {
      onEnable({
        url: effectiveUrl.trim().replace(/\/+$/, ""),
        anonKey: effectiveKey.trim(),
        roomCode: invited.room!.trim(),
      });
    }, 350);
    return () => window.clearTimeout(t);
  }, [config, invited, effectiveUrl, effectiveKey, onEnable]);

  const inviteLink = easyMode
    ? inviteLinkFor(room)
    : inviteLinkFor(room, url.trim() || undefined, anonKey.trim() || undefined);
  const fullInviteLink = config
    ? easyMode
      ? inviteLinkFor(config.roomCode)
      : inviteLinkFor(config.roomCode, config.url, config.anonKey)
    : inviteLink;
  const wifeMessage = easyMode
    ? `💌 우리 저녁 당번 앱 초대!\n\n이 링크를 눌러보세요 🍲\n${fullInviteLink}\n\n누르기만 하면 자동으로 연결돼요. 가입도, 설정도 필요 없어요 ❤️`
    : `💌 우리 저녁 당번 앱 초대!\n\n이 링크를 눌러보세요 🍲\n${fullInviteLink}\n\n누르면 자동으로 연결이 시작돼요. (링크에 URL·키가 다 들어있어요 — 우리 둘만 공유해요 ❤️)`;

  function submit() {
    const err = validateSyncInput(url, anonKey);
    if (err) {
      setFormError(err);
      return;
    }
    if (!room.trim()) {
      setFormError("방 코드를 입력하거나 새로 만들어 주세요.");
      return;
    }
    setFormError("");
    onEnable({ url: url.trim().replace(/\/+$/, ""), anonKey: anonKey.trim(), roomCode: room.trim() });
  }

  /* ================= 함께 쓰는 중 ================= */
  if (config) {
    const dot =
      status === "online" ? "bg-ssam" : status === "connecting" ? "bg-egg-deep" : status === "error" ? "bg-tomato" : "bg-line";
    const statusLabel =
      status === "online" ? "같이 쓰는 중" : status === "connecting" ? "연결 중…" : status === "error" ? "연결 오류" : "꺼짐";

    return (
      <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr] lg:items-start">
        {/* 방 카드 */}
        <section className="rounded-3xl border-[3px] border-ink bg-ink p-6 text-paper shadow-lift sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 font-display text-2xl text-egg">
              <ShareIcon size={22} /> 우리의 저녁 방
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-paper/25 px-3.5 py-1 font-display text-sm">
                <span className={`h-2.5 w-2.5 rounded-full ${dot} ${status === "online" ? "animate-pulse" : ""}`} />
                {statusLabel}
              </span>
              {status === "online" && (
                <span className="anim-pop inline-flex items-center gap-1.5 rounded-full bg-egg px-3.5 py-1 font-display text-sm text-ink">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-tomato opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-tomato" />
                  </span>
                  지금 {onlineCount}명 접속
                </span>
              )}
            </div>
          </div>

          <p className="mt-1.5 text-sm font-light text-mist/80">
            이 방 코드가 들어간 기기는 저녁 기록을 <b className="font-semibold text-egg">실시간으로 공유</b>해요. 실시간 알림이 안
            닿는 환경이어도 <b className="font-semibold text-egg">12초 자동 새로고침</b>으로 맞춰지고, 앱을 여는 순간 바로 최신이
            돼요.
          </p>

          <div className="mt-5 rounded-2xl bg-paper/10 p-4 text-center sm:p-5">
            <p className="text-xs font-semibold tracking-widest text-mist/70">방 코드</p>
            <p className="mt-1 select-all break-all font-display text-3xl leading-tight tracking-wide text-paper sm:text-4xl lg:text-5xl">
              {config.roomCode}
            </p>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <button
              onClick={() => copy("code", config.roomCode)}
              className="btn-sign inline-flex items-center justify-center gap-2 rounded-full bg-egg px-4 py-2.5 font-display text-ink"
            >
              {copiedKey === "code" ? <CheckIcon size={17} /> : <CopyIcon size={17} />}
              {copiedKey === "code" ? "복사됐어요!" : "방 코드 복사"}
            </button>
            <button
              onClick={() => copy("link", fullInviteLink)}
              className="btn-sign btn-sign-ink inline-flex items-center justify-center gap-2 rounded-full bg-tomato px-4 py-2.5 font-display text-card"
            >
              {copiedKey === "link" ? <CheckIcon size={17} /> : <LinkIcon size={17} />}
              {copiedKey === "link" ? "복사됐어요!" : "초대 링크 복사"}
            </button>
          </div>

          {/* 연결 상태 바로 확인 — 파트너에게 손 흔들기 */}
          <button
            onClick={onWave}
            disabled={status !== "online"}
            className="btn-sign mt-2.5 flex w-full items-center justify-center gap-2.5 rounded-2xl border-2 border-egg/60 bg-paper/10 px-4 py-3.5 font-display text-lg text-egg transition hover:bg-paper/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <motion.span
              animate={status === "online" ? { rotate: [0, -18, 14, -18, 14, 0] } : {}}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              className="text-2xl"
            >
              👋
            </motion.span>
            파트너에게 손 흔들기 — 연결 확인
          </button>
          <p className="mt-1.5 text-center text-[11px] font-light text-mist/60">
            누르면 상대 화면에 👋가 크게 떠요. 이게 보이면 둘이 제대로 이어진 거예요!
          </p>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-paper/15 pt-4">
            <p className="text-sm font-light text-mist">
              마지막 동기화 <b className="font-semibold text-paper">{timeAgo(lastSyncAt)}</b>
              <span className="mx-2 text-paper/30">·</span>
              메뉴 {menuCount} · 이력 {historyCount}건 공유 중
            </p>
            <button
              onClick={onForceSync}
              className="inline-flex items-center gap-1.5 rounded-full border-2 border-mist/40 px-4 py-1.5 font-display text-sm text-mist transition hover:border-egg hover:text-egg"
            >
              <RefreshIcon size={15} /> 지금 동기화
            </button>
          </div>

          {status === "error" && statusMessage && (
            <p className="mt-3 rounded-xl bg-tomato/20 px-4 py-2.5 text-sm font-medium text-[#ffb4a6]">{statusMessage}</p>
          )}

          {/* 사용 중지 */}
          <div className="mt-5 border-t border-paper/15 pt-4">
            {armedStop ? (
              <div className="flex flex-wrap items-center gap-2.5">
                <p className="text-sm font-medium text-mist">동기화만 꺼요. 기록은 이 기기에 남아있어요.</p>
                <button
                  onClick={() => {
                    onDisable();
                    setArmedStop(false);
                  }}
                  className="anim-pop rounded-full bg-tomato px-4 py-1.5 font-display text-sm text-card"
                >
                  진짜 끌래요
                </button>
                <button
                  onClick={() => setArmedStop(false)}
                  className="rounded-full border border-mist/40 px-4 py-1.5 font-display text-sm text-mist"
                >
                  취소
                </button>
              </div>
            ) : (
              <button
                onClick={() => setArmedStop(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-paper/20 px-4 py-1.5 text-xs font-medium text-mist/70 transition hover:border-tomato hover:text-[#ffb4a6]"
              >
                <TrashIcon size={13} /> 같이 쓰기 중지
              </button>
            )}
          </div>
        </section>

        {/* 와이프 기기 안내 */}
        <aside className="space-y-4">
          <div className="card-line rounded-2xl bg-card p-5 shadow-sm">
            <h3 className="flex items-center gap-2 font-display text-lg text-ink">
              <PhoneIcon size={19} className="text-tomato" /> 와이프에게 보낼 내용 (한 번에 복사)
            </h3>
            <p className="mt-2 text-sm font-light leading-relaxed text-ink-soft">
              링크 하나에 <b className="font-semibold text-ink">방 코드·URL·키가 전부 담겨 있어요</b>. 복사해서 카톡으로 보내면, 와이프는{" "}
              <b className="font-semibold text-ink">링크만 누르면 자동으로 연결</b>돼요. 붙여넣을 것도 없어요!
            </p>
            <div className="relative mt-3">
              <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-xl border-2 border-dashed border-ssam/50 bg-mist/40 p-4 pr-24 text-xs leading-relaxed text-ink">
                {wifeMessage}
              </pre>
              <button
                onClick={() => copy("message", wifeMessage)}
                className="btn-sign btn-sign-green absolute right-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-full bg-ssam px-3.5 py-1.5 font-display text-xs text-card"
              >
                {copiedKey === "message" ? <CheckIcon size={13} /> : <CopyIcon size={13} />}
                {copiedKey === "message" ? "복사 완료!" : "전체 복사"}
              </button>
            </div>
          </div>

          <div className="card-line rounded-2xl bg-card p-5 shadow-sm">
            <h3 className="flex items-center gap-2 font-display text-lg text-ink">
              <ShareIcon size={18} className="text-ssam" /> 보낸 뒤, 이렇게 돼요
            </h3>
            <ol className="mt-3 space-y-3 text-sm font-light leading-relaxed text-ink-soft">
              <li className="flex gap-2.5">
                <MiniNum>1</MiniNum>
                <span>
                  와이프가 <b className="font-semibold text-ink">링크를 누르면</b> 앱이 열리면서{" "}
                  <b className="font-semibold text-ink">「초대 링크로 자동 연결되는 중」</b>이라고 떠요.
                </span>
              </li>
              <li className="flex gap-2.5">
                <MiniNum>2</MiniNum>
                <span>
                  1~2초 뒤 <b className="font-semibold text-ink">「같이 쓰는 중」</b> 배지가 켜지면서 연결 완료 — 붙여넣을 것도 없어요.
                </span>
              </li>
              <li className="flex gap-2.5">
                <MiniNum>3</MiniNum>
                <span>
                  그 순간부터 <b className="font-semibold text-ink">한쪽에서 고르면 다른 쪽에 1초 만에</b> 떠요.
                </span>
              </li>
            </ol>
          </div>

          <div className="card-line rounded-2xl bg-mist/50 p-5 text-sm font-light leading-relaxed text-ink-soft">
            <h3 className="mb-2 flex items-center gap-2 font-display text-base text-ink">
              <CloudIcon size={17} className="text-ssam" /> 알아둘 점
            </h3>
            <ul className="list-disc space-y-1.5 pl-4">
              <li>
                데이터는 <b className="font-semibold text-ink">Supabase 무료 서버</b>에 저장돼요. 저녁 기록 정도는 평생 써도 무료
                한참 아래예요.
              </li>
              <li>
                <b className="font-semibold text-ink">초대 링크에 연결 키가 들어 있어요.</b> 방 코드와 마찬가지로 둘만 공유하세요 —
                링크가 있으면 방을 열고 쓸 수 있어요.
              </li>
              <li>같은 방을 쓰는 기기끼리는 메뉴·이력·오늘 저녁이 통째로 일치해요.</li>
              <li>
                방 카드 위 <b className="font-semibold text-ink">「지금 N명 접속」</b> 배지로 누가 켜 있는지 알 수 있고,{" "}
                <b className="font-semibold text-ink">「👋 손 흔들기」</b>를 누르면 상대 화면에 크게 떠서 연결 여부를 바로 확인할 수
                있어요.
              </li>
              <li>동기화를 꺼도 지금까지의 기록은 이 기기에 그대로 남아요.</li>
            </ul>
          </div>
        </aside>
      </div>
    );
  }

  /* ================= 설정 마법사 ================= */
  return (
    <div>
      {/* 왜 필요한가 */}
      <section className="card-line rounded-2xl bg-card p-6 shadow-sm sm:p-7">
        <h2 className="flex items-center gap-2.5 font-display text-2xl text-ink sm:text-3xl">
          <ShareIcon size={26} className="text-tomato" /> 와이프랑 같이 쓰기
        </h2>
        <p className="mt-2 max-w-2xl text-[15px] font-light leading-relaxed text-ink-soft">
          저녁 기록을 <b className="font-semibold text-ink">기기마다 따로</b> 저장하면 상대방이 골라둔 메뉴가 안 보여요. 동기화를
          켜면 — 상대방이 저녁을 고르는 순간 <b className="font-semibold text-tomato-deep">이 화면에 바로</b> 뜹니다.
          {easyMode ? (
            <>
              {" "}
              <b className="font-semibold text-ssam-deep">이 사이트는 내장 연결이 돼 있어서 방 코드만 있으면 끝!</b> 커플끼리, 친구끼리
              누구나 바로 쓸 수 있어요.
            </>
          ) : (
            <>
              {" "}
              무료 서비스인 <b className="font-semibold text-ink">Supabase</b>를 둘만의 공유 냉장고처럼 쓰면 돼요. 아래 4단계만 따라
              하면 돼요. (5분 컷)
            </>
          )}
        </p>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_1fr] lg:items-start">
        {/* 단계들 */}
        <div className="space-y-4">
          {easyMode ? (
            <StepCard n={1} title="가입·설정이 필요 없어요 — 내장 연결!">
              <p>
                이 사이트는 <b className="font-semibold text-ink">동기화 서버가 이미 연결돼 있어서</b> Supabase 가입, SQL 실행, 키
                복사 같은 게 <b className="font-semibold text-ink">전부 필요 없어요</b>. 오른쪽에서 방 코드를 정하고「같이 쓰기
                시작!」만 누르면 끝 — 친구 커플에게 이 주소를 알려줘도 똑같이 바로 쓸 수 있어요.
              </p>
            </StepCard>
          ) : (
          <>
          <StepCard n={1} title="Supabase 무료 가입 + 프로젝트 만들기">
            <GoLink href="https://supabase.com/dashboard" label="Supabase 대시보드 새 탭으로 열기" />
            <ul className="mt-2.5 space-y-1.5">
              <li className="flex gap-2">
                <MiniNum>①</MiniNum>
                <span>
                  <b className="font-semibold text-ink">supabase.com</b> → <b className="font-semibold text-ink">Start your project</b> → 구글
                  또는 GitHub 계정으로 가입 (카드 등록 없이 무료)
                </span>
              </li>
              <li className="flex gap-2">
                <MiniNum>②</MiniNum>
                <span>
                  대시보드에서 <b className="font-semibold text-ink">New Project</b> 버튼 (오른쪽 위) 누르기
                </span>
              </li>
              <li className="flex gap-2">
                <MiniNum>③</MiniNum>
                <span>
                  이름 아무거나(예: <code className="rounded bg-mist px-1.5 py-0.5 font-mono text-xs">dinner</code>), Database
                  Password는 자동으로 만들어 주니 그냥 두기, <b className="font-semibold text-ink">Region</b>은{" "}
                  <b className="font-semibold text-ink">Northeast Asia (Tokyo)</b> 추천, 요금제는 Free →{" "}
                  <b className="font-semibold text-ink">Create new project</b>
                </span>
              </li>
              <li className="flex gap-2">
                <MiniNum>④</MiniNum>
                <span>1~2분 기다리면 화면이 완성돼요. 커피 한 모금.</span>
              </li>
            </ul>
          </StepCard>

          <StepCard n={2} title="SQL 한 번 실행하기 (복붙만 하면 돼요)">
            <ul className="space-y-1.5">
              <li className="flex gap-2">
                <MiniNum>①</MiniNum>
                <span>
                  왼쪽 아이콘 메뉴에서 <b className="font-semibold text-ink">SQL Editor</b> 누르기 (터미널 모양 아이콘)
                </span>
              </li>
              <li className="flex gap-2">
                <MiniNum>②</MiniNum>
                <span>
                  <b className="font-semibold text-ink">New query</b> 버튼 누르기
                </span>
              </li>
              <li className="flex gap-2">
                <MiniNum>③</MiniNum>
                <span>
                  아래 SQL을 <b className="font-semibold text-ink">통째로 붙여넣고</b> 아래쪽 초록 <b className="font-semibold text-ink">Run</b>{" "}
                  버튼 누르기 (Ctrl+Enter도 됨)
                </span>
              </li>
              <li className="flex gap-2">
                <MiniNum>④</MiniNum>
                <span>
                  아래 결과창에 <b className="font-semibold text-ssam-deep">Success. No rows returned</b> 라고 나오면 성공이에요! (데이터가
                  없는 게 정상이에요)
                </span>
              </li>
            </ul>
            <div className="relative mt-3">
              <pre className="overflow-x-auto rounded-xl border-2 border-ink bg-ink p-4 font-mono text-[11.5px] leading-relaxed text-mist">
                {SETUP_SQL}
              </pre>
              <button
                onClick={() => copy("sql", SETUP_SQL)}
                className="absolute right-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-full bg-egg px-3 py-1 font-display text-xs text-ink transition hover:bg-paper"
              >
                {copiedKey === "sql" ? <CheckIcon size={13} /> : <CopyIcon size={13} />}
                {copiedKey === "sql" ? "복사 완료!" : "SQL 복사"}
              </button>
            </div>
            <p className="mt-2.5 rounded-xl bg-egg/20 px-3.5 py-2 text-xs font-medium leading-relaxed text-[#8a6200]">
              혹시 다시 실행했는데 <b>already added to publication</b> 같은 에러가 나와도 괜찮아요 — 표는 이미 만들어진 거예요.
            </p>
          </StepCard>

          <StepCard n={3} title="URL이랑 키 2개 가져오기">
            <ul className="space-y-1.5">
              <li className="flex gap-2">
                <MiniNum>①</MiniNum>
                <span>
                  왼쪽 메뉴 맨 아래 <b className="font-semibold text-ink">톱니바퀴 아이콘 (Project Settings)</b> 누르기
                </span>
              </li>
              <li className="flex gap-2">
                <MiniNum>②</MiniNum>
                <span>
                  설정 메뉴에서 <b className="font-semibold text-ink">API</b> 누르기
                </span>
              </li>
              <li className="flex gap-2">
                <MiniNum>③</MiniNum>
                <span>
                  <b className="font-semibold text-ink">Project URL</b> 옆 복사 버튼 — <code className="rounded bg-mist px-1.5 py-0.5 font-mono text-xs">https://xxxx.supabase.co</code>{" "}
                  모양이에요
                </span>
              </li>
              <li className="flex gap-2">
                <MiniNum>④</MiniNum>
                <span>
                  아래 <b className="font-semibold text-ink">Project API keys</b> 목록에서{" "}
                  <code className="rounded bg-mist px-1.5 py-0.5 font-mono text-xs">anon</code>{" "}
                  <code className="rounded bg-mist px-1.5 py-0.5 font-mono text-xs">public</code> 이라고 적힌 긴 문자열 복사
                </span>
              </li>
            </ul>
            <p className="mt-2.5 rounded-xl bg-tomato/10 px-3.5 py-2 text-xs font-medium leading-relaxed text-tomato-deep">
              ⚠ 바로 아래 <b>service_role / secret</b> 키는 관리자용이라 절대 쓰면 안 돼요. 꼭 <b>anon public</b> 쪽을 복사하세요.
            </p>
          </StepCard>
          </>
          )}

          <StepCard n={easyMode ? 2 : 4} title={easyMode ? "초대 링크 보내면 끝!" : "오른쪽 상자에 붙여넣고 시작!"}>
            <p>
              {easyMode ? (
                <>
                  방을 열고 <b className="font-semibold text-ink">초대 링크</b>를 보내면, 받는 사람은 링크를 누르는 것만으로{" "}
                  <b className="font-semibold text-ink">자동 연결</b>돼요. 붙여넣을 것도, 가입할 것도 없어요.
                </>
              ) : (
                <>
                  붙여넣고 <b className="font-semibold text-ink">「같이 쓰기 시작!」</b>을 누르면 방이 열려요. 그다음엔{" "}
                  <b className="font-semibold text-ink">초대 링크</b>를 와이프께 카톡으로 보내면 끝 — 링크에 URL·키가{" "}
                  <b className="font-semibold text-ink">자동으로 담겨 있어서</b>, 와이프는 링크만 누르면 알아서 연결돼요.
                </>
              )}
            </p>
          </StepCard>
        </div>

        {/* 연결 폼 */}
        <div className="card-line rounded-2xl border-ssam/60 bg-card p-6 shadow-lift lg:sticky lg:top-24">
          <h3 className="flex items-center gap-2 font-display text-xl text-ink">
            <CloudIcon size={21} className="text-ssam" /> 연결 정보 넣기
          </h3>
          {invited.room && effectiveUrl && effectiveKey && (
            <p className="anim-pop mt-2.5 rounded-xl bg-ssam/12 px-3.5 py-2 text-xs font-medium text-ssam-deep">
              🎉 초대 링크로 오셨네요! 방 코드(<b>{invited.room}</b>)로 자동 연결되는 중이에요!
            </p>
          )}
          {invited.room && !(effectiveUrl && effectiveKey) && (
            <p className="anim-pop mt-2.5 rounded-xl bg-egg/25 px-3.5 py-2 text-xs font-medium text-[#8a6200]">
              🎉 초대 링크로 오셨네요! 방 코드(<b>{invited.room}</b>)는 채워뒀어요. URL이랑 키만 붙여넣으면 돼요.
            </p>
          )}

          {easyMode ? (
            <p className="mt-4 flex items-start gap-2.5 rounded-xl border-2 border-ssam/40 bg-ssam/10 px-4 py-3 text-xs font-medium leading-relaxed text-ssam-deep">
              <CloudIcon size={16} className="mt-0.5 shrink-0" />
              <span>
                <b className="font-semibold">내장 연결이 켜져 있어요.</b> 이 사이트는 동기화 서버가 이미 세팅돼 있어서 URL·키를 넣을
                필요가 없어요 — 방 코드만 정하면 끝!
              </span>
            </p>
          ) : (
            <>
              <label className="mt-4 block">
                <span className="text-xs font-semibold text-ink-soft">프로젝트 URL</span>
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://abcdefgh.supabase.co"
                  className="mt-1.5 w-full rounded-xl border-2 border-line bg-paper/60 px-3.5 py-2.5 font-mono text-xs outline-none transition focus:border-ssam"
                />
              </label>

              <label className="mt-3.5 block">
                <span className="text-xs font-semibold text-ink-soft">anon public 키</span>
                <input
                  value={anonKey}
                  onChange={(e) => setAnonKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIs…"
                  className="mt-1.5 w-full rounded-xl border-2 border-line bg-paper/60 px-3.5 py-2.5 font-mono text-xs outline-none transition focus:border-ssam"
                />
              </label>
            </>
          )}

          <label className="mt-3.5 block">
            <span className="text-xs font-semibold text-ink-soft">우리 방 코드</span>
            <div className="mt-1.5 flex gap-2">
              <input
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                className="min-w-0 flex-1 rounded-xl border-2 border-line bg-paper/60 px-3.5 py-2.5 font-display text-base outline-none transition focus:border-ssam"
              />
              <button
                onClick={() => setRoom(generateRoomCode())}
                className="shrink-0 rounded-xl border-2 border-line px-3 text-ink-soft transition hover:border-ssam hover:text-ssam-deep"
                title="방 코드 새로 만들기"
                aria-label="방 코드 새로 만들기"
              >
                <RefreshIcon size={17} />
              </button>
            </div>
            <button
              onClick={() => copy("invite", inviteLink)}
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-ssam-deep transition hover:text-ssam"
            >
              {copiedKey === "invite" ? <CheckIcon size={13} /> : <LinkIcon size={13} />}
              {copiedKey === "invite" ? "초대 링크 복사됨!" : "초대 링크 미리 복사하기"}
            </button>
          </label>

          {(formError || (status === "error" && statusMessage)) && (
            <p className="mt-3.5 flex items-start gap-2 rounded-xl bg-tomato/10 px-3.5 py-2.5 text-xs font-medium leading-relaxed text-tomato-deep">
              <XIcon size={14} className="mt-0.5 shrink-0" />
              {formError || statusMessage}
            </p>
          )}

          <button
            onClick={submit}
            disabled={status === "connecting"}
            className="btn-sign btn-sign-green mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-ssam px-6 py-3.5 font-display text-xl text-card disabled:cursor-wait disabled:opacity-70"
          >
            <ShareIcon size={21} />
            {status === "connecting" ? "여는 중…" : "같이 쓰기 시작!"}
          </button>

          <p className="mt-3 text-center text-[11px] font-light leading-relaxed text-ink-soft">
            anon 키는 웹에 넣어도 되는 공개 키예요.
            <br />
            방 코드가 비밀번호 역할을 하니 둘만 공유하세요.
          </p>
        </div>
      </div>
    </div>
  );
}

function StepCard({ n, title, children }: { n: string | number; title: string; children: React.ReactNode }) {
  return (
    <section className="card-line rounded-2xl bg-card p-5 shadow-sm">
      <h3 className="flex items-center gap-3 font-display text-lg text-ink">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-egg font-display text-base text-ink shadow-[0_2px_0_0_#dfa100]">
          {n}
        </span>
        {title}
      </h3>
      <div className="mt-2.5 pl-11 text-sm font-light leading-relaxed text-ink-soft">{children}</div>
    </section>
  );
}

function MiniNum({ children }: { children: React.ReactNode }) {
  return (
    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-egg font-display text-[11px] text-ink">
      {children}
    </span>
  );
}

function GoLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-ink px-3.5 py-1.5 font-display text-xs text-paper transition hover:bg-ssam-deep hover:border-ssam-deep"
    >
      <LinkIcon size={13} className="text-egg" /> {label} ↗
    </a>
  );
}
