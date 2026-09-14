"use server";

import { revalidatePath } from "next/cache";
import { setLocale } from "@/i18n/locale";
import { todayInAppZone } from "@/lib/domain/dates";
import {
  validateLocale,
  validateNotificationPrivacy,
  validatePersonalInfo,
  validatePregnancyInfo,
  type PersonalInfoInput,
  type PregnancyInfoInput,
  type SettingsFieldError,
} from "@/lib/domain/settings";
import { createServerSupabase } from "@/lib/supabase/server";
import type { Locale } from "@/lib/config";

export type SettingsActionResult =
  | { ok: true }
  | { ok: false; errors: Record<string, SettingsFieldError | "privacy_invalid" | "locale_invalid"> }
  | { ok: false; error: string };

type PersonalActionInput = Omit<PersonalInfoInput, "today"> & { today?: string };
type PregnancyActionInput = Omit<PregnancyInfoInput, "today"> & { today?: string };

async function authenticatedClient() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function updatePersonalInfo(input: PersonalActionInput): Promise<SettingsActionResult> {
  const result = validatePersonalInfo({ ...input, today: todayInAppZone() });
  if (!result.ok) return { ok: false, errors: result.errors };

  const { supabase, user } = await authenticatedClient();
  if (!user) return { ok: false, error: "not_authenticated" };

  const value = result.value;
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: value.displayName,
      birth_year: value.birthYear,
      city: value.city,
      height_cm: value.heightCm,
      mobile_number: value.mobileNumber,
    })
    .eq("id", user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/me");
  revalidatePath("/me/personal");
  return { ok: true };
}

export async function updatePregnancyInfo(input: PregnancyActionInput): Promise<SettingsActionResult> {
  const result = validatePregnancyInfo({ ...input, today: todayInAppZone() });
  if (!result.ok) return { ok: false, errors: result.errors };

  const { supabase, user } = await authenticatedClient();
  if (!user) return { ok: false, error: "not_authenticated" };

  const { data: pregnancy, error: pregnancyReadError } = await supabase
    .from("pregnancies")
    .select("id,edd,edd_source,lmp_date")
    .eq("status", "active")
    .maybeSingle();
  if (pregnancyReadError) return { ok: false, error: pregnancyReadError.message };
  if (!pregnancy) return { ok: false, error: "pregnancy_not_found" };

  const value = result.value;
  const correctingDueDate =
    value.dueDate !== pregnancy.edd || value.dueDateSource !== pregnancy.edd_source;
  if (correctingDueDate && value.dueDateSource !== "scan" && value.dueDateSource !== "manual") {
    return { ok: false, errors: { dueDate: "due_date_invalid" } };
  }
  const lmpDate = correctingDueDate ? value.lmpDate : pregnancy.lmp_date ?? value.lmpDate;
  const { error: pregnancyError } = await supabase
    .from("pregnancies")
    .update({
      edd: value.dueDate,
      edd_source: value.dueDateSource,
      lmp_date: lmpDate,
      pregnancy_flags: value.pregnancyFlags,
      twin_type: value.twinType,
      baby_name: value.babyNames,
    })
    .eq("id", pregnancy.id);
  if (pregnancyError) return { ok: false, error: pregnancyError.message };

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      is_first_pregnancy: value.isFirstPregnancy,
      pre_pregnancy_weight_kg: value.prePregnancyWeightKg,
      doctor_name: value.doctorName,
      clinic_name: value.clinicName,
    })
    .eq("id", user.id);
  if (profileError) return { ok: false, error: profileError.message };

  revalidatePath("/me");
  revalidatePath("/me/pregnancy");
  revalidatePath("/today");
  revalidatePath("/baby");
  return { ok: true };
}

export async function updateNotificationPrivacy(value: unknown): Promise<SettingsActionResult> {
  const result = validateNotificationPrivacy(value);
  if (!result.ok) return { ok: false, errors: { notificationPrivacy: result.error } };

  const { supabase, user } = await authenticatedClient();
  if (!user) return { ok: false, error: "not_authenticated" };
  const { error } = await supabase
    .from("profiles")
    .update({ notification_privacy: result.value })
    .eq("id", user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/me/notifications");
  return { ok: true };
}

export async function updateProfileLocale(locale: Locale): Promise<SettingsActionResult> {
  if (!validateLocale(locale)) return { ok: false, errors: { locale: "locale_invalid" } };

  const { supabase, user } = await authenticatedClient();
  if (!user) return { ok: false, error: "not_authenticated" };
  const { error } = await supabase.from("profiles").update({ locale }).eq("id", user.id);
  if (error) return { ok: false, error: error.message };

  await setLocale(locale);
  revalidatePath("/", "layout");
  return { ok: true };
}
