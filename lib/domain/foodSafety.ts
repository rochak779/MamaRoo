import type { Locale } from "@/lib/config";

export type FoodSafetyStatus = "safe" | "moderation" | "avoid";

export interface FoodSafetyItem {
  id: string;
  locale: Locale;
  name: string;
  status: FoodSafetyStatus;
  short_text: string;
  long_text: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

/**
 * The lookup deliberately follows the designer interaction exactly: trim the
 * query, lowercase it, and substring-match only against the displayed name.
 * Aliases and fuzzy matching would make a medical result feel more certain
 * than this small reviewed catalog can support.
 */
export function matchFoodSafetyItems({
  items,
  query,
}: {
  items: FoodSafetyItem[];
  query: string;
}): FoodSafetyItem[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return [];
  return items.filter((item) => item.name.toLowerCase().includes(trimmed));
}
