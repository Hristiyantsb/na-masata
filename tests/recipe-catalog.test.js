import test from 'node:test';
import assert from 'node:assert/strict';
import {validateRecipes,loadRecipeCatalog} from '../docs/src/recipe-catalog.js';
import {RECIPES} from '../docs/src/catalog.js';
const valid={id:'book-lentils',name:'Леща от книгата',type:'Домашна кухня',time:40,equipment:['hob'],ing:{lentil:180,carrot:100},steps:['Вари до омекване.']};
test('recipe import rejects unknown ingredients, markup and duplicate ids',()=>{
 assert.equal(validateRecipes([valid]).length,1);
 for(const recipe of [{...valid,ing:{unknown:10}},{...valid,ing:{lentil:-1}},{...valid,name:'<img src=x>'},{...valid,equipment:['unknown']},{...valid,time:0},{...valid,steps:[]}])assert.throws(()=>validateRecipes([recipe]));
 assert.throws(()=>validateRecipes([valid,valid]));
 assert.throws(()=>validateRecipes([{...valid,ing:JSON.parse('{"__proto__":10}')}]))
});
test('cached catalog survives unavailable network and does not duplicate built-ins',async()=>{
 const storage={getItem:()=>JSON.stringify([valid]),setItem:()=>{}};
 const initial=RECIPES.length;
 await loadRecipeCatalog({authProvider:'cloudflare',apiBase:'/api'},storage,async()=>{throw Error('offline')});
 assert.equal(RECIPES.length,initial+1);
 await loadRecipeCatalog({authProvider:'cloudflare',apiBase:'/api'},storage,async()=>{throw Error('offline')});
 assert.equal(RECIPES.length,initial+1);RECIPES.pop();
});
