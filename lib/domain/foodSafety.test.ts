import { describe, expect, it } from "vitest";
import { matchFoodSafetyItems, type FoodSafetyItem } from "@/lib/domain/foodSafety";

const items: FoodSafetyItem[] = [
  {
    id: "10000000-0000-4000-8000-000000000001",
    locale: "en",
    name: "Papaya (ripe)",
    status: "safe",
    short_text: "Ripe papaya is fine in normal amounts.",
    long_text: "Long ripe-papaya guidance.",
    sort_order: 1,
    is_active: true,
    created_at: "2026-09-13T00:00:00Z",
  },
  {
    id: "10000000-0000-4000-8000-000000000002",
    locale: "en",
    name: "Papaya (raw or unripe)",
    status: "avoid",
    short_text: "Better to avoid raw or unripe papaya during pregnancy.",
    long_text: "Long raw-papaya guidance.",
    sort_order: 2,
    is_active: true,
    created_at: "2026-09-13T00:00:00Z",
  },
  {
    id: "10000000-0000-4000-8000-000000000003",
    locale: "en",
    name: "Paneer",
    status: "safe",
    short_text: "Paneer made at home or from pasteurised milk is safe.",
    long_text: "Long paneer guidance.",
    sort_order: 3,
    is_active: true,
    created_at: "2026-09-13T00:00:00Z",
  },
];

describe("matchFoodSafetyItems", () => {
  it("returns no results for an empty or whitespace-only query", () => {
    expect(matchFoodSafetyItems({ items, query: "" })).toEqual([]);
    expect(matchFoodSafetyItems({ items, query: "   " })).toEqual([]);
  });

  it("does a case-insensitive substring match against name only", () => {
    expect(matchFoodSafetyItems({ items, query: "  PAPAYA " })).toEqual(items.slice(0, 2));
    expect(matchFoodSafetyItems({ items, query: "nee" })).toEqual([items[2]]);
  });

  it("does not fuzzy-match or search the guidance text", () => {
    expect(matchFoodSafetyItems({ items, query: "papya" })).toEqual([]);
    expect(matchFoodSafetyItems({ items, query: "pasteurised" })).toEqual([]);
  });
});
