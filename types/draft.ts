import type { PreferredLanguage } from "./profile";

export interface WorkspaceDraft {
  id: string; // Composite key: `${profileId}_${language}`
  profileId: string;
  language: PreferredLanguage;
  filename: string;
  code: string;
  updatedAt: string;
}
