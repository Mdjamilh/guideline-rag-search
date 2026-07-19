import "server-only";

import { asc, count, eq, isNotNull } from "drizzle-orm";

import { getDb } from "@/db";
import { chunks, documents } from "@/db/schema";

export async function listDocuments() {
  const db = await getDb();
  return db
    .select({
      slug: documents.slug,
      title: documents.title,
      organization: documents.organization,
      year: documents.year,
      topic: documents.topic,
    })
    .from(documents)
    .orderBy(asc(documents.topic), asc(documents.title));
}

export async function getDocument(slug: string) {
  const db = await getDb();
  const [doc] = await db.select().from(documents).where(eq(documents.slug, slug));
  return doc ?? null;
}

export async function libraryStats() {
  const db = await getDb();
  const [[docs], [passages], [embedded]] = await Promise.all([
    db.select({ n: count() }).from(documents),
    db.select({ n: count() }).from(chunks),
    db.select({ n: count() }).from(chunks).where(isNotNull(chunks.embedding)),
  ]);
  return { documents: docs.n, passages: passages.n, embedded: embedded.n };
}
