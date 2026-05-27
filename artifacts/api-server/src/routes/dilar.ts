import { Router } from "express";

const router = Router();

const BASE = "https://dilar.tube";
const API = `${BASE}/api`;

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

async function apiFetch(path: string, params?: Record<string, string>): Promise<unknown> {
  const url = new URL(`${API}${path}`);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), {
    headers: { "User-Agent": UA, Accept: "application/json", Referer: BASE },
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export interface DilarManga {
  id: string;
  slug: string;
  title: string;
  coverUrl: string;
  url: string;
  rating?: string;
  summary?: string;
  totalChapters?: number;
  translationStatus?: string;
  latestChapters: { number: string; url: string }[];
}

export interface DilarChapter {
  id: string;
  number: string;
  title: string;
  url: string;
}

function buildMangaUrl(id: string): string {
  return `${BASE}/series/${id}`;
}

function buildChapterUrl(seriesId: string, chapterNum: string): string {
  const num = Math.floor(parseFloat(chapterNum));
  return `${BASE}/series/${seriesId}/chapter/${num}`;
}

function mapSeries(item: Record<string, unknown>): DilarManga {
  const id = String(item["id"] ?? "");
  const cover = String(item["cover"] ?? "");
  const latestCh = item["latestChapter"] as Record<string, unknown> | null;
  const latestNum = latestCh?.["chapter"] ? String(latestCh["chapter"]) : undefined;
  const latestUrl = latestNum ? buildChapterUrl(id, latestNum) : undefined;

  // Cover URL base not yet determined — serve as-is (clients will show placeholder)
  // Candidates tested: /covers/, /storage/, /images/, /uploads/ all 404
  // The cover filename is stored as e.g. "1000084279.webp"
  return {
    id,
    slug: id,
    title: String(item["title"] ?? ""),
    coverUrl: "",
    url: buildMangaUrl(id),
    rating: item["rating"] ? String(item["rating"]) : undefined,
    summary: item["summary"] ? String(item["summary"]) : undefined,
    totalChapters: item["total_chapters"] ? Number(item["total_chapters"]) : undefined,
    translationStatus: item["translation_status"] ? String(item["translation_status"]) : undefined,
    latestChapters: latestNum && latestUrl
      ? [{ number: String(parseFloat(latestNum)), url: latestUrl }]
      : [],
  };
}

let dilarHomeCache: { manga: ReturnType<typeof mapSeries>[]; ts: number } | null = null;
const DILAR_HOME_TTL = 2 * 60 * 1000;

/** GET /api/dilar/home */
router.get("/dilar/home", async (req, res) => {
  try {
    if (dilarHomeCache && Date.now() - dilarHomeCache.ts < DILAR_HOME_TTL) {
      res.json({ manga: dilarHomeCache.manga, source: "dilar", sourceUrl: BASE });
      return;
    }
    const data = (await apiFetch("/series", { page: "1" })) as {
      series: Record<string, unknown>[];
    };
    const manga = (data.series ?? []).map(mapSeries);
    dilarHomeCache = { manga, ts: Date.now() };
    res.json({ manga, source: "dilar", sourceUrl: BASE });
  } catch (err) {
    req.log.error({ err }, "dilar home error");
    res.status(502).json({ error: "upstream error" });
  }
});

/** GET /api/dilar/search?q= */
router.get("/dilar/search", async (req, res) => {
  const q = String(req.query["q"] ?? "").trim();
  if (!q) { res.json({ results: [] }); return; }
  try {
    const data = (await apiFetch("/series", { search: q })) as {
      series: Record<string, unknown>[];
    };
    const results = (data.series ?? []).map(mapSeries);
    res.json({ results });
  } catch (err) {
    req.log.error({ err }, "dilar search error");
    res.status(502).json({ error: "upstream error" });
  }
});

/** GET /api/dilar/manga/:id/chapters */
router.get("/dilar/manga/:id/chapters", async (req, res) => {
  const id = req.params["id"];
  if (!id) { res.status(400).json({ error: "missing id" }); return; }
  try {
    const data = (await apiFetch(`/series/${encodeURIComponent(id)}/chapters`)) as
      | Record<string, unknown>[]
      | { chapters: Record<string, unknown>[] };

    const arr: Record<string, unknown>[] = Array.isArray(data)
      ? data
      : (data as { chapters: Record<string, unknown>[] }).chapters ?? [];

    const chapters: DilarChapter[] = arr
      .map((ch) => {
        const num = String(ch["chapter"] ?? "");
        const chId = String(ch["id"] ?? "");
        const displayNum = num ? String(parseFloat(num)) : chId;
        return {
          id: chId,
          number: displayNum,
          title: String(ch["title"] || `فصل ${displayNum}`),
          url: buildChapterUrl(id, num || displayNum),
        };
      })
      .sort((a, b) => parseFloat(b.number) - parseFloat(a.number));

    res.json({ chapters });
  } catch (err) {
    req.log.error({ err }, "dilar chapters error");
    res.status(502).json({ error: "upstream error" });
  }
});

export default router;
