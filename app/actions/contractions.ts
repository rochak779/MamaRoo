"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import { todayInAppZone } from "@/lib/domain/dates";
import type {
  ContractionEntry,
  ContractionSessionState,
  StartContractionResult,
  StopContractionResult,
} from "@/app/(app)/me/contractions/ContractionTimer";

export type StartContractionSessionResult =
  | { ok: true; session: ContractionSessionState }
  | { ok: false; error: string };

function toEntry(row: { id: string; started_at: string; duration_seconds: number | null }): ContractionEntry {
  return { id: row.id, startedAt: row.started_at, durationSeconds: row.duration_seconds };
}

/**
 * Get-or-create, bucketed by calendar day in the app timezone rather than by
 * an hour-based staleness window: unlike the kick counter's fixed ten-kick
 * session, a contraction-timing session has no natural end and can
 * legitimately span many hours, so "today's contractions" (the screen's own
 * heading) is the boundary that makes sense. An open session from a previous
 * day is closed quietly and a fresh one started; today's open session, if
 * any, is resumed with its contractions (including one still in progress).
 */
export async function startContractionSession(): Promise<StartContractionSessionResult> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "not_authenticated" };

  const today = todayInAppZone();

  const { data: open, error: openError } = await supabase
    .from("contraction_sessions")
    .select("*")
    .is("ended_at", null)
    .maybeSingle();
  if (openError) return { ok: false, error: openError.message };

  if (open && todayInAppZone(new Date(open.started_at)) === today) {
    const { data: rows, error: rowsError } = await supabase
      .from("contractions")
      .select("id, started_at, duration_seconds")
      .eq("session_id", open.id)
      .order("started_at", { ascending: false });
    if (rowsError) return { ok: false, error: rowsError.message };

    return {
      ok: true,
      session: { id: open.id, contractions: (rows ?? []).map(toEntry), isNew: false },
    };
  }

  if (open) {
    // A previous day's session left open -- housekeeping close, not a
    // finished one; no timeline entry, same reasoning as the kick counter's
    // auto-close.
    const { error: closeError } = await supabase
      .from("contraction_sessions")
      .update({ ended_at: new Date().toISOString() })
      .eq("id", open.id);
    if (closeError) return { ok: false, error: closeError.message };
  }

  const { data: created, error: insertError } = await supabase
    .from("contraction_sessions")
    .insert({ user_id: user.id })
    .select("*")
    .single();
  if (insertError || !created) return { ok: false, error: insertError?.message ?? "insert_failed" };

  return { ok: true, session: { id: created.id, contractions: [], isNew: true } };
}

/**
 * Starting a contraction is itself a server write -- a row with
 * duration_seconds left null -- so that an in-progress contraction survives
 * a closed tab or a dead battery and is resumed from the stored started_at,
 * not lost the way a purely local "currently running" flag would be.
 */
export async function startContraction(sessionId: string): Promise<StartContractionResult> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "not_authenticated" };

  const { data, error } = await supabase
    .from("contractions")
    .insert({ user_id: user.id, session_id: sessionId, started_at: new Date().toISOString(), duration_seconds: null })
    .select("id, started_at, duration_seconds")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "insert_failed" };

  return { ok: true, contraction: toEntry(data) };
}

export async function stopContraction(contractionId: string, startedAt: string): Promise<StopContractionResult> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "not_authenticated" };

  // Clamped to the schema's own check constraint (1-1800 seconds) rather than
  // letting an unusually long forgot-to-stop timing fail the write outright.
  const durationSeconds = Math.min(1800, Math.max(1, Math.round((Date.now() - new Date(startedAt).getTime()) / 1000)));

  const { data, error } = await supabase
    .from("contractions")
    .update({ duration_seconds: durationSeconds })
    .eq("id", contractionId)
    .select("id, started_at, duration_seconds")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "update_failed" };

  return { ok: true, contraction: toEntry(data) };
}
