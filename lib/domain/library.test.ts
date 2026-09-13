import { describe, expect, it } from "vitest";
import { resolveLibraryList, type LibrarySourceItem } from "@/lib/domain/library";

function item(overrides: Partial<LibrarySourceItem> = {}): LibrarySourceItem {
  return {
    id: overrides.id ?? "id-1",
    slug: overrides.slug ?? "first-checkup",
    locale: overrides.locale ?? "en",
    createdAt: overrides.createdAt ?? "2026-01-01T00:00:00Z",
  };
}

describe("resolveLibraryList", () => {
  it("resolves each slug to its requested-locale row when both locales exist", () => {
    const en = item({ id: "en-1", slug: "a", locale: "en" });
    const hi = item({ id: "hi-1", slug: "a", locale: "hi" });
    const result = resolveLibraryList({ items: [en, hi], locale: "hi" });
    expect(result).toEqual([{ item: hi, isFallback: false }]);
  });

  it("falls back to English per-slug and flags it, rather than hiding the item", () => {
    const englishOnly = item({ id: "en-1", slug: "a", locale: "en" });
    const bothLocales = item({ id: "en-2", slug: "b", locale: "en" });
    const bothLocalesHi = item({ id: "hi-2", slug: "b", locale: "hi" });
    const result = resolveLibraryList({
      items: [englishOnly, bothLocales, bothLocalesHi],
      locale: "hi",
    });
    expect(result).toContainEqual({ item: englishOnly, isFallback: true });
    expect(result).toContainEqual({ item: bothLocalesHi, isFallback: false });
    expect(result).toHaveLength(2);
  });

  it("never invents a Hindi-only item for an English reader", () => {
    const hindiOnly = item({ id: "hi-1", slug: "a", locale: "hi" });
    expect(resolveLibraryList({ items: [hindiOnly], locale: "en" })).toEqual([]);
  });

  it("collapses duplicate slugs across locales into one entry, not two", () => {
    const en = item({ id: "en-1", slug: "a", locale: "en" });
    const hi = item({ id: "hi-1", slug: "a", locale: "hi" });
    expect(resolveLibraryList({ items: [en, hi], locale: "en" })).toHaveLength(1);
  });

  it("orders entries oldest-first by creation time", () => {
    const older = item({ id: "1", slug: "a", createdAt: "2026-01-01T00:00:00Z" });
    const newer = item({ id: "2", slug: "b", createdAt: "2026-02-01T00:00:00Z" });
    const result = resolveLibraryList({ items: [newer, older], locale: "en" });
    expect(result.map((r) => r.item.id)).toEqual(["1", "2"]);
  });

  it("returns an empty list for no items", () => {
    expect(resolveLibraryList({ items: [], locale: "en" })).toEqual([]);
  });
});
