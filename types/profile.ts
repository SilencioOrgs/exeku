import type { AppearancePreferences } from "./appearance";

export type ExperienceLevel = "beginner" | "intermediate" | "advanced";

export type PreferredLanguage = "python" | "java" | "cpp" | "c";

export interface LocalProfile {
  id: string;
  displayName: string;
  bio?: string;
  avatarId: string;
  experienceLevel: ExperienceLevel;
  preferredLanguage: PreferredLanguage;
  appearancePreferences?: AppearancePreferences;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileInput {
  displayName: string;
  bio?: string;
  avatarId: string;
  experienceLevel: ExperienceLevel;
  preferredLanguage: PreferredLanguage;
}

export interface AvatarDefinition {
  id: string;
  name: string;
  description: string;
  accentColor: string;
  // SVG inner elements or raw path markup
  renderSvg: (size?: number) => React.ReactNode;
}
