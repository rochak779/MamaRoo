"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Keeps a form draft in sessionStorage so an interrupted onboarding form is
 * never lost (spec 10: session expiring mid-form, a phone call, an accidental
 * reload). Every access is guarded, because Safari private mode throws on
 * write, and can throw on read too.
 */
export function useDraft<T extends object>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);

  useEffect(() => {
    // This is exactly the sanctioned case the lint rule's own guidance
    // describes ("subscribe for updates from some external system, calling
    // setState ... when external state changes"): sessionStorage doesn't
    // exist during SSR, so the draft can only be read after mount. Reading it
    // synchronously in a lazy useState initializer instead would make the
    // client's first render disagree with the server-rendered HTML.
    try {
      const raw = sessionStorage.getItem(key);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setValue({ ...initial, ...(JSON.parse(raw) as Partial<T>) });
    } catch {
      // no draft available; continue with the initial value
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const update = useCallback(
    (patch: Partial<T>) => {
      setValue((current) => {
        const next = { ...current, ...patch };
        try {
          sessionStorage.setItem(key, JSON.stringify(next));
        } catch {
          // storage unavailable; the form still works, it just will not survive a reload
        }
        return next;
      });
    },
    [key],
  );

  const reset = useCallback(() => {
    try {
      sessionStorage.removeItem(key);
    } catch {
      // nothing to clear
    }
    setValue(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { value, update, reset };
}
