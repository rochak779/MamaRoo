import type { SupabaseClient } from "@supabase/supabase-js";
import type { Locale } from "@/lib/config";
import type { FoodSafetyItem } from "@/lib/domain/foodSafety";
import type { Database } from "@/lib/supabase/database.types";

export async function listFoodSafetyItems({
  supabase,
  locale,
}: {
  supabase: SupabaseClient<Database>;
  locale: Locale;
}): Promise<FoodSafetyItem[]> {
  const { data, error } = await supabase
    .from("food_safety_items")
    .select("*")
    .eq("locale", locale)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return (data ?? []) as FoodSafetyItem[];
}
