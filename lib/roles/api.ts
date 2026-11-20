import type { FieldErrors } from "@/types/account";
import type { FacultyRequestView, FacultyStatusPayload } from "@/types/roles";

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

export const fetchFacultyStatus = () => call<FacultyStatusPayload>("/api/account/faculty");

export const submitFacultyVerification = (input: {
  schoolName: string;
  department: string;
  positionTitle: string;
  employeeId: string;
  note?: string;
}) =>
  call<{ ok: true; request: FacultyRequestView }>("/api/account/faculty", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
