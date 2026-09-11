const PUBLIC_PATHS = ["/", "/signin", "/signup", "/verify"];
const LEGAL_PREFIX = "/legal";
const CONSENT_PATH = "/consent";
const ONBOARDING_FORM = "/onboarding/profile";
const ONBOARDING_INTRO = "/onboarding/intro";
const HOME = "/today";

export interface RedirectInput {
  path: string;
  isAuthed: boolean;
  hasConsented: boolean;
  hasOnboarded: boolean;
}

/** A path is only safe to return to if it is same-origin and not protocol-relative. */
function safeNext(path: string): string | null {
  if (!path.startsWith("/") || path.startsWith("//")) return null;
  return path;
}

/**
 * Returns the path to redirect to, or null to stay put. Every gate in the funnel
 * lives here, so no page component has to re-derive it.
 */
export function resolveRedirect({ path, isAuthed, hasConsented, hasOnboarded }: RedirectInput): string | null {
  const isPublic = PUBLIC_PATHS.includes(path) || path.startsWith(LEGAL_PREFIX);

  if (!isAuthed) {
    if (isPublic) return null;
    const next = safeNext(path);
    return next ? `/?next=${encodeURIComponent(next)}` : "/";
  }

  if (!hasConsented) {
    return path === CONSENT_PATH || path.startsWith(LEGAL_PREFIX) ? null : CONSENT_PATH;
  }

  if (!hasOnboarded) {
    if (path === ONBOARDING_FORM || path === ONBOARDING_INTRO || path.startsWith(LEGAL_PREFIX)) return null;
    return ONBOARDING_FORM;
  }

  if (isPublic || path === CONSENT_PATH || path.startsWith("/onboarding")) return HOME;
  return null;
}
