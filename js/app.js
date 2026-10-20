// Календарь: отрыв листов, звук, серия, режимы по реальной дате.
(() => {
  const { clock, plural, fmt, store, toast, copyText, shareText, siteUrl, WD, MONTHS, counter } = window.Sep3;
  const now = clock();
  const Y = now.getFullYear();
  const base = new Date(Y, 8, 3).getDay();
  const leap = (Y % 4 === 0 && Y % 100 !== 0) || Y % 400 === 0;
  const doy = Math.round((new Date(Y, 8, 3) - new Date(Y, 0, 0)) / 864e5);
  const left = (leap ? 366 : 365) - doy;

  const FACTS = [
    n => `<b>Сегодня в истории.</b> Ровно день назад тоже было 3 сентября.`,
    n => `<b>Народная примета.</b> Перевернул календарь — жди 3 сентября.`,
    n => `<b>Прогноз.</b> Завтра 3 сентября, местами 3 сентября, к вечеру без изменений.`,
    n => `<b>Именины</b> у всех, кто дочитал этот лист до конца.`,
    n => `<b>Справка.</b> В блоке 365 листов. Вы оторвали ${n}. Осталось 365.`,
    n => `<b>Учёные</b> по-прежнему не могут найти 4 сентября. Поиски продолжаются.`,
    n => `<b>Гороскоп.</b> Всем знакам: повторение пройденного.`,
    n => `<b>Кулинария.</b> Разогрейте то, что готовили вчера, 3 сентября.`,
    n => `<b>Школьникам.</b> Учебный год идёт третий день. В ${n}-й раз.`,
    n => `<b>Сентябрь</b> длится 30 дней. Этот — на ваше усмотрение.`,
    n => `<b>ОТК.</b> Листы проверены. Все одинаковые. Так и задумано.`,
    n => `<b>Здоровье.</b> Долгота дня не меняется ${n} дн. подряд. Режим сна идеальный.`,
    n => `<b>Хозяйке на заметку.</b> Оторванные листы годятся на растопку. Их будет много.`,
    n => `<b>Дачникам.</b> Пора убирать урожай. Пора убирать урожай. Пора убирать урожай.`,
    n => `<b>Ночью</b> кто-то подклеил обратно все листы. Подозреваемых нет.`,
    n => `<b>Бухгалтерии.</b> Закрыть месяц невозможно: он не заканчивается.`,
    n => `<b>Вопрос дня.</b> Когда же 2 сентября? Ответ на обороте. На обороте тоже 3-е.`,
    n => `<b>Календарь</b> ничего вам не обещал. Он просто висит.`,
    n => `<b>Астрономия.</b> Земля сделала полный оборот вокруг оси. Календарь тоже.`,
    n => `<b>Типография</b> приносит извинения за то, что ни о чём не жалеет.`
  ];
  const MILESTONES = [
    [1, 'Первый лист'], [3, 'Третье третье'], [7, 'Неделя третьих'],
    [30, 'Месяц третьих'], [100, 'Сотня'], [365, 'Год прошёл'], [1000, 'Тысяча третьих']
  ];
  const SERIES_GOAL = 100;      // столько подряд — и календарь падает со стены
  const SERIES_GAP = 1200;      // мс между отрывами, чтобы серия не прервалась

  const $ = id => document.getElementById(id);
  const sheet = $('sheet'), block = $('block'), floor = $('floor'), hang = $('hang'), board = $('board');

  let torn = store.get('torn', 0);
  let pos = store.get('pos', 0);
  let pile = store.get('pile', 0);
  let sound = store.get('sound', true);
  let fellOff = store.get('fell', false);
  let locked = false;
  let streak = 0, lastTearAt = 0, streakTimer;

  // режимы по реальной дате
  const isSep2 = now.getMonth() === 8 && now.getDate() === 2;
  let preMode = isSep2;          // в последний день лета первый лист — «2»

  const wdOf = p => ((base + p) % 7 + 7) % 7;
  function sheetHTML(p, n, o = {}) {
    const w = o.w ?? wdOf(p), sun = w === 0 ? ' sunday' : '';
    const fact = o.fact ?? FACTS[((n % FACTS.length) + FACTS.length) % FACTS.length](n);
    return `
      <div class="s-head"><span class="s-month">Сентябрь</span><span class="s-year">${Y}</span></div>
      <div class="num${sun}">${o.num ?? 3}</div>
      <div class="wd${sun}">${WD[w]}</div>
      <div class="sun"><span><b>Восход</b>${o.rise ?? '5.35'}</span><span><b>Заход</b>${o.set ?? '19.13'}</span><span><b>Долгота</b>${o.len ?? '13.38'}</span></div>
      <div class="fact">${fact}</div>
      <div class="s-foot"><span>${o.doy ?? doy}-й день года · до конца ${o.left ?? left}</span><span>${o.foot ?? 'Завтра: 3 сентября'}</span></div>`;
  }
  function preSheetHTML() {
    return sheetHTML(0, 0, {
      num: 2, w: new Date(Y, 8, 2).getDay(), rise: '5.33', set: '19.16', len: '13.43',
      doy: doy - 1, left: left + 1, foot: 'Завтра: 3 сентября. Навсегда.',
      fact: `<b>Последний день.</b> Оторвёте этот лист — и начнётся. Подумайте хорошенько.`
    });
  }

  function decorate(el) {
    el.classList.toggle('tired', torn >= 10);
    el.classList.toggle('yellow', torn >= 50);
    el.classList.toggle('stain', torn >= 100);
  }

  function renderSheet() {
    sheet.innerHTML = preMode ? preSheetHTML() : sheetHTML(pos, torn);
    sheet.classList.toggle('pre', preMode);
    decorate(sheet);
  }
  function renderStats() {
    $('torn').textContent = fmt(torn);
    renderChips();
    $('floorTitle').textContent = pile ? `На полу: ${fmt(pile)} ${plural(pile, 'лист', 'листа', 'листов')}` : 'На полу';
    $('floorEmpty').hidden = pile > 0;
    $('sound').textContent = 'Звук: ' + (sound ? 'вкл' : 'выкл');
    showGlobal();
  }
  function render() { renderSheet(); renderStats(); }

  function renderChips() {
    const list = MILESTONES.map(([n, t]) =>
      `<span class="chip${torn >= n ? ' on' : ''}">${t} <i>${n}</i></span>`);
    list.push(`<span class="chip${fellOff ? ' on' : ''}">Сорвал со стены <i>${SERIES_GOAL} подряд</i></span>`);
    $('chips').innerHTML = list.join('');
  }

  function tornEdge() {
    const pts = ['0 100%', '0 7px'];
    for (let x = 4; x < 100; x += 4) pts.push(`${x}% ${2 + Math.round(Math.random() * 8)}px`);
    pts.push('100% 6px', '100% 100%');
    return `polygon(${pts.join(',')})`;
  }

  function addMini(animate, num = 3, sunday = false) {
    const m = document.createElement('div');
    const w = floor.clientWidth || 380;
    m.className = 'mini' + (sunday ? ' sunday' : '');
    m.textContent = num;
    m.style.left = Math.round(Math.random() * (w - 44)) + 'px';
    m.style.top = Math.round(30 + Math.random() * 70) + 'px';
    m.style.transform = `rotate(${Math.round(Math.random() * 80 - 40)}deg)`;
    if (!animate) m.style.animation = 'none';
    floor.appendChild(m);
    const minis = floor.querySelectorAll('.mini');
    if (minis.length > 60) minis[0].remove();
  }

  // ---------- звук: бумага рвётся по перфорации ----------
  let ac, bufs = {};
  function audio() {
    if (!sound) return null;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === 'suspended') ac.resume();
      return ac;
    } catch (e) { return null; }
  }
  // дорожка «треска»: серия коротких щелчков (каждая дырочка перфорации) + волокнистый шорох
  function perfBuffer(a, dur, gapStart, gapEnd, bed) {
    const sr = a.sampleRate, len = Math.floor(sr * dur);
    const buf = a.createBuffer(1, len, sr), d = buf.getChannelData(0);
    let t = 0.003;
    while (t < dur - 0.004) {
      const prog = t / dur;
      const gap = gapStart + (gapEnd - gapStart) * prog;
      const i0 = Math.floor(t * sr);
      const L = Math.floor(sr * (0.0008 + Math.random() * 0.0022));
      const amp = (0.35 + Math.random() * 0.65) * (0.7 + 0.3 * Math.sin(prog * Math.PI));
      for (let k = 0; k < L && i0 + k < len; k++) d[i0 + k] += (Math.random() * 2 - 1) * amp * Math.exp(-k / (L * 0.28));
      if (Math.random() < 0.25) { // сдвоенный щелчок — волокно рвётся не сразу
        const j0 = i0 + Math.floor(sr * 0.0011);
        for (let k = 0; k < L && j0 + k < len; k++) d[j0 + k] += (Math.random() * 2 - 1) * amp * 0.5 * Math.exp(-k / (L * 0.25));
      }
      t += gap * (0.55 + Math.random() * 0.9);
    }
    for (let i = 0; i < len; i++) {
      const p = i / len;
      const env = Math.min(1, p / 0.06) * Math.pow(1 - p, 0.8);
      d[i] += (Math.random() * 2 - 1) * bed * env;
      if (Math.random() < 0.003) d[i] += (Math.random() * 2 - 1) * 0.45 * env;
    }
    return buf;
  }
  function play(buf, gain, rate = 1) {
    const a = ac;
    const src = a.createBufferSource(); src.buffer = buf; src.playbackRate.value = rate;
    const hp = a.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1400; hp.Q.value = .6;
    const pk = a.createBiquadFilter(); pk.type = 'peaking'; pk.frequency.value = 4800; pk.gain.value = 7; pk.Q.value = 1.1;
    const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 11000;
    const g = a.createGain(); g.gain.value = gain;
    src.connect(hp).connect(pk).connect(lp).connect(g).connect(a.destination);
    src.start();
  }
  function ripSound(fast) {
    const a = audio(); if (!a) return;
    try {
      const key = fast ? 'ripFast' : 'rip';
      bufs[key] = bufs[key] || (fast ? perfBuffer(a, 0.22, 0.007, 0.003, 0.06) : perfBuffer(a, 0.42, 0.013, 0.0045, 0.08));
      play(bufs[key], 0.7, 0.92 + Math.random() * 0.16);
    } catch (e) {}
  }
  function tickSound() {
    const a = audio(); if (!a) return;
    try {
      bufs.tick = bufs.tick || perfBuffer(a, 0.012, 0.004, 0.004, 0.0);
      play(bufs.tick, 0.55, 0.85 + Math.random() * 0.3);
    } catch (e) {}
  }
  function glueSound() {
    const a = audio(); if (!a) return;
    try {
      if (!bufs.glue) {
        const len = Math.floor(a.sampleRate * 0.22);
        bufs.glue = a.createBuffer(1, len, a.sampleRate);
        const d = bufs.glue.getChannelData(0);
        for (let i = 0; i < len; i++) { const p = i / len; d[i] = (Math.random() * 2 - 1) * Math.sin(p * Math.PI) * 0.25; }
      }
      const src = a.createBufferSource(); src.buffer = bufs.glue;
      const f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 3200; f.Q.value = .5;
      const g = a.createGain(); g.gain.value = .3;
      src.connect(f).connect(g).connect(a.destination); src.start();
    } catch (e) {}
  }

  function save() {
    store.set('torn', torn); store.set('pos', pos); store.set('pile', pile); store.set('fell', fellOff);
  }

  // ---------- отрыв ----------
  function makeClone() {
    const c = sheet.cloneNode(true);
    c.removeAttribute('id'); c.removeAttribute('role'); c.removeAttribute('tabindex'); c.removeAttribute('aria-label');
    c.classList.add('flying');
    c.style.top = sheet.offsetTop + 'px';
    return c;
  }
  function launch(clone, fromTransform) {
    const wasPre = clone.classList.contains('pre');
    const sunday = !!clone.querySelector('.num.sunday');
    clone.classList.remove('drag', 'settle');
    clone.style.clipPath = tornEdge();
    clone.style.setProperty('--from', fromTransform || 'none');
    clone.style.transform = '';
    clone.style.setProperty('--dx', Math.round(Math.random() * 120 - 40) + 'px');
    clone.style.setProperty('--rot', Math.round(Math.random() * 50 - 10) + 'deg');
    const tl = clone.querySelector('.tearline'); if (tl) tl.remove();
    if (!clone.isConnected) block.appendChild(clone);
    void clone.offsetWidth;
    clone.classList.add('fwd');
    const done = () => { if (clone.isConnected) { clone.remove(); addMini(true, wasPre ? 2 : 3, sunday); } };
    clone.addEventListener('animationend', done, { once: true });
    setTimeout(done, 1000);
    const fl = block.querySelectorAll('.flying.fwd');
    if (fl.length > 6) fl[0].remove();
  }

  function commitTear() {
    const wasPre = preMode;
    torn++; pile++;
    counter.add(1);
    if (wasPre) preMode = false; else pos++;

    const fake = !wasPre && torn >= 8 && (torn % 23 === 0 || Math.random() < .06);
    if (fake) {
      sheet.innerHTML = sheetHTML(pos, torn, { num: 4 });
      sheet.classList.remove('pre');
      decorate(sheet);
      setTimeout(() => {
        const num = sheet.querySelector('.num');
        if (!num || num.textContent !== '4') return;
        num.textContent = '3';
        num.classList.add('snap');
        toast('Показалось.');
      }, 700);
      renderStats();
    } else {
      render();
    }
    if (wasPre) toast('Началось.', 2600);

    const ms = MILESTONES.find(([n]) => n === torn);
    if (ms) setTimeout(() => toast(`Достижение: ${ms[1]}`), fake ? 1300 : 300);
    bumpStreak();
    save();
  }

  function tear() {
    if (locked) return;
    launch(makeClone());
    ripSound(false);
    commitTear();
  }

  function back() {
    if (locked) return;
    preMode = false;
    pos--;
    if (pile > 0) {
      pile--;
      const minis = floor.querySelectorAll('.mini');
      if (minis.length) minis[minis.length - 1].remove();
    }
    const glued = document.createElement('div');
    glued.className = 'sheet flying back';
    glued.innerHTML = sheetHTML(pos, torn);
    decorate(glued);
    glued.style.top = sheet.offsetTop + 'px';
    block.appendChild(glued);
    glueSound();
    const fin = () => { if (glued.isConnected) { render(); glued.remove(); } };
    glued.addEventListener('animationend', fin, { once: true });
    setTimeout(fin, 800);
    toast('Вчера тоже было 3 сентября.');
    streak = 0; showStreak();
    save();
  }

  // ---------- серия и падение со стены ----------
  function bumpStreak() {
    const t = performance.now();
    streak = (t - lastTearAt < SERIES_GAP) ? streak + 1 : 1;
    lastTearAt = t;
    showStreak();
    clearTimeout(streakTimer);
    streakTimer = setTimeout(() => { streak = 0; showStreak(); }, SERIES_GAP + 50);
    if (streak >= SERIES_GOAL) fallOff();
  }
  function showStreak() {
    const el = $('streak');
    el.hidden = streak < 10;
    el.textContent = `Серия: ${streak} из ${SERIES_GOAL}`;
    board.classList.toggle('wobble1', streak >= 60 && streak < 85);
    board.classList.toggle('wobble2', streak >= 85);
  }
  function fallOff() {
    locked = true;
    streak = 0; showStreak(); clearTimeout(streakTimer);
    hang.classList.add('off');
    toast('Календарь не выдержал.', 1500);
    const first = !fellOff;
    fellOff = true; save(); renderChips();
    setTimeout(() => {
      hang.classList.remove('off');
      void hang.offsetWidth;
      hang.classList.add('rehang');
      toast(first ? 'Достижение: Сорвал со стены. Повесили обратно. 3 сентября.' : 'Повесили обратно. 3 сентября.', 3000);
      setTimeout(() => { hang.classList.remove('rehang'); locked = false; }, 900);
    }, 1500);
  }

  // ---------- отрыв пальцем ----------
  const PULL = 120;      // сколько тянуть, чтобы лист оторвался сам
  let drag = null, suppressUntil = 0;
  sheet.addEventListener('pointerdown', e => {
    if (locked || (e.button && e.button !== 0)) return;
    drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, lastY: e.clientY, lastT: performance.now(), v: 0, active: false, clone: null, holes: 0 };
    try { sheet.setPointerCapture(e.pointerId); } catch (err) {}
  });
  sheet.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
    if (!drag.active) {
      if (dy > 8 && dy > Math.abs(dx)) startDrag();
      else if (Math.hypot(dx, dy) > 14) { drag = null; return; }
      else return;
    }
    const t = performance.now();
    drag.v = (e.clientY - drag.lastY) / Math.max(1, t - drag.lastT);
    drag.lastY = e.clientY; drag.lastT = t;
    moveDrag(dx, dy);
  });
  const endPointer = e => {
    if (!drag || e.pointerId !== drag.id) return;
    if (drag.active) {
      suppressUntil = performance.now() + 450;
      const dy = e.clientY - drag.y0;
      if (e.type !== 'pointercancel' && (dy >= PULL * .8 || (drag.v > .55 && dy > 30))) finishDrag();
      else cancelDrag();
    }
    drag = null;
  };
  sheet.addEventListener('pointerup', endPointer);
  sheet.addEventListener('pointercancel', endPointer);

  function startDrag() {
    drag.active = true;
    const c = makeClone();
    c.classList.add('drag');
    const tl = document.createElement('div'); tl.className = 'tearline'; c.appendChild(tl);
    block.appendChild(c);
    drag.clone = c;
    // под ним уже следующий лист — и это снова 3 сентября
    sheet.innerHTML = sheetHTML(preMode ? pos : pos + 1, torn + 1);
    sheet.classList.remove('pre');
    decorate(sheet);
  }
  function moveDrag(dx, dy) {
    const c = drag.clone; if (!c) return;
    const d = Math.max(0, dy);
    const p = Math.min(1, d / PULL);
    const tr = `translate(${(dx * .08).toFixed(1)}px, ${(Math.min(d, PULL) * .16).toFixed(1)}px) rotate(${(dx * .02 - p * 1.6).toFixed(2)}deg)`;
    c.style.transform = tr;
    drag.tr = tr;
    const tl = c.querySelector('.tearline'); if (tl) tl.style.width = (p * 100).toFixed(1) + '%';
    const holes = Math.floor(p * 16);
    while (drag.holes < holes) { drag.holes++; tickSound(); }
    if (d >= PULL * 1.25) { const dd = drag; drag = null; suppressUntil = performance.now() + 900; finishDrag(dd); }
  }
  function finishDrag(dd = drag) {
    if (!dd || !dd.clone) return;
    launch(dd.clone, dd.tr);
    ripSound(true);
    commitTear();
  }
  function cancelDrag() {
    const c = drag.clone; if (!c) return;
    c.classList.add('settle');
    c.style.transform = 'none';
    const tl = c.querySelector('.tearline'); if (tl) { tl.style.transition = 'width .2s'; tl.style.width = '0'; }
    setTimeout(() => { c.remove(); renderSheet(); }, 230);
  }

  sheet.addEventListener('click', () => { if (performance.now() < suppressUntil) return; tear(); });
  $('tear').addEventListener('click', tear);
  $('back').addEventListener('click', back);
  $('sound').addEventListener('click', () => { sound = !sound; store.set('sound', sound); renderStats(); });
  $('share').addEventListener('click', () => shareText(
    `Я оторвал ${fmt(torn)} ${plural(torn, 'лист', 'листа', 'листов')} календаря. Всё ещё 3 сентября. Попробуй сам: ${siteUrl}`));

  document.addEventListener('keydown', e => {
    if (e.target.closest && e.target.closest('button')) return;
    if (e.key === ' ' || e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); tear(); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); back(); }
  });

  // ---------- реальная дата за окном ----------
  const NERVES = {
    9: 'До 3 сентября 9 дней. Всё под контролем.',
    8: 'До 3 сентября 8 дней. Пока спокойно.',
    7: 'Неделя до 3 сентября. Календарь начинает что-то подозревать.',
    6: 'До 3 сентября 6 дней. Кто-то уже ищет пульт от календаря.',
    5: 'До 3 сентября 5 дней. Сохраняйте спокойствие.',
    4: 'До 3 сентября 4 дня. Календарь пьёт валерьянку.',
    3: 'До 3-го три дня. Символично и тревожно.',
    2: 'Послезавтра начнётся.'
  };
  const out = $('outside');
  let countdownTimer;
  function updateOutside() {
    const n = clock();
    const today = new Date(n.getFullYear(), n.getMonth(), n.getDate());
    const isSep3 = n.getMonth() === 8 && n.getDate() === 3;
    out.className = '';
    board.classList.remove('nervous');
    if (isSep3) {
      out.textContent = 'За окном тоже 3 сентября. Впервые всё сходится.';
      out.classList.add('sync');
      return false;
    }
    let next = new Date(n.getFullYear(), 8, 3);
    if (today > next) next = new Date(n.getFullYear() + 1, 8, 3);
    const days = Math.round((next - today) / 864e5);
    if (days === 1) {
      const ms = next - n;
      const h = Math.floor(ms / 36e5), m = Math.floor(ms % 36e5 / 6e4), s = Math.floor(ms % 6e4 / 1e3);
      const pad = x => String(x).padStart(2, '0');
      out.textContent = `Завтра начнётся. Осталось ${pad(h)}:${pad(m)}:${pad(s)}.`;
      out.classList.add('alarm');
      board.classList.add('nervous');
      return true;
    }
    if (NERVES[days]) {
      out.textContent = NERVES[days];
      out.classList.add('alarm');
      if (days <= 4) board.classList.add('nervous');
      return false;
    }
    out.textContent = `За окном ${n.getDate()} ${MONTHS[n.getMonth()]} ${n.getFullYear()}. До настоящего 3 сентября ${days} ${plural(days, 'день', 'дня', 'дней')}. Здесь не ждут.`;
    return false;
  }
  if (updateOutside()) {
    countdownTimer = setInterval(() => {
      if (!updateOutside()) {
        clearInterval(countdownTimer);
        toast('Началось. Ничего не изменилось.', 3000);
      }
    }, 1000);
  }

  // ---------- общий счётчик ----------
  let globalTotal = null;
  function showGlobal() {
    const el = $('global');
    if (globalTotal === null) { el.hidden = true; return; }
    el.hidden = false;
    $('globalNum').textContent = fmt(globalTotal);
    $('globalTail').textContent = `${plural(globalTotal, 'лист', 'листа', 'листов')}. Всё ещё 3-е.`;
  }
  counter.onChange(v => { globalTotal = v; showGlobal(); });

  // ---------- старт ----------
  render();
  for (let i = 0; i < Math.min(pile, 60); i++) addMini(false);
  window.Sep3.postcard.init();
})();
