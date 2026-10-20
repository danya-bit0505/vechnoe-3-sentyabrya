// Общие мелочи: время, склонения, хранилище, тосты, копирование.
(() => {
  const C = window.SEP3_CONFIG || {};

  // Проверка режимов без ожидания нужной даты: #sep2, #sep3, #aug29 в адресе.
  const SIM = { sep2: [8, 2, 21, 40], sep3: [8, 3, 12, 0], aug29: [7, 29, 12, 0] }[location.hash.slice(1)];
  const t0 = Date.now();
  const simStart = SIM ? new Date(new Date().getFullYear(), SIM[0], SIM[1], SIM[2], SIM[3]).getTime() : 0;
  const clock = () => SIM ? new Date(simStart + (Date.now() - t0)) : new Date();

  const siteUrl = C.siteUrl || (location.origin + location.pathname);

  function plural(n, a, b, c) {
    const m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return a;
    if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return b;
    return c;
  }
  const fmt = n => n.toLocaleString('ru-RU');

  const store = {
    get(k, d) { try { const v = localStorage.getItem('sep3:' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('sep3:' + k, JSON.stringify(v)); } catch (e) {} }
  };

  let toastTimer;
  function toast(msg, ms = 2200) {
    const t = document.getElementById('toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), ms);
  }

  async function copyText(text, okMsg) {
    const box = document.getElementById('copyfallback');
    try {
      await navigator.clipboard.writeText(text);
      if (okMsg) toast(okMsg);
      box.hidden = true;
      return true;
    } catch (e) {
      box.textContent = text; box.hidden = false;
      const r = document.createRange(); r.selectNodeContents(box);
      const s = getSelection(); s.removeAllRanges(); s.addRange(r);
      toast('Выделил текст, скопируйте вручную');
      return false;
    }
  }

  // Поделиться текстом: системное меню на телефоне, иначе копирование.
  async function shareText(text) {
    if (navigator.share) {
      try { await navigator.share({ text }); return; }
      catch (e) { if (e && e.name === 'AbortError') return; }
    }
    copyText(text, 'Скопировано, вставьте куда угодно');
  }

  window.Sep3 = {
    config: C, clock, siteUrl, plural, fmt, store, toast, copyText, shareText,
    WD: ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'],
    MONTHS: ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']
  };
})();
