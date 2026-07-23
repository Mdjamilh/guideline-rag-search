import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { getOllama } from "@/server/ollama";
import { libraryStats } from "@/server/library";

export const metadata: Metadata = { title: "How it works" };
export const dynamic = "force-dynamic";

const PIPELINE = [
  ["Ingest", "Each Markdown guideline is split into section-sized passages and stored in Postgres."],
  [
    "Index",
    "A generated tsvector column powers full-text search; pgvector stores 768-dimension embeddings (nomic-embed-text) with an HNSW index.",
  ],
  [
    "Retrieve",
    "Keyword search scores passages by the IDF weight of matched words, with a small medical synonym list. Vector search finds nearest neighbors by cosine distance.",
  ],
  [
    "Fuse",
    "Reciprocal Rank Fusion merges both rankings using rank positions only, so the two scoring scales never need calibrating.",
  ],
  [
    "Generate",
    "A local Llama model answers from the top passages only and must cite them; citations to sources that don't exist are removed.",
  ],
] as const;

export default async function AboutPage() {
  const stats = await libraryStats();
  const aiEnabled = Boolean(getOllama());

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="How it works"
        description="A small, inspectable retrieval-augmented generation (RAG) system built on Postgres."
      />

      <dl className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          ["Guidelines", stats.documents],
          ["Passages", stats.passages],
          ["Embedded", stats.embedded],
          ["Answer model", aiEnabled ? "On" : "Off"],
        ].map(([label, value]) => (
          <div key={label} className="bg-card rounded-xl border p-4">
            <dt className="text-muted-foreground text-xs">{label}</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>

      <ol className="relative space-y-6 border-l pl-6">
        {PIPELINE.map(([step, text], i) => (
          <li key={step}>
            <span className="bg-background absolute -left-3 flex size-6 items-center justify-center rounded-full border text-xs font-semibold">
              {i + 1}
            </span>
            <h2 className="font-semibold">{step}</h2>
            <p className="text-muted-foreground mt-1">{text}</p>
          </li>
        ))}
      </ol>

      <section className="bg-card mt-12 rounded-xl border p-6">
        <h2 className="font-semibold">Measured, not assumed</h2>
        <p className="text-muted-foreground mt-2">
          A 16-question retrieval eval runs in CI and fails the build if recall@1 or mean reciprocal rank drops below
          0.9. Adding IDF weighting and query expansion raised keyword-only recall@1 from 81% to 100%. The set is small
          and was written alongside the corpus, so treat these numbers as a regression guard, not a benchmark.
        </p>
      </section>
    </div>
  );
}
