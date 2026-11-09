import type { AvatarBorderId } from "@/lib/avatar-borders";
import type { SocialLinks } from "./profile";

export type FriendStatus = "none" | "friends" | "incoming" | "outgoing";

/** Only what other students may see. Never school email or age. */
export interface Person {
  id: string;
  name: string;
  avatarId: string;
  borderId?: AvatarBorderId;
  campusName?: string;
  program?: string;
  sameCampus: boolean;
  mutualFriends: number;
  status: FriendStatus;
}

export interface PublicProfile extends Person {
  bio?: string;
  socialLinks: SocialLinks;
  solved: number;
  points: number;
  isSelf: boolean;
}

export interface FriendsFeed {
  requests: Person[];
  friends: Person[];
  people: Person[];
  hasCampus: boolean;
}
