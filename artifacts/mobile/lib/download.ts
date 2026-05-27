import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";

import { getChapterPages } from "./mangadex";
import type { Manga } from "./mangadex";
import { getCoverUrl, getMangaTitle } from "./mangadex";
import type { TeamManga } from "@/context/TeamContext";

const isNative = Platform.OS !== "web";
const DOWNLOADS_DIR = isNative
  ? (FileSystem.documentDirectory ?? "") + "manga_downloads/"
  : "";

export const DOWNLOADS_META_KEY = "@manga_downloaded_chapters";

export interface DownloadedChapterMeta {
  chapterId: string;
  mangaId: string;
  mangaTitle: string;
  chapterNum: string | null;
  coverUrl: string;
  pageCount: number;
  downloadedAt: number;
}

async function ensureDir(dir: string) {
  if (!isNative) return;
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
}

export async function getDownloadsMeta(): Promise<DownloadedChapterMeta[]> {
  const raw = await AsyncStorage.getItem(DOWNLOADS_META_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as DownloadedChapterMeta[];
  } catch {
    return [];
  }
}

async function saveDownloadsMeta(list: DownloadedChapterMeta[]) {
  await AsyncStorage.setItem(DOWNLOADS_META_KEY, JSON.stringify(list));
}

export async function isChapterDownloaded(chapterId: string): Promise<boolean> {
  if (!isNative) return false;
  const dir = `${DOWNLOADS_DIR}${chapterId}/`;
  const info = await FileSystem.getInfoAsync(dir);
  return info.exists;
}

export async function getLocalPages(chapterId: string): Promise<string[]> {
  if (!isNative) return [];
  const dir = `${DOWNLOADS_DIR}${chapterId}/`;
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) return [];
  const contents = await FileSystem.readDirectoryAsync(dir);
  return contents
    .filter((f) => f.endsWith(".jpg"))
    .sort((a, b) => parseInt(a.replace(".jpg", "")) - parseInt(b.replace(".jpg", "")))
    .map((f) => `${dir}${f}`);
}

export async function downloadChapter(
  chapterId: string,
  manga: Manga,
  chapterNum: string | null,
  onProgress: (downloaded: number, total: number) => void,
  signal?: { cancelled: boolean }
): Promise<void> {
  if (!isNative) {
    throw new Error("التنزيل غير متاح على هذه المنصة");
  }

  const chapterDir = `${DOWNLOADS_DIR}${chapterId}/`;
  await ensureDir(chapterDir);

  const pages = await getChapterPages(chapterId);
  const total = pages.data.length;

  for (let i = 0; i < pages.data.length; i++) {
    if (signal?.cancelled) {
      await FileSystem.deleteAsync(chapterDir, { idempotent: true });
      throw new Error("cancelled");
    }
    const url = `${pages.baseUrl}/data/${pages.hash}/${pages.data[i]}`;
    const localPath = `${chapterDir}${i}.jpg`;
    const existing = await FileSystem.getInfoAsync(localPath);
    if (!existing.exists) {
      await FileSystem.downloadAsync(url, localPath);
    }
    onProgress(i + 1, total);
  }

  const list = await getDownloadsMeta();
  const filtered = list.filter((m) => m.chapterId !== chapterId);
  filtered.unshift({
    chapterId,
    mangaId: manga.id,
    mangaTitle: getMangaTitle(manga),
    chapterNum,
    coverUrl: getCoverUrl(manga, "256"),
    pageCount: total,
    downloadedAt: Date.now(),
  });
  await saveDownloadsMeta(filtered);
}

/**
 * Download a published team chapter whose images are hosted on the server.
 * Saves pages to the same local directory structure as MangaDex downloads.
 */
export async function downloadPublishedTeamChapter(
  chapter: { id: string; imageUrls: string[]; number: string },
  mangaId: string,
  mangaTitle: string,
  coverUrl: string,
  onProgress: (downloaded: number, total: number) => void,
  signal?: { cancelled: boolean }
): Promise<void> {
  if (!isNative) throw new Error("التنزيل غير متاح على هذه المنصة");

  const chapterDir = `${DOWNLOADS_DIR}${chapter.id}/`;
  await ensureDir(chapterDir);

  const total = chapter.imageUrls.length;
  for (let i = 0; i < chapter.imageUrls.length; i++) {
    if (signal?.cancelled) {
      await FileSystem.deleteAsync(chapterDir, { idempotent: true });
      throw new Error("cancelled");
    }
    const localPath = `${chapterDir}${i}.jpg`;
    const existing = await FileSystem.getInfoAsync(localPath);
    if (!existing.exists) {
      await FileSystem.downloadAsync(chapter.imageUrls[i], localPath);
    }
    onProgress(i + 1, total);
  }

  const list = await getDownloadsMeta();
  const filtered = list.filter((m) => m.chapterId !== chapter.id);
  filtered.unshift({
    chapterId: chapter.id,
    mangaId,
    mangaTitle,
    chapterNum: chapter.number,
    coverUrl,
    pageCount: total,
    downloadedAt: Date.now(),
  });
  await saveDownloadsMeta(filtered);
}

export async function deleteChapter(chapterId: string): Promise<void> {
  if (isNative) {
    const dir = `${DOWNLOADS_DIR}${chapterId}/`;
    await FileSystem.deleteAsync(dir, { idempotent: true });
  }
  const list = await getDownloadsMeta();
  await saveDownloadsMeta(list.filter((m) => m.chapterId !== chapterId));
}

export async function downloadTeamChapter(
  chapter: { id: string; imageUris: string[]; number: string },
  manga: TeamManga,
  onProgress: (downloaded: number, total: number) => void
): Promise<void> {
  if (!isNative) {
    throw new Error("التنزيل غير متاح على هذه المنصة");
  }

  const chapterDir = `${DOWNLOADS_DIR}${chapter.id}/`;
  await ensureDir(chapterDir);

  const total = chapter.imageUris.length;

  for (let i = 0; i < chapter.imageUris.length; i++) {
    const src = chapter.imageUris[i];
    const dest = `${chapterDir}${i}.jpg`;
    const existing = await FileSystem.getInfoAsync(dest);
    if (!existing.exists) {
      await FileSystem.copyAsync({ from: src, to: dest });
    }
    onProgress(i + 1, total);
  }

  const list = await getDownloadsMeta();
  const filtered = list.filter((m) => m.chapterId !== chapter.id);
  filtered.unshift({
    chapterId: chapter.id,
    mangaId: manga.id,
    mangaTitle: manga.title,
    chapterNum: chapter.number,
    coverUrl: manga.localCoverUri ?? manga.coverUrl ?? "",
    pageCount: total,
    downloadedAt: Date.now(),
  });
  await saveDownloadsMeta(filtered);
}
