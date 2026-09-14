"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { track } from "@/components/AnalyticsProvider";
import { Button } from "@/components/ui/Button";
import { BackButton } from "@/components/patterns/BackButton";
import { DisclaimerBanner } from "@/components/patterns/DisclaimerBanner";
import { EVENTS } from "@/lib/analytics/events";
import { contractionStats } from "@/lib/domain/contractions";
import { useOnline } from "@/lib/pwa/useOnline";

export interface ContractionEntry {
  id: string;
  startedAt: string;
  durationSeconds: number | null;
}

export interface ContractionSessionState {
  id: string;
  contractions: ContractionEntry[];
  /** False when an existing, still-resumable session was returned instead --
   * lets the client fire contraction_session_started once per real session. */
  isNew: boolean;
}

export type StartContractionResult = { ok: true; contraction: ContractionEntry } | { ok: false; error: string };
export type StopContractionResult = { ok: true; contraction: ContractionEntry } | { ok: false; error: string };

export interface ContractionTimerProps {
  session: ContractionSessionState;
  week: number;
  onStartContraction: (sessionId: string) => Promise<StartContractionResult>;
  onStopContraction: (contractionId: string, startedAt: string) => Promise<StopContractionResult>;
}

function formatClock(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function ContractionTimer({ session, week, onStartContraction, onStopContraction }: ContractionTimerProps) {
  const t = useTranslations("me.contractions");
  const td = useTranslations("disclaimer");
  const isOnline = useOnline();
  const [contractions, setContractions] = useState<ContractionEntry[]>(session.contractions);
  const [error, setError] = useState<string | null>(null);
  // The clock reading driving this render -- refreshed every second while a
  // contraction is running. Elapsed time is always recomputed from it against
  // the running contraction's started_at, never accumulated, so it's correct
  // however long the screen has been asleep.
  const [now, setNow] = useState<number>(() => Date.now());

  const running = contractions.find((c) => c.durationSeconds == null) ?? null;

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- restart the tick only when which contraction is running changes, not on every contractions update
  }, [running?.id]);

  // Fires once per real session, not on every resume of an in-progress one.
  useEffect(() => {
    if (session.isNew) track(EVENTS.contraction_session_started, { week });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-fire only when the session itself changes
  }, [session.id]);

  async function handleStart() {
    if (!isOnline) {
      // Refused, not queued -- same reasoning as the kick counter: a
      // silently-queued write could be lost before it syncs, and this screen
      // is sometimes used to decide whether to leave for hospital.
      track(EVENTS.offline_write_blocked, { feature: "contraction" });
      setError(t("offlineStartError"));
      return;
    }
    setError(null);
    const result = await onStartContraction(session.id);
    if (result.ok) {
      setContractions((current) => [result.contraction, ...current]);
    } else {
      setError(t("startError"));
    }
  }

  async function handleStop() {
    if (!running) return;
    if (!isOnline) {
      track(EVENTS.offline_write_blocked, { feature: "contraction" });
      setError(t("offlineStopError"));
      return;
    }
    setError(null);
    const result = await onStopContraction(running.id, running.startedAt);
    if (result.ok) {
      setContractions((current) => current.map((c) => (c.id === result.contraction.id ? result.contraction : c)));
    } else {
      setError(t("recordError"));
    }
  }

  const elapsedSeconds = running ? (now - new Date(running.startedAt).getTime()) / 1000 : 0;
  const stats = contractionStats(
    contractions.map((c) => ({ started_at: c.startedAt, duration_seconds: c.durationSeconds })),
    now,
  );

  const finished = contractions.filter((c) => c.durationSeconds != null);
  const entries = finished.map((c, i) => {
    const next = finished[i + 1];
    const gapSeconds = next ? (new Date(c.startedAt).getTime() - new Date(next.startedAt).getTime()) / 1000 : null;
    const minutes = Math.floor((c.durationSeconds ?? 0) / 60);
    const seconds = (c.durationSeconds ?? 0) % 60;
    return {
      id: c.id,
      durationText: minutes > 0 ? t("lastedMinutesSeconds", { minutes, seconds }) : t("lastedSeconds", { seconds }),
      gapText: gapSeconds != null ? t("sinceLastMinutes", { minutes: Math.round(gapSeconds / 60) }) : null,
      timeLabel: new Date(c.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
  });

  return (
    <div className="flex flex-col gap-lg py-lg">
      <BackButton href="/me" label={t("backLabel")} />
      <p className="text-body-sm text-text-secondary">{t("intro")}</p>

      <div className="flex flex-col items-center gap-md rounded-lg bg-surface-raised p-lg shadow-1">
        <p className="text-body-sm text-text-secondary">{running ? t("timingLabel") : t("readyLabel")}</p>
        <p className="font-display text-[48px] font-bold text-text-primary" data-testid="contraction-clock">
          {formatClock(elapsedSeconds)}
        </p>
        {running ? (
          <Button onClick={() => void handleStop()}>{t("stop")}</Button>
        ) : (
          <Button onClick={() => void handleStart()}>{t("start")}</Button>
        )}
      </div>

      {error && (
        <p role="alert" className="text-body-sm text-alert">
          {error}
        </p>
      )}

      {stats.meets511 && (
        <div className="rounded-lg bg-surface-raised p-md shadow-1">
          <p className="text-body-sm text-text-primary">{t("patternNote")}</p>
          <DisclaimerBanner>{td("userEntered")}</DisclaimerBanner>
        </div>
      )}

      <div className="flex flex-col gap-sm">
        <p className="font-display text-h4 text-text-primary">{t("todaysContractions")}</p>
        {entries.length === 0 ? (
          <p className="text-body-sm text-text-secondary">{t("emptyState")}</p>
        ) : (
          <ul className="flex flex-col gap-sm">
            {entries.map((e) => (
              <li key={e.id} className="flex items-start justify-between gap-sm border-b border-divider pb-sm">
                <div className="flex flex-col gap-[2px]">
                  <p className="text-body-sm font-medium text-text-primary">{e.durationText}</p>
                  {e.gapText && <p className="text-caption text-text-secondary">{e.gapText}</p>}
                </div>
                <p className="text-caption text-text-secondary">{e.timeLabel}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
