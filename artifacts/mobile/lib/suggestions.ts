import type { UnifiedManga } from "@/lib/sources";

const domain =
  typeof process !== "undefined" && process.env["EXPO_PUBLIC_DOMAIN"]
    ? process.env["EXPO_PUBLIC_DOMAIN"]
    : "";
const API_BASE = domain ? `https://${domain}/api` : "/api";

export interface MangaSuggestion {
  id: string;
  userId: string;
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
  status: "visible" | "hidden";
}

export type SuggestionReportReason = "offensive" | "spam" | "spoiler" | "other";

export interface SuggestionReportSummary {
  suggestion: MangaSuggestion;
  reportCount: number;
  reasons: SuggestionReportReason[];
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

async function authenticatedRequest(path: string, token: string, init: RequestInit): Promise<void> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...init.headers },
  });
  if (!response.ok) {
    if (response.status === 401) throw new Error("يجب تسجيل الدخول");
    if (response.status === 403) throw new Error("ليست لديك صلاحية لهذا الإجراء");
    throw new Error("تعذر إكمال الإجراء");
  }
}

export function reportSuggestion(id: string, reason: SuggestionReportReason, token: string) {
  return authenticatedRequest(`/suggestions/${encodeURIComponent(id)}/reports`, token, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export function deleteSuggestion(id: string, token: string) {
  return authenticatedRequest(`/suggestions/${encodeURIComponent(id)}`, token, { method: "DELETE" });
}

export async function fetchSuggestionReports(token: string): Promise<SuggestionReportSummary[]> {
  const response = await fetch(`${API_BASE}/admin/suggestion-reports`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error("تعذر تحميل البلاغات");
  return ((await response.json()) as { reports: SuggestionReportSummary[] }).reports;
}

export function moderateSuggestion(id: string, action: "hide" | "restore" | "delete", token: string) {
  return authenticatedRequest(`/admin/suggestions/${encodeURIComponent(id)}`, token, {
    method: "PATCH",
    body: JSON.stringify({ action }),
  });
}