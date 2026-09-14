"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { createMedicine, type CreateMedicineResult } from "@/app/actions/medicines";
import { AdherenceGrid } from "@/app/(app)/care/medicines/AdherenceGrid";
import { MedicineForm } from "@/app/(app)/care/medicines/MedicineForm";
import { MedicineList, type MedicineListItem } from "@/app/(app)/care/medicines/MedicineList";
import { track } from "@/components/AnalyticsProvider";
import { BackButton } from "@/components/patterns/BackButton";
import { Button } from "@/components/ui/Button";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { EVENTS } from "@/lib/analytics/events";
import { isPriorityMedicine, type MedicineValue } from "@/lib/domain/medicines";
import type { AdherenceCell } from "@/lib/domain/adherence";
import type { Database } from "@/lib/supabase/database.types";

type MedicineRow = Database["public"]["Tables"]["medicines"]["Row"];

export interface MedicinesScreenProps {
  today: string;
  items: MedicineListItem[];
  cells: AdherenceCell[];
  existingActiveNames: string[];
  onSave?: (input: MedicineValue) => Promise<CreateMedicineResult>;
}

export function MedicinesScreen({ today, items, cells, existingActiveNames, onSave = createMedicine }: MedicinesScreenProps) {
  const t = useTranslations("care.medicines");
  const [addOpen, setAddOpen] = useState(false);
  const [ownItems, setOwnItems] = useState(items);

  function handleSaved(medicine: MedicineRow) {
    setOwnItems((prev) => [
      ...prev,
      {
        id: medicine.id,
        name: medicine.name,
        dosage: medicine.dosage,
        isPriority: isPriorityMedicine(medicine.name),
        status: "pending",
        nextPendingTime: medicine.schedule_times[0]?.slice(0, 5) ?? null,
        todayTimes: medicine.schedule_times.map((time: string) => time.slice(0, 5)),
      },
    ]);
    setAddOpen(false);
    track(EVENTS.medicine_added, { schedule_count: medicine.schedule_times.length });
  }

  return (
    <div className="flex flex-col gap-lg py-screen">
      <header className="flex items-center gap-md">
        <BackButton href="/care" label={t("backLabel")} />
        <h1 className="font-display text-h1 text-text-primary">{t("title")}</h1>
      </header>

      <div className="flex flex-col gap-sm">
        <h2 className="text-h3 font-display font-semibold text-text-primary">{t("adherence.title")}</h2>
        <AdherenceGrid cells={cells} />
      </div>

      <MedicineList items={ownItems} today={today} />

      <Button type="button" onClick={() => setAddOpen(true)}>
        {t("addMedicine")}
      </Button>

      <BottomSheet open={addOpen} onClose={() => setAddOpen(false)} title={t("addSheetTitle")}>
        <p className="text-body-sm text-text-secondary">{t("addSheetSubtitle")}</p>
        <div className="mt-md">
          <MedicineForm
            existingActiveNames={existingActiveNames}
            onSave={onSave}
            onSaved={handleSaved}
            onCancel={() => setAddOpen(false)}
          />
        </div>
      </BottomSheet>
    </div>
  );
}
