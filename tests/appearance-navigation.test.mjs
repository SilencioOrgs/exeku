import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function shellHarness(profileState = { profile: { id: "profile" }, isLoading: false }) {
  const react = { useEffect: (callback) => callback() };
  const compiled = ts.transpileModule(
    readFileSync(new URL("../components/app/app-shell.tsx", import.meta.url), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } },
  ).outputText;
  const compiledModule = { exports: {} };
  const redirects = [];
  vm.runInNewContext(compiled, {
    module: compiledModule, exports: compiledModule.exports,
    require: (name) => {
      if (name === "react") return react;
      if (name === "react/jsx-runtime") return {
        jsx: (type, props) => ({ type, props }),
        jsxs: (type, props) => ({ type, props }),
      };
      if (name === "next/navigation") return { useRouter: () => ({ replace: (url) => redirects.push(url) }) };
      if (name === "@/hooks/use-profile") return { useProfile: () => profileState };
      if (name === "./app-topbar") return { AppTopbar: "AppTopbar" };
      throw Error(name);
    },
  });
  return { render: () => compiledModule.exports.AppShell({ children: "Content" }), redirects };
}
function find(node, type) {
  if (!node || typeof node !== "object") return;
  if (node.type === type) return node;
  for (const child of [node.props?.children].flat(Infinity)) {
    const result = find(child, type);
    if (result) return result;
  }
}

test("app shell renders only top navigation and provides a full-width main area", () => {
  const { render } = shellHarness();
  const tree = render();
  const topbar = find(tree, "AppTopbar");
  assert.ok(topbar);
  assert.equal(topbar.props.profile.id, "profile");
  assert.equal(find(tree, "AppSidebar"), undefined);
  const main = find(tree, "main");
  assert.ok(main);
  assert.equal(main.props.id, "main-content");
  assert.equal(main.props.hidden, false);
});

test("app shell preserves its nested route during profile loading and redirect", () => {
  for (const isLoading of [true, false]) {
    const { render, redirects } = shellHarness({ profile: null, isLoading });
    const main = find(render(), "main");
    assert.ok(main);
    assert.equal(main.props.children.props.children, "Content");
    assert.equal(main.props.hidden, true);
    assert.equal(main.props.inert, true);
    assert.deepEqual(redirects, isLoading ? [] : ["/setup"]);
  }
});

test("responsive app topbar uses accessible Sheet with controlled dismiss", () => {
  const content = readFileSync(new URL("../components/app/app-topbar.tsx", import.meta.url), "utf8");
  assert.match(content, /<Sheet open=\{mobileOpen\} onOpenChange=\{setMobileOpen\}/);
  assert.match(content, /<SheetTitle/);
  assert.match(content, /<SheetDescription/);
  assert.match(content, /aria-label="Mobile navigation"/);
  assert.match(content, /setMobileOpen\(false\)/);
});
