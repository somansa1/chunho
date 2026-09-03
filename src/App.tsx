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
import HelpGuide from "./components/HelpGuide";
import SyncTab from "./components/SyncTab";
import { connectSync, type SyncConfig, type SyncHandle, type SyncStatus } from "./lib/sync";
import { BowlIcon, BookIcon, CalendarIcon, ChartIcon, DiceIcon, DownloadIcon, HelpIcon, PotIcon, ShareIcon } from "./components/icons";

type TabId = "pick" | "menu" | "log" | "stats" | "guide" | "sync";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}

const TABS: { id: TabId; label: string; icon: (p: { size?: number; className?: string }) => ReactNode }[] = [
  { id: "pick", label: "랜덤 뽑기", icon: (p) => <DiceIcon {...p} /> },
  { id: "menu", label: "우리 메뉴판", icon: (p) => <BookIcon {...p} /> },
  { id: "log", label: "저녁 이력", icon: (p) => <CalendarIcon {...p} /> },
  { id: "stats", label: "통계", icon: (p) => <ChartIcon {...p} /> },
  { id: "sync", label: "같이 쓰기", icon: (p) => <ShareIcon {...p} /> },
  { id: "guide", label: "사용 설명", icon: (p) => <HelpIcon {...p} /> },
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

  /* ---------- 실시간 동기화 (같이 쓰기) ---------- */
  const [syncCfg, setSyncCfg] = usePersistentState<SyncConfig | null>("dinner-duo.sync.v1", null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("off");
  const [syncMsg, setSyncMsg] = useState("");
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [onlineCount, setOnlineCount] = useState(1);
  const [waveKey, setWaveKey] = useState(0);
  const syncRef = useRef<SyncHandle | null>(null);
  const applyingRemote = useRef(false);
  const syncReady = useRef(false);
  const lastSavedAt = useRef(0);

  // 최신 로컬 데이터를 담는 거울 (연결·푸시 시점에 읽는다)
  const latest = useRef({ menus, history, settings, tonight });
  latest.current = { menus, history, settings, tonight };

  useEffect(() => {
    syncReady.current = false;
    if (!syncCfg) {
      setSyncStatus("off");
      setSyncMsg("");
      return;
    }
    const handle = connectSync(syncCfg, () => ({ ...latest.current, savedAt: Date.now() }), {
      onStatus: (s, m) => {
        setSyncStatus(s);
        if (m) setSyncMsg(m);
      },
      onRemote: (doc, kind) => {
        if (doc.savedAt <= lastSavedAt.current) return; // 이미 반영된 것
        lastSavedAt.current = doc.savedAt;
        setLastSyncAt(doc.savedAt);
        applyingRemote.current = true;
        setMenus(doc.menus);
        setHistory(doc.history);
        setSettings(doc.settings);
        setTonight(doc.tonight);
        if (kind === "live") showToast("상대방 기기에서 변경사항이 도착했어요");
      },
      onPushed: (savedAt) => {
        lastSavedAt.current = savedAt;
        setLastSyncAt(savedAt);
      },
      onReady: () => {
        syncReady.current = true;
      },
      onPresence: (count) => setOnlineCount(Math.max(1, count)),
      onWave: () => setWaveKey((k) => k + 1),
    });
    syncRef.current = handle;
    return () => {
      handle.disconnect();
      syncRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncCfg?.url, syncCfg?.anonKey, syncCfg?.roomCode]);

  // 로컬 변경 → 0.7초 뒤 업로드 (연속 변경은 한 번만)
  useEffect(() => {
    if (!syncCfg) return;
    if (applyingRemote.current) {
      applyingRemote.current = false;
      return;
    }
    if (!syncReady.current) return;
    const t = window.setTimeout(() => {
      syncRef.current?.push({ ...latest.current, savedAt: Date.now() });
    }, 700);
    return () => window.clearTimeout(t);
  }, [menus, history, settings, tonight, syncCfg]);

  const forceSync = useCallback(() => {
    if (!syncRef.current) return;
    syncRef.current.push({ ...latest.current, savedAt: Date.now() });
    showToast("지금 동기화했어요");
  }, [showToast]);

  const sendWave = useCallback(() => {
    if (!syncRef.current) return;
    syncRef.current.wave();
    showToast("👋 파트너에게 손 흔들었어요!");
  }, [showToast]);

  // 손 흔들기 오버레이는 2.5초 뒤 자동으로 사라져요
  useEffect(() => {
    if (waveKey === 0) return;
    const t = window.setTimeout(() => setWaveKey(0), 2500);
    return () => window.clearTimeout(t);
  }, [waveKey]);

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
            {syncCfg && (
              <button
                onClick={() => setTab("sync")}
                className="inline-flex items-center gap-1.5 rounded-full border-2 border-line bg-card px-3 py-0.5 text-xs font-semibold text-ink-soft transition hover:border-ssam/60 hover:text-ssam-deep"
                title="같이 쓰기 설정 열기"
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    syncStatus === "online"
                      ? "animate-pulse bg-ssam"
                      : syncStatus === "connecting"
                        ? "animate-pulse bg-egg-deep"
                        : syncStatus === "error"
                          ? "bg-tomato"
                          : "bg-line"
                  }`}
                />
                {syncStatus === "online" ? "같이 쓰는 중" : syncStatus === "connecting" ? "연결 중…" : syncStatus === "error" ? "동기화 오류" : "동기화 꺼짐"}
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
        {/* 모바일: 선택된 탭만 글자 표시(나머진 아이콘) · PC: 전부 글자 표시 */}
        <div className="mx-auto flex max-w-6xl justify-start gap-1.5 overflow-x-auto px-3 py-2 sm:px-6 sm:py-2.5 lg:justify-center">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                title={t.label}
                aria-label={t.label}
                className={`relative flex shrink-0 items-center gap-1.5 rounded-full py-2 font-display text-[15px] transition-all ${
                  active ? "px-3.5 sm:px-5" : "px-2.5 sm:px-4"
                } ${active ? "bg-ink text-paper shadow-sm" : "text-ink-soft hover:bg-mist hover:text-ink"}`}
              >
                {t.icon({ size: 17, className: active ? "text-egg" : undefined })}
                <span className={active ? "whitespace-nowrap" : "hidden whitespace-nowrap sm:inline"}>{t.label}</span>
                {t.id === "log" && unrated > 0 && (
                  <span className={`rounded-full bg-tomato px-1.5 py-px text-[11px] leading-4 text-card ${active ? "ml-0.5" : "sm:ml-0.5"}`}>
                    {unrated}
                  </span>
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
            {tab === "sync" && (
              <SyncTab
                config={syncCfg}
                status={syncStatus}
                statusMessage={syncMsg}
                lastSyncAt={lastSyncAt}
                menuCount={menus.length}
                historyCount={history.length}
                onlineCount={onlineCount}
                onEnable={(cfg) => {
                  setSyncCfg(cfg);
                  showToast("같이 쓰기를 켜는 중이에요…");
                }}
                onDisable={() => {
                  setSyncCfg(null);
                  showToast("같이 쓰기를 껐어요. 기록은 이 기기에 그대로 있어요.");
                }}
                onForceSync={forceSync}
                onWave={sendWave}
              />
            )}
            {tab === "guide" && <HelpGuide />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* ---------- 푸터 ---------- */}
      <footer className="mt-6 border-t-2 border-ink/10 bg-mist/50 py-6 sm:py-7">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-2.5 px-5 text-center text-[13px] leading-relaxed text-ink-soft sm:flex-row sm:justify-between sm:gap-3 sm:px-6 sm:text-left sm:text-sm">
          <p className="flex items-start justify-center gap-2 font-light sm:justify-start">
            <PotIcon size={17} className="mt-0.5 shrink-0 text-tomato" />
            <span>
              <b className="font-semibold text-ink">오늘 저녁 뭐 먹지?</b> — 기록은 이 기기에 저장되고, 「같이 쓰기」를 켜면 둘이 실시간
              공유돼요.
            </span>
          </p>
          <p className="shrink-0 font-display text-xs text-ink-soft/80">오늘도 맛있게, 둘이서 🍚</p>
        </div>
      </footer>

      {/* ---------- 토스트 ---------- */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            className={`fixed bottom-5 left-1/2 z-50 w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-full border-2 px-5 py-2.5 text-center font-display text-sm shadow-lift sm:bottom-6 sm:px-6 sm:py-3 sm:text-[15px] ${
              toast.tone === "ok" ? "border-ssam-deep bg-ssam text-card" : "border-tomato-deep bg-tomato text-card"
            }`}
          >
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---------- 파트너 손 흔들기 수신 ---------- */}
      <WaveOverlay waveKey={waveKey} />
    </div>
  );
}

/** 파트너가 손 흔들면 화면 한가운데 커다란 👋 가 나타난다 */
function WaveOverlay({ waveKey }: { waveKey: number }) {
  return (
    <AnimatePresence>
      {waveKey > 0 && (
        <motion.div
          key={waveKey}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center bg-ink/40 backdrop-blur-[2px]"
        >
          <motion.div
            initial={{ scale: 0.4, rotate: -14 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0.7, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
            className="flex flex-col items-center gap-2"
          >
            <motion.span
              className="text-8xl sm:text-9xl"
              animate={{ rotate: [0, -22, 16, -22, 16, 0] }}
              transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
            >
              👋
            </motion.span>
            <p className="rounded-full border-2 border-egg bg-ink px-5 py-2 font-display text-lg text-egg shadow-lift">
              파트너가 손 흔들었어요!
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function fireConfetti() {
  const colors = ["#e23b22", "#ffc94b", "#2f6b40", "#fffef8"];
  confetti({ particleCount: 90, spread: 75, origin: { y: 0.65 }, colors, scalar: 1.05 });
  setTimeout(() => confetti({ particleCount: 45, angle: 60, spread: 55, origin: { x: 0.05, y: 0.7 }, colors }), 180);
  setTimeout(() => confetti({ particleCount: 45, angle: 120, spread: 55, origin: { x: 0.95, y: 0.7 }, colors }), 320);
}
