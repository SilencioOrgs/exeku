import { NextResponse } from "next/server";
import { computeAgeFromBirthday, MAX_ACCOUNT_AGE, MIN_ACCOUNT_AGE } from "@/lib/accounts/birthday";
import { readJson } from "@/lib/accounts/read-json";
import { isObject, text } from "@/lib/accounts/rules";
import { withApiErrors } from "@/lib/api/route-handler";
import { getViewer } from "@/lib/auth/viewer";
import { AVATAR_BORDERS } from "@/lib/avatar-borders";
import { AVATARS, DEFAULT_AVATAR_ID, unlocksAt } from "@/lib/avatars";
import { db, must } from "@/lib/db/client";
import { firstSolves, solveSummary } from "@/lib/judge/solves";
import { getMedals } from "@/lib/tournaments/repository";
import { validateDisplayName } from "@/lib/profile-validation";
import { parseGithub, parseLinkedin, parseWebsite } from "@/lib/social-links";

export const GET = () =>
  withApiErrors("GET /api/account/profile", async () => {
    const viewer = await getViewer();
    if (!viewer) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
    const [summary, medals] = await Promise.all([solveSummary(viewer.id), getMedals(viewer.id)]);
    return NextResponse.json({ solved: summary.solved, solvedAt: summary.solvedAt, medals, role: viewer.role });
  });

/** Publishes what other students see. Locked avatars are checked here, since the browser can be edited. */
export const POST = (request: Request) =>
  withApiErrors("POST /api/account/profile", async () => {
    const viewer = await getViewer();
    if (!viewer) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
    const body = await readJson(request);
    if (!body.ok) return NextResponse.json({ error: body.error }, { status: body.status });
    const input = isObject(body.value) ? body.value : {};
    const name = validateDisplayName(text(input, "displayName"));
    if (!name.isValid) return NextResponse.json({ error: name.error, fieldErrors: { displayName: name.error ?? "Invalid display name." } }, { status: 422 });

    const birthdayText = text(input, "birthday");
    let birthdayPatch: { birthday: string; age: number } | null = null;
    if (birthdayText) {
      const computedAge = computeAgeFromBirthday(birthdayText);
      if (computedAge === null) {
        return NextResponse.json({ error: "Enter a valid birthday.", fieldErrors: { birthday: "Enter a valid birthday." } }, { status: 422 });
      }
      if (computedAge < MIN_ACCOUNT_AGE || computedAge > MAX_ACCOUNT_AGE) {
        const msg = `You must be between ${MIN_ACCOUNT_AGE} and ${MAX_ACCOUNT_AGE} years old.`;
        return NextResponse.json({ error: msg, fieldErrors: { birthday: msg } }, { status: 422 });
      }
      birthdayPatch = { birthday: birthdayText, age: computedAge };
    }

    const wanted = text(input, "avatarId");
    const allowed = AVATARS.some((a) => a.id === wanted) && (await firstSolves(viewer.id)).length >= unlocksAt(wanted);
    const border = text(input, "borderId");
    // Other students open these links, so each is re-checked here and anything invalid is dropped.
    const links = isObject(input.socialLinks) ? input.socialLinks : {};
    const baseUpdate = {
      display_name: name.trimmed,
      avatar_id: allowed ? wanted : DEFAULT_AVATAR_ID,
      border_id: AVATAR_BORDERS.some((b) => b.id === border) ? border : "none",
      bio: text(input, "bio").slice(0, 100) || null,
      social_links: {
        github: parseGithub(text(links, "github")).handle,
        linkedin: parseLinkedin(text(links, "linkedin")).handle,
        website: parseWebsite(text(links, "website")).url,
      },
      ...(birthdayPatch ? { age: birthdayPatch.age } : {}),
    };

    if (birthdayPatch) {
      const attempt = await db()
        .from("profiles")
        .update({ ...baseUpdate, birthday: birthdayPatch.birthday })
        .eq("user_id", viewer.id);
      if (attempt.error) {
        if (attempt.error.code === "42703" || attempt.error.code === "PGRST204" || /birthday/i.test(attempt.error.message)) {
          must(await db().from("profiles").update(baseUpdate).eq("user_id", viewer.id));
        } else {
          throw new Error(attempt.error.message);
        }
      }
    } else {
      must(await db().from("profiles").update(baseUpdate).eq("user_id", viewer.id));
    }
    return NextResponse.json({ ok: true });
  });
