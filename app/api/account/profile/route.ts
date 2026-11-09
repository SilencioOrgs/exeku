import { NextResponse } from "next/server";
import { readJson } from "@/lib/accounts/read-json";
import { isObject, text } from "@/lib/accounts/rules";
import { getViewer } from "@/lib/auth/viewer";
import { AVATAR_BORDERS } from "@/lib/avatar-borders";
import { AVATARS, DEFAULT_AVATAR_ID, unlocksAt } from "@/lib/avatars";
import { db, must } from "@/lib/db/client";
import { acceptedTimes, firstSolves } from "@/lib/judge/solves";
import { getMedals } from "@/lib/tournaments/repository";
import { validateDisplayName } from "@/lib/profile-validation";
import { parseGithub, parseLinkedin, parseWebsite } from "@/lib/social-links";

export async function GET() {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  const [solves, solvedAt, medals] = await Promise.all([firstSolves(viewer.id), acceptedTimes(viewer.id), getMedals(viewer.id)]);
  return NextResponse.json({ solved: solves.length, solvedAt, medals });
}

/** Publishes what other students see. Locked avatars are checked here, since the browser can be edited. */
export async function POST(request: Request) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  const body = await readJson(request);
  if (!body.ok) return NextResponse.json({ error: body.error }, { status: body.status });
  const input = isObject(body.value) ? body.value : {};
  const name = validateDisplayName(text(input, "displayName"));
  if (!name.isValid) return NextResponse.json({ error: name.error }, { status: 422 });
  const wanted = text(input, "avatarId");
  const allowed = AVATARS.some((a) => a.id === wanted) && (await firstSolves(viewer.id)).length >= unlocksAt(wanted);
  const border = text(input, "borderId");
  // Other students open these links, so each is re-checked here and anything invalid is dropped.
  const links = isObject(input.socialLinks) ? input.socialLinks : {};
  must(await db().from("profiles").update({
    display_name: name.trimmed,
    avatar_id: allowed ? wanted : DEFAULT_AVATAR_ID,
    border_id: AVATAR_BORDERS.some((b) => b.id === border) ? border : "none",
    bio: text(input, "bio").slice(0, 100) || null,
    social_links: { github: parseGithub(text(links, "github")).handle, linkedin: parseLinkedin(text(links, "linkedin")).handle, website: parseWebsite(text(links, "website")).url },
  }).eq("user_id", viewer.id));
  return NextResponse.json({ ok: true });
}
