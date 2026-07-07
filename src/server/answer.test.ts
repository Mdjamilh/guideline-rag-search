import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import type { Database } from "@/db/types";
import type { AskEvent } from "@/lib/ask-events";
import { loadGuidelines } from "@/lib/corpus";
import { createTestDb } from "@/test/db";
import { answerQuestion } from "./answer";
import { ingestCorpus } from "./ingest";
import type { Ollama } from "./ollama";

let db: Database;
let close: () => Promise<void>;

beforeAll(async () => {
  ({ db, close } = await createTestDb());
  await ingestCorpus(db, await loadGuidelines());
});

afterAll(async () => {
  await close();
});

async function collect(stream: AsyncGenerator<AskEvent>) {
  const events: AskEvent[] = [];
  for await (const event of stream) events.push(event);
  return events;
}

function fakeOllama(chunks: string[], { failEmbed = true, failChat = false } = {}) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const chatStream = vi.fn(async function* (_messages: Parameters<Ollama["chatStream"]>[0]) {
    if (failChat) throw new Error("model crashed");
    yield* chunks;
  });
  const ollama: Ollama = {
    embed: async () => {
      if (failEmbed) throw new Error("no embedding model");
      return [];
    },
    chatStream,
  };
  return { ollama, chatStream };
}

describe("answerQuestion", () => {
  it("returns sources only when no model is configured", async () => {
    const events = await collect(answerQuestion(db, "How often do I need a mammogram?", undefined));
    expect(events[0]).toMatchObject({ type: "sources", retrieval: "keyword", generation: "none" });
    expect(events.map((e) => e.type)).toEqual(["sources", "done"]);
  });

  it("streams a grounded answer after the sources, sending numbered passages to the model", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const { ollama, chatStream } = fakeOllama(["Every 2 years ", "from 40 to 74 [1]."]);
    const events = await collect(answerQuestion(db, "How often do I need a mammogram?", ollama));

    expect(events.map((e) => e.type)).toEqual(["sources", "delta", "delta", "done"]);
    const userPrompt = chatStream.mock.calls[0][0][1].content;
    expect(userPrompt).toMatch(/^Sources:\n\n\[1\] Breast cancer screening/);
    expect(userPrompt.endsWith("Question: How often do I need a mammogram?")).toBe(true);
  });

  it("never calls the model when nothing relevant was retrieved", async () => {
    const { ollama, chatStream } = fakeOllama(["should not be used"]);
    const events = await collect(answerQuestion(db, "xylophone quasar", ollama));
    expect(events.map((e) => e.type)).toEqual(["sources", "no-results", "done"]);
    expect(chatStream).not.toHaveBeenCalled();
  });

  it("reports model failures without losing the sources", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { ollama } = fakeOllama([], { failChat: true });
    const events = await collect(answerQuestion(db, "shingles vaccine", ollama));
    expect(events.map((e) => e.type)).toEqual(["sources", "error", "done"]);
  });
});
