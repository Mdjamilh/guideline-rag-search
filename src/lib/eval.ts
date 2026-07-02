import fs from "node:fs/promises";
import path from "node:path";

import { z } from "zod";

export const evalCaseSchema = z.object({ question: z.string().min(1), expected: z.string().min(1) });
export type EvalCase = z.infer<typeof evalCaseSchema>;

export async function loadEvalSet(file = path.join(process.cwd(), "content", "eval", "retrieval.json")) {
  return z.array(evalCaseSchema).parse(JSON.parse(await fs.readFile(file, "utf8")));
}

export type EvalResult = { question: string; expected: string; rank: number | null };

/** Rank (1-based) of the first retrieved passage from the expected document, or null if missing. */
export function firstRelevantRank(retrievedSlugs: string[], expected: string): number | null {
  const index = retrievedSlugs.indexOf(expected);
  return index === -1 ? null : index + 1;
}

/** Recall@k: share of questions whose expected document appears in the top k. */
export function recallAtK(results: EvalResult[], k: number): number {
  if (results.length === 0) return 0;
  return results.filter((r) => r.rank !== null && r.rank <= k).length / results.length;
}

/** Mean reciprocal rank: average of 1/rank, counting misses as 0. */
export function meanReciprocalRank(results: EvalResult[]): number {
  if (results.length === 0) return 0;
  return results.reduce((sum, r) => sum + (r.rank ? 1 / r.rank : 0), 0) / results.length;
}
