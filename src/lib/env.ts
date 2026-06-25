import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.url().optional(),
  OLLAMA_BASE_URL: z.url().optional(),
  OLLAMA_CHAT_MODEL: z.string().default("llama3.1"),
  OLLAMA_EMBED_MODEL: z.string().default("nomic-embed-text"),
});

export const env = schema.parse({
  DATABASE_URL: process.env.DATABASE_URL || undefined,
  OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL || undefined,
  OLLAMA_CHAT_MODEL: process.env.OLLAMA_CHAT_MODEL || undefined,
  OLLAMA_EMBED_MODEL: process.env.OLLAMA_EMBED_MODEL || undefined,
});
