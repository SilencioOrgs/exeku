import { call } from "@/lib/accounts/api";
import type { NotificationsPayload } from "@/types/notifications";

export const fetchNotifications = () => call<NotificationsPayload>("/api/notifications");

export const markNotificationRead = (id: string) =>
  call<{ ok: true }>("/api/notifications", { action: "markRead", id });

export const markAllNotificationsRead = () =>
  call<{ ok: true }>("/api/notifications", { action: "markAllRead" });
