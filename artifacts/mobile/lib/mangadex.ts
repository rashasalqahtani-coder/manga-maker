import { setBaseUrl } from "@workspace/api-client-react";

// Set base URL for API calls from the Expo client.
// In web preview this is the shared proxy domain; on native it uses EXPO_PUBLIC_DOMAIN.
const domain =
  typeof process !== "undefined" && process.env["EXPO_PUBLIC_DOMAIN"]
    ? process.env["EXPO_PUBLIC_DOMAIN"]
    : "";

if (domain) {
  setBaseUrl(`https://${domain}`);
}

// Route through our own backend proxy at /api to avoid CORS restrictions.
const API_BASE = domain ? `https://${domain}/api` : "/api";

export interface MangaRelationship {
  id: string;
  type: string;
  attributes?: {
    name?: string;
    fileName?: string;
    [key: string]: unknown;
  };
}

export interface ScanlationGroup {
  id: string;
  name: string;
}

export interface MangaTag {
  id: string;
  type: string;
  attributes: {
    name: Record<string, string>;
    group: string;
  };
}

export interface Manga {
  id: string;
  type: string;
  attributes: {
    title: Record<string, string>;
    description: Record<string, string>;
    status: string;
    tags: MangaTag[];
    contentRating: string;
    lastVolume: string | null;
    lastChapter: string | null;
    year: number | null;
  };
  relationships: MangaRelationship[];
}

export interface Chapter {
  id: string;
  type: string;
  attributes: {
    title: string | null;
    volume: string | null;
    chapter: string | null;
    translatedLanguage: string;
    publishAt: string;
    pages: number;
  };
  relationships: MangaRelationship[];
}

export interface ChapterPages {
  baseUrl: string;
  hash: string;
  data: string[];
  dataSaver: string[];
}

export function getCoverUrl(manga: Manga, size: "256" | "512" = "512"): string {
  const coverRel = manga.relationships.find((r) => r.type === "cover_art");
  const attrs = coverRel?.attributes as { fileName?: string } | undefined;
  if (!attrs?.fileName) return "";
  return `https://uploads.mangadex.org/covers/${manga.id}/${attrs.fileName}.${size}.jpg`;
}

export function getMangaTitle(manga: Manga): string {
  return (
    manga.attributes.title["ar"] ||
    manga.attributes.title["en"] ||
    Object.values(manga.attributes.title)[0] ||
    "Unknown Title"
  );
}

export function getMangaDescription(manga: Manga): string {
  return (
    manga.attributes.description["ar"] ||
    manga.attributes.description["en"] ||
    Object.values(manga.attributes.description)[0] ||
    "لا يوجد وصف."
  );
}

export function getAuthorName(manga: Manga): string {
  const authorRel = manga.relationships.find((r) => r.type === "author");
  const attrs = authorRel?.attributes as { name?: string } | undefined;
  return attrs?.name || "";
}

export function getMangaTags(manga: Manga): string[] {
  return manga.attributes.tags
    .filter((t) => t.attributes.group === "genre")
    .map(
      (t) =>
        t.attributes.name["ar"] ||
        t.attributes.name["en"] ||
        Object.values(t.attributes.name)[0]
    )
    .filter(Boolean)
    .slice(0, 6);
}

function buildUrl(
  path: string,
  params: Record<string, string | string[]>
): string {
  const url = new URL(`${API_BASE}${path}`);
  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((v) => url.searchParams.append(key, v));
    } else {
      url.searchParams.set(key, value);
    }
  });
  return url.toString();
}

async function apiFetch(
  path: string,
  params: Record<string, string | string[]> = {}
) {
  const url = buildUrl(path, params);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

// ── Arabic-first base params ──────────────────────────────────────────────────
const AR_INCLUDES = ["cover_art", "author"];
const CONTENT_RATING = ["safe", "suggestive"];

export async function getTopRatedManga(): Promise<Manga[]> {
  const data = await apiFetch("/manga", {
    limit: "20",
    "order[rating]": "desc",
    "availableTranslatedLanguage[]": ["ar"],
    "includes[]": AR_INCLUDES,
    "contentRating[]": CONTENT_RATING,
  });
  return data.data as Manga[];
}

export async function getPopularManga(): Promise<Manga[]> {
  const data = await apiFetch("/manga", {
    limit: "20",
    "order[followedCount]": "desc",
    "availableTranslatedLanguage[]": ["ar"],
    "includes[]": AR_INCLUDES,
    "contentRating[]": CONTENT_RATING,
  });
  return data.data as Manga[];
}

export async function getRecentlyUpdated(): Promise<Manga[]> {
  const data = await apiFetch("/manga", {
    limit: "20",
    "order[latestUploadedChapter]": "desc",
    "availableTranslatedLanguage[]": ["ar"],
    "includes[]": AR_INCLUDES,
    "contentRating[]": CONTENT_RATING,
  });
  return data.data as Manga[];
}

export async function searchManga(query: string): Promise<Manga[]> {
  const data = await apiFetch("/manga", {
    title: query,
    limit: "20",
    "availableTranslatedLanguage[]": ["ar"],
    "includes[]": AR_INCLUDES,
    "contentRating[]": CONTENT_RATING,
  });
  return data.data as Manga[];
}

export async function getMangaDetails(id: string): Promise<Manga> {
  const data = await apiFetch(`/manga/${id}`, {
    "includes[]": ["cover_art", "author", "artist"],
  });
  return data.data as Manga;
}

export async function getMangaChapters(id: string): Promise<Chapter[]> {
  const data = await apiFetch(`/manga/${id}/feed`, {
    limit: "500",
    "order[chapter]": "desc",
    "translatedLanguage[]": ["ar"],
    "includes[]": ["scanlation_group"],
  });
  // Fall back to English if no Arabic chapters
  if (!data.data || (data.data as Chapter[]).length === 0) {
    const fallback = await apiFetch(`/manga/${id}/feed`, {
      limit: "500",
      "order[chapter]": "desc",
      "translatedLanguage[]": ["en"],
      "includes[]": ["scanlation_group"],
    });
    return fallback.data as Chapter[];
  }
  return data.data as Chapter[];
}

export function getChapterGroup(chapter: Chapter): ScanlationGroup | null {
  const rel = chapter.relationships.find((r) => r.type === "scanlation_group");
  if (!rel) return null;
  return { id: rel.id, name: rel.attributes?.name || "مجموعة غير معروفة" };
}

export function extractGroups(chapters: Chapter[]): ScanlationGroup[] {
  const seen = new Map<string, string>();
  for (const ch of chapters) {
    const g = getChapterGroup(ch);
    if (g && !seen.has(g.id)) seen.set(g.id, g.name);
  }
  return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
}

export interface MangaTagItem {
  id: string;
  attributes: {
    name: Record<string, string>;
    group: string;
  };
}

export async function browsePaginated(
  type: "popular" | "recent",
  offset: number,
  limit: number
): Promise<Manga[]> {
  const orderKey =
    type === "popular" ? "order[followedCount]" : "order[latestUploadedChapter]";
  const data = await apiFetch("/manga", {
    limit: String(limit),
    offset: String(offset),
    [orderKey]: "desc",
    "availableTranslatedLanguage[]": ["ar"],
    "includes[]": AR_INCLUDES,
    "contentRating[]": CONTENT_RATING,
  });
  return data.data as Manga[];
}

export async function getGenres(): Promise<MangaTagItem[]> {
  const data = await apiFetch("/manga/tag");
  const tags = data.data as MangaTagItem[];
  return tags.filter((t) => t.attributes.group === "genre");
}

export async function browseMangaByGenre(tagId: string): Promise<Manga[]> {
  const data = await apiFetch("/manga", {
    limit: "20",
    "includedTags[]": [tagId],
    "order[followedCount]": "desc",
    "availableTranslatedLanguage[]": ["ar"],
    "includes[]": AR_INCLUDES,
    "contentRating[]": CONTENT_RATING,
  });
  return data.data as Manga[];
}

/** Korean manhwa with Arabic translations */
export async function getArabicManhwa(): Promise<Manga[]> {
  const data = await apiFetch("/manga", {
    limit: "20",
    "originalLanguage[]": ["ko"],
    "order[followedCount]": "desc",
    "availableTranslatedLanguage[]": ["ar"],
    "includes[]": AR_INCLUDES,
    "contentRating[]": CONTENT_RATING,
  });
  return data.data as Manga[];
}

/** Chinese manhua with Arabic translations */
export async function getArabicManhua(): Promise<Manga[]> {
  const data = await apiFetch("/manga", {
    limit: "20",
    "originalLanguage[]": ["zh", "zh-hk"],
    "order[followedCount]": "desc",
    "availableTranslatedLanguage[]": ["ar"],
    "includes[]": AR_INCLUDES,
    "contentRating[]": CONTENT_RATING,
  });
  return data.data as Manga[];
}

/** Newly added Arabic manga (any origin) */
export async function getNewArabic(): Promise<Manga[]> {
  const data = await apiFetch("/manga", {
    limit: "20",
    "order[createdAt]": "desc",
    "availableTranslatedLanguage[]": ["ar"],
    "includes[]": AR_INCLUDES,
    "contentRating[]": CONTENT_RATING,
  });
  return data.data as Manga[];
}

export async function getChapterPages(
  chapterId: string
): Promise<ChapterPages> {
  const data = await apiFetch(`/at-home/server/${chapterId}`);
  return {
    baseUrl: data.baseUrl as string,
    hash: data.chapter.hash as string,
    data: data.chapter.data as string[],
    dataSaver: data.chapter.dataSaver as string[],
  };
}
