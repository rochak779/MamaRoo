"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { addAppointment } from "@/app/actions/appointments";
import { AppointmentForm } from "@/app/(app)/care/appointments/AppointmentForm";
import { AppointmentList } from "@/app/(app)/care/appointments/AppointmentList";
import { track } from "@/components/AnalyticsProvider";
import { BackButton } from "@/components/patterns/BackButton";
import { Button } from "@/components/ui/Button";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { EVENTS } from "@/lib/analytics/events";
import { diffDays, todayInAppZone } from "@/lib/domain/dates";
import type { AppointmentRow, SplitAppointment } from "@/lib/domain/appointments";

export interface AppointmentsScreenProps {
  appointments: AppointmentRow[];
  now: number;
  defaultDoctorName: string | null;
  defaultClinicName: string | null;
  onAdd?: typeof addAppointment;
}

type Sheet = "add" | SplitAppointment | null;

export function AppointmentsScreen({
  appointments,
  now,
  defaultDoctorName,
  defaultClinicName,
  onAdd = addAppointment,
}: AppointmentsScreenProps) {
  const t = useTranslations("appointments");
  const [items, setItems] = useState(appointments);
  const [sheet, setSheet] = useState<Sheet>(null);

  function handleAdded(appointment: AppointmentRow) {
    setItems((prev) => [...prev, appointment]);
    setSheet(null);
    const days_ahead = diffDays(todayInAppZone(), appointment.scheduled_at.slice(0, 10));
    track(EVENTS.appointment_added, { days_ahead });
  }

  function handleUpdated(updated: { id: string } & Partial<AppointmentRow>) {
    setItems((prev) => prev.map((a) => (a.id === updated.id ? { ...a, ...updated } : a)));
    setSheet(null);
  }

  function handleCancelled(id: string) {
    setItems((prev) => prev.map((a) => (a.id === id ? { ...a, status: "cancelled" as const } : a)));
    setSheet(null);
  }

  const editing = sheet && sheet !== "add" ? sheet : null;

  return (
    <div className="flex flex-col gap-lg py-screen">
      <header className="flex items-center gap-md">
        <BackButton href="/care" label={t("backLabel")} />
        <h1 className="font-display text-h1 text-text-primary">{t("title")}</h1>
      </header>

      <AppointmentList appointments={items} now={now} onEdit={(a) => setSheet(a)} />

      <Button type="button" sticky onClick={() => setSheet("add")}>
        {t("addAppointment")}
      </Button>

      <BottomSheet
        open={sheet !== null}
        onClose={() => setSheet(null)}
        title={sheet === "add" ? t("addSheetTitle") : t("editSheetTitle")}
      >
        {sheet && (
          <AppointmentForm
            appointment={editing}
            defaultDoctorName={defaultDoctorName}
            defaultClinicName={defaultClinicName}
            onAdd={onAdd}
            onSaved={(saved) => (sheet === "add" ? handleAdded(saved as AppointmentRow) : handleUpdated(saved as { id: string } & Partial<AppointmentRow>))}
            onCancelled={() => editing && handleCancelled(editing.id)}
            onClose={() => setSheet(null)}
          />
        )}
      </BottomSheet>
    </div>
  );
}
