import test from 'node:test';
import assert from 'node:assert/strict';
import { convertQuantity, suggestedServingQuantity, displayQuantity } from '../docs/src/servings.js';
import { diaryEntry } from '../docs/src/domain.js';
import { foodForm } from '../docs/src/views.js';
import { createAuth } from '../docs/src/auth.js';
import { createDiarySync } from '../docs/src/diary-sync.js';

test('weight and volume conversion preserves base macros; no guessed serving size', () => {
  assert.equal(convertQuantity({amount:0.25,measure:'кг',unit:'г',basis:100}).amount,250);
  assert.equal(convertQuantity({amount:2,measure:'oz',unit:'г',basis:100}).amount.toFixed(2),'56.70');
  assert.equal(convertQuantity({amount:1.5,measure:'л',unit:'мл',basis:100}).amount,1500);
  assert.equal(suggestedServingQuantity('1 купичка (150 г)'),150);
  assert.equal(suggestedServingQuantity('1 чаша'),null);
  assert.equal(suggestedServingQuantity('120 мл','г'),null);
  assert.throws(()=>convertQuantity({amount:1,measure:'именувана порция',unit:'г',basis:100,servingQuantity:150,confirmed:false}),/Потвърди/);
  const qty=convertQuantity({amount:2,measure:'именувана порция',unit:'г',basis:100,servingQuantity:150,confirmed:true});
  const e=diaryEntry({name:'Овес',date:'2026-10-26',meal:'Закуска',amount:qty.amount,unit:qty.unit,basis:100,kcal:100,protein:4,...qty,servingLabel:'купичка'});
  assert.equal((e.kcal*e.amount)/e.basis,300);
  assert.equal(displayQuantity(e).amount,2);
  assert.match(foodForm('2026-10-26','Закуска',e),/Милилитри|Грамове/);
});
test('old records remain valid and the named portion is explicit',()=>{
  const e=diaryEntry({name:'Супа',date:'2026-10-26',meal:'Обяд',unit:'порции',basis:1,amount:2,kcal:120,protein:4});
  assert.equal(displayQuantity(e).measure,'порции');
  assert.equal(e.amount*e.kcal,240);
});
test('restores Supabase refresh credentials without persisting access tokens', async()=>{
  const map=new Map();
  const storage={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};
  const conf={supabaseUrl:'https://test.supabase.co',supabasePublicKey:'test'};
  const data={user:{id:'u-1',email:'one@test.com'},access_token:'private-access',refresh_token:'refresh-1',expires_in:3600};
  const fetcher=async()=>Response.json(data);
  const auth=createAuth(conf,fetcher,storage);
  await auth.verify('one@test.com','123456');
  assert.equal([...map.values()].join('').includes('private-access'),false);
  const another=createAuth(conf,fetcher,storage);
  assert.equal((await another.restore()).id,'u-1');
  assert.equal(await another.token(),'private-access');
  await another.signOut();
  assert.equal(map.size,0);
});
test('diary mutations are queued, replayed and isolated per user',async()=>{
  const map=new Map(), calls=[];
  const storage={getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};
  const request=async(p,opts={})=>{calls.push([p,opts.method||'GET']);if(p==='/diary')return {items:[]};return {}};
  const sync=createDiarySync(storage,request);
  let entries=[];
  await sync.start('user-a',()=>entries,()=>{});
  const e=diaryEntry({name:'Ябълка',date:'2026-10-26',meal:'Закуска',unit:'г',basis:100,amount:100,kcal:50,protein:1});
  entries=[e];sync.track(entries);await sync.flush();
  assert.ok(calls.some(x=>x[0]==='/diary/'+e.id&&x[1]==='PUT'));
  entries=[];sync.track(entries);await sync.flush();
  assert.ok(calls.some(x=>x[0]==='/diary/'+e.id&&x[1]==='DELETE'));
  sync.stop();
});
