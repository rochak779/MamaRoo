"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ReportCapture } from "@/app/(app)/care/reports/ReportCapture";
import { ReportList } from "@/app/(app)/care/reports/ReportList";
import { ReportViewer } from "@/app/(app)/care/reports/ReportViewer";
import { BackButton } from "@/components/patterns/BackButton";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { sortReportsByDate, type ReportRecord } from "@/lib/domain/reports";

export interface ReportsScreenProps {
  initialReports: ReportRecord[];
}

type Sheet = "add" | ReportRecord | null;

export function ReportsScreen({ initialReports }: ReportsScreenProps) {
  const t = useTranslations("reports");
  const [reports, setReports] = useState(initialReports);
  const [sheet, setSheet] = useState<Sheet>(null);

  const viewing = sheet && sheet !== "add" ? sheet : null;

  function handleUploaded(report: ReportRecord) {
    setReports((prev) => sortReportsByDate([report, ...prev]));
    setSheet(null);
  }

  function handleUpdated(updated: ReportRecord) {
    setReports((prev) => sortReportsByDate(prev.map((r) => (r.id === updated.id ? updated : r))));
    setSheet(updated);
  }

  function handleDeleted(reportId: string) {
    setReports((prev) => prev.filter((r) => r.id !== reportId));
  }

  return (
    <div className="flex flex-col gap-lg py-screen">
      <header className="flex items-center gap-md">
        <BackButton href="/care" label={t("backLabel")} />
        <div>
          <h1 className="font-display text-h1 text-text-primary">{t("title")}</h1>
          <p className="mt-xs text-body-sm text-text-secondary">{t("subtitle")}</p>
        </div>
      </header>

      <ReportList reports={reports} onOpen={(report) => setSheet(report)} onAdd={() => setSheet("add")} />

      <BottomSheet
        open={sheet !== null}
        onClose={() => setSheet(null)}
        title={sheet === "add" ? t("addSheetTitle") : t("viewSheetTitle")}
      >
        {sheet === "add" && (
          <ReportCapture
            existingReports={reports.map((r) => ({ sizeBytes: r.sizeBytes, mimeType: r.mimeType }))}
            onUploaded={handleUploaded}
            onClose={() => setSheet(null)}
          />
        )}
        {viewing && (
          <ReportViewer
            report={viewing}
            onUpdated={handleUpdated}
            onDeleted={handleDeleted}
            onClose={() => setSheet(null)}
          />
        )}
      </BottomSheet>
    </div>
  );
}
