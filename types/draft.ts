import type { PreferredLanguage } from "./profile";

export interface WorkspaceFile { name: string; content: string }

export interface WorkspaceDraft {
  id: string; // Composite key: `${profileId}_${language}`
  profileId: string;
  language: PreferredLanguage;
  filename: string;
  code: string;
  /** Main source remains in code for compatibility with existing drafts. */
  files?: WorkspaceFile[];
  updatedAt: string;
}
