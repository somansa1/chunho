import { useEffect, useMemo, useRef, useState } from "react";
import type { HistoryEntry, Menu, PickedBy, Settings, Tonight } from "../types";
import { CATEGORY_STYLE } from "../types";
import { recentNames, weightedPick, type PickResult } from "../lib/store";
import { BowlIcon, CheckIcon, DiceIcon, FlameIcon, HeartIcon, PhoneIcon, RefreshIcon, SparkIcon } from "./icons";

interface Props {
  menus: Menu[];
  history: HistoryEntry[];
  settings: Settings;
  onSettings: (s: Settings) => void;
  /** 오늘 날짜로 확정된 저녁 (없으면 null) */
  tonight: Tonight | null;
  onConfirm: (menu: Menu, pickedBy: PickedBy) => void;
  onGoMenu: () => void;
  onGoHistory: () => void;
}

const SPIN_DELAYS = [50, 55, 62, 70, 80, 94, 112, 134, 162, 198, 244, 300, 370, 458, 572, 715];
const EXCLUDE_OPTIONS = [
  { v: 0, label: "안 가림" },
  { v: 3, label: "3일" },
  { v: 7, label: "7일" },
  { v: 14, label: "14일" },
];

export default function Picker({ menus, history, settings, onSettings, tonight, onConfirm, onGoMenu, onGoHistory }: Props) {
  const [spinning, setSpinning] = useState(false);
  const [display, setDisplay] = useState<Menu | null>(null);
  const [result, setResult] = useState<PickResult | null>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const excluded = useMemo(() => recentNames(history, settings.excludeDays), [history, settings.excludeDays]);
  const poolCount = useMemo(
    () => (settings.excludeDays > 0 ? menus.filter((m) => !excluded.has(m.name)).length : menus.length),
    [menus, excluded, settings.excludeDays]
  );

  function spin() {
    if (spinning || menus.length === 0) return;
    const pick = weightedPick(menus, excluded, settings.favoriteBoost);
    if (!pick) return;

    timers.current.forEach(clearTimeout);
    timers.current = [];
    setSpinning(true);
    setResult(null);
    setDisplay(pick.menu);

    const others = menus.filter((m) => m.id !== pick.menu.id);
    let acc = 0;
    SPIN_DELAYS.forEach((d, i) => {
      acc += d;
      const last = i === SPIN_DELAYS.length - 1;
      timers.current.push(
        window.setTimeout(() => {
          const next = last ? pick.menu : others.length > 0 ? others[Math.floor(Math.random() * others.length)] : pick.menu;
          setDisplay(next);
          if (last) {
            setSpinning(false);
            setResult(pick);
          }
        }, acc)
      );
    });
  }

  const shown = result?.menu ?? display ?? tonightAsMenu(tonight);
  const style = shown ? CATEGORY_STYLE[shown.category] : null;

  return (
    <div className="grid gap-8 lg:grid-cols-[1.25fr_1fr] lg:items-start">
      {/* ---------- 냄비 뽑기 ---------- */}
      <section className="relative">
        {/* 김 */}
        <div className="pointer-events-none absolute -top-7 left-1/2 z-10 flex -translate-x-1/2 gap-6" aria-hidden>
          {[0, 0.7, 1.4].map((d) => (
            <span
              key={d}
              className="steam-puff block h-7 w-2.5 rounded-full bg-ink/20 blur-[3px]"
              style={{ animationDelay: `${d}s` }}
            />
          ))}
        </div>

        <div className="relative rounded-t-[2rem] rounded-b-[3.5rem] border-[3px] border-ssam-deep bg-ssam px-5 pb-8 pt-6 shadow-lift sm:px-10">
          {/* 손잡이 */}
          <div className="absolute -left-3 top-10 h-16 w-4 rounded-l-full border-[3px] border-r-0 border-ssam-deep bg-ssam-deep/70" aria-hidden />
          <div className="absolute -right-3 top-10 h-16 w-4 rounded-r-full border-[3px] border-l-0 border-ssam-deep bg-ssam-deep/70" aria-hidden />

          <p className="text-center font-display text-lg tracking-wide text-egg">
            {menus.length === 0 ? "냄비가 텅 비었어요" : spinning ? "보글보글 끓이는 중…" : result ? "짜잔! 오늘 저녁은" : tonight ? "오늘 저녁, 확정!" : "뚜껑을 열어보세요"}
          </p>

          {/* 슬롯 창 */}
          <div className="mx-auto mt-4 max-w-md overflow-hidden rounded-2xl border-[3px] border-ssam-deep bg-card shadow-[inset_0_2px_12px_rgb(30_74_43_/_0.18)]">
            <div className="px-4 py-1.5 text-center font-display text-sm text-ink-soft/70">
              {style ? shown!.category : "…"}
            </div>
            <div className={`px-4 pb-5 pt-1 text-center ${spinning ? "anim-jig" : ""}`}>
              {shown ? (
                <span
                  key={shown.id + (spinning ? display?.id : "final")}
                  className={`block font-display text-4xl leading-tight text-ink sm:text-5xl ${spinning ? "blur-[1.5px]" : "anim-pop"}`}
                >
                  {shown.name}
                </span>
              ) : (
                <span className="block font-display text-3xl text-ink/25 sm:text-4xl">뭐가 나올까?</span>
              )}
            </div>
          </div>

          {/* 결과 디테일 */}
          {result && !spinning && (
            <div className="anim-pop mx-auto mt-4 flex max-w-md flex-wrap items-center justify-center gap-2 text-sm">
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-medium ${style!.chip}`}>
                <span className={`h-2 w-2 rounded-full ${style!.dot}`} />
                {result.menu.category}
              </span>
              <span className="inline-flex items-center gap-0.5 rounded-full border border-line bg-card px-3 py-1 font-medium text-ink-soft">
                {Array.from({ length: result.menu.difficulty }).map((_, i) => (
                  <FlameIcon key={i} size={14} className="text-tomato" />
                ))}
                난이도
              </span>
              <span className="rounded-full border border-line bg-card px-3 py-1 font-medium text-ink-soft">⏱ {result.menu.speed}</span>
              {result.menu.favorite && (
                <span className="inline-flex items-center gap-1 rounded-full border border-tomato/30 bg-tomato/10 px-3 py-1 font-medium text-tomato-deep">
                  <HeartIcon size={13} filled /> 찜 메뉴
                </span>
              )}
            </div>
          )}
          {result && result.menu.memo && !spinning && (
            <p className="anim-pop mx-auto mt-2 max-w-md rounded-xl bg-ssam-deep/40 px-4 py-2 text-center text-sm font-light text-mist">
              💡 {result.menu.memo}
            </p>
          )}
          {result?.fellBack && (
            <p className="mt-3 text-center text-xs font-medium text-egg/90">
              최근 {settings.excludeDays}일 안에 다 먹어봐서 전체 메뉴에서 뽑았어요
            </p>
          )}

          {/* 메인 버튼 */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {!result && !tonight && (
              <button
                onClick={spin}
                disabled={spinning || menus.length === 0}
                className="btn-sign inline-flex items-center gap-2.5 rounded-full bg-tomato px-9 py-3.5 font-display text-2xl text-card disabled:cursor-not-allowed disabled:opacity-60"
              >
                <DiceIcon size={26} className={spinning ? "animate-spin" : ""} />
                {spinning ? "끓는 중…" : "돌려돌려!"}
              </button>
            )}

            {result && !spinning && (
              <>
                <button
                  onClick={() => onConfirm(result.menu, "랜덤")}
                  className="btn-sign btn-sign-ink inline-flex items-center gap-2 rounded-full bg-egg px-7 py-3 font-display text-xl text-ink"
                >
                  <CheckIcon size={22} /> 이걸로 확정!
                </button>
                <button
                  onClick={spin}
                  className="inline-flex items-center gap-2 rounded-full border-2 border-mist/60 px-6 py-2.5 font-display text-lg text-mist transition hover:border-egg hover:text-egg"
                >
                  <RefreshIcon size={19} /> 다시 뽑기
                </button>
              </>
            )}

            {tonight && !result && (
              <>
                <button
                  onClick={onGoHistory}
                  className="btn-sign btn-sign-ink inline-flex items-center gap-2 rounded-full bg-egg px-7 py-3 font-display text-xl text-ink"
                >
                  <BowlIcon size={22} /> 먹고 별점 남기기
                </button>
                <button
                  onClick={() => {
                    setResult(null);
                    setDisplay(null);
                    spin();
                  }}
                  className="inline-flex items-center gap-2 rounded-full border-2 border-mist/60 px-6 py-2.5 font-display text-lg text-mist transition hover:border-egg hover:text-egg"
                >
                  <RefreshIcon size={19} /> 마음 바꿔 다시 뽑기
                </button>
              </>
            )}
          </div>

          {tonight && !result && tonight.pickedBy && (
            <p className="mt-3 text-center text-xs font-light text-mist/80">
              다시 뽑으면 오늘 저녁 기록이 새 메뉴로 바뀌어요
            </p>
          )}
        </div>
      </section>

      {/* ---------- 뽑기 조건 ---------- */}
      <aside className="flex flex-col gap-4">
        <div className="card-line rounded-2xl bg-card p-5 shadow-sm">
          <h3 className="flex items-center gap-2 font-display text-lg text-ink">
            <SparkIcon size={20} className="text-egg-deep" /> 뽑기 조건
          </h3>

          <div className="mt-4">
            <p className="text-xs font-semibold tracking-wide text-ink-soft">최근에 먹은 메뉴 빼기</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {EXCLUDE_OPTIONS.map((o) => {
                const active = settings.excludeDays === o.v;
                return (
                  <button
                    key={o.v}
                    onClick={() => onSettings({ ...settings, excludeDays: o.v })}
                    className={`rounded-full border-2 px-4 py-1.5 font-display text-sm transition-all ${
                      active
                        ? "border-ssam-deep bg-ssam text-card shadow-sm"
                        : "border-line bg-card text-ink-soft hover:border-ssam/50 hover:text-ssam-deep"
                    }`}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs font-light text-ink-soft">
              {settings.excludeDays > 0
                ? `최근 ${settings.excludeDays}일 이내 먹은 메뉴는 뽑기에서 제외돼요.`
                : "중복 허용! 같은 메뉴도 계속 나와요."}
            </p>
          </div>

          <button
            onClick={() => onSettings({ ...settings, favoriteBoost: !settings.favoriteBoost })}
            className={`mt-4 flex w-full items-center justify-between rounded-xl border-2 px-4 py-3 transition-all ${
              settings.favoriteBoost ? "border-tomato/40 bg-tomato/8" : "border-line bg-card hover:border-tomato/30"
            }`}
          >
            <span className="flex items-center gap-2 text-sm font-medium">
              <HeartIcon size={18} filled={settings.favoriteBoost} className={settings.favoriteBoost ? "text-tomato" : "text-ink-soft"} />
              찜한 메뉴 더 잘 나오게
            </span>
            <span
              className={`relative h-6 w-11 rounded-full transition-colors ${settings.favoriteBoost ? "bg-tomato" : "bg-line"}`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-card shadow transition-all ${
                  settings.favoriteBoost ? "left-[22px]" : "left-0.5"
                }`}
              />
            </span>
          </button>

          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <Stat label="전체 메뉴" value={menus.length} />
            <Stat label="제외됨" value={settings.excludeDays > 0 ? excluded.size : 0} tone="text-tomato-deep" />
            <Stat label="후보" value={settings.excludeDays > 0 ? poolCount : menus.length} tone="text-ssam-deep" />
          </div>
        </div>

        {menus.length === 0 && (
          <div className="card-line rounded-2xl border-dashed bg-mist/50 p-5 text-center">
            <p className="text-sm text-ink-soft">메뉴가 하나도 없어요. 우리 집 메뉴판부터 채워볼까요?</p>
            <button
              onClick={onGoMenu}
              className="btn-sign btn-sign-green mt-3 inline-flex items-center gap-2 rounded-full bg-ssam px-5 py-2 font-display text-card"
            >
              메뉴 등록하러 가기
            </button>
          </div>
        )}

        <div className="card-line rounded-2xl bg-card p-5">
          <h3 className="font-display text-lg text-ink">당번 사용 설명서</h3>
          <ol className="mt-3 space-y-2.5 text-sm font-light text-ink-soft">
            <li className="flex gap-2.5">
              <Step n="1" /> 냄비를 돌려서 오늘 저녁을 뽑아요.
            </li>
            <li className="flex gap-2.5">
              <Step n="2" /> 마음에 들면 <b className="font-semibold text-ink">「이걸로 확정!」</b> — 바로 오늘 기록에 찍혀요.
            </li>
            <li className="flex gap-2.5">
              <Step n="3" /> 메뉴판에서 <b className="font-semibold text-ink">「오늘 이걸로」</b>를 눌러 직접 정해도 돼요.
            </li>
            <li className="flex gap-2.5">
              <Step n="4" /> 다 먹고 나면 이력에서 <b className="font-semibold text-ink">별점과 한줄평</b>을 남기기!
            </li>
          </ol>
        </div>

        {/* 핸드폰 설치 안내 */}
        <div className="card-line rounded-2xl border-ink bg-ink p-5 text-paper shadow-lift">
          <h3 className="flex items-center gap-2 font-display text-lg text-egg">
            <PhoneIcon size={19} /> 내 핸드폰에 앱처럼 쓰기
          </h3>
          <ol className="mt-3 space-y-2.5 text-sm font-light leading-relaxed text-mist">
            <li className="flex gap-2.5">
              <Step n="1" /> 이 화면 주소를 <b className="font-semibold text-paper">핸드폰 브라우저</b>로 열어요. (PC와 같은 주소)
            </li>
            <li className="flex gap-2.5">
              <Step n="2" /> iPhone은 공유 버튼 → 「홈 화면에 추가」, 갤럭시·크롬은 메뉴(⋮) → 「앱 설치」를 눌러요.
            </li>
            <li className="flex gap-2.5">
              <Step n="3" /> 홈 화면 아이콘으로 전체화면 실행! <b className="font-semibold text-paper">데이터 없이도</b> 열려요.
            </li>
          </ol>
          <p className="mt-3.5 rounded-xl bg-paper/10 px-3.5 py-2.5 text-xs font-light leading-relaxed text-mist">
            <span className="mr-1.5 rounded bg-egg px-1.5 py-0.5 font-display text-[10px] text-ink">TIP</span>
            저녁 기록은 <b className="font-semibold text-egg">기기별 브라우저</b>에 저장돼요. 폰↔PC 이동은 저녁 이력 탭 →{" "}
            <b className="font-semibold text-egg">전체 백업 / 백업 불러오기</b>로!
          </p>
        </div>
      </aside>
    </div>
  );
}

function tonightAsMenu(t: Tonight | null): Menu | null {
  if (!t) return null;
  return {
    id: t.menuId ?? "tonight",
    name: t.name,
    category: t.category,
    memo: "",
    difficulty: 1,
    speed: "보통",
    favorite: false,
    createdAt: 0,
  };
}

function Stat({ label, value, tone = "text-ink" }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-xl bg-mist/60 px-2 py-2.5">
      <p className={`font-display text-2xl leading-none ${tone}`}>{value}</p>
      <p className="mt-1 text-[11px] font-medium text-ink-soft">{label}</p>
    </div>
  );
}

function Step({ n }: { n: string }) {
  return (
    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-egg font-display text-[11px] text-ink">
      {n}
    </span>
  );
}
