import { FoodSafetyLookup } from "@/app/(app)/guide/food-safety/FoodSafetyLookup";
import { getLocale } from "@/i18n/locale";
import { listFoodSafetyItems } from "@/lib/supabase/queries/foodSafety";
import { createServerSupabase } from "@/lib/supabase/server";

export default async function FoodSafetyPage() {
  const locale = await getLocale();
  const supabase = await createServerSupabase();
  const items = await listFoodSafetyItems({ supabase, locale });
  return <FoodSafetyLookup items={items} />;
}
