import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { EMBEDDING_DIMENSIONS } from "@/db/schema";
import type { Database } from "@/db/types";
import { loadGuidelines } from "@/lib/corpus";
import { firstRelevantRank, loadEvalSet, meanReciprocalRank, recallAtK, type EvalResult } from "@/lib/eval";
import { createTestDb } from "@/test/db";
import { ingestCorpus } from "./ingest";
import { keywordSearch, retrieve } from "./retrieve";

let db: Database;
let close: () => Promise<void>;

/** Deterministic toy embedding: one dimension per hashed word. Good enough to exercise the vector path. */
const toyEmbed = async (texts: string[]) =>
  texts.map((text) => {
    const v = new Array<number>(EMBEDDING_DIMENSIONS).fill(0);
    for (const word of text.toLowerCase().match(/[a-z]{4,}/g) ?? []) {
      let h = 0;
      for (const ch of word) h = (h * 31 + ch.charCodeAt(0)) % EMBEDDING_DIMENSIONS;
      v[h] += 1;
    }
    return v.some((x) => x > 0) ? v : v.map((_, i) => (i === 0 ? 1 : 0));
  });

beforeAll(async () => {
  ({ db, close } = await createTestDb());
  await ingestCorpus(db, await loadGuidelines(), { embed: toyEmbed });
});

afterAll(async () => {
  await close();
});

describe("keywordSearch", () => {
  it("finds passages that match only some of the question's words and highlights them", async () => {
    const [top] = await keywordSearch(db, "when do I start colorectal screening?");
    expect(top.slug).toBe("colorectal-cancer-screening");
    expect(top.highlighted).toMatch(/\[\[[Cc]olorectal\]\]/);
  });

  it("returns nothing for stop-word-only or empty queries instead of erroring", async () => {
    await expect(keywordSearch(db, "the and of")).resolves.toEqual([]);
    await expect(keywordSearch(db, "")).resolves.toEqual([]);
  });
});

describe("retrieve", () => {
  it("runs hybrid retrieval when an embedder is available", async () => {
    // Toy bag-of-words vectors are far less similar than real embeddings, so loosen the cutoff.
    const result = await retrieve(db, "shingles vaccine age", { embed: toyEmbed, maxVectorDistance: 0.95 });
    expect(result.mode).toBe("hybrid");
    expect(result.passages[0].slug).toBe("adult-vaccines");
    expect(result.passages.some((p) => p.matchedBy.length === 2)).toBe(true);
  });

  it("falls back to keyword mode when there is no embedder or it fails", async () => {
    expect((await retrieve(db, "mammogram")).mode).toBe("keyword");
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const failing = async () => {
      throw new Error("Ollama down");
    };
    const result = await retrieve(db, "mammogram", { embed: failing });
    expect(result.mode).toBe("keyword");
    expect(result.passages[0].slug).toBe("breast-cancer-screening");
  });
});

describe("retrieval evaluation (keyword mode)", () => {
  it("meets the recall and MRR quality bar on the eval set", async () => {
    const cases = await loadEvalSet();
    const results: EvalResult[] = [];
    for (const c of cases) {
      const { passages } = await retrieve(db, c.question);
      results.push({ ...c, rank: firstRelevantRank([...new Set(passages.map((p) => p.slug))], c.expected) });
    }

    const misses = results.filter((r) => r.rank === null || r.rank > 3).map((r) => r.question);
    expect(recallAtK(results, 3), `missed: ${misses.join(" | ")}`).toBeGreaterThanOrEqual(0.85);
    expect(recallAtK(results, 1), `missed at rank 1: ${misses.join(" | ")}`).toBeGreaterThanOrEqual(0.9);
    expect(meanReciprocalRank(results)).toBeGreaterThanOrEqual(0.9);
  });
});

describe("metrics", () => {
  it("computes recall@k and MRR", () => {
    const results: EvalResult[] = [
      { question: "a", expected: "x", rank: 1 },
      { question: "b", expected: "y", rank: 3 },
      { question: "c", expected: "z", rank: null },
    ];
    expect(recallAtK(results, 1)).toBeCloseTo(1 / 3);
    expect(recallAtK(results, 3)).toBeCloseTo(2 / 3);
    expect(meanReciprocalRank(results)).toBeCloseTo((1 + 1 / 3) / 3);
    expect(firstRelevantRank(["p", "q", "x"], "x")).toBe(3);
  });
});

describe("vector cutoff", () => {
  it("drops semantic matches that are too distant to be related", async () => {
    const result = await retrieve(db, "xylophone quasar", { embed: toyEmbed });
    expect(result.passages).toEqual([]);
  });
});
