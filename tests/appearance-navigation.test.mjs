import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function shellHarness(storage) {
  const states = [];
  let index = 0;
  const react = {
    useState: initial => { const slot = index++; if (!(slot in states)) states[slot] = initial; return [states[slot], value => { states[slot] = typeof value === 'function' ? value(states[slot]) : value; }]; },
    useEffect() {}, useSyncExternalStore: (subscribe, snapshot) => snapshot(),
  };
  const compiled = ts.transpileModule(readFileSync(new URL('../components/app/app-shell.tsx', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  const compiledModule = { exports: {} };
  vm.runInNewContext(compiled, {
    module: compiledModule, exports: compiledModule.exports, localStorage: storage, window: {},
    require: name => {
      if (name === 'react') return react;
      if (name === 'react/jsx-runtime') return { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };
      if (name === 'next/navigation') return { useRouter: () => ({ replace() {} }) };
      if (name === '@/hooks/use-profile') return { useProfile: () => ({ profile: { id: 'profile' }, isLoading: false }) };
      if (name === './app-sidebar') return { AppSidebar: 'AppSidebar' };
      if (name === './app-topbar') return { AppTopbar: 'AppTopbar' };
      if (name === '@/components/ui/sheet') return Object.fromEntries(['Sheet', 'SheetContent', 'SheetTitle', 'SheetDescription'].map(key => [key, key]));
      throw Error(name);
    },
  });
  return () => { index = 0; return compiledModule.exports.AppShell({ children: 'Content' }); };
}
function find(node, type) {
  if (!node || typeof node !== 'object') return;
  if (node.type === type) return node;
  for (const child of [node.props?.children].flat(Infinity)) { const found = find(child, type); if (found) return found; }
}

test('mobile navigation uses accessible Sheet and closes through its controlled callback', () => {
  const render = shellHarness({ getItem: () => null });
  find(render(), 'AppTopbar').props.onToggleMobileMenu();
  const sheet = find(render(), 'Sheet');
  assert.ok(sheet, 'Use shared Sheet for focus trapping and Escape dismissal');
  assert.equal(sheet.props.open, true);
  assert.equal(find(sheet, 'SheetContent').props.side, 'left');
  assert.equal(find(sheet, 'SheetTitle').props.children, 'Mobile navigation');
  sheet.props.onOpenChange(false);
  assert.equal(find(render(), 'Sheet').props.open, false);
});

test('restricted localStorage does not prevent the application shell from rendering', () => {
  const render = shellHarness({ getItem() { throw Error('denied'); } });
  assert.ok(find(render(), 'main'));
});
