import type { ProblemDifficulty } from "./problem";
import type { UserRole } from "./roles";

export type ClassActivityKind = "announcement" | "activity" | "deadline";

export interface ClassActivityView {
  id: string;
  title: string;
  body?: string;
  kind: ClassActivityKind;
  problemId?: string;
  dueAt?: string;
  createdAt: string;
}

export interface ClassSummary {
  id: string;
  name: string;
  section?: string;
  description?: string;
  inviteCode?: string;
  teacherId: string;
  teacherName: string;
  memberCount: number;
  groupCount: number;
  problemCount: number;
  solvedCount?: number;
  nextDueAt?: string;
  isTeacher: boolean;
  myGroupName?: string;
  createdAt: string;
}

export interface ClassListPayload {
  role: UserRole;
  canCreateClass: boolean;
  teaching: ClassSummary[];
  enrolled: ClassSummary[];
}

export interface ClassGroupView {
  id: string;
  name: string;
  memberIds: string[];
  solvedCount: number;
  totalPossibleSolves: number;
}

export interface ClassMemberView {
  userId: string;
  name: string;
  avatarId: string;
  borderId: string;
  schoolEmail?: string;
  groupId: string | null;
  groupName?: string;
  solvedProblemIds: string[];
  joinedAt: string;
}

export interface ClassProblemView {
  id: string;
  title: string;
  difficulty: ProblemDifficulty;
  category: string;
  isCustom?: boolean;
  assignedAt: string;
  dueAt?: string;
  solvedByViewer: boolean;
  solvedByCount: number;
}

export interface ClassCatalogOption {
  id: string;
  title: string;
  difficulty: ProblemDifficulty;
  category: string;
}

export interface ClassDetailPayload {
  id: string;
  name: string;
  section?: string;
  description?: string;
  inviteCode?: string;
  teacherId: string;
  teacherName: string;
  isTeacher: boolean;
  createdAt: string;
  groups: ClassGroupView[];
  members: ClassMemberView[];
  problems: ClassProblemView[];
  activities: ClassActivityView[];
  catalogProblems?: ClassCatalogOption[];
}
