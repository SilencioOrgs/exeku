import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function harness() {
  const slots = [];
  let index = 0;
  const effects = [];
  let effectIndex = 0;
  const react = {
    useState: (initial) => { const slot = index++; if (!(slot in slots)) slots[slot] = initial; return [slots[slot], (value) => { slots[slot] = value; }]; },
    useRef: (initial) => { const slot = index++; if (!(slot in slots)) slots[slot] = { current: initial }; return slots[slot]; },
    useCallback: (fn, deps) => {
      const slot = index++;
      if (slots[slot]?.deps.every((dep, i) => dep === deps[i])) return slots[slot].fn;
      slots[slot] = { fn, deps };
      return fn;
    },
    useEffect: (run, deps) => {
      const slot = effectIndex++;
      const previous = effects[slot];
      if (!previous || deps.some((dep, i) => dep !== previous.deps[i])) {
        previous?.cleanup?.();
        effects[slot] = { deps, cleanup: run() };
      }
    },
  };
  const listeners = { pagehide: new Set(), visibilitychange: new Set() };
  const target = { addEventListener: (type, fn) => listeners[type].add(fn), removeEventListener: (type, fn) => listeners[type].delete(fn) };
  const document = { ...target, visibilityState: "visible" };
  const saves = [];
  let loads = 0;
  const source = readFileSync(new URL("../hooks/use-workspace-files.ts", import.meta.url), "utf8");
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const loaded = { exports: {} };
  vm.runInNewContext(output, {
    module: loaded, exports: loaded.exports, window: target, document,
    setTimeout: () => 1, clearTimeout: () => {},
    require: (name) => ({
      react,
      "@/lib/storage/draft-repository": { draftRepository: { getDraft: async () => { loads++; return null; }, saveDraft: async (...args) => { saves.push(args[2]); } } },
      "@/lib/storage/coding-activity": { recordCodingDay: () => true },
      "@/lib/workspace-defaults": { getFilenameForLanguage: () => "main.py", getStarterCode: () => "starter" },
    })[name],
  });
  const render = (profile) => { index = 0; effectIndex = 0; return loaded.exports.useWorkspaceFiles(profile, null, null); };
  const fire = (type) => [...listeners[type]].forEach((fn) => fn());
  const unmount = () => effects.forEach((effect) => effect.cleanup?.());
  return { render, fire, unmount, saves, document, loads: () => loads };
}

const profile = { id: "p1", preferredLanguage: "python" };
const settle = () => new Promise((resolve) => setImmediate(resolve));

test("a pending save is flushed once when the page is hidden, not twice", async () => {
  const h = harness();
  const files = h.render(profile);
  await settle();
  files.setFileContent("main.py", "typed");
  assert.deepEqual(h.saves, [], "still waiting on the 600 ms timer");

  h.document.visibilityState = "visible";
  h.fire("visibilitychange");
  assert.deepEqual(h.saves, [], "only a hidden page flushes");

  h.document.visibilityState = "hidden";
  h.fire("visibilitychange");
  h.fire("pagehide");
  h.unmount();
  await settle();
  assert.deepEqual(h.saves, ["typed"]);
});

test("a pending save is flushed by pagehide and by leaving the editor", async () => {
  const onPagehide = harness();
  const a = onPagehide.render(profile);
  await settle();
  a.setFileContent("main.py", "before close");
  onPagehide.fire("pagehide");
  assert.deepEqual(onPagehide.saves, ["before close"]);

  const onUnmount = harness();
  const b = onUnmount.render(profile);
  await settle();
  b.setFileContent("main.py", "before leaving");
  onUnmount.unmount();
  assert.deepEqual(onUnmount.saves, ["before leaving"]);
});

test("a new profile object with the same id does not reload the draft over unsaved typing", async () => {
  const h = harness();
  h.render(profile);
  await settle();
  assert.equal(h.loads(), 1);
  h.render({ ...profile });
  await settle();
  assert.equal(h.loads(), 1);
  h.render({ ...profile, id: "p2" });
  await settle();
  assert.equal(h.loads(), 2);
});
