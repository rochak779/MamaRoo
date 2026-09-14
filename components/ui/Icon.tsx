"use client";

import { resolveIcon } from "@/components/ui/icons";

const SIZES = { inline: 18, default: 24, nav: 26, hero: 40 } as const;
export type IconSize = keyof typeof SIZES;

export function Icon({
  name,
  size = "default",
  weight: _weight = "regular",
  label,
  className,
}: {
  name: string;
  size?: IconSize;
  /**
   * Kept for call-site compatibility with the old Phosphor API (some
   * callers still pass "duotone"). Feather has no weight variants, so this
   * is accepted and ignored rather than requiring every call site to drop
   * it -- Mamaroo-Designfinal.md §4 specifies one consistent stroke weight
   * (1.75–2px) for every icon instead.
   */
  weight?: "regular" | "duotone";
  label?: string;
  className?: string;
}) {
  void _weight; // accepted for call-site compatibility only, see the prop doc above
  const resolved = resolveIcon(name);
  if (!resolved) return null; // never a broken-image glyph

  const px = SIZES[size];

  return (
    <svg
      data-testid="icon"
      data-size={size}
      width={px}
      height={px}
      viewBox="0 0 24 24"
      fill={resolved.filled ? "currentColor" : "none"}
      stroke={resolved.filled ? "none" : "currentColor"}
      strokeWidth={resolved.filled ? undefined : 1.85}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden={label ? undefined : "true"}
      aria-label={label}
      role={label ? "img" : undefined}
    >
      {resolved.node}
    </svg>
  );
}
