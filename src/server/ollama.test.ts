import { describe, expect, it, vi } from "vitest";

import { createOllama } from "./ollama";

const config = { baseUrl: "http://localhost:11434", chatModel: "llama3.1", embedModel: "nomic-embed-text" };

describe("createOllama", () => {
  it("embeds a batch of inputs", async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json({
        embeddings: [
          [0.1, 0.2],
          [0.3, 0.4],
        ],
      }),
    );
    const ollama = createOllama({ ...config, fetchImpl });

    await expect(ollama.embed(["a", "b"])).resolves.toEqual([
      [0.1, 0.2],
      [0.3, 0.4],
    ]);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [URL, RequestInit];
    expect(String(url)).toBe("http://localhost:11434/api/embed");
    expect(JSON.parse(String(init.body))).toEqual({ model: "nomic-embed-text", input: ["a", "b"] });
  });

  it("streams chat deltas across arbitrary network chunk boundaries", async () => {
    const lines = [
      { message: { content: "Screen " }, done: false },
      { message: { content: "at 45 [1]." }, done: false },
      { done: true },
    ]
      .map((l) => JSON.stringify(l))
      .join("\n");
    // Split mid-line to prove the line buffer works.
    const parts = [lines.slice(0, 17), lines.slice(17, 60), lines.slice(60) + "\n"];
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const p of parts) controller.enqueue(new TextEncoder().encode(p));
        controller.close();
      },
    });
    const ollama = createOllama({ ...config, fetchImpl: vi.fn(async () => new Response(body)) });

    let text = "";
    for await (const delta of ollama.chatStream([{ role: "user", content: "hi" }])) text += delta;
    expect(text).toBe("Screen at 45 [1].");
  });

  it("surfaces HTTP errors", async () => {
    const ollama = createOllama({ ...config, fetchImpl: vi.fn(async () => new Response("no", { status: 404 })) });
    await expect(ollama.embed(["x"])).rejects.toThrow("HTTP 404");
  });
});
