"use client";

import { useState } from "react";
import Link from "next/link";
import { PixelAvatar } from "@/components/retro/pixel-avatar";
import type { AvatarBorderId } from "@/lib/avatar-borders";
import type { AdminUser } from "@/types/admin";
import { TextField } from "../school/field";

const HEAD = "px-4 py-3 font-medium";

export function UsersPanel({ users }: { users: AdminUser[] }) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const shown = users.filter((u) => !needle || [u.name, u.schoolEmail, u.campus, u.program].some((value) => value?.toLowerCase().includes(needle)));

  return (
    <section aria-labelledby="users-heading" className="space-y-3">
      <h2 id="users-heading" className="text-lg font-semibold">Users</h2>
      <TextField id="user-search" label="Search by name, email, campus or program" type="search" value={query} onChange={(e) => setQuery(e.target.value)} />
      {shown.length === 0 ? <p className="profile-panel p-5 text-sm text-[var(--color-text-muted)]">{users.length === 0 ? "Nobody has signed in yet." : "No users match that search."}</p> : (
        <div className="profile-panel overflow-x-auto">
          <table className="w-full min-w-[42rem] text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-xs text-[var(--color-text-muted)]">
                <th scope="col" className={HEAD}>Student</th>
                <th scope="col" className={HEAD}>School</th>
                <th scope="col" className={`${HEAD} text-right`}>Solved</th>
                <th scope="col" className={`${HEAD} text-right`}>Points</th>
                <th scope="col" className={HEAD}>Joined</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((user) => (
                <tr key={user.id} className="border-b border-[var(--color-border-subtle)] last:border-0">
                  <td className="px-4 py-3">
                    <Link href={`/app/friends/${encodeURIComponent(user.id)}`} className="flex items-center gap-3 rounded-lg hover:text-[var(--color-primary-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]">
                      <PixelAvatar avatarId={user.avatarId} borderId={user.borderId as AvatarBorderId} size={30} className="m-1" />
                      <span className="font-medium">{user.name}</span>
                      {user.isAdmin && <span className="rounded-full border border-[var(--color-primary)] px-2 text-xs text-[var(--color-primary-text)]">Admin</span>}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-[var(--color-text-muted)]">
                    {user.schoolEmail ? <><p className="text-[var(--color-text-main)]">{user.schoolEmail}</p><p className="text-xs">{[user.campus, user.program].filter(Boolean).join(" · ")}</p></> : "No school added"}
                  </td>
                  <td className="px-4 py-3 text-right font-code tabular-nums">{user.solved}</td>
                  <td className="px-4 py-3 text-right font-code tabular-nums">{user.points.toLocaleString("en-PH")}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-[var(--color-text-muted)]">{new Date(user.joinedAt).toLocaleDateString(undefined, { dateStyle: "medium" })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
