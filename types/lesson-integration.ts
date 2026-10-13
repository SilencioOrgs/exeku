/**
 * EXEKU — LESSON INTEGRATION CONTRACT
 * 
 * Ownership Boundary:
 * - Teammate owns: Lesson models, tutorial curricula, reading walkthroughs, and educational UI.
 * - Primary Developer owns: Problem definitions, code execution, sandbox adapters, and automated judging.
 * 
 * This contract provides a clean, decoupled interface allowing future lesson modules
 * to reference programming problems without direct coupling to judging internals.
 */

import type { PreferredLanguage } from "@/types/profile";

export interface LessonExerciseReference {
  /** Unique ID of the programming problem in the problem catalog */
  problemId: string;
  /** Optional language override if the lesson is language-specific */
  targetLanguage?: PreferredLanguage;
  /** Optional starter code snippet tailored to this lesson step */
  starterCodeOverride?: string;
  /** Explanatory hint or learning objective displayed in workspace when linked from lesson */
  learningHint?: string;
}

export interface LessonProgressQuery {
  profileId: string;
  problemId: string;
}

export interface LessonCompletionResult {
  isCompleted: boolean;
  scorePercentage: number;
  lastAttemptAt?: string;
  bestVerdict?: string;
}

/**
 * Interface contract for lesson modules to check exercise completion.
 * Implementation will be wired to submission results without exposing judge internals.
 */
export interface LessonExerciseService {
  checkCompletion: (query: LessonProgressQuery) => Promise<LessonCompletionResult>;
}
