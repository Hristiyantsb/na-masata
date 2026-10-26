import { diaryEntry } from '../docs/src/domain.js';
/** Authenticated, per-user diary rows. Each mutation is idempotent and cannot affect another user. */
export async function diaryRoute(request, env, userId, respond, pathname) {
  if (request.method === 'GET' && pathname === '/diary') {
    const rows = await env.DB.prepare('SELECT payload FROM user_diary WHERE user_id=? ORDER BY id').bind(userId).all();
    return respond({ items:(rows.results || []).map(row => JSON.parse(row.payload)) });
  }
  const match = /^\/diary\/([a-f\d-]{36})$/i.exec(pathname);
  if(!match)return respond({error:'not_found'},404);
  const id=match[1];
  if(request.method==='DELETE'){
    await env.DB.prepare('DELETE FROM user_diary WHERE user_id=? AND id=?').bind(userId,id).run();
    return respond({id});
  }
  if(request.method!=='PUT')return respond({error:'method'},405);
  let entry;
  try {
    if(Number(request.headers.get('content-length'))>16384)throw Error('large');
    const content=await request.text();
    if(content.length>16384)throw Error('large');
    const raw=JSON.parse(content);
    if(!raw || raw.id!==id)throw Error('id');
    entry=diaryEntry(raw);
  } catch {return respond({error:'invalid_diary_entry'},400);}
  // D1 enforces one record for one user, and the same id is safe to retry after a network failure.
  await env.DB.prepare('INSERT INTO user_diary(user_id,id,payload,updated_at) VALUES(?,?,?,?) ON CONFLICT(user_id,id) DO UPDATE SET payload=excluded.payload,updated_at=excluded.updated_at')
    .bind(userId,id,JSON.stringify(entry),new Date().toISOString()).run();
  return respond({id,entry});
}
