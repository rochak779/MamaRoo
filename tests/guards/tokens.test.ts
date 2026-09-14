import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const css = readFileSync("styles/tokens.css", "utf8");

const REQUIRED = [
  "--color-bg: #F7EEE3",
  "--color-surface: #F5EEE1",
  "--color-surface-raised: #FFFFFF",
  "--color-text-primary: #670035",
  "--color-text-secondary: rgba(103, 0, 53, 0.78)",
  "--color-accent-primary: #D63A29",
  "--color-accent-secondary: #3B723F",
  "--color-alert: #8C2F3D",
  "--color-success: #4F6E3D",
  // Translucent deep plum (Phase 0, UI redesign alignment), replacing the
  // old flat tan -- matches mockups' plum-tinted hairlines app-wide.
  "--color-divider: rgba(103, 0, 53, 0.12)",
  "--color-blush: #F7DFD9",
  "--color-peach: #FFA48F",
  "--color-gold: #FFC53D",
  "--color-soft-coral: #FF6D57",
  "--color-sage-mist: #9DDDA1",
  "--color-disabled: #DAB9B3",
  "--chart-series-1: #A8482E",
  "--chart-series-2: #3D6B58",
  "--chart-series-3: #C08A28",
  "--chart-series-4: #6B4A3D",
  // The --spacing-* prefix, not --space-*, is what Tailwind v4 turns into
  // p-*/px-*/gap-* utilities. Asserting the name here is the point: the values
  // are identical either way, and the wrong prefix fails silently.
  "--spacing-xs: 4px",
  "--spacing-sm: 8px",
  "--spacing-md: 16px",
  "--spacing-lg: 24px",
  "--spacing-xl: 32px",
  "--spacing-screen: 20px",
  "--radius-sm: 12px",
  "--radius-md: 20px",
  // Dropped from 28px to 20px (Phase 0): Mamaroo-Designfinal.md §5 caps card
  // corners at 16-20px.
  "--radius-lg: 20px",
  "--radius-full: 999px",
  "--motion-fast: 150ms",
  "--motion-base: 250ms",
  "--motion-slow: 400ms",
];

describe("design tokens", () => {
  for (const token of REQUIRED) {
    it(`defines ${token.split(":")[0]} with the specified value`, () => {
      expect(css).toContain(token);
    });
  }

  it("defines no dark-mode palette, by explicit design decision", () => {
    expect(css).not.toContain("prefers-color-scheme");
  });
});
