import { call } from "@/lib/accounts/api";
import type { FriendsFeed, PublicProfile } from "@/types/friends";

export const fetchFriends = (search: string) => call<FriendsFeed>(`/api/friends${search ? `?q=${encodeURIComponent(search)}` : ""}`);
export const fetchPublicProfile = (userId: string) => call<PublicProfile>(`/api/friends/${encodeURIComponent(userId)}`);
export const friendAction = (action: "request" | "accept" | "remove", userId: string) => call<{ ok: true }>("/api/friends", { action, userId });
