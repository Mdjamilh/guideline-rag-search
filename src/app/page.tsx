import { ArrowRightIcon, BookOpenCheckIcon, LibraryIcon, QuoteIcon, SearchCheckIcon } from "lucide-react";
import Link from "next/link";

import { EXAMPLE_QUESTIONS } from "@/components/ask-experience";
import { Button } from "@/components/ui/button";
import { getOllama } from "@/server/ollama";
import { libraryStats } from "@/server/library";

export const dynamic = "force-dynamic";

const STEPS = [
  {
    icon: SearchCheckIcon,
    title: "Hybrid retrieval",
    body: "Your question is matched against every guideline passage with full-text search and, when available, semantic vector search, then the results are fused.",
  },
  {
    icon: QuoteIcon,
    title: "Grounded, cited answers",
    body: "A local LLM answers using only the retrieved passages. Every sentence cites its source, and invalid citations are dropped.",
  },
  {
    icon: LibraryIcon,
    title: "Check the source",
    body: "Each citation opens the exact section it came from, with a link to the official recommendation.",
  },
];

export default async function HomePage() {
  const stats = await libraryStats();
  const aiEnabled = Boolean(getOllama());

  return (
    <div className="space-y-16">
      <section className="mx-auto max-w-3xl pt-6 text-center">
        <p className="bg-card text-muted-foreground mb-5 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium">
          <BookOpenCheckIcon className="text-primary size-3.5" />
          {stats.documents} guidelines · {stats.passages} indexed passages
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Answers about preventive care, with the receipts.
        </h1>
        <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-lg">
          Ask about cancer screening, heart health or adult vaccines and get a short answer where every claim links back
          to the guideline it came from.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button size="lg" asChild>
            <Link href="/ask">
              Ask a question <ArrowRightIcon />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/guidelines">Browse guidelines</Link>
          </Button>
        </div>
        {!aiEnabled && (
          <p className="text-muted-foreground mt-4 text-xs">
            This deployment runs search-only. Generated answers need a local Ollama model.
          </p>
        )}
      </section>

      <section aria-label="How it works" className="grid gap-4 md:grid-cols-3">
        {STEPS.map((step) => (
          <div key={step.title} className="bg-card rounded-xl border p-6">
            <span className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-lg">
              <step.icon className="size-5" />
            </span>
            <h2 className="mt-4 font-semibold">{step.title}</h2>
            <p className="text-muted-foreground mt-1 text-sm">{step.body}</p>
          </div>
        ))}
      </section>

      <section aria-labelledby="examples-heading" className="bg-card rounded-2xl border p-6">
        <h2 id="examples-heading" className="mb-4 font-semibold">
          Popular questions
        </h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {EXAMPLE_QUESTIONS.map((q) => (
            <li key={q}>
              <Link
                href={`/ask?q=${encodeURIComponent(q)}`}
                className="hover:bg-accent flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm transition-colors"
              >
                {q} <ArrowRightIcon className="text-muted-foreground size-4 shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
