import type { UnifiedManga } from "@/lib/sources";

const domain =
  typeof process !== "undefined" && process.env["EXPO_PUBLIC_DOMAIN"]
    ? process.env["EXPO_PUBLIC_DOMAIN"]
    : "";
const API_BASE = domain ? `https://${domain}/api` : "/api";

export interface MangaSuggestion {
  id: string;
  userName: string;
  userAvatar?: string | null;
  sourceSlug: string;
  sourceTitle: string;
  sourceCoverUrl?: string | null;
  suggestedSlug: string;
  suggestedTitle: string;
  suggestedCoverUrl?: string | null;
  reason: string;
  createdAt: string;
}

export async function fetchSuggestions(): Promise<MangaSuggestion[]> {
  const response = await fetch(`${API_BASE}/suggestions`);
  if (!response.ok) throw new Error("تعذر تحميل الاقتراحات");
  const data = (await response.json()) as { suggestions: MangaSuggestion[] };
  return data.suggestions;
}

export async function createSuggestion(input: {
  source: UnifiedManga;
  suggested: UnifiedManga;
  reason: string;
  userName: string;
  userAvatar?: string;
  token: string;
}): Promise<MangaSuggestion> {
  const response = await fetch(`${API_BASE}/suggestions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${input.token}`,
    },
    body: JSON.stringify({
      userName: input.userName,
      userAvatar: input.userAvatar,
      sourceSlug: input.source.slug,
      sourceTitle: input.source.title,
      sourceCoverUrl: input.source.coverUrl,
      suggestedSlug: input.suggested.slug,
      suggestedTitle: input.suggested.title,
      suggestedCoverUrl: input.suggested.coverUrl,
      reason: input.reason.trim(),
    }),
  });
  if (!response.ok) throw new Error(response.status === 401 ? "يجب تسجيل الدخول" : "تعذر نشر الاقتراح");
  const data = (await response.json()) as { suggestion: MangaSuggestion };
  return data.suggestion;
}