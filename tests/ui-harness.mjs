import fs from 'node:fs';
import vm from 'node:vm';
import { transformWithOxc } from 'vite';

// Execute the real component with controlled hook state and external boundaries.
// JSX remains an inspectable element tree, so event handlers run unchanged.
export async function uiHarness(path, supplied = {}, componentName = null) {
  const slots = [];
  const effects = [];
  let cursor = 0;
  const equalDeps = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const context = {
    console, Date, JSON, URLSearchParams, navigator: { onLine: true },
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    setTimeout: () => 1, clearTimeout() {},
    window: { addEventListener() {}, removeEventListener() {} },
    React: { createElement: (type, props, ...children) => ({ type, props: { ...props, children: children.flat(Infinity) } }) },
    motion: new Proxy({}, { get: (_, key) => `motion.${key}` }),
    useState(initial) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial;
      return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }];
    },
    useRef(initial) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = { current: initial };
      return slots[i];
    },
    useCallback(fn, deps) {
      const i = cursor++;
      if (!slots[i] || !equalDeps(slots[i].deps, deps)) slots[i] = { fn, deps };
      return slots[i].fn;
    },
    useMemo(fn) { return fn(); },
    useEffect(fn, deps) {
      const i = cursor++;
      if (!equalDeps(slots[i]?.deps, deps)) {
        const previousCleanup = slots[i]?.cleanup;
        slots[i] = { deps };
        effects.push(() => {
          previousCleanup?.();
          const cleanup = fn();
          if (typeof cleanup === 'function') slots[i].cleanup = cleanup;
          return cleanup;
        });
      }
    },
    ...supplied,
  };
  let code = (await transformWithOxc(fs.readFileSync(path, 'utf8'), path, { jsx: { runtime: 'classic' } })).code;
  code = code.replace(/^import\s+["'][^"']+\.css["'];?\s*$/gm, '');
  code = code.replace(/^import\s+([\s\S]*?)\s+from\s+["'][^"']+["'];?\s*$/gm, (_, bindings) => {
    const names = bindings.startsWith('{') ? bindings.slice(1, -1).split(',').map(s => s.trim().split(/\s+as\s+/).at(-1)) : [bindings.trim()];
    for (const name of names) if (!(name in context)) context[name] = name;
    return '';
  });
  code = code.replace('export default function ', 'function ').replace(/^export /gm, '');
  const name = componentName || /function (\w+)\(/.exec(code)[1];
  vm.createContext(context);
  vm.runInContext(`${code}\nglobalThis.Component = ${name};`, context);
  return {
    render(props = {}) { cursor = 0; return context.Component(props); },
    async effects() { const pending = effects.splice(0); await Promise.all(pending.map(fn => fn())); await new Promise(resolve => setImmediate(resolve)); },
  };
}

export function nodes(tree, predicate) {
  if (!tree || typeof tree !== 'object') return [];
  return [...(predicate(tree) ? [tree] : []), ...(tree.props?.children || []).flatMap(child => nodes(child, predicate))];
}

export function textContent(tree) {
  if (tree == null || typeof tree === 'boolean') return '';
  if (typeof tree !== 'object') return String(tree);
  return (tree.props?.children || []).map(textContent).join('');
}
