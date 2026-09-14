import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, asUser, resetUsers, uniqueEmail } from "./helpers";

let alice: Awaited<ReturnType<typeof asUser>>;
let bob: Awaited<ReturnType<typeof asUser>>;

beforeAll(async () => {
  await resetUsers();
  alice = await asUser(uniqueEmail("prep-alice"));
  bob = await asUser(uniqueEmail("prep-bob"));
});

afterAll(resetUsers);

describe("RLS for checklist_progress", () => {
  it("allows the owner to create, update, and delete their own progress row", async () => {
    const created = await alice.client
      .from("checklist_progress")
      .insert({ user_id: alice.userId, item_key: "me-clothes", done: true })
      .select("id, done")
      .single();
    expect(created.error).toBeNull();
    expect(created.data?.done).toBe(true);

    const updated = await alice.client
      .from("checklist_progress")
      .update({ done: false })
      .eq("id", created.data!.id)
      .select("done")
      .single();
    expect(updated.data?.done).toBe(false);

    expect((await alice.client.from("checklist_progress").delete().eq("id", created.data!.id)).error).toBeNull();
  });

  it("keeps progress rows private to their owner", async () => {
    const created = await alice.client
      .from("checklist_progress")
      .insert({ user_id: alice.userId, item_key: "baby-outfit", done: true })
      .select("id")
      .single();

    expect((await bob.client.from("checklist_progress").select("*")).data).toEqual([]);
    expect(
      (await bob.client.from("checklist_progress").update({ done: false }).eq("id", created.data!.id).select("id")).data,
    ).toEqual([]);
  });

  it("refuses a forged owner", async () => {
    expect(
      (await bob.client.from("checklist_progress").insert({ user_id: alice.userId, item_key: "me-charger", done: true }))
        .error,
    ).not.toBeNull();
  });

  it("only ever returns active checklist items to a signed-in user", async () => {
    // checklist_items' real seed (supabase/seed/checklist_items.sql) is
    // applied directly to the live project, same as food_safety.placeholder
    // and guide content -- it's deliberately not part of config.toml's
    // auto-run db.seed.sql_paths, so a from-scratch CI database has none of
    // those rows. This test seeds its own active + inactive rows via the
    // service-role client instead of assuming pre-seeded content exists.
    const tag = `test-${Date.now()}`;
    const seeded = await admin.from("checklist_items").insert([
      { item_key: `${tag}-active`, locale: "en", category: "me", label: "Active test item", is_active: true },
      { item_key: `${tag}-inactive`, locale: "en", category: "me", label: "Inactive test item", is_active: false },
    ]);
    expect(seeded.error).toBeNull();

    const items = await alice.client
      .from("checklist_items")
      .select("item_key, locale, is_active")
      .like("item_key", `${tag}-%`);
    expect(items.error).toBeNull();
    expect(items.data).toEqual([{ item_key: `${tag}-active`, locale: "en", is_active: true }]);

    await admin.from("checklist_items").delete().like("item_key", `${tag}-%`);
  });
});

describe("RLS and constraints for emergency_contacts", () => {
  it("allows the owner to create, read, edit, and delete a contact", async () => {
    const created = await alice.client
      .from("emergency_contacts")
      .insert({ user_id: alice.userId, name: "Amma", phone: "9876543210" })
      .select("id, name")
      .single();
    expect(created.error).toBeNull();

    const updated = await alice.client
      .from("emergency_contacts")
      .update({ phone: "9123456780" })
      .eq("id", created.data!.id)
      .select("phone")
      .single();
    expect(updated.data?.phone).toBe("9123456780");

    expect((await alice.client.from("emergency_contacts").delete().eq("id", created.data!.id)).error).toBeNull();
    expect((await alice.client.from("emergency_contacts").select("id").eq("id", created.data!.id)).data).toEqual([]);
  });

  it("returns no rows when another user reads, edits, or deletes a contact", async () => {
    const created = await alice.client
      .from("emergency_contacts")
      .insert({ user_id: alice.userId, name: "Ramesh", phone: "9876500000" })
      .select("id")
      .single();

    expect((await bob.client.from("emergency_contacts").select("*")).data).toEqual([]);
    expect(
      (await bob.client.from("emergency_contacts").update({ name: "Changed" }).eq("id", created.data!.id).select("id"))
        .data,
    ).toEqual([]);
    expect((await bob.client.from("emergency_contacts").delete().eq("id", created.data!.id).select("id")).data).toEqual(
      [],
    );
  });

  it("refuses a forged owner", async () => {
    expect(
      (await bob.client.from("emergency_contacts").insert({ user_id: alice.userId, name: "Forged", phone: "9000000000" }))
        .error,
    ).not.toBeNull();
  });

  it("enforces name length and a 10-digit phone", async () => {
    const base = { user_id: alice.userId };
    expect((await alice.client.from("emergency_contacts").insert({ ...base, name: "  ", phone: "9876543210" })).error).not
      .toBeNull();
    expect((await alice.client.from("emergency_contacts").insert({ ...base, name: "Amma", phone: "12345" })).error).not
      .toBeNull();
  });
});

describe("pregnancies.birth_notes", () => {
  it("lets the owner set and clear a bounded birth notes value", async () => {
    const pregnancy = await alice.client
      .from("pregnancies")
      .insert({ user_id: alice.userId, edd: "2027-05-01", edd_source: "manual" })
      .select("id")
      .single();
    expect(pregnancy.error).toBeNull();

    const updated = await alice.client
      .from("pregnancies")
      .update({ birth_notes: "Would like skin-to-skin right after birth." })
      .eq("id", pregnancy.data!.id)
      .select("birth_notes")
      .single();
    expect(updated.data?.birth_notes).toBe("Would like skin-to-skin right after birth.");

    // The 4000-char bound itself is covered by the migration-content test
    // (pregnancies_one_active_per_user means alice can't insert a second
    // pregnancy row here to exercise the check constraint directly).
    const cleared = await alice.client
      .from("pregnancies")
      .update({ birth_notes: null })
      .eq("id", pregnancy.data!.id)
      .select("birth_notes")
      .single();
    expect(cleared.data?.birth_notes).toBeNull();
  });
});
