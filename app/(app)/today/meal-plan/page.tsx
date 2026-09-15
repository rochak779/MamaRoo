import { MealPlanScreen } from "@/app/(app)/today/meal-plan/MealPlanScreen";
import { todayInAppZone } from "@/lib/domain/dates";
import { pregnancyProgress } from "@/lib/domain/pregnancy";
import { weekdayFromDate } from "@/lib/domain/weeklyMealPlan";
import { createServerSupabase } from "@/lib/supabase/server";

export default async function MealPlanPage() {
  const supabase = await createServerSupabase();
  const { data: pregnancy, error } = await supabase
    .from("pregnancies")
    .select("edd")
    .eq("status", "active")
    .maybeSingle();

  if (error) throw error;

  const today = todayInAppZone();
  const trimester = pregnancy ? pregnancyProgress({ edd: pregnancy.edd, today }).trimester : 1;

  return <MealPlanScreen trimester={trimester} day={weekdayFromDate(today)} />;
}
