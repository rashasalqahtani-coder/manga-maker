import { Router } from "express";

const router = Router();

const BASE = "https://3asq.org";
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

function htmlUnescape(s: string) {
  return s
    .replace(/&#8217;/g, "'")
    .replace(/&#8211;/g, "–")
    .replace(/&amp;/g, "&")
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"');
}

export interface AsqManga {
  id: string;
  slug: string;
  title: string;
  coverUrl: string;
  url: string;
  latestChapters: { number: string; url: string }[];
}

function parseMangaCards(html: string): AsqManga[] {
  // slug → title from anchor title attributes
  const slugTitleMap: Record<string, string> = {};
  const linkRe = /href="https:\/\/3asq\.org\/manga\/([^/"]+)\/"[^>]*title="([^"]+)"/g;
  let lt: RegExpExecArray | null;
  while ((lt = linkRe.exec(html)) !== null) {
    const slug = lt[1]!;
    if (!slugTitleMap[slug]) slugTitleMap[slug] = htmlUnescape(lt[2]!);
  }

  // ordered slugs (first appearance)
  const slugs: string[] = [];
  const slugRe = /href="https:\/\/3asq\.org\/manga\/([^/"]+)\/"/g;
  let sm: RegExpExecArray | null;
  while ((sm = slugRe.exec(html)) !== null) {
    if (!slugs.includes(sm[1]!)) slugs.push(sm[1]!);
  }

  // chapter map: slug → latest chapters
  const chapMap: Record<string, { number: string; url: string }[]> = {};
  const chapRe = /href="(https:\/\/3asq\.org\/manga\/([^/]+)\/([0-9][^/"]*)\/)"/g;
  let cm: RegExpExecArray | null;
  while ((cm = chapRe.exec(html)) !== null) {
    const slug = cm[2]!;
    const num = cm[3]!;
    if (!chapMap[slug]) chapMap[slug] = [];
    if (!chapMap[slug]!.some((c) => c.number === num)) {
      chapMap[slug]!.push({ number: num, url: cm[1]! });
    }
  }

  // covers in order (skip logo — first src is always logo)
  const coverRe =
    /(?:data-src|src)="(https:\/\/3asq\.org\/wp-content\/uploads\/[^"]+\.(?:jpg|jpeg|png|webp))"/g;
  const allCovers: string[] = [];
  let cv: RegExpExecArray | null;
  while ((cv = coverRe.exec(html)) !== null) {
    if (!cv[1]!.includes("site-logo")) allCovers.push(cv[1]!);
  }

  // cover map by slug (match anchor→img proximity)
  const coverMap: Record<string, string> = {};
  const cardRe =
    /href="https:\/\/3asq\.org\/manga\/([^/"]+)\/"[^>]*>[\s\S]{0,400}?(?:data-src|src)="(https:\/\/3asq\.org\/wp-content\/uploads\/[^"]+\.(?:jpg|jpeg|png|webp))"/g;
  let cmc: RegExpExecArray | null;
  while ((cmc = cardRe.exec(html)) !== null) {
    if (!coverMap[cmc[1]!]) coverMap[cmc[1]!] = cmc[2]!;
  }

  return slugs
    .filter((slug) => slugTitleMap[slug])
    .map((slug, i) => ({
      id: slug,
      slug,
      title: slugTitleMap[slug]!,
      coverUrl: coverMap[slug] ?? allCovers[i] ?? "",
      url: `${BASE}/manga/${slug}/`,
      latestChapters: (chapMap[slug] ?? []).slice(0, 3),
    }));
}

let asqHomeCache: { manga: AsqManga[]; ts: number } | null = null;
const ASQ_HOME_TTL = 2 * 60 * 1000;

/** GET /api/asq/home */
router.get("/asq/home", async (req, res) => {
  try {
    if (asqHomeCache && Date.now() - asqHomeCache.ts < ASQ_HOME_TTL) {
      res.json({ manga: asqHomeCache.manga, source: "asq", sourceUrl: BASE });
      return;
    }
    const html = await fetchHtml(BASE);
    const manga = parseMangaCards(html);
    asqHomeCache = { manga, ts: Date.now() };
    res.json({ manga, source: "asq", sourceUrl: BASE });
  } catch (err) {
    req.log.error({ err }, "asq home error");
    res.status(502).json({ error: "upstream error" });
  }
});

/** GET /api/asq/search?q= */
router.get("/asq/search", async (req, res) => {
  const q = String(req.query["q"] ?? "").trim();
  if (!q) { res.json({ results: [] }); return; }

  try {
    // Try AJAX first (fast, English-friendly)
    const ajaxRes = await fetch(AJAX, {
      method: "POST",
      headers: {
        "User-Agent": UA,
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Requested-With": "XMLHttpRequest",
        Referer: BASE,
      },
      body: `action=wp-manga-search-manga&title=${encodeURIComponent(q)}`,
      signal: AbortSignal.timeout(8_000),
    });

    if (ajaxRes.ok) {
      const data = (await ajaxRes.json()) as {
        success: boolean;
        data?: { title: string; url: string; image?: string }[];
      };
      if (data.success && data.data && data.data.length > 0) {
        const results = data.data.map((item) => {
          const slug = item.url.split("/manga/")[1]?.replace(/\/$/, "") ?? item.url;
          return {
            id: slug,
            slug,
            title: htmlUnescape(item.title),
            coverUrl: item.image ?? "",
            url: item.url,
            source: "asq",
            latestChapters: [] as { number: string; url: string }[],
          };
        });
        res.json({ results });
        return;
      }
    }

    // Fallback: URL-based search
    const html = await fetchHtml(`${BASE}/?s=${encodeURIComponent(q)}&post_type=wp-manga`);
    const slugTitleMap: Record<string, string> = {};
    const linkRe = /href="https:\/\/3asq\.org\/manga\/([^/"]+)\/"[^>]*title="([^"]+)"/g;
    let lt: RegExpExecArray | null;
    while ((lt = linkRe.exec(html)) !== null) {
      const slug = lt[1]!;
      if (!slugTitleMap[slug]) slugTitleMap[slug] = htmlUnescape(lt[2]!);
    }
    const coverMap: Record<string, string> = {};
    const cardRe =
      /href="https:\/\/3asq\.org\/manga\/([^/"]+)\/"[^>]*>[\s\S]{0,500}?(?:data-src|src)="(https:\/\/3asq\.org\/wp-content\/uploads\/[^"]+\.(?:jpg|jpeg|png|webp))"/g;
    let cm: RegExpExecArray | null;
    while ((cm = cardRe.exec(html)) !== null) {
      if (!coverMap[cm[1]!]) coverMap[cm[1]!] = cm[2]!;
    }

    const results = Object.keys(slugTitleMap).map((slug) => ({
      id: slug,
      slug,
      title: slugTitleMap[slug]!,
      coverUrl: coverMap[slug] ?? "",
      url: `${BASE}/manga/${slug}/`,
      source: "asq",
      latestChapters: [] as { number: string; url: string }[],
    }));
    res.json({ results });
  } catch (err) {
    req.log.error({ err }, "asq search error");
    res.status(502).json({ error: "upstream error" });
  }
});

/** GET /api/asq/manga/:slug/chapters */
router.get("/asq/manga/:slug/chapters", async (req, res) => {
  const slug = req.params["slug"];
  if (!slug) { res.status(400).json({ error: "missing slug" }); return; }

  const latestNum = parseFloat(String(req.query["latest"] ?? ""));
  if (!isNaN(latestNum) && latestNum > 0) {
    const chapters = [];
    for (let n = Math.floor(latestNum); n >= 1; n--) {
      chapters.push({ number: String(n), title: `فصل ${n}`, url: `${BASE}/manga/${slug}/${n}/` });
    }
    res.json({ chapters });
    return;
  }

  try {
    const html = await fetchHtml(`${BASE}/manga/${slug}/`);
    // Extract all numeric chapter links
    const chapRe = new RegExp(
      `href="(https://3asq\\.org/manga/${slug.replace(/[-]/g, "[-]")}/([0-9][^/"]*)/)"`,
      "g"
    );
    const seen = new Set<string>();
    const chapters: { number: string; title: string; url: string }[] = [];
    let m: RegExpExecArray | null;
    while ((m = chapRe.exec(html)) !== null) {
      const num = m[2]!;
      if (seen.has(num) || num === "0chapter") continue;
      seen.add(num);
      chapters.push({ number: num, title: `فصل ${num}`, url: m[1]! });
    }

    if (chapters.length === 0) {
      // Only latest link visible — generate from it
      const latestRe = /href="https:\/\/3asq\.org\/manga\/[^/]+\/([0-9]+)\/"/;
      const lm = latestRe.exec(html);
      if (lm) {
        const max = parseInt(lm[1]!);
        for (let n = max; n >= 1; n--) {
          chapters.push({ number: String(n), title: `فصل ${n}`, url: `${BASE}/manga/${slug}/${n}/` });
        }
      }
    } else {
      chapters.sort((a, b) => parseFloat(b.number) - parseFloat(a.number));
    }

    res.json({ chapters });
  } catch (err) {
    req.log.error({ err }, "asq chapters error");
    res.status(502).json({ error: "upstream error" });
  }
});

export default router;
