/**
 * Captures README screenshots (dark mode) from a running app.
 * Usage: start the app, then `BASE_URL=http://localhost:3000 npm run screenshots`.
 */
import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = "docs/screenshots";

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "dark" });
  const page = await context.newPage();

  await page.goto(BASE);
  await page.screenshot({ path: `${OUT}/home.png`, fullPage: true });

  await page.goto(`${BASE}/ask?q=${encodeURIComponent("When should I start colorectal cancer screening?")}`);
  await page
    .getByRole("region", { name: /Sources/ })
    .getByRole("listitem")
    .first()
    .waitFor();
  await page.screenshot({ path: `${OUT}/ask.png`, fullPage: true });

  await page.goto(`${BASE}/guidelines`);
  await page.screenshot({ path: `${OUT}/library.png`, fullPage: true });

  await page.goto(`${BASE}/guidelines/lung-cancer-screening#who-it-applies-to`);
  await page.screenshot({ path: `${OUT}/guideline.png` });

  await page.goto(`${BASE}/about`);
  await page.screenshot({ path: `${OUT}/how-it-works.png`, fullPage: true });

  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    colorScheme: "dark",
  });
  const phone = await mobile.newPage();
  await phone.goto(`${BASE}/ask?q=${encodeURIComponent("Is Tdap recommended during pregnancy?")}`);
  await phone
    .getByRole("region", { name: /Sources/ })
    .getByRole("listitem")
    .first()
    .waitFor();
  await phone.screenshot({ path: `${OUT}/ask-mobile.png` });

  await browser.close();
  console.log("Screenshots saved to", OUT);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
