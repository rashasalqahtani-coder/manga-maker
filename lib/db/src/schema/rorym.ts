import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const rorymMangaTable = pgTable(
  "rorym_manga",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    coverUrl: text("cover_url").notNull().default(""),
    summary: text("summary").notNull().default(""),
    teamId: text("team_id").notNull(),
    teamName: text("team_name").notNull().default(""),
    isMostRead: boolean("is_most_read").notNull().default(false),
    genres: text("genres").array().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("rorym_manga_slug_unique").on(table.slug),
    index("rorym_manga_created_at_idx").on(table.createdAt),
    index("rorym_manga_team_id_idx").on(table.teamId),
  ],
);

export const rorymChapterTable = pgTable(
  "rorym_chapter",
  {
    id: serial("id").primaryKey(),
    mangaId: integer("manga_id")
      .notNull()
      .references(() => rorymMangaTable.id, { onDelete: "cascade" }),
    chapterNum: text("chapter_num").notNull(),
    title: text("title").notNull().default(""),
    pages: jsonb("pages").$type<string[]>().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("rorym_chapter_manga_number_unique").on(
      table.mangaId,
      table.chapterNum,
    ),
    index("rorym_chapter_manga_id_idx").on(table.mangaId),
    index("rorym_chapter_created_at_idx").on(table.createdAt),
  ],
);