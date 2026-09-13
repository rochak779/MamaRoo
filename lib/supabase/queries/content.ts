import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveLocalisedContent } from "@/lib/domain/content";
import { DEFAULT_LOCALE, type Locale } from "@/lib/config";
import type { Database } from "@/lib/supabase/database.types";

export type ContentItemRow = Database["public"]["Tables"]["content_items"]["Row"];
export type ContentCategory = NonNullable<ContentItemRow["category"]>;

/**
 * Both list queries below fetch the requested locale *and* English in one
 * round trip, rather than one locale at a time -- `resolveLibraryList`
 * (lib/domain/library.ts) then resolves each slug's fallback locally. This
 * mirrors `getContentItem`'s single-item fallback rule at list scope, so a
 * Guide topic list never silently hides an English-only item from a Hindi
 * reader.
 */
function localesToFetch(locale: Locale): Locale[] {
  return locale === DEFAULT_LOCALE ? [DEFAULT_LOCALE] : [locale, DEFAULT_LOCALE];
}

export async function getContentItem({
  supabase,
  slug,
  locale,
}: {
  supabase: SupabaseClient<Database>;
  slug: string;
  locale: Locale;
}): Promise<{ item: ContentItemRow; isFallback: boolean } | null> {
  const { data, error } = await supabase
    .from("content_items")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true);
  if (error) throw error;
  if (!data || data.length === 0) return null;
  return resolveLocalisedContent({
    items: data as Array<ContentItemRow & { locale: Locale }>,
    locale,
  });
}

export async function listContentByCategory({
  supabase,
  category,
  locale,
}: {
  supabase: SupabaseClient<Database>;
  category: ContentCategory;
  locale: Locale;
}): Promise<ContentItemRow[]> {
  const { data, error } = await supabase
    .from("content_items")
    .select("*")
    .eq("is_published", true)
    .eq("category", category)
    .in("locale", localesToFetch(locale));
  if (error) throw error;
  return data ?? [];
}

/**
 * Overlap check, generalised from `getTodayData`'s single-week version: an
 * item's range overlaps [weekMin, weekMax] when (week_min is null or
 * week_min <= weekMax) and (week_max is null or week_max >= weekMin). Used
 * for the three trimester-stage topic lists, which filter by a week window
 * rather than the `category` column.
 */
export async function listContentByWeekRange({
  supabase,
  weekMin,
  weekMax,
  locale,
}: {
  supabase: SupabaseClient<Database>;
  weekMin: number;
  weekMax: number;
  locale: Locale;
}): Promise<ContentItemRow[]> {
  const { data, error } = await supabase
    .from("content_items")
    .select("*")
    .eq("is_published", true)
    .in("locale", localesToFetch(locale))
    .or(`week_min.is.null,week_min.lte.${weekMax}`)
    .or(`week_max.is.null,week_max.gte.${weekMin}`);
  if (error) throw error;
  return data ?? [];
}
