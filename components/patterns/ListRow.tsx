"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

export interface ListRowProps {
  title: string;
  subtitle?: string;
  iconName?: string;
  trailing?: ReactNode;
  onClick?: () => void;
  href?: string;
}

export function ListRow({ title, subtitle, iconName, trailing, onClick, href }: ListRowProps) {
  const content = (
    <div data-testid="list-row" className="flex w-full items-center gap-md py-sm">
      {iconName && (
        // Icons default to deep plum, inside a 32px/10px-radius chip (§13.5,
        // §2.4) -- sage tint is reserved for icons sitting on sage-colored
        // surfaces, which a plain list row on the page background isn't.
        <span aria-hidden="true" className="flex size-[32px] shrink-0 items-center justify-center rounded-[10px] bg-surface text-text-primary">
          <Icon name={iconName} size="inline" />
        </span>
      )}
      <div className="flex min-w-0 flex-col">
        <span className="text-body">{title}</span>
        {subtitle && <span className="text-body-sm text-text-secondary">{subtitle}</span>}
      </div>
      {trailing && <div className="ml-auto shrink-0">{trailing}</div>}
    </div>
  );

  const interactiveClasses = cn("tap-target block w-full border-b border-divider text-left last:border-b-0");

  if (href) return <Link href={href} className={interactiveClasses}>{content}</Link>;
  if (onClick) return <button type="button" onClick={onClick} className={interactiveClasses}>{content}</button>;
  return <div className="border-b border-divider last:border-b-0">{content}</div>;
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
