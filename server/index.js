import { validateRecipes } from '../docs/src/recipe-catalog.js';
import api from './worker.js';
import { authRoute } from './native-auth.js';
/** Workers Static Assets and D1 share one origin; GitHub Pages remains an offline preview. */
export default {
 async fetch(request,env,ctx){
  const url=new URL(request.url);
  const runtime={...env,AUTH_PROVIDER:'cloudflare',APP_ORIGIN:url.origin,APP_URL:url.origin+'/'};
  if(url.pathname==='/src/config.js')return new Response(`export const CONFIG=Object.freeze(${JSON.stringify({version:'0.8.0',mode:'cloudflare',authProvider:'cloudflare',apiBase:'/api',supportEmail:env.SUPPORT_EMAIL||'',sourceUrl:'https://github.com/Hristiyantsb/na-masata'})});`,{headers:{'Content-Type':'text/javascript','Cache-Control':'no-store'}});
  if(url.pathname.startsWith('/api/')){
   const pathname=url.pathname.slice(4);
   if(pathname==='/catalog' && request.method==='GET') {
    if(!env.DB)return Response.json({error:'unconfigured'},{status:503});
    try {
     const rows=await env.DB.prepare('SELECT payload FROM recipe_catalog ORDER BY id LIMIT 1001').all();
     const recipes=validateRecipes(rows.results.map(r=>JSON.parse(r.payload)));
     return Response.json({recipes},{headers:{'Cache-Control':'public, max-age=300'}});
    }catch{return Response.json({error:'catalog_unavailable'},{status:503})}
   }
   if(pathname.startsWith('/auth/')){
    try{return await authRoute(request,runtime,pathname)}catch{return Response.json({error:'service_unavailable'},{status:503,headers:{'Cache-Control':'no-store'}})}
   }
   url.pathname=pathname;
   return api.fetch(new Request(url,request),runtime,ctx);
  }
  return env.ASSETS.fetch(request);
 },
 async scheduled(event,env,ctx){
  await api.scheduled(event,env,ctx);
  if(env.DB)await env.DB.prepare('DELETE FROM auth_sessions WHERE refresh_expires<?').bind(Math.floor(Date.now()/1000)).run();
 }
};
