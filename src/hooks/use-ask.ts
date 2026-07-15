"use client";

import { useCallback, useRef, useState } from "react";

import { readAskEvents, type PublicPassage } from "@/lib/ask-events";

export type AskState = {
  status: "idle" | "searching" | "answering" | "done" | "error";
  question: string;
  answer: string;
  passages: PublicPassage[];
  retrieval: "hybrid" | "keyword" | null;
  generation: "ollama" | "none" | null;
  noResults: boolean;
  error: string | null;
};

const initial: AskState = {
  status: "idle",
  question: "",
  answer: "",
  passages: [],
  retrieval: null,
  generation: null,
  noResults: false,
  error: null,
};

/** Posts a question to /api/ask and folds the streamed events into state. */
export function useAsk() {
  const [state, setState] = useState<AskState>(initial);
  const controller = useRef<AbortController | null>(null);

  const ask = useCallback(async (question: string) => {
    // A new question cancels any answer still streaming.
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    setState({ ...initial, status: "searching", question });

    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
        signal: abort.signal,
      });
      if (!response.ok || !response.body) {
        const { error } = await response.json().catch(() => ({ error: "Something went wrong." }));
        setState((s) => ({ ...s, status: "error", error }));
        return;
      }

      for await (const event of readAskEvents(response.body)) {
        setState((s) => {
          switch (event.type) {
            case "sources":
              return {
                ...s,
                status: event.generation === "ollama" && event.passages.length > 0 ? "answering" : s.status,
                passages: event.passages,
                retrieval: event.retrieval,
                generation: event.generation,
              };
            case "delta":
              return { ...s, answer: s.answer + event.text };
            case "no-results":
              return { ...s, noResults: true };
            case "error":
              return { ...s, error: event.message };
            case "done":
              return { ...s, status: "done" };
          }
        });
      }
    } catch (error) {
      if ((error as Error).name === "AbortError") return;
      setState((s) => ({ ...s, status: "error", error: "Couldn't reach the server. Check your connection." }));
    }
  }, []);

  return { state, ask };
}
