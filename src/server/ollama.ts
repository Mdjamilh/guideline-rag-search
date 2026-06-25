import { z } from "zod";

import { env } from "@/lib/env";

/** Thin client for the parts of the Ollama REST API we use. */
export type Ollama = {
  embed: (inputs: string[]) => Promise<number[][]>;
  chatStream: (messages: { role: "system" | "user" | "assistant"; content: string }[]) => AsyncIterable<string>;
};

const embedResponse = z.object({ embeddings: z.array(z.array(z.number())) });
const chatLine = z.object({ message: z.object({ content: z.string() }).optional(), done: z.boolean() });

export function createOllama({
  baseUrl,
  chatModel,
  embedModel,
  fetchImpl = fetch,
}: {
  baseUrl: string;
  chatModel: string;
  embedModel: string;
  fetchImpl?: typeof fetch;
}): Ollama {
  const post = async (path: string, body: unknown, timeoutMs: number) => {
    const response = await fetchImpl(new URL(path, baseUrl), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) throw new Error(`Ollama ${path} returned HTTP ${response.status}`);
    return response;
  };

  return {
    // https://github.com/ollama/ollama/blob/main/docs/api.md#generate-embeddings
    async embed(inputs) {
      const response = await post("/api/embed", { model: embedModel, input: inputs }, 60_000);
      return embedResponse.parse(await response.json()).embeddings;
    },

    // Streams newline-delimited JSON chunks and yields only the text deltas.
    async *chatStream(messages) {
      const response = await post(
        "/api/chat",
        { model: chatModel, messages, stream: true, options: { temperature: 0.1 } },
        120_000,
      );
      const reader = response.body!.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const parsed = chatLine.parse(JSON.parse(line));
          if (parsed.message?.content) yield parsed.message.content;
        }
      }
    },
  };
}

/** The configured Ollama client, or undefined when OLLAMA_BASE_URL isn't set. */
export function getOllama(): Ollama | undefined {
  if (!env.OLLAMA_BASE_URL) return undefined;
  return createOllama({
    baseUrl: env.OLLAMA_BASE_URL,
    chatModel: env.OLLAMA_CHAT_MODEL,
    embedModel: env.OLLAMA_EMBED_MODEL,
  });
}
