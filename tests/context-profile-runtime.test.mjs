import test from 'node:test';
import assert from 'node:assert/strict';
import { uiHarness, nodes, textContent } from './ui-harness.mjs';

test('profile editor can render before the profile and gym finish loading', async () => {
  const harness = await uiHarness('src/pages/ProfilePage.jsx', {
    useAuth: () => ({ profile: null }), useGym: () => ({ gym: null }),
    useNavigate: () => () => {}
  });
  assert.doesNotThrow(() => harness.render());
});

test('profile refresh keeps unsaved name edits while updating untouched fields', async () => {
  let profile = { id: 'owner', full_name: 'Original', phone_number: '111', gender: 'male' };
  const harness = await uiHarness('src/pages/ProfilePage.jsx', {
    useAuth: () => ({ profile }), useGym: () => ({ gym: { id: 'gym', gym_name: 'Gym' } }),
    useNavigate: () => () => {}
  });
  harness.render(); await harness.effects();
  let tree = harness.render();
  const nameInput = nodes(tree, node => node.type === 'input' && node.props.value === 'Original')[0];
  nameInput.props.onChange({ target: { value: 'Draft' } });
  profile = { ...profile, phone_number: '222' };
  harness.render(); await harness.effects();
  tree = harness.render();
  assert.ok(nodes(tree, node => node.type === 'input' && node.props.value === 'Draft').length);
  assert.ok(nodes(tree, node => node.type === 'input' && node.props.value === '222').length);
});

test('season history gives first place a gold medal', async () => {
  const query = {
    select() { return query; }, eq() { return query; }, order() { return query; },
    then(resolve) { return Promise.resolve({ data: [{ final_rank: 1, final_xp: 500, created_at: '2026-10-01', leaderboard_seasons: { season_number: 1 }, members: { full_name: 'Winner' } }], error: null }).then(resolve); }
  };
  const harness = await uiHarness('src/pages/LeaderboardPage.jsx', {
    useCurrentGym: () => ({ gymId: 'gym', isReady: false }),
    supabase: { from: () => query }
  });
  let tree = harness.render();
  nodes(tree, node => node.type === 'button' && textContent(node).includes('Past Seasons History'))[0].props.onClick();
  await new Promise(resolve => setImmediate(resolve));
  tree = harness.render();
  assert.match(textContent(tree), /🥇/);
  assert.doesNotMatch(textContent(tree), /Rank #1/);
});

test('a previous owner gym request cannot replace the current owner gym', async () => {
  let auth = { user: { id: 'owner-a', email: 'a@test' }, profile: { role: 'owner' }, loading: false };
  const pending = new Map();
  const timers = new Map(); let timerId = 0;
  const harness = await uiHarness('src/context/GymProvider.jsx', {
    useAuth: () => auth, isSuperAdmin: () => false,
    getMyGym: id => new Promise(resolve => pending.set(id, resolve)),
    GymContext: { Provider: 'GymContext.Provider' },
    setTimeout(fn, delay) { timers.set(++timerId, { fn, delay }); return timerId; },
    clearTimeout(id) { timers.delete(id); }
  }, 'GymProvider');
  const start = async () => {
    harness.render(); await harness.effects();
    for (const [id, timer] of [...timers]) if (timer.delay === 0) { timers.delete(id); timer.fn(); }
    await new Promise(resolve => setImmediate(resolve));
  };
  await start();
  auth = { user: { id: 'owner-b', email: 'b@test' }, profile: { role: 'owner' }, loading: false };
  await start();
  pending.get('owner-b')({ id: 'gym-b' });
  await new Promise(resolve => setImmediate(resolve));
  pending.get('owner-a')({ id: 'gym-a' });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(harness.render().props.value.gym.id, 'gym-b');
});
