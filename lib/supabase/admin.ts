import "server-only"; // build fails if any client component imports this
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Service-role client. The ONLY permitted caller is app/actions/privacy.ts's
 * deleteAccount -- deleting an auth user requires auth.admin.deleteUser,
 * which no anon-key client can perform, and this key can bypass RLS
 * entirely. Never import this from a component, a hook, or any other
 * action (tests/guards/service-role-scope.test.ts enforces that).
 */
export function createAdminSupabase() {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("Admin client requires SUPABASE_SERVICE_ROLE_KEY");
  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
