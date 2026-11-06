import test from 'node:test';
import assert from 'node:assert/strict';
import { defaults } from '../docs/src/domain.js';
import { saveDraft, restoreDraft, clearDraft, cookingSteps, setCookingStep, knownBarcode, DRAFT_KEY, COOKING_KEY } from '../docs/src/local-features.js';
const memory=()=>{const data=new Map();return {getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)}};
test('onboarding resumes a validated draft and tolerates corrupt storage',()=>{
 const s=memory(); const draft=defaults().settings;
 saveDraft(s,{draft,step:4}); assert.equal(restoreDraft(s).step,4);
 assert.deepEqual(restoreDraft(s).draft,draft);
 s.setItem(DRAFT_KEY,'{broken');assert.equal(restoreDraft(s),null);
 saveDraft(s,{draft,step:99});assert.equal(restoreDraft(s),null);
 clearDraft(s);assert.equal(restoreDraft(s),null);
});
test('cooking progress persists per recipe, can be undone, and ignores stale step indexes',()=>{
 const s=memory();setCookingStep(s,'lentils',0,true,3);setCookingStep(s,'lentils',2,true,3);
 assert.deepEqual(cookingSteps(s,'lentils',3),[0,2]);assert.deepEqual(cookingSteps(s,'other',3),[]);
 setCookingStep(s,'lentils',0,false,3);assert.deepEqual(cookingSteps(s,'lentils',3),[2]);
 assert.deepEqual(cookingSteps(s,'lentils',2),[]);s.setItem(COOKING_KEY,'null');assert.deepEqual(cookingSteps(s,'lentils',3),[]);
});
test('barcode reuse only matches valid locally recorded products',()=>{
 const state=defaults();state.diary=[{barcode:'4006381333931',name:'Test'}];
 assert.equal(knownBarcode(state,'4006381333931').name,'Test');
 assert.equal(knownBarcode(state,'4006381333932'),null);assert.equal(knownBarcode(state,'123'),null);
});
