"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { signedReportUrl } from "@/app/actions/reports";
import { EmptyState } from "@/components/patterns/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { APP_TIMEZONE } from "@/lib/config";
import { mimeGroup, type ReportRecord } from "@/lib/domain/reports";

const PAGE_SIZE = 15;

export interface ReportListProps {
  reports: ReportRecord[];
  onOpen: (report: ReportRecord) => void;
  onAdd: () => void;
  onSignedUrl?: typeof signedReportUrl;
}

/**
 * Fetches the report's own signed thumbnail once on mount -- the same
 * mechanism ReportViewer already uses for the full-size view, reused here
 * rather than always falling back to a generic file icon (README: tiles
 * should show the actual uploaded photo). PDFs have no rendered page to
 * show as a thumbnail, so they keep the plain FilePdf icon; only images
 * attempt a real preview. A single fetch (no refresh timer) is enough for
 * a thumbnail glanced at while browsing the list, unlike the full viewer.
 */
function ReportThumbnail({
  report,
  onSignedUrl,
}: {
  report: ReportRecord;
  onSignedUrl: typeof signedReportUrl;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const isImage = mimeGroup(report.mimeType) === "image";

  useEffect(() => {
    if (!isImage) return;
    let cancelled = false;
    void onSignedUrl({ reportId: report.id }).then((result) => {
      if (!cancelled && result.ok) setUrl(result.url);
    });
    return () => {
      cancelled = true;
    };
  }, [isImage, onSignedUrl, report.id]);

  if (isImage && url) {
    // eslint-disable-next-line @next/next/no-img-element -- a signed, time-limited URL isn't a static asset Next's image optimizer can cache.
    return <img src={url} alt="" data-testid="report-thumbnail" className="h-full w-full object-cover" />;
  }

  return <Icon name={isImage ? "Image" : "FilePdf"} size="hero" />;
}

export function ReportList({ reports, onOpen, onAdd, onSignedUrl = signedReportUrl }: ReportListProps) {
  const t = useTranslations("reports");
  const locale = useLocale();
  const [expanded, setExpanded] = useState(false);

  const visible = expanded ? reports : reports.slice(0, PAGE_SIZE);
  const remaining = reports.length - visible.length;

  function dateLabel(iso: string): string {
    return new Intl.DateTimeFormat(locale === "hi" ? "hi-IN" : "en-IN", {
      day: "numeric",
      month: "long",
      timeZone: APP_TIMEZONE,
    }).format(new Date(iso));
  }

  return (
    <div className="flex flex-col gap-md">
      {reports.length === 0 && <EmptyState iconName="FileText" message={t("empty")} />}

      <div className="grid grid-cols-2 gap-md">
        {visible.map((report) => (
          <button
            key={report.id}
            type="button"
            onClick={() => onOpen(report)}
            className="tap-target flex flex-col gap-xs rounded-[16px] bg-surface-raised p-sm text-left shadow-1"
          >
            <span
              aria-hidden="true"
              className="flex h-[110px] w-full items-center justify-center overflow-hidden rounded-[14px] bg-surface"
            >
              <ReportThumbnail report={report} onSignedUrl={onSignedUrl} />
            </span>
            <span className="mt-xs block text-body-sm font-semibold text-text-primary">{report.title}</span>
            <span className="block text-caption text-text-secondary">{dateLabel(report.reportDate)}</span>
          </button>
        ))}

        {/* Inside the photo grid as a dashed tile (README's explicit pattern), not a
            separate button below it -- also the only "add" affordance while the list
            is empty, so a first-time user always has a way in. */}
        <button
          type="button"
          onClick={onAdd}
          className="tap-target flex min-h-[158px] flex-col items-center justify-center gap-xs rounded-[16px] border-[1.5px] border-dashed border-divider-strong p-sm text-text-primary"
        >
          <Icon name="Plus" size="hero" />
          <span className="text-body-sm font-semibold">{t("addReport")}</span>
        </button>
      </div>

      {remaining > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="tap-target self-start text-caption font-semibold text-accent-primary underline"
        >
          {t("showMore", { count: remaining })}
        </button>
      )}
    </div>
  );
}
