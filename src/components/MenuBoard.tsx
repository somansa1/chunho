import { useMemo, useState } from "react";
import type { Category, Difficulty, Menu, Speed } from "../types";
import { CATEGORIES, CATEGORY_STYLE } from "../types";
import { uid } from "../lib/store";
import { ClockIcon, FlameIcon, HandIcon, HeartIcon, PencilIcon, PlusIcon, SearchIcon, TrashIcon, XIcon } from "./icons";

interface Props {
  menus: Menu[];
  onAdd: (menu: Menu) => void;
  onUpdate: (id: string, patch: Partial<Menu>) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onPickToday: (menu: Menu) => void;
}

const SPEEDS: Speed[] = ["후딱", "보통", "오래"];

interface FormState {
  name: string;
  category: Category;
  speed: Speed;
  difficulty: Difficulty;
  memo: string;
}

const EMPTY_FORM: FormState = { name: "", category: "한식", speed: "보통", difficulty: 1, memo: "" };

export default function MenuBoard({ menus, onAdd, onUpdate, onDelete, onToggleFavorite, onPickToday }: Props) {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<Category | "전체">("전체");
  const [editing, setEditing] = useState<"new" | string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [armedDelete, setArmedDelete] = useState<string | null>(null);
  const [error, setError] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim();
    return menus
      .filter((m) => (cat === "전체" ? true : m.category === cat))
      .filter((m) => (q ? m.name.includes(q) || m.memo.includes(q) : true));
  }, [menus, query, cat]);

  const counts = useMemo(() => {
    const c = new Map<Category, number>();
    menus.forEach((m) => c.set(m.category, (c.get(m.category) ?? 0) + 1));
    return c;
  }, [menus]);

  function startNew() {
    setForm(EMPTY_FORM);
    setError("");
    setEditing("new");
  }

  function startEdit(m: Menu) {
    setForm({ name: m.name, category: m.category, speed: m.speed, difficulty: m.difficulty, memo: m.memo });
    setError("");
    setEditing(m.id);
  }

  function submit() {
    const name = form.name.trim();
    if (!name) {
      setError("메뉴 이름은 꼭 써주세요!");
      return;
    }
    if (editing === "new") {
      onAdd({ id: uid(), ...form, name, favorite: false, createdAt: Date.now() });
    } else if (editing) {
      onUpdate(editing, { ...form, name });
    }
    setEditing(null);
    setForm(EMPTY_FORM);
    setError("");
  }

  return (
    <div>
      {/* 툴바 */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <SearchIcon size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="메뉴 이름이나 재료로 검색…"
            className="w-full rounded-full border-2 border-line bg-card py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-ssam"
          />
        </div>
        <button
          onClick={startNew}
          className="btn-sign inline-flex items-center gap-2 rounded-full bg-tomato px-5 py-2.5 font-display text-card"
        >
          <PlusIcon size={19} /> 메뉴 등록
        </button>
      </div>

      {/* 카테고리 칩 */}
      <div className="mt-4 flex flex-wrap gap-1.5">
        {(["전체", ...CATEGORIES] as const).map((c) => {
          const active = cat === c;
          return (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`rounded-full border-2 px-3.5 py-1 text-sm font-medium transition-all ${
                active ? "border-ink bg-ink text-paper" : "border-line bg-card text-ink-soft hover:border-ink/40 hover:text-ink"
              }`}
            >
              {c}
              <span className={`ml-1.5 text-xs ${active ? "text-egg" : "text-ink-soft/60"}`}>
                {c === "전체" ? menus.length : counts.get(c) ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      {/* 등록/수정 폼 */}
      {editing && (
        <div className="anim-pop card-line mt-5 rounded-2xl border-ssam/50 bg-card p-5 shadow-lift">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-xl text-ink">{editing === "new" ? "새 메뉴 등록" : "메뉴 수정"}</h3>
            <button
              onClick={() => setEditing(null)}
              className="rounded-full p-1.5 text-ink-soft transition hover:bg-mist hover:text-ink"
              aria-label="닫기"
            >
              <XIcon size={18} />
            </button>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-semibold text-ink-soft">메뉴 이름 *</span>
              <input
                autoFocus
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder="예) 묵은지 김치찜"
                className="mt-1.5 w-full rounded-xl border-2 border-line bg-paper/60 px-3.5 py-2.5 text-sm outline-none transition focus:border-ssam"
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold text-ink-soft">분류</span>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setForm({ ...form, category: c })}
                    className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                      form.category === c ? CATEGORY_STYLE[c].chip + " border-current" : "border-line text-ink-soft hover:border-ink/30"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </label>

            <div>
              <span className="text-xs font-semibold text-ink-soft">난이도 (불꽃)</span>
              <div className="mt-1.5 flex gap-1.5">
                {([1, 2, 3] as Difficulty[]).map((d) => (
                  <button
                    key={d}
                    onClick={() => setForm({ ...form, difficulty: d })}
                    className={`flex flex-1 items-center justify-center gap-0.5 rounded-xl border-2 py-2.5 transition ${
                      form.difficulty === d ? "border-tomato/60 bg-tomato/10" : "border-line hover:border-tomato/30"
                    }`}
                    aria-label={`난이도 ${d}`}
                  >
                    {Array.from({ length: d }).map((_, i) => (
                      <FlameIcon key={i} size={16} className={form.difficulty === d ? "text-tomato" : "text-ink-soft/50"} />
                    ))}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="text-xs font-semibold text-ink-soft">걸리는 시간</span>
              <div className="mt-1.5 flex gap-1.5">
                {SPEEDS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setForm({ ...form, speed: s })}
                    className={`flex-1 rounded-xl border-2 py-2.5 font-display text-sm transition ${
                      form.speed === s ? "border-ssam-deep bg-ssam text-card" : "border-line text-ink-soft hover:border-ssam/40"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <label className="block sm:col-span-2">
              <span className="text-xs font-semibold text-ink-soft">메모 · 레시피 힌트</span>
              <textarea
                value={form.memo}
                onChange={(e) => setForm({ ...form, memo: e.target.value })}
                placeholder="예) 김치는 꼭 볶다가 물 붓기, 마지막에 참기름"
                rows={2}
                className="mt-1.5 w-full resize-none rounded-xl border-2 border-line bg-paper/60 px-3.5 py-2.5 text-sm outline-none transition focus:border-ssam"
              />
            </label>
          </div>

          {error && <p className="mt-3 text-sm font-medium text-tomato-deep">{error}</p>}

          <div className="mt-4 flex gap-2.5">
            <button
              onClick={submit}
              className="btn-sign btn-sign-green rounded-full bg-ssam px-6 py-2.5 font-display text-card"
            >
              {editing === "new" ? "등록하기" : "수정 완료"}
            </button>
            <button
              onClick={() => setEditing(null)}
              className="rounded-full border-2 border-line px-5 py-2 font-display text-ink-soft transition hover:border-ink/40 hover:text-ink"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* 메뉴 그리드 */}
      {filtered.length === 0 ? (
        <div className="card-line mt-6 rounded-2xl border-dashed bg-mist/40 p-10 text-center">
          <p className="font-display text-xl text-ink-soft">{menus.length === 0 ? "메뉴판이 비어 있어요" : "찾는 메뉴가 없어요"}</p>
          <p className="mt-1.5 text-sm font-light text-ink-soft">
            {menus.length === 0 ? "「메뉴 등록」으로 우리 집 저녁 후보를 채워주세요." : "검색어나 분류를 바꿔볼까요?"}
          </p>
        </div>
      ) : (
        <ul className="mt-6 grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((menu) => {
            const st = CATEGORY_STYLE[menu.category];
            const armed = armedDelete === menu.id;
            return (
              <li
                key={menu.id}
                className="group card-line flex flex-col rounded-2xl bg-card p-4 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lift"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-display text-lg leading-snug text-ink">{menu.name}</p>
                    <span className={`mt-1.5 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${st.chip}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
                      {menu.category}
                    </span>
                  </div>
                  <button
                    onClick={() => onToggleFavorite(menu.id)}
                    className={`rounded-full p-2 transition-all hover:scale-110 ${menu.favorite ? "text-tomato" : "text-line hover:text-tomato/60"}`}
                    aria-label="찜"
                  >
                    <HeartIcon size={20} filled={menu.favorite} />
                  </button>
                </div>

                {menu.memo && <p className="mt-2.5 line-clamp-2 text-xs font-light leading-relaxed text-ink-soft">{menu.memo}</p>}

                <div className="mt-3 flex items-center gap-2 text-xs font-medium text-ink-soft">
                  <span className="inline-flex items-center gap-0.5">
                    {Array.from({ length: menu.difficulty }).map((_, i) => (
                      <FlameIcon key={i} size={13} className="text-tomato/80" />
                    ))}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <ClockIcon size={13} /> {menu.speed}
                  </span>
                </div>

                <div className="mt-3.5 flex items-center gap-1.5 border-t border-line/70 pt-3">
                  <button
                    onClick={() => onPickToday(menu)}
                    className="btn-sign btn-sign-green flex-1 rounded-full bg-ssam py-2 font-display text-sm text-card"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <HandIcon size={15} /> 오늘 이걸로
                    </span>
                  </button>
                  <button
                    onClick={() => startEdit(menu)}
                    className="rounded-full border border-line p-2 text-ink-soft transition hover:border-ink/40 hover:text-ink"
                    aria-label="수정"
                  >
                    <PencilIcon size={15} />
                  </button>
                  {armed ? (
                    <button
                      onClick={() => {
                        onDelete(menu.id);
                        setArmedDelete(null);
                      }}
                      onMouseLeave={() => setArmedDelete(null)}
                      className="anim-pop rounded-full bg-tomato px-3 py-1.5 font-display text-xs text-card"
                    >
                      진짜 삭제?
                    </button>
                  ) : (
                    <button
                      onClick={() => setArmedDelete(menu.id)}
                      className="rounded-full border border-line p-2 text-ink-soft transition hover:border-tomato/50 hover:text-tomato"
                      aria-label="삭제"
                    >
                      <TrashIcon size={15} />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
