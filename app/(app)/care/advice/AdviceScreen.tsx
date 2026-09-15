"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AdviceForm } from "@/app/(app)/care/advice/AdviceForm";
import { AdviceList } from "@/app/(app)/care/advice/AdviceList";
import { BackButton } from "@/components/patterns/BackButton";
import { Button } from "@/components/ui/Button";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { sortAdviceByRecency, type AdviceRecord, type AdviceUpdateRecord } from "@/lib/domain/advice";

export interface AdviceScreenProps {
  initialAdvice: AdviceRecord[];
}

type Sheet = "add" | AdviceRecord | null;

export function AdviceScreen({ initialAdvice }: AdviceScreenProps) {
  const t = useTranslations("advice");
  const [items, setItems] = useState(initialAdvice);
  const [sheet, setSheet] = useState<Sheet>(null);

  const editing = sheet && sheet !== "add" ? sheet : null;

  function handleCreated(advice: AdviceRecord) {
    setItems((prev) => sortAdviceByRecency([advice, ...prev]));
    setSheet(null);
  }

  function handleAppended(adviceId: string, update: AdviceUpdateRecord) {
    setItems((prev) =>
      sortAdviceByRecency(
        prev.map((advice) =>
          advice.id === adviceId
            ? { ...advice, isReminder: false, updates: [...advice.updates, update] }
            : advice,
        ),
      ),
    );
    setSheet(null);
  }

  function handleReminderToggled(adviceId: string, isReminder: boolean) {
    setItems((prev) => prev.map((advice) => (advice.id === adviceId ? { ...advice, isReminder } : advice)));
  }

  return (
    <div className="flex flex-col gap-lg py-screen">
      <header className="flex items-center gap-md">
        <BackButton href="/care" label={t("backLabel")} />
        <h1 className="font-display text-h1 text-text-primary">{t("title")}</h1>
      </header>

      <AdviceList items={items} onEdit={(advice) => setSheet(advice)} onReminderToggled={handleReminderToggled} />

      <Button type="button" sticky onClick={() => setSheet("add")}>
        {t("addAdvice")}
      </Button>

      <BottomSheet
        open={sheet !== null}
        onClose={() => setSheet(null)}
        title={sheet === "add" ? t("addSheetTitle") : t("editSheetTitle")}
      >
        {sheet && (
          <AdviceForm
            advice={editing}
            onCreated={handleCreated}
            onAppended={handleAppended}
            onClose={() => setSheet(null)}
          />
        )}
      </BottomSheet>
    </div>
  );
}
