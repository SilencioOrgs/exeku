import type { PreferredLanguage } from "@/types/profile";
import type { WorkspaceDraft } from "@/types/draft";
import {
  getFilenameForLanguage,
  getStarterCode,
} from "@/lib/workspace-defaults";
import {
  DRAFT_STORE,
  idbGet,
  idbGetAll,
  idbPut,
  idbDelete,
} from "./db";

export class DraftRepositoryError extends Error {
  cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "DraftRepositoryError";
    this.cause = cause;
  }
}

function makeDraftId(profileId: string, lang: PreferredLanguage): string {
  return `${profileId}_${lang}`;
}

export class DraftRepository {
  /**
   * Retrieves an existing draft for a profile and language.
   */
  async getDraft(
    profileId: string,
    lang: PreferredLanguage
  ): Promise<WorkspaceDraft | null> {
    try {
      const id = makeDraftId(profileId, lang);
      return await idbGet<WorkspaceDraft>(DRAFT_STORE, id);
    } catch (err) {
      throw new DraftRepositoryError("Failed to retrieve workspace draft", err);
    }
  }

  /**
   * Saves or updates a draft for a profile and language.
   */
  async saveDraft(
    profileId: string,
    lang: PreferredLanguage,
    code: string
  ): Promise<WorkspaceDraft> {
    const id = makeDraftId(profileId, lang);
    const draft: WorkspaceDraft = {
      id,
      profileId,
      language: lang,
      filename: getFilenameForLanguage(lang),
      code,
      updatedAt: new Date().toISOString(),
    };

    try {
      await idbPut<WorkspaceDraft>(DRAFT_STORE, draft);
      return draft;
    } catch (err) {
      throw new DraftRepositoryError("Failed to save workspace draft", err);
    }
  }

  /**
   * Resets the draft back to default starter code.
   */
  async resetDraft(
    profileId: string,
    lang: PreferredLanguage
  ): Promise<WorkspaceDraft> {
    const starterCode = getStarterCode(lang);
    return await this.saveDraft(profileId, lang, starterCode);
  }

  /**
   * Retrieves all drafts belonging to a specific profile.
   */
  async getAllDraftsForProfile(profileId: string): Promise<WorkspaceDraft[]> {
    try {
      const all = await idbGetAll<WorkspaceDraft>(DRAFT_STORE);
      return all.filter((d) => d.profileId === profileId);
    } catch (err) {
      throw new DraftRepositoryError(
        "Failed to retrieve drafts for profile",
        err
      );
    }
  }

  /**
   * Deletes all drafts for a profile (e.g. on profile reset).
   */
  async deleteProfileDrafts(profileId: string): Promise<void> {
    try {
      const all = await idbGetAll<WorkspaceDraft>(DRAFT_STORE);
      const userDrafts = all.filter((d) => d.profileId === profileId);
      for (const d of userDrafts) {
        await idbDelete(DRAFT_STORE, d.id);
      }
    } catch (err) {
      throw new DraftRepositoryError(
        "Failed to delete drafts for profile",
        err
      );
    }
  }
}

export const draftRepository = new DraftRepository();
