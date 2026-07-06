import type { Database } from "@/db/types";
import type { AskEvent } from "@/lib/ask-events";
import { buildUserPrompt, SYSTEM_PROMPT } from "@/lib/prompt";
import type { Ollama } from "./ollama";
import { retrieve } from "./retrieve";

/**
 * Retrieval-augmented answering as a stream of events: sources first (so the
 * UI can show them immediately), then answer text as the model produces it.
 * Without a model, only the sources are returned.
 */
export async function* answerQuestion(
  db: Database,
  question: string,
  ollama: Ollama | undefined,
): AsyncGenerator<AskEvent> {
  const { mode, passages } = await retrieve(db, question, { embed: ollama?.embed });

  yield {
    type: "sources",
    retrieval: mode,
    generation: ollama ? "ollama" : "none",
    passages: passages.map(({ id, slug, title, heading, anchor, organization, year, url, highlighted, matchedBy }) => ({
      id,
      slug,
      title,
      heading,
      anchor,
      organization,
      year,
      url,
      highlighted,
      matchedBy,
    })),
  };

  if (passages.length === 0) {
    // Nothing to ground an answer in, so don't ask the model to improvise.
    yield { type: "no-results" };
  } else if (ollama) {
    try {
      for await (const text of ollama.chatStream([
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(question, passages) },
      ])) {
        yield { type: "delta", text };
      }
    } catch (error) {
      console.error("Answer generation failed", error);
      yield {
        type: "error",
        message: "The language model is unavailable right now. The sources below are still relevant.",
      };
    }
  }

  yield { type: "done" };
}
