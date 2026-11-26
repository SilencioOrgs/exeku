import { NextResponse } from "next/server";
import { withApiErrors } from "@/lib/api/route-handler";
import { getViewer } from "@/lib/auth/viewer";
import { db, must } from "@/lib/db/client";
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
  school: AccountSchool | null;
}

/** The signed-in account's own saved profile and school, so a new browser can restore it. Never another user's. */
export const GET = () =>
  withApiErrors("GET /api/account/me", async () => {
    const viewer = await getViewer();
    if (!viewer) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
    const row = must(
      await db()
        .from("profiles")
        .select("display_name,avatar_id,border_id,bio,social_links,school_email,age,school")
        .eq("user_id", viewer.id)
        .maybeSingle(),
    ) as Row | null;
    const snapshot: AccountSnapshot = {
      userId: viewer.id,
      account: row?.school && row.school_email && row.age
        ? { email: row.school_email, age: row.age, school: row.school, verified: true }
        : null,
      displayName: row?.display_name ?? viewer.name,
      avatarId: row?.avatar_id ?? "",
      borderId: row?.border_id ?? "",
      bio: row?.bio ?? null,
      socialLinks: row?.social_links ?? null,
    };
    return NextResponse.json(snapshot, { headers: { "Cache-Control": "private, no-store" } });
  });
