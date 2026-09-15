"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Checkbox } from "@/components/ui/Checkbox";
import { Button } from "@/components/ui/Button";
import "@/styles/start.css";

export interface ConsentInput {
  baseline: boolean;
  optionalDataSharing: boolean;
  analytics: boolean;
}

export interface ConsentFormProps {
  onSubmit: (input: ConsentInput) => Promise<void>;
}

const LINK_CLASS = "text-body-sm text-text-primary underline-offset-4 hover:underline";

/**
 * Restrained register: no illustration, no motion, no texture-motif,
 * generous white space. Shares the same .auth-screen/.auth-title shell as
 * the surrounding sign-in and onboarding screens (styles/start.css) so the
 * flow doesn't visually break stride right at the legal-consent step. The
 * optional consents start unchecked and stay genuinely separate from the
 * required one -- ticking "agree" never silently ticks them too.
 *
 * No language switcher here (product decision, 2026-09-15): language is
 * chosen once, on the first Welcome/language-select screen, and carried by
 * the mr_locale cookie from then on -- this screen (like LegalDocument) just
 * renders in whatever that already set, rather than letting her change it
 * mid-funnel right before an irreversible agreement.
 */
export function ConsentForm({ onSubmit }: ConsentFormProps) {
  const t = useTranslations("consent");
  const baselineId = useId();
  const dataSharingId = useId();
  const analyticsId = useId();

  const [baseline, setBaseline] = useState(false);
  const [optionalDataSharing, setOptionalDataSharing] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!baseline) return;
    setSubmitting(true);
    try {
      await onSubmit({ baseline, optionalDataSharing, analytics });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-screen">
      <div className="auth-form">
        <div className="auth-heading-group">
          <h1 className="auth-title">{t("title")}</h1>
          <p data-testid="consent-summary" className="auth-subtitle">
            {t("summary")}
          </p>
        </div>

        <div className="flex flex-col gap-md">
          <Checkbox id={baselineId} label={t("baseline")} checked={baseline} onCheckedChange={setBaseline} />
          <Checkbox
            id={dataSharingId}
            label={t("optionalDataSharing")}
            checked={optionalDataSharing}
            onCheckedChange={setOptionalDataSharing}
          />
          <Checkbox id={analyticsId} label={t("analytics")} checked={analytics} onCheckedChange={setAnalytics} />
        </div>

        <div data-testid="consent-links" className="flex gap-md" style={{ marginTop: "var(--spacing-md)" }}>
          <Link href="/legal/privacy" className={LINK_CLASS}>
            {t("privacyPolicy")}
          </Link>
          <Link href="/legal/terms" className={LINK_CLASS}>
            {t("termsOfUse")}
          </Link>
        </div>

        <div className="auth-spacer" />

        <div className="auth-actions">
          <Button
            className="auth-primary"
            type="button"
            loading={submitting}
            disabled={!baseline}
            {...(!baseline ? { disabledReason: t("agreeRequired") } : {})}
            onClick={handleSubmit}
          >
            {t("agreeAndContinue")}
          </Button>
        </div>
      </div>
    </main>
  );
}
