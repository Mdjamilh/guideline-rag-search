// Minimal stand-in for the Ollama API so e2e tests can exercise hybrid
// retrieval and streamed, cited answers without downloading a model.
import http from "node:http";

const PORT = Number(process.env.MOCK_OLLAMA_PORT ?? 11555);
const DIMENSIONS = 768;

function embed(text) {
  const vector = new Array(DIMENSIONS).fill(0);
  for (const word of text.toLowerCase().match(/[a-z]{4,}/g) ?? []) {
    let h = 0;
    for (const ch of word) h = (h * 31 + ch.charCodeAt(0)) % DIMENSIONS;
    vector[h] += 1;
  }
  if (!vector.some(Boolean)) vector[0] = 1;
  return vector;
}

http
  .createServer((req, res) => {
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", async () => {
      const body = raw ? JSON.parse(raw) : {};
      if (req.url === "/api/embed") {
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ embeddings: body.input.map(embed) }));
        return;
      }
      if (req.url === "/api/chat") {
        res.setHeader("Content-Type", "application/x-ndjson");
        const parts = [
          "According to the guideline, ",
          "this is covered in the first source [1]",
          " and a made-up one [9].",
        ];
        for (const content of parts) {
          res.write(JSON.stringify({ message: { role: "assistant", content }, done: false }) + "\n");
          await new Promise((r) => setTimeout(r, 30));
        }
        res.end(JSON.stringify({ done: true }) + "\n");
        return;
      }
      res.statusCode = req.url === "/" ? 200 : 404;
      res.end("mock ollama");
    });
  })
  .listen(PORT, () => console.log(`mock ollama on ${PORT}`));
