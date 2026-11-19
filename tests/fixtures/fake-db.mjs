// TEST FIXTURE ONLY. An in-memory stand-in for the parts of the Supabase client the repositories use.
// Rows hold embedded relations (profiles, orgs) already joined, as PostgREST would return them.
export function fakeDb(tables) {
  return () => ({
    from(name) {
      const rows = tables[name] ?? [];
      const filters = [];
      let op = "select", payload, single = false, limitCount = null, rangeSlice = null;
      const matching = () => rows.filter((r) => filters.every((keep) => keep(r)));
      const run = () => {
        if (op === "insert" || op === "upsert") rows.push({ id: crypto.randomUUID(), ...payload });
        if (op === "update") matching().forEach((r) => Object.assign(r, payload));
        if (op === "delete") matching().forEach((r) => rows.splice(rows.indexOf(r), 1));
        let found = op === "select" ? matching() : null;
        if (found && rangeSlice) found = found.slice(rangeSlice[0], rangeSlice[1] + 1);
        if (found && limitCount !== null) found = found.slice(0, limitCount);
        return { data: single ? (found[0] ?? null) : found, error: null };
      };
      const builder = {
        select: () => builder,
        order: () => builder,
        limit: (n) => { limitCount = n; return builder; },
        range: (from, to) => { rangeSlice = [from, to]; return builder; },
        not: (k) => { filters.push((r) => r[k] !== null && r[k] !== undefined); return builder; },
        gt: (k, v) => { filters.push((r) => r[k] !== null && r[k] !== undefined && r[k] > v); return builder; },
        gte: (k, v) => { filters.push((r) => r[k] !== null && r[k] !== undefined && r[k] >= v); return builder; },
        lte: (k, v) => { filters.push((r) => r[k] !== null && r[k] !== undefined && r[k] <= v); return builder; },
        eq: (k, v) => { filters.push((r) => r[k] === v); return builder; },
        in: (k, list) => { filters.push((r) => list.includes(r[k])); return builder; },
        ilike: (k, pattern) => { const needle = pattern.replaceAll("%", "").toLowerCase(); filters.push((r) => r[k].toLowerCase().includes(needle)); return builder; },
        insert: (v) => { op = "insert"; payload = v; return builder; },
        upsert: (v) => { op = "upsert"; payload = v; return builder; },
        update: (v) => { op = "update"; payload = v; return builder; },
        delete: () => { op = "delete"; return builder; },
        maybeSingle: () => { single = true; return builder; },
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
