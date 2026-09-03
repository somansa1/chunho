import { useEffect, useMemo, useState } from "react";
import type { SyncConfig, SyncStatus } from "../lib/sync";
import { generateRoomCode, inviteLinkFor, validateSyncInput } from "../lib/sync";
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
  onEnable: (cfg: SyncConfig) => void;
  onDisable: () => void;
  onForceSync: () => void;
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

-- 3) 실시간 동기화 켜기
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
  onEnable,
  onDisable,
  onForceSync,
}: Props) {
  const invitedRoom = useMemo(() => new URLSearchParams(location.search).get("room"), []);

  const [url, setUrl] = useState("");
  const [anonKey, setAnonKey] = useState("");
  const [room, setRoom] = useState(() => invitedRoom ?? generateRoomCode());
  const [formError, setFormError] = useState("");
  const [armedStop, setArmedStop] = useState(false);
  const [, setTick] = useState(0);
  const { copiedKey, copy } = useCopy();

  useEffect(() => {
    if (!config) return;
    const t = window.setInterval(() => setTick((n) => n + 1), 15000);
    return () => window.clearInterval(t);
  }, [config]);

  const inviteLink = inviteLinkFor(room);

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
            <span className="inline-flex items-center gap-2 rounded-full border border-paper/25 px-3.5 py-1 font-display text-sm">
              <span className={`h-2.5 w-2.5 rounded-full ${dot} ${status === "online" ? "animate-pulse" : ""}`} />
              {statusLabel}
            </span>
          </div>

          <p className="mt-1.5 text-sm font-light text-mist/80">
            이 방 코드가 들어간 기기는 저녁 기록을 <b className="font-semibold text-egg">실시간으로 공유</b>해요.
          </p>

          <div className="mt-5 rounded-2xl bg-paper/10 p-5 text-center">
            <p className="text-xs font-semibold tracking-widest text-mist/70">방 코드</p>
            <p className="mt-1 select-all font-display text-4xl tracking-wide text-paper sm:text-5xl">{config.roomCode}</p>
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
              onClick={() => copy("link", inviteLinkFor(config.roomCode))}
              className="btn-sign btn-sign-ink inline-flex items-center justify-center gap-2 rounded-full bg-tomato px-4 py-2.5 font-display text-card"
            >
              {copiedKey === "link" ? <CheckIcon size={17} /> : <LinkIcon size={17} />}
              {copiedKey === "link" ? "복사됐어요!" : "초대 링크 복사"}
            </button>
          </div>

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
              <PhoneIcon size={19} className="text-tomato" /> 와이프 기기에서 켜는 법
            </h3>
            <ol className="mt-3 space-y-3 text-sm font-light leading-relaxed text-ink-soft">
              <li className="flex gap-2.5">
                <MiniNum>1</MiniNum>
                <span>
                  <b className="font-semibold text-ink">초대 링크</b>를 카카오톡으로 보내고, 와이프 폰에서 열어요. (방 코드가 자동으로
                  채워져요)
                </span>
              </li>
              <li className="flex gap-2.5">
                <MiniNum>2</MiniNum>
                <span>
                  <b className="font-semibold text-ink">프로젝트 URL과 anon 키</b>도 같이 보내서 그대로 붙여넣게 해요. (설정 화면
                  캡처해서 보내도 돼요)
                </span>
              </li>
              <li className="flex gap-2.5">
                <MiniNum>3</MiniNum>
                <span>
                  「같이 쓰기 시작!」을 누르면 끝 — 그 순간부터 <b className="font-semibold text-ink">한쪽에서 고르면 다른 쪽에 1초 만에</b>{" "}
                  떠요.
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
                <b className="font-semibold text-ink">방 코드가 비밀번호 역할</b>을 해요. 아는 사람한테만 알려주세요.
              </li>
              <li>같은 방을 쓰는 기기끼리는 메뉴·이력·오늘 저녁이 통째로 일치해요.</li>
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
          지금은 저녁 기록이 <b className="font-semibold text-ink">기기마다 따로</b> 저장돼서, 와이프가 골라둔 메뉴가 안 보여요. 무료
          서비스인 <b className="font-semibold text-ink">Supabase</b>를 둘만의 공유 냉장고처럼 쓰면 — 와이프가 저녁을 고르는 순간{" "}
          <b className="font-semibold text-tomato-deep">1초 만에 이 화면에</b> 뜹니다. 아래 4단계만 따라 하면 돼요. (5분 컷)
        </p>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_1fr] lg:items-start">
        {/* 단계들 */}
        <div className="space-y-4">
          <StepCard n={1} title="Supabase 무료 가입 + 프로젝트 만들기">
            <ol className="list-decimal space-y-1.5 pl-4">
              <li>
                <b className="font-semibold text-ink">supabase.com</b> 접속 → 구글 계정으로 가입 (카드 없이 무료)
              </li>
              <li>
                <b className="font-semibold text-ink">New Project</b> 누르기 → 비밀번호 아무거나, 지역은 가까운 곳(예: Northeast Asia)
              </li>
              <li>만들어질 때까지 1분 정도 기다려요. 커피 한 모금.</li>
            </ol>
          </StepCard>

          <StepCard n={2} title="SQL 한 번 실행하기 (복붙만 하면 돼요)">
            <p>
              왼쪽 메뉴에서 <b className="font-semibold text-ink">SQL Editor</b> → <b className="font-semibold text-ink">New query</b> →
              아래를 통째로 붙여넣고 <b className="font-semibold text-ink">Run</b> 누르기.
            </p>
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
          </StepCard>

          <StepCard n={3} title="URL이랑 키 2개 가져오기">
            <p>
              왼쪽 메뉴 <b className="font-semibold text-ink">Project Settings → API</b> 화면에서 두 개를 복사해요.
            </p>
            <ul className="mt-2 space-y-1.5">
              <li className="flex items-center gap-2">
                <MiniNum>①</MiniNum> <b className="font-semibold text-ink">Project URL</b> — https://xxxx.supabase.co 모양
              </li>
              <li className="flex items-center gap-2">
                <MiniNum>②</MiniNum> <b className="font-semibold text-ink">Project API keys</b> 중 <code className="rounded bg-mist px-1.5 py-0.5 font-mono text-xs">anon</code>{" "}
                <code className="rounded bg-mist px-1.5 py-0.5 font-mono text-xs">public</code> 키 (길쭉한 문자열)
              </li>
            </ul>
          </StepCard>

          <StepCard n={4} title="오른쪽 상자에 붙여넣고 시작!">
            <p>
              붙여넣고 <b className="font-semibold text-ink">「같이 쓰기 시작!」</b>을 누르면 방이 열려요. 그다음엔{" "}
              <b className="font-semibold text-ink">초대 링크</b>를 와이프께 카톡으로 보내면 끝 — 링크를 열면 방 코드가 자동으로
              채워져 있어서 와이프는 URL·키만 붙여넣으면 돼요.
            </p>
          </StepCard>
        </div>

        {/* 연결 폼 */}
        <div className="card-line sticky top-20 rounded-2xl border-ssam/60 bg-card p-6 shadow-lift">
          <h3 className="flex items-center gap-2 font-display text-xl text-ink">
            <CloudIcon size={21} className="text-ssam" /> 연결 정보 넣기
          </h3>
          {invitedRoom && (
            <p className="anim-pop mt-2.5 rounded-xl bg-egg/25 px-3.5 py-2 text-xs font-medium text-[#8a6200]">
              🎉 초대 링크로 오셨네요! 방 코드(<b>{invitedRoom}</b>)는 채워뒀어요. URL이랑 키만 붙여넣으면 돼요.
            </p>
          )}

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
