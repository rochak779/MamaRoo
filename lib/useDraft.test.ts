import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useDraft } from "@/lib/useDraft";

const KEY = "test-draft";

afterEach(() => {
  sessionStorage.clear();
  vi.restoreAllMocks();
});

describe("useDraft", () => {
  it("starts from the initial value when nothing is stored", () => {
    const { result } = renderHook(() => useDraft(KEY, { name: "" }));
    expect(result.current.value).toEqual({ name: "" });
  });

  it("writes to sessionStorage on every update", () => {
    const { result } = renderHook(() => useDraft(KEY, { name: "" }));
    act(() => result.current.update({ name: "Priyanka" }));
    expect(JSON.parse(sessionStorage.getItem(KEY)!)).toEqual({ name: "Priyanka" });
  });

  it("merges a partial update into the current value", () => {
    const { result } = renderHook(() => useDraft(KEY, { name: "", city: "" }));
    act(() => result.current.update({ name: "Priyanka" }));
    act(() => result.current.update({ city: "Pune" }));
    expect(result.current.value).toEqual({ name: "Priyanka", city: "Pune" });
  });

  it("restores a stored draft on mount", () => {
    sessionStorage.setItem(KEY, JSON.stringify({ name: "Priyanka" }));
    const { result } = renderHook(() => useDraft(KEY, { name: "" }));
    expect(result.current.value).toEqual({ name: "Priyanka" });
  });

  it("clears the stored draft and reverts to the initial value on reset()", () => {
    const { result } = renderHook(() => useDraft(KEY, { name: "" }));
    act(() => result.current.update({ name: "Priyanka" }));
    act(() => result.current.reset());
    expect(result.current.value).toEqual({ name: "" });
    expect(sessionStorage.getItem(KEY)).toBeNull();
  });

  it("survives an unmount and remount with the draft intact", () => {
    const first = renderHook(() => useDraft(KEY, { name: "" }));
    act(() => first.result.current.update({ name: "Priyanka" }));
    first.unmount();

    const second = renderHook(() => useDraft(KEY, { name: "" }));
    expect(second.result.current.value).toEqual({ name: "Priyanka" });
  });

  it("silently no-ops on read when sessionStorage throws, e.g. Safari private mode", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    const { result } = renderHook(() => useDraft(KEY, { name: "fallback" }));
    expect(result.current.value).toEqual({ name: "fallback" });
  });

  it("silently no-ops on write when sessionStorage throws, and the form still works", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    const { result } = renderHook(() => useDraft(KEY, { name: "" }));
    act(() => result.current.update({ name: "Priyanka" }));
    expect(result.current.value).toEqual({ name: "Priyanka" });
  });

  it("silently no-ops on reset when sessionStorage throws", () => {
    const { result } = renderHook(() => useDraft(KEY, { name: "" }));
    act(() => result.current.update({ name: "Priyanka" }));
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    act(() => result.current.reset());
    expect(result.current.value).toEqual({ name: "" });
  });

  it("ignores a differently-shaped stored draft field by merging over the initial value", () => {
    sessionStorage.setItem(KEY, JSON.stringify({ unrelated: "junk" }));
    const { result } = renderHook(() => useDraft(KEY, { name: "fallback" }));
    expect(result.current.value).toEqual({ name: "fallback", unrelated: "junk" });
  });
});
