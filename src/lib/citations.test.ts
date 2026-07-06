import { describe, expect, it } from "vitest";

import { citedSources, parseAnswer, splitHighlights } from "./citations";
import { buildUserPrompt } from "./prompt";

describe("parseAnswer", () => {
  it("splits text and citations", () => {
    expect(parseAnswer("Start at 45 [1]. Repeat yearly [2][1].", 2)).toEqual([
      { type: "text", text: "Start at 45 " },
      { type: "citation", index: 1 },
      { type: "text", text: ". Repeat yearly " },
      { type: "citation", index: 2 },
      { type: "citation", index: 1 },
      { type: "text", text: "." },
    ]);
  });

  it("drops citations to sources that don't exist", () => {
    const segments = parseAnswer("Claim [7] and [0].", 3);
    expect(segments.filter((s) => s.type === "citation")).toEqual([]);
    expect(segments.map((s) => (s.type === "text" ? s.text : "")).join("")).toBe("Claim  and .");
  });

  it("handles answers with no citations or a citation at the start", () => {
    expect(parseAnswer("No citations here.", 2)).toEqual([{ type: "text", text: "No citations here." }]);
    expect(parseAnswer("[1] leads.", 1)[0]).toEqual({ type: "citation", index: 1 });
  });
});

describe("citedSources", () => {
  it("lists distinct valid sources in order of first use", () => {
    expect(citedSources("a [2] b [1] c [2] d [9]", 3)).toEqual([2, 1]);
  });
});

describe("splitHighlights", () => {
  it("separates ts_headline markers", () => {
    expect(splitHighlights("Screen for [[colorectal]] [[cancer]] now")).toEqual([
      { text: "Screen for ", marked: false },
      { text: "colorectal", marked: true },
      { text: " ", marked: false },
      { text: "cancer", marked: true },
      { text: " now", marked: false },
    ]);
  });
});

describe("buildUserPrompt", () => {
  it("numbers sources so the model can cite them", () => {
    const prompt = buildUserPrompt("When?", [
      { title: "A", heading: "Who", text: "Adults.", organization: "USPSTF", year: 2021 },
      { title: "B", heading: "How", text: "Yearly.", organization: "CDC", year: 2024 },
    ]);
    expect(prompt).toContain('[1] A (USPSTF, 2021), section "Who":\nAdults.');
    expect(prompt).toContain('[2] B (CDC, 2024), section "How":\nYearly.');
    expect(prompt.endsWith("Question: When?")).toBe(true);
  });
});
