const assert = require("node:assert/strict");
const test = require("node:test");

const {
  CHAPTERS_PER_AD,
  advanceChapterCount,
  selectAdUnitId,
} = require("../components/appResumeInterstitialPolicy");

test("does not schedule an ad after one or two chapters", () => {
  const afterOne = advanceChapterCount(0, false);
  const afterTwo = advanceChapterCount(afterOne.chapterCount, afterOne.pending);

  assert.equal(CHAPTERS_PER_AD, 3);
  assert.deepEqual(afterOne, { chapterCount: 1, pending: false });
  assert.deepEqual(afterTwo, { chapterCount: 2, pending: false });
});

test("schedules exactly one ad after the third chapter", () => {
  const afterThree = advanceChapterCount(2, false);
  const whilePending = advanceChapterCount(
    afterThree.chapterCount,
    afterThree.pending,
  );

  assert.deepEqual(afterThree, { chapterCount: 0, pending: true });
  assert.deepEqual(whilePending, { chapterCount: 0, pending: true });
});

test("starts a new three-chapter cycle after the pending ad is consumed", () => {
  assert.deepEqual(advanceChapterCount(0, false), {
    chapterCount: 1,
    pending: false,
  });
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