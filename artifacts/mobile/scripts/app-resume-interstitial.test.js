const assert = require("node:assert/strict");
const test = require("node:test");

const {
  CHAPTERS_PER_AD,
  DOWNLOADS_FOR_ONE_AD,
  DOWNLOADS_FOR_THREE_ADS,
  advanceChapterCount,
  advanceDownloadCount,
  isAdBlockedPath,
  selectAdUnitId,
} = require("../components/appResumeInterstitialPolicy");

test("does not schedule an ad after one or two chapters", () => {
  const afterOne = advanceChapterCount(0);
  const afterTwo = advanceChapterCount(afterOne.chapterCount);

  assert.equal(CHAPTERS_PER_AD, 3);
  assert.deepEqual(afterOne, { chapterCount: 1, adsToQueue: 0 });
  assert.deepEqual(afterTwo, { chapterCount: 2, adsToQueue: 0 });
});

test("schedules exactly one ad after the third chapter", () => {
  const afterThree = advanceChapterCount(2);

  assert.deepEqual(afterThree, { chapterCount: 0, adsToQueue: 1 });
});

test("starts a new three-chapter cycle after an ad is queued", () => {
  assert.deepEqual(advanceChapterCount(0), {
    chapterCount: 1,
    adsToQueue: 0,
  });
});

test("queues one ad at ten downloads and two more after the next download", () => {
  let state = { downloadCount: 0, adsToQueue: 0 };
  let queued = 0;
  for (let i = 0; i < DOWNLOADS_FOR_ONE_AD; i += 1) {
    state = advanceDownloadCount(state.downloadCount);
    queued += state.adsToQueue;
  }
  assert.deepEqual(state, { downloadCount: 10, adsToQueue: 1 });
  assert.equal(queued, 1);

  state = advanceDownloadCount(state.downloadCount);
  queued += state.adsToQueue;
  assert.equal(DOWNLOADS_FOR_THREE_ADS, 11);
  assert.deepEqual(state, { downloadCount: 0, adsToQueue: 2 });
  assert.equal(queued, 3);
});

test("blocks ads in the library only", () => {
  assert.equal(isAdBlockedPath("/(tabs)/library"), true);
  assert.equal(isAdBlockedPath("/library"), true);
  assert.equal(isAdBlockedPath("/reader/abc"), false);
  assert.equal(isAdBlockedPath("/"), false);
});

test("development builds always use Google's test interstitial", () => {
  const googleTestId = "google-test-interstitial";
  const productionId = "production-interstitial";

  assert.equal(selectAdUnitId(true, googleTestId, productionId), googleTestId);
  assert.equal(
    selectAdUnitId(false, googleTestId, productionId),
    productionId,
  );
});