// Bumped only if the export's own shape changes (a table renamed/restructured
// in a way a consumer reading an old export would need to know about) -- not
// on every schema migration. Nothing reads this value yet; it exists so a
// future migration of the export format has somewhere to record that fact.
const EXPORT_SCHEMA_VERSION = "1";

export interface ExportEnvelope {
  meta: { generatedAt: string; schemaVersion: string };
  tables: Record<string, unknown[]>;
}

/**
 * Wraps her already-fetched, already-RLS-scoped rows (one key per user-owned
 * table, "profiles" included -- see the guard test asserting this stays
 * true) in an export envelope. This is a pure stamping function; it never
 * queries anything itself, both for testability and because the union of
 * "which tables exist" and "how each is fetched" belongs to the caller
 * (app/actions/privacy.ts's requestExport), not to this domain layer.
 */
export function buildExport(tables: Record<string, unknown[]>, now: Date = new Date()): ExportEnvelope {
  return {
    meta: { generatedAt: now.toISOString(), schemaVersion: EXPORT_SCHEMA_VERSION },
    tables,
  };
}
