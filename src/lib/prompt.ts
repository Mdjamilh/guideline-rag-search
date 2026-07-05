export type PromptSource = { title: string; heading: string; text: string; organization: string; year: number };

export const SYSTEM_PROMPT = `You answer questions about preventive-care guidelines using ONLY the numbered sources provided.

Rules:
- Every factual sentence must end with a citation like [1] or [2][3] pointing to the sources that support it.
- If the sources don't contain the answer, say "The guidelines in this library don't cover that." and stop.
- Do not use outside knowledge, and do not give personal medical advice. Suggest discussing individual situations with a clinician.
- Be concise: 2 to 5 sentences, plain language, and mention ages, intervals and grades exactly as written in the sources.`;

/** Formats retrieved passages as numbered sources the model can cite. */
export function buildUserPrompt(question: string, sources: PromptSource[]): string {
  const formatted = sources
    .map((s, i) => `[${i + 1}] ${s.title} (${s.organization}, ${s.year}), section "${s.heading}":\n${s.text}`)
    .join("\n\n");
  return `Sources:\n\n${formatted}\n\nQuestion: ${question}`;
}
