import { ArrowUpRightIcon, BookOpenIcon } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import type { PublicPassage } from "@/lib/ask-events";
import { splitHighlights } from "@/lib/citations";
import { cn } from "@/lib/utils";

type Props = { passages: PublicPassage[]; cited: Set<number> };

/** Strips the "Title — Heading" prefix that chunks carry for retrieval. */
const body = (text: string) => text.split("\n").slice(1).join("\n");

export function SourceList({ passages, cited }: Props) {
  return (
    <ol className="space-y-3">
      {passages.map((passage, i) => {
        const n = i + 1;
        return (
          <li
            key={passage.id}
            id={`source-${n}`}
            className={cn(
              "bg-card target:border-primary target:ring-primary/30 scroll-mt-24 rounded-xl border p-4 transition-colors target:ring-2",
              cited.has(n) && "border-primary/40",
            )}
          >
            <div className="flex flex-wrap items-start gap-x-3 gap-y-1">
              <span className="bg-primary/10 text-primary flex size-6 shrink-0 items-center justify-center rounded-md text-xs font-semibold">
                {n}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {passage.title} <span className="text-muted-foreground font-normal">· {passage.heading}</span>
                </p>
                <p className="text-muted-foreground text-xs">
                  {passage.organization}, {passage.year}
                </p>
              </div>
              <div className="flex gap-1">
                {passage.matchedBy.map((m) => (
                  <Badge key={m} variant="secondary" className="font-normal">
                    {m}
                  </Badge>
                ))}
              </div>
            </div>
            <p className="text-muted-foreground mt-3 text-sm leading-relaxed whitespace-pre-line">
              {splitHighlights(body(passage.highlighted)).map((part, j) =>
                part.marked ? (
                  <mark key={j} className="bg-primary/15 text-foreground rounded px-0.5">
                    {part.text}
                  </mark>
                ) : (
                  <span key={j}>{part.text}</span>
                ),
              )}
            </p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
              <Link
                href={`/guidelines/${passage.slug}#${passage.anchor}`}
                className="text-primary inline-flex items-center gap-1 hover:underline"
              >
                <BookOpenIcon className="size-3.5" /> Read in context
              </Link>
              <a
                href={passage.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
              >
                Official source <ArrowUpRightIcon className="size-3.5" />
              </a>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
