import { Router } from "express";

const router = Router();

const BASE = "https://link-manga.net";
const COVER_BASE = "https://link.link-manga.net";
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

export interface LinkManga {
  id: string;
  slug: string;
  title: string;
  coverUrl: string;
  url: string;
  rating?: string;
  latestChapters: { number: string; url: string }[];
}

function unescape(s: string) {
  return s.replace(/&#8217;/g, "'").replace(/&amp;/g, "&").replace(/&#039;/g, "'");
}

function parseMangaCards(html: string): LinkManga[] {
  // Extract slug → title from anchor title attributes (most reliable)
  const slugTitleMap: Record<string, string> = {};
  const linkRe =
    /href="https:\/\/link-manga\.net\/manga\/([^/"]+)\/" [^>]*title="([^"]+)"/g;
  let lt: RegExpExecArray | null;
  while ((lt = linkRe.exec(html)) !== null) {
    const slug = lt[1];
    if (!slugTitleMap[slug]) slugTitleMap[slug] = unescape(lt[2]);
  }

  // Extract slugs in order (first appearance)
  const slugs: string[] = [];
  const slugRe = /href="https:\/\/link-manga\.net\/manga\/([^/"]+)\/" /g;
  let sm: RegExpExecArray | null;
  while ((sm = slugRe.exec(html)) !== null) {
    if (!slugs.includes(sm[1])) slugs.push(sm[1]);
  }

  // Build cover map: slug → coverUrl via srcset in card blocks
  const coverMap: Record<string, string> = {};
  const cardRe =
    /href="https:\/\/link-manga\.net\/manga\/([^/"]+)\/"\s[^>]*>.*?<img[^>]+(?:data-src|src)="(https:\/\/link\.link-manga\.net\/[^"]+)"[^>]*>/gs;
  let cm: RegExpExecArray | null;
  while ((cm = cardRe.exec(html)) !== null) {
    if (!coverMap[cm[1]]) coverMap[cm[1]] = cm[2];
  }
  // Fallback: extract all cover URLs in order
  const allCovers: string[] = [];
  const coverFallbackRe =
    /src="(https:\/\/link\.link-manga\.net\/wp-content\/uploads\/[^"]+\.(?:jpg|jpeg|png|webp))"/g;
  let cf: RegExpExecArray | null;
  while ((cf = coverFallbackRe.exec(html)) !== null) allCovers.push(cf[1]);

  // Chapter map
  const chapterMap: Record<string, { number: string; url: string }[]> = {};
  const chapRe = /href="(https:\/\/link-manga\.net\/manga\/([^/]+)\/([0-9]+)\/)"/g;
  let chapM: RegExpExecArray | null;
  while ((chapM = chapRe.exec(html)) !== null) {
    const slug = chapM[2];
    if (!chapterMap[slug]) chapterMap[slug] = [];
    if (!chapterMap[slug].some((c) => c.number === chapM![3])) {
      chapterMap[slug].push({ number: chapM[3], url: chapM[1] });
    }
  }

  return slugs
    .filter((slug) => slugTitleMap[slug]) // only keep slugs that have a real title
    .map((slug, i) => ({
      id: slug,
      slug,
      title: slugTitleMap[slug]!,
      coverUrl: coverMap[slug] ?? allCovers[i + 1] ?? allCovers[i] ?? "",
      url: `${BASE}/manga/${slug}/`,
      latestChapters: (chapterMap[slug] ?? []).slice(0, 3),
    }));
}

let linkHomeCache: { manga: LinkManga[]; ts: number } | null = null;
const LINK_HOME_TTL = 2 * 60 * 1000;

/** GET /api/linkmanga/home */
router.get("/linkmanga/home", async (req, res) => {
  try {
    if (linkHomeCache && Date.now() - linkHomeCache.ts < LINK_HOME_TTL) {
      res.json({ manga: linkHomeCache.manga, source: "linkmanga", sourceUrl: BASE });
      return;
    }
    const html = await fetchHtml(`${BASE}/`);
    const manga = parseMangaCards(html);
    linkHomeCache = { manga, ts: Date.now() };
    res.json({ manga, source: "linkmanga", sourceUrl: BASE });
  } catch (err) {
    req.log.error({ err }, "linkmanga home error");
    res.status(502).json({ error: "upstream error" });
  }
});

/** GET /api/linkmanga/search?q= */
router.get("/linkmanga/search", async (req, res) => {
  const q = String(req.query["q"] ?? "").trim();
  if (!q) { res.json({ results: [] }); return; }
  try {
    const data = (await ajaxPost(
      `action=wp-manga-search-manga&title=${encodeURIComponent(q)}`
    )) as { success: boolean; data?: { title: string; url: string; image?: string }[] };
    if (!data.success) { res.json({ results: [] }); return; }
    const results = (data.data ?? []).map((item) => {
      const slug = item.url.split("/manga/")[1]?.replace(/\/$/, "") ?? item.url;
      return {
        id: slug,
        slug,
        title: unescape(item.title),
        coverUrl: item.image ?? "",
        url: item.url,
        source: "linkmanga",
        latestChapters: [] as { number: string; url: string }[],
      };
    });
    res.json({ results });
  } catch (err) {
    req.log.error({ err }, "linkmanga search error");
    res.status(502).json({ error: "upstream error" });
  }
});

/** GET /api/linkmanga/manga/:slug/chapters?latest=N */
router.get("/linkmanga/manga/:slug/chapters", async (req, res) => {
  const slug = req.params["slug"];
  if (!slug) { res.status(400).json({ error: "missing slug" }); return; }

  const latestNum = parseFloat(String(req.query["latest"] ?? ""));
  if (!isNaN(latestNum) && latestNum > 0) {
    const chapters = [];
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

  try {
    const html = await fetchHtml(`${BASE}/manga/${slug}/`);
    const chapters: { number: string; title: string; url: string }[] = [];
    const chapRe = /href="(https:\/\/link-manga\.net\/manga\/[^/]+\/([0-9]+)\/)"/g;
    let cm: RegExpExecArray | null;
    while ((cm = chapRe.exec(html)) !== null) {
      if (!chapters.some((c) => c.number === cm![2])) {
        chapters.push({ number: cm[2], title: `فصل ${cm[2]}`, url: cm[1] });
      }
    }
    chapters.sort((a, b) => parseFloat(b.number) - parseFloat(a.number));
    res.json({ chapters });
  } catch (err) {
    req.log.error({ err }, "linkmanga chapters error");
    res.status(502).json({ error: "upstream error" });
  }
});

void COVER_BASE;
export default router;
