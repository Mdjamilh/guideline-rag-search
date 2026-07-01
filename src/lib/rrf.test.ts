import { describe, expect, it } from "vitest";

import { reciprocalRankFusion } from "./rrf";

const ids = (...values: string[]) => values.map((id) => ({ id }));

describe("reciprocalRankFusion", () => {
  it("rewards items that several retrievers agree on", () => {
    const fused = reciprocalRankFusion({
      keyword: ids("a", "b", "c"),
      vector: ids("c", "a", "d"),
    });
    expect(fused.map((f) => f.id)).toEqual(["a", "c", "b", "d"]);
    expect(fused[0].matchedBy).toEqual(["keyword", "vector"]);
    expect(fused[2].matchedBy).toEqual(["keyword"]);
  });

  it("computes 1/(k+rank) scores", () => {
    const [top] = reciprocalRankFusion({ only: ids("x") }, { k: 60 });
    expect(top.score).toBeCloseTo(1 / 61);
  });

  it("works with a single retriever and keeps its order", () => {
    expect(reciprocalRankFusion({ keyword: ids("q", "r", "s") }).map((f) => f.id)).toEqual(["q", "r", "s"]);
  });

  it("returns nothing for empty inputs and breaks ties deterministically", () => {
    expect(reciprocalRankFusion({ keyword: [], vector: [] })).toEqual([]);
    expect(reciprocalRankFusion({ a: ids("z"), b: ids("y") }).map((f) => f.id)).toEqual(["y", "z"]);
  });
});
