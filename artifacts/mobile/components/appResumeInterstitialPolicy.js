const CHAPTERS_PER_AD = 3;
const DOWNLOADS_FOR_ONE_AD = 10;
const DOWNLOADS_FOR_THREE_ADS = 11;

function advanceChapterCount(chapterCount) {
  const nextCount = chapterCount + 1;
  if (nextCount >= CHAPTERS_PER_AD) {
    return { chapterCount: 0, adsToQueue: 1 };
  }

  return { chapterCount: nextCount, adsToQueue: 0 };
}

function advanceDownloadCount(downloadCount) {
  const nextCount = downloadCount + 1;
  if (nextCount === DOWNLOADS_FOR_ONE_AD) {
    return { downloadCount: nextCount, adsToQueue: 1 };
  }
  if (nextCount >= DOWNLOADS_FOR_THREE_ADS) {
    return { downloadCount: 0, adsToQueue: 2 };
  }
  return { downloadCount: nextCount, adsToQueue: 0 };
}

function isAdBlockedPath(pathname) {
  return /(^|\/)library(\/|$)/.test(pathname);
}

function selectAdUnitId(isDevelopment, testUnitId, productionUnitId) {
  return isDevelopment ? testUnitId : productionUnitId;
}

module.exports = {
  CHAPTERS_PER_AD,
  DOWNLOADS_FOR_ONE_AD,
  DOWNLOADS_FOR_THREE_ADS,
  advanceChapterCount,
  advanceDownloadCount,
  isAdBlockedPath,
  selectAdUnitId,
};