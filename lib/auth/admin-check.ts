import "server-only";
import { db, must } from "@/lib/db/client";
import type { UserRole } from "@/types/roles";

export function normalizeRole(role?: string | null, isAdminFlag?: boolean | null): UserRole {
  if (isAdminFlag || role === "admin") return "admin";
  if (role === "teacher") return "teacher";
  return "student";
}

/** True only for accounts granted admin privileges in the database. */
export async function isAdmin(userId: string): Promise<boolean> {
  const row = must(
    await db().from("profiles").select("is_admin,role").eq("user_id", userId).maybeSingle(),
  ) as { is_admin?: boolean; role?: string } | null;
  return Boolean(row?.is_admin || row?.role === "admin");
}
