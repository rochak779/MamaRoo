"use client";

import { useTransition } from "react";
import { cn } from "@/lib/cn";
import type { Locale } from "@/lib/config";

const LABELS: Record<Locale, string> = { en: "English", hi: "हिंदी" };
// Gloss shown under the native name, same pairing Language Select uses
// (app/(public)/welcome/LanguageSelect.tsx) -- both cards read "English" for
// the English option, which looks like a duplicate but matches the mockup.
const GLOSS: Record<Locale, string> = { en: "English", hi: "Hindi" };

export function LanguageSwitcher({
  current,
  onSelect,
}: {
  current: Locale;
  onSelect: (locale: Locale) => void;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div
      role="group"
      aria-label={LABELS[current] === "English" ? "Language" : "भाषा"}
      className={cn("flex gap-sm transition-opacity duration-(--motion-slow) ease-standard", pending && "opacity-60")}
    >
      {(Object.keys(LABELS) as Locale[]).map((locale) => (
        <button
          key={locale}
          type="button"
          lang={locale}
          // Pinned rather than left to derive from the visible text: the
          // gloss line below would otherwise double-announce ("English
          // English") to assistive tech.
          aria-label={LABELS[locale]}
          aria-pressed={locale === current}
          onClick={() => {
            if (locale === current) return;
            startTransition(() => onSelect(locale));
          }}
          // Two white cards with an outline-select state -- not the small
          // solid-fill pill this used to be. CTA coral as the selection
          // border matches the mockup (and Card's selectedAccent="coral"
          // treatment elsewhere), it's the fill that's reserved for buttons.
          className={cn(
            "tap-target flex flex-1 flex-col gap-[2px] rounded-md border-[1.5px] bg-surface-raised p-md text-left",
            locale === current ? "border-accent-primary" : "border-divider",
          )}
        >
          <span className="text-body font-semibold text-text-primary">{LABELS[locale]}</span>
          <span className="text-caption text-text-secondary">{GLOSS[locale]}</span>
        </button>
      ))}
    </div>
  );
}
