import { useMemo, type ReactNode } from "react";
import type { Category, HistoryEntry, Menu } from "../types";
import { CATEGORIES, CATEGORY_STYLE } from "../types";
import { shiftDay, shortDate, todayStr } from "../lib/store";
import { BowlIcon, ChartIcon, FlameIcon, SparkIcon, StarIcon } from "./icons";

interface Props {
  history: HistoryEntry[];
  menus: Menu[];
}

export default function StatsBoard({ history, menus }: Props) {
  const stats = useMemo(() => {
    const total = history.length;
    const rated = history.filter((h) => h.rating > 0);
    const avg = rated.length ? rated.reduce((a, h) => a + h.rating, 0) / rated.length : 0;

    const byName = new Map<string, { count: number; category: Category }>();
    history.forEach((h) => {
      const cur = byName.get(h.name);
      byName.set(h.name, { count: (cur?.count ?? 0) + 1, category: h.category });
    });
    const top = [...byName.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 8);
    const maxCount = top[0]?.[1].count ?? 1;

    const byCat = new Map<Category, number>();
    history.forEach((h) => byCat.set(h.category, (byCat.get(h.category) ?? 0) + 1));

    // 연속 저녁 기록 (오늘 or 어제로 끝나는 연속일)
    const days = new Set(history.map((h) => h.date));
    let streak = 0;
    let cursor = days.has(todayStr()) ? todayStr() : shiftDay(todayStr(), -1);
    while (days.has(cursor)) {
      streak++;
      cursor = shiftDay(cursor, -1);
    }

    // 최근 7일
    const last7 = Array.from({ length: 7 }, (_, i) => {
      const d = shiftDay(todayStr(), -(6 - i));
      return { date: d, entries: history.filter((h) => h.date === d) };
    });

    return { total, avg, ratedCount: rated.length, top, maxCount, byCat, streak, last7 };
  }, [history]);

  if (history.length === 0) {
    return (
      <div className="card-line rounded-2xl border-dashed bg-mist/40 p-12 text-center">
        <ChartIcon size={40} className="mx-auto text-line" />
        <p className="mt-3 font-display text-xl text-ink-soft">통계는 기록에서 자라요</p>
        <p className="mt-1.5 text-sm font-light text-ink-soft">저녁을 몇 번 확정하면 우리 둘의 식탁 그래프가 그려져요.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 숫자 카드 */}
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <BigNum label="함께한 저녁" value={`${stats.total}끼니`} sub="우리가 같이 먹은 횟수" />
        <BigNum
          label="평균 별점"
          value={stats.ratedCount ? stats.avg.toFixed(1) : "–"}
          sub={stats.ratedCount ? `${stats.ratedCount}번 평가함` : "아직 평가 전"}
          icon={<StarIcon size={18} filled className="text-egg-deep" />}
        />
        <BigNum label="연속 저녁 기록" value={`${stats.streak}일`} sub="오늘도 확정하면 이어져요" icon={<FlameIcon size={18} className="text-tomato" />} />
        <BigNum label="등록 메뉴" value={`${menus.length}개`} sub={`찜 ${menus.filter((m) => m.favorite).length}개`} icon={<BowlIcon size={18} className="text-ssam" />} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 최다 메뉴 랭킹 */}
        <section className="card-line rounded-2xl bg-card p-5 shadow-sm">
          <h3 className="flex items-center gap-2 font-display text-xl text-ink">
            <SparkIcon size={20} className="text-egg-deep" /> 최애 저녁 랭킹
          </h3>
          <ul className="mt-4 space-y-3">
            {stats.top.map(([name, info], i) => (
              <li key={name}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="flex min-w-0 items-baseline gap-2">
                    <span className={`font-display text-base ${i === 0 ? "text-tomato" : i < 3 ? "text-egg-deep" : "text-ink-soft"}`}>
                      {i + 1}
                    </span>
                    <span className="truncate font-medium text-ink">{name}</span>
                  </span>
                  <span className="shrink-0 font-display text-ink-soft">{info.count}번</span>
                </div>
                <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-mist">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${i === 0 ? "bg-tomato" : i < 3 ? "bg-egg-deep" : "bg-ssam/70"}`}
                    style={{ width: `${(info.count / stats.maxCount) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>

        <div className="space-y-6">
          {/* 분류 비중 */}
          <section className="card-line rounded-2xl bg-card p-5 shadow-sm">
            <h3 className="font-display text-xl text-ink">분류 비중</h3>
            <div className="mt-4 flex h-5 overflow-hidden rounded-full bg-mist">
              {CATEGORIES.filter((c) => stats.byCat.get(c)).map((c) => (
                <div
                  key={c}
                  className={`h-full ${CATEGORY_STYLE[c].dot} transition-all duration-700`}
                  style={{ width: `${((stats.byCat.get(c) ?? 0) / stats.total) * 100}%` }}
                  title={`${c} ${stats.byCat.get(c)}번`}
                />
              ))}
            </div>
            <ul className="mt-3.5 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-3">
              {CATEGORIES.filter((c) => stats.byCat.get(c)).map((c) => (
                <li key={c} className="flex items-center gap-2 text-ink-soft">
                  <span className={`h-2.5 w-2.5 rounded-full ${CATEGORY_STYLE[c].dot}`} />
                  <span className="font-medium text-ink">{c}</span>
                  <span>{Math.round(((stats.byCat.get(c) ?? 0) / stats.total) * 100)}%</span>
                </li>
              ))}
            </ul>
          </section>

          {/* 최근 7일 */}
          <section className="card-line rounded-2xl bg-card p-5 shadow-sm">
            <h3 className="font-display text-xl text-ink">최근 7일</h3>
            <ul className="mt-3.5 space-y-2">
              {stats.last7.map(({ date, entries }) => (
                <li key={date} className="flex items-center gap-3 text-sm">
                  <span className="w-14 shrink-0 font-display text-ink-soft">{shortDate(date)}</span>
                  {entries.length === 0 ? (
                    <span className="rounded-lg border border-dashed border-line px-3 py-1 text-xs font-light text-ink-soft/70">기록 없음</span>
                  ) : (
                    entries.map((h) => (
                      <span key={h.id} className="flex items-center gap-1.5 rounded-full bg-mist/70 px-3 py-1 font-medium text-ink">
                        {h.name}
                        {h.rating > 0 && (
                          <span className="flex items-center gap-0.5 text-[11px] font-semibold text-egg-deep">
                            <StarIcon size={11} filled />
                            {h.rating}
                          </span>
                        )}
                      </span>
                    ))
                  )}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

function BigNum({ label, value, sub, icon }: { label: string; value: string; sub: string; icon?: ReactNode }) {
  return (
    <div className="card-line group rounded-2xl bg-card p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lift">
      <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-ink-soft">
        {icon}
        {label}
      </p>
      <p className="mt-2 font-display text-3xl leading-none text-ink sm:text-4xl">{value}</p>
      <p className="mt-2 text-xs font-light text-ink-soft">{sub}</p>
    </div>
  );
}
