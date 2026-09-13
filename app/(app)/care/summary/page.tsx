import { buildSummary } from "@/lib/domain/summary";
import { todayInAppZone } from "@/lib/domain/dates";
import { pregnancyProgress } from "@/lib/domain/pregnancy";
import { getSummaryData } from "@/lib/supabase/queries/summary";
import { SummaryScreen } from "@/app/(app)/care/summary/SummaryScreen";

export default async function CareSummaryPage() {
  const today = todayInAppZone();
  const data = await getSummaryData();

  const edd = data.pregnancy?.edd ?? today;
  const progress = pregnancyProgress({ edd, today });

  const model = buildSummary({
    profile: {
      displayName: data.profile?.display_name ?? "",
      doctorName: data.profile?.doctor_name ?? null,
      clinicName: data.profile?.clinic_name ?? null,
    },
    pregnancy: {
      edd,
      flags: data.pregnancy?.pregnancy_flags ?? [],
      twinType: data.pregnancy?.twin_type ?? null,
    },
    progress: { week: progress.week, day: progress.day, trimester: progress.trimester },
    medicines: data.medicines,
    // Supabase's generated Row types widen every `text`-with-check-constraint
    // column to `string` -- filter+cast to the narrow literal union each
    // domain type expects, same pattern `today/activity/page.tsx` already
    // uses for this exact medicine_logs.status column. The DB constraint
    // guarantees these are the only values that can exist; the filter is
    // defense-in-depth, not a real expected drop.
    logs: data.medicineLogs
      .filter((log) => log.status === "taken" || log.status === "skipped")
      .map((log) => ({
        medicine_id: log.medicine_id,
        scheduled_date: log.scheduled_date,
        scheduled_time: log.scheduled_time,
        status: log.status as "taken" | "skipped",
      })),
    appointments: data.appointments
      .filter((a) => a.status === "upcoming" || a.status === "completed" || a.status === "cancelled")
      .map((a) => ({
        id: a.id,
        title: a.title,
        doctor_name: a.doctor_name,
        clinic_name: a.clinic_name,
        scheduled_at: a.scheduled_at,
        status: a.status as "upcoming" | "completed" | "cancelled",
      })),
    advice: data.advice.map((row) => ({
      ...row,
      updates: data.adviceUpdates.filter((update) => update.advice_id === row.id),
    })),
    vitals: data.vitals
      .filter((v) => v.kind === "weight" || v.kind === "bp")
      .map((v) => ({
        measured_on: v.measured_on,
        kind: v.kind as "weight" | "bp",
        value_1: v.value_1,
        value_2: v.value_2,
      })),
    reports: data.reports,
    checkins: data.checkins
      .filter(
        (c) =>
          c.severity === null ||
          c.severity === "general" ||
          c.severity === "contact_clinic" ||
          c.severity === "urgent",
      )
      .map((c) => ({
        id: c.id,
        body: c.body,
        severity: c.severity as "general" | "contact_clinic" | "urgent" | null,
        created_at: c.created_at,
      })),
    markedQuestions: [
      ...data.markedSuggestedQuestions.map((q) => ({ id: q.id, text: q.body })),
      ...data.markedCustomQuestions.map((q) => ({ id: q.id, text: q.body })),
    ],
    today,
  });

  return <SummaryScreen model={model} />;
}
