"use client";

import { forwardRef, useId, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "tertiary" | "danger";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
  /** Shown to assistive tech and as a hint, so a disabled button is never unexplained. */
  disabledReason?: string;
  /**
   * Full-width, sticky to the bottom of the screen, with an elevated shadow
   * -- the "Add X" pattern My Care's Medicines/Appointments/Doctors Advice
   * screens all share (Mamaroo-Designfinal.md's My Care README). `96px`
   * matches the `(app)` layout's own `pb-[96px]`, so the button always sits
   * flush above the fixed BottomNav rather than behind it.
   */
  sticky?: boolean;
}

// Pill is the mockup default for every CTA (Mamaroo-Designfinal.md §5) --
// previously rounded-sm (12px) here, relying on individual call sites to
// remember rounded-full, which most didn't.
const BASE =
  "relative tap-target inline-flex items-center justify-center gap-sm rounded-full px-lg py-sm " +
  "text-button font-body font-medium text-center " +
  "transition-[transform,background-color,opacity] duration-(--motion-fast) ease-standard " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary " +
  "disabled:cursor-not-allowed";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent-primary text-surface-raised active:scale-[0.98] active:brightness-[0.92]",
  // Border stays accent-primary (a non-text UI component, held to the looser
  // 3:1 contrast requirement); the label text uses text-primary instead --
  // CTA coral is specified for button fills only, and as small text on a
  // light surface it falls short of the 4.5:1 text minimum.
  secondary: "bg-surface text-text-primary border-[1.5px] border-accent-primary active:scale-[0.98]",
  tertiary: "bg-transparent text-text-primary underline-offset-4 hover:underline",
  // Deep plum, not CTA coral -- Mamaroo-Designfinal.md's Privacy And Data
  // mockup deliberately gives irreversible account/journey deletion a more
  // severe, distinct colour from every other (reversible) primary action.
  danger: "bg-text-primary text-surface-raised active:scale-[0.98] active:brightness-[0.92]",
};

// A truly disabled button uses the desaturated-peach token (§5: "desaturated
// peach, not gray") -- never applied while merely `loading`, so a busy
// submit button (see LOADING_CLASSES below) keeps its normal fill and just
// dims, rather than reading as switched off mid-submit.
const DISABLED_VARIANTS: Record<Variant, string> = {
  primary: "bg-disabled text-text-secondary active:scale-100 active:brightness-100",
  secondary: "border-disabled text-text-secondary active:scale-100",
  tertiary: "text-text-secondary hover:no-underline",
  danger: "bg-disabled text-text-secondary active:scale-100 active:brightness-100",
};

// Preserves the previous disabled:opacity-40 look for the one state that
// used to rely on it -- a button mid-submit (loading implies disabled, but
// isn't the "off" state DISABLED_VARIANTS represents).
const LOADING_CLASSES = "opacity-40";

const STICKY_CLASSES = "sticky bottom-[96px] z-10 w-full shadow-3";

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", loading = false, disabled, disabledReason, sticky = false, children, className, ...rest },
  ref,
) {
  // useId rather than a literal fallback: two unlabelled buttons on one screen
  // would otherwise both claim id="button-reason", and aria-describedby would
  // resolve to whichever came first.
  const fallbackId = useId();
  const descriptionId = disabledReason ? `${rest.id ?? fallbackId}-reason` : undefined;
  const isOff = disabled && !loading;
  return (
    <>
      <button
        ref={ref}
        data-variant={variant}
        aria-busy={loading || undefined}
        aria-describedby={descriptionId}
        disabled={disabled || loading}
        className={cn(
          BASE,
          VARIANTS[variant],
          isOff && DISABLED_VARIANTS[variant],
          loading && LOADING_CLASSES,
          sticky && STICKY_CLASSES,
          className,
        )}
        {...rest}
      >
        <span className={loading ? "opacity-0" : undefined}>{children}</span>
        {loading && (
          <span
            data-testid="button-spinner"
            aria-hidden="true"
            className="absolute inline-block size-[1em] animate-spin rounded-full border-2 border-current border-t-transparent"
          />
        )}
      </button>
      {disabledReason && (
        <span id={descriptionId} className="sr-only">
          {disabledReason}
        </span>
      )}
    </>
  );
});
