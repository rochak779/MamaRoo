import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { FORBIDDEN } from "./pcpndt-terms";

const sql = readdirSync("supabase/migrations")
  .filter((f) => f.endsWith(".sql"))
  .map((f) => readFileSync(`supabase/migrations/${f}`, "utf8"))
  .join("\n")
  .toLowerCase();

// Every shipped text-bearing file, discovered rather than enumerated. An enumerated
// list is how this guard quietly stops covering things: a new seed file, a new legal
// page or a new component goes unscanned and the guard still passes. Directories are
// excluded explicitly and the exclusion list is short enough to audit.
// "Important" holds the planning and review documents, which discuss the prohibition
// by name and ship nothing. It is excluded as a directory rather than by filename so
// moving or adding a document cannot silently break the guard.
// "Screens" is the same category: raw designer-supplied HTML mockups, never committed
// to git (confirmed against the repository's own history) and never built as-is --
// their copy gets reviewed and re-authored into i18n/*.json, which this guard already
// scans. Left included, a mockup's own casual word choice (e.g. a Guide FAQ artboard
// discussing "gender" as a topic mothers ask about) fails this guard locally with
// nothing to fix in shipped code, which is exactly the kind of always-red guard the
// MATCHER_FILES comment above warns invites being weakened.
const EXCLUDED_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  "coverage",
  "android",
  "playwright-report",
  "Important",
  "Screens",
]);
const SCANNED_EXTENSIONS = [".ts", ".tsx", ".json", ".md", ".sql", ".html", ".webmanifest"];

/**
 * The four files that must contain the forbidden terms in order to detect them:
 * the term list, this guard, the chatbot's matcher, and that matcher's test. A scan
 * that included them would fail on its own vocabulary, and the usual reaction to a
 * guard that always fails is to weaken it — so the exclusion is explicit, narrow, and
 * asserted to stay short by the test below.
 */
const MATCHER_FILES = new Set([
  "./tests/guards/pcpndt-terms.ts",
  "./tests/guards/schema-pcpndt.test.ts",
  "./lib/ai/guardrails.ts",
  "./lib/ai/guardrails.test.ts",
]);

/** Catches a planning or review document left at the repository root by mistake. */
const isPlanningDoc = (path: string) =>
  /^\.\/(Spec|Implementation_Plan|Design)\.md$/.test(path) || /^\.\/codex-review.*\.md$/.test(path);

/** Generated or vendored files whose contents this project does not author. */
const isNotAuthoredHere = (path: string) =>
  path === "./lib/supabase/database.types.ts" ||
  path === "./package-lock.json" ||
  path.endsWith(".d.ts");

function collectText(dir: string, acc: Array<[string, string]> = []): Array<[string, string]> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") && entry.name !== ".well-known") continue;
    const full = `${dir}/${entry.name}`;
    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRS.has(entry.name)) collectText(full, acc);
    } else if (SCANNED_EXTENSIONS.some((ext) => entry.name.endsWith(ext))) {
      acc.push([full, readFileSync(full, "utf8").toLowerCase()]);
    }
  }
  return acc;
}

const shippedText = collectText(".").filter(
  ([path]) => !MATCHER_FILES.has(path) && !isPlanningDoc(path) && !isNotAuthoredHere(path),
);

describe("PCPNDT compliance (spec §1.4)", () => {
  it("declares no column or type referring to foetal sex", () => {
    const hits = FORBIDDEN.filter((term) => new RegExp(`\\b${term}\\b`).test(sql));
    expect(hits).toEqual([]);
  });

  it("ships no file referring to foetal sex", () => {
    const hits = shippedText.flatMap(([path, text]) =>
      FORBIDDEN.filter((term) => text.includes(term)).map((term) => `${path}: ${term}`),
    );
    expect(hits).toEqual([]);
  });

  it("scans a meaningful number of files, so a broken walk cannot pass vacuously", () => {
    expect(shippedText.length).toBeGreaterThan(10);
  });

  it("scans application and content sources, not only configuration", () => {
    const scanned = shippedText.map(([path]) => path);
    expect(scanned.some((p) => p.startsWith("./app/"))).toBe(true);
    expect(scanned.some((p) => p.startsWith("./components/"))).toBe(true);
    expect(scanned.some((p) => p.startsWith("./supabase/"))).toBe(true);
    expect(scanned.some((p) => p.startsWith("./i18n/"))).toBe(true);
  });

  it("keeps the matcher exclusion list short enough to audit by eye", () => {
    expect(MATCHER_FILES.size).toBeLessThanOrEqual(4);
  });

  it("can actually detect a violation", () => {
    const sample = "a column named gender should be caught".toLowerCase();
    expect(FORBIDDEN.some((term) => sample.includes(term))).toBe(true);
  });
});
