import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function shellHarness(storage, profileState = { profile: { id: 'profile' }, isLoading: false }) {
  const states = [];
  let index = 0;
  const react = {
    useState: initial => { const slot = index++; if (!(slot in states)) states[slot] = initial; return [states[slot], value => { states[slot] = typeof value === 'function' ? value(states[slot]) : value; }]; },
    useEffect: callback => callback(), useSyncExternalStore: (subscribe, snapshot) => snapshot(),
  };
  const compiled = ts.transpileModule(readFileSync(new URL('../components/app/app-shell.tsx', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  const compiledModule = { exports: {} };
  const redirects = [];
  vm.runInNewContext(compiled, {
    module: compiledModule, exports: compiledModule.exports, localStorage: storage, window: {},
    require: name => {
      if (name === 'react') return react;
      if (name === 'react/jsx-runtime') return { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };
      if (name === 'next/navigation') return { useRouter: () => ({ replace: path => redirects.push(path) }) };
      if (name === '@/hooks/use-profile') return { useProfile: () => profileState };
      if (name === './app-sidebar') return { AppSidebar: 'AppSidebar' };
      if (name === './app-topbar') return { AppTopbar: 'AppTopbar' };
      if (name === '@/components/ui/sheet') return Object.fromEntries(['Sheet', 'SheetContent', 'SheetTitle', 'SheetDescription'].map(key => [key, key]));
      throw Error(name);
    },
  });
  const render = () => { index = 0; return compiledModule.exports.AppShell({ children: 'Content' }); };
  render.redirects = redirects;
  return render;
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

test('profile guard keeps the child segment represented but hidden during loading and redirect', () => {
  for (const isLoading of [true, false]) {
    const render = shellHarness({ getItem: () => null }, { profile: null, isLoading });
    const main = find(render(), 'main');
    assert.ok(main, 'Next.js must render the nested route segment');
    assert.equal(main.props.children.props.children, 'Content');
    assert.equal(main.props.hidden, true);
    assert.equal(main.props.inert, true);
    assert.deepEqual(render.redirects, isLoading ? [] : ['/setup']);
  }
});
