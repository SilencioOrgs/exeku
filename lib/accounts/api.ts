import type {
  FieldErrors,
  NewSchoolRequest,
  SchoolAccountRequest,
  SchoolLocation,
  SchoolOption,
  StudentAccount,
} from "@/types/account";
import type { LocalProfile } from "@/types/profile";
import type { AccountSnapshot } from "@/lib/accounts/restore";
import type { Medal } from "@/types/tournament";
import {
  dedupeInflight,
  getFreshClientCache,
  invalidateClientCache,
  invalidationPrefixesForMutation,
  isNeverCachedPath,
  peekClientCache,
  writeClientCache,
} from "@/lib/client/swr-cache";

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error?: string; code?: string; fieldErrors?: FieldErrors };

export interface CallOptions {
  /** Skip the short fresh-TTL window and revalidate from the server. */
  force?: boolean;
  /** Freshness window in milliseconds for GET requests (default 10s; schools 5m). */
  ttlMs?: number;
}

const UNREACHABLE = "We couldn't reach Exeku. Check your connection and try again.";
const DEFAULT_GET_TTL_MS = 10_000;
const SCHOOLS_GET_TTL_MS = 300_000;

export function peekApiCache<T>(path: string): T | undefined {
  if (typeof window === "undefined" || isNeverCachedPath(path)) return undefined;
  return peekClientCache<T>(path);
}

async function rawFetch<T>(path: string, body?: unknown): Promise<ApiResult<T>> {
  try {
    const response = await fetch(path, body === undefined ? undefined : {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string; code?: string; fieldErrors?: FieldErrors };
    if (response.ok) return { ok: true, data: payload as T };
    return {
      ok: false,
      error: payload.error || "Request failed. Please try again.",
      code: payload.code,
      fieldErrors: payload.fieldErrors,
    };
  } catch {
    return { ok: false, error: UNREACHABLE };
  }
}

export async function call<T>(path: string, body?: unknown, options?: CallOptions): Promise<ApiResult<T>> {
  if (body !== undefined) {
    const result = await rawFetch<T>(path, body);
    if (result.ok && typeof window !== "undefined") {
      invalidateClientCache(invalidationPrefixesForMutation(path));
    }
    return result;
  }

  const cacheable = typeof window !== "undefined" && !isNeverCachedPath(path);
  if (cacheable && !options?.force) {
    const ttl = options?.ttlMs ?? (path.startsWith("/api/schools") ? SCHOOLS_GET_TTL_MS : DEFAULT_GET_TTL_MS);
    const fresh = getFreshClientCache<T>(path, ttl);
    if (fresh !== undefined) return { ok: true, data: fresh };
  }

  if (cacheable) {
    return dedupeInflight(path, async () => {
      const result = await rawFetch<T>(path);
      if (result.ok) writeClientCache(path, result.data);
      return result;
    });
  }

  return rawFetch<T>(path);
}

export const fetchProgress = (options?: CallOptions) =>
  call<{ solved: number; solvedAt: string[]; medals: Medal[] }>("/api/account/profile", undefined, options);
export const fetchAccountSnapshot = () => call<AccountSnapshot>("/api/account/me");
type PublishedProfile = Pick<LocalProfile, "displayName" | "avatarId" | "borderId" | "bio" | "socialLinks">;
export const syncProfile = ({ displayName, avatarId, borderId, bio, socialLinks }: PublishedProfile) =>
  call<{ ok: true }>("/api/account/profile", { displayName, avatarId, borderId, bio, socialLinks });
export const fetchLocations = () => call<{ locations: SchoolLocation[] }>("/api/schools");
export const fetchSchools = (location: string) =>
  call<{ schools: SchoolOption[] }>(`/api/schools?location=${encodeURIComponent(location)}`);
export const requestNewSchool = (school: NewSchoolRequest) => call<{ school: NewSchoolRequest }>("/api/schools", school);
export const submitSchoolAccount = (input: SchoolAccountRequest) => call<{ account: StudentAccount }>("/api/account/school", input);
