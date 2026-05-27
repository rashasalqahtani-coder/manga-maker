import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const commentsTable = pgTable(
  "comments",
  {
    id: text("id").primaryKey(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    userId: text("user_id").notNull(),
    userName: text("user_name").notNull(),
    userAvatar: text("user_avatar"),
    content: text("content").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("comments_entity_idx").on(t.entityType, t.entityId)],
);

export const insertCommentSchema = createInsertSchema(commentsTable).omit({
  id: true,
  userId: true,
  createdAt: true,
});

export const postCommentBodySchema = z.object({
  content: z.string().min(1).max(1000),
  userName: z.string().min(1).max(60),
  userAvatar: z.string().optional(),
});

export type Comment = typeof commentsTable.$inferSelect;
export type InsertComment = typeof commentsTable.$inferInsert;
