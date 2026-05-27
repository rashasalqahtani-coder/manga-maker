import { Router } from "express";

const router = Router();

const BASE = "https://olympustaff.com";
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

export interface OlympusManga {
  id: string;
  slug: string;
  title: string;
  coverUrl: string;
  url: string;
  latestChapters: { number: string; url: string }[];
}

function parseSeriesPage(html: string): OlympusManga[] {
  const slugRe = /href="https:\/\/olympustaff\.com\/series\/([^"\/]+)"/g;
  const coverRe = /src="(https:\/\/olympustaff\.com\/images\/manga\/[^"]+)"/g;
  const altRe = /alt="([^"]{3,100})"/g;

  const slugs: string[] = [];
  let sm: RegExpExecArray | null;
  while ((sm = slugRe.exec(html)) !== null) {
    if (!slugs.includes(sm[1])) slugs.push(sm[1]);
  }

  const covers: string[] = [];
  let cm: RegExpExecArray | null;
  while ((cm = coverRe.exec(html)) !== null) covers.push(cm[1]);

  const alts: string[] = [];
  let am: RegExpExecArray | null;
  while ((am = altRe.exec(html)) !== null) {
    const v = am[1].trim().replace(/&#039;/g, "'").replace(/&amp;/g, "&");
    if (v !== "Team-X" && v.length > 2) alts.push(v);
  }

  return slugs.map((slug, i) => ({
    id: slug,
    slug,
    title: alts[i] ?? slug.replace(/-/g, " "),
    coverUrl: covers[i] ?? "",
    url: `${BASE}/series/${slug}`,
    latestChapters: [],
  }));
}

function parseChapterList(html: string, slug: string): { number: string; title: string; url: string }[] {
  const chapRe = /href="(https:\/\/olympustaff\.com\/series\/[^"\/]+\/(\d+))"/g;
  const seen = new Set<string>();
  const chapters: { number: string; title: string; url: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = chapRe.exec(html)) !== null) {
    const url = m[1]!;
    const num = m[2]!;
    if (seen.has(url)) continue;
    seen.add(url);
    chapters.push({ number: num, title: `الفصل ${num}`, url });
  }
  // sort desc
  chapters.sort((a, b) => parseFloat(b.number) - parseFloat(a.number));
  return chapters;
}

let olympusHomeCache: { manga: ReturnType<typeof parseSeriesPage>; ts: number } | null = null;
const OLYMPUS_HOME_TTL = 2 * 60 * 1000;

/** GET /api/olympus/home */
router.get("/olympus/home", async (req, res) => {
  try {
    if (olympusHomeCache && Date.now() - olympusHomeCache.ts < OLYMPUS_HOME_TTL) {
      res.json({ manga: olympusHomeCache.manga, source: "olympus", sourceUrl: BASE });
      return;
    }
    const html = await fetchHtml(`${BASE}/series`);
    const manga = parseSeriesPage(html);
    olympusHomeCache = { manga, ts: Date.now() };
    res.json({ manga, source: "olympus", sourceUrl: BASE });
  } catch (err) {
    req.log.error({ err }, "olympus home error");
    res.status(502).json({ error: "upstream error" });
  }
});

/** GET /api/olympus/manga/:slug/chapters */
router.get("/olympus/manga/:slug/chapters", async (req, res) => {
  const { slug } = req.params;
  try {
    const html = await fetchHtml(`${BASE}/series/${encodeURIComponent(slug)}`);
    const chapters = parseChapterList(html, slug);
    res.json({ chapters, source: "olympus" });
  } catch (err) {
    req.log.error({ err }, "olympus chapters error");
    res.status(502).json({ error: "upstream error" });
  }
});

export default router;
