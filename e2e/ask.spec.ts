import { expect, test } from "@playwright/test";

test("asking a question streams a cited answer with hybrid sources", async ({ page }) => {
  await page.goto("/ask");
  await page.getByRole("textbox", { name: "Your question" }).fill("How often do I need a mammogram?");
  await page.getByRole("button", { name: "Ask" }).click();

  await expect(page).toHaveURL(/\/ask\?q=How%20often/);
  await expect(page.getByText("Hybrid search")).toBeVisible();
  await expect(page.getByText("Local LLM")).toBeVisible();

  const answer = page.getByRole("region", { name: "Answer" });
  await expect(answer).toContainText("this is covered in the first source");
  // The model's invented [9] citation must not be rendered.
  await expect(answer.getByRole("link", { name: "Source 1" })).toBeVisible();
  await expect(answer.getByRole("link", { name: "Source 9" })).toHaveCount(0);
  await expect(answer).toContainText("Not medical advice");

  // Ranking quality is covered by the retrieval eval; here we only check the flow.
  const sources = page.getByRole("region", { name: /Sources/ });
  await expect(sources.getByRole("listitem").filter({ hasText: "Breast cancer screening" }).first()).toBeVisible();

  await answer.getByRole("link", { name: "Source 1" }).click();
  await expect(page).toHaveURL(/#source-1$/);
});

test("shared question links run the question on load", async ({ page }) => {
  await page.goto(`/ask?q=${encodeURIComponent("When should adults get the shingles vaccine?")}`);
  await expect(page.getByRole("textbox", { name: "Your question" })).toHaveValue(
    "When should adults get the shingles vaccine?",
  );
  await expect(
    page
      .getByRole("region", { name: /Sources/ })
      .getByRole("listitem")
      .first(),
  ).toContainText("Routine vaccines for adults");
});

test("Read in context opens the cited section of the guideline", async ({ page }) => {
  await page.goto(`/ask?q=${encodeURIComponent("Who should get lung cancer screening?")}`);
  const first = page
    .getByRole("region", { name: /Sources/ })
    .getByRole("listitem")
    .first();
  await first.getByRole("link", { name: "Read in context" }).click();

  await expect(page).toHaveURL(/\/guidelines\/lung-cancer-screening#/);
  await expect(page.getByRole("heading", { level: 1, name: "Lung cancer screening" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Read the official recommendation" })).toHaveAttribute(
    "href",
    /uspreventiveservicestaskforce\.org/,
  );
});

test("questions the library can't answer don't produce an answer", async ({ page }) => {
  await page.goto(`/ask?q=${encodeURIComponent("xylophone quasar")}`);
  await expect(page.getByText("don't seem to cover that")).toBeVisible();
  await expect(page.getByText("No matching passages.")).toBeVisible();
});

test("the library lists guidelines by topic and the home page links into it", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText(/14 guidelines · \d+ indexed passages/)).toBeVisible();
  await page.getByRole("link", { name: "Browse guidelines" }).click();

  await expect(page.getByRole("heading", { name: "Cancer screening" })).toBeVisible();
  await page.getByRole("link", { name: /Colorectal cancer screening/ }).click();
  await expect(page.getByRole("heading", { name: "Screening options and intervals" })).toBeVisible();
});

test("the how-it-works page shows index stats", async ({ page }) => {
  await page.goto("/about");
  await expect(page.getByRole("heading", { name: "How it works" })).toBeVisible();
  await expect(page.getByText("Answer model")).toBeVisible();
  await expect(page.getByText("Measured, not assumed")).toBeVisible();
});
