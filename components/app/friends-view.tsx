"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Search, UserPlus } from "lucide-react";
import { FriendsContentSkeleton } from "@/components/app/page-skeletons";
import { PixelAvatar } from "@/components/retro/pixel-avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import { useProfile } from "@/hooks/use-profile";
import { syncProfile } from "@/lib/accounts/api";
import { fetchFriends, friendAction } from "@/lib/friends/api";
import type { FriendsFeed, Person } from "@/types/friends";
import { TextField } from "./school/field";

const SYNCED_PROFILE_KEY = "exeku:synced-profile";

type FriendAct = (action: "request" | "accept" | "remove", id: string) => void;

export function FriendButtons({ person, onAct }: { person: Person; onAct: FriendAct }) {
  return (
    <div className="flex gap-2">
      {person.status === "none" && <Button size="icon-sm" aria-label={`Add ${person.name} as a friend`} title="Add friend" onClick={() => onAct("request", person.id)}><UserPlus size={16} aria-hidden="true" /></Button>}
      {person.status === "incoming" && <>
        <Button size="sm" onClick={() => onAct("accept", person.id)}>Accept {person.name}</Button>
        <Button size="sm" variant="ghost" onClick={() => onAct("remove", person.id)}>Decline</Button>
      </>}
      {person.status === "outgoing" && <Button size="sm" variant="outline" onClick={() => onAct("remove", person.id)}>Cancel request</Button>}
      {person.status === "friends" && <Button size="sm" variant="ghost" onClick={() => onAct("remove", person.id)}>Remove</Button>}
    </div>
  );
}

function PersonCard({ person, onAct }: { person: Person; onAct: FriendAct }) {
  const details = [person.campusName, person.program].filter(Boolean).join(" · ");
  const tags = [person.sameCampus && "Same campus", person.mutualFriends > 0 && `${person.mutualFriends} mutual ${person.mutualFriends === 1 ? "friend" : "friends"}`].filter(Boolean).join(" · ");
  return (
    <li className="profile-panel flex flex-wrap items-center gap-x-4 gap-y-3 p-4">
      <Link href={`/app/friends/${encodeURIComponent(person.id)}`} className="group flex min-w-0 flex-1 basis-40 items-center gap-4 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]">
        <PixelAvatar avatarId={person.avatarId} borderId={person.borderId} size={44} className="m-1.5" />
        <div className="min-w-0">
          <p className="truncate font-semibold group-hover:text-[var(--color-primary-text)]">{person.name}</p>
          {details && <p className="truncate text-xs text-[var(--color-text-muted)]">{details}</p>}
          {tags && <p className="mt-0.5 text-xs text-[var(--color-primary-text)]">{tags}</p>}
        </div>
      </Link>
      <FriendButtons person={person} onAct={onAct} />
    </li>
  );
}

function Section({ title, people, empty, onAct }: { title: string; people: Person[]; empty?: string; onAct: FriendAct }) {
  if (people.length === 0 && !empty) return null;
  return (
    <section className="space-y-3">
      <h2 className="font-semibold">{title}</h2>
      {people.length === 0
        ? <p className="profile-panel p-5 text-sm text-[var(--color-text-muted)]">{empty}</p>
        : <ul className="space-y-3">{people.map((p) => <PersonCard key={p.id} person={p} onAct={onAct} />)}</ul>}
    </section>
  );
}

export function FriendsView() {
  const { profile } = useProfile();
  const [feed, setFeed] = useState<FriendsFeed | null>(null);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string>();
  const [version, setVersion] = useState(0);
  const published = profile && JSON.stringify({ displayName: profile.displayName, avatarId: profile.avatarId, borderId: profile.borderId, bio: profile.bio, socialLinks: profile.socialLinks });

  // Publish profile changes once per session instead of re-POSTing on every Friends visit.
  useEffect(() => {
    if (!published) return;
    try {
      if (sessionStorage.getItem(SYNCED_PROFILE_KEY) === published) return;
    } catch { /* Proceed when storage is unavailable. */ }
    void syncProfile(JSON.parse(published)).then((res) => {
      if (!res.ok) return;
      try { sessionStorage.setItem(SYNCED_PROFILE_KEY, published); } catch { /* Ignore storage errors. */ }
    });
  }, [published]);

  useEffect(() => {
    let live = true;
    void fetchFriends(search).then((result) => {
      if (!live) return;
      if (result.ok) { setFeed(result.data); setError(undefined); }
      else setError(result.error ?? "We couldn't load your friends.");
    });
    return () => { live = false; };
  }, [search, version]);

  const act = async (action: "request" | "accept" | "remove", id: string) => {
    setError(undefined);
    const result = await friendAction(action, id);
    if (result.ok) setVersion((v) => v + 1);
    else setError(result.error ?? "That didn't work. Try again.");
  };
  const submit = (event: FormEvent) => { event.preventDefault(); setSearch(draft.trim()); };
  const searching = search.length >= 2;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Friends</h1>
        <p className="text-sm text-[var(--color-text-muted)]">Find classmates and see who you know in common.</p>
      </header>

      <form onSubmit={submit} className="flex items-end gap-2">
        <div className="min-w-0 flex-1"><TextField id="friend-search" label="Search by name" type="search" value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={40} /></div>
        <Button type="submit" variant="outline" className="h-10 px-4"><Search size={15} aria-hidden="true" />Search</Button>
      </form>

      {error && <p role="alert" className="skeuo-recess rounded-xl p-3 text-sm text-[var(--color-pink)]">{error}</p>}

      {!feed ? (
        !error && <FriendsContentSkeleton />
      ) : (
        <>
          <Section title="Friend requests" people={feed.requests} onAct={act} />
          <Section title={searching ? `Results for ${search}` : "People you may know"} people={feed.people} onAct={act}
            empty={searching ? "Nobody by that name yet." : feed.hasCampus ? "No classmates here yet. Invite your campus to join." : "Add your school to see classmates from your campus."} />
          {!searching && !feed.hasCampus && <Link href="/app/profile" className={buttonVariants({ variant: "outline" })}>Go to Profile</Link>}
          <Section title="Your friends" people={feed.friends} empty="Friends you add show up here." onAct={act} />
        </>
      )}
    </div>
  );
}
