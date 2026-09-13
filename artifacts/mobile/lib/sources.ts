import type { SourceId } from "@/context/SourceContext";

const apiDomain =
  typeof process !== "undefined"
    ? process.env["EXPO_PUBLIC_API_DOMAIN"] || process.env["EXPO_PUBLIC_DOMAIN"]
    : "";
const API_BASE = apiDomain ? `https://${apiDomain}/api` : "/api";

export interface UnifiedManga {
  id: string;
  slug: string;
  title: string;
  coverUrl: string;
  url: string;
  sourceId: SourceId;
  rating?: string;
  summary?: string;
  latestChapterNum?: string;
  latestChapterUrl?: string;
  isMostRead?: boolean;
  genres: string[];
}

function mapRorymItem(item: Record<string, unknown>): UnifiedManga {
  const slug = String(item["slug"] ?? item["id"] ?? "");
  const latestChs = item["latestChapters"] as { number: string; url: string }[] | undefined;
  const latest = latestChs?.[0];
  return {
    id: slug,
    slug,
    title: String(item["title"] ?? ""),
    coverUrl: String(item["coverUrl"] ?? ""),
    url: String(item["url"] ?? ""),
    sourceId: "rorym",
    rating: item["rating"] ? String(item["rating"]) : undefined,
    isMostRead: item["isMostRead"] === true,
    genres: Array.isArray(item["genres"]) ? item["genres"].map(String) : [],
    latestChapterNum: latest?.number,
    latestChapterUrl: latest?.url,
  };
}

export async function fetchMangasByGenre(genre: string): Promise<UnifiedManga[]> {
  const res = await fetch(`${API_BASE}/rorym/genres/${encodeURIComponent(genre)}`);
  if (!res.ok) throw new Error(`genre fetch failed: ${res.status}`);
  const data = (await res.json()) as { manga: Record<string, unknown>[] };
  return (data.manga ?? []).map(mapRorymItem);
}

export async function fetchMostReadMangas(): Promise<UnifiedManga[]> {
  const res = await fetch(`${API_BASE}/rorym/most-read`);
  if (!res.ok) throw new Error(`most-read fetch failed: ${res.status}`);
  const data = (await res.json()) as { manga: Record<string, unknown>[] };
  return (data.manga ?? []).map(mapRorymItem);
}

export async function fetchHomeMangas(sourceId: SourceId): Promise<UnifiedManga[]> {
  const res = await fetch(`${API_BASE}/rorym/home`);
  if (!res.ok) throw new Error(`home fetch failed: ${res.status}`);
  const data = (await res.json()) as { manga: Record<string, unknown>[] };
  const items = data.manga ?? [];
  return items.map(mapRorymItem);
}

export async function searchMangas(
  sourceId: SourceId,
  query: string
): Promise<UnifiedManga[]> {
  const res = await fetch(`${API_BASE}/rorym/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error(`search failed: ${res.status}`);
  const data = (await res.json()) as { results: Record<string, unknown>[] };
  const items = data.results ?? [];

  return items.map(mapRorymItem);
}

export function getChaptersUrl(sourceId: SourceId, id: string, latestNum?: string): string {
  return `${API_BASE}/rorym/manga/${encodeURIComponent(id)}/chapters`;
}
