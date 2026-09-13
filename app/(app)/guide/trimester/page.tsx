import { TrimesterOverview } from "@/app/(app)/guide/trimester/TrimesterOverview";
import { todayInAppZone } from "@/lib/domain/dates";
import { pregnancyProgress } from "@/lib/domain/pregnancy";
import { createServerSupabase } from "@/lib/supabase/server";

/** Same split as Today's and Care Questions' page.tsx: the badge needs the
 * current trimester, which comes from the active pregnancy's edd. */
async function currentTrimester(today: string): Promise<1 | 2 | 3> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.from("pregnancies").select("edd").eq("status", "active").maybeSingle();
  if (error) throw error;
  return data ? pregnancyProgress({ edd: data.edd, today }).trimester : 1;
}

export default async function TrimesterOverviewPage() {
  const today = todayInAppZone();
  const trimester = await currentTrimester(today);
  return <TrimesterOverview currentTrimester={trimester} />;
}
