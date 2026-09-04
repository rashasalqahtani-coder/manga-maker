import { clerkClient, getAuth } from "@clerk/express";
import {
  db,
  moderateSuggestionBodySchema,
  postSuggestionBodySchema,
  reportSuggestionBodySchema,
  suggestionReportsTable,
  suggestionsTable,
} from "@workspace/db";
import { and, desc, eq, ne, sql } from "drizzle-orm";
import { Router } from "express";

type SuggestionAuth = {
  userId: string | null;
  sessionClaims?: unknown;
};

export interface SuggestionsRepository {
  findReportableSuggestion(id: string): Promise<{ id: string; userId: string } | undefined>;
  createReport(input: { id: string; suggestionId: string; reporterUserId: string; reason: string }): Promise<void>;
  deleteSuggestion(id: string, userId?: string): Promise<boolean>;
  listReports(): Promise<unknown[]>;
  setSuggestionStatus(id: string, status: "hidden" | "visible"): Promise<boolean>;
}

function hasAdminClaim(sessionClaims: unknown): boolean {
  if (!sessionClaims || typeof sessionClaims !== "object") return false;
  const claims = sessionClaims as Record<string, unknown>;
  const metadata =
    claims.metadata && typeof claims.metadata === "object"
      ? (claims.metadata as Record<string, unknown>)
      : claims.publicMetadata && typeof claims.publicMetadata === "object"
        ? (claims.publicMetadata as Record<string, unknown>)
        : undefined;
  return claims.role === "admin" || metadata?.role === "admin";
}

async function isAdmin(userId: string, sessionClaims: unknown): Promise<boolean> {
  if (hasAdminClaim(sessionClaims)) return true;
  const user = await clerkClient.users.getUser(userId);
  return user.publicMetadata.role === "admin";
}

const repository: SuggestionsRepository = {
  async findReportableSuggestion(id) {
    const [suggestion] = await db
      .select({ id: suggestionsTable.id, userId: suggestionsTable.userId })
      .from(suggestionsTable)
      .where(and(eq(suggestionsTable.id, id), ne(suggestionsTable.status, "deleted")))
      .limit(1);
    return suggestion;
  },
  async createReport(input) {
    await db.insert(suggestionReportsTable).values(input).onConflictDoNothing();
  },
  async deleteSuggestion(id, userId) {
    const condition = userId
      ? and(eq(suggestionsTable.id, id), eq(suggestionsTable.userId, userId))
      : eq(suggestionsTable.id, id);
    const [deleted] = await db.delete(suggestionsTable).where(condition).returning({ id: suggestionsTable.id });
    return Boolean(deleted);
  },
  async listReports() {
    return db
      .select({
        suggestion: suggestionsTable,
        reportCount: sql<number>`count(${suggestionReportsTable.id})::int`,
        reasons: sql<string[]>`array_agg(${suggestionReportsTable.reason})`,
      })
      .from(suggestionReportsTable)
      .innerJoin(suggestionsTable, eq(suggestionsTable.id, suggestionReportsTable.suggestionId))
      .groupBy(suggestionsTable.id)
      .orderBy(desc(sql`count(${suggestionReportsTable.id})`));
  },
  async setSuggestionStatus(id, status) {
    const [updated] = await db
      .update(suggestionsTable)
      .set({ status })
      .where(eq(suggestionsTable.id, id))
      .returning({ id: suggestionsTable.id });
    return Boolean(updated);
  },
};

export function createSuggestionsRouter(deps: {
  getAuth: (req: Parameters<typeof getAuth>[0]) => SuggestionAuth;
  isAdmin: (userId: string, sessionClaims: unknown) => Promise<boolean>;
  repository: SuggestionsRepository;
} = { getAuth, isAdmin, repository }) {
const router = Router();

router.get("/suggestions", async (req, res) => {
  try {
    const suggestions = await db
      .select()
      .from(suggestionsTable)
      .where(eq(suggestionsTable.status, "visible"))
      .orderBy(desc(suggestionsTable.createdAt))
      .limit(100);
    res.json({ suggestions });
  } catch (err) {
    req.log.error({ err }, "get manga suggestions error");
    res.status(500).json({ error: "internal error" });
  }
});

router.post("/suggestions/:id/reports", async (req, res) => {
  const auth = deps.getAuth(req);
  if (!auth.userId) {
    res.status(401).json({ error: "unauthenticated" });
    return;
  }
  const parsed = reportSuggestionBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid report reason" });
    return;
  }
  const { id } = req.params as { id: string };
  try {
    const suggestion = await deps.repository.findReportableSuggestion(id);
    if (!suggestion) {
      res.status(404).json({ error: "not found" });
      return;
    }
    if (suggestion.userId === auth.userId) {
      res.status(403).json({ error: "cannot report own suggestion" });
      return;
    }
    await deps.repository.createReport({
        id: crypto.randomUUID(),
        suggestionId: id,
        reporterUserId: auth.userId,
        reason: parsed.data.reason,
      });
    res.status(201).json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "report manga suggestion error");
    res.status(500).json({ error: "internal error" });
  }
});

router.delete("/suggestions/:id", async (req, res) => {
  const auth = deps.getAuth(req);
  if (!auth.userId) {
    res.status(401).json({ error: "unauthenticated" });
    return;
  }
  const { id } = req.params as { id: string };
  try {
    const admin = await deps.isAdmin(auth.userId, auth.sessionClaims);
    const deleted = await deps.repository.deleteSuggestion(id, admin ? undefined : auth.userId);
    if (!deleted) {
      res.status(404).json({ error: "not found" });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "delete manga suggestion error");
    res.status(500).json({ error: "internal error" });
  }
});

router.get("/admin/suggestion-reports", async (req, res) => {
  const auth = deps.getAuth(req);
  if (!auth.userId) {
    res.status(401).json({ error: "unauthenticated" });
    return;
  }
  if (!(await deps.isAdmin(auth.userId, auth.sessionClaims))) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  try {
    const reports = await deps.repository.listReports();
    res.json({ reports });
  } catch (err) {
    req.log.error({ err }, "get suggestion reports error");
    res.status(500).json({ error: "internal error" });
  }
});

router.patch("/admin/suggestions/:id", async (req, res) => {
  const auth = deps.getAuth(req);
  if (!auth.userId) {
    res.status(401).json({ error: "unauthenticated" });
    return;
  }
  if (!(await deps.isAdmin(auth.userId, auth.sessionClaims))) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  const parsed = moderateSuggestionBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid moderation action" });
    return;
  }
  const { id } = req.params as { id: string };
  try {
    if (parsed.data.action === "delete") {
      const deleted = await deps.repository.deleteSuggestion(id);
      if (!deleted) {
        res.status(404).json({ error: "not found" });
        return;
      }
    } else {
      const updated = await deps.repository.setSuggestionStatus(
        id,
        parsed.data.action === "hide" ? "hidden" : "visible",
      );
      if (!updated) {
        res.status(404).json({ error: "not found" });
        return;
      }
    }
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "moderate manga suggestion error");
    res.status(500).json({ error: "internal error" });
  }
});

router.post("/suggestions", async (req, res) => {
  const auth = deps.getAuth(req);
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

return router;
}

export default createSuggestionsRouter();