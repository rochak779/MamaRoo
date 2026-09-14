"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { track } from "@/components/AnalyticsProvider";
import { Button } from "@/components/ui/Button";
import { EVENTS } from "@/lib/analytics/events";
import { kickState, shouldAutoClose, type KickTap } from "@/lib/domain/kicks";
import { useOnline } from "@/lib/pwa/useOnline";
import type { KickSessionState, FinishKickSessionResult, RecordKickResult } from "@/app/actions/kicks";

export interface KickCounterProps {
  session: KickSessionState;
  week: number;
  onRecordKick: (sessionId: string, tapId: string) => Promise<RecordKickResult>;
  onFinish: (sessionId: string) => Promise<FinishKickSessionResult>;
}

function vibrate() {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    // A missing or no-op implementation (most desktop browsers) is fine to
    // ignore -- this is a nice-to-have, never load-bearing.
    navigator.vibrate?.(15);
  }
}

export function KickCounter({ session, week, onRecordKick, onFinish }: KickCounterProps) {
  const t = useTranslations("baby.kicks");
  const isOnline = useOnline();
  const [taps, setTaps] = useState<KickTap[]>(session.taps);
  const [now] = useState<number>(() => Date.now());
  const [finishing, setFinishing] = useState(false);
  const [finished, setFinished] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const expired = shouldAutoClose({ startedAt: session.startedAt, now });
  const state = kickState({ events: taps, startedAt: session.startedAt, now, targetCount: session.targetCount });

  // Fires once per real session, not on every resume of an in-progress one --
  // session.isNew is decided server-side by startKickSession's get-or-create.
  useEffect(() => {
    if (session.isNew) track(EVENTS.kick_session_started, { week });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-fire only when the session itself changes, not on every week/isNew re-render
  }, [session.id]);

  async function handleTap() {
    if (expired) return;
    if (!isOnline) {
      // Refused, not queued: a durable offline queue doesn't exist yet, and
      // silently accepting the tap locally would risk losing her count
      // entirely if the PWA closes before it syncs -- the worst outcome on a
      // screen she may be using to decide whether to go to hospital. See
      // Important/Implementation.md Session 21, step 4.
      track(EVENTS.offline_write_blocked, { feature: "kick" });
      setError(t("offlineError"));
      return;
    }

    // Tapping past the target is allowed on purpose (kickState's own "does
    // not report negative remaining" test) -- ten is the goal, not a hard
    // cap, since a real kick count sometimes keeps going past it.
    const tapId = crypto.randomUUID();
    const occurredAt = new Date().toISOString();
    // Optimistic, but honestly so: if the insert fails for any reason other
    // than a duplicate-key retry, the tap is rolled back and reported as not
    // recorded -- the rendered count never claims more than the database has.
    setTaps((current) => [...current, { tapId, occurredAt }]);
    setError(null);
    vibrate();

    const result = await onRecordKick(session.id, tapId);
    if (!result.ok) {
      setTaps((current) => current.filter((tap) => tap.tapId !== tapId));
      setError(t("recordError"));
    }
  }

  async function handleFinish() {
    if (finishing) return;
    setFinishing(true);
    try {
      const result = await onFinish(session.id);
      if (result.ok) {
        track(EVENTS.kick_session_completed, { week, kicks: result.count, minutes: state.elapsedMinutes });
        setFinished(true);
      } else {
        setError(t("finishError"));
      }
    } finally {
      setFinishing(false);
    }
  }

  if (finished) {
    return (
      <div className="flex flex-col items-center gap-md py-xl text-center">
        <p className="text-h3 font-display font-semibold text-text-primary">{t("doneTitle")}</p>
        <p className="text-body text-text-secondary">{t("doneBody", { count: state.count })}</p>
      </div>
    );
  }

  if (expired) {
    return (
      <div className="flex flex-col items-center gap-md py-xl text-center">
        <p className="text-body text-text-secondary">{t("expiredBody")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-lg py-lg">
      <p className="text-body-sm text-text-secondary">{t("instructions")}</p>

      <button
        type="button"
        data-testid="kick-tap-target"
        className="tap-target flex h-[220px] w-[220px] flex-col items-center justify-center gap-xs rounded-full bg-accent-primary text-surface-raised shadow-2 active:scale-[0.98]"
        aria-label={t("tapButtonLabel")}
        // Stays tappable while offline, on purpose: the tap is refused with
        // an explanation and tracked (see handleTap), rather than making the
        // control itself unreachable -- a hard-disabled button here would
        // mean her tap silently does nothing, with no chance to explain why.
        {...(!isOnline ? { "aria-describedby": "kick-offline-note" } : {})}
        onClick={() => void handleTap()}
      >
        <span className="text-[64px] font-display font-semibold leading-none">{state.count}</span>
        <span className="text-body-sm">{t("countOfTarget", { target: session.targetCount })}</span>
      </button>

      <p className="text-body-sm text-text-secondary">{t("elapsed", { minutes: state.elapsedMinutes })}</p>

      {!isOnline && (
        <p id="kick-offline-note" role="status" className="text-body-sm text-text-secondary">
          {t("offlineError")}
        </p>
      )}
      {error && (
        <p role="alert" className="text-body-sm text-alert">
          {error}
        </p>
      )}

      {state.isComplete && (
        <Button onClick={() => void handleFinish()} loading={finishing} disabled={finishing}>
          {t("finish")}
        </Button>
      )}
    </div>
  );
}
