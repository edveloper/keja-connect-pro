import { describe, expect, it } from "vitest";
import { PAGE_SIZE, paginate, showMoreLabel } from "./pagination";

const rows = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

describe("paginate", () => {
  it("caps a long list at the visible count", () => {
    const p = paginate(rows(120), 25);
    expect(p.visible).toHaveLength(25);
    expect(p.hasMore).toBe(true);
    expect(p.remaining).toBe(95);
    expect(p.total).toBe(120);
  });

  it("leaves a short list alone", () => {
    const p = paginate(rows(8), 25);
    expect(p.visible).toHaveLength(8);
    expect(p.hasMore).toBe(false);
    expect(p.remaining).toBe(0);
  });

  it("handles an exact page boundary without offering more", () => {
    const p = paginate(rows(25), 25);
    expect(p.visible).toHaveLength(25);
    expect(p.hasMore).toBe(false);
    expect(p.remaining).toBe(0);
  });

  it("advances by one page and never past the end", () => {
    const first = paginate(rows(60), 25);
    expect(first.nextCount).toBe(50);

    const second = paginate(rows(60), first.nextCount);
    expect(second.visible).toHaveLength(50);
    expect(second.nextCount).toBe(60);

    const third = paginate(rows(60), second.nextCount);
    expect(third.visible).toHaveLength(60);
    expect(third.hasMore).toBe(false);
    expect(third.nextCount).toBe(60);
  });

  it("copes with an empty list", () => {
    const p = paginate([], 25);
    expect(p.visible).toEqual([]);
    expect(p.hasMore).toBe(false);
    expect(p.total).toBe(0);
    expect(p.nextCount).toBe(0);
  });

  it("falls back to one page rather than rendering nothing", () => {
    expect(paginate(rows(50), 0).visible).toHaveLength(PAGE_SIZE);
    expect(paginate(rows(50), -5).visible).toHaveLength(PAGE_SIZE);
  });

  it("respects a custom page size", () => {
    const p = paginate(rows(50), 12, 12);
    expect(p.visible).toHaveLength(12);
    expect(p.nextCount).toBe(24);
  });

  it("never returns more rows than exist even when asked for more", () => {
    const p = paginate(rows(3), 100);
    expect(p.visible).toHaveLength(3);
    expect(p.hasMore).toBe(false);
    expect(p.remaining).toBe(0);
  });

  it("preserves order", () => {
    expect(paginate(rows(10), 3).visible).toEqual([1, 2, 3]);
  });
});

describe("showMoreLabel", () => {
  it("offers a full page when there is more than one left", () => {
    expect(showMoreLabel(95, "tenant")).toBe("Show 25 more (95 left)");
  });

  it("names the remainder when it fits in one page", () => {
    expect(showMoreLabel(7, "tenant")).toBe("Show remaining 7 tenants");
  });

  it("uses the singular for exactly one", () => {
    expect(showMoreLabel(1, "tenant")).toBe("Show remaining 1 tenant");
  });

  it("takes an irregular plural", () => {
    expect(showMoreLabel(3, "entry", "entries")).toBe("Show remaining 3 entries");
  });

  it("handles the exact page-size boundary", () => {
    expect(showMoreLabel(25, "unit")).toBe("Show remaining 25 units");
  });
});
