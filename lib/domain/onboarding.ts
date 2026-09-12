import { addDays, diffDays, isValidDateString } from "@/lib/domain/dates";
import { eddFromIvfTransfer, eddFromLmp, lmpFromEdd, validateLmp } from "@/lib/domain/pregnancy";
import { GESTATION_DAYS } from "@/lib/config";
import en from "@/i18n/en.json";

const t = (key: keyof typeof en.onboarding.errors) => en.onboarding.errors[key];

const MIN_AGE = 12;
const MAX_AGE = 70;
const MIN_WEIGHT_KG = 25;
const MAX_WEIGHT_KG = 250;
const DUE_DATE_PAST_GRACE_DAYS = 14;
const DUE_DATE_FUTURE_LIMIT_DAYS = 44 * 7;

export type DueDateMethod = "lmp" | "scan" | "manual" | "ivf" | "unsure";
export type PregnancyFlag = "single" | "twins" | "ivf" | "monitored" | "priorLoss" | "unsureFlag";
export type TwinType = "unconfirmed" | "dichorionic" | "monochorionic";
export type NotificationPrivacy = "private" | "detailed";

export interface OnboardingInput {
  displayName: string;
  age?: number;
  weightKg?: number;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  dueDateMethod: DueDateMethod;
  /** The single date the Pregnancy Start screen collects; its meaning depends on dueDateMethod. Unused for "unsure". */
  date?: string;
  city?: string;
  isFirstPregnancy?: boolean;
  pregnancyFlags?: PregnancyFlag[];
  twinType?: TwinType | null;
  notificationPrivacy?: NotificationPrivacy;
  today: string;
}

export interface OnboardingValue {
  displayName: string;
  birthYear: number | null;
  weightKg: number | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  city: string | null;
  isFirstPregnancy: boolean | null;
  lmp: string | null;
  edd: string;
  eddSource: DueDateMethod;
  pregnancyFlags: PregnancyFlag[];
  twinType: TwinType | null;
  notificationPrivacy: NotificationPrivacy;
}

export type OnboardingResult =
  | { ok: true; value: OnboardingValue }
  | { ok: false; errors: Record<string, string> };

/**
 * Every field except display name and due-date method is optional, matching
 * the designer's mockups exactly (About You, Pregnancy Start, Pregnancy
 * Details, Notification Privacy). Errors are collected across every field
 * before returning, never short-circuited on the first failure.
 */
export function validateOnboarding(input: OnboardingInput): OnboardingResult {
  const errors: Record<string, string> = {};

  const displayName = (input.displayName ?? "").trim();
  if (displayName.length < 1 || displayName.length > 80) {
    errors.displayName = t("nameRequired");
  }

  let birthYear: number | null = null;
  if (input.age !== undefined) {
    const todayYear = Number(input.today.slice(0, 4));
    const age = input.age;
    if (!Number.isFinite(age) || age < MIN_AGE || age > MAX_AGE) {
      errors.age = t("ageRange");
    } else {
      birthYear = todayYear - Math.trunc(age);
    }
  }

  let weightKg: number | null = null;
  if (input.weightKg !== undefined) {
    if (!Number.isFinite(input.weightKg) || input.weightKg < MIN_WEIGHT_KG || input.weightKg > MAX_WEIGHT_KG) {
      errors.weightKg = t("weightRange");
    } else {
      weightKg = input.weightKg;
    }
  }

  const { emergencyContactName, emergencyContactPhone } = validateEmergencyContact(input, errors);

  const { lmp, edd, eddSource } = validateDueDate(input, errors);

  const city = input.city?.trim() || null;
  const isFirstPregnancy = input.isFirstPregnancy ?? null;
  const pregnancyFlags = input.pregnancyFlags ?? [];
  const twinType = input.twinType ?? null;
  const notificationPrivacy = input.notificationPrivacy ?? "private";

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      displayName,
      birthYear,
      weightKg,
      emergencyContactName,
      emergencyContactPhone,
      city,
      isFirstPregnancy,
      lmp,
      edd: edd as string,
      eddSource: eddSource as DueDateMethod,
      pregnancyFlags,
      twinType,
      notificationPrivacy,
    },
  };
}

function validateEmergencyContact(
  input: OnboardingInput,
  errors: Record<string, string>,
): { emergencyContactName: string | null; emergencyContactPhone: string | null } {
  const name = (input.emergencyContactName ?? "").trim();
  const digits = (input.emergencyContactPhone ?? "").replace(/\D/g, "");
  const hasName = name.length > 0;
  const hasPhone = digits.length > 0;

  if (hasName && !hasPhone) errors.emergencyContactPhone = t("emergencyContactIncomplete");
  if (hasPhone && !hasName) errors.emergencyContactName = t("emergencyContactIncomplete");
  if (hasPhone && digits.length !== 10) errors.emergencyContactPhone = t("emergencyPhoneInvalid");

  return {
    emergencyContactName: hasName ? name : null,
    emergencyContactPhone: hasPhone ? digits : null,
  };
}

function validateDueDate(
  input: OnboardingInput,
  errors: Record<string, string>,
): { lmp: string | null; edd: string | null; eddSource: DueDateMethod | null } {
  const method = input.dueDateMethod;
  if (!method) {
    errors.dueDateMethod = t("dueDateMethodRequired");
    return { lmp: null, edd: null, eddSource: null };
  }

  if (method === "unsure") {
    // No date collected at all. Seed a placeholder due date (today + a full
    // gestation) so every week/stage calculation downstream still has an edd
    // to work from; she is prompted to correct it later, in Settings.
    return { lmp: null, edd: addDays(input.today, GESTATION_DAYS), eddSource: "unsure" };
  }

  if (!input.date || !isValidDateString(input.date)) {
    errors.date = t("dateRequired");
    return { lmp: null, edd: null, eddSource: null };
  }

  if (method === "lmp") {
    const validation = validateLmp({ lmp: input.date, today: input.today });
    if (!validation.ok) {
      errors.date = validation.reason === "future" ? t("dateFuture") : t("dateTooOld");
      return { lmp: null, edd: null, eddSource: null };
    }
    return { lmp: input.date, edd: eddFromLmp(input.date), eddSource: "lmp" };
  }

  // scan and manual both hand us the due date directly; ivf derives it from
  // the transfer date. All three then go through the same plausibility check.
  const edd = method === "ivf" ? eddFromIvfTransfer(input.date) : input.date;
  const daysUntilEdd = diffDays(input.today, edd);
  if (daysUntilEdd < -DUE_DATE_PAST_GRACE_DAYS) {
    errors.date = t("dueDatePast");
    return { lmp: null, edd: null, eddSource: null };
  }
  if (daysUntilEdd > DUE_DATE_FUTURE_LIMIT_DAYS) {
    errors.date = t("dueDateTooFar");
    return { lmp: null, edd: null, eddSource: null };
  }
  return { lmp: lmpFromEdd(edd), edd, eddSource: method };
}
