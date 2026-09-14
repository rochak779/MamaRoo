import { z } from "zod";

/** An empty string counts as "unset", the same as the key being absent. A .env
 * file commonly leaves an optional var present but blank (.env.example does
 * exactly this) rather than omitting it, and `.optional()` alone does not cover
 * that case: "" is still a defined value, so it still fails a following
 * `.min(1)` or `.url()` check instead of being treated as absent. */
const optionalNonEmpty = (inner: z.ZodType<string>) =>
  z.preprocess((value) => (value === "" ? undefined : value), inner.optional());

const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_SITE_URL: z.url(),
  // Optional: analytics is vendor-swappable and no-ops without these (see
  // lib/analytics/provider.ts). Validated here only to catch a malformed value
  // at server startup -- the actual read at runtime is
  // components/AnalyticsProvider.tsx accessing process.env directly, not this
  // module (see that component's own comment on why it can't use `env` here).
  NEXT_PUBLIC_POSTHOG_KEY: optionalNonEmpty(z.string().min(1)),
  NEXT_PUBLIC_POSTHOG_HOST: optionalNonEmpty(z.url()),
  // Server-only, deliberately not NEXT_PUBLIC_ -- the one credential that can
  // bypass RLS. Optional here only so a misconfigured local/CI environment
  // fails at lib/supabase/admin.ts's own call site with a clear error,
  // rather than failing every request that imports this module (most of the
  // app never touches it). See that file's own guard test.
  SUPABASE_SERVICE_ROLE_KEY: optionalNonEmpty(z.string().min(1)),
});

export type Env = z.infer<typeof schema>;

export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = schema.safeParse(source);
  if (!result.success) {
    const names = result.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`Invalid or missing environment variables: ${names}`);
  }
  return result.data;
}

export const env: Env = parseEnv(process.env);
