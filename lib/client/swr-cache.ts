/**
 * Lightweight user-scoped in-memory SWR cache, request deduplicator, and
 * cross-tab BroadcastChannel invalidation bus for client components.
 *
 * Security invariant: Every cached entry belongs strictly to `activeScope`
 * (the active Clerk/profile user ID). Switching accounts or signing out calls
 * `setClientCacheScope(null)` which immediately wipes all cached data.
 */

interface CacheEntry<T = unknown> {
  value: T;
  storedAt: number;
}

type InvalidationListener = (prefixes: string[]) => void;

const MAX_ENTRIES = 120;
const CHANNEL_NAME = "exeku-sync";

let activeScope: string | null = null;
const store = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<unknown>>();
const listeners = new Set<InvalidationListener>();
let channel: BroadcastChannel | null = null;

function ensureChannel(): BroadcastChannel | null {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return null;
  if (!channel) {
    try {
      channel = new BroadcastChannel(CHANNEL_NAME);
      channel.onmessage = (event: MessageEvent) => {
        const data = event.data as { type?: string; scope?: string | null; prefixes?: string[] } | null;
        if (!data || data.type !== "invalidate" || !Array.isArray(data.prefixes)) return;
        // Ignore cross-tab messages from a different signed-in user.
        if (data.scope && activeScope && data.scope !== activeScope) return;
        applyInvalidation(data.prefixes);
      };
    } catch {
      channel = null;
    }
  }
  return channel;
}

function applyInvalidation(prefixes: string[]) {
  if (prefixes.includes("*")) {
    store.clear();
  } else {
    for (const key of Array.from(store.keys())) {
      if (prefixes.some((prefix) => key.startsWith(prefix))) {
        store.delete(key);
      }
    }
  }
  for (const listener of listeners) {
    try {
      listener(prefixes);
    } catch {
      /* Listener errors must not break cache broadcast. */
    }
  }
}

/**
 * Binds the cache to the current user ID. Changing users or signing out
 * (`null`) immediately clears every cached entry and in-flight promise.
 */
export function setClientCacheScope(scope: string | null): void {
  if (scope === activeScope) return;
  activeScope = scope;
  store.clear();
  inflight.clear();
  if (scope !== null) ensureChannel();
}

export function getClientCacheScope(): string | null {
  return activeScope;
}

/** Returns a cached value immediately (even if stale) for instant tab rendering. */
export function peekClientCache<T>(key: string): T | undefined {
  const entry = store.get(key);
  return entry ? (entry.value as T) : undefined;
}

/** Returns a cached value only if stored within `maxAgeMs`. */
export function getFreshClientCache<T>(key: string, maxAgeMs: number): T | undefined {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.storedAt > maxAgeMs) return undefined;
  return entry.value as T;
}

export function writeClientCache<T>(key: string, value: T): void {
  if (store.size >= MAX_ENTRIES && !store.has(key)) {
    const oldest = store.keys().next().value;
    if (oldest !== undefined) store.delete(oldest);
  }
  store.set(key, { value, storedAt: Date.now() });
}

/**
 * Deduplicates simultaneous identical GET requests. If the user scope changes
 * while a request is in flight, its result is never written to the new user's cache.
 */
export async function dedupeInflight<T>(key: string, loader: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;

  const scopeAtStart = activeScope;
  const promise = loader().finally(() => {
    if (inflight.get(key) === promise) inflight.delete(key);
  });
  inflight.set(key, promise);
  const result = await promise;
  // Discard stale cross-account writes if scope changed mid-flight.
  if (scopeAtStart !== activeScope) return result;
  return result;
}

export function invalidateClientCache(
  prefixes: string | string[],
  options?: { broadcast?: boolean },
): void {
  const list = Array.isArray(prefixes) ? prefixes : [prefixes];
  if (list.length === 0) return;
  applyInvalidation(list);
  if (options?.broadcast !== false) {
    try {
      ensureChannel()?.postMessage({ type: "invalidate", scope: activeScope, prefixes: list });
    } catch {
      /* BroadcastChannel may be closed or unavailable. */
    }
  }
}

export function subscribeClientCache(listener: InvalidationListener): () => void {
  ensureChannel();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Security-sensitive live endpoints must never be served from a TTL cache
 * (tournament lockdown, live tournament state, sandbox health, pulse check).
 */
export function isNeverCachedPath(path: string): boolean {
  return (
    path.startsWith("/api/tournaments/active") ||
    path.startsWith("/api/pulse") ||
    path.startsWith("/api/health") ||
    path.startsWith("/api/account/me") ||
    /^\/api\/events\/[^/]+\/tournament(?:\?|$)/.test(path)
  );
}

/** Maps a mutating API path to the cache prefixes that should be invalidated. */
export function invalidationPrefixesForMutation(path: string): string[] {
  if (path.startsWith("/api/friends")) return ["/api/friends", "/api/notifications"];
  if (path.startsWith("/api/orgs")) return ["/api/orgs", "/api/events", "/api/notifications"];
  if (path.startsWith("/api/classes")) return ["/api/classes", "/api/problems", "/api/notifications"];
  if (path.startsWith("/api/notifications")) return ["/api/notifications"];
  if (path.startsWith("/api/events")) return ["/api/events", "/api/problems", "/api/account/profile"];
  if (path.startsWith("/api/learn")) return ["/api/learn"];
  if (path.startsWith("/api/account")) return ["/api/account/", "/api/friends", "/api/orgs"];
  if (path.startsWith("/api/schools")) return ["/api/schools", "/api/account/"];
  return [path.split("?")[0]];
}
