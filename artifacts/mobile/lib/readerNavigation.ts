import type { Href } from "expo-router";

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