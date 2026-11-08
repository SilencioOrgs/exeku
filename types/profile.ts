import type { StudentAccount } from "./account";
import type { AppearancePreferences } from "./appearance";
import type { AvatarBorderId } from "@/lib/avatar-borders";

export type ExperienceLevel = "beginner" | "intermediate" | "advanced";

export type PreferredLanguage = "python" | "java" | "cpp" | "c";

/** Usernames only, never full URLs. See lib/social-links.ts. */
export interface SocialLinks {
  github?: string;
  linkedin?: string;
}

export type UserType = "student" | "explorer";

export interface LocalProfile {
  id: string;
  displayName: string;
  bio?: string;
  avatarId: string;
  experienceLevel: ExperienceLevel;
  preferredLanguage: PreferredLanguage;
  appearancePreferences?: AppearancePreferences;
  account?: StudentAccount;
  socialLinks?: SocialLinks;
  userType?: UserType;
  borderId?: AvatarBorderId;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileInput {
  displayName: string;
  bio?: string;
  avatarId: string;
  experienceLevel: ExperienceLevel;
  preferredLanguage: PreferredLanguage;
  account?: StudentAccount;
  socialLinks?: SocialLinks;
  userType?: UserType;
  borderId?: AvatarBorderId;
}

export interface AvatarDefinition {
  id: string;
  name: string;
  description: string;
  accentColor: string;
  // SVG inner elements or raw path markup
  renderSvg: (size?: number) => React.ReactNode;
}
