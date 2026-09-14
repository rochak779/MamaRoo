import { updatePregnancyInfo } from "@/app/actions/settings";
import { PregnancyInfoForm } from "@/app/(app)/me/pregnancy/PregnancyInfoForm";
import { todayInAppZone } from "@/lib/domain/dates";
import { createServerSupabase } from "@/lib/supabase/server";
import type { DueDateMethod, PregnancyFlag, TwinType } from "@/lib/domain/onboarding";

export default async function PregnancyInfoPage() {
  const supabase = await createServerSupabase();
  const [{ data: profile }, { data: pregnancy }] = await Promise.all([
    supabase
      .from("profiles")
      .select("doctor_name,clinic_name,is_first_pregnancy,pre_pregnancy_weight_kg")
      .maybeSingle(),
    supabase
      .from("pregnancies")
      .select("edd,edd_source,pregnancy_flags,twin_type,baby_name")
      .eq("status", "active")
      .maybeSingle(),
  ]);

  return (
    <PregnancyInfoForm
      initial={{
        dueDate: pregnancy?.edd ?? "",
        dueDateSource: (pregnancy?.edd_source ?? "manual") as DueDateMethod,
        pregnancyFlags: (pregnancy?.pregnancy_flags ?? []) as PregnancyFlag[],
        twinType: (pregnancy?.twin_type ?? null) as TwinType | null,
        babyNames: pregnancy?.baby_name ?? [],
        isFirstPregnancy: profile?.is_first_pregnancy ?? null,
        prePregnancyWeightKg: profile?.pre_pregnancy_weight_kg ?? null,
        doctorName: profile?.doctor_name ?? null,
        clinicName: profile?.clinic_name ?? null,
      }}
      today={todayInAppZone()}
      onSave={updatePregnancyInfo}
    />
  );
}
