import type { Metadata } from "next";
import { Poppins, Hind, Mukta } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { PRODUCT_NAME } from "@/lib/config";
import { getLocale } from "@/i18n/locale";
import { createServerSupabase } from "@/lib/supabase/server";
import { getCurrentConsents } from "@/lib/supabase/queries/consent";
import { AnalyticsProvider } from "@/components/AnalyticsProvider";
import "@/styles/tokens.css";
import "@/styles/globals.css";

const poppins = Poppins({
  subsets: ["latin", "devanagari"],
  // 600 added for the splash screen's wordmark (Session 14).
  weight: ["500", "600"],
  variable: "--font-poppins",
  display: "swap",
});

// Kept loaded (not just repointed to Mukta) because styles/landing.css pins
// the waitlist to Hind so its live, public rendering doesn't shift with the
// Design-updated.md retheme — see the Session 14 note in Implementation.md.
const hind = Hind({
  subsets: ["latin", "devanagari"],
  weight: ["400", "500"],
  variable: "--font-hind",
  display: "swap",
});

// Design-updated.md §3: Mukta is the app-wide body font, replacing Hind.
const mukta = Mukta({
  subsets: ["latin", "devanagari"],
  weight: ["400", "500"],
  variable: "--font-mukta",
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
    <html lang={locale} className={`${poppins.variable} ${hind.variable} ${mukta.variable}`}>
      <body className="min-h-dvh bg-bg text-text-primary font-body">
        <NextIntlClientProvider messages={messages} locale={locale}>
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
