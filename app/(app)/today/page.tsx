import { getLocale } from "@/i18n/locale";
import { saveCheckin } from "@/app/actions/checkin";
import { TodayScreen } from "@/app/(app)/today/TodayScreen";
import { buildReminders, type ReminderAppointment, type ReminderLog } from "@/lib/domain/reminders";
import { todayInAppZone } from "@/lib/domain/dates";
import { pregnancyProgress } from "@/lib/domain/pregnancy";
import { weekIllustrationSrc } from "@/lib/domain/illustrations";
import { getTodayData } from "@/lib/supabase/queries/today";
import { createServerSupabase } from "@/lib/supabase/server";

/**
 * getTodayData's content_items query needs the current week to filter by,
 * but the week itself comes from the active pregnancy's edd, which is part
 * of what getTodayData fetches. Rather than teach getTodayData to compute
 * its own week internally (mixing a domain calculation into a query
 * module), this reads just the edd first -- a single cheap RLS-scoped
 * column -- then calls getTodayData once with the real week.
 */
/** Kept out of the component body: eslint's react-hooks/purity rule flags a
 * direct Date.now() call inside a component function, even an async server
 * one with no re-render concerns of its own. */
function nowMillis(): number {
  return Date.now();
}

async function currentWeek(today: string): Promise<number> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("pregnancies")
    .select("edd")
    .eq("status", "active")
    .maybeSingle();
  if (error) throw error;
  return data ? pregnancyProgress({ edd: data.edd, today }).week : 0;
}

export default async function TodayPage() {
  const locale = await getLocale();
  const today = todayInAppZone();
  const now = nowMillis();

  const week = await currentWeek(today);
  const data = await getTodayData({ today, currentWeek: week, locale });

  const progress = data.pregnancy ? pregnancyProgress({ edd: data.pregnancy.edd, today }) : null;
  const babyCount = data.pregnancy?.pregnancy_flags?.includes("twins") ? 2 : 1;

  const reminders = buildReminders({
    today,
    now,
    appointments: data.appointments as unknown as ReminderAppointment[],
    medicines: data.medicines,
    logs: data.medicineLogs as unknown as ReminderLog[],
  });

  const daysToNearestAppointment = data.appointments
    .map((a) => Math.floor((new Date(a.scheduled_at).getTime() - now) / (24 * 60 * 60 * 1000)))
    .filter((days) => days >= 0);

  return (
    <TodayScreen
      displayName={data.profile?.display_name ?? ""}
      week={progress?.week ?? 0}
      babyCount={babyCount}
      isPostTerm={progress?.isPostTerm ?? false}
      stage={weekIllustrationSrc(progress?.week ?? 0)}
      reminders={reminders}
      reading={data.contentItems.map((item) => ({
        id: item.id,
        slug: item.slug,
        title: item.title,
        summary: item.summary ?? "",
        kind: item.kind as "article" | "video" | "audio",
      }))}
      // The weekly reflection ("you kept up with your iron tablets and
      // checked in most days this week") needs adherence data that doesn't
      // exist until Session 22's lib/domain/adherence.ts. Wiring it here with
      // partial data would mean showing a claim about adherence this page
      // can't actually verify -- staying off until that session lands is the
      // honest choice, not a missed requirement.
      showWeeklyReflection={false}
      weeklyReflectionText=""
      showCheckupNudge={daysToNearestAppointment.some((days) => days <= 3)}
      // No transcriber prop: it's a plain object of functions (window.SpeechRecognition
      // bindings), and a Server Component can't pass that to a Client Component --
      // TodayScreen defaults to the real one itself. Likewise onSubmitCheckin is
      // saveCheckin directly, not a wrapping closure -- only a genuine "use server"
      // reference is allowed to cross this boundary, and TodayScreen's prop shape
      // now matches saveCheckin's own { body, feeling, inputMethod } exactly so no
      // wrapper is needed. Both were crashing /today with real RSC errors before
      // this fix ("Functions cannot be passed directly to Client Components", "Event
      // handlers cannot be passed to Client Component props").
      onSubmitCheckin={saveCheckin}
      doctorName={data.profile?.doctor_name ?? null}
      clinicName={data.profile?.clinic_name ?? null}
    />
  );
}
