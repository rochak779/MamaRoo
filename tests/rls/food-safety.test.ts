import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, asUser, resetUsers, uniqueEmail } from "./helpers";

let reader: Awaited<ReturnType<typeof asUser>>;
const testIds = [
  "f0000000-0000-4000-8000-000000000001",
  "f0000000-0000-4000-8000-000000000002",
] as const;

beforeAll(async () => {
  await resetUsers();
  reader = await asUser(uniqueEmail("food-safety-reader"));
  const seeded = await admin.from("food_safety_items").upsert([
    {
      id: testIds[0], locale: "en", name: "RLS active food", status: "safe",
      short_text: "Active short text", long_text: "Active long text", sort_order: 9990, is_active: true,
    },
    {
      id: testIds[1], locale: "en", name: "RLS inactive food", status: "avoid",
      short_text: "Inactive short text", long_text: "Inactive long text", sort_order: 9991, is_active: false,
    },
  ]);
  if (seeded.error) throw seeded.error;
});

afterAll(async () => {
  await admin.from("food_safety_items").delete().in("id", testIds);
  await resetUsers();
});

describe("food safety RLS", () => {
  it("lets an authenticated user read active rows but hides inactive rows", async () => {
    const result = await reader.client.from("food_safety_items").select("id").in("id", testIds);
    expect(result.error).toBeNull();
    expect(result.data).toEqual([{ id: testIds[0] }]);
  });

  it("does not let an authenticated user insert, update, or delete catalog rows", async () => {
    const insert = await reader.client.from("food_safety_items").insert({
      locale: "en", name: "User-written food", status: "safe",
      short_text: "No", long_text: "No", sort_order: 9992,
    });
    const update = await reader.client.from("food_safety_items").update({ name: "Changed" }).eq("id", testIds[0]).select("id");
    const remove = await reader.client.from("food_safety_items").delete().eq("id", testIds[0]).select("id");
    expect(insert.error).not.toBeNull();
    expect(update.data).toEqual([]);
    expect(remove.data).toEqual([]);
  });
});
