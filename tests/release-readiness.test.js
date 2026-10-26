import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseHTML } from 'linkedom';
import { createDiarySync } from '../docs/src/diary-sync.js';

test('PWA metadata uses На маса and solid green launch background',()=>{
 const page=readFileSync(new URL('../docs/index.html',import.meta.url),'utf8');
 const manifest=JSON.parse(readFileSync(new URL('../docs/manifest.webmanifest',import.meta.url),'utf8'));
 const doc=parseHTML(page).document;
 assert.match(doc.querySelector('title').textContent,/На маса/);
 assert.equal(doc.querySelector('meta[name="apple-mobile-web-app-title"]').getAttribute('content'),'На маса');
 assert.equal(doc.querySelector('link[rel="icon"][type="image/svg+xml"]').getAttribute('href'),'assets/favicon.svg');
 assert.equal(manifest.name,'На маса');
 assert.equal(manifest.background_color,'#013c26');
 const svg=readFileSync(new URL('../docs/assets/favicon.svg',import.meta.url),'utf8');
 assert.match(svg,/<rect width="128" height="128" fill="#013c26"\/>/);
});
test('guest diary remains local with backup until explicit import consent',async()=>{
 const store=new Map();
 const storage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)};
 const id=crypto.randomUUID(),another=crypto.randomUUID();
 const local=[{id,name:'local'}],remote=[{id:another,name:'remote'}];
 let merged=null;
 const sync=createDiarySync(storage,async path=>path==='/diary'?{items:remote}:{},()=>{});
 await sync.start('account-1',()=>local,items=>{merged=items});
 assert.equal(sync.status().needsImport,true);
 assert.equal(merged,null);
 assert.deepEqual(JSON.parse(store.get('na-masa-presync-backup:account-1')),local);
 sync.adoptLocal(local,items=>{merged=items});
 assert.deepEqual(merged.map(e=>e.name).sort(),['local','remote']);
 sync.stop();
});
