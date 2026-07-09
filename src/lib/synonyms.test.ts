import { describe, expect, it } from "vitest";

import { expandQuery } from "./synonyms";

describe("expandQuery", () => {
  it("adds guideline vocabulary for patient-language terms", () => {
    expect(expandQuery("How often do I need a mammogram?")).toBe("How often do I need a mammogram? mammography breast");
    expect(expandQuery("When should I get the shingles shot")).toBe(
      "When should I get the shingles shot zoster vaccine",
    );
  });

  it("leaves queries without known terms unchanged", () => {
    expect(expandQuery("lung cancer screening age")).toBe("lung cancer screening age");
  });
});
