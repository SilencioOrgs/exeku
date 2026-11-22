import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as types from '../types/appearance.ts';

function harness(fail = false) {
  let saved = types.normalizeAppearancePreferences({ uiFontFamily: 'georgia', editorFontSize: 16 });
  let owner = 'profile-a';
  const writes = [];
  const slots = [];
  let index = 0;
  const react = { useState: initial => { const slot = index++; if (!(slot in slots)) slots[slot] = initial; return [slots[slot], value => { slots[slot] = typeof value === 'function' ? value(slots[slot]) : value; }]; } };
  const compiled = ts.transpileModule(readFileSync(new URL('../hooks/use-appearance-draft.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const compiledModule = { exports: {} };
  vm.runInNewContext(compiled, { exports: compiledModule.exports, module: compiledModule, require: name => {
    if (name === 'react') return react;
    if (name === '@/types/appearance') return types;
    if (name === '@/hooks/use-appearance') return { useAppearance: () => ({ preferences: saved, preferenceOwner: owner, effectiveColorMode: 'dark', persistenceStatus: 'saved', updatePreferences: async next => { writes.push(next); if (fail) return false; saved = types.normalizeAppearancePreferences({ ...saved, ...next }); return true; } }) };
    throw Error(name);
  } });
  return { render: () => { index = 0; return compiledModule.exports.useAppearanceDraft(); }, writes, saved: () => saved, changeOwner: value => { owner = value; } };
}

test('draft edits, reset, and discard never write or change saved appearance', () => {
  const state = harness();
  assert.deepEqual(state.render().draftPreferences, state.saved());
  state.render().updateDraft({ uiFontFamily: 'verdana', uiFontScale: 125 });
  assert.equal(state.render().draftPreferences.uiFontFamily, 'verdana');
  assert.equal(state.saved().uiFontFamily, 'georgia');
  assert.equal(state.render().isDirty, true);
  state.render().discard();
  assert.equal(state.render().isDirty, false);
  state.render().reset();
  assert.equal(state.render().draftPreferences.uiFontFamily, 'geist-sans');
  assert.equal(state.saved().uiFontFamily, 'georgia');
  state.render().discard();
  assert.equal(state.render().draftPreferences.uiFontFamily, 'georgia');
  assert.equal(state.writes.length, 0);
  state.render().updateDraft({ editorFontSize: 18 });
  assert.equal(harness().render().isDirty, false, 'Closing/unmounting the editor drops local draft state');
});

test('Apply commits the complete draft once; failed Apply retains a retryable draft', async () => {
  for (const fail of [false, true]) {
    const state = harness(fail);
    state.render().updateDraft({ uiFontFamily: 'verdana', editorFontSize: 20 });
    assert.equal(await state.render().apply(), !fail);
    assert.equal(state.writes.length, 1);
    assert.equal(state.writes[0].editorFontSize, 20);
    assert.equal(state.writes[0].colorMode, undefined, 'Untouched fields are merged with canonical storage by the provider');
    assert.equal(state.saved().uiFontFamily, fail ? 'georgia' : 'verdana');
    assert.equal(state.render().isDirty, fail);
    assert.equal(state.render().draftPreferences.editorFontSize, 20);
  }
});

test('changing profile identity discards staged changes without saving or resurrecting them', () => {
  const state = harness();
  state.render().updateDraft({ uiFontScale: 125 });
  state.changeOwner('profile-b');
  assert.equal(state.render().isDirty, false);
  state.changeOwner('profile-a');
  assert.equal(state.render().isDirty, false);
  assert.equal(state.writes.length, 0);
});
