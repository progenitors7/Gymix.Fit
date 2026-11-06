import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { ESLint } from 'eslint';
const source = fs.readFileSync('src/services/subscriptionService.js','utf8').replace(/^import .*;\r?\n/gm,'').replaceAll('export const ', 'const ');
const context={};
vm.runInNewContext(source+'\nglobalThis.service=subscriptionService;',context);
for(const [start,type,expected] of [
  ['2025-01-31','monthly','2025-02-28'],
  ['2024-01-31','monthly','2024-02-29'],
  ['2024-02-29','yearly','2025-02-28'],
  ['2025-11-30','quarterly','2026-02-28'],
  ['2025-12-15','monthly','2026-01-15']
]) test(`expiry ${start} ${type} = ${expected}`,()=>assert.equal(context.service.calculateExpiryDate(start,type),expected));
test('date-only subscription input rejects impossible dates',()=>assert.throws(()=>context.service.calculateExpiryDate('2025-02-31','monthly')));
test('AppLayout obeys hook order across member and owner renders',async()=>{
 const results=await new ESLint().lintFiles(['src/components/Layout/AppLayout.jsx']);
 const violations=results.flatMap(r=>r.messages).filter(m=>m.ruleId==='react-hooks/rules-of-hooks');
 assert.equal(violations.length,0,JSON.stringify(violations));
});
