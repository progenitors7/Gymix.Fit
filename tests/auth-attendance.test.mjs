import test from 'node:test';
import assert from 'node:assert/strict';
import { uiHarness, nodes, textContent } from './ui-harness.mjs';
import { localDateString } from '../src/utils/date.js';
import fs from 'node:fs';
import vm from 'node:vm';

const signupPath = 'src/components/Auth/SignupForm.jsx';

test('a selected gym plan opens gym owner registration', async () => {
  const ui = await uiHarness(signupPath, {
    useSearchParams: () => [new URLSearchParams('plan=yearly')],
    useNavigate: () => () => {}, useAuth: () => ({}),
  });
  const tree = ui.render();
  assert.match(textContent(tree), /Register Your Gym/);
  assert.equal(nodes(tree, node => node.props?.id === 'member-fullname').length, 0);
});

test('changing from athlete to owner route updates signup role without remounting', async () => {
  const submitted = [];
  const ui = await uiHarness(signupPath, {
    useSearchParams: () => [new URLSearchParams()],
    useNavigate: () => () => {}, useAuth: () => ({ signUp: (...args) => submitted.push(args) }),
  });
  ui.render();
  let tree = ui.render({ forcedRole: 'owner' });
  assert.match(textContent(tree), /Register Your Gym/);
  assert.match(textContent(ui.render()), /Athlete Sign Up/);
  tree = ui.render({ forcedRole: 'owner' });
  for (const [id, value] of [['signup-email', 'owner@example.test'], ['signup-password', 'secret123'], ['signup-confirm-password', 'secret123']]) {
    nodes(tree, node => node.props?.id === id)[0].props.onChange({ target: { value } });
  }
  tree = ui.render({ forcedRole: 'owner' });
  await nodes(tree, node => node.type === 'form')[0].props.onSubmit({ preventDefault() {} });
  assert.deepEqual(submitted[0], ['owner@example.test', 'secret123', 'owner']);
});

test('an explicit member invite keeps athlete registration even with plan parameters', async () => {
  const ui = await uiHarness(signupPath, {
    useSearchParams: () => [new URLSearchParams('plan=yearly&gym=ABC123&role=member')],
    useNavigate: () => () => {}, useAuth: () => ({}),
  });
  assert.match(textContent(ui.render()), /Athlete Sign Up/);
});

const RealDate = Date;
class EarlyMorningDate extends RealDate {
  constructor(...args) { super(...(args.length ? args : ['2026-10-29T20:30:00.000Z'])); }
  static now() { return new RealDate('2026-10-29T20:30:00.000Z').getTime(); }
}

test('attendance starts on the current local day before UTC midnight', async () => {
  const originalTZ = process.env.TZ;
  process.env.TZ = 'Asia/Kolkata';
  try {
    const ui = await uiHarness('src/pages/AttendancePage.jsx', {
      Date: EarlyMorningDate,
      localDateString,
      useCurrentGym: () => ({ gym: { id: 'gym' } }),
      useRealtimeSync() {},
      supabase: { from() {
        const query = { select() { return query; }, eq() { return query; }, gte() { return query; }, lte() { return query; }, order: async () => ({ data: [] }), then: fn => Promise.resolve({ data: [] }).then(fn) };
        return query;
      } },
    });
    ui.render();
    await ui.effects();
    const tree = ui.render();
    assert.equal(nodes(tree, node => node.props?.type === 'date')[0].props.value, '2026-10-30');
  } finally { if (originalTZ === undefined) delete process.env.TZ; else process.env.TZ = originalTZ; }
});

test('an already running camera uses the gym once it finishes loading', async () => {
  let gymId = null;
  let decoded;
  const calls = [];
  const ui = await uiHarness('src/components/Members/ScannerPage.jsx', {
    useNavigate: () => () => {}, useCurrentGym: () => ({ gymId }),
    Html5Qrcode: class {
      static async getCameras() { return [{ id: 'back', label: 'back' }]; }
      async start(camera, config, callback) { decoded = callback; }
      getState() { return 2; }
      pause() {}
    },
    connectionService: { async logAttendanceCheckIn(...args) { calls.push(args); return { attendance: {}, action: 'checkin' }; } },
  });
  ui.render();
  await ui.effects();
  gymId = 'loaded-gym';
  ui.render();
  await ui.effects();
  await decoded('member-token');
  assert.deepEqual(calls, [['loaded-gym', 'member-token']]);
});

test('failed offline attendance remains queued after a partial sync', async () => {
  const items = [
    { memberId: 'synced', qrToken: 'token1', scannedAt: '2026-10-30T06:00:00Z' },
    { memberId: 'retry', qrToken: 'token2', scannedAt: '2026-10-30T06:01:00Z' },
  ];
  const storage = new Map([['gymix_offline_checkins_gym', JSON.stringify(items)]]);
  const ui = await uiHarness('src/components/Members/ScannerPage.jsx', {
    console: { log() {}, error() {} },
    useNavigate: () => () => {}, useCurrentGym: () => ({ gymId: 'gym' }),
    Html5Qrcode: class { static async getCameras() { return []; } },
    localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) },
    toast: { success() {} },
    connectionService: { async logManualAttendance(gymId, memberId) { if (memberId === 'retry') throw new Error('Network unavailable'); } },
  });
  ui.render();
  await ui.effects();
  assert.deepEqual(JSON.parse(storage.get('gymix_offline_checkins_gym') || '[]'), [items[1]]);
});

function attendanceService(supabase, clock = Date) {
  const source = fs.readFileSync('src/services/connectionService.js', 'utf8')
    .replace(/^import .*\r?\n/gm, '')
    .replace('export const connectionService', 'const connectionService');
  const context = { supabase, Date: clock, console, localDateString };
  vm.runInNewContext(`${source}\nglobalThis.service = connectionService;`, context);
  return context.service;
}

test('yesterday membership expiry is rejected in the early local morning', async () => {
  const originalTZ = process.env.TZ;
  process.env.TZ = 'Asia/Kolkata';
  try {
    const service = attendanceService({ from(table) {
      assert.equal(table, 'members', 'Expired membership must be rejected before attendance is queried');
      const query = { select() { return query; }, eq() { return query; }, maybeSingle: async () => ({ data: { id: 'athlete', status: 'active', full_name: 'Test Athlete', expiry_date: '2026-10-29' } }) };
      return query;
    } }, EarlyMorningDate);
    await assert.rejects(service.logManualAttendance('gym', 'athlete'), /Membership is Expired/);
  } finally { if (originalTZ === undefined) delete process.env.TZ; else process.env.TZ = originalTZ; }
});

test('non-numeric QR timestamps cannot reach attendance logging', async () => {
  const service = attendanceService({ from() { throw new Error('Attendance logging must not run for a malformed QR code'); } });
  await assert.rejects(service.logAttendanceCheckIn('gym', 'MEM_SECURE_member_gym_not-a-timestamp'), /Invalid QR Code/);
});

test('auth route changes immediately replace the displayed form', async () => {
  let location = { pathname: '/login', search: '?mode=signup&gym=ABC123' };
  const navigated = [];
  const ui = await uiHarness('src/components/Auth/AuthPage.jsx', {
    useAuth: () => ({ user: null, loading: false }),
    useLocation: () => location,
    useNavigate: () => value => navigated.push(value),
    useSearchParams: () => [new URLSearchParams(location.search)],
    isNativeCapacitorApp: () => false,
    navigator: { userAgent: 'Desktop' },
    window: { matchMedia: () => ({ matches: false }), navigator: {} },
  });
  let tree = ui.render();
  assert.equal(nodes(tree, node => node.type === 'LoginForm').length, 1);
  nodes(tree, node => node.type === 'LoginForm')[0].props.onSwitch();
  assert.equal(navigated[0], '/signup?gym=ABC123');
  location = { pathname: '/forgot-password', search: '?mode=signup' };
  tree = ui.render();
  assert.equal(nodes(tree, node => node.type === 'ForgotPasswordForm').length, 1);
});

test('manual kiosk shows current attendance while historical records are selected', async () => {
  const today = new Date().toISOString();
  const ui = await uiHarness('src/pages/AttendancePage.jsx', {
    localDateString,
    useCurrentGym: () => ({ gym: { id: 'gym' } }),
    useRealtimeSync() {},
    supabase: { from(table) {
      const query = { select() { return query; }, eq() { return query; }, gte() { return query; }, lte() { return query; },
        order: async () => ({ data: table === 'members' ? [{ id: 'member', full_name: 'Active Athlete', status: 'active' }] : [] }),
        then: fn => Promise.resolve({ data: [{ member_id: 'member', check_in_time: today, check_out_time: null }] }).then(fn),
      };
      return query;
    } },
  });
  ui.render();
  await ui.effects();
  let tree = ui.render();
  nodes(tree, node => node.props?.type === 'date')[0].props.onChange({ target: { value: '2020-01-01' } });
  tree = ui.render();
  await ui.effects();
  tree = ui.render();
  nodes(tree, node => node.type === 'button' && textContent(node).includes('Manual Check-In'))[0].props.onClick();
  ui.render();
  await ui.effects();
  tree = ui.render();
  assert.equal(nodes(tree, node => node.type === 'button' && /Check Out/i.test(textContent(node))).length, 1);
});

test('a slow older attendance request cannot replace the latest selected date', async () => {
  const pending = [];
  const ui = await uiHarness('src/pages/AttendancePage.jsx', {
    localDateString, useCurrentGym: () => ({ gym: { id: 'gym' } }), useRealtimeSync() {},
    supabase: { from() {
      const query = { select() { return query; }, eq() { return query; }, gte() { return query; }, lte() { return query; },
        order: () => new Promise(resolve => pending.push(resolve)),
        then: fn => Promise.resolve({ data: [] }).then(fn),
      };
      return query;
    } },
  });
  ui.render();
  await ui.effects();
  pending.shift()({ data: [] });
  await new Promise(resolve => setImmediate(resolve));
  const selectDate = nodes(ui.render(), node => node.props?.type === 'date')[0].props.onChange;
  selectDate({ target: { value: '2020-01-01' } });
  ui.render();
  await ui.effects();
  const older = pending.shift();
  selectDate({ target: { value: '2020-01-02' } });
  ui.render();
  await ui.effects();
  pending.shift()({ data: [] });
  await new Promise(resolve => setImmediate(resolve));
  older({ data: [] });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(nodes(ui.render(), node => node.props?.type === 'date')[0]?.props.value, '2020-01-02');
});
