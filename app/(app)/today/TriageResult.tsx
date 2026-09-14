"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { track } from "@/components/AnalyticsProvider";
import { DisclaimerBanner } from "@/components/patterns/DisclaimerBanner";
import { SeverityBadge } from "@/components/patterns/SeverityBadge";
import { EVENTS } from "@/lib/analytics/events";
import type { Severity } from "@/lib/domain/severity";
import type { Feeling } from "@/app/(app)/today/FeelingBox";

export interface TriageResultProps {
  severity: Severity | null;
  guidance: { title: string; body: string } | null;
  feeling: Feeling | null;
  doctorName: string | null;
  clinicName: string | null;
}

/**
 * Renders in place, below FeelingBox on /today, once saveCheckin resolves --
 * there is no standalone check-in screen in the delivered designs
 * (Session 19's Gate A note). Never claims anything when there is no match:
 * no SeverityBadge, no "you are fine" copy, just a calm, bounded line.
 */
export function TriageResult({ severity, guidance, feeling, doctorName, clinicName }: TriageResultProps) {
  const t = useTranslations();

  useEffect(() => {
    track(EVENTS.triage_result_shown, { severity: severity ?? "no_match" });
  }, [severity]);

  const hasClinicContext = severity === "urgent" && (doctorName || clinicName);

  return (
    <div data-testid="triage-result" className="mt-lg flex flex-col gap-sm rounded-lg bg-surface-raised p-lg shadow-2">
      <p className="text-body-sm text-text-secondary">
        {t(feeling === "worried" ? "today.triage.worriedIntro" : "today.triage.intro")}
      </p>

      {severity && guidance ? (
        <>
          <SeverityBadge severity={severity} />
          <h2 className="text-h3 font-display font-semibold text-text-primary">{guidance.title}</h2>
          <p className="text-body text-text-primary">{guidance.body}</p>
          {hasClinicContext && (
            <p className="text-body-sm text-text-secondary">
              {t("today.triage.urgentContext", {
                doctorName: doctorName ?? "",
                clinicName: clinicName ?? "",
              })}
            </p>
          )}
        </>
      ) : (
        <p className="text-body text-text-primary">{t("today.triage.noMatch")}</p>
      )}

      <DisclaimerBanner>{t("disclaimer.reviewedGuidance")}</DisclaimerBanner>
    </div>
  );
}
