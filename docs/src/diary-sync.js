/** Offline-first per-entry sync queue: serial writes, retry and replay on reconnect. */
const prefix='na-masa-diary-pending:';
export function createDiarySync(storage, request, notify = () => {}) {
  let userId = null, queue = new Map(), snapshot = new Map(), flushing = false, timer = null, seq = 0, retryDelay = 1000;
  const safeGet = key => { try { return storage?.getItem(key) || ''; } catch { return ''; } };
  const save = () => { try { if(userId)storage?.setItem(prefix+userId,JSON.stringify([...queue.values()])); } catch {} };
  const emit = status => notify({status,pending:queue.size});
  const schedule = (delay = 120) => { clearTimeout(timer);if(userId)timer=setTimeout(flush,delay); };
  const put = (id,value) => {queue.set(id,{id,value});save();emit('pending');schedule();};
  async function flush() {
    if(flushing || !userId || !queue.size)return;
    flushing=true;const current=seq;
    try {
      for(const [id,op] of queue) {
        if(current!==seq || !userId)return;
        if(op.value===null) await request('/diary/'+encodeURIComponent(id),{method:'DELETE'});
        else await request('/diary/'+encodeURIComponent(id),{method:'PUT',body:op.value});
        if(current!==seq)return;
        if(queue.get(id)===op){queue.delete(id);save();}
      }
      retryDelay=1000;emit('saved');
    } catch {
      emit('offline');
      retryDelay=Math.min(60000,retryDelay*2);
      schedule(retryDelay);
    } finally{flushing=false;}
    if(queue.size && current===seq) schedule(retryDelay);
  }
  function track(entries) {
    if(!userId)return;
    const current=new Map(entries.map(e=>[e.id,JSON.stringify(e)]));
    for(const [id,json] of current) if(snapshot.get(id)!==json)put(id,JSON.parse(json));
    for(const id of snapshot.keys())if(!current.has(id))put(id,null);
    snapshot=current;
  }
  async function start(id, getLocal, applyRemote) {
    if(!id)return;
    stop();
    userId=id;const current=seq;
    try {
      const pending=JSON.parse(safeGet(prefix+id) || '[]');
      if(Array.isArray(pending))for(const op of pending)if(op?.id && (op.value===null||op.value?.id===op.id))queue.set(op.id,op);
    }catch{}
    const local=getLocal();
    snapshot=new Map(local.map(e=>[e.id,JSON.stringify(e)]));
    try {
      const remote=await request('/diary');
      if(current!==seq)return;
      const items=Array.isArray(remote.items)?remote.items:[];
      if(items.length){
        const combined=new Map(items.map(e=>[e.id,e]));
        // Only queued offline edits override remote records; avoid blindly overwriting another device.
        for(const [id,op] of queue)if(op.value===null)combined.delete(id);else combined.set(id,op.value);
        const merged=[...combined.values()];
        applyRemote(merged);
        snapshot=new Map(merged.map(e=>[e.id,JSON.stringify(e)]));
      } else {
        // First cloud sync: upload local entries explicitly associated with this signed-in user.
        for(const e of local)if(!queue.has(e.id))queue.set(e.id,{id:e.id,value:e});
      }
      save();emit(queue.size?'pending':'saved');schedule();
    } catch {emit('offline');schedule(retryDelay);}
  }
  function stop() {seq++;clearTimeout(timer);timer=null;userId=null;queue.clear();snapshot.clear();}
  return {start,stop,track,flush,status:()=>({connected:!!userId,pending:queue.size})};
}
