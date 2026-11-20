// TEST FIXTURE ONLY. An in-memory stand-in for the parts of the Supabase client the repositories use.
// Rows hold embedded relations (profiles, orgs) already joined, as PostgREST would return them.
export function fakeDb(tables) {
  return () => ({
    from(name) {
      const rows = tables[name] ?? [];
      const filters = [];
      let op = "select", payload, conflictCols = null, single = false, limitCount = null, rangeSlice = null, headCount = false;
      const matching = () => rows.filter((r) => filters.every((keep) => keep(r)));
      const run = () => {
        let inserted = null;
        if (op === "insert") {
          inserted = { id: crypto.randomUUID(), created_at: new Date().toISOString(), status: "pending", ...payload };
          rows.push(inserted);
        }
        if (op === "upsert") {
          const existing = conflictCols
            ? rows.find((r) => conflictCols.every((c) => r[c] === payload[c]))
            : null;
          if (existing) {
            Object.assign(existing, payload);
            inserted = existing;
          } else {
            inserted = { id: crypto.randomUUID(), created_at: new Date().toISOString(), status: "pending", ...payload };
            rows.push(inserted);
          }
        }
        if (op === "update") matching().forEach((r) => Object.assign(r, payload));
        if (op === "delete") matching().forEach((r) => rows.splice(rows.indexOf(r), 1));
        let found = op === "select" ? matching() : inserted ? [inserted] : null;
        if (headCount && op === "select") return { data: null, count: found.length, error: null };
        if (found && rangeSlice) found = found.slice(rangeSlice[0], rangeSlice[1] + 1);
        if (found && limitCount !== null) found = found.slice(0, limitCount);
        return { data: single ? (found?.[0] ?? null) : found, error: null };
      };
      const builder = {
        select: (_cols, opts) => {
          if (opts?.head && opts?.count === "exact") headCount = true;
          return builder;
        },
        order: () => builder,
        limit: (n) => { limitCount = n; return builder; },
        range: (from, to) => { rangeSlice = [from, to]; return builder; },
        not: (k) => { filters.push((r) => r[k] !== null && r[k] !== undefined); return builder; },
        gt: (k, v) => { filters.push((r) => r[k] !== null && r[k] !== undefined && r[k] > v); return builder; },
        gte: (k, v) => { filters.push((r) => r[k] !== null && r[k] !== undefined && r[k] >= v); return builder; },
        lte: (k, v) => { filters.push((r) => r[k] !== null && r[k] !== undefined && r[k] <= v); return builder; },
        eq: (k, v) => { filters.push((r) => r[k] === v); return builder; },
        neq: (k, v) => { filters.push((r) => r[k] !== v); return builder; },
        in: (k, list) => { filters.push((r) => list.includes(r[k])); return builder; },
        overlaps: (k, list) => { filters.push((r) => Array.isArray(r[k]) && r[k].some((item) => list.includes(item))); return builder; },
        ilike: (k, pattern) => { const needle = pattern.replaceAll("%", "").toLowerCase(); filters.push((r) => r[k].toLowerCase().includes(needle)); return builder; },
        insert: (v) => { op = "insert"; payload = v; return builder; },
        upsert: (v, opts) => { op = "upsert"; payload = v; conflictCols = opts?.onConflict ? opts.onConflict.split(",").map((s) => s.trim()) : null; return builder; },
        update: (v) => { op = "update"; payload = v; return builder; },
        delete: () => { op = "delete"; return builder; },
        maybeSingle: () => { single = true; return builder; },
        single: () => { single = true; return builder; },
        then: (resolve, reject) => Promise.resolve().then(run).then(resolve, reject),
      };
      return builder;
    },
  });
}

export const must = (result) => {
  if (result.error) throw new Error(result.error.message);
  return result.data;
};

export async function fetchAllPages(queryPage, pageSize = 1000) {
  const all = [];
  for (let from = 0; ; from += pageSize) {
    const page = must(await queryPage(from, from + pageSize - 1));
    all.push(...page);
    if (page.length < pageSize) break;
  }
  return all;
}

export async function exactCount(query) {
  const res = await query;
  if (res.error) throw new Error(res.error.message);
  return res.count ?? 0;
}
