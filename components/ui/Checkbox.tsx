"use client";

import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

export function Checkbox({
  id,
  label,
  checked,
  onCheckedChange,
  disabled,
}: {
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start gap-sm">
      <span className="relative inline-flex tap-target items-center justify-center">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onCheckedChange(e.target.checked)}
          // Darkened sage, not CTA coral -- same §13.6 rule already applied
          // to Toggle's checked state (CTA coral is reserved for button
          // fills only, never a decorative on/off state).
          className="peer size-[24px] appearance-none rounded-sm border border-divider bg-surface checked:border-accent-secondary checked:bg-accent-secondary disabled:opacity-60"
        />
        {checked && (
          <span data-testid="checkbox-mark" aria-hidden="true" className="pointer-events-none absolute size-[18px] text-surface-raised">
            <Icon name="Check" size="inline" />
          </span>
        )}
      </span>
      <label htmlFor={id} className={cn("min-h-[24px] text-body", disabled && "opacity-60")}>
        {label}
      </label>
    </div>
  );
}
