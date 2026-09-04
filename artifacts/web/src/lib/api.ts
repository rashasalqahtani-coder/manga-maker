import { useQuery } from '@tanstack/react-query';

export type SourceId = 'rorym';

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
  genres?: string[];
}

// Adjust API base properly based on the environment
const API_BASE = '/api';

function mapRorymItem(item: Record<string, unknown>): UnifiedManga {
  const slug = String(item['slug'] ?? item['id'] ?? '');
  const latestChs = item['latestChapters'] as { number: string; url: string }[] | undefined;
  const latest = latestChs?.[0];
  
  let genres: string[] = [];
  if (Array.isArray(item['genres'])) {
    genres = item['genres'].map(g => String(g));
  }

  return {
    id: slug,
    slug,
    title: String(item['title'] ?? ''),
    coverUrl: String(item['coverUrl'] ?? ''),
    url: String(item['url'] ?? ''),
    sourceId: 'rorym',
    rating: item['rating'] ? String(item['rating']) : undefined,
    isMostRead: item['isMostRead'] === true,
    latestChapterNum: latest?.number,
    latestChapterUrl: latest?.url,
    summary: item['summary'] ? String(item['summary']) : undefined,
    genres,
  };
}

export async function fetchMostReadMangas(): Promise<UnifiedManga[]> {
  const res = await fetch(`${API_BASE}/rorym/most-read`);
  if (!res.ok) throw new Error(`most-read fetch failed: ${res.status}`);
  const data = (await res.json()) as { manga: Record<string, unknown>[] };
  return (data.manga ?? []).map(mapRorymItem);
}

export async function fetchHomeMangas(): Promise<UnifiedManga[]> {
  const res = await fetch(`${API_BASE}/rorym/home`);
  if (!res.ok) throw new Error(`home fetch failed: ${res.status}`);
  const data = (await res.json()) as { manga: Record<string, unknown>[] };
  return (data.manga ?? []).map(mapRorymItem);
}

export async function searchMangas(query: string): Promise<UnifiedManga[]> {
  const res = await fetch(`${API_BASE}/rorym/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error(`search failed: ${res.status}`);
  const data = (await res.json()) as { results: Record<string, unknown>[] };
  return (data.results ?? []).map(mapRorymItem);
}

// React Query Hooks
export function useMostReadMangas() {
  return useQuery({
    queryKey: ['manga', 'most-read'],
    queryFn: fetchMostReadMangas,
  });
}

export function useHomeMangas() {
  return useQuery({
    queryKey: ['manga', 'home'],
    queryFn: fetchHomeMangas,
  });
}

export function useSearchMangas(query: string) {
  return useQuery({
    queryKey: ['manga', 'search', query],
    queryFn: () => searchMangas(query),
  });
}
