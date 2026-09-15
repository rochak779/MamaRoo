// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "./proxy";

function request(pathname: string) {
  return new NextRequest(new URL(pathname, "http://localhost:3025"));
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("launch gate", () => {
  it("lets the coming-soon page and the waitlist API through", async () => {
    expect((await proxy(request("/"))).status).toBe(200);
    expect((await proxy(request("/api/waitlist"))).status).toBe(200);
  });

  it("lets static assets through regardless of path", async () => {
    expect((await proxy(request("/motif.svg"))).status).toBe(200);
    expect((await proxy(request("/brand/logo-icon.png"))).status).toBe(200);
    expect((await proxy(request("/favicon.ico"))).status).toBe(200);
  });

  it("404s everything else, including the dev component gallery", async () => {
    expect((await proxy(request("/dev/components"))).status).toBe(404);
    expect((await proxy(request("/dashboard"))).status).toBe(404);
  });

  // Once launched, the launch gate's blanket pass-through hands off to the auth
  // funnel gate (Session 12): a signed-out visitor to a non-public route is no
  // longer 404ed, but she is not let through unrestricted either -- she is sent
  // into the sign-in funnel, same as resolveRedirect()'s own truth table says.
  it("routes a signed-out visitor into the sign-in funnel once launched, rather than opening up freely", async () => {
    vi.stubEnv("APP_LAUNCHED", "true");

    const dashboard = await proxy(request("/dashboard"));
    expect(dashboard.status).toBe(307);
    expect(dashboard.headers.get("location")).toBe("http://localhost:3025/welcome?next=%2Fdashboard");
  });

  it("keeps the dev component gallery open once launched -- it is a QA tool, not part of her funnel", async () => {
    vi.stubEnv("APP_LAUNCHED", "true");
    expect((await proxy(request("/dev/components"))).status).toBe(200);
  });

  it("leaves a signed-out visitor alone on the public auth pages once launched", async () => {
    vi.stubEnv("APP_LAUNCHED", "true");

    for (const path of ["/", "/signin", "/signup", "/verify"]) {
      expect((await proxy(request(path))).status).toBe(200);
    }
  });

  it("never redirects an API route, even once launched, because a POST cannot follow a page redirect", async () => {
    vi.stubEnv("APP_LAUNCHED", "true");
    expect((await proxy(request("/api/waitlist"))).status).toBe(200);
  });

  it("lets a signed-out visitor's OAuth callback through with its code intact, rather than bouncing it to / and losing ?code", async () => {
    vi.stubEnv("APP_LAUNCHED", "true");
    const result = await proxy(request("/auth/callback?code=abc123"));
    expect(result.status).toBe(200);
    // NextResponse.next() carries no Location header -- confirming that, not
    // just the status, is what actually proves the request reached the route
    // handler instead of being redirected.
    expect(result.headers.get("location")).toBeNull();
  });

  // Regression (found 2026-09-15): the matcher's own exclusion list only
  // covers a handful of named paths (_next/static, favicon.ico, icons, ...),
  // so anything else under public/ -- every /illustrations/weeks/*.svg among
  // them -- reached the funnel gate below and got 307ed to /welcome or
  // /consent instead of served, once launched. A signed-out visitor's request
  // for a hero illustration is exactly that case.
  it("lets a static asset through once launched, rather than routing it into the sign-in funnel", async () => {
    vi.stubEnv("APP_LAUNCHED", "true");
    const result = await proxy(request("/illustrations/weeks/week-20.svg"));
    expect(result.status).toBe(200);
    expect(result.headers.get("location")).toBeNull();
  });
});
