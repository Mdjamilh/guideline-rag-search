import { count, isNotNull } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { chunks, documents, EMBEDDING_DIMENSIONS } from "@/db/schema";
import type { Database } from "@/db/types";
import { loadGuidelines, type GuidelineDoc } from "@/lib/corpus";
import { createTestDb } from "@/test/db";
import { ingestCorpus, type Embedder } from "./ingest";

let db: Database;
let close: () => Promise<void>;
let docs: GuidelineDoc[];

const fakeEmbed: Embedder = async (texts) =>
  texts.map((t) => Array.from({ length: EMBEDDING_DIMENSIONS }, (_, i) => ((t.length + i) % 7) / 7));

beforeAll(async () => {
  ({ db, close } = await createTestDb());
  docs = await loadGuidelines();
});

afterAll(async () => {
  await close();
});

const total = async (table: typeof chunks | typeof documents) => (await db.select({ n: count() }).from(table))[0].n;

describe("ingestCorpus", () => {
  it("loads every document and chunk without embeddings when no embedder is given", async () => {
    const result = await ingestCorpus(db, docs);
    expect(result.documents).toBe(docs.length);
    expect(result.embedded).toBe(0);
    expect(await total(chunks)).toBe(result.chunks);
  });

  it("is idempotent when run again", async () => {
    const before = await total(chunks);
    await ingestCorpus(db, docs);
    expect(await total(chunks)).toBe(before);
    expect(await total(documents)).toBe(docs.length);
  });

  it("stores embeddings when an embedder is available", async () => {
    const result = await ingestCorpus(db, docs.slice(0, 2), { embed: fakeEmbed });
    const [{ n }] = await db.select({ n: count() }).from(chunks).where(isNotNull(chunks.embedding));
    expect(n).toBe(result.embedded);
    expect(result.embedded).toBeGreaterThan(0);
  });

  it("rejects embeddings with the wrong dimensions", async () => {
    await expect(ingestCorpus(db, docs.slice(0, 1), { embed: async (t) => t.map(() => [1, 2, 3]) })).rejects.toThrow(
      /768-dimensional/,
    );
  });

  it("populates the generated full-text column", async () => {
    const [row] = await db.select({ v: chunks.searchVector }).from(chunks).limit(1);
    expect(row.v.length).toBeGreaterThan(0);
  });
});
