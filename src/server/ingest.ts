import { eq } from "drizzle-orm";

import { chunks, documents, EMBEDDING_DIMENSIONS } from "@/db/schema";
import type { Database } from "@/db/types";
import { chunkDocument } from "@/lib/chunk";
import type { GuidelineDoc } from "@/lib/corpus";

export type Embedder = (texts: string[]) => Promise<number[][]>;

const BATCH_SIZE = 16;

async function embedAll(texts: string[], embed: Embedder): Promise<number[][]> {
  const vectors: number[][] = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = await embed(texts.slice(i, i + BATCH_SIZE));
    for (const v of batch) {
      if (v.length !== EMBEDDING_DIMENSIONS) {
        throw new Error(`Expected ${EMBEDDING_DIMENSIONS}-dimensional embeddings, got ${v.length}`);
      }
    }
    vectors.push(...batch);
  }
  return vectors;
}

/**
 * Idempotently (re)loads documents and their chunks. Each document is
 * replaced in its own transaction, so a failure never leaves half a document.
 * Without an embedder, chunks are stored without vectors and only keyword
 * search is available for them.
 */
export async function ingestCorpus(
  db: Database,
  docs: GuidelineDoc[],
  { embed }: { embed?: Embedder } = {},
): Promise<{ documents: number; chunks: number; embedded: number }> {
  let chunkCount = 0;
  let embedded = 0;

  for (const doc of docs) {
    const docChunks = chunkDocument(doc);
    const vectors = embed
      ? await embedAll(
          docChunks.map((c) => c.text),
          embed,
        )
      : undefined;

    await db.transaction(async (tx) => {
      await tx.delete(documents).where(eq(documents.slug, doc.slug));
      await tx.insert(documents).values({
        slug: doc.slug,
        title: doc.title,
        organization: doc.organization,
        year: doc.year,
        topic: doc.topic,
        url: doc.url,
        body: doc.body,
      });
      await tx.insert(chunks).values(
        docChunks.map((chunk, i) => ({
          id: chunk.id,
          slug: chunk.slug,
          heading: chunk.heading,
          anchor: chunk.anchor,
          ordinal: chunk.ordinal,
          text: chunk.text,
          embedding: vectors?.[i] ?? null,
        })),
      );
    });

    chunkCount += docChunks.length;
    if (vectors) embedded += vectors.length;
  }

  return { documents: docs.length, chunks: chunkCount, embedded };
}
