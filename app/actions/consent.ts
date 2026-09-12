"use server";

import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { LEGAL_VERSION, type Locale } from "@/lib/config";

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

  redirect("/onboarding/intro");
}
