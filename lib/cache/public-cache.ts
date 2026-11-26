/**
 * Bounded short-TTL server-side cache STRICTLY for public/shared non-PII reference
 * data (schools directory, learn curriculum chapters, public problem catalog rows
 * before per-user lock filtering, and public leaderboard snapshots).
 *
 * Security rule: NEVER store user-scoped data, PII, class/org memberships, hidden
 * test cases, or tournament lock decisions in this cache.
 */

interface PublicEntry<T = unknown> {
  value: T;
  expiresAt: number;
}

const MAX_PUBLIC_ENTRIES = 64;
const entries = new Map<string, PublicEntry>();
const inflight = new Map<string, Promise<unknown>>();

export interface PublicCacheOptions {
  /** Force caching even under NODE_ENV === "test" (for unit testing this module). */
  allowInTest?: boolean;
}

export async function getOrLoadPublic<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
  options?: PublicCacheOptions,
): Promise<T> {
  if (process.env.NODE_ENV === "test" && !options?.allowInTest) {
    return loader();
  }

  const now = Date.now();
  const hit = entries.get(key);
  if (hit && hit.expiresAt > now) {
    return hit.value as T;
  }

  const pending = inflight.get(key);
  if (pending) return pending as Promise<T>;

  const promise = loader()
    .then((value) => {
      if (entries.size >= MAX_PUBLIC_ENTRIES && !entries.has(key)) {
        const oldest = entries.keys().next().value;
        if (oldest !== undefined) entries.delete(oldest);
      }
      entries.set(key, { value, expiresAt: Date.now() + ttlMs });
      return value;
    })
    .finally(() => {
      if (inflight.get(key) === promise) inflight.delete(key);
    });

  inflight.set(key, promise);
  return promise;
}

export function invalidatePublicCache(prefix?: string): void {
  if (!prefix) {
    entries.clear();
    return;
  }
  for (const key of Array.from(entries.keys())) {
    if (key.startsWith(prefix)) entries.delete(key);
  }
}
