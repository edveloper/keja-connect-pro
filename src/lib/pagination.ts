// src/lib/pagination.ts
//
// Progressive "show more" rendering for long lists.
//
// Every list in the app used to render in full: a landlord with 120 units got
// 120 cards on first paint. This caps what is drawn without hiding anything —
// filtering still runs over the whole set, so search finds a tenant on page
// five, and the browser's own find-in-page keeps working on what is shown.

/** Rows drawn before the first "Show more". */
export const PAGE_SIZE = 25;

/** Payments and ledger months are denser, so they start smaller. */
export const COMPACT_PAGE_SIZE = 12;

export interface Page<T> {
  visible: T[];
  hasMore: boolean;
  /** How many rows are still hidden. */
  remaining: number;
  /** What `visibleCount` should become when "Show more" is pressed. */
  nextCount: number;
  total: number;
}

/**
 * Take the first `visibleCount` of `items`.
 *
 * A non-positive or missing count falls back to one page rather than rendering
 * nothing, so a bad caller degrades to "shows something" instead of a blank list.
 */
export function paginate<T>(
  items: readonly T[],
  visibleCount: number,
  pageSize: number = PAGE_SIZE
): Page<T> {
  const total = items.length;
  const step = pageSize > 0 ? pageSize : PAGE_SIZE;
  const count = visibleCount > 0 ? visibleCount : step;
  const capped = Math.min(count, total);

  return {
    visible: items.slice(0, capped),
    hasMore: total > capped,
    remaining: Math.max(0, total - capped),
    nextCount: Math.min(capped + step, total),
    total,
  };
}

/**
 * Label for the "show more" control.
 * Names the thing being revealed so the button reads on its own.
 */
export function showMoreLabel(
  remaining: number,
  noun: string,
  pluralNoun?: string
): string {
  const plural = pluralNoun ?? `${noun}s`;
  const step = Math.min(remaining, PAGE_SIZE);
  if (remaining <= step) {
    return `Show remaining ${remaining} ${remaining === 1 ? noun : plural}`;
  }
  return `Show ${step} more (${remaining} left)`;
}
