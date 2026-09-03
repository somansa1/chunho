import { useEffect, useState } from "react";
import type { HistoryEntry, Menu, Settings } from "../types";

/* ---------------- persistence ---------------- */

/** 샌드박스 아이프레임 등에서 localStorage가 통째로 막혀 있어도 절대 throw 하지 않는다 */
function storageGet(key: string): string | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(key: string, value: string): void {
  try {
    if (typeof window === "undefined" || !window.localStorage) return;
    window.localStorage.setItem(key, value);
  } catch {
    /* storage full / private mode / sandbox — 무시 */
  }
}

export function usePersistentState<T>(key: string, initial: T | (() => T)) {
  const [state, setState] = useState<T>(() => {
    const raw = storageGet(key);
    if (raw !== null) {
      try {
        return JSON.parse(raw) as T;
      } catch {
        /* 깨진 데이터 — 초기값으로 */
      }
    }
    try {
      return typeof initial === "function" ? (initial as () => T)() : initial;
    } catch {
      return undefined as T;
    }
  });

  useEffect(() => {
    storageSet(key, JSON.stringify(state));
  }, [key, state]);

  return [state, setState] as const;
}

/* ---------------- ids & dates ---------------- */

export function uid(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
  }
}

/** 로컬 기준 YYYY-MM-DD */
export function toDayStr(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${da}`;
}

export function todayStr(): string {
  return toDayStr(new Date());
}

export function shiftDay(dayStr: string, days: number): string {
  const [y, m, d] = dayStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return toDayStr(dt);
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export function prettyDate(dayStr: string): string {
  const [y, m, d] = dayStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return `${y}년 ${m}월 ${d}일 (${WEEKDAYS[dt.getDay()]})`;
}

export function shortDate(dayStr: string): string {
  const [, m, d] = dayStr.split("-").map(Number);
  return `${m}월 ${d}일`;
}

export function relativeDay(dayStr: string): string | null {
  const today = todayStr();
  if (dayStr === today) return "오늘";
  if (dayStr === shiftDay(today, -1)) return "어제";
  return null;
}

/* ---------------- picking ---------------- */

/** 최근 days일 이내에 먹은 메뉴 이름 집합 */
export function recentNames(history: HistoryEntry[], days: number): Set<string> {
  if (days <= 0) return new Set();
  const cutoff = shiftDay(todayStr(), -days);
  const s = new Set<string>();
  for (const h of history) if (h.date >= cutoff) s.add(h.name);
  return s;
}

export interface PickResult {
  menu: Menu;
  /** 제외 조건 때문에 전체 풀에서 뽑았는지 */
  fellBack: boolean;
}

export function weightedPick(menus: Menu[], exclude: Set<string>, favoriteBoost: boolean): PickResult | null {
  if (menus.length === 0) return null;
  const filtered = menus.filter((mm) => !exclude.has(mm.name));
  const fellBack = filtered.length === 0;
  const pool = fellBack ? menus : filtered;
  const weights = pool.map((mm) => (favoriteBoost && mm.favorite ? 3 : 1));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r <= 0) return { menu: pool[i], fellBack };
  }
  return { menu: pool[pool.length - 1], fellBack };
}

/* ---------------- export / import ---------------- */

export function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function csvCell(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function historyToCSV(history: HistoryEntry[]): string {
  const head = ["날짜", "메뉴", "분류", "선택방법", "별점", "한줄평"];
  const rows = history.map((h) =>
    [h.date, h.name, h.category, h.pickedBy, h.rating === 0 ? "" : h.rating, h.reaction].map(csvCell).join(",")
  );
  // BOM 붙여서 엑셀에서 한글이 깨지지 않게
  return "\uFEFF" + [head.map(csvCell).join(","), ...rows].join("\r\n");
}

export interface BackupPayload {
  app: "dinner-duo";
  version: 1;
  exportedAt: string;
  menus: Menu[];
  history: HistoryEntry[];
  settings: Settings;
}

export function makeBackup(menus: Menu[], history: HistoryEntry[], settings: Settings): string {
  const payload: BackupPayload = {
    app: "dinner-duo",
    version: 1,
    exportedAt: new Date().toISOString(),
    menus,
    history,
    settings,
  };
  return JSON.stringify(payload, null, 2);
}

export function parseBackup(text: string): BackupPayload | null {
  try {
    const p = JSON.parse(text) as Partial<BackupPayload>;
    if (!Array.isArray(p.menus) || !Array.isArray(p.history)) return null;
    const menus = p.menus.filter((mm): mm is Menu => !!mm && typeof mm.name === "string");
    const history = p.history.filter((h): h is HistoryEntry => !!h && typeof h.name === "string" && !!h.date);
    const settings: Settings = {
      excludeDays: typeof p.settings?.excludeDays === "number" ? p.settings.excludeDays : 7,
      favoriteBoost: p.settings?.favoriteBoost !== false,
    };
    return { app: "dinner-duo", version: 1, exportedAt: p.exportedAt ?? "", menus, history, settings };
  } catch {
    return null;
  }
}
