import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { addDays, todayInAppZone } from "@/lib/domain/dates";
import { eddFromLmp, pregnancyProgress } from "@/lib/domain/pregnancy";
import type { Database } from "@/lib/supabase/database.types";

// Same constraint as tests/e2e/auth.spec.ts and onboarding.spec.ts: this
// environment has no local Supabase (no Docker), so there is no Inbucket to
// read a real emailed OTP code from. That constraint is specifically about
// *reading an email* -- it says nothing about signing a user in. This module
// admin-creates a confirmed user and signs her in with a password, exactly as
// tests/rls/helpers.ts's asUser() already does against this same project for
// the RLS suite, then hands Today's real, RLS-scoped data queries a genuine
// session -- no mocked auth, no stubbed Supabase client.
const SUPABASE_URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Exported so other e2e specs can seed additional rows (medicines,
// appointments, ...) for the same user this module creates, without each
// spec constructing its own service-role client against the same project.
export const admin = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export interface PlaywrightCookie {
  name: string;
  value: string;
  url: string;
  httpOnly?: boolean;
  sameSite?: "Strict" | "Lax" | "None";
  expires?: number;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * Signs the given credentials in and captures the exact cookie(s)
 * @supabase/ssr's own setSession() would write in a real browser -- built
 * from the installed SDK's own cookie-serialization code (name, chunking,
 * base64url encoding), not reimplemented by hand, so it can't drift from
 * whatever the running lib/supabase/server.ts actually expects to read.
 */
async function sessionCookies({
  email,
  password,
  baseURL,
}: {
  email: string;
  password: string;
  baseURL: string;
}): Promise<PlaywrightCookie[]> {
  const anonClient = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const signedIn = await anonClient.auth.signInWithPassword({ email, password });
  if (signedIn.error) throw signedIn.error;
  const { session } = signedIn.data;
  if (!session) throw new Error("signInWithPassword returned no session");

  const captured: { name: string; value: string; options: Record<string, unknown> }[] = [];
  const serverClient = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => [],
      setAll: (list) => {
        captured.push(...list);
      },
    },
  });
  const applied = await serverClient.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });
  if (applied.error) throw applied.error;

  return captured.map(({ name, value, options }) => ({
    name,
    value,
    // Playwright's addCookies() rejects a cookie carrying both `url` and
    // `path` (they're alternative ways of pinning the same thing) -- `url`
    // alone lets it derive both the domain and the path.
    url: baseURL,
    ...(typeof options.httpOnly === "boolean" ? { httpOnly: options.httpOnly } : {}),
    ...(typeof options.sameSite === "string"
      ? { sameSite: capitalize(options.sameSite) as "Strict" | "Lax" | "None" }
      : {}),
    ...(typeof options.maxAge === "number"
      ? { expires: Math.floor(Date.now() / 1000) + options.maxAge }
      : {}),
  }));
}

export interface OnboardedFixture {
  cookies: PlaywrightCookie[];
  /** The week TodayScreen should render, computed the same way the app does
   * (pregnancyProgress over the seeded LMP), never hardcoded against a
   * specific run date. */
  week: number;
  /** Lets a spec seed further rows (medicines, appointments, ...) owned by
   * this same user via the exported `admin` client. */
  userId: string;
  /** Deletes the test user, which cascades to her profile and pregnancy row. */
  cleanup: () => Promise<void>;
}

/**
 * Creates a fully onboarded user -- confirmed auth account, a real profile
 * with onboarding_completed_at set, and an active pregnancy row with a known
 * LMP -- and returns the cookies a real sign-in would have left in her
 * browser. /today can then be reached and rendered end to end, against real
 * RLS-scoped Supabase data, the same way she would experience it.
 */
export async function createOnboardedSession({
  baseURL,
  twins = false,
  gestationalDays = 143, // week 20, day 3: comfortably mid-pregnancy, never post-term
}: {
  baseURL: string;
  twins?: boolean;
  gestationalDays?: number;
}): Promise<OnboardedFixture> {
  // Tests run in parallel, each in its own worker process, so a counter
  // reset to 0 per process plus Date.now() alone can collide across workers
  // that start in the same millisecond -- Math.random() closes that gap,
  // matching tests/rls/helpers.ts's own uniqueEmail().
  const email = `e2e-today-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@rls.test`;
  const password = "test-password-123";

  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error) throw created.error;
  const userId = created.data.user.id;

  const today = todayInAppZone();
  const lmp = addDays(today, -gestationalDays);
  const edd = eddFromLmp(lmp);
  const { week } = pregnancyProgress({ edd, today });

  const { error: profileError } = await admin.from("profiles").insert({
    id: userId,
    display_name: "Priya",
    onboarding_completed_at: new Date().toISOString(),
  });
  if (profileError) throw profileError;

  const { error: pregnancyError } = await admin.from("pregnancies").insert({
    user_id: userId,
    lmp_date: lmp,
    edd,
    edd_source: "lmp",
    status: "active",
    pregnancy_flags: twins ? ["twins"] : [],
  });
  if (pregnancyError) throw pregnancyError;

  const cookies = await sessionCookies({ email, password, baseURL });

  return {
    cookies,
    week,
    userId,
    cleanup: async () => {
      await admin.auth.admin.deleteUser(userId);
    },
  };
}
