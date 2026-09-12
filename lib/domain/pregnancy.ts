import { GESTATION_DAYS } from "@/lib/config";
import { addDays, diffDays, isValidDateString } from "@/lib/domain/dates";

/** Past this, the record is treated as a previous pregnancy rather than a current one. */
const MAX_LMP_AGE_DAYS = 44 * 7;
/** Weeks beyond this are displayed clamped, because there is no stage 43. */
const MAX_DISPLAY_WEEK = 42;

export interface PregnancyProgress {
  gestationalDays: number;
  week: number;
  day: number;
  trimester: 1 | 2 | 3;
  isPostTerm: boolean;
  daysToEdd: number;
}

export function eddFromLmp(lmp: string): string {
  return addDays(lmp, GESTATION_DAYS);
}

export function lmpFromEdd(edd: string): string {
  return addDays(edd, -GESTATION_DAYS);
}

/**
 * Standard day-5 blastocyst transfer convention: the embryo is already 19 days
 * past a notional LMP at transfer, so the due date is 280 - 19 = 261 days out.
 * (A day-3 transfer would be 263 days; the onboarding form doesn't ask which,
 * so this assumes the more common day-5 protocol.)
 */
const IVF_TRANSFER_AGE_DAYS = 19;

export function eddFromIvfTransfer(transferDate: string): string {
  return addDays(transferDate, GESTATION_DAYS - IVF_TRANSFER_AGE_DAYS);
}

export function eddFromScan({
  scanDate,
  gestWeeks,
  gestDays = 0,
}: {
  scanDate: string;
  gestWeeks: number;
  gestDays?: number;
}): string {
  return addDays(scanDate, GESTATION_DAYS - (gestWeeks * 7 + gestDays));
}

/**
 * Gestational age is derived from the EDD, never stored, so a scan correction to
 * the EDD immediately corrects every week shown anywhere in the product.
 */
export function pregnancyProgress({ edd, today }: { edd: string; today: string }): PregnancyProgress {
  const daysToEdd = diffDays(today, edd);
  const rawGestationalDays = GESTATION_DAYS - daysToEdd;
  const gestationalDays = Math.max(0, rawGestationalDays);

  const rawWeek = Math.floor(gestationalDays / 7);
  const week = Math.min(rawWeek, MAX_DISPLAY_WEEK);
  const day = week === MAX_DISPLAY_WEEK ? 0 : gestationalDays % 7;

  const trimester: 1 | 2 | 3 = week < 14 ? 1 : week < 28 ? 2 : 3;

  return { gestationalDays, week, day, trimester, isPostTerm: daysToEdd < 0, daysToEdd };
}

export type LmpValidation = { ok: true } | { ok: false; reason: "future" | "too_old" | "invalid" };

export function validateLmp({ lmp, today }: { lmp: string; today: string }): LmpValidation {
  if (!isValidDateString(lmp)) return { ok: false, reason: "invalid" };
  const age = diffDays(lmp, today);
  if (age < 0) return { ok: false, reason: "future" };
  if (age > MAX_LMP_AGE_DAYS) return { ok: false, reason: "too_old" };
  return { ok: true };
}
