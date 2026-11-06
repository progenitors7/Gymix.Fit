import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { uiHarness, nodes, textContent } from './ui-harness.mjs';

test('mobile navigation closes immediately when the route changes', async () => {
  let pathname = '/dashboard';
  const harness = await uiHarness('src/components/Layout/AppLayout.jsx', {
    useAuth: () => ({ profile: { role: 'owner' } }),
    useGym: () => ({ gym: {} }),
    useLocation: () => ({ pathname }),
    sessionStorage: { getItem: () => null },
    isNativeCapacitorApp: () => false,
    clsx: (...values) => values.flat().filter(Boolean).join(' '),
    twMerge: value => value
  }, 'AppLayout');
  let tree = harness.render();
  const open = nodes(tree, node => node.type === 'button' && nodes(node, item => item.type === 'Menu').length)[0];
  open.props.onClick();
  tree = harness.render();
  assert.equal(nodes(tree, node => node.type === 'motion.div').length, 1);
  pathname = '/members';
  tree = harness.render();
  assert.equal(nodes(tree, node => node.type === 'motion.div').length, 0);
});

test('corrupted saved announcement dismissals do not crash the layout', async () => {
  const harness = await uiHarness('src/components/Layout/BroadcastBanner.jsx', {
    localStorage: { getItem: () => '{broken', setItem() {} },
    superAdminService: { getActiveBroadcasts: async () => [{ id: 'notice', title: 'News', message: 'Visible', type: 'info' }] }
  });
  assert.doesNotThrow(() => harness.render());
  await harness.effects();
  assert.match(textContent(harness.render()), /Visible/);
});

function realtimeHarness() {
  const refs = [], effects = [], cleanups = [], dependencies = [];
  let index = 0;
  const subscriptions = [];
  const timers = new Map();
  let timerId = 0;
  const context = {
    console: { log() {}, warn() {} },
    useRef(initial) { const i = index++; return refs[i] ||= { current: initial }; },
    useEffect(fn, deps) {
      const i = index++;
      if (!dependencies[i] || deps.some((value, j) => value !== dependencies[i][j])) {
        effects.push(() => { cleanups[i]?.(); cleanups[i] = fn(); });
        dependencies[i] = deps;
      }
    },
    setTimeout(fn) { timers.set(++timerId, fn); return timerId; },
    clearTimeout(id) { timers.delete(id); },
    supabase: {
      channel(name) {
        const listeners = [];
        const channel = { name, listeners, on(type, filter, handler) { listeners.push(handler); return channel; }, subscribe() {} };
        subscriptions.push(channel);
        return channel;
      },
      removeChannel() {}
    }
  };
  const source = fs.readFileSync('src/hooks/useRealtimeSync.js', 'utf8').replace(/^import .*\r?\n/gm, '').replace('export function', 'function');
  vm.runInNewContext(source + '\nglobalThis.hook = useRealtimeSync;', context);
  return {
    subscriptions,
    render(options) { index = 0; context.hook(options); },
    commit() { while (effects.length) effects.shift()(); },
    emit() { subscriptions.at(-1).listeners[0]({ eventType: 'UPDATE' }); },
    flush() { const pending = [...timers.values()]; timers.clear(); pending.forEach(fn => fn()); }
  };
}

test('realtime events use the last committed callback until the next render commits', () => {
  const harness = realtimeHarness();
  const updates = [];
  harness.render({ gymId: 'gym', tables: ['payments'], onUpdate: () => updates.push('committed') });
  harness.commit();
  harness.render({ gymId: 'gym', tables: ['payments'], onUpdate: () => updates.push('pending') });
  harness.emit(); harness.flush();
  assert.deepEqual(updates, ['committed']);
  harness.commit();
  harness.emit(); harness.flush();
  assert.deepEqual(updates, ['committed', 'pending']);
  assert.equal(harness.subscriptions.length, 1);
});
