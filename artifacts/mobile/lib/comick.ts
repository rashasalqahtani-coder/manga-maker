// ComicK.io — blocked by Cloudflare for server-side proxying.
// File kept as placeholder; all exports are no-ops so existing imports don't break.

export interface ComickCover { b2key: string; w?: number; h?: number; }
export interface ComickManga {
  id: number; hid: string; slug: string; title: string; desc?: string;
  status?: number; country?: string;
  md_covers?: ComickCover[];
  md_titles?: { title: string; lang?: string }[];
  genres?: { name: string }[];
}
export interface ComickChapter {
  id: number; hid: string; chap?: string; vol?: string;
  title?: string; lang: string; created_at: string;
  group_name?: string[]; md_groups?: { title: string; slug: string }[];
}
export interface ComickChapterImage { url: string; w?: number; h?: number; }

export function getComickCoverUrl(_manga: ComickManga): string { return ""; }
export function getComickTitle(manga: ComickManga): string { return manga.title ?? ""; }
export function getComickStatus(_manga: ComickManga): string { return ""; }
export function getComickType(_manga: ComickManga): string { return ""; }

export async function getComickPopular(): Promise<ComickManga[]> { return []; }
export async function getComickRecent(): Promise<ComickManga[]> { return []; }
export async function searchComick(_q: string): Promise<ComickManga[]> { return []; }
export async function getComickMangaDetail(_slug: string): Promise<ComickManga | null> { return null; }
export async function getComickChapters(_slug: string): Promise<ComickChapter[]> { return []; }
export async function getComickChapterPages(_hid: string): Promise<ComickChapterImage[]> { return []; }
