import type { SourceId } from "@/context/SourceContext";

const API_BASE =
  typeof process !== "undefined" && process.env["EXPO_PUBLIC_DOMAIN"]
    ? `https://${process.env["EXPO_PUBLIC_DOMAIN"]}/api`
    : "/api";

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
}

function mapStarzItem(item: Record<string, unknown>, sourceId: SourceId): UnifiedManga {
  const slug = String(item["slug"] ?? item["id"] ?? "");
  const latestChs = item["latestChapters"] as { number: string; url: string }[] | undefined;
  const latest = latestChs?.[0];
  return {
    id: slug,
    slug,
    title: String(item["title"] ?? ""),
    coverUrl: String(item["coverUrl"] ?? ""),
    url: String(item["url"] ?? ""),
    sourceId,
    rating: item["rating"] ? String(item["rating"]) : undefined,
    latestChapterNum: latest?.number,
    latestChapterUrl: latest?.url,
  };
}

export async function fetchHomeMangas(sourceId: SourceId): Promise<UnifiedManga[]> {
  const endpointMap: Record<SourceId, string> = {
    linkmanga: "/linkmanga/home",
    kenmanga: "/kenmanga/home",
    asq: "/asq/home",
  };
  const res = await fetch(`${API_BASE}${endpointMap[sourceId]}`);
  if (!res.ok) throw new Error(`home fetch failed: ${res.status}`);
  const data = (await res.json()) as { manga: Record<string, unknown>[] };
  const items = data.manga ?? [];
  return items.map((item) => mapStarzItem(item, sourceId));
}

export async function searchMangas(
  sourceId: SourceId,
  query: string
): Promise<UnifiedManga[]> {
  const endpointMap: Partial<Record<SourceId, string>> = {
    linkmanga: "/linkmanga/search",
    kenmanga: "/kenmanga/search",
    asq: "/asq/search",
  };
  const endpoint = endpointMap[sourceId];
  if (!endpoint) return [];

  const res = await fetch(`${API_BASE}${endpoint}?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error(`search failed: ${res.status}`);
  const data = (await res.json()) as { results: Record<string, unknown>[] };
  const items = data.results ?? [];

  return items.map((item) => mapStarzItem(item, sourceId));
}

export function getChaptersUrl(sourceId: SourceId, id: string, latestNum?: string): string {
  const base = `${API_BASE}`;
  switch (sourceId) {
    case "linkmanga":
      return latestNum
        ? `${base}/linkmanga/manga/${encodeURIComponent(id)}/chapters?latest=${latestNum}`
        : `${base}/linkmanga/manga/${encodeURIComponent(id)}/chapters`;
    case "kenmanga":
      return `${base}/kenmanga/manga/${encodeURIComponent(id)}/chapters`;
    case "asq":
      return latestNum
        ? `${base}/asq/manga/${encodeURIComponent(id)}/chapters?latest=${latestNum}`
        : `${base}/asq/manga/${encodeURIComponent(id)}/chapters`;
    default:
      return "";
  }
}
