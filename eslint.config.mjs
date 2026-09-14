import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Delivered design mockups, not application source -- support.js in
    // particular is the Claude Design canvas runtime, vendored as-is by the
    // design tool, not code this project authors or ships.
    "Screens/**",
    // Parallel Claude/Codex session checkouts -- same reasoning as
    // vitest.config.ts's exclude list: a full lint run should never grade
    // another session's in-progress worktree as if it were this repo's own
    // source.
    ".claude/worktrees/**",
    ".worktrees/**",
  ]),
]);

export default eslintConfig;
