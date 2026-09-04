import { getAuth } from "@clerk/express";
import { db, postSuggestionBodySchema, suggestionsTable } from "@workspace/db";
import { desc } from "drizzle-orm";
import { Router } from "express";

const router = Router();

router.get("/suggestions", async (req, res) => {
  try {
    const suggestions = await db
      .select()
      .from(suggestionsTable)
      .orderBy(desc(suggestionsTable.createdAt))
      .limit(100);
    res.json({ suggestions });
  } catch (err) {
    req.log.error({ err }, "get manga suggestions error");
    res.status(500).json({ error: "internal error" });
  }
});

router.post("/suggestions", async (req, res) => {
  const auth = getAuth(req);
  if (!auth.userId) {
    res.status(401).json({ error: "unauthenticated" });
    return;
  }

  const parsed = postSuggestionBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid suggestion", details: parsed.error.issues });
    return;
  }

  const data = parsed.data;
  try {
    const [suggestion] = await db
      .insert(suggestionsTable)
      .values({
        id: crypto.randomUUID(),
        userId: auth.userId,
        userName: data.userName,
        userAvatar: data.userAvatar || null,
        sourceSlug: data.sourceSlug,
        sourceTitle: data.sourceTitle,
        sourceCoverUrl: data.sourceCoverUrl || null,
        suggestedSlug: data.suggestedSlug,
        suggestedTitle: data.suggestedTitle,
        suggestedCoverUrl: data.suggestedCoverUrl || null,
        reason: data.reason,
      })
      .returning();
    res.status(201).json({ suggestion });
  } catch (err) {
    req.log.error({ err }, "post manga suggestion error");
    res.status(500).json({ error: "internal error" });
  }
});

export default router;