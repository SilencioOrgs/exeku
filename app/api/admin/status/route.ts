import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin/guard";
import { resetAllowed } from "@/lib/admin/repository";
import { getViewer } from "@/lib/auth/viewer";

export async function GET() {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  return NextResponse.json({ isAdmin: await isAdmin(viewer.id), canReset: resetAllowed() });
}
