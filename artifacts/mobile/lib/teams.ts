const domain =
  typeof process !== "undefined" &&
  (process.env["EXPO_PUBLIC_API_DOMAIN"] || process.env["EXPO_PUBLIC_DOMAIN"])
    ? process.env["EXPO_PUBLIC_API_DOMAIN"] || process.env["EXPO_PUBLIC_DOMAIN"]
    : "";

const API_BASE = domain ? `https://${domain}/api` : "/api";

export interface PublicTeamChapter {
  id: string;
  number: string;
  title: string;
  imageCount: number;
  imageUrls?: string[];
}

export interface PublicTeamManga {
  id: string;
  title: string;
  coverUrl?: string;
  description?: string;
  chapters: PublicTeamChapter[];
}

export interface PublicTeam {
  id: string;
  name: string;
  description: string;
  emoji: string;
  manga: PublicTeamManga[];
  publishedAt: string;
  updatedAt: string;
}

export async function searchPublicTeams(q: string): Promise<PublicTeam[]> {
  const url = q.trim()
    ? `${API_BASE}/teams?q=${encodeURIComponent(q.trim())}`
    : `${API_BASE}/teams`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("فشل تحميل الفرق");
  return res.json() as Promise<PublicTeam[]>;
}

export async function getPublicTeam(id: string): Promise<PublicTeam> {
  const res = await fetch(`${API_BASE}/teams/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error("الفريق غير موجود");
  return res.json() as Promise<PublicTeam>;
}

export async function publishTeam(team: {
  id: string;
  name: string;
  description: string;
  emoji: string;
  manga: PublicTeamManga[];
}): Promise<PublicTeam> {
  const res = await fetch(`${API_BASE}/teams/${encodeURIComponent(team.id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(team),
  });
  if (!res.ok) throw new Error("فشل النشر");
  return res.json() as Promise<PublicTeam>;
}

export async function unpublishTeam(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/teams/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("فشل إلغاء النشر");
}

export interface TeamMangaResult {
  mangaId: string;
  title: string;
  coverUrl: string | null;
  chaptersCount: number;
  chapters: PublicTeamChapter[];
  teamName: string;
  teamEmoji: string;
  teamId: string;
}

/**
 * Upload one image URI to the server and return its hosted URL.
 * Used during team publish to host chapter images publicly.
 */
export async function uploadTeamImage(
  imageUri: string,
  token: string,
): Promise<string> {
  const formData = new FormData();
  const filename = imageUri.split("/").pop() ?? "image.jpg";
  formData.append("image", { uri: imageUri, name: filename, type: "image/jpeg" } as unknown as Blob);

  const res = await fetch(`${API_BASE}/teams/images`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) throw new Error("فشل رفع الصورة");
  const { url } = (await res.json()) as { url: string };
  return url;
}

export async function searchTeamManga(q: string): Promise<TeamMangaResult[]> {
  if (!q.trim()) return [];
  const res = await fetch(`${API_BASE}/teams/manga?q=${encodeURIComponent(q.trim())}`);
  if (!res.ok) return [];
  return res.json() as Promise<TeamMangaResult[]>;
}
