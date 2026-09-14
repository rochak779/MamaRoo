"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/Card";
import { IllustrationContainer } from "@/components/patterns/IllustrationContainer";
import { FeelingBox, type Feeling } from "@/app/(app)/today/FeelingBox";
import { TodayEdgeState } from "@/app/(app)/today/TodayEdgeState";
import { MedicineQuickActionSheet } from "@/app/(app)/today/MedicineQuickActionSheet";
import { TriageResult, type TriageResultProps } from "@/app/(app)/today/TriageResult";
import type { Reminder } from "@/lib/domain/reminders";
import type { Transcriber } from "@/lib/speech/transcribe";
import { webSpeechTranscriber } from "@/lib/speech/webspeech";
import type { SaveCheckinResult } from "@/app/actions/checkin";

export interface ReadingCard {
  id: string;
  slug: string;
  title: string;
  summary: string;
  kind: "article" | "video" | "audio";
}

export interface TodayScreenProps {
  displayName: string;
  week: number;
  babyCount: 1 | 2;
  isPostTerm: boolean;
  stage: { lottieUrl: string; staticSrc: string };
  reminders: Reminder[];
  reading: ReadingCard[];
  showWeeklyReflection: boolean;
  weeklyReflectionText: string;
  showCheckupNudge: boolean;
  /** Defaults to the real browser transcriber so TodayPage (a Server
   * Component) doesn't have to pass it -- an object of functions can't cross
   * that boundary. Tests still inject their own mock via this same prop. */
  transcriber?: Transcriber;
  /** Matches saveCheckin's own { body, feeling, inputMethod } shape (not
   * FeelingBox's { text, feeling, inputMethod }) precisely so TodayPage can
   * pass the real "use server" action straight through as this prop, instead
   * of wrapping it in a closure to rename the field -- that closure is what
   * crashed /today, since only a genuine server-action reference is allowed
   * to cross the Server-to-Client boundary. handleCheckinSubmit below does
   * the text-to-body rename on the client side of that boundary instead. */
  onSubmitCheckin: (input: {
    body: string;
    feeling: Feeling | null;
    inputMethod: "text" | "voice";
  }) => Promise<SaveCheckinResult>;
  doctorName: string | null;
  clinicName: string | null;
}

/** Icon shown in the "for you today" bento cards' chip -- one per content
 * kind, so the category accent border is never the only cue (colorblind-safe
 * rule, Mamaroo-Designfinal.md §2.2). */
function readingIcon(kind: ReadingCard["kind"]): string {
  if (kind === "video") return "VideoCamera";
  if (kind === "audio") return "SpeakerHigh";
  return "BookOpen";
}

const LAST_SEEN_WEEK_KEY = "mamaroo_today_last_seen_week";

/** Fires the one-shot "bloom" burst behind the week-progress hero on a
 * stage-change day -- i.e. the first time this session's `week` differs from
 * whatever was last persisted client-side. Purely a presentational affordance
 * derived from a prop TodayScreen already receives; nothing new is fetched or
 * stored server-side. */
function useBloomOnStageChange(week: number): boolean {
  const [bloomActive, setBloomActive] = useState(false);

  useEffect(() => {
    // The sanctioned case the lint rule's own guidance describes
    // ("subscribe for updates from some external system, calling setState
    // ... when external state changes"): localStorage doesn't exist during
    // SSR, so last-seen-week can only be read after mount -- see useDraft.ts
    // for the same reasoning.
    let shouldBloom = false;
    try {
      const stored = window.localStorage.getItem(LAST_SEEN_WEEK_KEY);
      const storedWeek = stored ? Number.parseInt(stored, 10) : null;
      window.localStorage.setItem(LAST_SEEN_WEEK_KEY, String(week));
      shouldBloom = storedWeek !== week;
    } catch {
      // localStorage unavailable (private mode) -- skip the bloom, never crash.
    }
    if (!shouldBloom) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBloomActive(true);
    const timeout = setTimeout(() => setBloomActive(false), 600);
    return () => clearTimeout(timeout);
  }, [week]);

  return bloomActive;
}

/** "20:00" (stored, 24h) -> "8:00 PM". Reminder times never carry a date, so
 * this stays a pure string transform rather than going through Date/Intl. */
function formatTime(time: string): string {
  const [hourStr, minute] = time.split(":");
  const hour24 = Number.parseInt(hourStr ?? "0", 10);
  const period = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12}:${minute} ${period}`;
}

export function TodayScreen({
  displayName,
  week,
  babyCount,
  isPostTerm,
  stage,
  reminders,
  reading,
  showWeeklyReflection,
  weeklyReflectionText,
  showCheckupNudge,
  transcriber = webSpeechTranscriber,
  onSubmitCheckin,
  doctorName,
  clinicName,
}: TodayScreenProps) {
  const t = useTranslations("today");
  const tNav = useTranslations("nav");
  const [checkinResult, setCheckinResult] = useState<
    (Pick<TriageResultProps, "severity" | "guidance"> & { feeling: Feeling | null }) | null
  >(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const bloomActive = useBloomOnStageChange(week);

  if (isPostTerm) {
    return (
      <TodayEdgeState
        state="overdue"
        stage={stage}
        onPrimary={() => {
          /* "Continue" simply dismisses back to a normal render on the next visit --
             there is nothing else to do here, since the holding message IS the
             normal state for a post-term pregnancy until her dates are updated. */
        }}
      />
    );
  }

  const nextReminder = reminders[0] ?? null;
  const reminderText = !nextReminder
    ? t("reminders.nothingDue")
    : nextReminder.kind === "dose"
      ? t("reminders.dose", { medicineName: nextReminder.medicineName, time: formatTime(nextReminder.scheduledTime) })
      : t("reminders.appointment", { title: nextReminder.title });

  async function handleCheckinSubmit(input: { text: string; feeling: Feeling | null; inputMethod: "text" | "voice" }) {
    const result = await onSubmitCheckin({ body: input.text, feeling: input.feeling, inputMethod: input.inputMethod });
    if (result.ok) {
      setCheckinResult({ severity: result.severity, guidance: result.guidance, feeling: input.feeling });
    }
    // A failed save hands off to TodayEdgeState's save_failed state, wired by
    // the page-level parent that owns retry/navigation; this component only
    // needs to not crash on a non-ok result, which it doesn't.
  }

  return (
    <div className="flex flex-col gap-lg py-screen">
      {/* The design's greeting reads as the screen's title visually, but it's a
          <p>, not a heading -- axe's page-has-heading-one rule caught the gap
          (tests/e2e/today.spec.ts). A visually-hidden <h1> fixes it for screen
          readers without changing anything sighted users see, same sr-only
          pattern as Button.tsx and Skeleton.tsx. */}
      <h1 className="sr-only">{tNav("today")}</h1>
      <div className="flex flex-col items-center gap-sm">
        <div className="relative flex flex-col items-center py-xs">
          {/* The signature ambient moment (Mamaroo-Designfinal.md §5/§6): a soft
              breathing glow behind the week-progress hero, always on, plus a
              one-shot "bloom" burst on a stage-change day. Both decorative,
              aria-hidden, and behind the illustration in stacking order. */}
          <div
            aria-hidden="true"
            className="motion-safe:animate-[mr-breathe_7s_ease-in-out_infinite] pointer-events-none absolute top-[90px] left-1/2 size-[220px] -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ background: "radial-gradient(circle, var(--color-soft-coral), var(--color-peach) 60%, transparent 75%)" }}
          />
          {bloomActive && (
            <div
              aria-hidden="true"
              className="motion-safe:animate-[mr-bloom_var(--motion-bloom)_ease-out_forwards] pointer-events-none absolute top-[78px] left-1/2 size-[180px] -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{ background: "radial-gradient(circle, rgba(255,197,61,0.55), rgba(255,197,61,0) 70%)" }}
            />
          )}
          <div className="relative flex justify-center gap-sm">
            {Array.from({ length: babyCount }, (_, i) => (
              <IllustrationContainer
                key={i}
                lottieUrl={stage.lottieUrl}
                staticSrc={stage.staticSrc}
                alt={babyCount > 1 ? t("weekTagTwins", { week }) : t("weekTag", { week })}
              />
            ))}
          </div>
        </div>
        <span className="relative rounded-full bg-surface-raised px-md py-xs text-body-sm font-medium text-text-primary shadow-1">
          {babyCount > 1 ? t("weekTagTwins", { week }) : t("weekTag", { week })}
        </span>
        <p className="text-body text-text-primary">{t("greeting", { name: displayName })}</p>
      </div>

      {nextReminder ? (
        <button
          type="button"
          data-testid="next-reminder"
          onClick={() => {
            if (nextReminder.kind === "dose") setSheetOpen(true);
          }}
          className="flex items-center justify-center gap-sm text-body-sm text-text-primary"
        >
          {t("reminders.next", { reminder: reminderText })}
        </button>
      ) : (
        <p data-testid="next-reminder" className="text-center text-body-sm text-text-secondary">
          {reminderText}
        </p>
      )}

      <div data-testid="primary-emphasis">
        <FeelingBox onSubmit={handleCheckinSubmit} transcriber={transcriber} />
      </div>

      {checkinResult && (
        <TriageResult
          severity={checkinResult.severity}
          guidance={checkinResult.guidance}
          feeling={checkinResult.feeling}
          doctorName={doctorName}
          clinicName={clinicName}
        />
      )}

      <Link
        href="/today/activity"
        className="tap-target mx-auto flex items-center gap-sm rounded-full bg-surface-raised px-lg py-sm text-body-sm font-medium text-text-primary shadow-1"
      >
        {t("seeLoggedBefore")}
      </Link>

      <div className="flex flex-col gap-md">
        <h2 className="text-h3 font-display font-semibold text-text-primary">{t("forYouToday")}</h2>
        <div className="grid grid-cols-2 gap-md">
          {reading.map((item) => (
            <Link key={item.id} href={`/today/listen/${item.slug}`} className="block">
              <Card accent="coral" accentIcon={readingIcon(item.kind)} className="flex h-full flex-col gap-sm">
                <p className="text-caption font-semibold uppercase tracking-[0.04em] text-text-secondary">
                  {item.title}
                </p>
                <p className="text-body-sm text-text-primary">{item.summary}</p>
              </Card>
            </Link>
          ))}

          <Link href="/today/meal-plan" className="block">
            <Card accent="gold" accentIcon="ForkKnife" className="flex h-full flex-col gap-sm">
              <p className="text-caption font-semibold uppercase tracking-[0.04em] text-text-secondary">
                {t("mealPlanCardLabel")}
              </p>
              <p className="text-body-sm text-text-primary">{t("mealPlanCardBody")}</p>
            </Card>
          </Link>
        </div>
      </div>

      {showWeeklyReflection && (
        <div className="rounded-lg bg-[rgba(255,164,143,0.14)] p-lg">
          <p className="text-body text-text-primary">{weeklyReflectionText}</p>
        </div>
      )}

      {showCheckupNudge && (
        <Link
          href="/care/questions"
          className="tap-target flex items-center gap-md rounded-lg bg-gold p-md text-left shadow-2"
        >
          <div className="min-w-0 flex-1">
            <p className="text-body-sm font-semibold text-text-primary">{t("checkupNudgeTitle")}</p>
            <p className="text-body-sm text-text-secondary">{t("checkupNudgeBody")}</p>
          </div>
        </Link>
      )}

      {nextReminder && nextReminder.kind === "dose" && (
        <MedicineQuickActionSheet
          open={sheetOpen}
          medicineId={nextReminder.refId}
          medicineName={nextReminder.medicineName}
          scheduledDate={new Date().toISOString().slice(0, 10)}
          scheduledTime={formatTime(nextReminder.scheduledTime)}
          onClose={() => setSheetOpen(false)}
        />
      )}
    </div>
  );
}
