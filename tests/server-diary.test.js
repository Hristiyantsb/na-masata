import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import { diaryRoute } from '../server/diary.js';
const respond=(value,status=200)=>Response.json(value,{status});
const sample=(id,amount=100)=>({id,name:'Банан',date:'2026-10-26',meal:'Закуска',amount,unit:'г',basis:100,kcal:95,protein:1});
function db(){
  const sqlite=new DatabaseSync(':memory:');
  sqlite.exec(fs.readFileSync(new URL('../server/migration.sql',import.meta.url),'utf8'));
  return {
    env:{DB:{prepare(sql){return {bind(...params){return {
      async run(){const out=sqlite.prepare(sql).run(...params);return {meta:{changes:Number(out.changes)}};},
      async all(){return {results:sqlite.prepare(sql).all(...params)};},
    };}}}}},
    close(){sqlite.close()},
  };
}
test('per-user upsert is idempotent; wrong user never sees the entry',async()=>{
 const {env,close}=db();
 const id=crypto.randomUUID();
 try{
  const put=(data)=>new Request('https://app.example/diary/'+id,{method:'PUT',body:JSON.stringify(data)});
  assert.equal((await diaryRoute(put(sample(id)),env,'alice',respond,'/diary/'+id)).status,200);
  assert.equal((await diaryRoute(put(sample(id,150)),env,'alice',respond,'/diary/'+id)).status,200);
  const rows=await (await diaryRoute(new Request('https://app.example/diary'),env,'alice',respond,'/diary')).json();
  assert.equal(rows.items.length,1);
  assert.equal(rows.items[0].amount,150);
  const bob=await (await diaryRoute(new Request('https://app.example/diary'),env,'bob',respond,'/diary')).json();
  assert.equal(bob.items.length,0);
  await diaryRoute(new Request('https://app.example/diary/'+id,{method:'DELETE'}),env,'bob',respond,'/diary/'+id);
  const after=await (await diaryRoute(new Request('https://app.example/diary'),env,'alice',respond,'/diary')).json();
  assert.equal(after.items.length,1);
  assert.equal((await diaryRoute(put({...sample(id),kcal:-1}),env,'alice',respond,'/diary/'+id)).status,400);
 } finally {close();}
});
