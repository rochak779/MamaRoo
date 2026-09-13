export const LETTER_BODY_MAX_LENGTH = 4000;
export const MAX_LETTER_WEEK = 42;

export interface LetterRecord {
  id: string;
  pregnancyId: string | null;
  gestationalWeek: number;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export type LetterBodyValidationError = "invalid" | "empty" | "too_long";

export type LetterBodyValidationResult =
  | { ok: true; value: string }
  | { ok: false; error: LetterBodyValidationError };

export function validateLetterBody(body: unknown): LetterBodyValidationResult {
  if (typeof body !== "string") return { ok: false, error: "invalid" };
  const value = body.trim();
  if (!value) return { ok: false, error: "empty" };
  if (value.length > LETTER_BODY_MAX_LENGTH) return { ok: false, error: "too_long" };
  return { ok: true, value };
}

export function openingLine(body: string, maxLength = 96): string {
  const first = body
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/\s+/g, " "))
    .find(Boolean) ?? "";
  if (maxLength < 2 || first.length <= maxLength) return first.slice(0, maxLength);
  return `${first.slice(0, maxLength - 1).trimEnd()}…`;
}

export function formatWeekLabel({
  week,
  locale,
  template,
}: {
  week: number;
  locale: string;
  template: string;
}): string {
  if (!Number.isInteger(week) || week < 0 || week > MAX_LETTER_WEEK) {
    throw new RangeError("Gestational week is outside the supported range");
  }
  const number = new Intl.NumberFormat(locale).format(week);
  return template.replace("{week}", number);
}
