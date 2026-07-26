import "server-only";

import path from "node:path";

import { count } from "drizzle-orm";

import { env } from "@/lib/env";
import type { Database } from "./types";

declare global {
  // Cached across hot reloads in development so we don't reconnect on every edit.
  var __db: Promise<Database> | undefined;
}

/** Loads the corpus into an empty database, embedding it when Ollama is reachable. */
async function ingestIfEmpty(db: Database) {
  const { documents } = await import("./schema");
  const [{ n }] = await db.select({ n: count() }).from(documents);
  if (n > 0) return;

  const { loadGuidelines } = await import("@/lib/corpus");
  const { ingestCorpus } = await import("@/server/ingest");
  const { getOllama } = await import("@/server/ollama");
  const docs = await loadGuidelines();
  const ollama = getOllama();
  try {
    await ingestCorpus(db, docs, { embed: ollama?.embed });
  } catch (error) {
    // Ollama configured but not reachable: fall back to keyword-only search.
    console.warn("Embedding failed during ingestion; continuing without vectors.", error);
    await ingestCorpus(db, docs);
  }
}

async function connect(): Promise<Database> {
  const schema = await import("./schema");

  if (env.DATABASE_URL) {
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const postgres = (await import("postgres")).default;
    // Production databases are migrated and ingested ahead of time (npm run db:migrate && npm run ingest).
    return drizzle(postgres(env.DATABASE_URL, { max: 5, prepare: false }), { schema });
  }

  // No DATABASE_URL: embedded Postgres with pgvector, migrated and filled on first use.
  const { PGlite } = await import("@electric-sql/pglite");
  const { vector } = await import("@electric-sql/pglite/vector");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");

  const inMemory =
    process.env.VERCEL || process.env.PGLITE_IN_MEMORY === "1" || process.env.NEXT_PHASE === "phase-production-build";
  // Single options object: with `new PGlite(undefined, options)` the options are ignored.
  const client = new PGlite({
    dataDir: inMemory ? undefined : path.join(process.cwd(), ".pglite"),
    extensions: { vector },
  });
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  await ingestIfEmpty(db);
  return db;
}

export function getDb(): Promise<Database> {
  globalThis.__db ??= connect().catch((error) => {
    globalThis.__db = undefined;
    throw error;
  });
  return globalThis.__db;
}
