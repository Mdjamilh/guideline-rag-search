import { z } from "zod";

import { getDb } from "@/db";
import type { AskEvent } from "@/lib/ask-events";
import { answerQuestion } from "@/server/answer";
import { getOllama } from "@/server/ollama";
import { createRateLimiter } from "@/server/rate-limit";

// Answers are generated per request and streamed; never cache them.
export const dynamic = "force-dynamic";

const limiter = createRateLimiter({ limit: Number(process.env.ASK_RATE_LIMIT) || 20, windowMs: 60_000 });

const bodySchema = z.object({
  question: z
    .string()
    .trim()
    .min(3, "Ask a slightly longer question.")
    .max(300, "Keep questions under 300 characters."),
});

/** POST /api/ask → newline-delimited JSON stream of AskEvents. */
export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const { allowed, retryAfterMs } = limiter(ip);
  if (!allowed) {
    return Response.json(
      { error: "Too many questions in a short time. Please wait a moment." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) } },
    );
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
  }

  const db = await getDb();
  const events = answerQuestion(db, parsed.data.question, getOllama());
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { value, done } = await events.next();
      if (done) {
        controller.close();
        return;
      }
      controller.enqueue(encoder.encode(JSON.stringify(value satisfies AskEvent) + "\n"));
    },
    async cancel() {
      // Client went away: stop generating.
      await events.return(undefined);
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
}
