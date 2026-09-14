// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "./proxy";

function request(pathname: string, headers: Record<string, string> = {}) {
  return new NextRequest(new URL(pathname, "http://localhost:3025"), { headers });
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

});

// Preview deployments have no product surface of their own to protect --
// STAGING_BASIC_AUTH exists purely so teammates can reach a real preview
// without a Vercel account, while Vercel's own SSO wall is turned off for
// Preview in project settings. It is never set in Production.
describe("staging basic auth gate", () => {
  it("challenges with 401 when set and no Authorization header is sent", async () => {
    vi.stubEnv("STAGING_BASIC_AUTH", "team:letmein");

    const result = await proxy(request("/"));

    expect(result.status).toBe(401);
    expect(result.headers.get("www-authenticate")).toBe('Basic realm="MamaRoo preview"');
  });

  it("challenges with 401 when the Authorization header has the wrong credentials", async () => {
    vi.stubEnv("STAGING_BASIC_AUTH", "team:letmein");
    const wrongAuth = `Basic ${Buffer.from("team:wrongpassword").toString("base64")}`;

    const result = await proxy(request("/", { authorization: wrongAuth }));

    expect(result.status).toBe(401);
  });

  it("lets the request through to the launch gate when the Authorization header has the right credentials", async () => {
    vi.stubEnv("STAGING_BASIC_AUTH", "team:letmein");
    const correctAuth = `Basic ${Buffer.from("team:letmein").toString("base64")}`;

    const result = await proxy(request("/", { authorization: correctAuth }));

    expect(result.status).toBe(200);
  });

  it("does nothing when STAGING_BASIC_AUTH is not set, matching Production where it is never configured", async () => {
    const result = await proxy(request("/"));
    expect(result.status).toBe(200);
  });
});
