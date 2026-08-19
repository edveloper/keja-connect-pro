import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { PAGE_SIZE, paginate, showMoreLabel, type Page } from "@/lib/pagination";

/**
 * Progressive rendering for a list.
 *
 * `resetKey` should change whenever the underlying filter changes — a search
 * term, a selected month — so the list snaps back to the first page instead of
 * leaving the reader deep inside a result set they did not ask for.
 */
export function useProgressiveList<T>(
  items: readonly T[],
  options?: { pageSize?: number; resetKey?: string | number }
): Page<T> & { showMore: () => void } {
  const pageSize = options?.pageSize ?? PAGE_SIZE;
  const resetKey = options?.resetKey ?? "";
  const [visibleCount, setVisibleCount] = useState(pageSize);

  useEffect(() => {
    setVisibleCount(pageSize);
  }, [resetKey, pageSize]);

  const page = useMemo(
    () => paginate(items, visibleCount, pageSize),
    [items, visibleCount, pageSize]
  );

  return { ...page, showMore: () => setVisibleCount(page.nextCount) };
}

interface ShowMoreProps {
  remaining: number;
  /** Singular noun for the rows, e.g. "tenant". */
  noun: string;
  pluralNoun?: string;
  onClick: () => void;
  className?: string;
}

export function ShowMore({ remaining, noun, pluralNoun, onClick, className }: ShowMoreProps) {
  if (remaining <= 0) return null;

  return (
    <Button variant="outline" className={className ?? "w-full"} onClick={onClick}>
      <ChevronDown className="h-4 w-4 mr-2" aria-hidden="true" />
      {showMoreLabel(remaining, noun, pluralNoun)}
    </Button>
  );
}

export default ShowMore;
