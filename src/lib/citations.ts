export type AnswerSegment = { type: "text"; text: string } | { type: "citation"; index: number };

const CITATION = /\[(\d{1,2})\]/g;

/**
 * Splits an answer into text and citation segments, dropping citations that
 * point at sources that don't exist, since models occasionally invent "[7]"
 * when given five sources.
 */
export function parseAnswer(answer: string, sourceCount: number): AnswerSegment[] {
  const segments: AnswerSegment[] = [];
  let cursor = 0;
  for (const match of answer.matchAll(CITATION)) {
    const index = Number(match[1]);
    const start = match.index!;
    if (start > cursor) segments.push({ type: "text", text: answer.slice(cursor, start) });
    if (index >= 1 && index <= sourceCount) segments.push({ type: "citation", index });
    cursor = start + match[0].length;
  }
  if (cursor < answer.length) segments.push({ type: "text", text: answer.slice(cursor) });
  return segments;
}

/** Distinct, valid source numbers cited in the answer, in order of first use. */
export function citedSources(answer: string, sourceCount: number): number[] {
  const seen = new Set<number>();
  for (const segment of parseAnswer(answer, sourceCount)) {
    if (segment.type === "citation") seen.add(segment.index);
  }
  return [...seen];
}

/** Splits `[[highlighted]]` markers from ts_headline into plain and marked parts. */
export function splitHighlights(text: string): { text: string; marked: boolean }[] {
  return text
    .split(/(\[\[.*?\]\])/)
    .filter(Boolean)
    .map((part) =>
      part.startsWith("[[") && part.endsWith("]]")
        ? { text: part.slice(2, -2), marked: true }
        : { text: part, marked: false },
    );
}
