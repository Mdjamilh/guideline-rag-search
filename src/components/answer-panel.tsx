import { AlertTriangleIcon, InfoIcon, SparklesIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { AskState } from "@/hooks/use-ask";
import { parseAnswer } from "@/lib/citations";

export function AnswerPanel({ state }: { state: AskState }) {
  const segments = parseAnswer(state.answer, state.passages.length);

  return (
    <section aria-labelledby="answer-heading" className="bg-card rounded-2xl border p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SparklesIcon className="text-primary size-4" />
        <h2 id="answer-heading" className="font-semibold">
          Answer
        </h2>
        <div className="ml-auto flex gap-1.5">
          {state.retrieval && (
            <Badge variant="secondary" className="font-normal">
              {state.retrieval === "hybrid" ? "Hybrid search" : "Keyword search"}
            </Badge>
          )}
          {state.generation === "ollama" && (
            <Badge variant="secondary" className="font-normal">
              Local LLM
            </Badge>
          )}
        </div>
      </div>

      {state.status === "searching" && (
        <div className="space-y-2" aria-label="Searching guidelines">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      )}

      {state.noResults && (
        <p className="text-muted-foreground">
          The guidelines in this library don&apos;t seem to cover that. Try rephrasing, or browse the guideline list.
        </p>
      )}

      {state.generation === "none" && state.passages.length > 0 && (
        <p className="text-muted-foreground flex items-start gap-2 text-sm">
          <InfoIcon className="mt-0.5 size-4 shrink-0" />
          AI answers are turned off in this deployment, so here are the most relevant guideline passages instead. Run
          the app with Ollama to get generated, cited answers.
        </p>
      )}

      {(state.answer || state.status === "answering") && (
        <p className="leading-relaxed" aria-live="polite" aria-busy={state.status === "answering"}>
          {segments.map((segment, i) =>
            segment.type === "text" ? (
              <span key={i}>{segment.text}</span>
            ) : (
              <a
                key={i}
                href={`#source-${segment.index}`}
                className="bg-primary/15 text-primary hover:bg-primary hover:text-primary-foreground mx-0.5 inline-flex size-5 items-center justify-center rounded align-text-top text-[0.7rem] font-semibold"
                aria-label={`Source ${segment.index}`}
              >
                {segment.index}
              </a>
            ),
          )}
          {state.status === "answering" && (
            <span className="bg-primary ml-0.5 inline-block h-4 w-1.5 animate-pulse align-middle" />
          )}
        </p>
      )}

      {state.error && (
        <p role="alert" className="text-destructive mt-3 flex items-start gap-2 text-sm">
          <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
          {state.error}
        </p>
      )}

      {state.status === "done" && state.answer && (
        <p className="text-muted-foreground mt-4 border-t pt-3 text-xs">
          Generated from the sources below. Not medical advice; check the official source and talk to a clinician about
          your situation.
        </p>
      )}
    </section>
  );
}
