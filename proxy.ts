import { NextResponse, type NextRequest } from "next/server";
import { withSupabaseSession } from "@/lib/supabase/middleware";
import { getCurrentConsents } from "@/lib/supabase/queries/consent";
import { resolveRedirect } from "@/lib/domain/routing";

// Launch gate: until APP_LAUNCHED=true, only the coming-soon page and its
// waitlist API are public. Everything else 404s, so half-built product never
// reaches visitors just because it landed on main. Static assets (anything
// with a file extension: _next output, public/, favicon) are always let
// through; they carry no product surface on their own.
const PUBLIC_ROUTES = new Set(["/", "/api/waitlist"]);
const HAS_FILE_EXTENSION = /\.[a-zA-Z0-9]+$/;

// Next.js 16 renamed the root request-interception file convention from
// `middleware.ts` to `proxy.ts` (the `middleware` export still works but is
// deprecated and logs a warning on every build).
export async function proxy(request: NextRequest) {
  if (process.env.APP_LAUNCHED !== "true") {
    const { pathname } = request.nextUrl;
    if (PUBLIC_ROUTES.has(pathname) || HAS_FILE_EXTENSION.test(pathname)) {
      return NextResponse.next();
    }
    return new NextResponse("Not found", { status: 404 });
  }

  // API routes answer their own auth questions (or, like the waitlist API,
  // answer none) -- resolveRedirect() is a page-navigation concept, and
  // sending a POST to a JSON endpoint a 307 to "/" would silently break it.
  // /auth/* (the OAuth callback) must also be exempt: she has no session yet
  // when Google redirects her back with ?code=..., so isAuthed is false and
  // the funnel would send her to "/" (or, once signed in but not consented,
  // to "/consent"), discarding the code and the route handler that exchanges
  // it would never run. The dev component gallery is an internal QA tool, not
  // part of her funnel; it stays reachable without an account, same as before
  // this gate existed.
  const { pathname: launchedPathname } = request.nextUrl;
  if (
    launchedPathname.startsWith("/api/") ||
    launchedPathname.startsWith("/auth/") ||
    launchedPathname.startsWith("/dev/")
  ) {
    return NextResponse.next();
  }

  // Once launched, the blanket pass-through is replaced by the funnel gate:
  // refresh the Supabase session and send every request to where
  // resolveRedirect() says it belongs.
  const { response, supabase, user } = await withSupabaseSession(request);

  let hasConsented = false;
  let hasOnboarded = false;

  if (user) {
    const [consents, profile] = await Promise.all([
      getCurrentConsents(supabase), // the shared query; never the raw consents table
      supabase.from("profiles").select("onboarding_completed_at").maybeSingle(),
    ]);
    hasConsented = consents.terms.granted && consents.privacy.granted;
    hasOnboarded = Boolean(profile.data?.onboarding_completed_at);
  }

  const target = resolveRedirect({
    path: request.nextUrl.pathname,
    isAuthed: Boolean(user),
    hasConsented,
    hasOnboarded,
  });

  if (target) {
    const url = request.nextUrl.clone();
    const [pathname, query] = target.split("?");
    url.pathname = pathname!;
    url.search = query ? `?${query}` : "";
    const redirectResponse = NextResponse.redirect(url);
    // withSupabaseSession() may have just rotated the auth cookies onto
    // `response`. Building a fresh NextResponse.redirect() here means those
    // Set-Cookie headers live on a response object we're about to discard --
    // copy them onto the one we actually return, or a refreshed token is
    // silently dropped and the browser keeps retrying with the stale one.
    for (const cookie of response.cookies.getAll()) redirectResponse.cookies.set(cookie);
    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons|manifest.webmanifest|motif.svg|.well-known).*)"],
};
