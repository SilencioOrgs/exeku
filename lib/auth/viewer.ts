import "server-only";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db, must } from "@/lib/db/client";
import { toDisplayName } from "@/lib/profile-validation";

export interface Viewer {
  id: string;
  name: string;
  campusId?: string;
}

/** The signed-in person from the session, never from the request. Creates their row on first use. */
export async function getViewer(): Promise<Viewer | null> {
  const { userId } = await auth();
  if (!userId) return null;
  const row = must(await db().from("profiles").select("display_name,campus_id").eq("user_id", userId).maybeSingle());
  if (row) return { id: userId, name: row.display_name, campusId: row.campus_id ?? undefined };
  const user = await currentUser();
  const name = toDisplayName(user?.fullName ?? user?.firstName);
  must(await db().from("profiles").upsert({ user_id: userId, display_name: name }, { onConflict: "user_id", ignoreDuplicates: true }));
  return { id: userId, name };
}
