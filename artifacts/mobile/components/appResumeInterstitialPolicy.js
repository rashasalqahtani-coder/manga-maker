const CHAPTERS_PER_AD = 3;

function advanceChapterCount(chapterCount, pending) {
  if (pending) {
    return { chapterCount, pending: true };
  }

  const nextCount = chapterCount + 1;
  if (nextCount >= CHAPTERS_PER_AD) {
    return { chapterCount: 0, pending: true };
  }

  return { chapterCount: nextCount, pending: false };
}

function selectAdUnitId(isDevelopment, testUnitId, productionUnitId) {
  return isDevelopment ? testUnitId : productionUnitId;
}

module.exports = {
  CHAPTERS_PER_AD,
  advanceChapterCount,
  selectAdUnitId,
};