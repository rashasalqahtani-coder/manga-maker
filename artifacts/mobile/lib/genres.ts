export const MANGA_GENRES = [
  "أكشن",
  "رومانسي",
  "مغامرات",
  "خيال",
  "كوميدي",
  "دراما",
  "غموض",
  "رعب",
  "رياضي",
  "مدرسي",
  "تاريخي",
  "خيال علمي",
] as const;

export type MangaGenre = (typeof MANGA_GENRES)[number];