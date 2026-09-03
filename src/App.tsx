import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import confetti from "canvas-confetti";
import type { HistoryEntry, Menu, PickedBy, Settings, Tonight } from "./types";
import { DEFAULT_MENUS } from "./data/defaultMenus";
import {
  downloadFile,
  historyToCSV,
  makeBackup,
  parseBackup,
  prettyDate,
  todayStr,
  uid,
  usePersistentState,
} from "./lib/store";
import Picker from "./components/Picker";
import MenuBoard from "./components/MenuBoard";
import HistoryLog from "./components/HistoryLog";
import StatsBoard from "./components/StatsBoard";
import { BowlIcon, BookIcon, CalendarIcon, ChartIcon, DiceIcon, DownloadIcon, PotIcon } from "./components/icons";

type TabId = "pick" | "menu" | "log" | "stats";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}

const TABS: { id: TabId; label: string; icon: (p: { size?: number; className?: string }) => ReactNode }[] = [
  { id: "pick", label: "랜덤 뽑기", icon: (p) => <DiceIcon {...p} /> },
  { id: "menu", label: "우리 메뉴판", icon: (p) => <BookIcon {...p} /> },
  { id: "log", label: "저녁 이력", icon: (p) => <CalendarIcon {...p} /> },
  { id: "stats", label: "통계", icon: (p) => <ChartIcon {...p} /> },
];

export default function App() {
  const [menus, setMenus] = usePersistentState<Menu[]>("dinner-duo.menus.v1", DEFAULT_MENUS);
  const [history, setHistory] = usePersistentState<HistoryEntry[]>("dinner-duo.history.v1", []);
  const [settings, setSettings] = usePersistentState<Settings>("dinner-duo.settings.v1", {
    excludeDays: 7,
    favoriteBoost: true,
  });
  const [tonight, setTonight] = usePersistentState<Tonight | null>("dinner-duo.tonight.v1", null);
  const [tab, setTab] = useState<TabId>("pick");
  const [toast, setToast] = useState<{ msg: string; tone: "ok" | "err" } | null>(null);
  const toastTimer = useRef<number>(0);
  const [installEvt, setInstallEvt] = useState<InstallPromptEvent | null>(null);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvt(e as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const today = todayStr();
  const tonightValid = tonight && tonight.date === today ? tonight : null;
  const unrated = useMemo(() => history.filter((h) => h.rating === 0).length, [history]);

  const showToast = useCallback((msg: string, tone: "ok" | "err" = "ok") => {
    setToast({ msg, tone });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  }, []);

  /* ---------- 저녁 확정 ---------- */
  const confirmDinner = useCallback(
    (menu: Menu, pickedBy: PickedBy) => {
      setTonight({ name: menu.name, category: menu.category, menuId: menu.id, pickedBy, date: today });
      setHistory((prev) => {
        const entry: HistoryEntry = {
          id: uid(),
          menuId: menu.id,
          name: menu.name,
          category: menu.category,
          date: today,
          rating: 0,
          reaction: "",
          pickedBy,
        };
        // 같은 날 기록은 한 끼로 — 다시 뽑으면 오늘 기록을 덮어쓴다
        return [entry, ...prev.filter((h) => h.date !== today)];
      });
      fireConfetti();
      showToast(`오늘 저녁은 「${menu.name}」 — 기록에 찍혔어요!`);
    },
    [setTonight, setHistory, showToast, today]
  );

  /* ---------- 데이터 ---------- */
  const exportCSV = () => {
    downloadFile(`저녁이력_${today}.csv`, historyToCSV(history), "text/csv;charset=utf-8");
    showToast("이력을 CSV로 내려받았어요");
  };

  const exportJSON = () => {
    downloadFile(`저녁기록부_백업_${today}.json`, makeBackup(menus, history, settings), "application/json");
    showToast("메뉴·이력·설정을 통째로 백업했어요");
  };

  const importJSON = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const payload = parseBackup(String(reader.result ?? ""));
      if (!payload) {
        showToast("백업 파일을 읽지 못했어요. JSON 백업 파일이 맞는지 확인해 주세요.", "err");
        return;
      }
      setMenus(payload.menus);
      setHistory(payload.history);
      setSettings(payload.settings);
      showToast(`백업 불러오기 완료 — 메뉴 ${payload.menus.length}개, 이력 ${payload.history.length}건`);
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen">
      {/* ---------- 간판 헤더 ---------- */}
      <header className="border-b-[3px] border-ink/90 bg-card/80">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-3 px-4 py-5 sm:px-6">
          <div className="anim-bob flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-[3px] border-tomato-deep bg-tomato text-card shadow-[0_4px_0_0_#b72c15]">
            <PotIcon size={32} />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-3xl leading-tight text-ink sm:text-4xl">오늘 저녁 뭐 먹지?</h1>
            <p className="mt-0.5 text-sm font-light text-ink-soft">
              우리 둘의 저녁 당번 기록장 · <b className="font-semibold text-ink">10월부터 저녁은 내 담당</b>
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <p className="font-display text-sm text-ink-soft">{prettyDate(today)}</p>
            {tonightValid ? (
              <span className="anim-pop inline-flex items-center gap-1.5 rounded-full border-2 border-ssam-deep bg-ssam px-3.5 py-1 font-display text-sm text-card">
                <BowlIcon size={15} className="text-egg" /> 오늘 저녁: {tonightValid.name}
              </span>
            ) : (
              <span className="rounded-full border-2 border-dashed border-line px-3.5 py-1 font-display text-sm text-ink-soft">
                오늘 저녁 미정
              </span>
            )}
            {installEvt && (
              <button
                onClick={async () => {
                  try {
                    await installEvt.prompt();
                  } catch {
                    /* 사용자가 닫음 */
                  }
                  setInstallEvt(null);
                }}
                className="btn-sign btn-sign-ink inline-flex items-center gap-1.5 rounded-full bg-egg px-3.5 py-1 font-display text-sm text-ink"
              >
                <DownloadIcon size={14} /> 앱으로 설치
              </button>
            )}
          </div>
        </div>

        {/* 메뉴 티커 */}
        <div className="overflow-hidden border-t-2 border-ink/10 bg-ink py-1.5" aria-hidden>
          <div className="marquee-track flex w-max whitespace-nowrap font-display text-sm text-paper/85">
            {[0, 1].map((dup) => (
              <span key={dup} className="flex">
                {(menus.length ? menus.map((m) => m.name) : ["김치찌개", "카레라이스", "떡볶이"]).map((n, i) => (
                  <span key={i} className="mx-3">
                    {n} <span className="ml-5 text-egg">·</span>
                  </span>
                ))}
              </span>
            ))}
          </div>
        </div>
      </header>

      {/* ---------- 탭 ---------- */}
      <nav className="sticky top-0 z-20 border-b border-line bg-paper/95 shadow-[0_2px_10px_rgb(34_48_31_/_0.05)] backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl gap-1.5 overflow-x-auto px-4 py-2.5 sm:px-6">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`relative flex shrink-0 items-center gap-2 rounded-full px-4 py-2 font-display text-[15px] transition-all sm:px-5 ${
                  active ? "bg-ink text-paper shadow-sm" : "text-ink-soft hover:bg-mist hover:text-ink"
                }`}
              >
                {t.icon({ size: 17, className: active ? "text-egg" : undefined })}
                {t.label}
                {t.id === "log" && unrated > 0 && (
                  <span className="ml-0.5 rounded-full bg-tomato px-1.5 py-px text-[11px] leading-4 text-card">{unrated}</span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* ---------- 본문 ---------- */}
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            {tab === "pick" && (
              <Picker
                menus={menus}
                history={history}
                settings={settings}
                onSettings={setSettings}
                tonight={tonightValid}
                onConfirm={confirmDinner}
                onGoMenu={() => setTab("menu")}
                onGoHistory={() => setTab("log")}
              />
            )}
            {tab === "menu" && (
              <MenuBoard
                menus={menus}
                onAdd={(m) => {
                  setMenus((prev) => [...prev, m]);
                  showToast(`「${m.name}」 등록 완료!`);
                }}
                onUpdate={(id, patch) => {
                  setMenus((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
                  showToast("메뉴를 수정했어요");
                }}
                onDelete={(id) => {
                  const target = menus.find((m) => m.id === id);
                  setMenus((prev) => prev.filter((m) => m.id !== id));
                  showToast(target ? `「${target.name}」 삭제했어요` : "삭제했어요");
                }}
                onToggleFavorite={(id) => setMenus((prev) => prev.map((m) => (m.id === id ? { ...m, favorite: !m.favorite } : m)))}
                onPickToday={(menu) => confirmDinner(menu, "직접")}
              />
            )}
            {tab === "log" && (
              <HistoryLog
                history={history}
                onRate={(id, rating) => setHistory((prev) => prev.map((h) => (h.id === id ? { ...h, rating } : h)))}
                onReact={(id, reaction) => setHistory((prev) => prev.map((h) => (h.id === id ? { ...h, reaction } : h)))}
                onDelete={(id) => {
                  setHistory((prev) => prev.filter((h) => h.id !== id));
                  showToast("기록을 삭제했어요");
                }}
                onExportCSV={exportCSV}
                onExportJSON={exportJSON}
                onImport={importJSON}
              />
            )}
            {tab === "stats" && <StatsBoard history={history} menus={menus} />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* ---------- 푸터 ---------- */}
      <footer className="mt-6 border-t-2 border-ink/10 bg-mist/50 py-7">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 text-sm text-ink-soft sm:px-6">
          <p className="flex items-center gap-2 font-light">
            <PotIcon size={17} className="text-tomato" />
            <span>
              <b className="font-semibold text-ink">오늘 저녁 뭐 먹지?</b> — 모든 데이터는 이 브라우저에 저장돼요. 백업은 이력 탭에서!
            </span>
          </p>
          <p className="font-display text-xs text-ink-soft/80">오늘도 맛있게, 둘이서 🍚</p>
        </div>
      </footer>

      {/* ---------- 토스트 ---------- */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border-2 px-6 py-3 font-display text-[15px] shadow-lift ${
              toast.tone === "ok" ? "border-ssam-deep bg-ssam text-card" : "border-tomato-deep bg-tomato text-card"
            }`}
          >
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function fireConfetti() {
  const colors = ["#e23b22", "#ffc94b", "#2f6b40", "#fffef8"];
  confetti({ particleCount: 90, spread: 75, origin: { y: 0.65 }, colors, scalar: 1.05 });
  setTimeout(() => confetti({ particleCount: 45, angle: 60, spread: 55, origin: { x: 0.05, y: 0.7 }, colors }), 180);
  setTimeout(() => confetti({ particleCount: 45, angle: 120, spread: 55, origin: { x: 0.95, y: 0.7 }, colors }), 320);
}
