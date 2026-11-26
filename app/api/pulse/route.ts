import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { withApiErrors } from "@/lib/api/route-handler";
import { db, exactCount, isMissingRelationError } from "@/lib/db/client";
import { getTournamentScheduleState } from "@/lib/tournaments/repository";
import type { UserRole } from "@/types/roles";
import type { ActiveTournament } from "@/types/tournament";

export interface PulsePayload {
  role: UserRole;
  notificationsUnread: number;
  notificationsLatestAt: string | null;
  friendRequestsCount: number;
  activeTournament: ActiveTournament | null;
  nextTournamentStartsAt: string | null;
  activeTournamentEndsAt: string | null;
}

async function fetchNotificationPulse(userId: string): Promise<{ unread: number; latestAt: string | null }> {
  const [unreadRes, latestRes] = await Promise.all([
    db().from("notifications").select("id", { count: "exact", head: true }).eq("user_id", userId).is("read_at", null),
    db().from("notifications").select("created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(1),
  ]);
  if (unreadRes.error) {
    if (isMissingRelationError(unreadRes.error, ["notifications"])) return { unread: 0, latestAt: null };
    throw new Error(`Database error: ${unreadRes.error.message}`);
  }
  if (latestRes.error) {
    if (isMissingRelationError(latestRes.error, ["notifications"])) return { unread: 0, latestAt: null };
    throw new Error(`Database error: ${latestRes.error.message}`);
  }
  const latestRow = ((latestRes.data ?? []) as { created_at: string }[])[0];
  return { unread: unreadRes.count ?? 0, latestAt: latestRow?.created_at ?? null };
}

function resolveRole(row: { role?: string | null; is_admin?: boolean | null } | null): UserRole {
  if (row?.is_admin || row?.role === "admin") return "admin";
  if (row?.role === "teacher") return "teacher";
  return "student";
}

export const GET = (req: Request) =>
  withApiErrors("GET /api/pulse", async () => {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });

    const [profileRes, notifPulse, friendRequestsCount, tournament] = await Promise.all([
      db().from("profiles").select("role,is_admin").eq("user_id", userId).maybeSingle(),
      fetchNotificationPulse(userId),
      exactCount(
        db().from("friendships").select("requester", { count: "exact", head: true }).eq("addressee", userId).eq("status", "pending"),
      ),
      getTournamentScheduleState({ id: userId }),
    ]);

    const role = resolveRole((profileRes.data ?? null) as { role?: string | null; is_admin?: boolean | null } | null);
    const payload: PulsePayload = {
      role,
      notificationsUnread: notifPulse.unread,
      notificationsLatestAt: notifPulse.latestAt,
      friendRequestsCount,
      activeTournament: tournament.active,
      nextTournamentStartsAt: tournament.nextStartsAt,
      activeTournamentEndsAt: tournament.activeEndsAt,
    };

    const body = JSON.stringify(payload);
    const etag = `W/"${createHash("sha256").update(body).digest("hex").slice(0, 16)}"`;
    const headers = {
      "Content-Type": "application/json",
      "Cache-Control": "private, no-cache",
      Vary: "Cookie",
      ETag: etag,
    };

    if (req.headers.get("if-none-match") === etag) {
      return new NextResponse(null, { status: 304, headers });
    }

    return new NextResponse(body, { status: 200, headers });
  });
