/** Supabase GoTrue: persisted refresh session, email OTP and Apple OAuth (web PKCE). */
const SESSION_KEY = 'na-masa-auth-session-v1';
const APPLE_FLOW_KEY = 'na-masa-apple-pkce-v1';
const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
export function createAuth(config, fetcher = (...args) => fetch(...args), storage = globalThis.localStorage) {
  let session = null, refreshing = null, restoring = null, generation = 0, lastEmailAt = 0;
  const configured = () => Boolean(config.supabaseUrl && config.supabasePublicKey);
  const safeRead = (key) => { try { return storage?.getItem(key) || null; } catch { return null; } };
  const safeWrite = (key, value) => { try { if(value) storage?.setItem(key,value); else storage?.removeItem(key); } catch {} };
  async function call(path, body, token, method = 'POST') {
    if (!configured()) throw Error('Входът още не е активиран.');
    const base = new URL(config.supabaseUrl);
    if(base.protocol !== 'https:') throw Error('Невалидна конфигурация за вход.');
    const r = await fetcher(new URL('/auth/v1/' + path, base), {
      method, headers: { apikey:config.supabasePublicKey, ...(body ? {'Content-Type':'application/json'} : {}), ...(token ? {Authorization:'Bearer '+token} : {}) },
      body: body ? JSON.stringify(body) : undefined,
      signal:AbortSignal.timeout(12000), credentials:'omit',
    });
    const data = r.status === 204 ? {} : await r.json().catch(()=>({}));
    if (!r.ok) {
      const error = Error(r.status === 429 ? 'Изчакай малко, преди да опиташ отново.' : 'Входът не успя. Провери данните и опитай пак.');
      error.status = r.status;
      throw error;
    }
    return data;
  }
  function clear() {session = null; safeWrite(SESSION_KEY,null);}
  function accept(data) {
    if (!data.access_token || !data.refresh_token || !data.user?.id || !Number.isFinite(data.expires_in))
      throw Error('Невалиден отговор при вход.');
    session = { ...data, expires_at: Date.now()/1000 + data.expires_in };
    // Only refresh credentials and minimal identity are persisted; access token remains in memory.
    safeWrite(SESSION_KEY, JSON.stringify({refresh_token:data.refresh_token,user:{id:data.user.id,email:data.user.email||''}}));
  }
  async function restore() {
    if (session) return session.user;
    if (restoring) return restoring;
    const saved = safeRead(SESSION_KEY);
    if (!saved || !configured()) return null;
    const current = generation;
    restoring = (async()=>{
      let parsed;
      try { parsed=JSON.parse(saved);if(typeof parsed.refresh_token !== 'string' || !parsed.refresh_token) throw Error('invalid'); }
      catch { safeWrite(SESSION_KEY,null);return null; }
      try {
        const data=await call('token?grant_type=refresh_token',{refresh_token:parsed.refresh_token});
        if(current !== generation)return null;
        accept(data);return session.user;
      } catch(e) {if(current===generation && [400,401,403].includes(e.status)) clear();return null;}
    })().finally(()=>{restoring=null;});
    return restoring;
  }
  async function token() {
    if(!session) await restore();
    if(!session)return null;
    if(session.expires_at > Date.now()/1000 + 60)return session.access_token;
    if(!refreshing){
      const current=generation;
      refreshing=call('token?grant_type=refresh_token',{refresh_token:session.refresh_token})
        .then(data=>{if(current!==generation)return null;accept(data);return session.access_token;})
        .catch(error=>{if(current===generation && [400,401,403].includes(error.status))clear();throw error;})
        .finally(()=>{refreshing=null;});
    }
    return refreshing;
  }
  async function sendCode(email) {
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)throw Error('Провери имейл адреса.');
    if(Date.now()-lastEmailAt<60000)throw Error('Изчакай една минута, преди да поискаш нов код.');
    lastEmailAt=Date.now();await call('otp',{email,create_user:true});
  }
  async function verify(email,code) {
    if(!/^\d{6,10}$/.test(code))throw Error('Въведи кода от имейла.');
    const current=++generation;
    const data=await call('verify',{email,token:code,type:'email'});
    if(current!==generation)throw Error('Входът е прекратен.');
    accept(data);return session.user;
  }
  async function appleSignIn(location = globalThis.location, browserStorage = globalThis.sessionStorage) {
    if(!configured())throw Error('Активирай Supabase и Apple Provider, за да използваш вход с Apple.');
    if(!location || !browserStorage || !globalThis.crypto?.subtle)throw Error('Този браузър не поддържа вход с Apple.');
    const verifier=b64url(crypto.getRandomValues(new Uint8Array(32)));
    const challenge=b64url(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier)));
    const nonce=b64url(crypto.getRandomValues(new Uint8Array(16)));
    browserStorage.setItem(APPLE_FLOW_KEY,JSON.stringify({nonce,verifier,created:Date.now()}));
    const redirect=new URL(location.href);
    redirect.hash='';redirect.search='';redirect.searchParams.set('auth_return',nonce);
    const url=new URL('/auth/v1/authorize',config.supabaseUrl);
    url.searchParams.set('provider','apple');url.searchParams.set('redirect_to',redirect.href);
    url.searchParams.set('code_challenge',challenge);url.searchParams.set('code_challenge_method','s256');
    location.assign(url.href);
  }
  async function completeAppleSignIn(location = globalThis.location, browserStorage = globalThis.sessionStorage, history = globalThis.history) {
    const url=new URL(location.href);
    const nonce=url.searchParams.get('auth_return'),code=url.searchParams.get('code');
    if(!nonce)return null;
    const saved=browserStorage?.getItem(APPLE_FLOW_KEY);
    browserStorage?.removeItem(APPLE_FLOW_KEY);
    url.searchParams.delete('auth_return');url.searchParams.delete('code');
    url.searchParams.delete('error');url.searchParams.delete('error_description');
    history?.replaceState?.(null,'',url.pathname+(url.search||'')+(url.hash||''));
    let flow;
    try{flow=JSON.parse(saved);}catch{throw Error('Неуспешен вход с Apple. Опитай отново.');}
    if(flow.nonce!==nonce || Date.now()-flow.created>600000 || !flow.verifier)
      throw Error('Изтекъл или невалиден вход с Apple.');
    if(!code)throw Error('Входът с Apple беше прекратен.');
    const current=++generation;
    const data=await call('token?grant_type=pkce',{auth_code:code,code_verifier:flow.verifier});
    if(current!==generation)throw Error('Входът е прекратен.');
    accept(data);return session.user;
  }
  async function signOut() {
    const tokenToRevoke=session?.access_token;
    generation++;clear();
    if(tokenToRevoke)await call('logout?scope=local',null,tokenToRevoke);
  }
  return {configured,user:()=>session?.user||null,sendCode,verify,token,restore,appleSignIn,completeAppleSignIn,signOut};
}
