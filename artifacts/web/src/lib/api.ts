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
  teamName?: string;
}

export interface MangaChapter {
  id: string;
  number: string;
  title: string;
  pages: string[];
  uploadDate?: string;
}
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
    summary: item['summary'] ? String(item['summary']) : undefined,
    teamName: item['teamName'] ? String(item['teamName']) : undefined,
    isMostRead: item['isMostRead'] === true,
    latestChapterNum: latest?.number,
    latestChapterUrl: latest?.url,
    genres,
  };
}

async function apiRequest<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    const error = new Error(`request failed: ${res.status}`);
    error.name = res.status === 404 ? 'NotFoundError' : 'ApiError';
    throw error;
  }
  return res.json() as Promise<T>;
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

export function useManga(slug: string) {
  return useQuery({
    queryKey: ['manga', 'detail', slug],
    queryFn: () => fetchManga(slug),
    enabled: Boolean(slug),
    retry: (failureCount, error) => error.name !== 'NotFoundError' && failureCount < 1,
  });
}

export async function fetchManga(slug: string): Promise<UnifiedManga> {
  const data = await apiRequest<{ manga: Record<string, unknown> }>(
    `/rorym/manga/${encodeURIComponent(slug)}`,
  );
  return mapRorymItem(data.manga);
}

export async function fetchMangaChapters(slug: string): Promise<MangaChapter[]> {
  const data = await apiRequest<{ chapters: MangaChapter[] }>(
    `/rorym/manga/${encodeURIComponent(slug)}/chapters`,
  );
  return data.chapters ?? [];
}

export function useMangaChapters(slug: string) {
  return useQuery({
    queryKey: ['manga', 'chapters', slug],
    queryFn: () => fetchMangaChapters(slug),
    enabled: Boolean(slug),
    retry: (failureCount, error) => error.name !== 'NotFoundError' && failureCount < 1,
  });
}
