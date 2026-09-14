"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getLocale } from "@/i18n/locale";
import { buildExport, type ExportEnvelope } from "@/lib/domain/export";
import { confirmationWordMatches, reauthIsFresh } from "@/lib/domain/privacy";
import type { Database } from "@/lib/supabase/database.types";

// Every user-owned table, hardcoded rather than introspected at request time
// (the introspection function, user_owned_tables(), is service-role only --
// see that migration's own comment). This list is a completeness test's
// whole job to keep honest: tests/rls/privacy.test.ts compares it against
// the live catalogue, so a table added here later without a matching schema
// change (or vice versa) fails loudly instead of silently under-exporting.
const USER_ID_TABLES = [
  "appointments",
  "baby_name_favorites",
  "chat_messages",
  "checkins",
  "checklist_progress",
  "consents",
  "contraction_sessions",
  "contractions",
  "custom_questions",
  "doctor_advice",
  "doctor_advice_updates",
  "emergency_contacts",
  "kick_events",
  "kick_sessions",
  "letters",
  "medicine_logs",
  "medicines",
  "personal_notes",
  "pregnancies",
  "question_marks",
  "reports",
  "timeline_events",
  "vitals",
] as const satisfies readonly (keyof Database["public"]["Tables"])[];

export type RequestExportResult = { ok: true; data: ExportEnvelope } | { ok: false; error: string };

/**
 * Direct download, not an emailed link (locked decision, Plan-Session-30-32-Replan.md) --
 * this just builds the JSON; PrivacyScreen triggers the browser download client-side.
 */
export async function requestExport(): Promise<RequestExportResult> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "not_authenticated" };

  const tables: Record<string, unknown[]> = {};

  const profile = await supabase.from("profiles").select("*").eq("id", user.id);
  if (profile.error) return { ok: false, error: profile.error.message };
  tables.profiles = profile.data ?? [];

  for (const table of USER_ID_TABLES) {
    const result = await supabase.from(table).select("*").eq("user_id", user.id);
    if (result.error) return { ok: false, error: result.error.message };
    tables[table] = result.data ?? [];
  }

  return { ok: true, data: buildExport(tables) };
}

export type DeletePregnancyJourneyResult = { ok: true } | { ok: false; error: string };

// Tables that structurally carry pregnancy_id. Deliberately excludes
// `letters` even though it carries the column too: that foreign key is
// `on delete set null` (not cascade) specifically so her letters to her baby
// outlive the pregnancy record they were written under -- a locked product
// decision (2026-09-14), not an oversight. Deleting the pregnancies row
// below relies on that same "set null" behavior to detach letters safely
// rather than destroying them.
const PREGNANCY_SCOPED_TABLES = ["checkins", "kick_sessions", "timeline_events"] as const;

/**
 * Wipes routine tracking data for one pregnancy and the pregnancy record
 * itself, keeping the account and every other pregnancy intact. Distinct
 * from deleteAccount: this is reachable with a lighter confirmation (see
 * PrivacyScreen), matching the mockup's own single confirm sheet for this
 * action -- it doesn't touch her identity or any other pregnancy's data.
 */
export async function deletePregnancyJourney(pregnancyId: string): Promise<DeletePregnancyJourneyResult> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "not_authenticated" };

  // Explicit per-table deletes first -- the pregnancy_id foreign key on each
  // of these is "on delete set null", so deleting the pregnancies row alone
  // would orphan these rows (pregnancy_id -> null) rather than remove them.
  for (const table of PREGNANCY_SCOPED_TABLES) {
    const { error } = await supabase.from(table).delete().eq("pregnancy_id", pregnancyId).eq("user_id", user.id);
    if (error) return { ok: false, error: error.message };
  }

  const { error: pregnancyError } = await supabase
    .from("pregnancies")
    .delete()
    .eq("id", pregnancyId)
    .eq("user_id", user.id);
  if (pregnancyError) return { ok: false, error: pregnancyError.message };

  return { ok: true };
}

export type DeleteAccountResult = { ok: true } | { ok: false; error: string };

/**
 * The one sanctioned service-role code path in the product (Global
 * Constraints). Runs in a fixed order, and the order is load-bearing, not
 * cosmetic:
 *   1. Re-read the session; abort if absent.
 *   2. Require fresh re-authentication, proven server-side from the
 *      session's own last_sign_in_at -- never from anything the client
 *      asserts (see lib/domain/privacy.ts's reauthIsFresh).
 *   3. Confirm the typed word, checked against the locale actually being
 *      shown (getLocale()), not a client-supplied one.
 *   4. Delete every storage object under `{userId}/` in the reports bucket,
 *      using her own RLS-scoped client.
 *   5. Only then call admin.auth.admin.deleteUser, which cascades every
 *      metadata row (every user_id/id foreign key to auth.users in this
 *      schema is "on delete cascade" -- confirmed against every migration).
 * Step 4 must precede step 5: the cascade deletes the `reports` rows that
 * name these files, so deleting the user first would leave the objects
 * orphaned with nothing left pointing at them.
 */
export async function deleteAccount(confirmationWord: string): Promise<DeleteAccountResult> {
  const supabase = await createServerSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return { ok: false, error: "not_authenticated" };

  if (!reauthIsFresh({ lastSignInAt: session.user.last_sign_in_at, now: Date.now() })) {
    return { ok: false, error: "reauth_required" };
  }

  const locale = await getLocale();
  if (!confirmationWordMatches(confirmationWord, locale)) {
    return { ok: false, error: "confirmation_mismatch" };
  }

  const userId = session.user.id;

  const { data: reports, error: reportsError } = await supabase
    .from("reports")
    .select("storage_path")
    .eq("user_id", userId);
  if (reportsError) return { ok: false, error: reportsError.message };

  const paths = (reports ?? []).map((r) => r.storage_path);
  if (paths.length > 0) {
    const { error: storageError } = await supabase.storage.from("reports").remove(paths);
    if (storageError) return { ok: false, error: storageError.message };
  }

  const admin = createAdminSupabase();
  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
  if (deleteError) return { ok: false, error: deleteError.message };

  return { ok: true };
}
