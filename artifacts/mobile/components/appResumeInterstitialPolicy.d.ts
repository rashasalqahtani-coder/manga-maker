export const CHAPTERS_PER_AD: number;
export const DOWNLOADS_FOR_ONE_AD: number;
export const DOWNLOADS_FOR_THREE_ADS: number;

export function advanceChapterCount(
  chapterCount: number,
): {
  chapterCount: number;
  adsToQueue: number;
};

export function advanceDownloadCount(downloadCount: number): {
  downloadCount: number;
  adsToQueue: number;
};

export function isAdBlockedPath(pathname: string): boolean;

export function selectAdUnitId(
  isDevelopment: boolean,
  testUnitId: string,
  productionUnitId: string,
): string;