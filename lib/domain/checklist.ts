export interface ChecklistItem {
  id: string;
  category: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
}

export interface ChecklistProgressRow {
  itemId: string;
  done: boolean;
}

export interface ChecklistCategoryProgress {
  category: string;
  items: (ChecklistItem & { done: boolean })[];
}

export interface ChecklistProgressResult {
  byCategory: ChecklistCategoryProgress[];
  overall: { done: number; total: number; fraction: number };
}

// Fixed presentation order, independent of how items are stored or fetched --
// matches the three groups in the designer mockup (For me / For baby / Documents).
export const CHECKLIST_CATEGORY_ORDER = ["me", "baby", "docs"] as const;

/**
 * Pure projection of the checklist catalogue plus her per-item progress into
 * what the Prep screen and its ProgressRing show. A progress row referencing
 * an item that isn't in `items` (removed from the catalogue, or filtered out
 * as inactive) is silently ignored rather than counted -- the catalogue,
 * filtered to active items, is always the source of truth for the total.
 */
export function checklistProgress({
  items,
  progress,
}: {
  items: ChecklistItem[];
  progress: ChecklistProgressRow[];
}): ChecklistProgressResult {
  const active = items.filter((i) => i.isActive);
  const doneIds = new Set(progress.filter((p) => p.done).map((p) => p.itemId));

  const byCategory = CHECKLIST_CATEGORY_ORDER.map((category) => ({
    category,
    items: active
      .filter((i) => i.category === category)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((i) => ({ ...i, done: doneIds.has(i.id) })),
  }));

  const total = active.length;
  const done = active.filter((i) => doneIds.has(i.id)).length;
  const fraction = total === 0 ? 0 : done / total;

  return { byCategory, overall: { done, total, fraction } };
}
