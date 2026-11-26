import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  dedupeInflight,
  getFreshClientCache,
  invalidateClientCache,
  invalidationPrefixesForMutation,
  isNeverCachedPath,
  peekClientCache,
  setClientCacheScope,
  subscribeClientCache,
  writeClientCache,
} from "../lib/client/swr-cache.ts";
import { getOrLoadPublic, invalidatePublicCache } from "../lib/cache/public-cache.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

test("client SWR cache isolates data per user and wipes cleanly on account switch or sign-out", () => {
  setClientCacheScope("user-a");
  writeClientCache("/api/friends", { friends: ["alice"] });
  assert.deepEqual(peekClientCache("/api/friends"), { friends: ["alice"] });
  assert.deepEqual(getFreshClientCache("/api/friends", 10_000), { friends: ["alice"] });

  // Switching to another student on a shared school PC must wipe user-a's cached data.
  setClientCacheScope("user-b");
  assert.equal(peekClientCache("/api/friends"), undefined);

  writeClientCache("/api/events", { events: ["b-event"] });
  // Signing out must wipe everything.
  setClientCacheScope(null);
  assert.equal(peekClientCache("/api/events"), undefined);
});

test("client SWR cache deduplicates simultaneous in-flight GETs and notifies invalidation subscribers", async () => {
  setClientCacheScope("user-dedupe");
  let calls = 0;
  const loader = async () => {
    calls += 1;
    await new Promise((r) => setTimeout(r, 10));
    return { count: calls };
  };

  const [first, second] = await Promise.all([
    dedupeInflight("/api/problems", loader),
    dedupeInflight("/api/problems", loader),
  ]);
  assert.equal(calls, 1);
  assert.deepEqual(first, { count: 1 });
  assert.deepEqual(second, { count: 1 });

  writeClientCache("/api/classes", { teaching: [] });
  writeClientCache("/api/classes/123", { id: "123" });
  writeClientCache("/api/events", { events: [] });

  const notified = [];
  const unsubscribe = subscribeClientCache((prefixes) => notified.push(prefixes));
  try {
    invalidateClientCache("/api/classes", { broadcast: false });
    assert.equal(peekClientCache("/api/classes"), undefined);
    assert.equal(peekClientCache("/api/classes/123"), undefined);
    assert.deepEqual(peekClientCache("/api/events"), { events: [] });
    assert.deepEqual(notified, [["/api/classes"]]);
  } finally {
    unsubscribe();
    setClientCacheScope(null);
  }
});

test("security-sensitive live endpoints are never cached on the client", () => {
  assert.equal(isNeverCachedPath("/api/tournaments/active"), true);
  assert.equal(isNeverCachedPath("/api/events/abc-123/tournament"), true);
  assert.equal(isNeverCachedPath("/api/pulse"), true);
  assert.equal(isNeverCachedPath("/api/health"), true);
  assert.equal(isNeverCachedPath("/api/events"), false);
  assert.equal(isNeverCachedPath("/api/problems"), false);

  assert.ok(invalidationPrefixesForMutation("/api/friends").includes("/api/notifications"));
  assert.ok(invalidationPrefixesForMutation("/api/classes/123").includes("/api/problems"));
});

test("public server cache deduplicates concurrent loads and respects prefix invalidation", async () => {
  invalidatePublicCache();
  let loads = 0;
  const loader = async () => {
    loads += 1;
    await new Promise((r) => setTimeout(r, 10));
    return { v: loads };
  };

  const [a, b] = await Promise.all([
    getOrLoadPublic("schools:locations", 60_000, loader, { allowInTest: true }),
    getOrLoadPublic("schools:locations", 60_000, loader, { allowInTest: true }),
  ]);
  assert.equal(loads, 1);
  assert.deepEqual(a, { v: 1 });
  assert.deepEqual(b, { v: 1 });

  const cached = await getOrLoadPublic("schools:locations", 60_000, loader, { allowInTest: true });
  assert.equal(loads, 1);
  assert.deepEqual(cached, { v: 1 });

  invalidatePublicCache("schools:");
  const reloaded = await getOrLoadPublic("schools:locations", 60_000, loader, { allowInTest: true });
  assert.equal(loads, 2);
  assert.deepEqual(reloaded, { v: 2 });
  invalidatePublicCache();
});

test("navigation & security performance invariants hold across shell, bell, and pulse route", () => {
  const shell = read("components/app/app-shell.tsx");
  assert.match(shell, /ProfileProvider/);
  assert.match(shell, /PulseProvider/);

  const bell = read("components/app/notifications-bell.tsx");
  assert.doesNotMatch(bell, /usePathname/, "NotificationsBell must not refetch on every pathname change");

  const pulse = read("app/api/pulse/route.ts");
  assert.match(pulse, /private, no-cache/);
  assert.doesNotMatch(pulse, /Cache-Control["']?\s*:\s*["']public/i);
  assert.match(pulse, /status:\s*304/);
});
