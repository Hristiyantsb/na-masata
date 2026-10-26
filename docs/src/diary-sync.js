/**
 * Offline-first, per-user diary sync.
 * Security: guest/previous-account entries are NEVER silently attached to a
 * new account. Explicit adoptLocal() is required before uploading them.
 */
const prefix = 'na-masa-diary-pending:';
const ownerKey = 'na-masa-diary-owner-v1';
export function createDiarySync(storage, request, notify = () => {}) {
  let userId = null, queue = new Map(), snapshot = new Map();
  let flushing = false, timer = null, seq = 0, retryDelay = 1000;
  let enabled = false, needsImport = false, remoteEntries = [], lastStatus = 'idle';
  const safeRead = key => {try {return storage?.getItem(key)||'';} catch{return '';}};
  const safeWrite = (key,value) => {try {storage?.setItem(key,value);} catch{}};
  const save = () => {if(userId) safeWrite(prefix+userId,JSON.stringify([...queue.values()]));};
  const emit = status => {lastStatus=status;notify({status,pending:queue.size,needsImport});};
  const schedule = (delay=150) => {
    clearTimeout(timer);
    if(enabled && userId && queue.size)timer=setTimeout(flush,delay);
  };
  const enqueue = (id,value) => {
    queue.set(id,{id,value});
    save();emit('pending');schedule();
  };
  async function readRemote() {
    const entries=[],seen=new Set();
    let after='',pages=0;
    do {
      const result=await request('/diary'+(after?'?after='+encodeURIComponent(after):''));
      if(!Array.isArray(result.items))throw Error('Invalid diary response');
      for(const item of result.items)if(item && !seen.has(item.id)){
        seen.add(item.id);entries.push(item);
      }
      const next=typeof result.nextCursor==='string'?result.nextCursor:'';
      if(next && next===after)throw Error('Invalid diary cursor');
      after=next;
      if(++pages>150)throw Error('Diary page limit exceeded');
    } while(after);
    return entries;
  }
  async function flush() {
    if(flushing || !enabled || !userId || !queue.size)return;
    flushing=true;const current=seq;
    try {
      for(const [id,op] of queue) {
        if(current!==seq || !enabled)return;
        if(op.value===null)await request('/diary/'+encodeURIComponent(id),{method:'DELETE'});
        else await request('/diary/'+encodeURIComponent(id),{method:'PUT',body:op.value});
        if(current!==seq)return;
        if(queue.get(id)===op){queue.delete(id);save();}
      }
      retryDelay=1000;emit('saved');
    } catch {
      retryDelay=Math.min(60000,retryDelay*2);
      emit('offline');
    } finally {flushing=false;}
    if(current===seq && queue.size)schedule(retryDelay);
  }
  function track(entries) {
    if(!enabled || !userId)return;
    const current=new Map(entries.map(e=>[e.id,JSON.stringify(e)]));
    for(const [id,json] of current)if(snapshot.get(id)!==json)enqueue(id,JSON.parse(json));
    for(const id of snapshot.keys())if(!current.has(id))enqueue(id,null);
    snapshot=current;
  }
  async function start(id,getLocal,applyRemote) {
    if(!id)return;
    stop();
    userId=id;const current=seq;
    try {
      const saved=JSON.parse(safeRead(prefix+id)||'[]');
      if(Array.isArray(saved))for(const op of saved)
        if(op && typeof op.id==='string' && (op.value===null || op.value?.id===op.id))
          queue.set(op.id,op);
    } catch {}
    const local=getLocal();
    snapshot=new Map(local.map(e=>[e.id,JSON.stringify(e)]));
    emit('connecting');
    try {
      const remote=await readRemote();
      if(current!==seq)return;
      remoteEntries=remote;
      const owner=safeRead(ownerKey);
      const missingLocal=local.filter(entry=>!remote.some(cloud=>cloud.id===entry.id));
      if(missingLocal.length){
        // Preserve guest entries even before the person decides whether to import.
        const key='na-masa-presync-backup:'+id;
        if(!safeRead(key))safeWrite(key,JSON.stringify(local));
      }
      // Data created as guest or under another account requires explicit consent.
      if(local.length && owner!==id){
        needsImport=true;
        enabled=false;
        emit(owner ? 'account_mismatch' : 'needs_import');
        return;
      }
      safeWrite(ownerKey,id);
      enabled=true;needsImport=false;
      // For an already associated account, recover edits missing from the remote.
      // Never do this for guest/other-account entries without consent above.
      for(const item of missingLocal)if(!queue.has(item.id))
        queue.set(item.id,{id:item.id,value:item});
      const merged=new Map(remote.map(e=>[e.id,e]));
      for(const [key,op] of queue)if(op.value===null)merged.delete(key);
        else merged.set(key,op.value);
      if(remote.length || queue.size){
        const synced=[...merged.values()];
        applyRemote(synced);
        snapshot=new Map(synced.map(e=>[e.id,JSON.stringify(e)]));
      } else if(local.length){
        // Only previously bound records may be re-uploaded when a server is empty.
        for(const e of local)if(!queue.has(e.id))queue.set(e.id,{id:e.id,value:e});
      }
      save();emit(queue.size?'pending':'saved');schedule();
    } catch {
      if(current===seq){
        // An already bound user's offline edits still enter the scoped retry queue.
        // Never enable uploads of unclaimed guest / other-account data.
        if(safeRead(ownerKey)===id)enabled=true;
        emit('offline');
      }
    }
  }
  /**
   * Requires a deliberate user click and confirmation in the UI.
   * Preserves server records while importing local entries; local IDs win.
   */
  function adoptLocal(entries,applyRemote) {
    if(!userId || !needsImport)throw Error('Няма локални записи за импортиране.');
    const remote=new Map(remoteEntries.map(e=>[e.id,e]));
    for(const [id,op] of queue)if(op.value===null)remote.delete(id);
      else remote.set(id,op.value);
    for(const e of entries){
      remote.set(e.id,e);
      queue.set(e.id,{id:e.id,value:e});
    }
    enabled=true;needsImport=false;safeWrite(ownerKey,userId);
    const merged=[...remote.values()];
    snapshot=new Map(merged.map(e=>[e.id,JSON.stringify(e)]));
    applyRemote(merged);
    save();emit(queue.size?'pending':'saved');schedule();
  }
  function stop() {
    seq++;clearTimeout(timer);timer=null;
    userId=null;enabled=false;needsImport=false;flushing=false;
    queue.clear();snapshot.clear();remoteEntries=[];
    emit('idle');
  }
  return {start,stop,track,flush,adoptLocal,status:()=>({
    connected:!!userId,enabled,needsImport,pending:queue.size,status:lastStatus
  })};
}
