import { updatePersonalInfo, updateProfileLocale } from "@/app/actions/settings";
import { PersonalInfoForm } from "@/app/(app)/me/personal/PersonalInfoForm";
import { getLocale } from "@/i18n/locale";
import { todayInAppZone } from "@/lib/domain/dates";
import { createServerSupabase } from "@/lib/supabase/server";

export default async function PersonalInfoPage() {
  const supabase = await createServerSupabase();
  const [{ data: profile }, locale] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name,birth_year,city,height_cm,mobile_number")
      .maybeSingle(),
    getLocale(),
  ]);

  return (
    <PersonalInfoForm
      initial={{
        displayName: profile?.display_name ?? "",
        birthYear: profile?.birth_year ?? null,
        city: profile?.city ?? null,
        heightCm: profile?.height_cm ?? null,
        mobileNumber: profile?.mobile_number ?? null,
        locale,
      }}
      today={todayInAppZone()}
      onSave={updatePersonalInfo}
      onLocaleChange={updateProfileLocale}
    />
  );
}
