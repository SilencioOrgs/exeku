import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as appearanceTypes from '../types/appearance.ts';

function providerHarness(profilePromise, { indexedDB = {}, saveAppearance } = {}) {
  const slots = [];
  const effects = [];
  let index = 0;
  let guest = { ...appearanceTypes.DEFAULT_APPEARANCE_PREFERENCES };
  const writes = [];
  const events = new Map();
  const queries = new Map();
  const react = {
    createContext: () => ({ Provider: 'Provider' }),
    useState: initial => { const slot = index++; if (!(slot in slots)) slots[slot] = initial; return [slots[slot], value => { slots[slot] = value; }]; },
    useRef: initial => { const slot = index++; return slots[slot] ?? (slots[slot] = { current: initial }); },
    useMemo: callback => callback(), useCallback: callback => callback,
    useEffect: (callback, dependencies) => {
      const slot = index++;
      if (!slots[slot] || dependencies.some((value, i) => value !== slots[slot][i])) effects.push(callback);
      slots[slot] = dependencies;
    },
  };
  const repository = {
    getPreferences: () => guest, persistenceStatus: 'saved',
    resolveEffectiveColorMode: (mode, dark) => mode === 'system' ? dark ? 'dark' : 'light' : mode,
    savePreferences: next => { guest = next; writes.push(['guest', next]); },
  };
  const root = { dataset: {}, classList: { toggle() {} }, style: { setProperty() {} } };
  const source = readFileSync(new URL('../hooks/use-appearance.tsx', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  const compiledModule = { exports: {} };
  vm.runInNewContext(compiled, {
    module: compiledModule, exports: compiledModule.exports, document: { documentElement: root },
    window: {
      indexedDB,
      matchMedia: query => {
        if (!queries.has(query)) queries.set(query, { matches: false, addEventListener(type, callback) { this.change = callback; }, removeEventListener() {} });
        return queries.get(query);
      },
      addEventListener: (type, callback) => events.set(type, callback), removeEventListener() {},
    },
    require: name => {
      if (name === 'react') return react;
      if (name === 'react/jsx-runtime') return { jsx: (type, props) => ({ type, props }) };
      if (name === '@/types/appearance') return appearanceTypes;
      if (name === '@/lib/storage/appearance-repository') return { appearanceRepository: repository, cacheAppearanceSnapshot() {}, APPEARANCE_STORAGE_KEY: 'guest', APPEARANCE_SNAPSHOT_KEY: 'snapshot' };
      if (name === '@/lib/storage/profile-repository') return { profileRepository: { getActiveProfile: () => typeof profilePromise === 'function' ? profilePromise() : profilePromise, saveAppearancePreferences: async (id, next) => { writes.push([id, next]); await saveAppearance?.(id, next); } } };
      throw Error(name);
    },
  });
  function render() { index = 0; const result = compiledModule.exports.AppearanceProvider({ children: null }); effects.splice(0).forEach(callback => callback()); return result.props.value; }
  return { render, writes, queries, root, events };
}

test('edits during profile hydration save to profile without losing the edit', async () => {
  let resolveProfile;
  const harness = providerHarness(new Promise(resolve => { resolveProfile = resolve; }));
  harness.render().updatePreferences({ uiStyle: 'minimal-saas' });
  resolveProfile({ id: 'existing-profile', appearancePreferences: { uiStyle: 'studio-crm', uiFontScale: 150, editorFontSize: 20 } });
  await new Promise(setImmediate);
  const context = harness.render();
  assert.equal(context.preferences.uiStyle, 'minimal-saas');
  assert.equal(harness.writes.length, 1);
  assert.equal(harness.writes[0][0], 'existing-profile');
  assert.equal(harness.writes[0][1].uiFontScale, 150);
  assert.equal(harness.writes[0][1].editorFontSize, 20);
  assert.equal(context.preferences.uiFontScale, 150);
  assert.equal(context.persistenceStatus, 'saved');
});

test('system scheme and motion changes update the interface while keeping saved System choices', async () => {
  const harness = providerHarness(Promise.resolve({ id: 'profile', appearancePreferences: { colorMode: 'system', reducedMotion: 'system' } }));
  harness.render();
  await new Promise(setImmediate);
  let context = harness.render();
  assert.equal(context.effectiveColorMode, 'light');
  for (const query of harness.queries.values()) { query.matches = true; query.change(); }
  context = harness.render();
  assert.equal(context.effectiveColorMode, 'dark');
  assert.equal(context.effectiveReducedMotion, true);
  assert.equal(context.preferences.colorMode, 'system');
  assert.equal(context.preferences.reducedMotion, 'system');
  assert.equal(harness.root.dataset.colorMode, 'dark');
  assert.equal(harness.writes.length, 0);
});

test('profile writes serialize rapid edits and retain failed changes after profile reload', async () => {
  let finishFirst;
  let calls = 0;
  const harness = providerHarness(Promise.resolve({ id: 'profile', appearancePreferences: { uiStyle: 'pixel-arcade' } }), {
    saveAppearance: async () => { if (++calls === 1) await new Promise(resolve => { finishFirst = resolve; }); else throw Error('denied'); },
  });
  harness.render();
  await new Promise(setImmediate);
  const context = harness.render();
  context.updatePreferences({ uiStyle: 'minimal-saas' });
  context.updatePreferences({ density: 'spacious' });
  await new Promise(setImmediate);
  assert.equal(harness.writes.length, 1);
  finishFirst();
  await new Promise(setImmediate);
  assert.equal(harness.writes.length, 2);
  assert.equal(harness.writes[1][1].uiStyle, 'minimal-saas');
  assert.equal(harness.writes[1][1].density, 'spacious');
  assert.equal(harness.render().persistenceStatus, 'error');
  harness.events.get('exeku:profile-changed')();
  await new Promise(setImmediate);
  assert.equal(harness.render().preferences.density, 'spacious');
});

test('null IndexedDB reports session-only profile persistence', async () => {
  const harness = providerHarness(Promise.resolve({ id: 'profile', appearancePreferences: {} }), { indexedDB: null });
  harness.render();
  await new Promise(setImmediate);
  assert.equal(harness.render().persistenceStatus, 'session');
});

test('appearance retries a failed initial profile read without replacing stored fields', async () => {
  let reads = 0;
  const harness = providerHarness(async () => {
    if (++reads === 1) throw Error('temporary storage failure');
    return { id: 'profile', appearancePreferences: { uiStyle: 'studio-crm', uiFontScale: 150 } };
  });
  harness.render();
  await new Promise(setImmediate);
  assert.equal(harness.render().persistenceStatus, 'error');
  harness.render().updatePreferences({ colorMode: 'light' });
  await new Promise(setImmediate);
  assert.equal(harness.writes[0]?.[0], 'profile');
  assert.equal(harness.writes[0][1].uiStyle, 'studio-crm');
  assert.equal(harness.writes[0][1].uiFontScale, 150);
  assert.equal(harness.render().preferences.colorMode, 'light');
  assert.equal(harness.render().persistenceStatus, 'saved');
});
