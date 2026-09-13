"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { useTranslations } from "next-intl";
import { track } from "@/components/AnalyticsProvider";
import { AudioIndicator } from "@/components/patterns/AudioIndicator";
import { Icon } from "@/components/ui/Icon";
import { EVENTS } from "@/lib/analytics/events";
import type { ContentItemRow } from "@/lib/supabase/queries/content";

const ALLOWED_MARKDOWN_ELEMENTS = ["h1", "h2", "h3", "p", "ul", "ol", "li", "strong", "em", "a"];
type ContentKind = "article" | "video" | "audio";

function contentKind(value: string): ContentKind {
  if (value === "video" || value === "audio") return value;
  return "article";
}

function RestrictedMarkdown({ children }: { children: string }) {
  return (
    <div className="prose max-w-none text-body text-text-primary">
      <ReactMarkdown allowedElements={ALLOWED_MARKDOWN_ELEMENTS} skipHtml>
        {children}
      </ReactMarkdown>
    </div>
  );
}

export interface ContentDetailProps {
  item: ContentItemRow | null;
  isFallback: boolean;
  transcript: string | null;
  backHref: string;
  backLabelKey: string;
}

export function ContentDetail({ item, isFallback, transcript, backHref, backLabelKey }: ContentDetailProps) {
  const t = useTranslations();
  const [mode, setMode] = useState<"listen" | "text">("listen");
  const [showTranscript, setShowTranscript] = useState(false);
  const [narrationPlaying, setNarrationPlaying] = useState(false);
  const narrationRef = useRef<HTMLAudioElement | null>(null);
  const kind = item ? contentKind(item.kind) : null;

  useEffect(() => {
    if (!item || !kind) return;
    track(EVENTS.content_opened, { kind, is_fallback_locale: isFallback });
    if (kind === "article") track(EVENTS.content_completed, { kind });
  }, [isFallback, item, kind]);

  useEffect(() => {
    if (!item?.narration_url) return;
    const narration = new Audio(item.narration_url);
    narration.onended = () => setNarrationPlaying(false);
    narrationRef.current = narration;
    return () => {
      if (!narration.paused) narration.pause();
      narrationRef.current = null;
    };
  }, [item?.narration_url]);

  if (!item || !kind) {
    return (
      <section className="mx-auto flex min-h-[60dvh] w-full max-w-[680px] flex-col justify-center gap-md py-screen text-center">
        <Icon name="FileX" size="hero" className="mx-auto text-accent-primary" />
        <h1 className="font-display text-h1 font-semibold text-text-primary">{t("today.listen.notFoundTitle")}</h1>
        <p className="text-body text-text-secondary">{t("today.listen.notFoundBody")}</p>
        <Link
          href={backHref}
          className="tap-target mx-auto inline-flex items-center justify-center gap-sm rounded-sm bg-accent-primary px-lg py-sm text-button font-medium text-surface-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary"
        >
          <Icon name="ArrowLeft" size="inline" />
          {t(backLabelKey)}
        </Link>
      </section>
    );
  }

  const textVersion = transcript ?? item.summary ?? item.body_md ?? "";
  const readAlongText = transcript ?? item.body_md;

  function completeMedia() {
    if (kind === "video" || kind === "audio") track(EVENTS.content_completed, { kind });
  }

  async function toggleNarration() {
    const narration = narrationRef.current;
    if (!narration) return;
    if (narrationPlaying) {
      narration.pause();
      setNarrationPlaying(false);
      return;
    }
    try {
      await narration.play();
      setNarrationPlaying(true);
    } catch {
      setNarrationPlaying(false);
    }
  }

  return (
    <article className="relative mx-auto flex w-full max-w-[680px] flex-col gap-lg py-screen" aria-labelledby="content-title">
      <header className="flex items-center gap-md">
        <Link
          href={backHref}
          aria-label={t(backLabelKey)}
          className="tap-target inline-flex items-center justify-center rounded-full bg-surface-raised text-text-primary shadow-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary"
        >
          <Icon name="ArrowLeft" size="inline" />
        </Link>
        <span className="text-caption font-semibold text-accent-primary">{t("today.listen.eyebrow")}</span>
      </header>

      <div className="relative pr-14">
        <h1 id="content-title" className="font-display text-h1 font-semibold text-text-primary">
          {item.title}
        </h1>
        <p className="mt-xs text-caption italic text-accent-secondary">{item.citation}</p>
        {isFallback && <p className="mt-xs text-caption text-text-secondary">{t("common.englishOnly")}</p>}
        {item.narration_url && (
          <AudioIndicator
            playing={narrationPlaying}
            onPlay={() => void toggleNarration()}
            label={t(narrationPlaying ? "today.listen.pauseLabel" : "today.listen.playLabel")}
          />
        )}
      </div>

      {(kind === "video" || kind === "audio") && (
        <div aria-label={kind === "video" ? t("today.listen.videoTab") : t("today.listen.audioTab")}>
          <span className="inline-flex min-h-12 items-center rounded-full bg-accent-primary px-md text-caption font-semibold text-surface-raised">
            {t(kind === "video" ? "today.listen.videoTab" : "today.listen.audioTab")}
          </span>
        </div>
      )}

      <div className="inline-flex self-start rounded-md bg-surface-raised p-xs shadow-1" role="group">
        <button
          type="button"
          aria-pressed={mode === "listen"}
          onClick={() => setMode("listen")}
          className={`tap-target rounded-sm px-md text-caption font-medium ${mode === "listen" ? "bg-accent-primary text-surface-raised" : "text-text-secondary"}`}
        >
          {t("today.listen.listenLabel")}
        </button>
        <button
          type="button"
          aria-pressed={mode === "text"}
          onClick={() => setMode("text")}
          className={`tap-target rounded-sm px-md text-caption font-medium ${mode === "text" ? "bg-accent-primary text-surface-raised" : "text-text-secondary"}`}
        >
          {t("today.listen.textLabel")}
        </button>
      </div>

      {mode === "listen" ? (
        <>
          {kind === "video" && (
            <div className="flex flex-col gap-md rounded-md bg-surface-raised p-md shadow-1">
              <video
                controls
                playsInline
                src={item.media_url ?? undefined}
                onEnded={completeMedia}
                className="aspect-video w-full rounded-sm bg-text-primary"
              />
              <p className="flex items-center gap-sm text-caption text-text-secondary">
                <Icon name="VideoCamera" size="inline" />
                {t("today.listen.playingCaption")}
              </p>
            </div>
          )}

          {kind === "audio" && (
            <>
              <div className="flex flex-col gap-md rounded-md bg-surface-raised p-lg shadow-1">
                <audio controls src={item.media_url ?? undefined} onEnded={completeMedia} className="w-full" />
                <p className="flex items-center gap-sm text-caption text-text-secondary">
                  <Icon name="SpeakerHigh" size="inline" />
                  {t("today.listen.playingCaption")}
                </p>
              </div>
              {readAlongText && (
                <div>
                  <button
                    type="button"
                    aria-expanded={showTranscript}
                    onClick={() => setShowTranscript((current) => !current)}
                    className="tap-target flex w-full items-center justify-between rounded-sm px-xs text-left text-body-sm font-medium text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary"
                  >
                    {t("today.listen.readAlong")}
                    <Icon name={showTranscript ? "CaretUp" : "CaretDown"} size="inline" />
                  </button>
                  {showTranscript && (
                    <div className="mt-sm rounded-sm bg-surface-raised p-lg shadow-1">
                      <RestrictedMarkdown>{readAlongText}</RestrictedMarkdown>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {kind === "article" && (
            <div className="rounded-md bg-surface-raised p-lg shadow-1">
              <RestrictedMarkdown>{item.body_md ?? item.summary ?? ""}</RestrictedMarkdown>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="rounded-md bg-surface-raised p-lg shadow-1">
            <RestrictedMarkdown>{textVersion}</RestrictedMarkdown>
          </div>
          <p className="text-caption text-text-secondary">{t("today.listen.switchBackNote")}</p>
        </>
      )}
    </article>
  );
}
