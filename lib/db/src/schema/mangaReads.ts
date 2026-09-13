import { index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const mangaReadsTable = pgTable(
  "manga_reads",
  {
    source: text("source").notNull(),
    mangaKey: text("manga_key").notNull(),
    readerKey: text("reader_key").notNull(),
    firstReadAt: timestamp("first_read_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("manga_reads_unique_reader").on(
      table.source,
      table.mangaKey,
      table.readerKey,
    ),
    index("manga_reads_ranking_idx").on(table.source, table.mangaKey),
  ],
);