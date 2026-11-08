import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const KEY = "challenge";

// Mounts the provider once, with a saved session, and hands back its context value.
function mount(saved) {
  const slots = [];
  let index = 0;
  const store = new Map([[KEY, JSON.stringify(saved)]]);
  const react = {
    createContext: () => ({ Provider: "Provider" }),
    useContext: () => null,
    useState: (initial) => { const slot = index++; if (!(slot in slots)) slots[slot] = initial; return [slots[slot], (value) => { slots[slot] = typeof value === "function" ? value(slots[slot]) : value; }]; },
    useRef: (initial) => { const slot = index++; if (!(slot in slots)) slots[slot] = { current: initial }; return slots[slot]; },
    useEffect: (run) => { run(); },
    useCallback: (fn) => fn,
    useMemo: (fn) => fn(),
  };
  const source = readFileSync(new URL("../hooks/use-challenge-session.tsx", import.meta.url), "utf8");
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  const loaded = { exports: {} };
  vm.runInNewContext(output, {
    module: loaded, exports: loaded.exports, queueMicrotask,
    window: { addEventListener() {}, removeEventListener() {} },
    localStorage: { getItem: (key) => store.get(key) ?? null, setItem: (key, value) => store.set(key, value), removeItem: (key) => store.delete(key) },
    setInterval: () => 1, clearInterval() {},
    require: (name) => ({
      react,
      "react/jsx-runtime": { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
      "next/navigation": { useRouter: () => ({ push() {} }) },
      "@/types/challenge": { DEFAULT_CHALLENGE_DURATION_MS: 1000, CHALLENGE_STORAGE_KEY: KEY },
    })[name],
  });
  const context = loaded.exports.ChallengeProvider({ children: null }).props.value;
  return { finish: () => context.finishChallenge(), stored: () => JSON.parse(store.get(KEY)).status };
}

const session = (status, deadline = Date.now() + 60_000) => ({ id: "c1", problemId: "p", problemTitle: "P", durationMs: 60_000, startedAt: 0, deadline, status, submissionCount: 1, lastVerdict: null });

test("a challenge that ran out of time cannot become completed", () => {
  const challenge = mount(session("active", Date.now() - 1000));
  assert.equal(challenge.stored(), "expired");
  assert.equal(challenge.finish(), false);
  assert.equal(challenge.stored(), "expired");
});

test("only a challenge still in progress can be finished", () => {
  for (const status of ["active", "submitting", "submitted"]) {
    const challenge = mount(session(status));
    assert.equal(challenge.finish(), true, status);
    assert.equal(challenge.stored(), "completed", status);
  }
  for (const status of ["expired", "forfeited", "completed"]) {
    const challenge = mount(session(status));
    assert.equal(challenge.finish(), false, status);
    assert.equal(challenge.stored(), status, status);
  }
});
