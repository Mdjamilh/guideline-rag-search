import { defineConfig, devices } from "@playwright/test";

const PORT = 3300;
const MOCK_OLLAMA_PORT = 11555;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: [
    {
      command: "node e2e/mock-ollama.mjs",
      url: `http://localhost:${MOCK_OLLAMA_PORT}`,
      env: { MOCK_OLLAMA_PORT: String(MOCK_OLLAMA_PORT) },
      reuseExistingServer: !process.env.CI,
    },
    {
      command: `npm run start -- --port ${PORT}`,
      url: `http://localhost:${PORT}`,
      reuseExistingServer: !process.env.CI,
      // Fresh in-memory database, embedded through the mock Ollama on startup.
      env: {
        PGLITE_IN_MEMORY: "1",
        DATABASE_URL: "",
        OLLAMA_BASE_URL: `http://localhost:${MOCK_OLLAMA_PORT}`,
        ASK_RATE_LIMIT: "1000",
        // The mock's toy embeddings are less similar than real ones.
        VECTOR_MAX_DISTANCE: "0.9",
      },
      timeout: 120_000,
    },
  ],
});
