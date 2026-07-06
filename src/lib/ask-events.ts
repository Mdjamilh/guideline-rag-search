/** Events streamed from POST /api/ask as newline-delimited JSON. */
export type PublicPassage = {
  id: string;
  slug: string;
  title: string;
  heading: string;
  anchor: string;
  organization: string;
  year: number;
  url: string;
  highlighted: string;
  matchedBy: string[];
};

export type AskEvent =
  | { type: "sources"; retrieval: "hybrid" | "keyword"; generation: "ollama" | "none"; passages: PublicPassage[] }
  | { type: "delta"; text: string }
  | { type: "no-results" }
  | { type: "error"; message: string }
  | { type: "done" };

/** Incrementally parses an NDJSON byte stream into AskEvents. */
export async function* readAskEvents(body: ReadableStream<Uint8Array>): AsyncGenerator<AskEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    // stream: true keeps multi-byte characters split across chunks intact.
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) if (line.trim()) yield JSON.parse(line) as AskEvent;
  }
  if (buffer.trim()) yield JSON.parse(buffer) as AskEvent;
}
