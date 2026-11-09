import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/guard";
import { listUsers } from "@/lib/admin/repository";

export async function GET() {
  const admin = await requireAdmin();
  if ("denied" in admin) return admin.denied;
  return NextResponse.json({ users: await listUsers() });
}
