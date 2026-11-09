export type Access = "allow" | "sign-in" | "reject";

/** Who may reach a path. Pages send signed-out visitors to sign in; API routes answer 401. Health stays open for setup checks. */
export function accessFor(pathname: string, signedIn: boolean): Access {
  if (signedIn) return "allow";
  if (pathname === "/app" || pathname.startsWith("/app/")) return "sign-in";
  if (pathname.startsWith("/api/") && pathname !== "/api/health") return "reject";
  return "allow";
}
