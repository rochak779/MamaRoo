/**
 * Feather-style outline glyphs (Mamaroo-Designfinal.md §4), replacing the
 * Phosphor duotone set. Every path uses a shared 24×24 stroke grid so a
 * single <svg> wrapper in Icon.tsx can apply the stroke width/cap rules
 * (1.75–2px, rounded caps) once, in one place, rather than per-icon.
 *
 * Most entries are Feather's own icons (MIT licensed, redrawn here as plain
 * path data so no runtime package is added — see the Phase 0 plan's "prefer
 * zero new dependencies" note). A handful of app-specific concepts Feather's
 * set doesn't cover (Pill, ForkKnife, BowlFood, FlowerLotus, and similar)
 * are custom glyphs drawn to the same stroke grid so they read as one
 * family with the rest. WhatsappLogo is the one exception: a brand mark
 * keeps its own fixed shape rather than being restyled as a generic
 * outline, the same reasoning that exempts the waitlist's brand icons.
 *
 * Unknown names resolve to `undefined` — Icon.tsx renders nothing rather
 * than a broken glyph, same contract as before.
 */
import type { ReactNode } from "react";

const file = (
  <>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </>
);

const mail = (
  <>
    <path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
    <polyline points="22 6 12 13 2 6" />
  </>
);

const edit = (
  <>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
  </>
);

const phone = (
  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
);

const caretDown = <polyline points="6 9 12 15 18 9" />;

const ICONS: Record<string, ReactNode> = {
  ArrowLeft: (
    <>
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </>
  ),
  ArrowClockwise: (
    <>
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </>
  ),
  BagSimple: (
    <>
      <path d="M6 7V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2" />
      <path d="M4 7h16l-1.2 13.2a2 2 0 0 1-2 1.8H7.2a2 2 0 0 1-2-1.8L4 7z" />
    </>
  ),
  Baby: (
    <>
      <circle cx="12" cy="13" r="7" />
      <line x1="9" y1="12" x2="9.01" y2="12" />
      <line x1="15" y1="12" x2="15.01" y2="12" />
      <path d="M9.5 16c.7.6 1.6 1 2.5 1s1.8-.4 2.5-1" />
      <path d="M12 6c0-1.2.8-2 2-2" />
    </>
  ),
  Bell: (
    <>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </>
  ),
  BookOpen: (
    <>
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </>
  ),
  BowlFood: (
    <>
      <path d="M3 12h18a9 9 0 0 1-18 0z" />
      <path d="M12 12V6" />
      <path d="M8 6a4 4 0 0 1 8 0" />
    </>
  ),
  Calendar: (
    <>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </>
  ),
  CalendarBlank: (
    <>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </>
  ),
  CaretDown: caretDown,
  CaretUp: <polyline points="18 15 12 9 6 15" />,
  CaretRight: <polyline points="9 18 15 12 9 6" />,
  ChartBar: (
    <>
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </>
  ),
  ChartLine: <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />,
  Check: <polyline points="20 6 9 17 4 12" />,
  CirclesThreePlus: (
    <>
      <circle cx="8" cy="8" r="4" />
      <circle cx="16" cy="8" r="4" />
      <circle cx="12" cy="16" r="4" />
    </>
  ),
  ClipboardText: (
    <>
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
      <line x1="8" y1="11" x2="16" y2="11" />
      <line x1="8" y1="15" x2="16" y2="15" />
    </>
  ),
  CloudRain: (
    <>
      <path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25" />
      <line x1="8" y1="19" x2="8" y2="21" />
      <line x1="8" y1="13" x2="8" y2="15" />
      <line x1="16" y1="19" x2="16" y2="21" />
      <line x1="16" y1="13" x2="16" y2="15" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="12" y1="15" x2="12" y2="17" />
    </>
  ),
  Drop: <path d="M12 2s7 8.5 7 13a7 7 0 0 1-14 0c0-4.5 7-13 7-13z" />,
  EnvelopeSimple: mail,
  EnvelopeSimpleOpen: mail,
  Eye: (
    <>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  FilePdf: file,
  FileText: (
    <>
      {file}
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </>
  ),
  FileX: (
    <>
      {file}
      <line x1="9.5" y1="13" x2="14.5" y2="18" />
      <line x1="14.5" y1="13" x2="9.5" y2="18" />
    </>
  ),
  FlowerLotus: (
    <>
      <circle cx="12" cy="12" r="2.5" />
      <path d="M12 2c1.5 2 1.5 5 0 7-1.5-2-1.5-5 0-7z" />
      <path d="M12 22c1.5-2 1.5-5 0-7-1.5 2-1.5 5 0 7z" />
      <path d="M2 12c2-1.5 5-1.5 7 0-2 1.5-5 1.5-7 0z" />
      <path d="M22 12c-2-1.5-5-1.5-7 0 2 1.5 5 1.5 7 0z" />
    </>
  ),
  ForkKnife: (
    <>
      <path d="M3 2v7a2 2 0 0 0 2 2v11" />
      <path d="M7 2v7a2 2 0 0 1-2 2" />
      <path d="M5 2v7" />
      <path d="M19 2c-2 3-2 7 0 9-2 0-2 2-2 2v9" />
    </>
  ),
  Heart: (
    <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8z" />
  ),
  House: (
    <>
      <path d="M3 12l9-9 9 9" />
      <path d="M5 10v10a1 1 0 0 0 1 1h3v-6h6v6h3a1 1 0 0 0 1-1V10" />
    </>
  ),
  Image: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </>
  ),
  Info: (
    <>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </>
  ),
  Lightning: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />,
  MagnifyingGlass: (
    <>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </>
  ),
  Microphone: (
    <>
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </>
  ),
  Moon: <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />,
  Notebook: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <line x1="8" y1="7" x2="16" y2="7" />
      <line x1="8" y1="11" x2="16" y2="11" />
      <line x1="8" y1="15" x2="13" y2="15" />
    </>
  ),
  NotePencil: edit,
  Orange: (
    <>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 5V3" />
      <path d="M12 3c1.5 0 2.5 1 2.5 2" />
    </>
  ),
  Pause: (
    <>
      <rect x="6" y="4" width="4" height="16" />
      <rect x="14" y="4" width="4" height="16" />
    </>
  ),
  PencilSimple: edit,
  PencilSimpleLine: edit,
  PersonSimpleRun: (
    <>
      <circle cx="13" cy="4" r="2" />
      <path d="M4 21l4-5 3 2 2-4 5 2" />
      <path d="M8 12l3-3 2 2 4-2" />
    </>
  ),
  Phone: phone,
  PhoneCall: phone,
  Pill: (
    <>
      <path d="M4.9 4.9a4.5 4.5 0 0 1 6.36 0l7.84 7.84a4.5 4.5 0 1 1-6.36 6.36L4.9 11.26a4.5 4.5 0 0 1 0-6.36z" />
      <line x1="9.5" y1="7.5" x2="16.5" y2="14.5" />
    </>
  ),
  /* Bare triangle, no ring -- for a play control that already sits inside its
     own filled circular button (the custom media player), where PlayCircle's
     built-in ring would double up. */
  Play: <polygon points="6 4 20 12 6 20 6 4" />,
  PlayCircle: (
    <>
      <circle cx="12" cy="12" r="10" />
      <polygon points="10 8 16 12 10 16 10 8" />
    </>
  ),
  Plus: (
    <>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </>
  ),
  Question: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </>
  ),
  Rainbow: (
    <>
      <path d="M3 17a9 9 0 0 1 18 0" />
      <path d="M7 17a5 5 0 0 1 10 0" />
    </>
  ),
  ShieldCheck: (
    <>
      <path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z" />
      <polyline points="9 12 11 14 15 10" />
    </>
  ),
  SignOut: (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </>
  ),
  Smiley: (
    <>
      <circle cx="12" cy="12" r="9" />
      <line x1="9" y1="10" x2="9.01" y2="10" />
      <line x1="15" y1="10" x2="15.01" y2="10" />
      <path d="M8 15c1 1.2 2.4 2 4 2s3-.8 4-2" />
    </>
  ),
  SmileyMeh: (
    <>
      <circle cx="12" cy="12" r="9" />
      <line x1="9" y1="10" x2="9.01" y2="10" />
      <line x1="15" y1="10" x2="15.01" y2="10" />
      <line x1="8" y1="15.5" x2="16" y2="15.5" />
    </>
  ),
  SmileySad: (
    <>
      <circle cx="12" cy="12" r="9" />
      <line x1="9" y1="10" x2="9.01" y2="10" />
      <line x1="15" y1="10" x2="15.01" y2="10" />
      <path d="M16 16.5c-1-1.2-2.4-2-4-2s-3 .8-4 2" />
    </>
  ),
  Sparkle: <path d="M12 3l1.8 5.4L19 10l-5.2 1.6L12 17l-1.8-5.4L5 10l5.2-1.6z" />,
  SpeakerHigh: (
    <>
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
    </>
  ),
  StackSimple: (
    <>
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </>
  ),
  Star: (
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  ),
  Sun: (
    <>
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </>
  ),
  TestTube: (
    <>
      <path d="M9 2v6.5L4.5 18a2.5 2.5 0 0 0 2.2 3.7h10.6a2.5 2.5 0 0 0 2.2-3.7L15 8.5V2" />
      <line x1="7" y1="2" x2="17" y2="2" />
      <line x1="7" y1="14" x2="17" y2="14" />
    </>
  ),
  Timer: (
    <>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2.5 2.5" />
      <path d="M9 2h6" />
    </>
  ),
  User: (
    <>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </>
  ),
  VideoCamera: (
    <>
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </>
  ),
  Warning: (
    <>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </>
  ),
  WarningCircle: (
    <>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </>
  ),
  WifiSlash: (
    <>
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
      <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
      <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
      <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
      <line x1="12" y1="20" x2="12.01" y2="20" />
    </>
  ),
  X: (
    <>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </>
  ),
};

/**
 * WhatsappLogo is a brand mark, not a system glyph -- filled, not stroked,
 * and excluded from the shared stroke wrapper Icon.tsx applies to
 * everything else. Icon.tsx checks this set before falling back to ICONS.
 */
export const FILLED_ICONS = new Set(["WhatsappLogo"]);

const whatsapp = (
  <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5.1-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3.1.8.8-3-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1-.2.2-.7.8-.8.9-.1.2-.3.2-.6.1-.2-.1-1-.4-1.9-1.2-.7-.6-1.2-1.4-1.3-1.6-.1-.2 0-.4.1-.5l.4-.4c.1-.1.2-.3.3-.4.1-.2 0-.3 0-.4-.1-.1-.6-1.4-.8-1.9-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 2s.8 2.3.9 2.5c.1.2 1.6 2.4 3.8 3.4.5.2.9.4 1.3.5.5.2 1 .1 1.3.1.4-.1 1.3-.5 1.5-1 .2-.5.2-.9.1-1z" />
);

/**
 * Full glyph resolution: filled brand marks first, then the outline set.
 * Returns undefined for anything unrecognised so Icon.tsx can render
 * nothing rather than a broken glyph.
 */
export function resolveIcon(name: string): { node: ReactNode; filled: boolean } | undefined {
  if (name === "WhatsappLogo") return { node: whatsapp, filled: true };
  const node = ICONS[name];
  if (!node) return undefined;
  return { node, filled: false };
}
