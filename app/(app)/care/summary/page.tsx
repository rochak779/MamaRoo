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
    logs: data.medicineLogs,
    appointments: data.appointments,
    advice: data.advice.map((row) => ({
      ...row,
      updates: data.adviceUpdates.filter((update) => update.advice_id === row.id),
    })),
    vitals: data.vitals,
    reports: data.reports,
    checkins: data.checkins,
    markedQuestions: [
      ...data.markedSuggestedQuestions.map((q) => ({ id: q.id, text: q.body })),
      ...data.markedCustomQuestions.map((q) => ({ id: q.id, text: q.body })),
    ],
    today,
  });

  return <SummaryScreen model={model} />;
}
