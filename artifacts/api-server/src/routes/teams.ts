import { Router } from "express";
import { eq, ilike, desc, sql } from "drizzle-orm";
import { db, publicTeamsTable } from "@workspace/db";

const router = Router();

router.get("/teams", async (req, res) => {
  try {
    const q = (req.query["q"] as string | undefined)?.trim() ?? "";
    const results = q
      ? await db
          .select()
          .from(publicTeamsTable)
          .where(ilike(publicTeamsTable.name, `%${q}%`))
          .orderBy(desc(publicTeamsTable.updatedAt))
          .limit(30)
      : await db
          .select()
          .from(publicTeamsTable)
          .orderBy(desc(publicTeamsTable.updatedAt))
          .limit(30);
    res.json(results);
  } catch (err) {
    req.log.error({ err }, "teams search error");
    res.status(500).json({ error: "internal error" });
  }
});

router.get("/teams/manga", async (req, res) => {
  const q = (req.query["q"] as string | undefined)?.trim() ?? "";
  if (!q) { res.json([]); return; }
  try {
    const result = await db.execute<{
      mangaId: string;
      title: string;
      coverUrl: string | null;
      chaptersCount: number;
      chapters: Array<{ id: string; number: string; title: string; imageCount: number }>;
      teamName: string;
      teamEmoji: string;
      teamId: string;
    }>(sql`
      SELECT
        elem->>'id'          AS "mangaId",
        elem->>'title'       AS "title",
        elem->>'coverUrl'    AS "coverUrl",
        COALESCE(jsonb_array_length(elem->'chapters'), 0)::int AS "chaptersCount",
        COALESCE(elem->'chapters', '[]'::jsonb)               AS "chapters",
        t.name               AS "teamName",
        t.emoji              AS "teamEmoji",
        t.id                 AS "teamId"
      FROM public_teams t,
           jsonb_array_elements(t.manga) AS elem
      WHERE lower(elem->>'title') LIKE lower(${`%${q}%`})
      ORDER BY t.updated_at DESC
      LIMIT 30
    `);
    res.json(result.rows);
  } catch (err) {
    req.log.error({ err }, "team manga search error");
    res.status(500).json({ error: "internal error" });
  }
});

router.get("/teams/genres/:genre", async (req, res) => {
  const genre = decodeURIComponent(String(req.params["genre"] ?? "")).trim();
  if (!genre) {
    res.status(400).json({ error: "genre required" });
    return;
  }

  try {
    const result = await db.execute<{
      mangaId: string;
      title: string;
      coverUrl: string | null;
      chaptersCount: number;
      chapters: Array<{ id: string; number: string; title: string; imageCount: number }>;
      teamName: string;
      teamEmoji: string;
      teamId: string;
      genres: string[];
    }>(sql`
      SELECT
        elem->>'id'          AS "mangaId",
        elem->>'title'       AS "title",
        elem->>'coverUrl'    AS "coverUrl",
        COALESCE(jsonb_array_length(elem->'chapters'), 0)::int AS "chaptersCount",
        COALESCE(elem->'chapters', '[]'::jsonb)               AS "chapters",
        t.name               AS "teamName",
        t.emoji              AS "teamEmoji",
        t.id                 AS "teamId",
        CASE
          WHEN jsonb_typeof(elem->'genres') = 'array' THEN elem->'genres'
          ELSE '[]'::jsonb
        END                  AS "genres"
      FROM public_teams t,
           jsonb_array_elements(t.manga) AS elem
      WHERE EXISTS (
        SELECT 1
        FROM jsonb_array_elements_text(
          CASE
            WHEN jsonb_typeof(elem->'genres') = 'array' THEN elem->'genres'
            ELSE '[]'::jsonb
          END
        ) AS genre_value(value)
        WHERE lower(btrim(value)) = lower(btrim(${genre}))
      )
      ORDER BY t.updated_at DESC
    `);
    res.json({ genre, manga: result.rows });
  } catch (err) {
    req.log.error({ err }, "team manga genre error");
    res.status(500).json({ error: "internal error" });
  }
});

router.get("/teams/:id", async (req, res) => {
  try {
    const [team] = await db
      .select()
      .from(publicTeamsTable)
      .where(eq(publicTeamsTable.id, req.params["id"] ?? ""));
    if (!team) {
      res.status(404).json({ error: "not found" });
      return;
    }
    res.json(team);
  } catch (err) {
    req.log.error({ err }, "team get error");
    res.status(500).json({ error: "internal error" });
  }
});

router.put("/teams/:id", async (req, res) => {
  try {
    const id = req.params["id"] ?? "";
    const { name, description, emoji, manga } = req.body as {
      name: string;
      description: string;
      emoji: string;
      manga: import("@workspace/db").PublicTeamMangaItem[];
    };

    if (!name?.trim()) {
      res.status(400).json({ error: "name required" });
      return;
    }

    const safeManga = Array.isArray(manga) ? manga : [];

    const [existing] = await db
      .select({ id: publicTeamsTable.id })
      .from(publicTeamsTable)
      .where(eq(publicTeamsTable.id, id));

    if (existing) {
      const [updated] = await db
        .update(publicTeamsTable)
        .set({ name, description: description ?? "", emoji: emoji ?? "📚", manga: safeManga, updatedAt: new Date() })
        .where(eq(publicTeamsTable.id, id))
        .returning();
      res.json(updated);
    } else {
      const [inserted] = await db
        .insert(publicTeamsTable)
        .values({ id, name, description: description ?? "", emoji: emoji ?? "📚", manga: safeManga })
        .returning();
      res.json(inserted);
    }
  } catch (err) {
    req.log.error({ err }, "team publish error");
    res.status(500).json({ error: "internal error" });
  }
});

router.delete("/teams/:id", async (req, res) => {
  try {
    await db
      .delete(publicTeamsTable)
      .where(eq(publicTeamsTable.id, req.params["id"] ?? ""));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "team delete error");
    res.status(500).json({ error: "internal error" });
  }
});

export default router;
