"use server";

import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { todayInAppZone } from "@/lib/domain/dates";
import { validateOnboarding, type OnboardingInput } from "@/lib/domain/onboarding";

export type SaveOnboardingResult = { ok: true } | { ok: false; errors: Record<string, string> };

/**
 * Writes the collected onboarding value to profiles and pregnancies, then
 * reports success back to the client instead of redirecting itself -- the
 * wizard shows the personalized Journey Ready screen first, and only her tap
 * on "Go to my Today screen" navigates on from there.
 */
export async function saveOnboarding(input: OnboardingInput): Promise<SaveOnboardingResult> {
  const result = validateOnboarding({ ...input, today: todayInAppZone() });
  if (!result.ok) return { ok: false, errors: result.errors };

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/signin");

  const v = result.value;

  // The profile write happens first, and onboarding_completed_at is set on
  // this same row -- a failure between the two writes below leaves her on
  // the form (not yet marked onboarded) rather than in a half-onboarded
  // state with a profile but no pregnancy.
  const profile = await supabase.from("profiles").upsert({
    id: user.id,
    display_name: v.displayName,
    birth_year: v.birthYear,
    city: v.city,
    is_first_pregnancy: v.isFirstPregnancy,
    pre_pregnancy_weight_kg: v.weightKg,
    emergency_contact_name: v.emergencyContactName,
    emergency_contact_phone: v.emergencyContactPhone,
    notification_privacy: v.notificationPrivacy,
    onboarding_completed_at: new Date().toISOString(),
  });
  if (profile.error) throw profile.error;

  const pregnancy = await supabase.from("pregnancies").insert({
    user_id: user.id,
    lmp_date: v.lmp,
    edd: v.edd,
    edd_source: v.eddSource,
    pregnancy_flags: v.pregnancyFlags,
    twin_type: v.twinType,
  });
  if (pregnancy.error) throw pregnancy.error;

  return { ok: true };
}
