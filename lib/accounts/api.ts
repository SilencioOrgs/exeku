import type {
  FieldErrors,
  NewSchoolRequest,
  SchoolAccountRequest,
  SchoolLocation,
  SchoolOption,
  StudentAccount,
} from "@/types/account";

import type { LocalProfile } from "@/types/profile";
import type { Medal } from "@/types/tournament";

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error?: string; fieldErrors?: FieldErrors };

const UNREACHABLE = "We couldn't reach Exeku. Check your connection and try again.";

export async function call<T>(path: string, body?: unknown): Promise<ApiResult<T>> {
  try {
    const response = await fetch(path, body === undefined ? undefined : {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string; fieldErrors?: FieldErrors };
    if (response.ok) return { ok: true, data: payload as T };
    return { ok: false, error: payload.error || "Request failed. Please try again.", fieldErrors: payload.fieldErrors };
  } catch {
    return { ok: false, error: UNREACHABLE };
  }
}

export const fetchProgress = () => call<{ solved: number; solvedAt: string[]; medals: Medal[] }>("/api/account/profile");
type PublishedProfile = Pick<LocalProfile, "displayName" | "avatarId" | "borderId" | "bio" | "socialLinks">;
export const syncProfile = ({ displayName, avatarId, borderId, bio, socialLinks }: PublishedProfile) =>
  call<{ ok: true }>("/api/account/profile", { displayName, avatarId, borderId, bio, socialLinks });
export const fetchLocations = () => call<{ locations: SchoolLocation[] }>("/api/schools");
export const fetchSchools = (location: string) =>
  call<{ schools: SchoolOption[] }>(`/api/schools?location=${encodeURIComponent(location)}`);
export const requestNewSchool = (school: NewSchoolRequest) => call<{ school: NewSchoolRequest }>("/api/schools", school);
export const submitSchoolAccount = (input: SchoolAccountRequest) => call<{ account: StudentAccount }>("/api/account/school", input);
