import type { SupabaseClient } from "@supabase/supabase-js";
import type { Locale } from "@/lib/config";
import type { ChecklistItem } from "@/lib/domain/checklist";
import type { Database } from "@/lib/supabase/database.types";

export async function listChecklistItems({
  supabase,
  locale,
}: {
  supabase: SupabaseClient<Database>;
  locale: Locale;
}): Promise<ChecklistItem[]> {
  const { data, error } = await supabase
    .from("checklist_items")
    .select("item_key, category, label, sort_order, is_active")
    .eq("locale", locale)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.item_key,
    category: row.category,
    label: row.label,
    sortOrder: row.sort_order,
    isActive: row.is_active,
  }));
}
