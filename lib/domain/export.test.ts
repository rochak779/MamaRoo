import { describe, expect, it } from "vitest";
import { buildExport } from "@/lib/domain/export";

describe("buildExport", () => {
  it("carries envelope metadata outside the tables namespace", () => {
    const result = buildExport({ profiles: [{ id: "u1" }] }, new Date("2026-09-14T12:00:00.000Z"));

    expect(result.meta.generatedAt).toBe("2026-09-14T12:00:00.000Z");
    expect(result.meta.schemaVersion).toBeTypeOf("string");
    // meta must NOT appear among the table keys, or a completeness check that
    // compares Object.keys(result.tables) against the DB's table catalogue breaks.
    expect(Object.keys(result.tables)).not.toContain("meta");
  });

  it("passes every given table straight through under its own key, unchanged", () => {
    const tables = {
      profiles: [{ id: "u1", display_name: "Priya" }],
      pregnancies: [{ id: "p1", edd: "2027-01-01" }],
      medicines: [],
    };

    const result = buildExport(tables, new Date());

    expect(result.tables).toEqual(tables);
  });

  it("includes profiles, whose owner column is id rather than user_id, like any other table", () => {
    const result = buildExport({ profiles: [{ id: "u1" }], appointments: [] }, new Date());

    expect(Object.keys(result.tables)).toContain("profiles");
  });

  it("produces a valid ISO timestamp for generatedAt without a now argument", () => {
    const result = buildExport({ profiles: [] });
    expect(() => new Date(result.meta.generatedAt).toISOString()).not.toThrow();
  });
});
