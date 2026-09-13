import { resolveLocalisedContent } from "@/lib/domain/content";
import type { Locale } from "@/lib/config";

export interface LibrarySourceItem {
  id: string;
  slug: string;
  locale: Locale;
  createdAt: string;
}

export interface LibraryEntry<T> {
  item: T;
  isFallback: boolean;
}

/**
 * A Guide topic list (or trimester-window list) is queried across both the
 * requested locale and English, so a slug published only in English is never
 * silently dropped for a Hindi reader -- same rule content_items' single-item
 * fetch already enforces (`resolveLocalisedContent`), applied here per-slug
 * across a whole list instead of one row.
 */
export function resolveLibraryList<T extends LibrarySourceItem>({
  items,
  locale,
}: {
  items: readonly T[];
  locale: Locale;
}): LibraryEntry<T>[] {
  const bySlug = new Map<string, T[]>();
  for (const it of items) {
    const group = bySlug.get(it.slug);
    if (group) group.push(it);
    else bySlug.set(it.slug, [it]);
  }

  const resolved: LibraryEntry<T>[] = [];
  for (const group of bySlug.values()) {
    const result = resolveLocalisedContent({ items: group, locale });
    if (result) resolved.push(result);
  }

  return resolved.sort(
    (a, b) => new Date(a.item.createdAt).getTime() - new Date(b.item.createdAt).getTime(),
  );
}
