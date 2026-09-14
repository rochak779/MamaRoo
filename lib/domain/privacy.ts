import type { Locale } from "@/lib/config";

/**
 * How recently she must have proven she's actually holding this phone right
 * now before account deletion is allowed -- an existing session plus a typed
 * word is not proof of recent intent on its own, since phones get left
 * unlocked and handed around, and this action destroys every pregnancy
 * record she has with no recovery.
 */
export const REAUTH_MAX_AGE_MS = 10 * 60 * 1000;

/**
 * Freshness is read from `session.user.last_sign_in_at`, which Supabase sets
 * server-side only when `verifyOtp` genuinely succeeds -- never from a value
 * the request body could assert. `now` is a parameter (not `Date.now()`
 * internally) so the caller controls it and this stays a pure function.
 */
export function reauthIsFresh({
  lastSignInAt,
  now,
}: {
  lastSignInAt: string | null | undefined;
  now: number;
}): boolean {
  if (!lastSignInAt) return false;
  const issuedAtMs = Date.parse(lastSignInAt);
  if (Number.isNaN(issuedAtMs)) return false;
  return now - issuedAtMs <= REAUTH_MAX_AGE_MS;
}

/**
 * One fixed word per locale, shown to her and checked server-side -- not
 * translated per-request, so there is exactly one correct answer for
 * whichever language the screen is currently rendered in.
 */
export const DELETE_ACCOUNT_CONFIRMATION_WORD: Record<Locale, string> = {
  en: "DELETE",
  hi: "हटाएँ",
};

export function confirmationWordMatches(typed: string, locale: Locale): boolean {
  const expected = DELETE_ACCOUNT_CONFIRMATION_WORD[locale];
  return typed.trim().toUpperCase() === expected.toUpperCase();
}
