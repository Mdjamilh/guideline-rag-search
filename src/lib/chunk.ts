import type { GuidelineDoc } from "./corpus";

export type Chunk = {
  /** Stable id, e.g. `colorectal-cancer-screening#recommendation-0`. */
  id: string;
  slug: string;
  heading: string;
  /** Anchor of the section on the document page. */
  anchor: string;
  ordinal: number;
  text: string;
};

export const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** Splits Markdown into `## ` sections; text before the first heading becomes "Overview". */
function sections(body: string): { heading: string; content: string }[] {
  const result: { heading: string; content: string }[] = [];
  let heading = "Overview";
  let lines: string[] = [];
  const flush = () => {
    const content = lines.join("\n").trim();
    if (content) result.push({ heading, content });
  };
  for (const line of body.split("\n")) {
    const match = /^##\s+(.+)$/.exec(line);
    if (match) {
      flush();
      heading = match[1].trim();
      lines = [];
    } else {
      lines.push(line);
    }
  }
  flush();
  return result;
}

/** Packs paragraphs (or list items) into pieces of at most `maxChars`, never splitting a paragraph. */
function pack(content: string, maxChars: number): string[] {
  const blocks = content
    .split(/\n\s*\n|\n(?=- )/)
    .map((b) => b.trim())
    .filter(Boolean);
  const pieces: string[] = [];
  let current = "";
  for (const block of blocks) {
    if (current && current.length + block.length + 1 > maxChars) {
      pieces.push(current);
      current = block;
    } else {
      current = current ? `${current}\n${block}` : block;
    }
  }
  if (current) pieces.push(current);
  return pieces;
}

/**
 * Section-aware chunking: one chunk per section unless it's long, in which
 * case it's split on paragraph boundaries. Each chunk is prefixed with the
 * document title and heading so it stands on its own for retrieval.
 */
export function chunkDocument(doc: GuidelineDoc, { maxChars = 900 } = {}): Chunk[] {
  const chunks: Chunk[] = [];
  for (const section of sections(doc.body)) {
    const anchor = slugify(section.heading);
    pack(section.content, maxChars).forEach((piece, i) => {
      chunks.push({
        id: `${doc.slug}#${anchor}-${i}`,
        slug: doc.slug,
        heading: section.heading,
        anchor,
        ordinal: chunks.length,
        text: `${doc.title} — ${section.heading}\n${piece}`,
      });
    });
  }
  return chunks;
}
