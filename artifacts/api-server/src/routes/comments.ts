import { Router } from "express";
import { and, eq, desc } from "drizzle-orm";
import { db, commentsTable } from "@workspace/db";
import { postCommentBodySchema } from "@workspace/db";
import { getAuth } from "@clerk/express";

const router = Router();

router.get("/comments/:entityType/:entityId", async (req, res) => {
  const { entityType, entityId } = req.params as { entityType: string; entityId: string };
  if (!entityType || !entityId) { res.status(400).json({ error: "missing params" }); return; }
  try {
    const rows = await db
      .select()
      .from(commentsTable)
      .where(and(eq(commentsTable.entityType, entityType), eq(commentsTable.entityId, entityId)))
      .orderBy(desc(commentsTable.createdAt))
      .limit(100);
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "get comments error");
    res.status(500).json({ error: "internal error" });
  }
});

router.post("/comments/:entityType/:entityId", async (req, res) => {
  const auth = getAuth(req);
  if (!auth.userId) { res.status(401).json({ error: "unauthenticated" }); return; }

  const { entityType, entityId } = req.params as { entityType: string; entityId: string };
  const parsed = postCommentBodySchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "invalid body" }); return; }

  const { content, userName, userAvatar } = parsed.data;
  try {
    const id = crypto.randomUUID();
    const [row] = await db
      .insert(commentsTable)
      .values({ id, entityType, entityId, userId: auth.userId, userName, userAvatar, content })
      .returning();
    res.status(201).json(row);
  } catch (err) {
    req.log.error({ err }, "post comment error");
    res.status(500).json({ error: "internal error" });
  }
});

router.delete("/comments/:id", async (req, res) => {
  const auth = getAuth(req);
  if (!auth.userId) { res.status(401).json({ error: "unauthenticated" }); return; }

  const { id } = req.params as { id: string };
  try {
    const [deleted] = await db
      .delete(commentsTable)
      .where(and(eq(commentsTable.id, id), eq(commentsTable.userId, auth.userId)))
      .returning();
    if (!deleted) { res.status(404).json({ error: "not found" }); return; }
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "delete comment error");
    res.status(500).json({ error: "internal error" });
  }
});

export default router;
