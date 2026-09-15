"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/Icon";

export type CardAccent = "coral" | "sage" | "gold";
export type CardSelectedAccent = "sage" | "coral";

export interface CardProps {
  children: ReactNode;
  interactive?: boolean;
  selected?: boolean;
  /**
   * Border colour used when `selected` is true. The existing sage treatment
   * remains the default; screens whose approved mockups use CTA coral must
   * opt in explicitly so unrelated cards are not silently reskinned.
   */
  selectedAccent?: CardSelectedAccent;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
  /**
   * "tint" (default) keeps the existing --color-surface fill. "raised" is
   * pure white (--color-surface-raised) -- additive, for mockups where a
   * card needs to stand out from the page background instead of blending
   * into it (surface and bg sit only ~2% apart in lightness).
   */
  surface?: "tint" | "raised";
  /**
   * Category-coded left-border strip (coral = symptoms, sage = wellness,
   * gold = milestones), always paired with `accentIcon` per the
   * colorblind-safe rule (Mamaroo-Designfinal.md §2.2) -- color is never the
   * only cue. Omit both for a neutral card; don't force a category onto
   * content that isn't actually symptom/wellness/milestone-related.
   */
  accent?: CardAccent;
  /** Icon name shown in a small chip next to the accent strip. Required to make visual sense of `accent` -- see the colorblind-safe note above. */
  accentIcon?: string;
  /**
   * Keeps the established horizontal accent treatment by default. Compact
   * bento cards can opt into the mockup's icon-above-copy composition without
   * rebuilding the category accent and icon chip by hand.
   */
  accentLayout?: "row" | "stacked";
}

const BASE = "block w-full text-left rounded-md p-md shadow-1";

const SURFACE_CLASSES: Record<NonNullable<CardProps["surface"]>, string> = {
  tint: "bg-surface",
  raised: "bg-surface-raised",
};

const ACCENT_BORDER_CLASSES: Record<CardAccent, string> = {
  coral: "border-l-4 border-l-soft-coral",
  sage: "border-l-4 border-l-sage-mist",
  gold: "border-l-4 border-l-gold",
};

const ACCENT_ICON_CLASSES: Record<CardAccent, string> = {
  coral: "bg-[rgba(255,109,87,0.16)] text-accent-primary",
  sage: "bg-[rgba(157,221,161,0.28)] text-accent-secondary",
  gold: "bg-[rgba(255,197,61,0.24)] text-text-primary",
};

const SELECTED_BORDER_CLASSES: Record<CardSelectedAccent, string> = {
  sage: "border-[1.5px] border-accent-secondary",
  coral: "border-[1.5px] border-accent-primary",
};

export function Card({
  children,
  interactive,
  selected,
  selectedAccent = "sage",
  disabled,
  onClick,
  className,
  surface = "tint",
  accent,
  accentIcon,
  accentLayout = "row",
}: CardProps) {
  const classes = cn(
    BASE,
    SURFACE_CLASSES[surface],
    accent && ACCENT_BORDER_CLASSES[accent],
    selected && SELECTED_BORDER_CLASSES[selectedAccent],
    disabled && "opacity-50",
    interactive &&
      !disabled &&
      "active:shadow-2 active:scale-[0.99] transition-[transform,box-shadow] duration-(--motion-fast) ease-standard",
    className,
  );

  const content = accent ? (
    <div className={cn("flex items-start gap-md", accentLayout === "stacked" && "flex-col gap-sm")}>
      {accentIcon && (
        <span
          aria-hidden="true"
          className={cn(
            "flex size-[32px] shrink-0 items-center justify-center rounded-[10px]",
            ACCENT_ICON_CLASSES[accent],
          )}
        >
          <Icon name={accentIcon} size="inline" />
        </span>
      )}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  ) : (
    children
  );

  if (!interactive) return <div className={classes}>{content}</div>;

  return (
    <button
      type="button"
      data-selected={selected ? "true" : undefined}
      disabled={disabled}
      onClick={onClick}
      className={cn(classes, "tap-target")}
    >
      {content}
    </button>
  );
}

/** Content region of a card. Card owns the padding and surface; this owns the stack. */
export function CardBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex flex-col gap-sm", className)}>{children}</div>;
}

export function CardTruncatedText({
  text,
  maxChars,
  showMoreLabel,
}: {
  text: string;
  maxChars: number;
  showMoreLabel: string;
}) {
  const [expanded, setExpanded] = useState(false);
  if (text.length <= maxChars) return <p className="text-body">{text}</p>;
  if (expanded) return <p className="text-body">{text}</p>;
  return (
    <p className="text-body">
      {text.slice(0, maxChars).trimEnd()}…{" "}
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="text-text-primary underline underline-offset-2"
      >
        {showMoreLabel}
      </button>
    </p>
  );
}
