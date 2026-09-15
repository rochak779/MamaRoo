"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { deactivateMedicine, logDose, updateMedicine } from "@/app/actions/medicines";
import { track } from "@/components/AnalyticsProvider";
import { EmptyState } from "@/components/patterns/EmptyState";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { useToast } from "@/components/ui/ToastProvider";
import { cn } from "@/lib/cn";
import { EVENTS } from "@/lib/analytics/events";

// Same fixed IST offset MedicineQuickActionSheet already hardcodes -- Asia/Kolkata
// carries no DST, so this never drifts.
function isLate(today: string, time: string): boolean {
  return Date.now() > new Date(`${today}T${time}:00+05:30`).getTime();
}

export interface MedicineListItem {
  id: string;
  name: string;
  dosage: string | null;
  isPriority: boolean;
  status: "pending" | "taken" | "skipped";
  /** The dose to act on -- the earliest of today's doses not yet logged. Null once
   * every dose today is resolved (all taken or skipped). */
  nextPendingTime: string | null;
  todayTimes: string[];
}

export interface MedicineListProps {
  items: MedicineListItem[];
  today: string;
  onLogDose?: typeof logDose;
  onDeactivate?: typeof deactivateMedicine;
  onReschedule?: typeof updateMedicine;
}

export function MedicineList({
  items,
  today,
  onLogDose = logDose,
  onDeactivate = deactivateMedicine,
  onReschedule = updateMedicine,
}: MedicineListProps) {
  const t = useTranslations("care.medicines");
  const { show } = useToast();
  const [statuses, setStatuses] = useState<Record<string, "pending" | "taken" | "skipped">>({});
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);

  const timeChips: { label: string; time: string }[] = [
    { label: t("rescheduleMorning"), time: "08:00" },
    { label: t("rescheduleAfternoon"), time: "13:00" },
    { label: t("rescheduleEvening"), time: "18:00" },
    { label: t("rescheduleNight"), time: "21:00" },
  ];

  const visible = items.filter((item) => !removedIds.has(item.id));
  const priority = visible.filter((item) => item.isPriority);
  const other = visible.filter((item) => !item.isPriority);

  function statusOf(item: MedicineListItem): "pending" | "taken" | "skipped" {
    return statuses[item.id] ?? item.status;
  }

  async function log(item: MedicineListItem, status: "taken" | "skipped") {
    const time = item.nextPendingTime;
    if (!time) return;
    setStatuses((prev) => ({ ...prev, [item.id]: status })); // optimistic
    const result = await onLogDose({
      medicineId: item.id,
      scheduledDate: today,
      scheduledTime: time,
      status,
    });
    if (result.ok) {
      show(status === "taken" ? t("takenBadge") : t("skippedBadge"));
      track(EVENTS.medicine_dose_logged, { status, late: isLate(today, time) });
    }
  }

  async function confirmDeactivate(id: string) {
    setConfirmId(null);
    const result = await onDeactivate(id);
    if (result.ok) setRemovedIds((prev) => new Set(prev).add(id));
  }

  async function applyReschedule(id: string, time: string) {
    setRescheduleId(null);
    await onReschedule(id, { scheduleTimes: [time] });
  }

  if (visible.length === 0) {
    return <EmptyState iconName="Pill" message={t("emptyState")} />;
  }

  return (
    <div className="flex flex-col gap-lg">
      {priority.length > 0 && (
        <div className="flex flex-col gap-sm rounded-md bg-peach p-md shadow-2">
          <p className="text-body font-display font-semibold text-text-primary">{t("trackerTitle")}</p>
          {priority.map((item) => {
            const status = statusOf(item);
            const taken = status === "taken";
            return (
              <div key={item.id} className="flex items-center justify-between gap-sm rounded-sm bg-surface-raised px-md py-sm">
                <div className="flex flex-col">
                  <span className="text-body-sm font-medium text-text-primary">{item.name}</span>
                  <span className="text-caption text-text-secondary">
                    {[item.dosage, item.todayTimes.join(", ")].filter(Boolean).join(", ")}
                  </span>
                </div>
                <button
                  type="button"
                  aria-label={item.name}
                  aria-pressed={taken}
                  onClick={() => void log(item, "taken")}
                  disabled={taken}
                  className={cn(
                    "tap-target flex size-[32px] items-center justify-center rounded-full",
                    taken ? "bg-accent-secondary text-surface-raised" : "bg-surface text-text-secondary",
                  )}
                >
                  <span aria-hidden="true">✓</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {other.length > 0 && (
        <div className="flex flex-col gap-sm">
          <p className="text-body font-display font-semibold text-text-primary">{t("otherMedicines")}</p>
          {other.map((item) => {
            const status = statusOf(item);
            // "Soften on skip" (README): a skipped dose never reads as a warning --
            // it settles into a quieter, translucent card instead of a red state.
            const isSkipped = status === "skipped";
            return (
              <div
                key={item.id}
                className={cn(
                  "flex flex-col gap-sm rounded-md p-md",
                  isSkipped ? "bg-surface-raised/70 shadow-none" : "bg-surface-raised shadow-1",
                )}
              >
                <div className="flex flex-col">
                  <span className="text-body-sm font-medium text-text-primary">{item.name}</span>
                  <span className="text-caption text-text-secondary">
                    {[item.dosage, item.todayTimes.join(", ")].filter(Boolean).join(", ")}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-sm">
                  {status === "pending" && (
                    <>
                      <button
                        type="button"
                        onClick={() => void log(item, "taken")}
                        className="tap-target rounded-full bg-accent-secondary/15 px-md py-xs text-caption font-semibold text-accent-secondary"
                      >
                        {t("takenLabel")}
                      </button>
                      <button
                        type="button"
                        onClick={() => void log(item, "skipped")}
                        className="tap-target rounded-full bg-surface px-md py-xs text-caption font-semibold text-text-primary"
                      >
                        {t("skipLabel")}
                      </button>
                    </>
                  )}
                  {status === "taken" && (
                    <span className="text-caption font-semibold text-accent-secondary">{t("takenBadge")}</span>
                  )}
                  {status === "skipped" && (
                    <span className="text-caption text-text-secondary">{t("skippedBadge")}</span>
                  )}
                  <button
                    type="button"
                    onClick={() => setRescheduleId(item.id)}
                    className="tap-target rounded-full border border-divider px-md py-xs text-caption font-semibold text-text-primary"
                  >
                    {t("rescheduleLabel")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmId(item.id)}
                    className="tap-target ml-auto text-caption text-text-secondary underline"
                  >
                    {t("stopMedicine")}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <BottomSheet open={confirmId !== null} onClose={() => setConfirmId(null)} title={t("deactivateConfirmTitle")}>
        <p className="text-body text-text-secondary">{t("deactivateConfirmBody")}</p>
        <div className="mt-md flex gap-sm">
          <button
            type="button"
            onClick={() => setConfirmId(null)}
            className="tap-target flex-1 rounded-sm border border-divider px-lg py-sm text-button font-medium text-text-primary"
          >
            {t("deactivateCancel")}
          </button>
          <button
            type="button"
            onClick={() => confirmId && void confirmDeactivate(confirmId)}
            className="tap-target flex-1 rounded-sm bg-accent-primary px-lg py-sm text-button font-medium text-surface-raised"
          >
            {t("deactivateConfirm")}
          </button>
        </div>
      </BottomSheet>

      <BottomSheet
        open={rescheduleId !== null}
        onClose={() => setRescheduleId(null)}
        title={t("rescheduleTitle", { name: visible.find((i) => i.id === rescheduleId)?.name ?? "" })}
      >
        <p className="text-body-sm text-text-secondary">{t("rescheduleSubtitle")}</p>
        <div className="mt-md flex flex-col gap-sm">
          {timeChips.map((chip) => (
            <button
              key={chip.time}
              type="button"
              onClick={() => rescheduleId && void applyReschedule(rescheduleId, chip.time)}
              className="tap-target rounded-sm bg-surface px-md py-sm text-left text-body-sm font-medium text-text-primary"
            >
              {chip.label}
            </button>
          ))}
        </div>
      </BottomSheet>
    </div>
  );
}
