import type { FieldErrors } from "@/types/account";
import type { ClassDetailPayload, ClassListPayload } from "@/types/classes";

export type ApiReply<T> = { ok: true; data: T } | { ok: false; error?: string; fieldErrors?: FieldErrors };

async function call<T>(url: string, init?: RequestInit): Promise<ApiReply<T>> {
  try {
    const response = await fetch(url, init);
    const data = await response.json().catch(() => ({}));
    if (response.ok) return { ok: true, data: data as T };
    return {
      ok: false,
      error: typeof data.error === "string" ? data.error : "Request failed.",
      fieldErrors: data.fieldErrors,
    };
  } catch {
    return { ok: false, error: "Could not reach the server. Try again." };
  }
}

export const fetchClasses = () => call<ClassListPayload>("/api/classes");

export const createTeacherClass = (input: { name: string; section?: string; description?: string }) =>
  call<{ ok: true; id: string; inviteCode: string }>("/api/classes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "create", ...input }),
  });

export const joinClassWithCode = (inviteCode: string) =>
  call<{ ok: true; classId: string; className: string }>("/api/classes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "join", inviteCode }),
  });

export const fetchClassDetail = (id: string) => call<ClassDetailPayload>(`/api/classes/${encodeURIComponent(id)}`);

export const postClassAction = (id: string, body: Record<string, unknown>) =>
  call<{ ok: true; inviteCode?: string }>(`/api/classes/${encodeURIComponent(id)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
