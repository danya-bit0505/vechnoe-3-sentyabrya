// Общий счётчик листов через Supabase (необязательно).
// Отрывы копятся пачкой и уходят одним запросом раз в пару секунд.
(() => {
  const { config: C, store } = window.Sep3;
  const enabled = !!(C.supabaseUrl && C.supabaseAnonKey);
  const base = (C.supabaseUrl || '').replace(/\/+$/, '');
  const headers = {
    apikey: C.supabaseAnonKey,
    Authorization: 'Bearer ' + C.supabaseAnonKey,
    'Content-Type': 'application/json'
  };
  const MAX_BATCH = 200; // столько же режет функция на сервере

  let total = null;
  let pending = enabled ? store.get('pending', 0) : 0;
  let flushing = false, timer = null;
  const listeners = [];

  const emit = () => listeners.forEach(f => f(total === null ? null : total + pending));
  const savePending = () => store.set('pending', pending);

  async function fetchTotal() {
    try {
      const r = await fetch(`${base}/rest/v1/tally?id=eq.1&select=total`, { headers });
      if (!r.ok) return;
      const j = await r.json();
      const v = Number(j && j[0] && j[0].total);
      if (Number.isFinite(v)) { total = v; emit(); }
    } catch (e) {}
  }

  async function flush() {
    if (flushing || pending <= 0) return;
    flushing = true;
    const delta = Math.min(pending, MAX_BATCH);
    try {
      const r = await fetch(`${base}/rest/v1/rpc/add_sheets`, {
        method: 'POST', headers, body: JSON.stringify({ delta })
      });
      if (r.ok) {
        pending -= delta; savePending();
        const v = Number(await r.json());
        if (Number.isFinite(v)) total = v;
        emit();
      }
    } catch (e) {}
    flushing = false;
    if (pending > 0) schedule(4000);
  }

  function schedule(ms = 2000) {
    clearTimeout(timer);
    timer = setTimeout(flush, ms);
  }

  function add(n = 1) {
    if (!enabled) return;
    pending += n; savePending();
    emit();
    schedule();
  }

  if (enabled) {
    fetchTotal().then(flush);
    setInterval(() => { if (!document.hidden) fetchTotal(); }, 20000);
    // уходим со страницы — отправляем остаток, не дожидаясь таймера
    addEventListener('pagehide', () => {
      if (pending <= 0 || flushing) return;
      const delta = Math.min(pending, MAX_BATCH);
      pending -= delta; savePending();
      try {
        fetch(`${base}/rest/v1/rpc/add_sheets`, { method: 'POST', headers, body: JSON.stringify({ delta }), keepalive: true });
      } catch (e) {}
    });
  }

  window.Sep3.counter = { enabled, add, onChange: f => { listeners.push(f); f(total === null ? null : total + pending); } };
})();
