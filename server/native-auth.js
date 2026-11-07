const encode = new TextEncoder();
const hex = bytes => Array.from(new Uint8Array(bytes), b=>b.toString(16).padStart(2,'0')).join('');
export const digest = async value => hex(await crypto.subtle.digest('SHA-256',encode.encode(value)));
const random = () => hex(crypto.getRandomValues(new Uint8Array(32)));
const now = () => Math.floor(Date.now()/1000);
export async function passwordHash(password,salt) {
 const key=await crypto.subtle.importKey('raw',encode.encode(password),'PBKDF2',false,['deriveBits']);
 return hex(await crypto.subtle.deriveBits({name:'PBKDF2',salt:encode.encode(salt),iterations:100000,hash:'SHA-256'},key,256));
}
function equal(a,b){if(a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0;}
function cookie(value,age){return `namasa_refresh=${value}; Path=/api/auth; HttpOnly; Secure; SameSite=Strict; Max-Age=${age}`;}
function refreshCookie(request){return request.headers.get('cookie')?.match(/(?:^|;\s*)namasa_refresh=([a-f0-9]{64})(?:;|$)/)?.[1];}
export async function nativeUser(request,env){
 const token=request.headers.get('Authorization')?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
 if(!token)return null;
 return env.DB.prepare('SELECT u.id,u.email FROM auth_sessions s JOIN auth_users u ON u.id=s.user_id WHERE s.access_hash=? AND s.access_expires>? AND s.refresh_expires>?').bind(await digest(token),now(),now()).first();
}
async function limited(env,key,max){
 const bucket=Math.floor(Date.now()/60000);
 const row=await env.DB.prepare('INSERT INTO rate_limits(key,bucket,count) VALUES(?,?,1) ON CONFLICT(key,bucket) DO UPDATE SET count=count+1 RETURNING count').bind(key,bucket).first();
 return row.count<=max;
}
export async function authRoute(request,env,path){
 const response=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}});
 if(!env.DB)return response({error:'unconfigured'},503);
 if(request.method!=='POST')return response({error:'method'},405);
 // Native sessions are same-origin only. Never trust a browser-supplied user id.
 if(request.headers.get('origin')!==new URL(request.url).origin)return response({error:'origin'},403);
 if(!(await limited(env,'auth-ip:'+(request.headers.get('CF-Connecting-IP')||'local'),20)))return response({error:'rate_limit'},429);
 if(path==='/auth/logout'){
  const token=refreshCookie(request);
  if(token)await env.DB.prepare('DELETE FROM auth_sessions WHERE refresh_hash=?').bind(await digest(token)).run();
  return response({ok:true},200,{'Set-Cookie':cookie('',0)});
 }
 let user,oldHash;
 if(path==='/auth/refresh'){
  const token=refreshCookie(request);if(!token)return response({error:'unauthenticated'},401);
  oldHash=await digest(token);
  // Consume the refresh token atomically; only one concurrent request can rotate it.
  const session=await env.DB.prepare('DELETE FROM auth_sessions WHERE refresh_hash=? AND refresh_expires>? RETURNING user_id').bind(oldHash,now()).first();
  if(!session)return response({error:'unauthenticated'},401);
  user=await env.DB.prepare('SELECT id,email FROM auth_users WHERE id=?').bind(session.user_id).first();
 }else if(['/auth/register','/auth/login'].includes(path)){
  if(!request.headers.get('content-type')?.startsWith('application/json'))return response({error:'content_type'},415);
  const raw=await request.text();if(raw.length>4096)return response({error:'too_large'},413);
  let body;try{body=JSON.parse(raw)}catch{return response({error:'invalid_json'},400)}
  const email=typeof body.email==='string'?body.email.trim().toLowerCase():'';
  const password=body.password;
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||typeof password!=='string'||password.length<12||password.length>128)return response({error:'invalid_credentials'},400);
  if(!(await limited(env,'auth-email:'+await digest(email),5)))return response({error:'rate_limit'},429);
  const existing=await env.DB.prepare('SELECT * FROM auth_users WHERE email=?').bind(email).first();
  if(path==='/auth/register'){
   if(existing)return response({error:'registration_unavailable'},409);
   const salt=random(),hash=await passwordHash(password,salt);user={id:crypto.randomUUID(),email};
   await env.DB.prepare('INSERT INTO auth_users(id,email,password_hash,salt,created_at) VALUES(?,?,?,?,?)').bind(user.id,email,hash,salt,now()).run();
  }else{
   const hash=await passwordHash(password,existing?.salt||'na-masa-dummy-password-salt');
   if(!existing||!equal(hash,existing.password_hash))return response({error:'invalid_credentials'},401);
   user={id:existing.id,email:existing.email};
  }
 }else return response({error:'not_found'},404);
 if(!user)return response({error:'unauthenticated'},401);
 const access=random(),refresh=random();
 await env.DB.prepare('INSERT INTO auth_sessions(refresh_hash,access_hash,user_id,access_expires,refresh_expires) VALUES(?,?,?,?,?)').bind(await digest(refresh),await digest(access),user.id,now()+900,now()+2592000).run();
 return response({access_token:access,expires_in:900,user},200,{'Set-Cookie':cookie(refresh,2592000)});
}
