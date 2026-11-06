import { PRODUCTS, EQUIPMENT, RECIPES } from './catalog.js';
/** Import only reviewed ingredient ids: unknown allergen/nutrition data must never become safe by default. */
export function validateRecipes(input){
 if(!Array.isArray(input)||input.length>1000)throw Error('Каталогът трябва да съдържа до 1000 рецепти.');
 const seen=new Set();const text=(v,n)=>typeof v==='string'&&v.trim().length>0&&v.length<=n&&!/[<>&]/.test(v);
 return input.map(r=>{
  if(!r||typeof r!=='object'||typeof r.id!=='string'||!/^[a-z][a-z0-9_-]{2,63}$/.test(r.id)||seen.has(r.id))throw Error('Невалиден или повторен идентификатор.');
  seen.add(r.id);
  if(!text(r.name,120)||!text(r.type,60)||!Number.isInteger(r.time)||r.time<1||r.time>480)throw Error('Невалидно име, категория или време: '+r.id);
  if(!Array.isArray(r.equipment)||r.equipment.some(k=>!Object.hasOwn(EQUIPMENT,k)))throw Error('Непознат уред: '+r.id);
  if(!r.ing||Array.isArray(r.ing)||typeof r.ing!=='object'||!Object.keys(r.ing).length||Object.keys(r.ing).length>50)throw Error('Липсват съставки: '+r.id);
  for(const [key,value] of Object.entries(r.ing))if(!Object.hasOwn(PRODUCTS,key)||!Number.isFinite(value)||value<=0||value>10000)throw Error('Непозната съставка или количество: '+key);
  if(!Array.isArray(r.steps)||!r.steps.length||r.steps.length>30||r.steps.some(s=>!text(s,2000)))throw Error('Невалидни инструкции: '+r.id);
  return {id:r.id,name:r.name.trim(),type:r.type.trim(),time:r.time,equipment:[...new Set(r.equipment)],ing:{...r.ing},steps:r.steps.map(s=>s.trim())};
 });
}
export async function loadRecipeCatalog(config,storage,fetcher=(...args)=>fetch(...args)){
 if(config.authProvider!=='cloudflare')return {loaded:0};
 const key='edish-catalog-v1';let list=[];
 try{const saved=storage.getItem(key);if(saved)list=validateRecipes(JSON.parse(saved))}catch{}
 try{
  const response=await fetcher(config.apiBase+'/catalog',{signal:AbortSignal.timeout(4000)});
  if(response.ok){list=validateRecipes((await response.json()).recipes);try{storage.setItem(key,JSON.stringify(list))}catch{}}
 }catch{}
 const existing=new Set(RECIPES.map(r=>r.id));
 for(const item of list)if(!existing.has(item.id)){RECIPES.push(item);existing.add(item.id)}
 return {loaded:list.length};
}
