"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { completeAppointment } from "@/app/actions/appointments";
import { EmptyState } from "@/components/patterns/EmptyState";
import { APP_TIMEZONE } from "@/lib/config";
import { splitAppointments, type AppointmentRow, type SplitAppointment } from "@/lib/domain/appointments";

const PAST_PAGE_SIZE = 15;

export interface AppointmentListProps {
  appointments: AppointmentRow[];
  now: number;
  onComplete?: typeof completeAppointment;
  onEdit: (appointment: SplitAppointment) => void;
}

function useDateLabel() {
  const locale = useLocale();
  return (iso: string) =>
    new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", timeZone: APP_TIMEZONE }).format(new Date(iso));
}

function useTimeLabel() {
  const locale = useLocale();
  return (iso: string) =>
    new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit", timeZone: APP_TIMEZONE }).format(
      new Date(iso),
    );
}

export function AppointmentList({
  appointments,
  now,
  onComplete = completeAppointment,
  onEdit,
}: AppointmentListProps) {
  const t = useTranslations("appointments");
  const dateLabel = useDateLabel();
  const timeLabel = useTimeLabel();
  const [pastExpanded, setPastExpanded] = useState(false);
  const [statuses, setStatuses] = useState<Record<string, "completed" | "cancelled">>({});

  const { upcoming, past: allPast } = splitAppointments({ appointments, now });
  // splitAppointments buckets a needsClosing appointment into `past` (its date has
  // passed), but it's rendered as a prompt alongside Upcoming, not folded into the
  // plain past list -- pulled back out here, purely for display grouping.
  const needsClosing = allPast.filter((a) => a.needsClosing && !statuses[a.id]);
  const past = allPast.filter((a) => !a.needsClosing);

  const visiblePast = pastExpanded ? past : past.slice(0, PAST_PAGE_SIZE);
  const remaining = past.length - visiblePast.length;

  async function handleComplete(id: string) {
    setStatuses((prev) => ({ ...prev, [id]: "completed" }));
    await onComplete(id);
  }

  function cardName(a: SplitAppointment) {
    return [a.doctor_name, a.clinic_name].filter(Boolean).join(", ");
  }

  function statusBadge(a: SplitAppointment) {
    if (a.status === "cancelled") return t("cancelledBadge");
    return t("completedBadge");
  }

  return (
    <div className="flex flex-col gap-lg">
      <div className="flex flex-col gap-sm">
        <h2 className="text-h3 font-display font-semibold text-text-primary">{t("upcomingHeading")}</h2>
        {upcoming.length === 0 && needsClosing.length === 0 && (
          <EmptyState iconName="CalendarBlank" message={t("emptyUpcoming")} />
        )}
        {needsClosing.map((a) => (
          // Pale tint, not full-saturation peach -- the README is explicit that this
          // prompt should never read as a warning, and solid peach reads as one.
          <div key={a.id} className="flex flex-col gap-sm rounded-md bg-blush p-lg">
            <p className="font-display text-body font-bold text-text-primary">{t("needsClosingPrompt")}</p>
            <p className="text-caption text-text-secondary">
              {cardName(a)}, {dateLabel(a.scheduled_at)}
            </p>
            <div className="flex flex-wrap gap-sm">
              <button
                type="button"
                onClick={() => void handleComplete(a.id)}
                className="tap-target rounded-full bg-accent-secondary px-lg py-sm text-caption font-bold text-surface-raised"
              >
                {t("markCompleted")}
              </button>
              <button
                type="button"
                onClick={() => onEdit(a)}
                className="tap-target rounded-full border border-divider bg-surface-raised px-lg py-sm text-caption font-semibold text-text-primary"
              >
                {t("reschedule")}
              </button>
            </div>
          </div>
        ))}
        {upcoming.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => onEdit(a)}
            className="tap-target flex flex-col gap-xs rounded-md bg-surface-raised p-md text-left shadow-1"
          >
            <div className="flex items-start justify-between gap-sm">
              <div className="flex flex-col">
                <span className="text-body-sm font-semibold text-text-primary">{cardName(a)}</span>
                <span className="text-caption text-text-secondary">
                  {dateLabel(a.scheduled_at)}, {timeLabel(a.scheduled_at)}
                </span>
              </div>
              <span className="shrink-0 rounded-full bg-accent-secondary/15 px-md py-xs text-caption font-semibold text-accent-secondary">
                {t("upcomingBadge")}
              </span>
            </div>
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-sm">
        <h2 className="text-h3 font-display font-semibold text-text-primary">{t("pastHeading")}</h2>
        {past.length === 0 && <EmptyState iconName="CalendarBlank" message={t("emptyPast")} />}
        {visiblePast.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => onEdit(a)}
            className="tap-target flex flex-col gap-xs rounded-md bg-surface p-md text-left opacity-75"
          >
            <div className="flex items-start justify-between gap-sm">
              <div className="flex flex-col">
                <span className="text-body-sm font-semibold text-text-primary">{cardName(a)}</span>
                <span className="text-caption text-text-secondary">
                  {dateLabel(a.scheduled_at)}, {timeLabel(a.scheduled_at)}
                </span>
              </div>
              <span className="shrink-0 rounded-full bg-text-primary/8 px-md py-xs text-caption font-semibold text-text-secondary">
                {statusBadge(a)}
              </span>
            </div>
          </button>
        ))}
        {remaining > 0 && (
          <button
            type="button"
            onClick={() => setPastExpanded(true)}
            className="tap-target self-start text-caption font-semibold text-accent-primary underline"
          >
            {t("showMore", { count: remaining })}
          </button>
        )}
      </div>
    </div>
  );
}
