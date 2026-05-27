"use no memo";

// manga-starz.net client — routes through our API server proxy

const domain =
  typeof process !== "undefined" && process.env["EXPO_PUBLIC_DOMAIN"]
    ? process.env["EXPO_PUBLIC_DOMAIN"]
    : "";

const API_BASE = domain ? `https://${domain}/api` : "/api";

export interface StarzManga {
  id: string;
  slug: string;
  title: string;
  coverUrl: string;
  url: string;
  rating?: string;
  latestChapters: { number: string; url: string }[];
  description?: string;
  genres?: string[];
  status?: string;
  authors?: string[];
}

export interface StarzChapter {
  number: string;
  title: string;
  url: string;
  date?: string;
}

async function apiFetch<T>(path: string): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error: ${res.status} ${url}`);
  return res.json() as Promise<T>;
}

/** Fetch homepage manga list (trending + recently updated) */
export async function getHomeManga(): Promise<StarzManga[]> {
  const data = await apiFetch<{ manga: StarzManga[] }>("/starz/home");
  return data.manga ?? [];
}

/** Search manga by title */
export async function searchStarzManga(query: string): Promise<StarzManga[]> {
  const data = await apiFetch<{ results: StarzManga[] }>(
    `/starz/search?q=${encodeURIComponent(query)}`
  );
  return data.results ?? [];
}

/** Get manga detail by slug */
export async function getStarzMangaDetail(slug: string): Promise<StarzManga> {
  return apiFetch<StarzManga>(`/starz/manga/${encodeURIComponent(slug)}`);
}

/** Get full chapter list for a manga */
export async function getStarzChapters(
  slug: string
): Promise<StarzChapter[]> {
  const data = await apiFetch<{ chapters: StarzChapter[] }>(
    `/starz/manga/${encodeURIComponent(slug)}/chapters`
  );
  return data.chapters ?? [];
}

/** Construct external chapter URL for opening in browser */
export function buildChapterUrl(slug: string, chapterNumber: string): string {
  return `https://manga-starz.net/manga/${slug}/${chapterNumber}/`;
}

/** Construct manga page URL */
export function buildMangaUrl(slug: string): string {
  return `https://manga-starz.net/manga/${slug}/`;
}

/** Helper: get display title */
export function getStarzTitle(manga: StarzManga): string {
  return manga.title || manga.slug;
}
