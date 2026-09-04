import { index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const suggestionsTable = pgTable(
  "manga_suggestions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    userName: text("user_name").notNull(),
    userAvatar: text("user_avatar"),
    sourceSlug: text("source_slug").notNull(),
    sourceTitle: text("source_title").notNull(),
    sourceCoverUrl: text("source_cover_url"),
    suggestedSlug: text("suggested_slug").notNull(),
    suggestedTitle: text("suggested_title").notNull(),
    suggestedCoverUrl: text("suggested_cover_url"),
    reason: text("reason").notNull(),
    status: text("status").notNull().default("visible"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("manga_suggestions_created_idx").on(t.createdAt)],
);

export const postSuggestionBodySchema = z
  .object({
    userName: z.string().trim().min(1).max(60),
    userAvatar: z.string().url().optional(),
    sourceSlug: z.string().trim().min(1).max(200),
    sourceTitle: z.string().trim().min(1).max(200),
    sourceCoverUrl: z.string().max(1000).optional(),
    suggestedSlug: z.string().trim().min(1).max(200),
    suggestedTitle: z.string().trim().min(1).max(200),
    suggestedCoverUrl: z.string().max(1000).optional(),
    reason: z.string().trim().min(10).max(700),
  })
  .refine((data) => data.sourceSlug !== data.suggestedSlug, {
    message: "source and suggested manga must differ",
  });

export const suggestionReportReasons = ["offensive", "spam", "spoiler", "other"] as const;

export const reportSuggestionBodySchema = z.object({
  reason: z.enum(suggestionReportReasons),
});

export const moderateSuggestionBodySchema = z.object({
  action: z.enum(["hide", "restore", "delete"]),
});

export const suggestionReportsTable = pgTable(
  "manga_suggestion_reports",
  {
    id: text("id").primaryKey(),
    suggestionId: text("suggestion_id")
      .notNull()
      .references(() => suggestionsTable.id, { onDelete: "cascade" }),
    reporterUserId: text("reporter_user_id").notNull(),
    reason: text("reason").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("manga_suggestion_reports_suggestion_idx").on(t.suggestionId),
    uniqueIndex("manga_suggestion_reports_reporter_unique").on(t.suggestionId, t.reporterUserId),
  ],
);

export type MangaSuggestion = typeof suggestionsTable.$inferSelect;
export type MangaSuggestionReport = typeof suggestionReportsTable.$inferSelect;