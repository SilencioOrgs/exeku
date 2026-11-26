"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Globe } from "lucide-react";
import { DetailPageSkeleton } from "@/components/app/page-skeletons";
import { PixelAvatar } from "@/components/retro/pixel-avatar";
import { fetchPublicProfile, friendAction } from "@/lib/friends/api";
import { githubUrl, linkedinUrl } from "@/lib/social-links";
import type { PublicProfile } from "@/types/friends";
import { ConfirmDialog } from "@/components/app/workspace/submission-modals";
import { GithubIcon, LinkedinIcon } from "./brand-icons";
import { FriendButtons, type FriendAction } from "./friends-view";
import { hostOf, Readout, SocialLink } from "./profile-view";

const BACK = <Link href="/app/friends" className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]"><ArrowLeft size={14} aria-hidden="true" />All friends</Link>;

export function PublicProfileView({ userId }: { userId: string }) {
  const [person, setPerson] = useState<PublicProfile | null>(null);
  const [loadError, setLoadError] = useState<string>();
  const [actionError, setActionError] = useState<string>();
  const [version, setVersion] = useState(0);
  const [busyAction, setBusyAction] = useState<FriendAction | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);

  useEffect(() => {
    let live = true;
    void fetchPublicProfile(userId).then((result) => {
      if (!live) return;
      if (result.ok) { setPerson(result.data); setLoadError(undefined); }
      else setLoadError(result.error ?? "We couldn't load this profile.");
    });
    return () => { live = false; };
  }, [userId, version]);

  if (loadError) return <div className="mx-auto w-full max-w-4xl space-y-4 p-4 sm:p-6 lg:p-8">{BACK}<p role="alert" className="text-sm text-[var(--color-pink)]">{loadError}</p></div>;
  if (!person) return <DetailPageSkeleton label="Loading profile…" />;

  const act = async (action: FriendAction, id: string) => {
    if (busyAction) return;
    setBusyAction(action);
    setActionError(undefined);
    try {
      const result = await friendAction(action, id);
      if (result.ok) setVersion((v) => v + 1);
      else setActionError(result.error ?? "That didn't work. Try again.");
    } finally {
      setBusyAction(null);
    }
  };
  const { github, linkedin, website } = person.socialLinks;
  const details = [person.campusName, person.program].filter(Boolean).join(" · ");
  const tags = [person.sameCampus && !person.isSelf && "Same campus", person.mutualFriends > 0 && `${person.mutualFriends} mutual ${person.mutualFriends === 1 ? "friend" : "friends"}`].filter(Boolean).join(" · ");

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-4 sm:p-6 lg:p-8">
      {BACK}
      <section className="profile-panel space-y-5 p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
          <PixelAvatar avatarId={person.avatarId} borderId={person.borderId} size={88} className="m-4" />
          <div className="min-w-0 flex-1 basis-52">
            <h1 className="text-2xl font-semibold tracking-tight break-words sm:text-3xl">{person.name}</h1>
            {person.bio && <p className="mt-1 text-sm text-[var(--color-text-muted)]">{person.bio}</p>}
            {details && <p className="mt-1 text-xs text-[var(--color-text-muted)]">{details}</p>}
            {tags && <p className="mt-0.5 text-xs text-[var(--color-primary-text)]">{tags}</p>}
          </div>
          {!person.isSelf && (
            <FriendButtons
              person={person}
              busyAction={busyAction}
              disabled={busyAction !== null}
              onRequestRemove={() => setConfirmRemove(true)}
              onAct={(action, id) => void act(action, id)}
            />
          )}
        </div>
        {actionError && <p role="alert" className="skeuo-recess rounded-xl p-3 text-sm text-[var(--color-pink)]">{actionError}</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          <Readout label="Problems solved" value={person.solved} />
          <Readout label="Points" value={person.points.toLocaleString("en-PH")} />
        </div>
        {(github || linkedin || website) && (
          <div className="grid gap-3 sm:grid-cols-3">
            {github && <SocialLink icon={<GithubIcon />} label="GitHub" handle={github} href={githubUrl(github)} />}
            {linkedin && <SocialLink icon={<LinkedinIcon />} label="LinkedIn" handle={linkedin} href={linkedinUrl(linkedin)} />}
            {website && <SocialLink icon={<Globe size={18} aria-hidden="true" />} label="Portfolio" text={hostOf(website)} href={website} />}
          </div>
        )}
      </section>

      <ConfirmDialog
        open={confirmRemove}
        onOpenChange={setConfirmRemove}
        title={`Remove ${person.name}?`}
        description="You can send them a friend request again anytime."
        confirmLabel="Remove friend"
        loadingLabel="Removing…"
        loading={busyAction === "remove"}
        destructive
        onConfirm={async () => {
          await act("remove", person.id);
          setConfirmRemove(false);
        }}
      />
    </div>
  );
}
