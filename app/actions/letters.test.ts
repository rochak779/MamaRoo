// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createServerSupabase,
  from,
  getUser,
  insert,
  insertSelect,
  insertSingle,
  pregnancyMaybeSingle,
  revalidatePath,
  update,
  updateFirstEq,
  updateSecondEq,
  updateSelect,
  updateMaybeSingle,
} = vi.hoisted(() => ({
  createServerSupabase: vi.fn(),
  from: vi.fn(),
  getUser: vi.fn(),
  insert: vi.fn(),
  insertSelect: vi.fn(),
  insertSingle: vi.fn(),
  pregnancyMaybeSingle: vi.fn(),
  revalidatePath: vi.fn(),
  update: vi.fn(),
  updateFirstEq: vi.fn(),
  updateSecondEq: vi.fn(),
  updateSelect: vi.fn(),
  updateMaybeSingle: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createServerSupabase }));
vi.mock("next/cache", () => ({ revalidatePath }));

import { createLetter, updateLetter } from "@/app/actions/letters";

const letterRow = {
  id: "10000000-0000-4000-8000-000000000001",
  pregnancy_id: "pregnancy-1",
  gestational_week: 24,
  body: "Dear little one,",
  created_at: "2026-09-13T10:00:00Z",
  updated_at: "2026-09-13T10:00:00Z",
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-13T10:00:00Z"));
  for (const mock of [
    createServerSupabase,
    from,
    getUser,
    insert,
    insertSelect,
    insertSingle,
    pregnancyMaybeSingle,
    revalidatePath,
    update,
    updateFirstEq,
    updateSecondEq,
    updateSelect,
    updateMaybeSingle,
  ]) mock.mockReset();

  getUser.mockResolvedValue({ data: { user: { id: "auth-user" } } });
  pregnancyMaybeSingle.mockResolvedValue({
    data: { id: "pregnancy-1", edd: "2027-01-03" },
    error: null,
  });
  insertSingle.mockResolvedValue({ data: letterRow, error: null });
  insertSelect.mockReturnValue({ single: insertSingle });
  insert.mockReturnValue({ select: insertSelect });
  updateMaybeSingle.mockResolvedValue({ data: letterRow, error: null });
  updateSelect.mockReturnValue({ maybeSingle: updateMaybeSingle });
  updateSecondEq.mockReturnValue({ select: updateSelect });
  updateFirstEq.mockReturnValue({ eq: updateSecondEq });
  update.mockReturnValue({ eq: updateFirstEq });
  from.mockImplementation((table: string) => {
    if (table === "pregnancies") {
      return { select: () => ({ eq: () => ({ maybeSingle: pregnancyMaybeSingle }) }) };
    }
    if (table === "letters") return { insert, update };
    throw new Error(`unexpected table ${table}`);
  });
  createServerSupabase.mockResolvedValue({ auth: { getUser }, from });
});

describe("createLetter", () => {
  it("returns a field error before authentication for an invalid body", async () => {
    await expect(createLetter({ body: "   " })).resolves.toEqual({
      ok: false,
      errors: { body: "empty" },
    });
    expect(createServerSupabase).not.toHaveBeenCalled();
  });

  it("requires an authenticated caller", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    await expect(createLetter({ body: "Dear little one," })).resolves.toEqual({
      ok: false,
      error: "not_authenticated",
    });
    expect(from).not.toHaveBeenCalled();
  });

  it("derives ownership, pregnancy, and the current week on the server", async () => {
    await expect(createLetter({ body: "  Dear little one,  " })).resolves.toMatchObject({
      ok: true,
      letter: { body: "Dear little one,", gestationalWeek: 24 },
    });
    expect(insert).toHaveBeenCalledWith({
      user_id: "auth-user",
      pregnancy_id: "pregnancy-1",
      gestational_week: 24,
      body: "Dear little one,",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/baby/letters");
  });

  it("returns calm errors for a missing pregnancy and a failed write", async () => {
    pregnancyMaybeSingle.mockResolvedValueOnce({ data: null, error: null });
    await expect(createLetter({ body: "Dear little one," })).resolves.toEqual({
      ok: false,
      error: "pregnancy_not_found",
    });

    pregnancyMaybeSingle.mockResolvedValueOnce({ data: { id: "pregnancy-1", edd: "2027-01-03" }, error: null });
    insertSingle.mockResolvedValueOnce({ data: null, error: { message: "write failed" } });
    await expect(createLetter({ body: "Dear little one," })).resolves.toEqual({
      ok: false,
      error: "write failed",
    });
  });
});

describe("updateLetter", () => {
  it("validates both fields before authentication", async () => {
    await expect(updateLetter({ letterId: "not-an-id", body: "Hello" })).resolves.toEqual({
      ok: false,
      errors: { letterId: "invalid" },
    });
    await expect(updateLetter({ letterId: letterRow.id, body: " " })).resolves.toEqual({
      ok: false,
      errors: { body: "empty" },
    });
    expect(createServerSupabase).not.toHaveBeenCalled();
  });

  it("updates the existing owned row with a trimmed body", async () => {
    await expect(updateLetter({ letterId: letterRow.id, body: "  A new body.  " })).resolves.toMatchObject({ ok: true });
    expect(update).toHaveBeenCalledWith({ body: "A new body." });
    expect(updateFirstEq).toHaveBeenCalledWith("id", letterRow.id);
    expect(updateSecondEq).toHaveBeenCalledWith("user_id", "auth-user");
  });

  it("does not turn an inaccessible id into an exception", async () => {
    updateMaybeSingle.mockResolvedValueOnce({ data: null, error: null });
    await expect(updateLetter({ letterId: letterRow.id, body: "A new body." })).resolves.toEqual({
      ok: false,
      error: "letter_not_found",
    });
  });
});
