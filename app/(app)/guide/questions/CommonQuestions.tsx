"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/Icon";
import { PRODUCT_NAME } from "@/lib/config";
import type { GuideFaq, GuideScheme } from "@/lib/supabase/queries/guideFaqs";

export interface CommonQuestionsProps {
  faqs: GuideFaq[];
  schemes: GuideScheme[];
}

export function CommonQuestions({ faqs, schemes }: CommonQuestionsProps) {
  const t = useTranslations("commonQuestions");
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>(null);
  const [expandedSchemeId, setExpandedSchemeId] = useState<string | null>(null);

  return (
    <section
      className="relative isolate mx-auto flex min-h-[calc(100dvh-96px)] w-full max-w-[680px] flex-col gap-lg py-screen selection:bg-blush selection:text-text-primary"
      aria-labelledby="common-questions-title"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-[-20px] inset-y-0 -z-10 bg-[linear-gradient(135deg,rgba(220,240,217,0.8)_0%,rgba(247,238,227,0.35)_50%,rgba(251,213,196,0.7)_100%)]"
      />

      <header className="flex items-center gap-md">
        <Link
          href="/guide"
          aria-label={t("backLabel")}
          className="tap-target inline-flex shrink-0 items-center justify-center rounded-full bg-surface-raised text-text-primary shadow-1 transition-colors duration-(--motion-fast) hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary"
        >
          <Icon name="ArrowLeft" size="inline" />
        </Link>
        <h1 id="common-questions-title" className="font-display text-h1 font-semibold text-text-primary">
          {t("heading")}
        </h1>
      </header>

      <div className="flex flex-col gap-md" data-testid="faq-list">
        {faqs.map((faq) => {
          const expanded = expandedFaqId === faq.id;
          return (
            <article key={faq.id} className="overflow-hidden rounded-[18px] bg-surface-raised shadow-2">
              <button
                type="button"
                aria-expanded={expanded}
                onClick={() => setExpandedFaqId((current) => (current === faq.id ? null : faq.id))}
                className="tap-target flex w-full flex-col gap-sm p-md text-left transition-shadow duration-(--motion-fast) hover:shadow-3 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent-primary"
              >
                <span className="flex w-full items-center justify-between gap-sm">
                  <span className="flex-1 font-display text-[15px] leading-[21px] font-semibold text-text-primary">
                    {faq.question}
                  </span>
                  <Icon
                    name="CaretDown"
                    size="inline"
                    className={`shrink-0 text-text-primary transition-transform duration-(--motion-fast) ease-standard ${expanded ? "rotate-180" : ""}`}
                  />
                </span>
                {expanded && (
                  <>
                    <span className="text-body-sm leading-[21px] text-text-primary">{faq.answer}</span>
                    <span className="text-[11px] leading-[15px] italic text-accent-secondary">
                      {t("citation", { productName: PRODUCT_NAME })}
                    </span>
                  </>
                )}
              </button>
            </article>
          );
        })}
      </div>

      <section
        className="flex flex-col gap-md rounded-[22px] bg-surface-raised/50 p-[18px]"
        aria-labelledby="schemes-title"
      >
        <header className="flex items-start gap-md">
          <span
            aria-hidden="true"
            className="flex size-9 shrink-0 items-center justify-center rounded-sm bg-peach text-text-primary"
          >
            <Icon name="StackSimple" size="inline" />
          </span>
          <span className="min-w-0">
            <h2 id="schemes-title" className="font-display text-body font-bold text-text-primary">
              {t("schemesTitle")}
            </h2>
            <p className="mt-xs text-caption text-text-secondary">{t("schemesSubtitle")}</p>
          </span>
        </header>

        <div className="flex flex-col gap-md" data-testid="scheme-list">
          {schemes.map((scheme) => {
            const expanded = expandedSchemeId === scheme.id;
            return (
              <article
                key={scheme.id}
                className="overflow-hidden rounded-[18px] border-l-[5px] border-accent-primary bg-surface-raised shadow-2"
              >
                <button
                  type="button"
                  aria-expanded={expanded}
                  onClick={() => setExpandedSchemeId((current) => (current === scheme.id ? null : scheme.id))}
                  className="tap-target flex w-full flex-col gap-sm p-md text-left transition-shadow duration-(--motion-fast) hover:shadow-3 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent-primary"
                >
                  <span className="flex w-full items-center justify-between gap-sm">
                    <span className="flex-1 font-display text-body-sm font-semibold text-text-primary">
                      {scheme.name}
                    </span>
                    <Icon
                      name="CaretDown"
                      size="inline"
                      className={`shrink-0 text-text-primary transition-transform duration-(--motion-fast) ease-standard ${expanded ? "rotate-180" : ""}`}
                    />
                  </span>
                  <span className="text-caption text-text-primary">{scheme.short_text}</span>
                  {expanded && <span className="text-caption text-text-primary">{scheme.long_text}</span>}
                </button>
              </article>
            );
          })}
        </div>
      </section>
    </section>
  );
}
