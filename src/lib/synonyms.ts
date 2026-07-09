/**
 * Patient-language → guideline-language expansions for keyword search.
 * Stemming can't connect "mammogram" to "mammography" or "shingles" to
 * "zoster"; vector search can, but keyword-only mode needs a little help.
 */
const SYNONYMS: [RegExp, string][] = [
  [/\bmammograms?\b/i, "mammography breast"],
  [/\bpap( smears?| tests?)?\b/i, "cervical cytology"],
  [/\bshingles\b/i, "zoster"],
  [/\bflu\b/i, "influenza"],
  [/\bcolonoscop(y|ies)\b/i, "colorectal"],
  [/\b(blood sugar|sugar)\b/i, "diabetes glucose"],
  [/\bhigh blood pressure\b/i, "hypertension"],
  [/\bheart attacks?\b/i, "cardiovascular"],
  [/\bcholesterol\b/i, "statin LDL"],
  [/\bbone (density|scan)\b/i, "osteoporosis DXA"],
  [/\b(quit|stop) smoking\b/i, "cessation tobacco"],
  [/\b(drinking|drinks?|alcohol)\b/i, "alcohol"],
  [/\bwhooping cough\b/i, "pertussis Tdap"],
  [/\bpneumonia (shot|vaccine)s?\b/i, "pneumococcal"],
  [/\bshots?\b/i, "vaccine"],
];

/** Appends guideline vocabulary for any patient-language terms found in the query. */
export function expandQuery(query: string): string {
  const additions = SYNONYMS.filter(([pattern]) => pattern.test(query)).map(([, terms]) => terms);
  return additions.length > 0 ? `${query} ${additions.join(" ")}` : query;
}
