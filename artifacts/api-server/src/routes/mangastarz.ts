import { Router } from "express";

const router = Router();

const BASE = "https://manga-starz.net";
const AJAX = `${BASE}/wp-admin/admin-ajax.php`;

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "ar,en;q=0.9",
      Referer: BASE,
    },
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

async function ajaxPost(body: string): Promise<unknown> {
  const res = await fetch(AJAX, {
    method: "POST",
    headers: {
      "User-Agent": UA,
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Requested-With": "XMLHttpRequest",
      Referer: BASE,
    },
    body,
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`AJAX HTTP ${res.status}`);
  return res.json();
}

// ── Helpers ─────────────────────────────────────────────────────────────────

export interface StarzManga {
  id: string;
  slug: string;
  title: string;
  coverUrl: string;
  url: string;
  rating?: string;
  latestChapters: { number: string; url: string }[];
  description?: string;
  genres?: string[];
  status?: string;
  authors?: string[];
}

export interface StarzChapter {
  number: string;
  title: string;
  url: string;
  date?: string;
}

/** Parse manga cards from homepage / listing HTML */
function parseMangaCards(html: string): StarzManga[] {
  const results: StarzManga[] = [];

  // Match each manga card block
  const cardRe =
    /<div[^>]+page-item-detail manga[^>]*>[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/g;
  let block: RegExpExecArray | null;

  while ((block = cardRe.exec(html)) !== null) {
    const card = block[0];

    // post-id
    const idM = card.match(/data-post-id="(\d+)"/);
    // url + title
    const urlM = card.match(/href="(https:\/\/manga-starz\.net\/manga\/([^/"]+)\/)"/);
    const titleM = card.match(/title="([^"]+)"/);
    // cover image — prefer larger srcset
    const srcsetM = card.match(/srcset="([^"]+)"/);
    const srcM = card.match(/\bsrc="(https:\/\/[^"]*\.(?:jpg|jpeg|png|webp))"/);
    // rating
    const ratingM = card.match(/<span class="score[^"]*">([0-9.]+)<\/span>/);
    // chapters
    const chapRe =
      /href="(https:\/\/manga-starz\.net\/manga\/[^/]+\/(\d+)\/)"/g;
    const latestChapters: { number: string; url: string }[] = [];
    let chapM: RegExpExecArray | null;
    while ((chapM = chapRe.exec(card)) !== null) {
      if (!latestChapters.some((c) => c.number === chapM![2])) {
        latestChapters.push({ number: chapM[2], url: chapM[1] });
      }
    }

    if (!urlM) continue;

    // Pick highest-resolution cover from srcset
    let coverUrl = srcM?.[1] ?? "";
    if (srcsetM) {
      const srcsetEntries = srcsetM[1]
        .split(",")
        .map((e) => e.trim().split(/\s+/));
      // pick the largest width
      let maxW = 0;
      for (const [url, wStr] of srcsetEntries) {
        const w = parseInt(wStr ?? "0");
        if (url && w > maxW) { maxW = w; coverUrl = url; }
      }
    }

    results.push({
      id: idM?.[1] ?? urlM[2],
      slug: urlM[2],
      title: titleM?.[1]?.replace(/&#8217;/g, "'").replace(/&amp;/g, "&") ?? urlM[2],
      coverUrl,
      url: urlM[1],
      rating: ratingM?.[1],
      latestChapters: latestChapters.slice(0, 3),
    });
  }

  return results;
}

/** Parse full manga detail page */
function parseMangaDetail(html: string, slug: string): StarzManga | null {
  // title
  const titleM = html.match(/<h1 class="entry-title"[^>]*>([^<]+)<\/h1>/);
  // cover
  const coverM = html.match(
    /class="summary_image"[\s\S]*?<img[^>]+(?:data-src|src)="([^"]+)"/
  );
  // description
  const descM = html.match(
    /class="summary__content[^"]*"[^>]*>([\s\S]*?)<\/div>/
  );
  const description = descM
    ? descM[1].replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
    : undefined;
  // rating
  const ratingM = html.match(/class="score[^"]*total_votes">([0-9.]+)/);
  // genres
  const genresM = html.matchAll(/class="genres-content"[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/g);
  const genres: string[] = [];
  for (const gm of html.matchAll(/<div class="genres-content">([\s\S]*?)<\/div>/g)) {
    const tagRe = /<a[^>]*>([^<]+)<\/a>/g;
    let tm: RegExpExecArray | null;
    while ((tm = tagRe.exec(gm[1])) !== null) genres.push(tm[1].trim());
  }
  void genresM;
  // authors
  const authorsM = html.match(/class="author-content"[^>]*>([\s\S]*?)<\/div>/);
  const authors: string[] = [];
  if (authorsM) {
    for (const am of authorsM[1].matchAll(/<a[^>]*>([^<]+)<\/a>/g)) {
      authors.push(am[1].trim());
    }
  }
  // status
  const statusM = html.match(/class="post-status"[\s\S]*?<div class="summary-content"[^>]*>\s*([^<\s][^<]*)<\/div>/);

  // latest chapters from listing
  const chapters: StarzChapter[] = [];
  const chapRe =
    /href="(https:\/\/manga-starz\.net\/manga\/[^/]+\/(\d+)\/)"[^>]*>\s*([\s\S]*?)<\/a>/g;
  let cm: RegExpExecArray | null;
  while ((cm = chapRe.exec(html)) !== null) {
    const num = cm[2];
    if (!chapters.some((c) => c.number === num)) {
      chapters.push({ number: num, title: `فصل ${num}`, url: cm[1] });
    }
    if (chapters.length >= 100) break;
  }

  if (!titleM) return null;

  return {
    id: slug,
    slug,
    title: titleM[1].replace(/&#8217;/g, "'").replace(/&amp;/g, "&").trim(),
    coverUrl: coverM?.[1] ?? "",
    url: `${BASE}/manga/${slug}/`,
    rating: ratingM?.[1],
    latestChapters: chapters.slice(0, 3).map((c) => ({ number: c.number, url: c.url })),
    description,
    genres: genres.length ? genres : undefined,
    status: statusM?.[1]?.trim(),
    authors: authors.length ? authors : undefined,
  };
}

// ── Routes ───────────────────────────────────────────────────────────────────

let starzHomeCache: { manga: ReturnType<typeof parseMangaCards>; ts: number } | null = null;
const STARZ_HOME_TTL = 2 * 60 * 1000;

/** GET /api/starz/home — homepage manga (trending / latest) */
router.get("/starz/home", async (req, res) => {
  try {
    if (starzHomeCache && Date.now() - starzHomeCache.ts < STARZ_HOME_TTL) {
      res.json({ manga: starzHomeCache.manga });
      return;
    }
    const html = await fetchHtml(BASE + "/");
    const manga = parseMangaCards(html);
    starzHomeCache = { manga, ts: Date.now() };
    res.json({ manga });
  } catch (err) {
    req.log.error({ err }, "starz home error");
    res.status(502).json({ error: "upstream error" });
  }
});

/** GET /api/starz/search?q=... — search manga by title */
router.get("/starz/search", async (req, res) => {
  const q = (req.query["q"] as string | undefined)?.trim() ?? "";
  if (!q) { res.json({ results: [] }); return; }
  try {
    const data = (await ajaxPost(
      `action=wp-manga-search-manga&title=${encodeURIComponent(q)}`
    )) as { success: boolean; data: { title: string; url: string; type: string }[] };
    const results = (data.data ?? []).map((item) => {
      const slugM = item.url.match(/\/manga\/([^/]+)\//);
      return {
        slug: slugM?.[1] ?? "",
        title: item.title,
        url: item.url,
        coverUrl: "",
      };
    });
    res.json({ results });
  } catch (err) {
    req.log.error({ err }, "starz search error");
    res.status(502).json({ error: "upstream error" });
  }
});

/** GET /api/starz/manga/:slug — manga detail */
router.get("/starz/manga/:slug", async (req, res) => {
  const slug = req.params["slug"];
  if (!slug) { res.status(400).json({ error: "missing slug" }); return; }
  try {
    const html = await fetchHtml(`${BASE}/manga/${slug}/`);
    const manga = parseMangaDetail(html, slug);
    if (!manga) { res.status(404).json({ error: "not found" }); return; }
    res.json(manga);
  } catch (err) {
    req.log.error({ err }, "starz manga detail error");
    res.status(502).json({ error: "upstream error" });
  }
});

/** GET /api/starz/manga/:slug/chapters — chapter list
 *  Since individual manga pages are Cloudflare-protected, we build a chapter
 *  list from the two known latest chapters (from homepage data passed as query
 *  params) and generate the full sequential list by counting down from the max.
 *  Caller must pass ?latest=N (latest chapter number).
 */
router.get("/starz/manga/:slug/chapters", async (req, res) => {
  const slug = req.params["slug"];
  if (!slug) { res.status(400).json({ error: "missing slug" }); return; }

  const latestParam = req.query["latest"];
  const latestNum = latestParam ? parseFloat(String(latestParam)) : NaN;

  if (!isNaN(latestNum) && latestNum > 0) {
    // Build sequential chapter list from 1 to latestNum
    const chapters: StarzChapter[] = [];
    for (let n = Math.floor(latestNum); n >= 1; n--) {
      chapters.push({
        number: String(n),
        title: `فصل ${n}`,
        url: `${BASE}/manga/${slug}/${n}/`,
      });
    }
    res.json({ chapters });
    return;
  }

  // Fallback: try fetching the manga page (may be Cloudflare-blocked)
  try {
    const html = await fetchHtml(`${BASE}/manga/${slug}/`);
    const chapters: StarzChapter[] = [];
    const chapRe =
      /href="(https:\/\/manga-starz\.net\/manga\/[^/]+\/(\d+)\/)"[^>]*class="btn-link"/g;
    let cm: RegExpExecArray | null;
    while ((cm = chapRe.exec(html)) !== null) {
      const num = cm[2];
      if (!chapters.some((c) => c.number === num)) {
        chapters.push({ number: num, title: `فصل ${num}`, url: cm[1] });
      }
    }
    chapters.sort((a, b) => parseFloat(b.number) - parseFloat(a.number));
    res.json({ chapters });
  } catch (err) {
    req.log.error({ err }, "starz chapters error");
    res.status(502).json({ error: "upstream error" });
  }
});

export default router;
