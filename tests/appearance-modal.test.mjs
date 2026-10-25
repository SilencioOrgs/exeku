import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

test('landing modal cannot dismiss and lose its draft while Apply is pending', () => {
  for (const persistenceStatus of ['saving', 'saved']) {
    let open = true;
    const compiledModule = { exports: {} };
    const source = readFileSync(new URL('../components/landing/appearance-modal.tsx', import.meta.url), 'utf8');
    const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
    vm.runInNewContext(compiled, { exports: compiledModule.exports, module: compiledModule, require: name => {
      if (name === 'react') return { useState: () => [open, next => { open = next; }] };
      if (name === 'react/jsx-runtime') return { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };
      if (name === '@/hooks/use-appearance') return { useAppearance: () => ({ persistenceStatus }) };
      return new Proxy({}, { get: (_, key) => key });
    } });
    compiledModule.exports.AppearanceModal().props.onOpenChange(false);
    assert.equal(open, persistenceStatus === 'saving');
  }
});
