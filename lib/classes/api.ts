import { call, type ApiResult } from "@/lib/accounts/api";
import type { ClassDetailPayload, ClassListPayload } from "@/types/classes";

export type ApiReply<T> = ApiResult<T>;

export const fetchClasses = () => call<ClassListPayload>("/api/classes");

export const createTeacherClass = (input: { name: string; section?: string; description?: string }) =>
  call<{ ok: true; id: string; inviteCode: string }>("/api/classes", { action: "create", ...input });

export const joinClassWithCode = (inviteCode: string) =>
  call<{ ok: true; classId: string; className: string }>("/api/classes", { action: "join", inviteCode });

export const fetchClassDetail = (id: string) => call<ClassDetailPayload>(`/api/classes/${encodeURIComponent(id)}`);

export const postClassAction = (id: string, body: Record<string, unknown>) =>
  call<{ ok: true; inviteCode?: string }>(`/api/classes/${encodeURIComponent(id)}`, body);
