export type Ranked = { id: string };

export type Fused<T extends Ranked> = T & {
  score: number;
  /** Which retrievers returned this item, e.g. ["keyword", "vector"]. */
  matchedBy: string[];
};

/**
 * Reciprocal Rank Fusion (Cormack et al., 2009): score = Σ 1 / (k + rank).
 * Robust to retrievers whose raw scores aren't comparable (ts_rank vs cosine),
 * because only rank positions are used. k = 60 is the paper's default.
 */
export function reciprocalRankFusion<T extends Ranked>(lists: Record<string, T[]>, { k = 60 } = {}): Fused<T>[] {
  const fused = new Map<string, Fused<T>>();

  for (const [name, items] of Object.entries(lists)) {
    items.forEach((item, index) => {
      const contribution = 1 / (k + index + 1);
      const existing = fused.get(item.id);
      if (existing) {
        existing.score += contribution;
        existing.matchedBy.push(name);
      } else {
        fused.set(item.id, { ...item, score: contribution, matchedBy: [name] });
      }
    });
  }

  return [...fused.values()].sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
}
