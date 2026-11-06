import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('src/components/Subscriptions/SubscriptionForm.jsx','utf8');
const body=source.slice(source.indexOf('  const handleChange ='),source.indexOf('  const handleSubmit ='));
function change(name,value,initial){let state=initial;vm.runInNewContext(body+`handleChange({target:{name,value}});`,{name,value,setFormData:fn=>state=fn(state),subscriptionService:{calculateExpiryDate:(date,type)=>`${date}:${type}`}});return state;}
test('changing subscription start date recalculates calendar expiry',()=>{
 const state=change('start_date','2026-11-15',{start_date:'2026-10-15',duration_type:'monthly',expiry_date:'2026-11-15'});
 assert.equal(state.expiry_date,'2026-11-15:monthly');
});
test('cleared subscription start date does not calculate invalid expiry',()=>{
 const state=change('start_date','',{start_date:'2026-10-15',duration_type:'monthly',expiry_date:'2026-11-15'});
 assert.equal(state.expiry_date,'');
});
test('activation DatePicker delegates to the validated start-date handler',()=>{
 const picker=source.slice(source.indexOf('value={formData.start_date}'),source.indexOf('{/* Expiry Date Display/Input */}'));
 assert.match(picker,/handleChange\(\{ target: \{ name: 'start_date', value: val \} \}\)/);
});
