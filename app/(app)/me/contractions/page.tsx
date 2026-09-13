import { redirect } from "next/navigation";
import { ContractionTimer } from "@/app/(app)/me/contractions/ContractionTimer";
import { startContraction, startContractionSession, stopContraction } from "@/app/actions/contractions";
import { todayInAppZone } from "@/lib/domain/dates";
import { pregnancyProgress } from "@/lib/domain/pregnancy";
import { createServerSupabase } from "@/lib/supabase/server";

export default async function ContractionsPage() {
  const result = await startContractionSession();
  // Not authenticated is the only realistic failure here (RLS already scopes
  // everything else) -- send her back to sign in rather than render a
  // timer with no session behind it.
  if (!result.ok) redirect("/signin");

  const supabase = await createServerSupabase();
  const { data: pregnancy } = await supabase.from("pregnancies").select("edd").eq("status", "active").maybeSingle();
  const week = pregnancy ? pregnancyProgress({ edd: pregnancy.edd, today: todayInAppZone() }).week : 0;

  return (
    <ContractionTimer
      session={result.session}
      week={week}
      onStartContraction={startContraction}
      onStopContraction={stopContraction}
    />
  );
}
