import type { Href } from "expo-router";
import type { Chapter } from "@/lib/mangadex";

interface ReaderRouteParams {
  chapterId: string;
  mangaId?: string;
  mangaTitle?: string;
  coverUrl?: string;
  chapterNum?: string;
}

export function getReaderHref({
  chapterId,
  mangaId = "",
  mangaTitle = "",
  coverUrl = "",
  chapterNum = "",
}: ReaderRouteParams): Href {
  const query = new URLSearchParams({
    mangaId,
    mangaTitle,
    coverUrl,
    chapterNum,
  });
  return `/reader/${encodeURIComponent(chapterId)}?${query.toString()}` as Href;
}

function chapterNumber(value: string | null | undefined): number | null {
  if (!value) return null;
  const parsed = Number.parseFloat(value.trim());
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Returns the closest readable chapters around the current chapter.
 * MangaDex can return duplicate chapter numbers from different groups and
 * its response order is not guaranteed to remain stable, so navigation must
 * be based on chapter numbers rather than array positions.
 */
export function getAdjacentChapters(
  chapters: Chapter[],
  currentId: string,
  currentNumber?: string,
): { nextChapter: Chapter | null; previousChapter: Chapter | null } {
  const ordered = chapters
    .filter((chapter) => chapter.attributes.pages > 0 && !chapter.attributes.externalUrl)
    .sort((a, b) => {
      const aNumber = chapterNumber(a.attributes.chapter);
      const bNumber = chapterNumber(b.attributes.chapter);
      if (aNumber !== null && bNumber !== null && aNumber !== bNumber) {
        return bNumber - aNumber;
      }
      if (aNumber !== null) return -1;
      if (bNumber !== null) return 1;
      return b.attributes.publishAt.localeCompare(a.attributes.publishAt);
    });

  const current = ordered.find((chapter) => chapter.id === currentId);
  const currentValue = chapterNumber(current?.attributes.chapter ?? currentNumber);

  if (currentValue !== null) {
    const nextChapter =
      [...ordered]
        .reverse()
        .find((chapter) => (chapterNumber(chapter.attributes.chapter) ?? -Infinity) > currentValue) ?? null;
    const previousChapter =
      ordered.find((chapter) => (chapterNumber(chapter.attributes.chapter) ?? Infinity) < currentValue) ?? null;
    return { nextChapter, previousChapter };
  }

  const currentIndex = ordered.findIndex((chapter) => chapter.id === currentId);
  return {
    nextChapter: currentIndex > 0 ? ordered[currentIndex - 1] : null,
    previousChapter:
      currentIndex >= 0 && currentIndex < ordered.length - 1
        ? ordered[currentIndex + 1]
        : null,
  };
}