"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { logDose } from "@/app/actions/medicines";
import { track } from "@/components/AnalyticsProvider";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { EVENTS } from "@/lib/analytics/events";

type LoggedStatus = "taken" | "skipped";
type Confirmation = LoggedStatus | "later";

export interface MedicineQuickActionSheetProps {
  open?: boolean;
  medicineId: string;
  medicineName: string;
  scheduledDate: string;
  scheduledTime: string;
  onClose: () => void;
  onLog?: (status: LoggedStatus) => void;
  onSnooze?: (newTime: string) => void;
}

export function bumpMedicineTime(time: string): string {
  const match = time.match(/^(\d{1,2}):(\d{2}) (AM|PM)$/);
  if (!match) return time;

  let hour = Number.parseInt(match[1]!, 10) + 1;
  let period = match[3]!;
  if (hour === 12) period = period === "AM" ? "PM" : "AM";
  if (hour > 12) hour -= 12;
  return `${hour}:${match[2]!} ${period}`;
}

function scheduledAt(date: string, time: string): number {
  const twelveHour = time.match(/^(\d{1,2}):(\d{2}) (AM|PM)$/);
  if (twelveHour) {
    let hour = Number.parseInt(twelveHour[1]!, 10) % 12;
    if (twelveHour[3] === "PM") hour += 12;
    return new Date(`${date}T${String(hour).padStart(2, "0")}:${twelveHour[2]!}:00+05:30`).getTime();
  }
  return new Date(`${date}T${time}+05:30`).getTime();
}

export function MedicineQuickActionSheet({
  open = true,
  medicineId,
  medicineName,
  scheduledDate,
  scheduledTime,
  onClose,
  onLog,
  onSnooze,
}: MedicineQuickActionSheetProps) {
  const t = useTranslations("today.medicineSheet");
  const [displayedTime, setDisplayedTime] = useState(scheduledTime);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function chooseLoggedStatus(status: LoggedStatus) {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const result = await logDose({
        medicineId,
        scheduledDate,
        scheduledTime: displayedTime,
        status,
      });
      if (!result.ok) return;

      setConfirmation(status);
      onLog?.(status);
      track(EVENTS.medicine_dose_logged, {
        status,
        late: scheduledAt(scheduledDate, displayedTime) < Date.now(),
      });
    } finally {
      setIsSaving(false);
    }
  }

  function chooseLater() {
    const newTime = bumpMedicineTime(displayedTime);
    setDisplayedTime(newTime);
    setConfirmation("later");
    onSnooze?.(newTime);
  }

  const confirmationCopy = confirmation
    ? confirmation === "taken"
      ? t("takenConfirm")
      : confirmation === "skipped"
        ? t("skippedConfirm")
        : t("laterConfirm", { time: displayedTime })
    : null;

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={`${medicineName}, ${displayedTime}`}
      eyebrow={t("heading")}
    >
      {confirmationCopy ? (
        <div className="mt-lg text-center" aria-live="polite">
          <p className="text-body text-text-primary">{confirmationCopy}</p>
          <Button
            type="button"
            variant="tertiary"
            className="mt-xs"
            onClick={() => setConfirmation(null)}
          >
            {t("change")}
          </Button>
        </div>
      ) : (
        <div className="mt-lg flex flex-col gap-sm">
          <Button type="button" loading={isSaving} onClick={() => void chooseLoggedStatus("taken")}>
            {t("takenLabel")}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={isSaving}
            onClick={() => void chooseLoggedStatus("skipped")}
          >
            {t("skipLabel")}
          </Button>
          <Button type="button" variant="secondary" disabled={isSaving} onClick={chooseLater}>
            {t("laterLabel")}
          </Button>
        </div>
      )}

      <Link
        href="/care/medicines"
        className="tap-target mx-auto mt-md flex w-fit items-center justify-center px-md text-caption text-text-secondary underline decoration-divider underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary"
      >
        {t("seeAll")}
      </Link>
    </BottomSheet>
  );
}
