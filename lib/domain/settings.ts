import { SUPPORTED_LOCALES, type Locale } from "@/lib/config";
import { validateBabyNames } from "@/lib/domain/babyNames";
import {
  validateOnboarding,
  type DueDateMethod,
  type NotificationPrivacy,
  type PregnancyFlag,
  type TwinType,
} from "@/lib/domain/onboarding";

export type SettingsFieldError =
  | "name_required"
  | "age_range"
  | "height_range"
  | "mobile_invalid"
  | "due_date_invalid"
  | "pregnancy_flags_invalid"
  | "twin_type_invalid"
  | "baby_names_invalid"
  | "weight_range"
  | "first_pregnancy_invalid"
  | "text_too_long";

export interface PersonalInfoInput {
  displayName: string;
  age: string;
  city: string;
  heightCm: string;
  mobileNumber: string;
  today: string;
}

export interface PersonalInfoValue {
  displayName: string;
  birthYear: number | null;
  city: string | null;
  heightCm: number | null;
  mobileNumber: string | null;
}

export type PersonalInfoResult =
  | { ok: true; value: PersonalInfoValue }
  | { ok: false; errors: Record<string, SettingsFieldError> };

export interface PregnancyInfoInput {
  dueDate: string;
  dueDateSource: DueDateMethod;
  pregnancyFlags: PregnancyFlag[];
  twinType: TwinType | null;
  babyNames: string[];
  isFirstPregnancy: boolean | null;
  prePregnancyWeightKg: string;
  doctorName: string;
  clinicName: string;
  today: string;
}

export interface PregnancyInfoValue {
  dueDate: string;
  dueDateSource: DueDateMethod;
  lmpDate: string;
  pregnancyFlags: PregnancyFlag[];
  twinType: TwinType | null;
  babyNames: string[];
  isFirstPregnancy: boolean | null;
  prePregnancyWeightKg: number | null;
  doctorName: string | null;
  clinicName: string | null;
}

export type PregnancyInfoResult =
  | { ok: true; value: PregnancyInfoValue }
  | { ok: false; errors: Record<string, SettingsFieldError> };

const PREGNANCY_FLAGS = new Set<PregnancyFlag>([
  "single",
  "twins",
  "ivf",
  "monitored",
  "priorLoss",
  "unsureFlag",
]);
const TWIN_TYPES = new Set<TwinType>(["unconfirmed", "dichorionic", "monochorionic"]);
const DUE_DATE_METHODS = new Set<DueDateMethod>(["lmp", "scan", "manual", "ivf", "unsure"]);
const MAX_TEXT_LENGTH = 120;

export function ageFromBirthYear(birthYear: number | null, today: string): number | null {
  return birthYear === null ? null : Number(today.slice(0, 4)) - birthYear;
}

function optionalNumber(value: string): number | undefined {
  return value.trim() === "" ? undefined : Number(value);
}

/**
 * Personal settings deliberately pass through validateOnboarding so name and
 * age never acquire a second, subtly different set of rules. The due-date
 * placeholder is only there to satisfy that aggregate validator and is not
 * returned or written by this form.
 */
export function validatePersonalInfo(input: PersonalInfoInput): PersonalInfoResult {
  const age = optionalNumber(input.age);
  const onboarding = validateOnboarding({
    displayName: input.displayName,
    city: input.city,
    dueDateMethod: "unsure",
    today: input.today,
    ...(age === undefined ? {} : { age }),
  });
  const errors: Record<string, SettingsFieldError> = {};

  if (!onboarding.ok) {
    if (onboarding.errors.displayName) errors.displayName = "name_required";
    if (onboarding.errors.age) errors.age = "age_range";
  }

  const height = optionalNumber(input.heightCm);
  if (height !== undefined && (!Number.isFinite(height) || height < 100 || height > 220)) {
    errors.heightCm = "height_range";
  }

  const mobile = input.mobileNumber.replace(/\D/g, "");
  if (mobile.length > 0 && !/^[0-9]{10}$/.test(mobile)) errors.mobileNumber = "mobile_invalid";

  if (Object.keys(errors).length > 0 || !onboarding.ok) return { ok: false, errors };

  return {
    ok: true,
    value: {
      displayName: onboarding.value.displayName,
      birthYear: onboarding.value.birthYear,
      city: onboarding.value.city,
      heightCm: height ?? null,
      mobileNumber: mobile || null,
    },
  };
}

export function validatePregnancyInfo(input: PregnancyInfoInput): PregnancyInfoResult {
  const errors: Record<string, SettingsFieldError> = {};
  const sourceValid = DUE_DATE_METHODS.has(input.dueDateSource);
  const weightKg = optionalNumber(input.prePregnancyWeightKg);
  const onboarding = validateOnboarding({
    displayName: "Settings",
    // This settings field always contains an EDD. Treat it as a scan date for
    // range validation; the server action separately permits legacy LMP/IVF/
    // unsure provenance only when the stored EDD itself is unchanged.
    dueDateMethod: "scan",
    date: input.dueDate,
    today: input.today,
    ...(weightKg === undefined ? {} : { weightKg }),
  });

  if (!sourceValid || !onboarding.ok && onboarding.errors.date) errors.dueDate = "due_date_invalid";
  if (!onboarding.ok && onboarding.errors.weightKg) errors.prePregnancyWeightKg = "weight_range";

  const flagsValid =
    Array.isArray(input.pregnancyFlags) &&
    new Set(input.pregnancyFlags).size === input.pregnancyFlags.length &&
    input.pregnancyFlags.every((flag) => PREGNANCY_FLAGS.has(flag));
  if (!flagsValid) errors.pregnancyFlags = "pregnancy_flags_invalid";

  const hasTwins = flagsValid && input.pregnancyFlags.includes("twins");
  if (input.twinType !== null && (!TWIN_TYPES.has(input.twinType) || !hasTwins)) {
    errors.twinType = "twin_type_invalid";
  }

  const names = Array.isArray(input.babyNames)
    ? input.babyNames.filter((name) => typeof name === "string" && name.trim().length > 0)
    : [];
  const namesResult = validateBabyNames({ names, babyCount: hasTwins ? 2 : 1 });
  if (!Array.isArray(input.babyNames) || !namesResult.ok) errors.babyNames = "baby_names_invalid";

  if (input.isFirstPregnancy !== null && typeof input.isFirstPregnancy !== "boolean") {
    errors.isFirstPregnancy = "first_pregnancy_invalid";
  }

  const doctorName = input.doctorName.trim();
  const clinicName = input.clinicName.trim();
  if (doctorName.length > MAX_TEXT_LENGTH) errors.doctorName = "text_too_long";
  if (clinicName.length > MAX_TEXT_LENGTH) errors.clinicName = "text_too_long";

  if (Object.keys(errors).length > 0 || !onboarding.ok || !namesResult.ok) return { ok: false, errors };

  return {
    ok: true,
    value: {
      dueDate: onboarding.value.edd,
      dueDateSource: input.dueDateSource,
      lmpDate: onboarding.value.lmp as string,
      pregnancyFlags: input.pregnancyFlags,
      twinType: hasTwins ? input.twinType : null,
      babyNames: namesResult.value,
      isFirstPregnancy: input.isFirstPregnancy,
      prePregnancyWeightKg: onboarding.value.weightKg,
      doctorName: doctorName || null,
      clinicName: clinicName || null,
    },
  };
}

export function validateNotificationPrivacy(
  value: unknown,
): { ok: true; value: NotificationPrivacy } | { ok: false; error: "privacy_invalid" } {
  return value === "private" || value === "detailed"
    ? { ok: true, value }
    : { ok: false, error: "privacy_invalid" };
}

export function validateLocale(value: unknown): value is Locale {
  return typeof value === "string" && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export interface ReminderPreferences {
  medicine: boolean;
  appointments: boolean;
  weekly: boolean;
}

export const DEFAULT_REMINDER_PREFERENCES: ReminderPreferences = {
  medicine: true,
  appointments: true,
  weekly: false,
};

export function parseReminderPreferences(raw: string | null): ReminderPreferences {
  if (!raw) return { ...DEFAULT_REMINDER_PREFERENCES };
  try {
    const value = JSON.parse(raw) as Partial<ReminderPreferences>;
    if (
      typeof value.medicine === "boolean" &&
      typeof value.appointments === "boolean" &&
      typeof value.weekly === "boolean"
    ) return value as ReminderPreferences;
  } catch {
    // A corrupt device preference should quietly fall back to the least
    // surprising defaults rather than blocking the settings screen.
  }
  return { ...DEFAULT_REMINDER_PREFERENCES };
}
