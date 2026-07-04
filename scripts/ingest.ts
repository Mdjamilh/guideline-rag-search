/**
 * (Re)ingests the guideline corpus into DATABASE_URL, embedding chunks with
 * Ollama when OLLAMA_BASE_URL is set. Run after `npm run db:migrate`.
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "../src/db/schema";
import { loadGuidelines } from "../src/lib/corpus";
import { ingestCorpus } from "../src/server/ingest";
import { getOllama } from "../src/server/ollama";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set. Without it the app ingests into its embedded database automatically.");
    process.exitCode = 1;
    return;
  }

  const client = postgres(url, { max: 1, prepare: false });
  const ollama = getOllama();
  const result = await ingestCorpus(drizzle(client, { schema }), await loadGuidelines(), { embed: ollama?.embed });
  await client.end();
  console.log(`Ingested ${result.documents} documents, ${result.chunks} chunks (${result.embedded} embedded).`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
