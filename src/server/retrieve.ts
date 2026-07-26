import { and, asc, cosineDistance, count, desc, eq, isNotNull, sql } from "drizzle-orm";

import { chunks, documents } from "@/db/schema";
import type { Database } from "@/db/types";
import { reciprocalRankFusion } from "@/lib/rrf";
import { expandQuery } from "@/lib/synonyms";

export type Passage = {
  id: string;
  slug: string;
  heading: string;
  anchor: string;
  text: string;
  /** Text with matched terms wrapped in [[ ]] for highlighting. */
  highlighted: string;
  title: string;
  organization: string;
  year: number;
  url: string;
};

export type RetrievedPassage = Passage & { score: number; matchedBy: string[] };

export type RetrievalResult = {
  mode: "hybrid" | "keyword";
  passages: RetrievedPassage[];
};

const CANDIDATES = 12;

/**
 * IDF weight of each query lexeme, from Postgres's own term statistics.
 * Rare words ("mammogram") end up counting far more than common ones
 * ("often", "need"). ts_stat scans the table, which is fine for a corpus of
 * this size; a large corpus would keep these statistics in a materialized view.
 */
async function lexemeWeights(db: Database, query: string): Promise<{ lexeme: string; idf: number }[]> {
  const [{ total }] = await db.select({ total: count() }).from(chunks);
  if (total === 0) return [];
  return db
    .select({
      lexeme: sql<string>`s.word`,
      idf: sql<number>`ln(${total}::float / s.ndoc) + 1`.mapWith(Number),
    })
    .from(sql`ts_stat('SELECT search_vector FROM chunks') AS s`)
    .where(sql`s.word = ANY(tsvector_to_array(to_tsvector('english', ${query})))`);
}

/**
 * Keyword retrieval over the generated tsvector. Questions rarely contain all
 * their words in one passage, so each matched query word adds its IDF weight
 * (a BM25-style score without length normalization); ts_rank_cd breaks ties.
 */
export async function keywordSearch(db: Database, rawQuery: string, limit = CANDIDATES): Promise<Passage[]> {
  const query = expandQuery(rawQuery);
  const weights = await lexemeWeights(db, query);
  if (weights.length === 0) return [];

  const tsquery = sql`replace(plainto_tsquery('english', ${query})::text, '&', '|')::tsquery`;
  const score = sql.join(
    weights.map(
      (w) =>
        sql`(case when ${chunks.searchVector} @@ to_tsquery('simple', ${w.lexeme}) then ${w.idf}::float8 else 0.0 end)`,
    ),
    sql` + `,
  );
  return db
    .select({
      id: chunks.id,
      slug: chunks.slug,
      heading: chunks.heading,
      anchor: chunks.anchor,
      text: chunks.text,
      highlighted: sql<string>`ts_headline('english', ${chunks.text}, ${tsquery}, 'StartSel=[[, StopSel=]], HighlightAll=true')`,
      title: documents.title,
      organization: documents.organization,
      year: documents.year,
      url: documents.url,
    })
    .from(chunks)
    .innerJoin(documents, eq(documents.slug, chunks.slug))
    .where(sql`${chunks.searchVector} @@ ${tsquery}`)
    .orderBy(desc(score), desc(sql`ts_rank_cd(${chunks.searchVector}, ${tsquery}, 32)`), asc(chunks.id))
    .limit(limit);
}

/**
 * Cosine distance above which a semantic match is treated as unrelated.
 * Nearest-neighbour search always returns *something*, so without a cutoff a
 * nonsense question would still get "sources". Tune per embedding model.
 */
export const MAX_VECTOR_DISTANCE = Number(process.env.VECTOR_MAX_DISTANCE) || 0.55;

/** Nearest neighbours by cosine distance (HNSW index) among embedded chunks. */
export async function vectorSearch(
  db: Database,
  embedding: number[],
  limit = CANDIDATES,
  maxDistance = MAX_VECTOR_DISTANCE,
): Promise<Passage[]> {
  const distance = cosineDistance(chunks.embedding, embedding);
  return db
    .select({
      id: chunks.id,
      slug: chunks.slug,
      heading: chunks.heading,
      anchor: chunks.anchor,
      text: chunks.text,
      highlighted: chunks.text,
      title: documents.title,
      organization: documents.organization,
      year: documents.year,
      url: documents.url,
    })
    .from(chunks)
    .innerJoin(documents, eq(documents.slug, chunks.slug))
    .where(and(isNotNull(chunks.embedding), sql`${distance} < ${maxDistance}`))
    .orderBy(distance)
    .limit(limit);
}

/**
 * Hybrid retrieval when an embedder is available (keyword + vector fused with
 * RRF), otherwise keyword-only. A failing embedder degrades to keyword mode
 * instead of failing the request.
 */
export async function retrieve(
  db: Database,
  query: string,
  {
    embed,
    limit = 6,
    maxVectorDistance = MAX_VECTOR_DISTANCE,
  }: { embed?: (texts: string[]) => Promise<number[][]>; limit?: number; maxVectorDistance?: number } = {},
): Promise<RetrievalResult> {
  const keyword = await keywordSearch(db, query);

  let vector: Passage[] | undefined;
  if (embed) {
    try {
      const [queryEmbedding] = await embed([query]);
      vector = await vectorSearch(db, queryEmbedding, CANDIDATES, maxVectorDistance);
    } catch (error) {
      console.warn("Vector search unavailable, using keyword search only.", error);
    }
  }

  const fused = reciprocalRankFusion(vector ? { keyword, vector } : { keyword });
  // Prefer keyword highlighting when a passage was found by both retrievers.
  const highlights = new Map(keyword.map((p) => [p.id, p.highlighted]));
  return {
    mode: vector ? "hybrid" : "keyword",
    passages: fused.slice(0, limit).map((p) => ({ ...p, highlighted: highlights.get(p.id) ?? p.text })),
  };
}
