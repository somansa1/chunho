export type Category = "한식" | "중식" | "일식" | "양식" | "분식" | "특식";

export const CATEGORIES: Category[] = ["한식", "중식", "일식", "양식", "분식", "특식"];

/** 조리 난이도: 불꽃 개수 1~3 */
export type Difficulty = 1 | 2 | 3;

/** 걸리는 시간 */
export type Speed = "후딱" | "보통" | "오래";

export interface Menu {
  id: string;
  name: string;
  category: Category;
  memo: string;
  difficulty: Difficulty;
  speed: Speed;
  favorite: boolean;
  createdAt: number;
}

export type PickedBy = "랜덤" | "직접";

export interface HistoryEntry {
  id: string;
  menuId: string | null;
  name: string;
  category: Category;
  /** YYYY-MM-DD (로컬) */
  date: string;
  /** 0 = 아직 평가 전, 1~5 별점 */
  rating: number;
  /** 와이프(혹은 나)의 한줄평 */
  reaction: string;
  pickedBy: PickedBy;
}

export interface Settings {
  /** 최근 N일간 먹은 메뉴 제외 (0 = 제외 안 함) */
  excludeDays: number;
  /** 찜한 메뉴 가중치 */
  favoriteBoost: boolean;
}

export interface Tonight {
  name: string;
  category: Category;
  menuId: string | null;
  pickedBy: PickedBy;
  /** YYYY-MM-DD — 오늘 날짜일 때만 유효 */
  date: string;
}

export const CATEGORY_STYLE: Record<Category, { chip: string; dot: string }> = {
  한식: { chip: "bg-tomato/12 text-tomato-deep border-tomato/30", dot: "bg-tomato" },
  중식: { chip: "bg-egg/20 text-[#8a6200] border-egg-deep/40", dot: "bg-egg-deep" },
  일식: { chip: "bg-[#dbe9f4] text-[#2c5a7c] border-[#9dbfd8]", dot: "bg-[#4b87b3]" },
  양식: { chip: "bg-ssam/12 text-ssam-deep border-ssam/30", dot: "bg-ssam" },
  분식: { chip: "bg-[#f6dfe8] text-[#96385f] border-[#dca8bf]", dot: "bg-[#c25a86]" },
  특식: { chip: "bg-[#e8e2f4] text-[#5b4a8f] border-[#bfb2de]", dot: "bg-[#7a63b8]" },
};
