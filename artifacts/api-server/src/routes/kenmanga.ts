import { Router } from "express";

const router = Router();
const BASE = "https://ar.kenmanga.com";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      "Accept-Language": "ar,en;q=0.9",
      Accept: "text/html,application/xhtml+xml",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

interface KenmangaItem {
  id: string;
  slug: string;
  title: string;
  coverUrl: string;
  url: string;
  rating?: string;
  latestChapters: { number: string; url: string }[];
}

function htmlUnescape(s: string) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&#038;/g, "&")
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function extractChapterNum(url: string): string | undefined {
  const decoded = decodeURIComponent(url);
  const m = decoded.match(/[-\/](\d+(?:\.\d+)?)\/?$/);
  return m?.[1];
}

/**
 * Parse manga list page (/manga/).
 * Uses sequential extraction — titles, slugs, covers, ratings are all in
 * consistent order on the page so we zip them by index.
 */
function parseMangaListPage(html: string): KenmangaItem[] {
  // Titles: <a class="card-v-title"> or <h3 class="card-v-title"><a>Title</a>
  const titles: string[] = [];
  const titleRe = /class="card-v-title">\s*<a[^>]*>([^<]+)<\/a>/g;
  let tm: RegExpExecArray | null;
  while ((tm = titleRe.exec(html)) !== null) {
    titles.push(htmlUnescape(tm[1]!.trim()));
  }

  // Slugs (only /manga/ links, skip page/feed)
  const slugs: string[] = [];
  const slugRe = /href="https:\/\/ar\.kenmanga\.com\/manga\/([^/"]+)\/"\s*>/g;
  let sm: RegExpExecArray | null;
  while ((sm = slugRe.exec(html)) !== null) {
    const slug = sm[1]!;
    if (!slugs.includes(slug) && slug !== "page" && slug !== "feed") {
      slugs.push(slug);
    }
  }

  // Covers: i0.wp.com CDN — first occurrence after the logo
  const covers: string[] = [];
  const coverRe = /src="(https:\/\/i0\.wp\.com\/ar\.kenmanga\.com\/wp-content\/uploads\/[^"?]+)/g;
  let cm: RegExpExecArray | null;
  while ((cm = coverRe.exec(html)) !== null) {
    covers.push(cm[1]!);
  }
  // Remove duplicate covers (same URL appearing twice due to lazy-load)
  const uniqueCovers: string[] = [...new Set(covers)];
  // The first cover is often the logo — skip it if it ends with logo.png/webp
  const mangaCovers = uniqueCovers.filter((c) => !c.includes("logo"));

  // Ratings: first number after .v-rating
  const ratings: string[] = [];
  const ratingRe = /v-rating[^>]*>[^0-9]*([0-9.]+)/g;
  let rm: RegExpExecArray | null;
  while ((rm = ratingRe.exec(html)) !== null) {
    ratings.push(rm[1]!);
  }

  // Latest chapter links per slug (from card-v-chapters)
  const chapMap: Record<string, { number: string; url: string }[]> = {};
  const chapRe =
    /href="(https:\/\/ar\.kenmanga\.com\/([^"]+))"\s+class="[^"]*chapter[^"]*"/g;
  let chapM: RegExpExecArray | null;
  while ((chapM = chapRe.exec(html)) !== null) {
    const chapUrl = chapM[1]!;
    const num = extractChapterNum(chapUrl);
    if (!num) continue;
    // Associate chapter with manga by slug prefix
    for (const slug of slugs) {
      if (chapM[2]!.startsWith(slug)) {
        if (!chapMap[slug]) chapMap[slug] = [];
        if (!chapMap[slug]!.some((c) => c.number === num)) {
          chapMap[slug]!.push({ number: num, url: chapUrl });
        }
        break;
      }
    }
  }

  return slugs.map((slug, i) => ({
    id: slug,
    slug,
    title: titles[i] ?? slug.replace(/-/g, " "),
    coverUrl: mangaCovers[i] ?? "",
    url: `${BASE}/manga/${slug}/`,
    rating: ratings[i],
    latestChapters: (chapMap[slug] ?? []).slice(0, 3),
  }));
}

/**
 * Parse search results page (/search/{query}/).
 * Uses "update-card" div structure.
 */
function parseSearchPage(html: string): KenmangaItem[] {
  const results: KenmangaItem[] = [];

  // Each result: <div class="update-card">...</div>
  const cardRe = /class="update-card">([\s\S]*?)(?=class="update-card"|<\/main>)/g;
  let m: RegExpExecArray | null;
  while ((m = cardRe.exec(html)) !== null) {
    const block = m[1]!;

    // Slug + URL
    const slugM = block.match(/\/manga\/([^/"]+)\//);
    if (!slugM) continue;
    const slug = slugM[1]!;

    // Title: class="u-title"
    const titleM = block.match(/class="u-title"[^>]*>([^<]+)<\/a>/);
    const title = titleM ? htmlUnescape(titleM[1]!.trim()) : slug.replace(/-/g, " ");

    // Cover: img alt (most reliable since img has the alt=title)
    const coverM = block.match(/src="(https:\/\/i0\.wp\.com\/[^"?]+)/);
    const coverUrl = coverM ? coverM[1]! : "";

    // Latest chapters
    const chapRe2 =
      /href="(https:\/\/ar\.kenmanga\.com\/[^"]+)"\s+class="chapter-chip"/g;
    const latestChapters: { number: string; url: string }[] = [];
    let cm: RegExpExecArray | null;
    while ((cm = chapRe2.exec(block)) !== null) {
      const num = extractChapterNum(cm[1]!);
      if (num) latestChapters.push({ number: num, url: cm[1]! });
    }

    results.push({
      id: slug,
      slug,
      title,
      coverUrl,
      url: `${BASE}/manga/${slug}/`,
      latestChapters: latestChapters.slice(0, 3),
    });
  }

  return results;
}

/**
 * Parse chapter list from manga detail page.
 * Chapter links: href="..." class="...chapter..."
 */
function parseChapterList(html: string): { number: string; title: string; url: string }[] {
  const chapters: { number: string; title: string; url: string }[] = [];
  const seen = new Set<string>();

  const chapRe =
    /href="(https:\/\/ar\.kenmanga\.com\/[^"]+)"\s+class="[^"]*chapter[^"]*"/g;
  let m: RegExpExecArray | null;
  while ((m = chapRe.exec(html)) !== null) {
    const url = m[1]!;
    if (seen.has(url)) continue;
    seen.add(url);
    const num = extractChapterNum(url);
    if (!num) continue;
    chapters.push({ number: num, title: `فصل ${num}`, url });
  }

  chapters.sort((a, b) => parseFloat(b.number) - parseFloat(a.number));
  return chapters;
}

// ── In-memory cache ───────────────────────────────────────────────────────────
let homeCache: { manga: KenmangaItem[]; ts: number } | null = null;
const HOME_TTL = 2 * 60 * 1000;

/** GET /api/kenmanga/home */
router.get("/kenmanga/home", async (req, res) => {
  try {
    if (homeCache && Date.now() - homeCache.ts < HOME_TTL) {
      res.json({ manga: homeCache.manga, source: "kenmanga", sourceUrl: BASE });
      return;
    }
    const html = await fetchHtml(`${BASE}/manga/`);
    const manga = parseMangaListPage(html);
    homeCache = { manga, ts: Date.now() };
    res.json({ manga, source: "kenmanga", sourceUrl: BASE });
  } catch (err) {
    req.log.error({ err }, "kenmanga home error");
    res.status(502).json({ error: "upstream error" });
  }
});

/** GET /api/kenmanga/search?q= */
router.get("/kenmanga/search", async (req, res) => {
  const q = String(req.query["q"] ?? "").trim();
  if (!q) { res.json({ results: [] }); return; }
  try {
    const html = await fetchHtml(`${BASE}/search/${encodeURIComponent(q)}/`);
    const results = parseSearchPage(html);
    res.json({ results, source: "kenmanga" });
  } catch (err) {
    req.log.error({ err }, "kenmanga search error");
    res.status(502).json({ error: "upstream error" });
  }
});

/** GET /api/kenmanga/manga/:slug/chapters */
router.get("/kenmanga/manga/:slug/chapters", async (req, res) => {
  const { slug } = req.params;
  try {
    const html = await fetchHtml(`${BASE}/manga/${encodeURIComponent(slug)}/`);
    const chapters = parseChapterList(html);
    res.json({ chapters, source: "kenmanga" });
  } catch (err) {
    req.log.error({ err }, "kenmanga chapters error");
    res.status(502).json({ error: "upstream error" });
  }
});

export default router;
