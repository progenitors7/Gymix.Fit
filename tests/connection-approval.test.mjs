import test from 'node:test';
import assert from 'node:assert/strict';
import { uiHarness, nodes } from './ui-harness.mjs';

test('approval calls the service and preserves the dialog when the service fails', async () => {
  const calls = [];
  const request = { id: 'request', gym_id: 'gym', profile_id: 'profile' };
  let fail = true;
  const ui = await uiHarness('src/components/Dashboard/PendingRequestsWidget.jsx', {
    useRealtimeSync() {},
    toast: { success() {} },
    connectionService: {
      getConnectionRequests: async () => [request],
      async approveConnectionRequest(...args) { calls.push(args); if (fail) throw new Error('Approval denied'); },
    },
  }, 'PendingRequestsWidget');
  const props = { gymId: 'gym' };
  ui.render(props);
  await ui.effects();
  const modal = () => nodes(ui.render(props), n => n.type === 'SmartApprovalModal')[0];
  const member = { membership_plan: 'Monthly' };
  const payment = { payment_method: 'cash' };
  await assert.rejects(modal().props.onApproved(request, member, payment), /Approval denied/);
  assert.deepEqual(calls[0], [request, member, payment]);
  fail = false;
  await modal().props.onApproved(request, member, payment);
  assert.equal(calls.length, 2);
});
