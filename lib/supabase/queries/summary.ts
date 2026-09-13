import { createServerSupabase } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

type Tables = Database["public"]["Tables"];
export type ProfileRow = Pick<Tables["profiles"]["Row"], "display_name" | "doctor_name" | "clinic_name">;
export type PregnancyRow = Pick<Tables["pregnancies"]["Row"], "edd" | "pregnancy_flags" | "twin_type">;
export type MedicineRow = Tables["medicines"]["Row"];
export type MedicineLogRow = Tables["medicine_logs"]["Row"];
export type AppointmentRow = Tables["appointments"]["Row"];
export type AdviceRow = Tables["doctor_advice"]["Row"];
export type AdviceUpdateRow = Tables["doctor_advice_updates"]["Row"];
export type VitalRow = Tables["vitals"]["Row"];
export type ReportRow = Tables["reports"]["Row"];
export type CheckinRow = Tables["checkins"]["Row"];
export type MarkedSuggestedQuestion = Pick<Tables["suggested_questions"]["Row"], "id" | "body">;
export type CustomQuestionRow = Tables["custom_questions"]["Row"];

export interface SummaryData {
  profile: ProfileRow | null;
  pregnancy: PregnancyRow | null;
  medicines: MedicineRow[];
  medicineLogs: MedicineLogRow[];
  appointments: AppointmentRow[];
  advice: AdviceRow[];
  adviceUpdates: AdviceUpdateRow[];
  vitals: VitalRow[];
  reports: ReportRow[];
  checkins: CheckinRow[];
  markedSuggestedQuestions: MarkedSuggestedQuestion[];
  markedCustomQuestions: CustomQuestionRow[];
}

/**
 * One read per source table the summary draws from. Every table already
 * exists (Migration 1, 3 and Sessions 22-26) -- this is a read-only fan-out,
 * same shape as getCareHubData, with no write path of its own. `checkins` is
 * fetched in full (not date-bounded here) because the 14-day window is a
 * display decision `buildSummary` makes, the same division of labour as
 * `getCareMedicinesData` leaving date-bucketing to `adherenceGrid`.
 *
 * Marked questions are fetched in two steps, same as `getQuestionsData`:
 * `question_marks` names which shared `suggested_questions` rows she picked
 * (RLS scopes that join table to her own marks), then those specific rows are
 * fetched by id -- never the whole shared catalogue, and never a client-side
 * join across two independently-RLS'd tables.
 */
export async function getSummaryData(): Promise<SummaryData> {
  const supabase = await createServerSupabase();

  const [profile, pregnancy, medicines, medicineLogs, appointments, advice, adviceUpdates, vitals, reports, checkins, marks, markedCustomQuestions] =
    await Promise.all([
      supabase.from("profiles").select("display_name, doctor_name, clinic_name").maybeSingle(),
      supabase.from("pregnancies").select("edd, pregnancy_flags, twin_type").eq("status", "active").maybeSingle(),
      supabase.from("medicines").select("*").eq("is_active", true),
      supabase.from("medicine_logs").select("*"),
      supabase.from("appointments").select("*"),
      supabase.from("doctor_advice").select("*"),
      supabase.from("doctor_advice_updates").select("*"),
      supabase.from("vitals").select("*"),
      supabase.from("reports").select("*"),
      supabase.from("checkins").select("*"),
      supabase.from("question_marks").select("suggested_question_id"),
      supabase.from("custom_questions").select("*").eq("is_marked", true),
    ]);

  const failed = [
    profile,
    pregnancy,
    medicines,
    medicineLogs,
    appointments,
    advice,
    adviceUpdates,
    vitals,
    reports,
    checkins,
    marks,
    markedCustomQuestions,
  ].find((result) => result.error);
  if (failed?.error) throw failed.error;

  const markedIds = (marks.data ?? []).map((row) => row.suggested_question_id);
  const markedSuggestedQuestions =
    markedIds.length > 0
      ? await supabase.from("suggested_questions").select("id, body").in("id", markedIds)
      : { data: [] as MarkedSuggestedQuestion[], error: null };
  if (markedSuggestedQuestions.error) throw markedSuggestedQuestions.error;

  return {
    profile: profile.data,
    pregnancy: pregnancy.data,
    medicines: medicines.data ?? [],
    medicineLogs: medicineLogs.data ?? [],
    appointments: appointments.data ?? [],
    advice: advice.data ?? [],
    adviceUpdates: adviceUpdates.data ?? [],
    vitals: vitals.data ?? [],
    reports: reports.data ?? [],
    checkins: checkins.data ?? [],
    markedSuggestedQuestions: markedSuggestedQuestions.data ?? [],
    markedCustomQuestions: markedCustomQuestions.data ?? [],
  };
}
