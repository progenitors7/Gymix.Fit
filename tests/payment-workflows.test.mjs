import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function loadService(path, name, dependencies) {
  const source = fs.readFileSync(path, 'utf8')
    .replace(/^import .*;\r?\n/gm, '')
    .replace(/^export /gm, '');
  const context = { ...dependencies, console: { error() {} } };
  vm.runInNewContext(`${source}\nglobalThis.service = ${name};`, context);
  return context.service;
}

function formHandler(name, context) {
  const source = fs.readFileSync('src/components/Payments/PaymentForm.jsx', 'utf8');
  const start = source.indexOf(`  const ${name} =`);
  const end = source.indexOf('\n  };', start) + 6;
  vm.runInNewContext(source.slice(start, end) + `\nglobalThis.handler = ${name};`, context);
  return context.handler;
}

test('changing payment member clears the old member subscription before submission', () => {
  let state = { member_id: 'member-a', subscription_id: 'subscription-a', amount_paid: '500' };
  const handler = formHandler('handleChange', { setFormData: update => { state = update(state); } });
  handler({ target: { name: 'member_id', value: 'member-b' } });
  assert.equal(state.member_id, 'member-b');
  assert.equal(state.subscription_id, '');
  assert.equal(state.amount_paid, '500');
});

test('smart renewal records the plan price independently of a partial payment', () => {
  let submitted;
  const handler = formHandler('handleSubmit', {
    formData: { amount_paid: '200', payment_date: '2026-10-30' },
    shouldRenew: true,
    selectedPlan: { name: 'Monthly', price: 1000, duration_days: 30 },
    durationTypeFromDays: () => 'monthly',
    onSubmit: data => { submitted = data; }
  });
  handler({ preventDefault() {} });
  assert.equal(submitted.amount_paid, '200');
  assert.equal(submitted.smart_renew.amount, 1000);
});

for (const status of ['pending', 'overdue', 'paid']) {
  test(`payment status ${status} ${status === 'paid' ? 'sends' : 'does not send'} a received receipt`, async () => {
    const notifications = [];
    const payment = { id: 'payment', member_id: 'member', amount_paid: 500, payment_status: status };
    const service = loadService('src/services/paymentService.js', 'paymentService', {
      supabase: { from(table) {
        const query = {
          insert() { return query; }, select() { return query; }, eq() { return query; },
          single: async () => ({ data: payment, error: null }),
          maybeSingle: async () => ({ data: { id: 'member', full_name: 'Member', profile_id: 'profile' }, error: null })
        };
        assert.ok(['members', 'payments'].includes(table));
        return query;
      } },
      pushNotificationService: { notifyPaymentReceived: async (...args) => { notifications.push(args); } }
    });
    const result = await service.createPayment('gym', payment);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(result.id, 'payment');
    assert.equal(notifications.length, status === 'paid' ? 1 : 0);
  });
}

test('smart renewal syncs the member to the expiry actually saved with the subscription', async () => {
  let updatedMember;
  const service = loadService('src/services/unifiedService.js', 'unifiedService', {
    subscriptionService: {
      createSubscription: async () => ({ id: 'subscription', expiry_date: '2026-11-30' })
    },
    paymentService: { createPayment: async () => ({ id: 'payment' }) },
    updateMember: async (id, data) => { updatedMember = { id, ...data }; },
    invalidateDashboardStatsCache() {}
  });
  await service.smartRenew('gym', 'member', {
    plan_name: 'Monthly', duration_type: 'monthly', duration_days: 30,
    amount: 1000, start_date: '2026-10-30'
  }, { amount_paid: 200 });
  assert.equal(updatedMember.expiry_date, '2026-11-30');
});

test('renewal of a 30-day plan saves thirty days even when the duration label is monthly', async () => {
  let saved;
  const subscriptions = loadService('src/services/subscriptionService.js', 'subscriptionService', {
    supabase: { from() {
      const query = {
        insert(rows) { saved = rows[0]; return query; },
        select() { return query; },
        single: async () => ({ data: { id: 'subscription', ...saved }, error: null })
      };
      return query;
    } }
  });
  const service = loadService('src/services/unifiedService.js', 'unifiedService', {
    subscriptionService: subscriptions,
    paymentService: { createPayment: async () => ({ id: 'payment' }) },
    updateMember: async () => {}, invalidateDashboardStatsCache() {}
  });
  await service.smartRenew('gym', 'member', {
    plan_name: '30 days', duration_type: 'monthly', duration_days: 30,
    amount: 1000, start_date: '2026-10-30'
  });
  assert.equal(saved.expiry_date, '2026-11-29');
});
