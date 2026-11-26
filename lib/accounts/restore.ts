import type { StudentAccount } from "@/types/account";
import type { LocalProfile, ProfileInput, SocialLinks } from "@/types/profile";
import type { AvatarBorderId } from "@/lib/avatar-borders";

/** What the server keeps for the signed-in account. Only ever returned to that account (GET /api/account/me). */
export interface AccountSnapshot {
  userId: string;
  account: StudentAccount | null;
  displayName: string;
  avatarId: string;
  borderId: string;
  bio: string | null;
  socialLinks: { github?: string | null; linkedin?: string | null; website?: string | null } | null;
}

const links = (value: SocialLinks | AccountSnapshot["socialLinks"] | undefined): SocialLinks => ({
  github: value?.github || undefined,
  linkedin: value?.linkedin || undefined,
  website: value?.website || undefined,
});

/**
 * The changes that bring this browser's profile up to date with the server, or null when nothing differs.
 * A new laptop starts with an empty profile; this restores the school and published profile from the account.
 * Never applies another account's data: a shared computer may still hold someone else's active profile.
 */
export function restoreUpdates(local: LocalProfile, server: AccountSnapshot): Partial<ProfileInput> | null {
  if (!local.ownerId || local.ownerId !== server.userId) return null;
  const updates: Partial<ProfileInput> = {};
  const account = server.account;
  if (account && (local.account?.email !== account.email || local.account?.school.campusId !== account.school.campusId || !local.account?.verified)) {
    updates.account = account;
    updates.userType = "student";
  }
  if (server.displayName && server.displayName !== local.displayName) updates.displayName = server.displayName;
  if (server.avatarId && server.avatarId !== local.avatarId) updates.avatarId = server.avatarId;
  if (server.borderId && server.borderId !== (local.borderId ?? "none")) updates.borderId = server.borderId as AvatarBorderId;
  if ((server.bio ?? "") !== (local.bio ?? "")) updates.bio = server.bio ?? "";
  const serverLinks = links(server.socialLinks);
  if (JSON.stringify(serverLinks) !== JSON.stringify(links(local.socialLinks))) updates.socialLinks = serverLinks;
  return Object.keys(updates).length ? updates : null;
}
