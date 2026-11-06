import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

async function edge({ fcm = true, cron = false, token = 'user-token', gatewayStatus = 200 } = {}) {
  let handler;
  const calls = [];
  const logs = [];
  const env = { SUPABASE_URL: 'https://example.test', SUPABASE_SERVICE_ROLE_KEY: 'service-secret', WA_API_SECRET: 'gateway-secret', WA_BACKEND_URL: 'https://gateway.test', ...(fcm ? { FCM_PROJECT_ID: 'project', FCM_SERVICE_ACCOUNT_KEY: '{}' } : {}) };
  const rows = { profiles: { role: 'owner' }, gyms: { id: 'gym', wa_autopilot_enabled: true, wa_template_welcome: 'Hi {{name}}' }, members: { full_name: 'Test', phone_number: '919999999999' }, push_tokens: [] };
  const client = { auth: { getUser: async () => ({ data: { user: { id: 'owner' } } }) }, from(table) { const chain = { select() { return chain; }, eq() { return chain; }, maybeSingle: async () => ({ data: rows[table] }), in: async () => ({ data: rows[table] }) }; return chain; } };
  const source = fs.readFileSync('supabase/functions/send-push-notification/index.ts', 'utf8').replace(/^import .*;\r?\n/gm, '');
  vm.runInNewContext(source, { Deno: { env: { get: key => env[key] }, serve: fn => { handler = fn; } }, createClient: () => client, Response, AbortSignal, console: { log() {}, warn() {}, error: (...args) => logs.push(args.join(' ')) }, fetch: async (url, options) => { calls.push({ url, options }); return new Response(JSON.stringify(gatewayStatus === 200 ? { success: true, status: 'queued' } : { error: 'Unauthorized' }), { status: gatewayStatus }); } });
  const response = await handler(new Request('https://edge.test', { method: 'POST', headers: { Authorization: `Bearer ${token}`, ...(cron ? { 'x-internal-cron': 'true' } : {}) }, body: JSON.stringify({ userIds: ['owner'], gymId: 'gym', relatedMemberId: 'member', type: 'welcome' }) }));
  return { response, calls, logs };
}

test('autopilot authenticates server-to-server and uses configured gateway', async () => {
  const { calls } = await edge();
  assert.equal(calls[0].url, 'https://gateway.test/api/whatsapp/send');
  assert.equal(calls[0].options.headers['X-API-KEY'], 'gateway-secret');
});
test('WhatsApp is attempted even without Firebase credentials', async () => {
  const { calls } = await edge({ fcm: false });
  assert.equal(calls.length, 1);
});
test('forged internal cron header cannot invoke privileged messaging', async () => {
  const { response, calls } = await edge({ cron: true });
  assert.equal(response.status, 401);
  assert.equal(calls.length, 0);
});
test('gateway rejection is treated as an autopilot failure', async () => {
  const { logs } = await edge({ gatewayStatus: 401 });
  assert.ok(logs.some(line => line.includes('autopilot failed')));
});

async function settings(realBackend, response) {
  const source = fs.readFileSync('src/pages/SettingsPage.jsx', 'utf8');
  const start = source.indexOf('  const handleSendTestMessage =');
  const end = source.indexOf('  // Support Scroll', start);
  const notices = [];
  const context = { isRealBackend: realBackend, testPhone: '9999999999', gymId: 'gym', showToast: (text, kind) => notices.push({ text, kind }), setSendingTestMessage() {}, setShowTestModal() {}, setTestPhone() {}, waFetch: async () => response, setTimeout: fn => fn() };
  vm.runInNewContext(source.slice(start, end) + '\nglobalThis.send = handleSendTestMessage;', context);
  await context.send({ preventDefault() {} });
  return notices;
}
test('queued message is described as queued rather than sent', async () => {
  const notices = await settings(true, new Response(JSON.stringify({ success: true, status: 'queued' })));
  assert.match(notices[0].text, /queued/i);
});
test('gateway error cannot fall back to fake success', async () => {
  const notices = await settings(true, new Response(JSON.stringify({ error: 'Offline' }), { status: 503 }));
  assert.equal(notices.length, 1);
  assert.equal(notices[0].kind, 'error');
});
test('offline gateway cannot simulate sending', async () => {
  const notices = await settings(false);
  assert.equal(notices[0].kind, 'error');
});
