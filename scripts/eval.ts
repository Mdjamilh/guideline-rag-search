/**
 * Retrieval evaluation: runs every question in content/eval/retrieval.json
 * against a fresh in-memory database and reports recall@k and MRR.
 * Uses hybrid retrieval when OLLAMA_BASE_URL is set, keyword-only otherwise.
 */
import path from "node:path";

import { PGlite } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite/vector";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";

import * as schema from "../src/db/schema";
import { loadGuidelines } from "../src/lib/corpus";
import { firstRelevantRank, loadEvalSet, meanReciprocalRank, recallAtK, type EvalResult } from "../src/lib/eval";
import { ingestCorpus } from "../src/server/ingest";
import { getOllama } from "../src/server/ollama";
import { retrieve } from "../src/server/retrieve";

async function main() {
  const client = new PGlite({ extensions: { vector } });
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });

  const embed = getOllama()?.embed;
  await ingestCorpus(db, await loadGuidelines(), { embed });

  const results: EvalResult[] = [];
  let mode = "keyword";
  for (const c of await loadEvalSet()) {
    const retrieval = await retrieve(db, c.question, { embed });
    mode = retrieval.mode;
    results.push({ ...c, rank: firstRelevantRank([...new Set(retrieval.passages.map((p) => p.slug))], c.expected) });
  }

  console.table(results.map((r) => ({ question: r.question, expected: r.expected, rank: r.rank ?? "miss" })));
  console.log(`mode: ${mode}`);
  for (const k of [1, 3, 5]) console.log(`recall@${k}: ${(recallAtK(results, k) * 100).toFixed(1)}%`);
  console.log(`MRR: ${meanReciprocalRank(results).toFixed(3)}`);
  await client.close();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
