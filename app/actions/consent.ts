"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import { LEGAL_VERSION, type Locale } from "@/lib/config";
import type { ConsentKey } from "@/lib/supabase/queries/consent";

export interface RecordConsentsInput {
  baseline: boolean;
  optionalDataSharing: boolean;
  analytics: boolean;
  locale: Locale;
}

export async function recordConsents(input: RecordConsentsInput): Promise<void> {
  if (!input.baseline) return; // the UI blocks this; the server does not trust the UI

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/signin");

  // One row per consent key. Append only, so a later change is a new row: the
  // shared getCurrentConsents() query reads the latest row per key, never
  // updates one in place.
  const rows = [
    { consent_key: "terms" as const, granted: true },
    { consent_key: "privacy" as const, granted: true },
    { consent_key: "optional_data_sharing" as const, granted: input.optionalDataSharing },
    { consent_key: "analytics" as const, granted: input.analytics },
  ].map((row) => ({
    ...row,
    user_id: user.id,
    version: LEGAL_VERSION,
    locale: input.locale,
  }));

  const { error } = await supabase.from("consents").insert(rows);
  if (error) throw error;

  // No analytics call here, deliberately: posthog-js is a browser SDK and this
  // runs on the server. The redirect below re-renders the root layout, which
  // re-reads getCurrentConsents() and hands the fresh analytics flag to
  // AnalyticsProvider -- that's what actually opts in and fires
  // EVENTS.consent_granted, exactly once, on this transition (see
  // components/AnalyticsProvider.tsx).

  // Session 15's originally-planned intro carousel is superseded by the
  // delivered mockups' pre-auth /start (Welcome) screen -- there is no
  // post-consent intro step to land on, so this goes straight to the form.
  redirect("/onboarding/profile");
}

export type WithdrawConsentResult = { ok: true } | { ok: false; error: string };

/**
 * Withdrawing `terms` or `privacy` is refused here, not just hidden in the
 * UI: per Spec.md §3.2, withdrawing the required baseline consent is not a
 * way to keep using the product without it -- the Settings screen presents
 * that as account deletion (app/actions/privacy.ts's deleteAccount) instead
 * of a toggle. Only the two genuinely optional keys go through this path.
 */
export async function withdrawConsent(key: ConsentKey, locale: Locale): Promise<WithdrawConsentResult> {
  if (key !== "optional_data_sharing" && key !== "analytics") {
    return { ok: false, error: "not_withdrawable" };
  }

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "not_authenticated" };

  // Append-only, same as recordConsents: a withdrawal is a new granted:false
  // row, never an update to the row it replaces.
  const { error } = await supabase.from("consents").insert({
    consent_key: key,
    granted: false,
    user_id: user.id,
    version: LEGAL_VERSION,
    locale,
  });
  if (error) return { ok: false, error: error.message };

  // Re-renders the root layout, which re-reads getCurrentConsents() and
  // hands the fresh flags to AnalyticsProvider -- withdrawing "analytics"
  // is what actually triggers its optOut()/reset() call, via that same
  // props-changed effect that opts it in on consent_granted (see that
  // component's own comment). No direct analytics call needed here.
  revalidatePath("/", "layout");
  return { ok: true };
}
