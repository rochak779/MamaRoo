import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, asUser, resetUsers, uniqueEmail } from "./helpers";

let reader: Awaited<ReturnType<typeof asUser>>;
const faqIds = [
  "f2000000-0000-4000-8000-000000000001",
  "f2000000-0000-4000-8000-000000000002",
] as const;
const schemeIds = [
  "f3000000-0000-4000-8000-000000000001",
  "f3000000-0000-4000-8000-000000000002",
] as const;

beforeAll(async () => {
  await resetUsers();
  reader = await asUser(uniqueEmail("guide-faq-reader"));
  const faqSeed = await admin.from("guide_faqs").upsert([
    {
      id: faqIds[0], locale: "en", question: "RLS active FAQ", answer: "Active answer",
      sort_order: 9990, is_active: true,
    },
    {
      id: faqIds[1], locale: "en", question: "RLS inactive FAQ", answer: "Inactive answer",
      sort_order: 9991, is_active: false,
    },
  ]);
  if (faqSeed.error) throw faqSeed.error;

  const schemeSeed = await admin.from("guide_schemes").upsert([
    {
      id: schemeIds[0], locale: "en", name: "RLS active scheme", short_text: "Active short",
      long_text: "Active long", sort_order: 9990, is_active: true,
    },
    {
      id: schemeIds[1], locale: "en", name: "RLS inactive scheme", short_text: "Inactive short",
      long_text: "Inactive long", sort_order: 9991, is_active: false,
    },
  ]);
  if (schemeSeed.error) throw schemeSeed.error;
});

afterAll(async () => {
  await admin.from("guide_faqs").delete().in("id", faqIds);
  await admin.from("guide_schemes").delete().in("id", schemeIds);
  await resetUsers();
});

describe("guide FAQ and scheme RLS", () => {
  it("shows only active rows from both catalogs to an authenticated user", async () => {
    const [faqs, schemes] = await Promise.all([
      reader.client.from("guide_faqs").select("id").in("id", faqIds),
      reader.client.from("guide_schemes").select("id").in("id", schemeIds),
    ]);
    expect(faqs.error).toBeNull();
    expect(faqs.data).toEqual([{ id: faqIds[0] }]);
    expect(schemes.error).toBeNull();
    expect(schemes.data).toEqual([{ id: schemeIds[0] }]);
  });

  it("denies authenticated inserts, updates, and deletes on both catalogs", async () => {
    const faqWrites = await Promise.all([
      reader.client.from("guide_faqs").insert({
        locale: "en", question: "User FAQ", answer: "No", sort_order: 9992,
      }),
      reader.client.from("guide_faqs").update({ question: "Changed" }).eq("id", faqIds[0]).select("id"),
      reader.client.from("guide_faqs").delete().eq("id", faqIds[0]).select("id"),
    ]);
    expect(faqWrites[0].error).not.toBeNull();
    expect(faqWrites[1].data).toEqual([]);
    expect(faqWrites[2].data).toEqual([]);

    const schemeWrites = await Promise.all([
      reader.client.from("guide_schemes").insert({
        locale: "en", name: "User scheme", short_text: "No", long_text: "No", sort_order: 9992,
      }),
      reader.client.from("guide_schemes").update({ name: "Changed" }).eq("id", schemeIds[0]).select("id"),
      reader.client.from("guide_schemes").delete().eq("id", schemeIds[0]).select("id"),
    ]);
    expect(schemeWrites[0].error).not.toBeNull();
    expect(schemeWrites[1].data).toEqual([]);
    expect(schemeWrites[2].data).toEqual([]);
  });
});
