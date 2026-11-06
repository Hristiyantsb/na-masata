/** Same-origin Cloudflare session: access in memory, refresh in an HttpOnly cookie. */
export function createNativeAuth(config,fetcher=(...args)=>fetch(...args)){
 let session=null,refreshing=null,generation=0;
 const configured=()=>Boolean(config.apiBase);
 async function call(path,body){
  const r=await fetcher(config.apiBase.replace(/\/$/,'')+'/auth/'+path,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(body||{}),signal:AbortSignal.timeout(15000)});
  const data=await r.json();
  if(!r.ok){const e=Error(r.status===429?'Изчакай минута и опитай отново.':r.status===409?'Този адрес вече има акаунт. Използвай „Вход“.':'Неуспешен вход. Провери имейла и паролата.');e.status=r.status;throw e;}
  return data;
 }
 function accept(data){if(!data.access_token||!data.user?.id||!Number.isFinite(data.expires_in))throw Error('Невалиден отговор.');session={...data,expires:Date.now()+data.expires_in*1000};return session.user;}
 async function restore(){
  if(!configured())return null;if(session&&session.expires>Date.now()+60000)return session.user;
  if(!refreshing){const current=generation;refreshing=call('refresh').then(data=>current===generation?accept(data):null).catch(e=>{if(current===generation&&e.status===401)session=null;return null}).finally(()=>{refreshing=null});}
  return refreshing;
 }
 async function login(email,password,register=false){const current=++generation;const data=await call(register?'register':'login',{email,password});if(current!==generation)return null;return accept(data);}
 async function token(){await restore();return session&&session.expires>Date.now()?session.access_token:null;}
 async function signOut(){generation++;session=null;await call('logout');}
 return {native:true,configured,user:()=>session?.user||null,restore,token,login,signOut,completeAppleSignIn:async()=>null};
}
