import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import worker from '../server/worker.js';

function database() {
 const db = new DatabaseSync(':memory:');
 db.exec(readFileSync(new URL('../server/migration.sql',import.meta.url),'utf8'));
 const prepare=(sql)=>({bind(...args){return {
   run: async()=>({meta:{changes:Number(db.prepare(sql).run(...args).changes)}}),
   first: async()=>db.prepare(sql).get(...args)||null,
   all: async()=>({results:db.prepare(sql).all(...args)}),
 };}});
 return { env:{DB:{prepare,batch:async statements=>{for(const item of statements) await item.run();}}}, close:()=>db.close() };
}
test('server app-data deletion needs owner auth and explicit confirmation',async()=>{
 const u='00000000-0000-4000-8000-000000000001';
 const oldFetch=globalThis.fetch;
 const {env,close}=database();
 const full={...env,SUPABASE_URL:'https://auth.example',SUPABASE_ANON_KEY:'public',APP_ORIGIN:'https://app.example'};
 globalThis.fetch=async()=>Response.json({id:u,email_confirmed_at:'2026-10-26'});
 const req=(confirmation)=>new Request('https://api.example/account/data',{method:'DELETE',headers:{origin:'https://app.example',Authorization:'Bearer test','Content-Type':'application/json'},body:JSON.stringify({confirmation})});
 try {
   const before=await worker.fetch(req('no'),full,{});
   assert.equal(before.status,400);
   await env.DB.prepare('INSERT INTO user_diary(user_id,id,payload,updated_at) VALUES(?,?,?,?)')
     .bind(u,'00000000-0000-4000-8000-000000000002','{}','2026-10-26').run();
   await env.DB.prepare('INSERT INTO user_backups(user_id,revision,payload,updated_at) VALUES(?,?,?,?)')
     .bind(u,'revision-test','{}','2026-10-26').run();
   const result=await worker.fetch(req('DELETE_MY_APP_DATA'),full,{});
   assert.equal(result.status,200);
   assert.deepEqual((await result.json()).scope,['diary','backup']);
   const diary=await env.DB.prepare('SELECT id FROM user_diary WHERE user_id=?').bind(u).first();
   const backup=await env.DB.prepare('SELECT revision FROM user_backups WHERE user_id=?').bind(u).first();
   assert.equal(diary,null);assert.equal(backup,null);
 }finally{globalThis.fetch=oldFetch;close();}
});
test('app-data deletion rejects active subscriptions to avoid ongoing billing',async()=>{
 const u='00000000-0000-4000-8000-000000000001';
 const oldFetch=globalThis.fetch;const {env,close}=database();
 const full={...env,SUPABASE_URL:'https://auth.example',SUPABASE_ANON_KEY:'public',APP_ORIGIN:'https://app.example'};
 globalThis.fetch=async()=>Response.json({id:u,email_confirmed_at:'2026-10-26'});
 try{
  await env.DB.prepare('INSERT INTO subscriptions(user_id,customer_id,subscription_id,plan,interval,status,period_end,cancel_at_period_end,event_created) VALUES(?,?,?,?,?,?,?,?,?)')
  .bind(u,'cus_test','sub_test','plus','month','active',Math.floor(Date.now()/1000)+3600,0,0).run();
  const r=await worker.fetch(new Request('https://api.example/account/data',{method:'DELETE',headers:{Authorization:'Bearer x'},body:JSON.stringify({confirmation:'DELETE_MY_APP_DATA'})}),full,{});
  assert.equal(r.status,409);
 } finally {globalThis.fetch=oldFetch;close();}
});
