import { signOut } from "@/app/actions/auth";
import { MeHub } from "@/app/(app)/me/MeHub";
import { todayInAppZone } from "@/lib/domain/dates";
import { pregnancyProgress } from "@/lib/domain/pregnancy";
import { createServerSupabase } from "@/lib/supabase/server";

export default async function MePage() {
  const supabase = await createServerSupabase();
  const [{ data: profile }, { data: pregnancy }] = await Promise.all([
    supabase.from("profiles").select("display_name").maybeSingle(),
    supabase.from("pregnancies").select("edd").eq("status", "active").maybeSingle(),
  ]);
  const week = pregnancy
    ? pregnancyProgress({ edd: pregnancy.edd, today: todayInAppZone() }).week
    : 0;

  return <MeHub displayName={profile?.display_name ?? ""} week={week} onSignOut={signOut} />;
}
