import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { authRoute, nativeUser, passwordHash } from '../server/native-auth.js';
import worker from '../server/index.js';
function setup(){
 const sql=new DatabaseSync(':memory:');sql.exec(readFileSync('server/migration.sql','utf8'));sql.exec(readFileSync('server/migration-auth.sql','utf8'));
 const DB={prepare(query){let args=[];return {bind(...values){args=values;return this},async first(){return sql.prepare(query).get(...args)||null},async run(){const r=sql.prepare(query).run(...args);return {success:true,meta:{changes:r.changes}}},async all(){return {results:sql.prepare(query).all(...args)}}}},async batch(items){return Promise.all(items.map(i=>i.run()))}};
 const env={DB};let ip=0;
 const req=(path,body={},cookie='',origin='https://edish.example')=>new Request('https://edish.example/api'+path,{method:'POST',headers:{origin,'content-type':'application/json','CF-Connecting-IP':'192.0.2.'+(++ip),cookie},body:JSON.stringify(body)});
 const register=async(email)=>{const response=await authRoute(req('/auth/register',{email,password:'correct horse battery staple'}),env,'/auth/register');assert.equal(response.status,200);return {data:await response.json(),cookie:response.headers.get('set-cookie').split(';')[0]}};
 return {sql,DB,env,req,register};
}
test('native identity stores hashes, rejects bad passwords and isolates users',async()=>{
 const {sql,env,req,register}=setup();const a=await register('one@example.com'),b=await register('two@example.com');
 assert.notEqual(a.data.user.id,b.data.user.id);
 const stored=sql.prepare('SELECT * FROM auth_users WHERE id=?').get(a.data.user.id);
 assert.notEqual(stored.password_hash,'correct horse battery staple');assert.equal(stored.password_hash.length,64);
 const session=sql.prepare('SELECT * FROM auth_sessions WHERE user_id=?').get(a.data.user.id);assert.notEqual(session.access_hash,a.data.access_token);
 const user=await nativeUser(new Request('https://edish.example/api/diary',{headers:{Authorization:'Bearer '+a.data.access_token}}),env);assert.equal(user.id,a.data.user.id);
 const bad=await authRoute(req('/auth/login',{email:'one@example.com',password:'wrong password 123'}),env,'/auth/login');assert.equal(bad.status,401);
 assert.equal(await nativeUser(new Request('https://edish.example/api/diary',{headers:{Authorization:'Bearer '+ 'a'.repeat(64)}}),env),null);
 sql.close();
});
test('refresh is single use and logout revokes both credentials',async()=>{
 const {sql,env,req,register}=setup();const a=await register('refresh@example.com');
 const refresh=await authRoute(req('/auth/refresh',{},a.cookie),env,'/auth/refresh');assert.equal(refresh.status,200);const data=await refresh.json();
 assert.match(refresh.headers.get('set-cookie'),/HttpOnly; Secure; SameSite=Strict/);
 assert.equal((await authRoute(req('/auth/refresh',{},a.cookie),env,'/auth/refresh')).status,401);
 assert.equal(await nativeUser(new Request('https://edish.example/api/diary',{headers:{Authorization:'Bearer '+a.data.access_token}}),env),null);
 const next=refresh.headers.get('set-cookie').split(';')[0];const logout=await authRoute(req('/auth/logout',{},next),env,'/auth/logout');assert.equal(logout.status,200);
 assert.equal(await nativeUser(new Request('https://edish.example/api/diary',{headers:{Authorization:'Bearer '+data.access_token}}),env),null);
 sql.close();
});
test('auth rejects foreign origins, short passwords, expiry and excessive attempts',async()=>{
 const {sql,env,req,register}=setup();const body={email:'rate@example.com',password:'long password 12345'};
 assert.equal((await authRoute(req('/auth/register',body,'','https://evil.example'),env,'/auth/register')).status,403);
 assert.equal((await authRoute(req('/auth/register',{...body,password:'short'}),env,'/auth/register')).status,400);
 for(let i=0;i<5;i++)assert.equal((await authRoute(req('/auth/login',body),env,'/auth/login')).status,401);
 assert.equal((await authRoute(req('/auth/login',body),env,'/auth/login')).status,429);
 const a=await register('expired@example.com');sql.exec('UPDATE auth_sessions SET access_expires=0,refresh_expires=0');
 assert.equal((await authRoute(req('/auth/refresh',{},a.cookie),env,'/auth/refresh')).status,401);
 sql.close();
});
test('Cloudflare entrypoint serves static assets and native public config without secrets',async()=>{
 const {sql,env}=setup();env.ASSETS={fetch:async()=>new Response('asset')};
 assert.equal(await (await worker.fetch(new Request('https://edish.example/'),env,{})).text(),'asset');
 const config=await worker.fetch(new Request('https://edish.example/src/config.js'),env,{});const source=await config.text();assert.match(source,/cloudflare/);assert.match(source,/\/api/);assert.doesNotMatch(source,/SUPABASE|password_hash/);
 const health=await worker.fetch(new Request('https://edish.example/api/health'),env,{});assert.equal((await health.json()).authConfigured,true);
 const privateRoute=await worker.fetch(new Request('https://edish.example/api/diary'),env,{});assert.equal(privateRoute.status,401);
 sql.close();
});
test('password salt produces distinct hashes',async()=>{assert.notEqual(await passwordHash('long password 12345','one'),await passwordHash('long password 12345','two'))});
