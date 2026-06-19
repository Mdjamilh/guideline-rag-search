import fs from "node:fs/promises";
import path from "node:path";

import matter from "gray-matter";
import { z } from "zod";

const frontmatterSchema = z.object({
  title: z.string().min(1),
  organization: z.string().min(1),
  year: z.number().int().min(2000).max(2100),
  topic: z.string().min(1),
  url: z.url(),
});

export type GuidelineDoc = z.infer<typeof frontmatterSchema> & {
  slug: string;
  body: string;
};

export const CORPUS_DIR = path.join(process.cwd(), "content", "guidelines");

export function parseGuideline(slug: string, source: string): GuidelineDoc {
  const { data, content } = matter(source);
  const parsed = frontmatterSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(`Invalid frontmatter in ${slug}.md: ${parsed.error.issues[0]?.message}`);
  }
  return { ...parsed.data, slug, body: content.trim() };
}

/** Reads every guideline in the corpus directory, sorted by slug for stable ids. */
export async function loadGuidelines(dir = CORPUS_DIR): Promise<GuidelineDoc[]> {
  const files = (await fs.readdir(dir)).filter((f) => f.endsWith(".md")).sort();
  return Promise.all(
    files.map(async (file) =>
      parseGuideline(file.replace(/\.md$/, ""), await fs.readFile(path.join(dir, file), "utf8")),
    ),
  );
}
