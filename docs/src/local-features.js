import { defaults, normalizeState, isValidBarcode } from './domain.js';
export const DRAFT_KEY='na-masa-onboarding-v2';
export const COOKING_KEY='na-masa-cooking-v1';
// Keys written by builds before the rename. Cooking ticks move over once; old setup drafts
// belonged to a longer flow with different step numbers, so they are dropped.
export const LEGACY_KEYS={draft:'edish-onboarding-v1',cooking:'edish-cooking-v1'};
export function migrateLocalKeys(storage){
 try{
  const old=storage.getItem(LEGACY_KEYS.cooking);
  if(old!==null&&storage.getItem(COOKING_KEY)===null)storage.setItem(COOKING_KEY,old);
  storage.removeItem(LEGACY_KEYS.cooking);storage.removeItem(LEGACY_KEYS.draft);
 }catch{}
}
const LAST_STEP=6;
export function saveDraft(storage,wizard){try{storage.setItem(DRAFT_KEY,JSON.stringify({draft:wizard.draft,step:wizard.step}))}catch{}}
export function restoreDraft(storage){
 try{const d=JSON.parse(storage.getItem(DRAFT_KEY));if(!d||!Number.isInteger(d.step)||d.step<0||d.step>LAST_STEP||!d.draft)return null;
 return {draft:normalizeState({...defaults(),settings:d.draft}).settings,step:d.step,error:''};}catch{return null}
}
export function clearDraft(storage){try{storage.removeItem(DRAFT_KEY);storage.removeItem(LEGACY_KEYS.draft)}catch{}}
export function cookingSteps(storage,id,length){try{const data=JSON.parse(storage.getItem(COOKING_KEY)||'{}');return Array.isArray(data[id])?data[id].filter(n=>Number.isInteger(n)&&n>=0&&n<length):[]}catch{return []}}
export function setCookingStep(storage,id,index,checked,length){
 if(!Number.isInteger(index)||index<0||index>=length)return [];
 let data;try{data=JSON.parse(storage.getItem(COOKING_KEY)||'{}')}catch{data={}}
 if(!data||typeof data!=='object'||Array.isArray(data))data={};
 const selected=new Set(cookingSteps(storage,id,length));checked?selected.add(index):selected.delete(index);data[id]=[...selected];
 try{storage.setItem(COOKING_KEY,JSON.stringify(data))}catch{}
 return data[id];
}
export function knownBarcode(state,code){if(!isValidBarcode(code))return null;return [...state.savedFoods,...state.diary.slice().reverse()].find(e=>e.barcode===code)||null;}
