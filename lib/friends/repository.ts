import "server-only";
import { isObject, text } from "@/lib/accounts/rules";
import type { Viewer } from "@/lib/auth/viewer";
import { db, fetchAllPages, must } from "@/lib/db/client";
import type { AvatarBorderId } from "@/lib/avatar-borders";
import { notifyUsers } from "@/lib/notifications/repository";
import type { SocialLinks } from "@/types/profile";
import type { FriendsFeed, FriendStatus, Person, PublicProfile } from "@/types/friends";

type Edge = { requester: string; addressee: string; status: "pending" | "accepted" };
type ProfileRow = { user_id: string; display_name: string; avatar_id: string; border_id: string; campus_id: string | null; school: { campus?: string; program?: string } | null };
export type FriendActionResult = { ok: true } | { ok: false; status: number; error: string };

// Deliberately excludes school_email and age.
const PUBLIC_COLUMNS = "user_id,display_name,avatar_id,border_id,campus_id,school";
const MAX_LISTED = 40;
const IN_CHUNK_SIZE = 100;
const UNIQUE_VIOLATION = "23505";

async function edgesOf(id: string) {
  const [asked, received] = await Promise.all([
    fetchAllPages<Edge>((from, to) =>
      db().from("friendships").select("requester,addressee,status").eq("requester", id).order("addressee").range(from, to),
    ),
    fetchAllPages<Edge>((from, to) =>
      db().from("friendships").select("requester,addressee,status").eq("addressee", id).order("requester").range(from, to),
    ),
  ]);
  return [...asked, ...received];
}

async function fetchPublicProfiles(ids: string[]): Promise<ProfileRow[]> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return [];
  const batches = await Promise.all(
    Array.from({ length: Math.ceil(unique.length / IN_CHUNK_SIZE) }, (_, idx) =>
      db()
        .from("profiles")
        .select(PUBLIC_COLUMNS)
        .in("user_id", unique.slice(idx * IN_CHUNK_SIZE, (idx + 1) * IN_CHUNK_SIZE))
        .then((r) => must(r) as ProfileRow[]),
    ),
  );
  return batches.flat();
}

/** Counts, for everyone else, how many of the viewer's friends are also their friend. */
async function countMutuals(viewerId: string, friendIds: string[]) {
  const counts = new Map<string, number>();
  if (friendIds.length === 0) return counts;
  const friends = new Set(friendIds);
  const bump = (id: string) => { if (id !== viewerId) counts.set(id, (counts.get(id) ?? 0) + 1); };

  const chunkBatches = await Promise.all(
    Array.from({ length: Math.ceil(friendIds.length / IN_CHUNK_SIZE) }, (_, idx) => {
      const chunk = friendIds.slice(idx * IN_CHUNK_SIZE, (idx + 1) * IN_CHUNK_SIZE);
      return Promise.all([
        fetchAllPages<Edge>((from, to) =>
          db().from("friendships").select("requester,addressee,status").eq("status", "accepted").in("requester", chunk).order("requester").order("addressee").range(from, to),
        ),
        fetchAllPages<Edge>((from, to) =>
          db().from("friendships").select("requester,addressee,status").eq("status", "accepted").in("addressee", chunk).order("addressee").order("requester").range(from, to),
        ),
      ]);
    }),
  );

  for (const [asked, received] of chunkBatches) {
    for (const edge of asked) bump(edge.addressee);
    // A row between two of the viewer's friends was already counted once above, for the addressee.
    for (const edge of received) bump(edge.requester);
  }
  for (const id of friends) if (!counts.get(id)) counts.delete(id);
  return counts;
}

/** How the viewer relates to everyone they have a row with, and who they share friends with. */
async function relationships(viewer: Viewer) {
  const edges = await edgesOf(viewer.id);
  const statusOf = new Map<string, FriendStatus>(edges.map((e) => {
    const other = e.requester === viewer.id ? e.addressee : e.requester;
    return [other, e.status === "accepted" ? "friends" : e.requester === viewer.id ? "outgoing" : "incoming"];
  }));
  const friendIds = [...statusOf].filter(([, s]) => s === "friends").map(([id]) => id);
  return { statusOf, mutuals: await countMutuals(viewer.id, friendIds) };
}

type Relationships = Awaited<ReturnType<typeof relationships>>;

const toPerson = (viewer: Viewer, r: ProfileRow, { statusOf, mutuals }: Relationships): Person => ({
  id: r.user_id,
  name: r.display_name,
  avatarId: r.avatar_id,
  borderId: r.border_id as AvatarBorderId,
  campusName: r.school?.campus,
  program: r.school?.program,
  sameCampus: Boolean(viewer.campusId) && r.campus_id === viewer.campusId,
  mutualFriends: mutuals.get(r.user_id) ?? 0,
  status: statusOf.get(r.user_id) ?? "none",
});

/** What any signed-in student can see on someone's profile. School email and age are never selected. */
export async function getPublicProfile(viewer: Viewer, userId: string): Promise<PublicProfile | null> {
  const row = must(await db().from("profiles").select(`${PUBLIC_COLUMNS},bio,social_links`).eq("user_id", userId).maybeSingle()) as unknown as (ProfileRow & { bio: string | null; social_links: SocialLinks | null }) | null;
  if (!row) return null;
  const [score, viewerEdges, targetEdges] = await Promise.all([
    db().from("leaderboard").select("solved,points").eq("user_id", userId).maybeSingle().then((r) => must(r) as { solved: number; points: number } | null),
    edgesOf(viewer.id),
    userId === viewer.id ? Promise.resolve([] as Edge[]) : edgesOf(userId),
  ]);

  const statusOf = new Map<string, FriendStatus>(viewerEdges.map((e) => {
    const other = e.requester === viewer.id ? e.addressee : e.requester;
    return [other, e.status === "accepted" ? "friends" : e.requester === viewer.id ? "outgoing" : "incoming"];
  }));
  const viewerFriends = new Set([...statusOf].filter(([, s]) => s === "friends").map(([id]) => id));
  let mutualCount = 0;
  for (const edge of targetEdges) {
    if (edge.status !== "accepted") continue;
    const other = edge.requester === userId ? edge.addressee : edge.requester;
    if (other !== viewer.id && viewerFriends.has(other)) mutualCount++;
  }
  const mutuals = new Map<string, number>(mutualCount > 0 ? [[userId, mutualCount]] : []);

  return {
    ...toPerson(viewer, row, { statusOf, mutuals }),
    bio: row.bio ?? undefined,
    socialLinks: row.social_links ?? {},
    solved: score?.solved ?? 0,
    points: score?.points ?? 0,
    isSelf: userId === viewer.id,
  };
}

export async function getFriendsFeed(viewer: Viewer, rawSearch: string): Promise<FriendsFeed> {
  const search = rawSearch.trim().slice(0, 40);

  const foundPromise: PromiseLike<string[]> = search.length >= 2
    ? db()
        .from("profiles")
        .select("user_id")
        .ilike("display_name", `%${search.replace(/[\\%_]/g, "\\$&")}%`)
        .limit(MAX_LISTED)
        .then((r) => (must(r) as { user_id: string }[]).map((row) => row.user_id))
    : viewer.campusId
      ? db()
          .from("profiles")
          .select("user_id")
          .eq("campus_id", viewer.campusId)
          .limit(MAX_LISTED)
          .then((r) => (must(r) as { user_id: string }[]).map((row) => row.user_id))
      : Promise.resolve([]);

  const [related, foundIds] = await Promise.all([relationships(viewer), foundPromise]);
  const { statusOf, mutuals } = related;

  // Cap mutual-only suggestions to top MAX_LISTED before querying profiles to prevent HTTP 414 on large graphs.
  const topMutualIds = search.length >= 2
    ? []
    : [...mutuals.entries()]
        .filter(([id]) => !statusOf.has(id))
        .sort((a, b) => b[1] - a[1])
        .slice(0, MAX_LISTED)
        .map(([id]) => id);

  const ids = [...new Set([...statusOf.keys(), ...topMutualIds, ...foundIds])].filter((id) => id !== viewer.id);
  const rows = ids.length ? await fetchPublicProfiles(ids) : [];
  const people = rows.map((r) => toPerson(viewer, r, related)).sort((a, b) => b.mutualFriends - a.mutualFriends || Number(b.sameCampus) - Number(a.sameCampus) || a.name.localeCompare(b.name));

  const found = new Set(foundIds);
  return {
    requests: people.filter((p) => p.status === "incoming"),
    friends: people.filter((p) => p.status === "friends"),
    people: search.length >= 2
      ? people.filter((p) => found.has(p.id)).slice(0, MAX_LISTED)
      : people.filter((p) => (p.status === "none" || p.status === "outgoing") && (p.sameCampus || p.mutualFriends > 0)).slice(0, MAX_LISTED),
    hasCampus: Boolean(viewer.campusId),
  };
}

const failed = (status: number, error: string): FriendActionResult => ({ ok: false, status, error });

/** The acting person is always the signed-in viewer, so nobody can accept or remove on someone else's behalf. */
export async function performFriendAction(viewer: Viewer, input: unknown): Promise<FriendActionResult> {
  if (!isObject(input)) return failed(400, "Invalid request.");
  const userId = text(input, "userId");
  if (!userId || userId === viewer.id) return failed(400, "Choose another student.");
  const edge = (await edgesOf(viewer.id)).find((e) => e.requester === userId || e.addressee === userId);
  const actorName = viewer.name || "A student";

  switch (input.action) {
    case "request": {
      if (edge?.status === "accepted") return failed(409, "You're already friends.");
      if (edge?.requester === viewer.id) return failed(409, "Your request is already sent.");
      if (edge) {
        // They already asked, so asking back is the same as accepting.
        must(await db().from("friendships").update({ status: "accepted" }).eq("requester", userId).eq("addressee", viewer.id));
        await notifyUsers([userId], {
          kind: "friend_accepted",
          title: `${actorName} accepted your friend request`,
          body: "You are now friends on Exeku.",
          href: `/app/friends/${encodeURIComponent(viewer.id)}`,
        });
        return { ok: true };
      }
      const target = must(await db().from("profiles").select("user_id").eq("user_id", userId).maybeSingle());
      if (!target) return failed(404, "That student wasn't found.");
      const { error } = await db().from("friendships").insert({ requester: viewer.id, addressee: userId });
      if (error?.code === UNIQUE_VIOLATION) return failed(409, "Your request is already sent.");
      if (error) throw new Error(`Database error: ${error.message}`);
      await notifyUsers([userId], {
        kind: "friend_request",
        title: `${actorName} sent you a friend request`,
        body: "Open Friends to accept or decline.",
        href: "/app/friends",
      });
      return { ok: true };
    }
    case "accept": {
      if (!edge || edge.status !== "pending" || edge.addressee !== viewer.id) return failed(404, "That request is no longer waiting.");
      must(await db().from("friendships").update({ status: "accepted" }).eq("requester", userId).eq("addressee", viewer.id));
      await notifyUsers([userId], {
        kind: "friend_accepted",
        title: `${actorName} accepted your friend request`,
        body: "You are now friends on Exeku.",
        href: `/app/friends/${encodeURIComponent(viewer.id)}`,
      });
      return { ok: true };
    }
    case "remove": {
      if (!edge) return { ok: true };
      must(await db().from("friendships").delete().eq("requester", edge.requester).eq("addressee", edge.addressee));
      return { ok: true };
    }
    default:
      return failed(400, "Unknown action.");
  }
}
