import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/*.test.{ts,tsx}"],
    // "node_modules/**" alone only matches the root node_modules -- it does
    // not stop the include glob from walking into a nested one. Parallel
    // Claude/Codex sessions leave their own checkouts (and node_modules)
    // under .claude/worktrees/, so without "**/node_modules/**" a full run
    // discovers and executes every dependency's own test suite from inside
    // each worktree too (confirmed: 251 files failing there, unrelated to
    // this project, on a run made to verify Session 30).
    exclude: ["tests/e2e/**", "**/node_modules/**", ".claude/worktrees/**"],
    globals: true,
    // tests/rls/*.test.ts share a `resetUsers()` helper that wipes every @rls.test
    // user against one live Supabase project. Vitest's default is to run test files
    // in parallel workers, which lets one file's cleanup delete another file's
    // still-in-use test users mid-run. Sequential files trade a bit of wall-clock
    // time for the RLS suites not racing each other.
    fileParallelism: false,
    // lib/env.ts validates process.env at module load and throws on a bad
    // environment. That is deliberate: a misconfigured deploy should fail loudly
    // rather than half-work. It does mean the test runner needs the same
    // placeholder values CI sets, or every test importing it dies on import.
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "https://placeholder.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "placeholder",
      NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
    },
    coverage: {
      provider: "v8",
      // Coverage is enforced where a silent failure is HARMFUL, not where code is
      // merely plentiful. Ordinary UI code carries no threshold: a percentage target
      // there buys assertions about markup, which this plan deliberately avoids.
      include: [
        "lib/domain/**",
        "lib/ai/**",
        "lib/analytics/**",
        "app/api/chat/**",
      ],
      thresholds: { branches: 100, functions: 100, lines: 100, statements: 100 },
    },
  },
  resolve: { alias: { "@": path.resolve(__dirname, ".") } },
});
