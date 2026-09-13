"use client";

import * as Phosphor from "@phosphor-icons/react";

const SIZES = { inline: 18, default: 24, nav: 26, hero: 40 } as const;
export type IconSize = keyof typeof SIZES;

export function Icon({
  name,
  size = "default",
  weight = "regular",
  label,
  className,
}: {
  name: string;
  size?: IconSize;
  weight?: "regular" | "duotone";
  label?: string;
  className?: string;
}) {
  const Component = (Phosphor as unknown as Record<string, Phosphor.Icon | undefined>)[name];
  if (!Component) return null; // never a broken-image glyph

  return (
    <Component
      data-testid="icon"
      data-size={size}
      size={SIZES[size]}
      weight={weight}
      className={className}
      aria-hidden={label ? undefined : "true"}
      aria-label={label}
      role={label ? "img" : undefined}
    />
  );
}
