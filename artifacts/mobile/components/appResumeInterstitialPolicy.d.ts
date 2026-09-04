export const CHAPTERS_PER_AD: number;

export function advanceChapterCount(
  chapterCount: number,
  pending: boolean,
): {
  chapterCount: number;
  pending: boolean;
};

export function selectAdUnitId(
  isDevelopment: boolean,
  testUnitId: string,
  productionUnitId: string,
): string;