import { NextResponse } from "next/server";
import { withApiErrors } from "@/lib/api/route-handler";
import { getViewer } from "@/lib/auth/viewer";
import { db } from "@/lib/db/client";
import type { AccountSnapshot } from "@/lib/accounts/restore";
import type { AccountSchool } from "@/types/account";

interface Row {
  display_name: string;
  avatar_id: string | null;
  border_id: string | null;
  bio: string | null;
  social_links: AccountSnapshot["socialLinks"];
  school_email: string | null;
  age: number | null;
  birthday?: string | null;
  school: AccountSchool | null;
}

function isMissingBirthdayColumn(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === "42703" || error.code === "PGRST204") return true;
  return /birthday/i.test(error.message ?? "") && /column|schema cache/i.test(error.message ?? "");
}

/** The signed-in account's own saved profile and school, so a new browser can restore it. Never another user's. */
export const GET = () =>
  withApiErrors("GET /api/account/me", async () => {
    const viewer = await getViewer();
    if (!viewer) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });

    const profileQuery = async (): Promise<Row | null> => {
      const full = await db()
        .from("profiles")
        .select("display_name,avatar_id,border_id,bio,social_links,school_email,age,birthday,school")
        .eq("user_id", viewer.id)
        .maybeSingle();
      if (!full.error) return (full.data as Row | null) ?? null;
      if (!isMissingBirthdayColumn(full.error)) throw new Error(full.error.message);
      const fallback = await db()
        .from("profiles")
        .select("display_name,avatar_id,border_id,bio,social_links,school_email,age,school")
        .eq("user_id", viewer.id)
        .maybeSingle();
      if (fallback.error) throw new Error(fallback.error.message);
      return (fallback.data as Row | null) ?? null;
    };

    const facultyQuery = async (): Promise<boolean> => {
      if (viewer.role === "teacher" || viewer.role === "admin") return true;
      const res = await db()
        .from("faculty_requests")
        .select("status")
        .eq("user_id", viewer.id)
        .maybeSingle();
      if (res.error) return false;
      const status = (res.data as { status?: string } | null)?.status;
      return status === "pending" || status === "approved";
    };

    const [row, isFaculty] = await Promise.all([profileQuery(), facultyQuery()]);
    const account = row?.school && row.school_email && row.age
      ? {
          email: row.school_email,
          age: row.age,
          ...(row.birthday ? { birthday: row.birthday } : {}),
          school: row.school,
          verified: true,
        }
      : null;

    const snapshot: AccountSnapshot = {
      userId: viewer.id,
      account,
      userType: isFaculty ? "faculty" : account ? "student" : undefined,
      displayName: row?.display_name ?? viewer.name,
      avatarId: row?.avatar_id ?? "",
      borderId: row?.border_id ?? "",
      bio: row?.bio ?? null,
      socialLinks: row?.social_links ?? null,
    };
    return NextResponse.json(snapshot, { headers: { "Cache-Control": "private, no-store" } });
  });
