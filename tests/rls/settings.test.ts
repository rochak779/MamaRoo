// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asUser, resetUsers, uniqueEmail } from "@/tests/rls/helpers";

describe("profile settings RLS", () => {
  beforeAll(resetUsers);
  afterAll(resetUsers);

  it("lets a user update her valid mobile number and rejects invalid or cross-user changes", async () => {
    const a = await asUser(uniqueEmail("settings-a"));
    const b = await asUser(uniqueEmail("settings-b"));
    await a.client.from("profiles").insert({ id: a.userId, display_name: "A" });
    await b.client.from("profiles").insert({ id: b.userId, display_name: "B" });

    const own = await a.client
      .from("profiles")
      .update({ mobile_number: "9876543210" })
      .eq("id", a.userId)
      .select("mobile_number")
      .single();
    expect(own.error).toBeNull();
    expect(own.data?.mobile_number).toBe("9876543210");

    const invalid = await a.client
      .from("profiles")
      .update({ mobile_number: "123" })
      .eq("id", a.userId);
    expect(invalid.error).not.toBeNull();

    const crossUser = await a.client
      .from("profiles")
      .update({ mobile_number: "9999999999" })
      .eq("id", b.userId)
      .select("id");
    expect(crossUser.error).toBeNull();
    expect(crossUser.data).toEqual([]);

    const bProfile = await b.client.from("profiles").select("mobile_number").eq("id", b.userId).single();
    expect(bProfile.data?.mobile_number).toBeNull();
  });
});
