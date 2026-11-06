import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
test('switching gyms fetches new members even after first gym was loaded',async()=>{
 let gymId='gym-a',cursor=0;const states=[],effects=[],deps=[];const calls=[];
 const storage=new Map();
 const context={console,useState(initial){let i=cursor++;if(!(i in states))states[i]=initial;return [states[i],value=>{states[i]=typeof value==='function'?value(states[i]):value;}];},useCallback:fn=>fn,useEffect(fn,values){const i=cursor++;if(!deps[i]||values.some((v,j)=>v!==deps[i][j]))effects.push(fn);deps[i]=values;},useCurrentGym:()=>({gym:{id:gymId},gymId,isReady:true}),useRealtimeSync(){},filterMembers:m=>m,getMembers:async id=>{calls.push(id);return [{id}];},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},setTimeout:fn=>fn()};
 const source=fs.readFileSync('src/hooks/useMembers.js','utf8').replace(/^import .*\r?\n/gm,'').replace('export function','function');
 vm.runInNewContext(source+'globalThis.hook=useMembers;',context);
 function render(){cursor=0;const value=context.hook();while(effects.length)effects.shift()();return value;}
 render();await new Promise(resolve=>setImmediate(resolve));render();
 gymId='gym-b';render();await new Promise(resolve=>setImmediate(resolve));
 assert.deepEqual(calls,['gym-a','gym-b']);
 assert.equal(render().members[0].id,'gym-b');
});
