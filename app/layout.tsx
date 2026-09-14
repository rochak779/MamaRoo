import type { Metadata } from "next";
import { Poppins, Hind, Roboto, Baloo_2, Patrick_Hand } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { PRODUCT_NAME } from "@/lib/config";
import { getLocale } from "@/i18n/locale";
import { createServerSupabase } from "@/lib/supabase/server";
import { getCurrentConsents } from "@/lib/supabase/queries/consent";
import { AnalyticsProvider } from "@/components/AnalyticsProvider";
import { RouteProgressBar } from "@/components/patterns/RouteProgressBar";
import "@/styles/tokens.css";
import "@/styles/globals.css";

// Devanagari subset dropped (Phase 0): Poppins has no Devanagari glyphs at
// all (Mamaroo-Designfinal.md §3), so Hindi headings never render in it —
// they resolve through the :lang(hi) override in styles/tokens.css to Baloo 2
// instead. Loading the subset here would just ship unused glyph data.
// 700 added: many mockup headings use it (500/600 were the only weights
// loaded before).
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

// Kept loaded (not repointed) because styles/landing.css pins the waitlist to
// Hind so its live, public rendering doesn't shift with this retheme — see
// the §2.0 note there.
const hind = Hind({
  subsets: ["latin", "devanagari"],
  weight: ["400", "500"],
  variable: "--font-hind",
  display: "swap",
});

// Mamaroo-Designfinal.md §3: Roboto is the single body font app-wide, both
// languages (reverses the prior Mukta retheme). Google's Roboto has no
// Devanagari subset, so Hindi glyphs fall through to the system-ui fallback
// already in --font-body's stack — the same graceful per-character font
// fallback every browser already does, not a gap to work around here.
const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-roboto",
  display: "swap",
});

// Devanagari equivalent to Poppins' rounded heading weight (§3) — the
// heading font for Hindi, wired via the :lang(hi) override in
// styles/tokens.css rather than a per-screen swap.
const baloo2 = Baloo_2({
  subsets: ["devanagari", "latin"],
  weight: ["500", "600", "700"],
  variable: "--font-baloo",
  display: "swap",
});

const patrickHand = Patrick_Hand({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-patrick-hand",
  display: "swap",
});

export const metadata: Metadata = {
  title: `${PRODUCT_NAME} | Coming soon`,
  description:
    "A calm companion through pregnancy. Join the waitlist for your baby's little milestones, your daily care, and a little more peace of mind.",
};

export const viewport = {
  themeColor: "#EDE3D3",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();

  // Derived from the shared consent query, never a bespoke read -- see
  // lib/supabase/queries/consent.ts. Runs on every page, including the public
  // waitlist, where user is always null and this resolves to "not consented"
  // without a second query.
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const consents = user ? await getCurrentConsents(supabase) : null;

  return (
    <html lang={locale} className={`${poppins.variable} ${hind.variable} ${roboto.variable} ${baloo2.variable} ${patrickHand.variable}`}>
      <body className="min-h-dvh text-text-primary font-body">
        <NextIntlClientProvider messages={messages} locale={locale}>
          <RouteProgressBar />
          <AnalyticsProvider
            userId={user?.id ?? null}
            analyticsConsented={consents?.analytics.granted ?? false}
            optionalDataSharingConsented={consents?.optional_data_sharing.granted ?? false}
          />
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
