import { Router, type IRouter, type Request, type Response } from "express";
import { Readable } from "stream";
import { getPool } from "../lib/db";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";

const router: IRouter = Router();
const storage = new ObjectStorageService();

// ─── Types ───────────────────────────────────────────────────────────────────

interface RorymManga {
  id: number;
  slug: string;
  title: string;
  cover_url: string;
  summary: string;
  team_id: string;
  team_name: string;
  is_most_read: boolean;
  created_at: string;
}

interface RorymChapter {
  id: number;
  manga_id: number;
  chapter_num: string;
  title: string;
  pages: string[];
  created_at: string;
}

function toUnified(row: RorymManga, latestChapter?: RorymChapter) {
  return {
    id: row.slug,
    slug: row.slug,
    title: row.title,
    coverUrl: row.cover_url,
    url: `/rorym/${row.slug}`,
    sourceId: "rorym",
    summary: row.summary,
    teamId: row.team_id,
    teamName: row.team_name,
    isMostRead: row.is_most_read,
    latestChapters: latestChapter
      ? [{ number: latestChapter.chapter_num, url: "" }]
      : [],
  };
}

// ─── Upload: request presigned URL ───────────────────────────────────────────

router.post("/rorym/uploads/request-url", async (req: Request, res: Response) => {
  try {
    const uploadURL = await storage.getObjectEntityUploadURL();
    const objectPath = storage.normalizeObjectEntityPath(uploadURL);
    res.json({ uploadURL, objectPath });
  } catch (err) {
    req.log.error(err, "rorym: presigned URL error");
    res.status(500).json({ error: "upload error" });
  }
});

// ─── Serve uploaded images ────────────────────────────────────────────────────

router.get("/rorym/images/*objectPath", async (req: Request, res: Response) => {
  try {
    const objectPath = `/objects/${(req.params as Record<string, string>)["objectPath"]}`;
    const file = await storage.getObjectEntityFile(objectPath);
    const response = await storage.downloadObject(file);
    res.setHeader("Content-Type", response.headers.get("Content-Type") ?? "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    if (response.body) {
      Readable.fromWeb(response.body as Parameters<typeof Readable.fromWeb>[0]).pipe(res);
    } else {
      res.status(404).end();
    }
  } catch (err) {
    if (err instanceof ObjectNotFoundError) {
      res.status(404).json({ error: "not found" });
    } else {
      req.log.error(err, "rorym: image serve error");
      res.status(500).json({ error: "serve error" });
    }
  }
});

// ─── Home: latest manga ───────────────────────────────────────────────────────

router.get("/rorym/home", async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const { rows } = await pool.query<RorymManga>(
      `SELECT * FROM rorym_manga ORDER BY created_at DESC LIMIT 40`
    );
    const mangaList = await Promise.all(
      rows.map(async (row) => {
        const ch = await pool.query<RorymChapter>(
          `SELECT * FROM rorym_chapter WHERE manga_id=$1 ORDER BY created_at DESC LIMIT 1`,
          [row.id]
        );
        return toUnified(row, ch.rows[0]);
      })
    );
    res.json({ manga: mangaList });
  } catch (err) {
    req.log.error(err, "rorym: home error");
    res.status(500).json({ error: "home error" });
  }
});

router.get("/rorym/most-read", async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const { rows } = await pool.query<RorymManga>(
      `SELECT * FROM rorym_manga WHERE is_most_read=TRUE ORDER BY created_at DESC LIMIT 20`
    );
    res.json({ manga: rows.map((row) => toUnified(row)) });
  } catch (err) {
    req.log.error(err, "rorym: most-read error");
    res.status(500).json({ error: "most-read error" });
  }
});

// ─── Search ───────────────────────────────────────────────────────────────────

router.get("/rorym/search", async (req: Request, res: Response) => {
  const q = String(req.query["q"] ?? "").trim();
  try {
    const pool = getPool();
    const { rows } = await pool.query<RorymManga>(
      `SELECT * FROM rorym_manga WHERE title ILIKE $1 ORDER BY created_at DESC LIMIT 20`,
      [`%${q}%`]
    );
    const results = rows.map((r) => toUnified(r));
    res.json({ results });
  } catch (err) {
    req.log.error(err, "rorym: search error");
    res.status(500).json({ error: "search error" });
  }
});

// ─── Manga detail ─────────────────────────────────────────────────────────────

router.get("/rorym/manga/:slug", async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const { rows } = await pool.query<RorymManga>(
      `SELECT * FROM rorym_manga WHERE slug=$1`,
      [req.params["slug"]]
    );
    if (!rows[0]) { res.status(404).json({ error: "not found" }); return; }
    res.json({ manga: toUnified(rows[0]) });
  } catch (err) {
    req.log.error(err, "rorym: manga detail error");
    res.status(500).json({ error: "detail error" });
  }
});

// ─── Create manga ─────────────────────────────────────────────────────────────

router.post("/rorym/manga", async (req: Request, res: Response) => {
  const { title, coverUrl, summary, teamId, teamName, isMostRead } = req.body as {
    title: string; coverUrl: string; summary?: string; teamId: string; teamName: string; isMostRead?: boolean;
  };
  if (!title?.trim() || !teamId?.trim()) {
    res.status(400).json({ error: "title and teamId required" }); return;
  }
  const slug = title.trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\u0600-\u06ff-]/g, "")
    .slice(0, 80)
    + "-" + Date.now().toString(36);

  try {
    const pool = getPool();
    const { rows } = await pool.query<RorymManga>(
      `INSERT INTO rorym_manga (slug, title, cover_url, summary, team_id, team_name, is_most_read)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [slug, title.trim(), coverUrl ?? "", summary ?? "", teamId, teamName ?? "", isMostRead === true]
    );
    res.status(201).json({ manga: toUnified(rows[0]!) });
  } catch (err) {
    req.log.error(err, "rorym: create manga error");
    res.status(500).json({ error: "create error" });
  }
});

router.patch("/rorym/manga/:slug", async (req: Request, res: Response) => {
  const { teamId, isMostRead } = req.body as { teamId?: string; isMostRead?: boolean };
  if (!teamId?.trim() || typeof isMostRead !== "boolean") {
    res.status(400).json({ error: "teamId and isMostRead required" }); return;
  }
  try {
    const pool = getPool();
    const { rows } = await pool.query<RorymManga>(
      `UPDATE rorym_manga SET is_most_read=$1 WHERE slug=$2 AND team_id=$3 RETURNING *`,
      [isMostRead, req.params["slug"], teamId]
    );
    if (!rows[0]) { res.status(404).json({ error: "not found or not authorized" }); return; }
    res.json({ manga: toUnified(rows[0]) });
  } catch (err) {
    req.log.error(err, "rorym: placement update error");
    res.status(500).json({ error: "placement update error" });
  }
});

// ─── Chapters list ────────────────────────────────────────────────────────────

router.get("/rorym/manga/:slug/chapters", async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const mangaRes = await pool.query<RorymManga>(
      `SELECT * FROM rorym_manga WHERE slug=$1`, [req.params["slug"]]
    );
    if (!mangaRes.rows[0]) { res.status(404).json({ error: "not found" }); return; }
    const { rows } = await pool.query<RorymChapter>(
      `SELECT * FROM rorym_chapter WHERE manga_id=$1 ORDER BY chapter_num::float DESC NULLS LAST`,
      [mangaRes.rows[0].id]
    );
    const chapters = rows.map((ch) => ({
      id: `rorym__${req.params["slug"]}__${ch.chapter_num}`,
      number: ch.chapter_num,
      title: ch.title,
      url: "",
      pages: ch.pages,
      uploadDate: ch.created_at,
    }));
    res.json({ chapters });
  } catch (err) {
    req.log.error(err, "rorym: chapters error");
    res.status(500).json({ error: "chapters error" });
  }
});

// ─── Add chapter ──────────────────────────────────────────────────────────────

router.post("/rorym/manga/:slug/chapters", async (req: Request, res: Response) => {
  const { chapterNum, title, pages } = req.body as {
    chapterNum: string; title?: string; pages: string[];
  };
  if (!chapterNum?.trim() || !Array.isArray(pages) || pages.length === 0) {
    res.status(400).json({ error: "chapterNum and pages required" }); return;
  }
  try {
    const pool = getPool();
    const mangaRes = await pool.query<RorymManga>(
      `SELECT * FROM rorym_manga WHERE slug=$1`, [req.params["slug"]]
    );
    if (!mangaRes.rows[0]) { res.status(404).json({ error: "manga not found" }); return; }
    const { rows } = await pool.query<RorymChapter>(
      `INSERT INTO rorym_chapter (manga_id, chapter_num, title, pages)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (manga_id, chapter_num) DO UPDATE SET pages=EXCLUDED.pages, title=EXCLUDED.title
       RETURNING *`,
      [mangaRes.rows[0].id, chapterNum.trim(), title ?? "", JSON.stringify(pages)]
    );
    res.status(201).json({ chapter: rows[0] });
  } catch (err) {
    req.log.error(err, "rorym: add chapter error");
    res.status(500).json({ error: "add chapter error" });
  }
});

// ─── Delete manga (team only) ─────────────────────────────────────────────────

router.delete("/rorym/manga/:slug", async (req: Request, res: Response) => {
  const { teamId } = req.body as { teamId: string };
  try {
    const pool = getPool();
    const { rowCount } = await pool.query(
      `DELETE FROM rorym_manga WHERE slug=$1 AND team_id=$2`,
      [req.params["slug"], teamId]
    );
    if (!rowCount) { res.status(404).json({ error: "not found or not authorized" }); return; }
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err, "rorym: delete error");
    res.status(500).json({ error: "delete error" });
  }
});

export default router;
