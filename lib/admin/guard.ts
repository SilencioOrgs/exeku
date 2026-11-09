import "server-only";
import { NextResponse } from "next/server";
import { getViewer, type Viewer } from "@/lib/auth/viewer";
import { db, must } from "@/lib/db/client";

/** The admin flag is only ever set by hand in the database, so no request can grant it. */
export async function isAdmin(userId: string) {
  const row = must(await db().from("profiles").select("is_admin").eq("user_id", userId).maybeSingle()) as { is_admin: boolean } | null;
  return row?.is_admin === true;
}

export async function requireAdmin(): Promise<{ viewer: Viewer } | { denied: NextResponse }> {
  const viewer = await getViewer();
  if (!viewer) return { denied: NextResponse.json({ error: "Sign in to continue." }, { status: 401 }) };
  if (!(await isAdmin(viewer.id))) return { denied: NextResponse.json({ error: "Admins only." }, { status: 403 }) };
  return { viewer };
}
