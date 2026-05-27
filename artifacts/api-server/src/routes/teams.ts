import { Router } from "express";
import { eq, ilike, desc } from "drizzle-orm";
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
