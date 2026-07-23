import { ArrowUpRightIcon, ChevronLeftIcon, MessageCircleQuestionIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { GuidelineMarkdown } from "@/components/guideline-markdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getDocument } from "@/server/library";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const doc = await getDocument((await params).slug);
  return { title: doc?.title ?? "Guideline not found" };
}

export default async function GuidelinePage({ params }: Props) {
  const doc = await getDocument((await params).slug);
  if (!doc) notFound();

  return (
    <article className="mx-auto max-w-3xl">
      <Link
        href="/guidelines"
        className="text-muted-foreground hover:text-foreground mb-6 inline-flex items-center gap-1 text-sm"
      >
        <ChevronLeftIcon className="size-4" /> All guidelines
      </Link>

      <header className="mb-6 space-y-3">
        <Badge variant="secondary">{doc.topic}</Badge>
        <h1 className="text-3xl font-semibold tracking-tight">{doc.title}</h1>
        <p className="text-muted-foreground">
          Summary of the {doc.year} recommendation from the {doc.organization}.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href={doc.url} target="_blank" rel="noopener noreferrer">
              Read the official recommendation <ArrowUpRightIcon />
            </a>
          </Button>
          <Button size="sm" asChild>
            <Link
              href={`/ask?q=${encodeURIComponent(`What does the ${doc.title.toLowerCase()} guideline recommend?`)}`}
            >
              <MessageCircleQuestionIcon /> Ask about this
            </Link>
          </Button>
        </div>
      </header>

      <div className="border-warning/40 bg-warning/10 rounded-xl border px-4 py-3 text-sm">
        This is an educational summary written for a portfolio project. Recommendations change; always confirm with the
        official source.
      </div>

      <GuidelineMarkdown body={doc.body} />
    </article>
  );
}
