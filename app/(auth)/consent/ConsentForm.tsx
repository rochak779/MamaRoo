"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Checkbox } from "@/components/ui/Checkbox";
import { Button } from "@/components/ui/Button";
import { LanguageSwitcher } from "@/components/patterns/LanguageSwitcher";
import type { Locale } from "@/lib/config";

export interface ConsentInput {
  baseline: boolean;
  optionalDataSharing: boolean;
  analytics: boolean;
}

export interface ConsentFormProps {
  onSubmit: (input: ConsentInput) => Promise<void>;
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
}

const LINK_CLASS = "text-body-sm text-accent-primary underline-offset-4 hover:underline";

/**
 * Restrained register (design doc §6): no illustration, no motion, no
 * texture-motif, generous white space. The optional consents start unchecked
 * and stay genuinely separate from the required one -- ticking "agree" never
 * silently ticks them too.
 */
export function ConsentForm({ onSubmit, locale, onLocaleChange }: ConsentFormProps) {
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
    <div className="flex flex-col gap-lg bg-surface-raised p-lg">
      <p data-testid="consent-summary" className="text-body">
        {t("summary")}
      </p>

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

      <div data-testid="consent-links" className="flex gap-md">
        <Link href="/legal/privacy" className={LINK_CLASS}>
          {t("privacyPolicy")}
        </Link>
        <Link href="/legal/terms" className={LINK_CLASS}>
          {t("termsOfUse")}
        </Link>
      </div>

      <LanguageSwitcher current={locale} onSelect={onLocaleChange} />

      <Button
        type="button"
        loading={submitting}
        disabled={!baseline}
        {...(!baseline ? { disabledReason: t("agreeRequired") } : {})}
        onClick={handleSubmit}
      >
        {t("agreeAndContinue")}
      </Button>
    </div>
  );
}
