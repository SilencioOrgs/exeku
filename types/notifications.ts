import type { UserRole } from "./roles";

export type NotificationKind =
  | "class_activity"
  | "class_problem"
  | "class_deadline"
  | "org_status"
  | "faculty_status"
  | "friend_request"
  | "friend_accepted";

export interface NotificationItem {
  id: string;
  kind: NotificationKind;
  title: string;
  body?: string;
  href?: string;
  dueAt?: string;
  read: boolean;
  /** True for live synthesized deadline alerts computed from unsolved class problems. */
  synthetic?: boolean;
  createdAt: string;
}

export interface NotificationsPayload {
  notifications: NotificationItem[];
  unreadCount: number;
  role: UserRole;
}
