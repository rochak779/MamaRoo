import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, asUser, resetUsers, uniqueEmail } from "./helpers";
import { PRODUCT_NAME } from "@/lib/config";

// tests/guards/product-name.test.ts forbids the literal product name outside
// lib/config.ts, so fixtures build the real citation copy from PRODUCT_NAME.
const CURATED_CITATION = `Reviewed by ${PRODUCT_NAME}'s medical team`;

let alice: Awaited<ReturnType<typeof asUser>>;

beforeAll(async () => {
  await resetUsers();
  alice = await asUser(uniqueEmail("alice"));
});
afterAll(resetUsers);

describe("content tables", () => {
  it("lets any signed-in user read published content", async () => {
    const { data } = await alice.client.from("content_items").select("slug").eq("is_published", true);
    expect((data ?? []).length).toBeGreaterThan(0);
  });

  it("hides unpublished content", async () => {
    await admin.from("content_items").insert({
      slug: "draft-only",
      locale: "en",
      kind: "article",
      title: "Draft",
      body_md: "## Draft",
      citation: CURATED_CITATION,
      is_published: false,
    });
    const { data } = await alice.client.from("content_items").select("slug").eq("slug", "draft-only");
    expect(data).toEqual([]);
  });

  it("refuses a user's attempt to write content", async () => {
    const { error } = await alice.client.from("content_items").insert({
      slug: "mine",
      locale: "en",
      kind: "article",
      title: "Mine",
      body_md: "## Mine",
      citation: CURATED_CITATION,
    });
    expect(error).not.toBeNull();
  });

  it("retrieves a passage by full-text search", async () => {
    const { data, error } = await alice.client.rpc("search_passages", {
      query: "placeholder passage",
      in_locale: "en",
      max_results: 5,
    });
    expect(error).toBeNull();
    expect((data ?? []).length).toBeGreaterThan(0);
  });

  it("returns nothing for a query with no match, rather than a weak match", async () => {
    const { data } = await alice.client.rpc("search_passages", {
      query: "zxqwv nonexistent term",
      in_locale: "en",
      max_results: 5,
    });
    expect(data).toEqual([]);
  });

  it("refuses a passage whose locale does not match its content item", async () => {
    const englishItem = await admin.from("content_items").select("id").eq("locale", "en").limit(1).single();
    const { error } = await admin.from("content_passages").insert({
      content_item_id: englishItem.data!.id,
      locale: "hi",
      body: "A Hindi-labelled passage on an English item.",
    });
    expect(error).not.toBeNull();
  });

  it("keeps one user's question marks invisible to another", async () => {
    const bob = await asUser(uniqueEmail("bob"));
    const question = await alice.client.from("suggested_questions").select("id").limit(1).single();
    await alice.client.from("question_marks").insert({ user_id: alice.userId, suggested_question_id: question.data!.id });
    const { data } = await bob.client.from("question_marks").select("*");
    expect(data).toEqual([]);
  });

  it("refuses a duplicate mark for the same question", async () => {
    const question = await alice.client.from("suggested_questions").select("id").limit(1).single();
    const row = { user_id: alice.userId, suggested_question_id: question.data!.id };
    await alice.client.from("question_marks").insert(row);
    expect((await alice.client.from("question_marks").insert(row)).error?.code).toBe("23505");
  });

  it("refuses a chat message from the assistant with no declared answer kind", async () => {
    const { error } = await alice.client.from("chat_messages").insert({
      user_id: alice.userId,
      role: "assistant",
      body: "Something",
    });
    expect(error).not.toBeNull();
  });
});
