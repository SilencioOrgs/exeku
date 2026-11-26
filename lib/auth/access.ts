export type Access = "allow" | "sign-in" | "reject";

/** Who may reach a path. Pages send signed-out visitors to sign in; API routes answer 401. Health stays open for setup checks. */
export function accessFor(pathname: string, signedIn: boolean): Access {
  if (signedIn) return "allow";
  if (pathname === "/app" || pathname.startsWith("/app/")) return "sign-in";
  if (pathname.startsWith("/api/") && pathname !== "/api/health") return "reject";
  return "allow";
}

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/** Rejects cross-site browser mutations to /api/* using Sec-Fetch-Site and Origin host verification. */
export function checkSameOriginCsrf(req: { method: string; headers: Pick<Headers, "get">; url: string }): string | null {
  if (SAFE_METHODS.has(req.method.toUpperCase())) return null;

  const fetchSite = req.headers.get("sec-fetch-site")?.toLowerCase().trim();
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") {
    return "Cross-site requests are not allowed.";
  }

  const origin = req.headers.get("origin")?.trim();
  if (origin) {
    let originHost: string;
    try {
      originHost = new URL(origin).host.toLowerCase();
    } catch {
      return "Invalid Origin header.";
    }
    const allowedHosts = new Set<string>();
    const hostHeader = req.headers.get("host")?.trim().toLowerCase();
    if (hostHeader) allowedHosts.add(hostHeader);
    try {
      allowedHosts.add(new URL(req.url).host.toLowerCase());
    } catch { /* ignore malformed req.url */ }
    if (allowedHosts.size > 0 && !allowedHosts.has(originHost)) {
      return "Cross-origin requests are not allowed.";
    }
  }

  return null;
}
