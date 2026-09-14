import { describe, expect, it } from "vitest";
import { CHECKLIST_CATEGORY_ORDER, checklistProgress, type ChecklistItem } from "@/lib/domain/checklist";

function item(overrides: Partial<ChecklistItem> & Pick<ChecklistItem, "id" | "category">): ChecklistItem {
  return {
    label: overrides.id,
    sortOrder: 0,
    isActive: true,
    ...overrides,
  };
}

describe("checklistProgress", () => {
  it("groups items by category in the fixed category order, regardless of input order", () => {
    const items = [
      item({ id: "docs-1", category: "docs" }),
      item({ id: "me-1", category: "me" }),
      item({ id: "baby-1", category: "baby" }),
    ];

    const result = checklistProgress({ items, progress: [] });

    expect(result.byCategory.map((c) => c.category)).toEqual([...CHECKLIST_CATEGORY_ORDER]);
  });

  it("sorts items by sort_order within a category", () => {
    const items = [
      item({ id: "me-b", category: "me", sortOrder: 20 }),
      item({ id: "me-a", category: "me", sortOrder: 10 }),
    ];

    const result = checklistProgress({ items, progress: [] });

    const me = result.byCategory.find((c) => c.category === "me")!;
    expect(me.items.map((i) => i.id)).toEqual(["me-a", "me-b"]);
  });

  it("counts done from progress rows", () => {
    const items = [item({ id: "me-a", category: "me" }), item({ id: "me-b", category: "me" })];
    const progress = [{ itemId: "me-a", done: true }];

    const result = checklistProgress({ items, progress });

    const me = result.byCategory.find((c) => c.category === "me")!;
    expect(me.items.find((i) => i.id === "me-a")!.done).toBe(true);
    expect(me.items.find((i) => i.id === "me-b")!.done).toBe(false);
    expect(result.overall.done).toBe(1);
  });

  it("ignores a progress row for an item that no longer exists", () => {
    const items = [item({ id: "me-a", category: "me" })];
    const progress = [
      { itemId: "me-a", done: true },
      { itemId: "long-gone", done: true },
    ];

    const result = checklistProgress({ items, progress });

    expect(result.overall.done).toBe(1);
    expect(result.overall.total).toBe(1);
  });

  it("computes the overall fraction as done / total", () => {
    const items = [
      item({ id: "me-a", category: "me" }),
      item({ id: "me-b", category: "me" }),
      item({ id: "me-c", category: "me" }),
      item({ id: "me-d", category: "me" }),
    ];
    const progress = [
      { itemId: "me-a", done: true },
      { itemId: "me-b", done: true },
    ];

    const result = checklistProgress({ items, progress });

    expect(result.overall).toEqual({ done: 2, total: 4, fraction: 0.5 });
  });

  it("returns a zero fraction rather than NaN for an empty item list", () => {
    const result = checklistProgress({ items: [], progress: [] });

    expect(result.overall).toEqual({ done: 0, total: 0, fraction: 0 });
    expect(result.byCategory.every((c) => c.items.length === 0)).toBe(true);
  });

  it("returns a fraction of exactly 1 when every item is done", () => {
    const items = [item({ id: "me-a", category: "me" }), item({ id: "baby-a", category: "baby" })];
    const progress = [
      { itemId: "me-a", done: true },
      { itemId: "baby-a", done: true },
    ];

    const result = checklistProgress({ items, progress });

    expect(result.overall.fraction).toBe(1);
  });

  it("excludes inactive items from both the category lists and the overall total", () => {
    const items = [
      item({ id: "me-a", category: "me", isActive: true }),
      item({ id: "me-b", category: "me", isActive: false }),
    ];
    const progress = [{ itemId: "me-b", done: true }];

    const result = checklistProgress({ items, progress });

    const me = result.byCategory.find((c) => c.category === "me")!;
    expect(me.items.map((i) => i.id)).toEqual(["me-a"]);
    expect(result.overall.total).toBe(1);
    expect(result.overall.done).toBe(0);
  });
});
