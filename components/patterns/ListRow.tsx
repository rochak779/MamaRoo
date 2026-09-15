"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

export interface ListRowProps {
  title: string;
  subtitle?: ReactNode;
  supporting?: ReactNode;
  iconName?: string;
  /** Larger visual lead used by media/content rows. */
  thumbnail?: ReactNode;
  trailing?: ReactNode;
  onClick?: () => void;
  href?: string;
  variant?: "plain" | "card";
  roomy?: boolean;
  className?: string;
}

export function ListRow({
  title,
  subtitle,
  supporting,
  iconName,
  thumbnail,
  trailing,
  onClick,
  href,
  variant = "plain",
  roomy = false,
  className,
}: ListRowProps) {
  const card = variant === "card";
  const content = (
    <div
      data-testid="list-row"
      className={cn("flex w-full items-center gap-md", card ? (roomy ? "p-md" : "p-sm") : "py-sm")}
    >
      {thumbnail}
      {iconName && (
        // Icons default to deep plum, inside a 32px/10px-radius chip (§13.5,
        // §2.4) -- sage tint is reserved for icons sitting on sage-colored
        // surfaces, which a plain list row on the page background isn't.
        <span
          aria-hidden="true"
          className="flex size-[32px] shrink-0 items-center justify-center rounded-[10px] bg-surface text-text-primary"
        >
          <Icon name={iconName} size="inline" />
        </span>
      )}
      <div className={cn("flex min-w-0 flex-1 flex-col", card && "gap-xs")}>
        <span
          className={
            card
              ? "font-display text-body-sm font-semibold leading-5 text-text-primary"
              : "text-body"
          }
        >
          {title}
        </span>
        {subtitle && <span className="text-body-sm text-text-secondary">{subtitle}</span>}
        {supporting}
      </div>
      {trailing && <div className="ml-auto shrink-0">{trailing}</div>}
    </div>
  );

  const interactiveClasses = cn(
    "tap-target block w-full text-left",
    card
      ? "overflow-hidden rounded-[18px] bg-surface-raised shadow-1 transition-shadow duration-(--motion-fast) hover:shadow-3 active:shadow-2"
      : "border-b border-divider last:border-b-0",
    className,
  );

  if (href)
    return (
      <Link href={href} className={interactiveClasses}>
        {content}
      </Link>
    );
  if (onClick)
    return (
      <button type="button" onClick={onClick} className={interactiveClasses}>
        {content}
      </button>
    );
  return (
    <div
      className={cn(
        card
          ? "overflow-hidden rounded-[18px] bg-surface-raised shadow-1"
          : "border-b border-divider last:border-b-0",
        className,
      )}
    >
      {content}
    </div>
  );
}

export function ListRowGroup({
  items,
  initialCount = 15,
  showMoreLabel,
}: {
  items: Array<ListRowProps & { id: string }>;
  initialCount?: number;
  showMoreLabel: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? items : items.slice(0, initialCount);

  return (
    <div>
      {visible.map(({ id, ...row }) => (
        <ListRow key={id} {...row} />
      ))}
      {!expanded && items.length > initialCount && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="tap-target w-full py-sm text-button text-text-primary underline underline-offset-2"
        >
          {showMoreLabel}
        </button>
      )}
    </div>
  );
}
