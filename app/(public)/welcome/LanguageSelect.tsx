"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/config";
import { track } from "@/components/AnalyticsProvider";
import { EVENTS } from "@/lib/analytics/events";
import "@/styles/welcome.css";

// Fixed English, deliberately not run through next-intl: this is the screen
// that sets the locale, so there is nothing to honour yet -- and, same as
// SplashScreen, a returning visitor's already-set locale cookie must not
// leak in here either. Everything from her chosen language onward is what
// actually follows it.
const TITLE = "Choose your language";
const SUBTITLE = "You can change this anytime.";
const HINDI_GLOSS = "Hindi";
const ENGLISH_GLOSS = "English";
const CONTINUE = "Continue";

export interface LanguageSelectProps {
  /** A deep-link target to resume once she's signed up, carried through untouched. */
  next: string | null;
  onChooseLocale: (locale: Locale) => void | Promise<void>;
}

/**
 * Ported from Screens/1. Language Select.dc.html: pick a card, Continue stays
 * disabled until one is picked, then Continue is what actually commits the
 * choice and moves on -- selecting a card alone is only a visual highlight.
 */
export function LanguageSelect({ next, onChooseLocale }: LanguageSelectProps) {
  const [selected, setSelected] = useState<Locale | null>(null);
  const router = useRouter();

  async function handleContinue() {
    if (!selected) return;
    track(EVENTS.language_chosen, { locale: selected });
    await onChooseLocale(selected);
    router.push(next ? `/start?next=${encodeURIComponent(next)}` : "/start");
  }

  return (
    <div className="welcome-screen">
      <h1 className="welcome-title">{TITLE}</h1>
      <p className="welcome-subtitle">{SUBTITLE}</p>
      <div className="welcome-options">
        <button
          type="button"
          className="welcome-card"
          aria-pressed={selected === "hi"}
          data-selected={selected === "hi"}
          onClick={() => setSelected("hi")}
        >
          <span className="welcome-card-native" lang="hi">
            हिंदी
          </span>
          <span className="welcome-card-gloss">{HINDI_GLOSS}</span>
        </button>
        <button
          type="button"
          className="welcome-card"
          aria-pressed={selected === "en"}
          data-selected={selected === "en"}
          onClick={() => setSelected("en")}
        >
          <span className="welcome-card-native" lang="en">
            English
          </span>
          <span className="welcome-card-gloss">{ENGLISH_GLOSS}</span>
        </button>
      </div>
      <div className="welcome-spacer" />
      <button type="button" className="welcome-continue" disabled={!selected} onClick={handleContinue}>
        {CONTINUE}
      </button>
    </div>
  );
}
