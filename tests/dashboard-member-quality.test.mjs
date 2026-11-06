import test from 'node:test';
import assert from 'node:assert/strict';
import { uiHarness, nodes, textContent } from './ui-harness.mjs';
import { localDateString } from '../src/utils/date.js';

test('profile refresh preserves an unfinished name edit', async () => {
  const ui = await uiHarness('src/components/MemberPortal/MemberProfileTab.jsx', {}, 'MemberProfileTab');
  let props = { profile: { id: 'athlete', full_name: 'Original Name' }, membership: null };
  ui.render(props);
  await ui.effects();
  let tree = ui.render(props);
  nodes(tree, node => node.type === 'input' && node.props.value === 'Original Name')[0].props.onChange({ target: { value: 'Unfinished Edit' } });
  props = { ...props, profile: { ...props.profile, phone_number: '9999999999' } };
  ui.render(props);
  await ui.effects();
  tree = ui.render(props);
  assert.equal(nodes(tree, node => node.type === 'input' && node.props.value === 'Unfinished Edit').length, 1);
});

test('attendance switches members without showing a previous member late response', async () => {
  const pending = [];
  const ui = await uiHarness('src/components/Members/MemberAttendanceCard.jsx', {
    supabase: { from() { const query = { select() { return query; }, eq() { return query; }, order: () => new Promise(resolve => pending.push(resolve)) }; return query; } },
  });
  ui.render({ memberId: 'first' });
  await ui.effects();
  ui.render({ memberId: 'second' });
  await ui.effects();
  pending[1]({ data: [] });
  await new Promise(resolve => setImmediate(resolve));
  pending[0]({ data: [{ check_in_time: '2026-10-30T06:00:00Z' }] });
  await new Promise(resolve => setImmediate(resolve));
  assert.match(textContent(ui.render({ memberId: 'second' })), /0 sessions/);
});

test('changing member plan recalculates expiry without waiting for an effect', async () => {
  const ui = await uiHarness('src/components/Members/MemberForm.jsx', {
    localDateString,
    useCurrentGym: () => ({ gym: { id: 'gym' } }),
    planService: { getPlans: async () => [{ name: 'Monthly', duration_days: 30, price: 600 }] },
  }, 'MemberForm');
  ui.render();
  await ui.effects();
  let tree = ui.render();
  nodes(tree, node => node.props?.id === 'member-plan')[0].props.onChange({ target: { value: 'Monthly' } });
  tree = ui.render();
  const dates = nodes(tree, node => node.type === 'DatePicker');
  dates[0].props.onChange('2026-10-01');
  tree = ui.render();
  assert.equal(nodes(tree, node => node.type === 'DatePicker')[1].props.value, '2026-10-31');
});

test('approval switches to the new request contact immediately', async () => {
  const ui = await uiHarness('src/components/Dashboard/SmartApprovalModal.jsx', {
    localDateString, createPortal: node => node, document: { body: {} },
    useCurrentGym: () => ({ gym: { id: 'gym' } }),
    planService: { getPlans: async () => [{ name: 'Monthly', duration_days: 30, price: 600 }] },
  }, 'SmartApprovalModal');
  ui.render({ open: true, request: { id: 'first', profiles: { phone_number: '1111111111' } } });
  await ui.effects();
  const tree = ui.render({ open: true, request: { id: 'second', profiles: { phone_number: '2222222222' } } });
  assert.equal(nodes(tree, node => node.type === 'input' && node.props.value === '2222222222').length, 1);
});
