import "server-only";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db, must } from "@/lib/db/client";
import { toDisplayName } from "@/lib/profile-validation";
import { normalizeRole } from "@/lib/auth/admin-check";
import type { UserRole } from "@/types/roles";

export interface Viewer {
  id: string;
  name: string;
  campusId?: string;
  role: UserRole;
}

/** The signed-in person from the session, never from the request. Creates their row on first use. */
export async function getViewer(): Promise<Viewer | null> {
  const { userId } = await auth();
  if (!userId) return null;
  const row = must(
    await db().from("profiles").select("display_name,campus_id,role,is_admin").eq("user_id", userId).maybeSingle(),
  ) as { display_name: string; campus_id: string | null; role?: string | null; is_admin?: boolean | null } | null;
  if (row) {
    return {
      id: userId,
      name: row.display_name,
      campusId: row.campus_id ?? undefined,
      role: normalizeRole(row.role, row.is_admin),
    };
  }
  const user = await currentUser();
  const name = toDisplayName(user?.fullName ?? user?.firstName);
  must(await db().from("profiles").upsert({ user_id: userId, display_name: name }, { onConflict: "user_id", ignoreDuplicates: true }));
  return { id: userId, name, role: "student" };
}
