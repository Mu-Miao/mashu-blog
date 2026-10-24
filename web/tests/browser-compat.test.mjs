import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

function browserModules({ storage, crypto } = {}) {
  const context = vm.createContext({ crypto });
  Object.defineProperty(context, "localStorage", { get: () => storage() });
  const load = (name, dependencies = {}) => {
    const source = readFileSync(new URL(`../src/lib/${name}.ts`, import.meta.url), "utf8");
    const { outputText } = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023 },
    });
    context.exports = {};
    context.require = (path) => dependencies[path];
    vm.runInContext(outputText, context);
    return context.exports;
  };
  const storageModule = load("storage");
  return { storage: storageModule, visitor: load("commentVisitor", { "./storage": storageModule }) };
}

const httpCrypto = { getRandomValues: webcrypto.getRandomValues.bind(webcrypto) };
const memoryStorage = () => {
  const values = new Map();
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
};

test("ordinary HTTP without randomUUID can create and persist a visitor", () => {
  const saved = memoryStorage();
  const { visitor } = browserModules({ crypto: httpCrypto, storage: () => saved });
  const id = visitor.visitorId();
  assert.match(id, /^[a-f0-9]{32}$/);
  assert.equal(visitor.visitorId(), id);
  assert.equal(browserModules({ crypto: httpCrypto, storage: () => saved }).visitor.visitorId(), id);
});

test("an existing visitor keeps their like identity", () => {
  const saved = memoryStorage();
  saved.setItem("mashu-blog-comment-visitor", "existing-visitor-id");
  assert.equal(browserModules({ storage: () => saved }).visitor.visitorId(), "existing-visitor-id");
});

test("blocked access to localStorage does not prevent reading or posting", () => {
  const { storage, visitor } = browserModules({ crypto: httpCrypto, storage: () => { throw new Error("SecurityError"); } });
  assert.equal(storage.readStorage("theme"), null);
  assert.doesNotThrow(() => storage.writeStorage("theme", "dark"));
  const id = visitor.visitorId();
  assert.match(id, /^[a-f0-9]{32}$/);
  assert.equal(visitor.visitorId(), id);
});

test("a storage quota error leaves the page usable", () => {
  const { storage, visitor } = browserModules({ crypto: httpCrypto, storage: () => ({
    getItem: () => null,
    setItem: () => { throw new Error("QuotaExceededError"); },
  }) });
  assert.doesNotThrow(() => storage.writeStorage("theme", "light"));
  assert.match(visitor.visitorId(), /^[a-f0-9]{32}$/);
});

test("legacy browsers without crypto still get a stable page visitor", () => {
  const { visitor } = browserModules({ storage: () => memoryStorage() });
  const id = visitor.visitorId();
  assert.match(id, /^[a-f0-9]{32}$/);
  assert.equal(visitor.visitorId(), id);
});

test("the pre-render theme script works when storage is blocked", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  const classes = new Map();
  const context = vm.createContext({
    URLSearchParams,
    location: { search: "?theme=dark" },
    matchMedia: () => ({ matches: false }),
    document: { documentElement: { classList: { toggle: (name, enabled) => classes.set(name, enabled) } } },
  });
  Object.defineProperty(context, "localStorage", { get() { throw new Error("SecurityError"); } });
  assert.doesNotThrow(() => vm.runInContext(script, context));
  assert.equal(classes.get("dark"), true);
});
