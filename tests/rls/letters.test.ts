import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asUser, resetUsers, uniqueEmail } from "./helpers";

let alice: Awaited<ReturnType<typeof asUser>>;
let bob: Awaited<ReturnType<typeof asUser>>;
let alicePregnancyId: string;

beforeAll(async () => {
  await resetUsers();
  alice = await asUser(uniqueEmail("letters-alice"));
  bob = await asUser(uniqueEmail("letters-bob"));

  const alicePregnancy = await alice.client.from("pregnancies").insert({
    user_id: alice.userId,
    edd: "2027-04-01",
    edd_source: "manual",
  }).select("id").single();
  if (alicePregnancy.error) throw alicePregnancy.error;
  alicePregnancyId = alicePregnancy.data.id;
});

afterAll(resetUsers);

describe("RLS and constraints for letters", () => {
  it("allows the owner to create, read, edit, and delete a letter", async () => {
    const created = await alice.client.from("letters").insert({
      user_id: alice.userId,
      pregnancy_id: alicePregnancyId,
      gestational_week: 26,
      body: "Dear little one,",
    }).select("id,body").single();
    expect(created.error).toBeNull();

    const updated = await alice.client.from("letters")
      .update({ body: "Dear little one, today I felt you move." })
      .eq("id", created.data!.id)
      .select("body")
      .single();
    expect(updated.data?.body).toBe("Dear little one, today I felt you move.");

    expect((await alice.client.from("letters").delete().eq("id", created.data!.id)).error).toBeNull();
    expect((await alice.client.from("letters").select("id").eq("id", created.data!.id)).data).toEqual([]);
  });

  it("returns no rows when another user reads, edits, or deletes a letter", async () => {
    const created = await alice.client.from("letters").insert({
      user_id: alice.userId,
      pregnancy_id: alicePregnancyId,
      gestational_week: 27,
      body: "A private letter.",
    }).select("id").single();

    expect((await bob.client.from("letters").select("*")).data).toEqual([]);
    expect((await bob.client.from("letters").update({ body: "Changed" }).eq("id", created.data!.id).select("id")).data).toEqual([]);
    expect((await bob.client.from("letters").delete().eq("id", created.data!.id).select("id")).data).toEqual([]);
  });

  it("refuses a forged owner and a pregnancy owned by someone else", async () => {
    expect((await bob.client.from("letters").insert({
      user_id: alice.userId,
      pregnancy_id: alicePregnancyId,
      gestational_week: 26,
      body: "Forged owner.",
    })).error).not.toBeNull();

    expect((await bob.client.from("letters").insert({
      user_id: bob.userId,
      pregnancy_id: alicePregnancyId,
      gestational_week: 26,
      body: "Wrong pregnancy.",
    })).error).not.toBeNull();
  });

  it("enforces body and week bounds", async () => {
    const base = {
      user_id: alice.userId,
      pregnancy_id: alicePregnancyId,
      gestational_week: 26,
    };
    expect((await alice.client.from("letters").insert({ ...base, body: "   " })).error).not.toBeNull();
    expect((await alice.client.from("letters").insert({ ...base, body: "x".repeat(4001) })).error).not.toBeNull();
    expect((await alice.client.from("letters").insert({ ...base, gestational_week: 43, body: "Hello" })).error).not.toBeNull();
  });
});
