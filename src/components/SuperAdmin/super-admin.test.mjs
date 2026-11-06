import test from 'node:test';
import assert from 'node:assert/strict';
import { uiHarness, nodes, textContent } from '../../../tests/ui-harness.mjs';

for (const [component, method] of [
  ['RevenueLedger', 'getSaaSTransactions'],
  ['StoreOrdersManager', 'getStoreOrders'],
  ['UserSecurityManager', 'getAllUserProfiles']
]) {
  test(`${component} search returns to page one in the same interaction`, async () => {
    const rows = Array.from({ length: 25 }, (_, i) => ({
      id: `row-${i}`, full_name: `Person ${i}`, email: `person${i}@example.test`,
      role: 'member', created_at: '2026-10-30', status: 'pending',
      gyms: { gym_name: `Gym ${i}` }, saas_plans: { name: 'Monthly' },
      members: { full_name: `Person ${i}`, phone_number: '9999999999' },
      total_amount: 100, amount: 100, payment_status: 'completed', items: []
    }));
    const ui = await uiHarness(`src/components/SuperAdmin/${component}.jsx`, {
      useMemo: compute => compute(),
      superAdminService: { [method]: async () => rows }
    });
    ui.render();
    await ui.effects();
    let tree = ui.render();
    nodes(tree, n => n.type === 'select' && n.props['aria-label'] === 'Select page')[0]
      .props.onChange({ target: { value: '2' } });
    tree = ui.render();
    assert.equal(nodes(tree, n => n.type === 'select' && n.props['aria-label'] === 'Select page')[0].props.value, 2);
    nodes(tree, n => n.type === 'input' && n.props.type === 'text')[0]
      .props.onChange({ target: { value: component === 'RevenueLedger' ? 'Gym 0' : 'Person 0' } });
    tree = ui.render();
    assert.match(textContent(tree), component === 'RevenueLedger' ? /Gym 0/ : /Person 0/);
    const page = nodes(tree, n => n.type === 'select' && n.props['aria-label'] === 'Select page')[0];
    if (page) assert.equal(page.props.value, 1);
  });
}

test('gym directory follows its parent mode immediately', async () => {
  const ui = await uiHarness('src/components/SuperAdmin/GymManagement.jsx', {
    useMemo: compute => compute(), useNavigate: () => () => {},
    superAdminService: {}
  }, 'GymManagement');
  ui.render({ mode: 'owners' });
  const tree = ui.render({ mode: 'members' });
  assert.ok(nodes(tree, n => n.type === 'input' && n.props.placeholder?.startsWith('Search member')).length > 0);
});

for (const [component, responses, expected] of [
  ['BroadcastSystem', {
    getBroadcasts: [{ id: 'announcement', title: 'Scheduled maintenance', message: 'At midnight', type: 'info', created_at: '2026-10-30' }],
    getAllGyms: []
  }, /Scheduled maintenance/],
  ['PlanManager', {
    getSaaSPlans: [{ id: 'monthly', name: 'Custom Monthly', price: 100, max_members: 100, features: [] }],
    getAllSaaSSubscriptions: [], getAllGyms: []
  }, /Custom Monthly/],
  ['PushBroadcaster', {
    getPushTokens: [{ id: 'device', token: 'device-token', profiles: { full_name: 'Device Owner', role: 'owner' } }]
  }, /Device Owner/],
  ['SupportCenter', {
    getTickets: [{ id: 'ticket', subject: 'Billing question', description: 'Please help', status: 'open', priority: 'low', created_at: '2026-10-30', gyms: { gym_name: 'Test Gym' } }]
  }, /Billing question/],
  ['SystemHealth', {
    getSystemHealth: { databaseStatus: 'Available', latency: '15ms', settings: [], metrics: {} }
  }, /15ms/],
  ['SystemSettings', {
    getSystemSettings: [{ key: 'allow_new_registrations', value: true }]
  }, /ALLOW NEW REGISTRATIONS/]
]) {
  test(`${component} displays its initial data without refetching on rerender`, async () => {
    let reads = 0;
    const services = Object.fromEntries(Object.entries(responses).map(([name, data]) => [name, async () => { reads++; return data; }]));
    const ui = await uiHarness(`src/components/SuperAdmin/${component}.jsx`, {
      useAuth: () => ({ user: { id: 'admin' } }), useMemo: compute => compute(),
      superAdminService: services
    });
    ui.render();
    await ui.effects();
    assert.match(textContent(ui.render()), expected);
    await ui.effects();
    assert.equal(reads, Object.keys(responses).length);
  });
}
