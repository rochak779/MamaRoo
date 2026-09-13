"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { track } from "@/components/AnalyticsProvider";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { EVENTS } from "@/lib/analytics/events";
import { PRODUCT_NAME } from "@/lib/config";
import { useOnline } from "@/lib/pwa/useOnline";
import type { SummaryModel } from "@/lib/domain/summary";
import { SummaryDocument } from "@/app/(app)/care/summary/SummaryDocument";
import "@/styles/print.css";

export interface SummaryScreenProps {
  model: SummaryModel;
}

type Status = "idle" | "generating" | "ready";
type Note = "viewed" | "offline" | null;

/** The design's own mock (Doctor Visit Summary.dc.html) fakes a short delay
 * between tapping "Generate" and the document appearing -- kept here as
 * deliberate pacing, not real computation: the model is already built
 * server-side before this component ever mounts. Matches --motion-slow
 * (styles/tokens.css) by convention; a bare number isn't a CSS duration
 * literal, so tests/guards/no-raw-values.test.ts has no opinion on it. */
const GENERATE_DELAY_MS = 400;

export function SummaryScreen({ model }: SummaryScreenProps) {
  const t = useTranslations("summary");
  const router = useRouter();
  const online = useOnline();
  const [status, setStatus] = useState<Status>("idle");
  const [note, setNote] = useState<Note>(null);

  useEffect(() => {
    if (status === "ready") track(EVENTS.summary_viewed, { week: model.header.week });
    // Runs once per transition into "ready", not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  function generate() {
    setStatus("generating");
    setNote(null);
    window.setTimeout(() => setStatus("ready"), GENERATE_DELAY_MS);
  }

  function refresh() {
    setStatus("generating");
    setNote(null);
    router.refresh();
    window.setTimeout(() => setStatus("ready"), GENERATE_DELAY_MS);
  }

  function handleView() {
    setNote("viewed");
  }

  function handlePdf() {
    track(EVENTS.summary_printed, { week: model.header.week });
    setNote("viewed");
    window.print();
  }

  function handleWhatsapp() {
    if (!online) {
      setNote("offline");
      return;
    }
    const text = t("whatsappShareText", {
      productName: PRODUCT_NAME,
      url: typeof window !== "undefined" ? window.location.href : "",
    });
    if (typeof navigator !== "undefined" && navigator.share) {
      void navigator.share({ text }).catch(() => {
        /* User-cancelled share sheets throw -- not an error worth surfacing. */
      });
    } else if (typeof window !== "undefined") {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
    }
    setNote("viewed");
  }

  return (
    <section
      data-testid="summary-screen"
      className="mx-auto flex w-full max-w-[680px] flex-col gap-lg py-screen"
      aria-labelledby="summary-title"
    >
      <header className="flex items-start gap-md" data-print="hide">
        <Link
          href="/care"
          aria-label={t("backToCare")}
          className="tap-target inline-flex shrink-0 items-center justify-center rounded-full bg-surface-raised text-text-primary shadow-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary"
        >
          <Icon name="ArrowLeft" size="inline" />
        </Link>
        <div className="min-w-0 flex-1 pt-xs">
          <h1 id="summary-title" className="font-display text-h1 font-semibold text-text-primary">
            {t("title")}
          </h1>
        </div>
      </header>

      {status !== "ready" && (
        <div className="flex flex-col items-center gap-md rounded-[20px] bg-surface-raised p-xl text-center shadow-1">
          <p className="text-body text-text-primary">{status === "generating" ? t("generating") : t("idleLine")}</p>
          {status === "idle" && (
            <Button type="button" onClick={generate}>
              {t("generateCta")}
            </Button>
          )}
        </div>
      )}

      {status === "ready" && (
        <div className="flex flex-col rounded-[20px] bg-surface-raised p-lg shadow-1">
          <div className="mb-md flex items-center justify-end" data-print="hide">
            <Button type="button" variant="tertiary" onClick={refresh}>
              {t("refresh")}
            </Button>
          </div>

          <SummaryDocument model={model} />

          <div className="mt-lg flex gap-sm" data-print="hide">
            <ActionButton iconName="Eye" label={t("viewAction")} onClick={handleView} />
            <ActionButton iconName="FilePdf" label={t("pdfAction")} onClick={handlePdf} />
            <ActionButton iconName="WhatsappLogo" label={t("whatsappAction")} onClick={handleWhatsapp} />
          </div>

          {note === "offline" && (
            <p role="status" className="mt-sm text-center text-caption text-text-secondary" data-print="hide">
              {t("offlineNote")}
            </p>
          )}
          {note === "viewed" && (
            <p role="status" className="mt-sm text-center text-caption text-accent-secondary" data-print="hide">
              {t("viewedNote")}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function ActionButton({ iconName, label, onClick }: { iconName: string; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="tap-target flex flex-1 flex-col items-center gap-xs rounded-[14px] border-[1.5px] border-divider bg-surface-raised px-sm py-md text-caption font-semibold text-text-primary"
    >
      <Icon name={iconName} size="inline" />
      {label}
    </button>
  );
}
