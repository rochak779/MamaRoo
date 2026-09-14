"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

export function BottomSheet({
  open,
  onClose,
  title,
  eyebrow,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Optional small label above the title (e.g. "Just a gentle nudge" on the
   * Medicine Quick Action Sheet). Additive -- existing callers that don't
   * pass it render exactly as before. */
  eyebrow?: string;
  children: ReactNode;
}) {
  const titleId = useId();
  const pushed = useRef(false);

  // A history entry makes the Android back gesture and the iOS edge swipe close
  // the sheet rather than navigate away from the screen behind it.
  useEffect(() => {
    if (!open) return;
    history.pushState({ sheet: true }, "");
    pushed.current = true;

    const onPop = () => {
      pushed.current = false;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("popstate", onPop);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("keydown", onKey);
      if (pushed.current) {
        pushed.current = false;
        history.back();
      }
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40">
      <div
        data-testid="sheet-scrim"
        onClick={onClose}
        className="absolute inset-0 bg-(--scrim)"
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        // Top-corner radius is 24px specifically (§13, a distinct value from
        // the general 16-20px card scale, so it's an explicit arbitrary
        // value rather than a reused --radius-* token).
        className="safe-bottom absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-[24px] bg-surface-raised p-lg shadow-3 motion-safe:animate-[sheet-in_var(--motion-slow)_var(--ease-standard)]"
      >
        <div aria-hidden="true" className="mx-auto -mt-sm mb-sm h-1 w-9 rounded-full bg-[rgba(103,0,53,0.15)]" />
        {eyebrow && <p className="text-center text-caption text-text-secondary/80">{eyebrow}</p>}
        <h2 id={titleId} className={`text-h2 font-display${eyebrow ? " text-center" : ""}`}>
          {title}
        </h2>
        <div className="mt-md">{children}</div>
      </div>
    </div>
  );
}
