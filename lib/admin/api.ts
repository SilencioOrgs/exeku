import { call } from "@/lib/accounts/api";
import type { AdminUser, EventsOverview, ManagedProblemView } from "@/types/admin";

export const fetchAdminUsers = () => call<{ users: AdminUser[] }>("/api/admin/users");
export const fetchEventsOverview = () => call<EventsOverview>("/api/admin/events");
export const adminEventAction = (action: string, body: Record<string, unknown>) => call<{ ok: true }>("/api/admin/events", { action, ...body });
export const fetchAdminStatus = () => call<{ isAdmin: boolean; canReset: boolean }>("/api/admin/status");
export const fetchManagedProblems = () => call<{ problems: ManagedProblemView[] }>("/api/admin/problems");
export const createProblem = (body: Record<string, unknown>) => call<{ ok: true }>("/api/admin/problems", body);
export const deleteProblem = (id: string) => call<{ ok: true }>("/api/admin/problems", { action: "delete", id });
export const resetDatabase = (confirm: string, includeAccounts: boolean) => call<{ ok: true }>("/api/admin/reset", { confirm, includeAccounts });
