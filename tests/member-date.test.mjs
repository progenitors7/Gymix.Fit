import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('src/services/memberService.js','utf8');
const body=source.slice(source.indexOf('const getStatusFromExpiry ='),source.indexOf('const getLatestSubscription'));
// Simulate 00:30 in India while UTC is still on the previous date.
class IndiaMidnight extends Date {
 constructor(...args){super(...(args.length?args:['2026-10-29T19:00:00Z']));}
 getFullYear(){return 2026;} getMonth(){return 9;} getDate(){return 30;}
}
test('member expiring on yesterday is expired after local midnight',()=>{
 const context={Date:IndiaMidnight};vm.runInNewContext(body+'globalThis.status=getStatusFromExpiry;',context);
 assert.equal(context.status('2026-10-29'),'expired');
 assert.equal(context.status('2026-10-30'),'expiring_soon');
});
