import { normalizeState } from '../docs/src/domain.js';
export const MAX_CLOUD_BYTES = 1500000;
/** Dedicated table, always scoped by the verified server-side user ID. CAS prevents lost updates. */
export async function cloudRoute(request, env, userId, respond) {
  if (request.method === 'GET') {
    const row = await env.DB.prepare(
      'SELECT revision,payload,updated_at FROM user_backups WHERE user_id=?',
    )
      .bind(userId)
      .first();
    return respond({
      revision: row?.revision || null,
      updatedAt: row?.updated_at || null,
      state: row?.payload ? JSON.parse(row.payload) : null,
    });
  }
  if (request.method !== 'POST') return respond({ error: 'method' }, 405);
  let value;
  try {
    if (Number(request.headers.get('content-length')) > MAX_CLOUD_BYTES)
      return respond({ error: 'too_large' }, 413);
    const text = await request.text();
    if (new TextEncoder().encode(text).length > MAX_CLOUD_BYTES)
      return respond({ error: 'too_large' }, 413);
    value = JSON.parse(text);
    if (
      value.revision !== null &&
      (typeof value.revision !== 'string' || !/^[\da-f-]{36}$/i.test(value.revision))
    )
      throw Error('revision');
    if (value.state !== null) value.state = normalizeState(value.state);
  } catch {
    return respond({ error: 'invalid_backup' }, 400);
  }
  const revision = crypto.randomUUID(),
    updatedAt = new Date().toISOString();
  const result = await env.DB.prepare(
    `INSERT INTO user_backups(user_id,revision,payload,updated_at) SELECT ?,?,?,? WHERE ? IS NULL OR EXISTS (SELECT 1 FROM user_backups WHERE user_id=? AND revision=?) ON CONFLICT(user_id) DO UPDATE SET revision=excluded.revision,payload=excluded.payload,updated_at=excluded.updated_at WHERE user_backups.revision=?`,
  )
    .bind(
      userId,
      revision,
      value.state === null ? null : JSON.stringify(value.state),
      updatedAt,
      value.revision,
      userId,
      value.revision,
      value.revision,
    )
    .run();
  if (result.meta?.changes !== 1) return respond({ error: 'backup_conflict' }, 409);
  return respond({ revision, updatedAt });
}
