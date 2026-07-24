"use client";

import { ArrowRightIcon, Loader2Icon, SearchIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAsk } from "@/hooks/use-ask";
import { citedSources } from "@/lib/citations";
import { EXAMPLE_QUESTIONS } from "@/lib/examples";
import { AnswerPanel } from "./answer-panel";
import { SourceList } from "./source-list";

export function AskExperience() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const initialQuestion = params.get("q") ?? "";
  const [question, setQuestion] = useState(initialQuestion);
  const { state, ask } = useAsk();
  const asked = useRef<string | null>(null);

  // Shareable URLs: /ask?q=... runs the question on load and on back/forward.
  useEffect(() => {
    if (initialQuestion && asked.current !== initialQuestion) {
      asked.current = initialQuestion;
      setQuestion(initialQuestion);
      void ask(initialQuestion);
    }
  }, [initialQuestion, ask]);

  const submit = (value: string) => {
    const q = value.trim();
    if (q.length < 3) return;
    router.push(`${pathname}?q=${encodeURIComponent(q)}`, { scroll: false });
  };

  const busy = state.status === "searching" || state.status === "answering";
  const cited = new Set(citedSources(state.answer, state.passages.length));

  return (
    <div className="space-y-8">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit(question);
        }}
        className="flex flex-col gap-3 sm:flex-row"
      >
        <div className="relative flex-1">
          <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask about a screening test or vaccine…"
            aria-label="Your question"
            maxLength={300}
            className="h-11 pl-9 text-base"
          />
        </div>
        <Button type="submit" size="lg" className="h-11" disabled={busy || question.trim().length < 3}>
          {busy ? <Loader2Icon className="animate-spin" /> : <ArrowRightIcon />} Ask
        </Button>
      </form>

      {state.status === "idle" && (
        <div>
          <p className="text-muted-foreground mb-3 text-sm">Try one of these:</p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_QUESTIONS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => submit(q)}
                className="bg-card hover:border-primary/50 hover:text-primary rounded-full border px-3 py-1.5 text-sm transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {state.status !== "idle" && (
        <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr]">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <AnswerPanel state={state} />
          </div>
          <section aria-labelledby="sources-heading">
            <h2 id="sources-heading" className="mb-3 font-semibold">
              Sources {state.passages.length > 0 && `(${state.passages.length})`}
            </h2>
            {state.passages.length > 0 ? (
              <SourceList passages={state.passages} cited={cited} />
            ) : (
              state.status !== "searching" && <p className="text-muted-foreground text-sm">No matching passages.</p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
