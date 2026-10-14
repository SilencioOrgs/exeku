import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as types from '../types/appearance.ts';
import * as styles from '../lib/appearance-styles.ts';

function harness(fail = false) {
  let saved = types.normalizeAppearancePreferences({ colorMode: 'light' });
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
    if (name === '@/lib/appearance-styles') return styles;
    if (name === '@/hooks/use-appearance') return { useAppearance: () => ({ preferences: saved, preferenceOwner: owner, effectiveColorMode: 'light', persistenceStatus: 'saved', updatePreferences: async next => { writes.push(next); if (fail) return false; saved = types.normalizeAppearancePreferences({ ...saved, ...next }); return true; } }) };
    throw Error(name);
  } });
  return { render: () => { index = 0; return compiledModule.exports.useAppearanceDraft(); }, writes, saved: () => saved, changeOwner: value => { owner = value; } };
}

test('draft selection, reset, and discard never write or change saved appearance', () => {
  const state = harness();
  assert.deepEqual(state.render().draftPreferences, state.saved());
  state.render().selectStyle('minimal-saas');
  assert.equal(state.render().draftPreferences.uiStyle, 'minimal-saas');
  assert.equal(state.saved().uiStyle, 'pixel-arcade');
  assert.equal(state.render().isDirty, true);
  state.render().selectStyle('studio-crm');
  assert.equal(state.render().draftPreferences.density, 'compact', 'Repeated style previews use each style preset');
  state.render().discard();
  assert.equal(state.render().isDirty, false);
  state.render().reset();
  assert.equal(state.render().draftPreferences.colorMode, 'dark');
  assert.equal(state.saved().colorMode, 'light');
  state.render().discard();
  assert.equal(state.render().draftPreferences.colorMode, 'light');
  assert.equal(state.writes.length, 0);
  state.render().selectStyle('studio-crm');
  assert.equal(harness().render().isDirty, false, 'Closing/unmounting the editor drops local draft state');
});

test('Apply commits the complete draft once; failed Apply retains a retryable draft', async () => {
  for (const fail of [false, true]) {
    const state = harness(fail);
    state.render().updateDraft({ uiStyle: 'studio-crm', editorFontSize: 20 });
    assert.equal(await state.render().apply(), !fail);
    assert.equal(state.writes.length, 1);
    assert.equal(state.writes[0].editorFontSize, 20);
    assert.equal(state.writes[0].colorMode, undefined, 'Untouched fields are merged with canonical storage by the provider');
    assert.equal(state.saved().uiStyle, fail ? 'pixel-arcade' : 'studio-crm');
    assert.equal(state.render().isDirty, fail);
    assert.equal(state.render().draftPreferences.editorFontSize, 20);
  }
});

test('public style names, defaults, and override policy preserve stored IDs', () => {
  assert.deepEqual(Object.values(styles.STYLE_PRESENTATIONS).map(style => style.name), ['Pixel Arcade', 'Clarity', 'Command']);
  const original = types.normalizeAppearancePreferences({ uiFontFamily: 'system-sans', uiFontScale: 125 });
  const selected = styles.selectStylePreferences(original, 'minimal-saas');
  assert.equal(selected.uiFontFamily, 'system-sans');
  assert.equal(selected.uiFontScale, 125);
  assert.equal(selected.density, 'spacious');
  assert.equal(styles.selectStylePreferences({ ...original, density: 'compact' }, 'minimal-saas').density, 'compact');
  assert.equal(styles.selectStylePreferences(original, 'studio-crm').colorMode, original.colorMode);
  assert.equal(types.normalizeAppearancePreferences({ uiStyle: 'studio-crm' }).uiStyle, 'studio-crm');
});

test('changing profile identity discards staged changes without saving or resurrecting them', () => {
  const state = harness();
  state.render().selectStyle('studio-crm');
  state.changeOwner('profile-b');
  assert.equal(state.render().isDirty, false);
  state.changeOwner('profile-a');
  assert.equal(state.render().isDirty, false);
  assert.equal(state.writes.length, 0);
});
