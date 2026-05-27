import { pgTable, text, jsonb, timestamp } from "drizzle-orm/pg-core";

export interface PublicMangaChapter {
  id: string;
  number: string;
  title: string;
  imageCount: number;
}

export interface PublicTeamMangaItem {
  id: string;
  title: string;
  coverUrl?: string;
  description?: string;
  chapters: PublicMangaChapter[];
}

export const publicTeamsTable = pgTable("public_teams", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  emoji: text("emoji").notNull().default("📚"),
  manga: jsonb("manga").$type<PublicTeamMangaItem[]>().notNull().default([]),
  ownerHash: text("owner_hash").notNull().default(""),
  publishedAt: timestamp("published_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type PublicTeam = typeof publicTeamsTable.$inferSelect;
export type InsertPublicTeam = typeof publicTeamsTable.$inferInsert;
