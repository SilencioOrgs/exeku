import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { normalizeAppearancePreferences } from '../types/appearance.ts';
import { resolveEditorAppearance } from '../lib/editor-appearance.ts';

test('Monaco updates independent syntax, ligatures, and typography without replacing buffer', () => {
  let preferences = normalizeAppearancePreferences({ editorTheme: 'light', editorLigatures: true });
  const refs = [];
  let index = 0;
  const effects = [];
  const states = [];
  const layouts = [];
  const react = {
    useRef: value => refs[index++] ?? (refs[index - 1] = { current: value }),
    useState: initial => { const slot = index++; states[slot] ??= initial; return [states[slot], value => { states[slot] = typeof value === 'function' ? value(states[slot]) : value; }]; },
    useMemo: callback => callback(), useEffect: callback => effects.push(callback), useLayoutEffect: callback => layouts.push(callback),
  };
  const jsx = { jsx: (type, props, key) => ({ type, props: { ...props, key } }), jsxs: (type, props, key) => ({ type, props: { ...props, key } }) };
  const source = readFileSync(new URL('../components/app/monaco-editor-pane.tsx', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  const compiledModule = { exports: {} };
  vm.runInNewContext(compiled, { module: compiledModule, exports: compiledModule.exports, require: name => {
    if (name === 'react') return react;
    if (name === 'react/jsx-runtime') return jsx;
    if (name === 'next/dynamic') return () => 'Editor';
    if (name === '@/lib/editor-appearance') return { resolveEditorAppearance };
    if (name === '@/hooks/use-appearance') return { useAppearance: () => ({ preferences, effectiveColorMode: 'dark' }) };
    throw Error(name);
  } });
  const changes = [];
  const themes = new Map();
  const viewState = { cursorState: [{ position: { lineNumber: 3, column: 4 } }] };
  const editor = { addCommand: () => {}, getModel: () => ({ uri: { toString: () => '/main.py' } }), saveViewState: () => viewState, buffer: 'print("keep me")', updateOptions(options) { this.options = options; } };
  const monaco = { KeyMod: { CtrlCmd: 2048, Shift: 1024 }, KeyCode: { Enter: 3 }, editor: { defineTheme: (name, theme) => themes.set(name, theme), setTheme: theme => changes.push(theme) } };
  const render = () => { index = 0; return compiledModule.exports.MonacoEditorPane({ language: 'python', value: editor.buffer, onChange: () => assert.fail('appearance must not change code') }).props.children; };
  const first = render();
  first.props.onMount(editor, monaco);
  effects.splice(0).forEach(callback => callback());
  assert.equal(changes.at(-1), 'exeku-minimal-light');
  assert.equal(editor.options.fontLigatures, true);
  preferences = normalizeAppearancePreferences({ uiStyle: 'studio-crm', editorTheme: 'high-contrast', editorFontSize: 20, editorLineHeight: 32 });
  const next = render();
  effects.splice(0).forEach(callback => callback());
  assert.equal(next.type, first.type);
  assert.equal(next.props.key, first.props.key, 'Appearance changes must preserve the editor instance');
  assert.equal(changes.at(-1), 'exeku-hc-dark');
  assert.equal(editor.options.fontSize, 20);
  assert.equal(editor.options.lineHeight, 32);
  assert.equal(editor.options.fontLigatures, false);
  assert.equal(editor.buffer, 'print("keep me")');
  assert.equal(layouts.length > 0, true, 'Editor must handle Activity hide/show lifecycle');
  layouts[0]()();
  const resumed = render();
  assert.notEqual(resumed.props.key, first.props.key, 'A disposed editor must not reconnect when its route becomes visible');
  editor.updateOptions = () => assert.fail('Disposed editor must not receive appearance updates');
  effects.splice(0).forEach(callback => callback());
  let restored;
  resumed.props.onMount({ ...editor, updateOptions() {}, restoreViewState: state => { restored = state; } }, monaco);
  assert.equal(restored, viewState, 'Activity return restores the view for the same model');
  resumed.props.onMount({ ...editor, updateOptions() {}, getModel: () => ({ uri: { toString: () => '/other.py' } }), restoreViewState: () => assert.fail('Do not restore another file cursor') }, monaco);
  const luminance = hex => hex.replace('#', '').match(/../g).map(value => parseInt(value, 16) / 255).map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4).reduce((sum, value, i) => sum + value * [0.2126, 0.7152, 0.0722][i], 0);
  for (const name of ['exeku-hc-dark', 'exeku-hc-light']) {
    const theme = themes.get(name);
    for (const background of ['editor.background', 'editor.lineHighlightBackground']) {
      for (const rule of theme.rules) {
        const foreground = luminance(rule.foreground), surface = luminance(theme.colors[background]);
        const ratio = (Math.max(foreground, surface) + 0.05) / (Math.min(foreground, surface) + 0.05);
        assert.ok(ratio >= 7, name + ' ' + rule.token + ' on ' + background + ': ' + ratio.toFixed(2));
      }
    }
  }
});
