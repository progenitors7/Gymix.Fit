import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('src/context/NotificationProvider.jsx','utf8');
for(const all of [false,true])test(`failed mark ${all?'all':'one'} keeps unread notifications`,async()=>{
 const a=source.indexOf(all?'  const markAllAsRead =':'  const markAsRead =');
 const b=source.indexOf(all?'\n  return (':'  const markAllAsRead =',a);
 let changed=false;
 const context={gym:{id:'g'},notificationService:{markAsRead:async()=>({error:'offline'}),markAllAsRead:async()=>({error:'offline'})},setNotifications:()=>{changed=true;},setUnreadCount:()=>{changed=true;}};
 vm.runInNewContext(source.slice(a,b)+`\nglobalThis.run=${all?'markAllAsRead':'markAsRead'};`,context);
 await context.run('id');assert.equal(changed,false);
});
