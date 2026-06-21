import { describe, expect, it } from "vitest";

import { chunkDocument, slugify } from "./chunk";
import { loadGuidelines, parseGuideline, type GuidelineDoc } from "./corpus";

const doc = (body: string): GuidelineDoc => ({
  slug: "test-doc",
  title: "Test guideline",
  organization: "Test org",
  year: 2024,
  topic: "Testing",
  url: "https://example.com",
  body,
});

describe("chunkDocument", () => {
  it("creates one chunk per section with stable ids and anchors", () => {
    const chunks = chunkDocument(doc("Intro text.\n\n## Who it applies to\n\nAdults.\n\n## How often\n\nEvery year."));
    expect(chunks.map((c) => c.id)).toEqual([
      "test-doc#overview-0",
      "test-doc#who-it-applies-to-0",
      "test-doc#how-often-0",
    ]);
    expect(chunks[1].text).toBe("Test guideline — Who it applies to\nAdults.");
  });

  it("splits long sections on paragraph and list boundaries", () => {
    const items = Array.from({ length: 12 }, (_, i) => `- Item ${i} ${"x".repeat(80)}`).join("\n");
    const chunks = chunkDocument(doc(`## Options\n\n${items}`), { maxChars: 300 });
    expect(chunks.length).toBeGreaterThan(3);
    for (const chunk of chunks) {
      expect(chunk.heading).toBe("Options");
      expect(
        chunk.text
          .split("\n")
          .slice(1)
          .every((line) => line.startsWith("- Item")),
      ).toBe(true);
    }
    expect(new Set(chunks.map((c) => c.id)).size).toBe(chunks.length);
  });

  it("skips empty sections", () => {
    expect(chunkDocument(doc("## Empty\n\n## Filled\n\nText."))).toHaveLength(1);
  });
});

describe("slugify", () => {
  it("makes URL-safe anchors", () => {
    expect(slugify("Tetanus, diphtheria and pertussis")).toBe("tetanus-diphtheria-and-pertussis");
  });
});

describe("corpus", () => {
  it("rejects documents with invalid frontmatter", () => {
    expect(() => parseGuideline("bad", "---\ntitle: X\n---\nBody")).toThrow(/Invalid frontmatter in bad.md/);
  });

  it("loads every guideline with valid metadata and chunks them", async () => {
    const docs = await loadGuidelines();
    expect(docs.length).toBeGreaterThanOrEqual(14);
    for (const d of docs) {
      const chunks = chunkDocument(d);
      expect(chunks.length).toBeGreaterThan(1);
      expect(chunks.every((c) => c.text.length <= 900 + d.title.length + 40)).toBe(true);
    }
  });
});
