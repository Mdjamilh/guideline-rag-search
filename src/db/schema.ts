import { sql } from "drizzle-orm";
import { customType, index, integer, pgTable, text, timestamp, vector } from "drizzle-orm/pg-core";

/** nomic-embed-text produces 768-dimensional embeddings. */
export const EMBEDDING_DIMENSIONS = 768;

const tsvector = customType<{ data: string }>({
  dataType: () => "tsvector",
});

export const documents = pgTable("documents", {
  slug: text("slug").primaryKey(),
  title: text("title").notNull(),
  organization: text("organization").notNull(),
  year: integer("year").notNull(),
  topic: text("topic").notNull(),
  url: text("url").notNull(),
  body: text("body").notNull(),
  ingestedAt: timestamp("ingested_at", { withTimezone: true }).notNull().defaultNow(),
});

export const chunks = pgTable(
  "chunks",
  {
    id: text("id").primaryKey(),
    slug: text("slug")
      .notNull()
      .references(() => documents.slug, { onDelete: "cascade" }),
    heading: text("heading").notNull(),
    anchor: text("anchor").notNull(),
    ordinal: integer("ordinal").notNull(),
    text: text("text").notNull(),
    /** Null when no embedding model was available at ingestion; keyword search still works. */
    embedding: vector("embedding", { dimensions: EMBEDDING_DIMENSIONS }),
    searchVector: tsvector("search_vector")
      .notNull()
      .generatedAlwaysAs(sql`to_tsvector('english', "text")`),
  },
  (t) => [
    index("chunks_slug_idx").on(t.slug, t.ordinal),
    index("chunks_search_idx").using("gin", t.searchVector),
    index("chunks_embedding_idx").using("hnsw", t.embedding.op("vector_cosine_ops")),
  ],
);

export type DocumentRow = typeof documents.$inferSelect;
export type ChunkRow = typeof chunks.$inferSelect;
