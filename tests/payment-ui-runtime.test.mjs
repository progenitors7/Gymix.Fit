import test from 'node:test';
import assert from 'node:assert/strict';
import { uiHarness, nodes } from './ui-harness.mjs';

test('quick renewal is unavailable until a plan has loaded', async () => {
  const harness = await uiHarness('src/components/UI/QuickRenewModal.jsx', {
    useCurrentGym: () => ({ gym: { id: 'gym' } }),
    planService: { getPlans: async () => [] }
  });
  const tree = harness.render({ isOpen: true, member: { id: 'member', full_name: 'Member' } });
  const confirm = nodes(tree, node => node.type === 'button' && node.props.disabled !== undefined).at(-1);
  assert.equal(confirm.props.disabled, true);
});

test('quick renewal treats plan duration as days when the value is a numeric string', async () => {
  const harness = await uiHarness('src/components/UI/QuickRenewModal.jsx', {
    useCurrentGym: () => ({ gym: { id: 'gym' } }),
    planService: { getPlans: async () => [{ id: 'plan', name: '30 days', price: 500, duration_days: '30' }] }
  });
  const props = { isOpen: true, member: { id: 'member', full_name: 'Member', expiry_date: '2099-01-01' } };
  harness.render(props);
  await harness.effects();
  harness.render(props);
  await harness.effects();
  const tree = harness.render(props);
  assert.equal(nodes(tree, node => node.type === 'input' && node.props.type === 'date')[0].props.value, '2099-01-31');
});

test('preselected subscription member receives their saved plan after data loads', async () => {
  const harness = await uiHarness('src/components/Subscriptions/SubscriptionForm.jsx', {
    useNavigate: () => () => {},
    useMemo: fn => fn(),
    useCurrentGym: () => ({ gym: { id: 'gym' } }),
    useMembers: () => ({ members: [{ id: 'member', full_name: 'Member', membership_plan: '30 days' }], fetchMembers: () => {} }),
    planService: { getPlans: async () => [{ id: 'plan', name: '30 days', price: 500, duration_days: 30 }] },
    document: { addEventListener() {}, removeEventListener() {} },
    setTimeout: fn => { fn(); return 1; },
    subscriptionService: { calculateExpiryDate: () => '2026-12-01' }
  });
  const props = { initialData: { member_id: 'member' } };
  harness.render(props);
  await harness.effects();
  harness.render(props);
  await harness.effects();
  const tree = harness.render(props);
  assert.equal(nodes(tree, node => node.type === 'input' && node.props.name === 'amount')[0].props.value, 500);
});
