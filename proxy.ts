import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { accessFor, checkSameOriginCsrf } from "@/lib/auth/access";

export default clerkMiddleware(async (auth, req) => {
  if (req.nextUrl.pathname.startsWith("/api/")) {
    const csrfError = checkSameOriginCsrf(req);
    if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 });
  }
  const { userId } = await auth();
  const access = accessFor(req.nextUrl.pathname, Boolean(userId));
  if (access === "sign-in") return NextResponse.redirect(new URL("/setup", req.url));
  if (access === "reject") return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
});

// The landing page and /api/health are left out on purpose, so they never touch Clerk.
export const config = { matcher: ["/app/:path*", "/setup/:path*", "/api/((?!health$).*)", "/__clerk/:path*"] };
