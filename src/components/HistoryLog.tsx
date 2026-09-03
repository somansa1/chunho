import { useMemo, useRef, useState } from "react";
import type { Category, HistoryEntry } from "../types";
import { CATEGORIES, CATEGORY_STYLE } from "../types";
import { prettyDate, relativeDay } from "../lib/store";
import { CalendarIcon, DiceIcon, DownloadIcon, HandIcon, StarIcon, TrashIcon, UploadIcon } from "./icons";

interface Props {
  history: HistoryEntry[];
  onRate: (id: string, rating: number) => void;
  onReact: (id: string, reaction: string) => void;
  onDelete: (id: string) => void;
  onExportCSV: () => void;
  onExportJSON: () => void;
  onImport: (file: File) => void;
}

export default function HistoryLog({ history, onRate, onReact, onDelete, onExportCSV, onExportJSON, onImport }: Props) {
  const [cat, setCat] = useState<Category | "전체">("전체");
  const [unratedOnly, setUnratedOnly] = useState(false);
  const [armed, setArmed] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(
    () =>
      history
        .filter((h) => (cat === "전체" ? true : h.category === cat))
        .filter((h) => (unratedOnly ? h.rating === 0 : true)),
    [history, cat, unratedOnly]
  );

  const groups = useMemo(() => {
    const map = new Map<string, HistoryEntry[]>();
    for (const h of filtered) {
      const arr = map.get(h.date) ?? [];
      arr.push(h);
      map.set(h.date, arr);
    }
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [filtered]);

  const unratedCount = history.filter((h) => h.rating === 0).length;

  return (
    <div>
      {/* 툴바 */}
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="flex flex-wrap gap-1.5">
          {(["전체", ...CATEGORIES] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`rounded-full border-2 px-3.5 py-1 text-sm font-medium transition-all ${
                cat === c ? "border-ink bg-ink text-paper" : "border-line bg-card text-ink-soft hover:border-ink/40 hover:text-ink"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <button
          onClick={() => setUnratedOnly(!unratedOnly)}
          className={`inline-flex items-center gap-1.5 rounded-full border-2 px-3.5 py-1 text-sm font-medium transition-all ${
            unratedOnly ? "border-egg-deep bg-egg text-ink" : "border-line bg-card text-ink-soft hover:border-egg-deep/60"
          }`}
        >
          <StarIcon size={14} /> 평가 대기 {unratedCount > 0 && `(${unratedCount})`}
        </button>

        <div className="ml-auto flex flex-wrap gap-2">
          <button
            onClick={onExportCSV}
            className="inline-flex items-center gap-1.5 rounded-full border-2 border-ssam/50 bg-ssam/10 px-4 py-1.5 text-sm font-semibold text-ssam-deep transition hover:bg-ssam hover:text-card"
          >
            <DownloadIcon size={15} /> 이력 CSV
          </button>
          <button
            onClick={onExportJSON}
            className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink/30 bg-card px-4 py-1.5 text-sm font-semibold text-ink transition hover:bg-ink hover:text-paper"
          >
            <DownloadIcon size={15} /> 전체 백업
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-full border-2 border-line bg-card px-4 py-1.5 text-sm font-semibold text-ink-soft transition hover:border-ink/40 hover:text-ink"
          >
            <UploadIcon size={15} /> 백업 불러오기
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onImport(f);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      {/* 이력 목록 */}
      {groups.length === 0 ? (
        <div className="card-line mt-6 rounded-2xl border-dashed bg-mist/40 p-12 text-center">
          <CalendarIcon size={40} className="mx-auto text-line" />
          <p className="mt-3 font-display text-xl text-ink-soft">아직 저녁 기록이 없어요</p>
          <p className="mt-1.5 text-sm font-light text-ink-soft">뽑기에서 저녁을 확정하면 여기에 차곡차곡 쌓여요.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {groups.map(([date, entries]) => {
            const rel = relativeDay(date);
            return (
              <section key={date}>
                <header className="flex items-baseline gap-2.5">
                  <h3 className="font-display text-lg text-ink">
                    {rel ? (
                      <span className="mr-1.5 rounded-md bg-tomato px-2 py-0.5 text-sm text-card">{rel}</span>
                    ) : null}
                    {prettyDate(date)}
                  </h3>
                  <span className="text-xs font-medium text-ink-soft">{entries.length}끼니</span>
                  <span className="h-px flex-1 bg-line" />
                </header>

                <ul className="mt-3 space-y-2.5">
                  {entries.map((h) => {
                    const st = CATEGORY_STYLE[h.category];
                    return (
                      <li
                        key={h.id}
                        className="card-line group rounded-2xl bg-card p-4 transition-all hover:-translate-y-0.5 hover:shadow-lift"
                      >
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-display text-lg leading-snug text-ink">{h.name}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                              <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-medium ${st.chip}`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
                                {h.category}
                              </span>
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-semibold ${
                                  h.pickedBy === "랜덤" ? "bg-egg/25 text-[#8a6200]" : "bg-ssam/12 text-ssam-deep"
                                }`}
                              >
                                {h.pickedBy === "랜덤" ? <DiceIcon size={12} /> : <HandIcon size={12} />}
                                {h.pickedBy === "랜덤" ? "랜덤 뽑기" : "직접 선택"}
                              </span>
                            </div>
                          </div>

                          {/* 별점 */}
                          <div className="flex items-center gap-0.5" role="radiogroup" aria-label="별점">
                            {[1, 2, 3, 4, 5].map((r) => (
                              <button
                                key={r}
                                onClick={() => onRate(h.id, h.rating === r ? 0 : r)}
                                className={`p-0.5 transition-transform hover:scale-125 ${
                                  r <= h.rating ? "text-egg-deep" : "text-line hover:text-egg-deep/60"
                                }`}
                                aria-label={`${r}점`}
                              >
                                <StarIcon size={21} filled={r <= h.rating} />
                              </button>
                            ))}
                          </div>

                          {armed === h.id ? (
                            <button
                              onClick={() => {
                                onDelete(h.id);
                                setArmed(null);
                              }}
                              onMouseLeave={() => setArmed(null)}
                              className="anim-pop rounded-full bg-tomato px-3.5 py-1.5 font-display text-xs text-card"
                            >
                              기록 삭제
                            </button>
                          ) : (
                            <button
                              onClick={() => setArmed(h.id)}
                              className="rounded-full border border-line p-2 text-ink-soft opacity-0 transition group-hover:opacity-100 hover:border-tomato/50 hover:text-tomato focus-visible:opacity-100"
                              aria-label="기록 삭제"
                            >
                              <TrashIcon size={15} />
                            </button>
                          )}
                        </div>

                        {/* 한줄평 */}
                        <input
                          value={drafts[h.id] ?? h.reaction}
                          onChange={(e) => setDrafts({ ...drafts, [h.id]: e.target.value })}
                          onBlur={() => {
                            const v = (drafts[h.id] ?? "").trim();
                            if (v !== h.reaction) onReact(h.id, v);
                          }}
                          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                          placeholder={h.rating === 0 ? "다 먹고 한줄평 남기기… (예: 와이프가 두 그릇 먹음)" : "한줄평 남기기…"}
                          className="mt-2.5 w-full rounded-xl border border-transparent bg-paper/70 px-3 py-2 text-sm font-light outline-none transition placeholder:text-ink-soft/50 focus:border-ssam/50 focus:bg-card"
                        />
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
