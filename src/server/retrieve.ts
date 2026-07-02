import { and, asc, cosineDistance, desc, eq, isNotNull, sql } from "drizzle-orm";

import { chunks, documents } from "@/db/schema";
import type { Database } from "@/db/types";
import { reciprocalRankFusion } from "@/lib/rrf";

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
 * Keyword retrieval over the generated tsvector. Questions rarely contain all
 * their words in one passage, so the query's lexemes are OR-ed together and
 * ts_rank_cd rewards passages that match more of them, closer together.
 */
export async function keywordSearch(db: Database, query: string, limit = CANDIDATES): Promise<Passage[]> {
  const tsquery = sql`nullif(replace(plainto_tsquery('english', ${query})::text, '&', '|'), '')::tsquery`;
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
    .orderBy(desc(sql`ts_rank_cd(${chunks.searchVector}, ${tsquery}, 32)`), asc(chunks.id))
    .limit(limit);
}

/** Nearest neighbours by cosine distance (HNSW index) among embedded chunks. */
export async function vectorSearch(db: Database, embedding: number[], limit = CANDIDATES): Promise<Passage[]> {
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
    .where(and(isNotNull(chunks.embedding)))
    .orderBy(cosineDistance(chunks.embedding, embedding))
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
  { embed, limit = 6 }: { embed?: (texts: string[]) => Promise<number[][]>; limit?: number } = {},
): Promise<RetrievalResult> {
  const keyword = await keywordSearch(db, query);

  let vector: Passage[] | undefined;
  if (embed) {
    try {
      const [queryEmbedding] = await embed([query]);
      vector = await vectorSearch(db, queryEmbedding);
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
