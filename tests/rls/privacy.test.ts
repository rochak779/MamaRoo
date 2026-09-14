import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, asUser, resetUsers, uniqueEmail } from "./helpers";

// Mirrors app/actions/privacy.ts's USER_ID_TABLES + "profiles" exactly --
// duplicated here (not imported) so this test can't accidentally pass by
// comparing the list against itself. If the two ever drift, this test is
// the one that's supposed to fail.
const EXPECTED_EXPORT_TABLES = [
  "appointments",
  "baby_name_favorites",
  "chat_messages",
  "checkins",
  "checklist_progress",
  "consents",
  "contraction_sessions",
  "contractions",
  "custom_questions",
  "doctor_advice",
  "doctor_advice_updates",
  "emergency_contacts",
  "kick_events",
  "kick_sessions",
  "letters",
  "medicine_logs",
  "medicines",
  "personal_notes",
  "pregnancies",
  "profiles",
  "question_marks",
  "reports",
  "timeline_events",
  "vitals",
].sort();

let alice: Awaited<ReturnType<typeof asUser>>;

beforeAll(async () => {
  await resetUsers();
  alice = await asUser(uniqueEmail("privacy-alice"));
});

afterAll(resetUsers);

describe("user_owned_tables() completeness", () => {
  it("matches requestExport's hardcoded table list exactly, so a new table can't silently skip the export", async () => {
    const { data, error } = await admin.rpc("user_owned_tables");
    expect(error).toBeNull();
    expect((data ?? []).slice().sort()).toEqual(EXPECTED_EXPORT_TABLES);
  });
});

describe("deletePregnancyJourney's underlying guarantees", () => {
  it("survives a pregnancy delete with its pregnancy_id nulled, never deleted -- the guarantee deletePregnancyJourney relies on to skip letters", async () => {
    const pregnancy = await alice.client
      .from("pregnancies")
      .insert({ user_id: alice.userId, edd: "2027-07-01", edd_source: "manual" })
      .select("id")
      .single();
    const letter = await alice.client
      .from("letters")
      .insert({ user_id: alice.userId, pregnancy_id: pregnancy.data!.id, gestational_week: 20, body: "Dear little one," })
      .select("id")
      .single();

    const { error } = await alice.client.from("pregnancies").delete().eq("id", pregnancy.data!.id);
    expect(error).toBeNull();

    const survived = await alice.client.from("letters").select("id, pregnancy_id").eq("id", letter.data!.id).single();
    expect(survived.data).toEqual({ id: letter.data!.id, pregnancy_id: null });
  });

  it("lets the owner delete pregnancy-scoped rows by pregnancy_id and user_id together, the exact shape deletePregnancyJourney queries with", async () => {
    const pregnancy = await alice.client
      .from("pregnancies")
      .insert({ user_id: alice.userId, edd: "2027-08-01", edd_source: "manual" })
      .select("id")
      .single();
    const pregnancyId = pregnancy.data!.id;
    await alice.client.from("checkins").insert({ user_id: alice.userId, pregnancy_id: pregnancyId, body: "note", input_method: "text" });

    const deleted = await alice.client.from("checkins").delete().eq("pregnancy_id", pregnancyId).eq("user_id", alice.userId);
    expect(deleted.error).toBeNull();

    const remaining = await alice.client.from("checkins").select("id").eq("pregnancy_id", pregnancyId);
    expect(remaining.data).toEqual([]);

    // Clean up: pregnancies_one_active_per_user allows at most one active row,
    // and this suite creates more than one across its tests.
    await alice.client.from("pregnancies").delete().eq("id", pregnancyId);
  });
});

describe("deleteAccount's underlying mechanics", () => {
  it("removes a stored report file and cascades every DB row when the auth user is deleted", async () => {
    const disposable = await asUser(uniqueEmail("privacy-deleteme"));

    await disposable.client.from("profiles").upsert({ id: disposable.userId, display_name: "Disposable" });
    // reports bucket only allows image/pdf mime types (0004_care.sql) -- a
    // 1x1 JPEG is the smallest real file that satisfies that.
    const jpegBytes = Uint8Array.from(
      atob("/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/2wBDAQMDAwQDBAgEBAgQCwkLEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBD/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="),
      (c) => c.charCodeAt(0),
    );
    const upload = await disposable.client.storage
      .from("reports")
      .upload(`${disposable.userId}/test-report.jpg`, jpegBytes, { contentType: "image/jpeg" });
    expect(upload.error).toBeNull();
    const storagePath = upload.data!.path;

    await disposable.client.from("reports").insert({
      user_id: disposable.userId,
      title: "Test report",
      report_type: "Other",
      report_date: "2026-09-14",
      storage_path: storagePath,
      mime_type: "image/jpeg",
      size_bytes: jpegBytes.byteLength,
    });
    await disposable.client.from("personal_notes").insert({ user_id: disposable.userId, body: "a note that must be gone after deletion" });

    // The two steps deleteAccount performs, in order, using the same clients
    // it would: her own client for storage (RLS-scoped), the service-role
    // client for the user (the one sanctioned service-role path).
    const removed = await disposable.client.storage.from("reports").remove([storagePath]);
    expect(removed.error).toBeNull();

    const deleted = await admin.auth.admin.deleteUser(disposable.userId);
    expect(deleted.error).toBeNull();

    // Cascade: every metadata row is gone, not just the auth user.
    const notes = await admin.from("personal_notes").select("id").eq("user_id", disposable.userId);
    expect(notes.data).toEqual([]);
    const profile = await admin.from("profiles").select("id").eq("id", disposable.userId).maybeSingle();
    expect(profile.data).toBeNull();

    // Storage object is actually gone, not just unlinked.
    const list = await admin.storage.from("reports").list(disposable.userId);
    expect((list.data ?? []).find((f) => f.name === "test-report.jpg")).toBeUndefined();
  });
});
