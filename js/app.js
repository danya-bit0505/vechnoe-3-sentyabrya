// Календарь: отрыв листов, виды календарей, пасхалки, пол с ведром, режимы по дате.
(() => {
  const { clock, plural, fmt, store, toast, shareText, siteUrl, WD, MONTHS, counter } = window.Sep3;
  const $ = id => document.getElementById(id);
  const mount = $('mount'), hang = $('hang'), board = $('board'), stack = $('stack'), sheet = $('sheet');
  const floor = $('floor'), bin = $('bin');
  const HASH = location.hash.slice(1);
  const WDS = ['ВС', 'ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ'];
  const pad = x => String(x).padStart(2, '0');
  const dayKeyOf = d => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  const hhmm = d => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const hms = ms => { const s = Math.max(0, Math.floor(ms / 1000)); return `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s % 3600 / 60))}:${pad(s % 60)}`; };
  const strip = html => html.replace(/<[^>]+>/g, '');

  // ---------- год: пересчитывается в новогоднюю полночь ----------
  let Y, base, doy, left;
  function setYear(y) {
    Y = y;
    base = new Date(Y, 8, 3).getDay();
    const leap = (Y % 4 === 0 && Y % 100 !== 0) || Y % 400 === 0;
    doy = Math.round((new Date(Y, 8, 3) - new Date(Y, 0, 0)) / 864e5);
    left = (leap ? 366 : 365) - doy;
  }
  setYear(clock().getFullYear());

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
  // у каждого вида свои шутки, примешиваются к общим
  const SKIN_FACTS = {
    flip: [
      `<b>Перекидной</b> перекинулся. На обороте — 3 сентября.`,
      `<b>Настольный.</b> Стоит ровно. Дата тоже.`
    ],
    led: [
      `Прошивка 3.9. Обновление до 4.9 не найдено.`,
      `Батарейка села. Дата сохранена: 03.09.`,
      `Синхронизация с атомными часами: 3 сентября. Подтверждено.`
    ],
    phone: [
      `<b>Напоминание:</b> сегодня 3 сентября.`,
      `<b>Обновление системы</b> перенесло дату на 3 сентября.`,
      `<b>Будильник</b> на 4 сентября не сработает. Его нет.`
    ]
  };
  const MILESTONES = [
    [1, 'Первый лист'], [3, 'Третье третье'], [7, 'Неделя третьих'],
    [30, 'Месяц третьих'], [100, 'Сотня'], [365, 'Год прошёл'], [1000, 'Тысяча третьих']
  ];
  const SERIES_GOAL = 100;      // столько подряд — и календарь падает со стены
  const SERIES_GAP = 1200;      // мс между отрывами, чтобы серия не прервалась
  const BIN_CAP = 20;           // столько листов влезает в ведро
  const BURN_AT = 365;          // столько листов на полу — можно сжечь
  const FLOOR_MAX = 60;         // столько листов рисуем на полу

  // ---------- состояние ----------
  let torn = store.get('torn', 0);
  let pos = store.get('pos', 0);
  let pile = store.get('pile', 0);
  let binN = store.get('bin', 0);
  let sound = store.get('sound', true);
  let fellOff = store.get('fell', false);
  let eggs = Object.assign({ saw4: false, overflow: false, burned: false }, store.get('eggs', {}));
  let locked = false;
  let streak = 0, lastTearAt = 0, streakTimer;

  // ---------- виды календарей ----------
  const ORDER = ['tear', 'flip', 'led', 'phone', 'maya'];
  const SKINS = {
    tear:  { name: 'Отрывной', wall: true, how: 'есть сразу', unlock: () => true },
    flip:  { name: 'Перекидной настольный', wall: false, how: '7 листов', unlock: () => torn >= 7 },
    led:   { name: 'Электронное табло', wall: true, how: '30 листов', unlock: () => torn >= 30 },
    phone: { name: 'Экран телефона', wall: false, how: '100 листов', unlock: () => torn >= 100 },
    maya:  { name: 'Календарь майя', wall: true, how: 'сжечь кучу', unlock: () => eggs.burned }
  };
  let owned = store.get('owned', ['tear']);
  owned = Array.isArray(owned) ? owned.filter(k => SKINS[k]) : [];
  if (!owned.includes('tear')) owned.unshift('tear');
  let skin = store.get('skin', 'tear');
  if (!owned.includes(skin)) skin = 'tear';

  // проверочные якоря: #allskins — все виды, #pile365 — куча на полу
  if (HASH === 'allskins') owned = ORDER.slice();
  if (HASH === 'pile365') pile = Math.max(pile, BURN_AT);

  const isSep2 = (() => { const n = clock(); return n.getMonth() === 8 && n.getDate() === 2; })();
  let preMode = isSep2;          // в последний день лета первый лист — «2»

  const wdOf = p => ((base + p) % 7 + 7) % 7;
  const numText = (v, k = skin) => k === 'led' ? pad(v) : String(v);

  function sheetData(o = {}) {
    const p = o.p ?? pos, n = o.n ?? torn;
    const w = o.w ?? wdOf(p);
    let fact = o.fact;
    if (fact == null) {
      const extra = SKIN_FACTS[skin];
      fact = (extra && n % 3 === 1)
        ? extra[Math.floor(n / 3) % extra.length]
        : FACTS[((n % FACTS.length) + FACTS.length) % FACTS.length](n);
    }
    return {
      w, sun: w === 0 ? ' sunday' : '', num: numText(o.num ?? 3), fact,
      rise: o.rise ?? '5.35', set: o.set ?? '19.13', len: o.len ?? '13.38',
      doy: o.doy ?? doy, left: o.left ?? left, foot: o.foot ?? 'Завтра: 3 сентября'
    };
  }
  const RENDER = {
    tear: d => `
      <div class="s-head"><span class="s-month">Сентябрь</span><span class="s-year">${Y}</span></div>
      <div class="num${d.sun}">${d.num}</div>
      <div class="wd${d.sun}">${WD[d.w]}</div>
      <div class="sun"><span><b>Восход</b>${d.rise}</span><span><b>Заход</b>${d.set}</span><span><b>Долгота</b>${d.len}</span></div>
      <div class="fact">${d.fact}</div>
      <div class="s-foot"><span>${d.doy}-й день года · до конца ${d.left}</span><span>${d.foot}</span></div>`,
    flip: d => `
      <div class="f-month">Сентябрь ${Y}</div>
      <div class="num${d.sun}">${d.num}</div>
      <div class="wd${d.sun}">${WD[d.w]}</div>
      <div class="fact">${d.fact}</div>`,
    led: d => `
      <div class="led-row"><span>${WDS[d.w]}</span><span data-clock>${hhmm(clock())}</span></div>
      <div class="num">${d.num}</div>
      <div class="led-sub">Сентябрь ${Y}</div>
      <div class="led-ticker"><span>${strip(d.fact)}</span></div>`,
    phone: d => `
      <div class="ph-status"><span data-clock>${hhmm(clock())}</span><span class="ph-island"></span><span class="ph-bat"></span></div>
      <div class="ph-date">${WD[d.w]}, <span class="num">${d.num}</span> сентября</div>
      <div class="ph-time" data-clock>${hhmm(clock())}</div>
      <div class="ph-notif"><b>Календарь · сейчас</b><span>${d.fact}</span></div>
      <div class="ph-bar"></div>`,
    maya: d => `
      <div class="m-top">Сентябрь</div>
      <div class="num">${d.num}</div>
      <div class="m-wd">${WD[d.w]}</div>
      <div class="m-count">13.0.0.9.${d.num}</div>`
  };
  const sheetHTML = o => RENDER[skin](sheetData(o));
  const preSheetHTML = () => sheetHTML({
    num: 2, w: new Date(Y, 8, 2).getDay(), rise: '5.33', set: '19.16', len: '13.43',
    doy: doy - 1, left: left + 1, foot: 'Завтра: 3 сентября. Навсегда.',
    fact: `<b>Последний день.</b> Оторвёте этот лист — и начнётся. Подумайте хорошенько.`
  });

  function decorate(el) {
    el.classList.toggle('tired', torn >= 10);
    el.classList.toggle('yellow', torn >= 50);
    el.classList.toggle('stain', torn >= 100);
  }

  // ---------- отрисовка ----------
  function renderSheet() {
    sheet.innerHTML = preMode ? preSheetHTML() : sheetHTML();
    sheet.classList.toggle('pre', preMode);
    sheet.dataset.fake = '';
    decorate(sheet);
  }
  function renderStats() {
    $('torn').textContent = fmt(torn);
    renderChips();
    renderSkins();
    $('floorTitle').textContent = pile ? `На полу: ${fmt(pile)} ${plural(pile, 'лист', 'листа', 'листов')}` : 'На полу';
    $('floorEmpty').hidden = pile > 0 || binN > 0;
    $('burn').hidden = pile < BURN_AT;
    $('sound').textContent = 'Звук: ' + (sound ? 'вкл' : 'выкл');
    showGlobal();
  }
  function render() { renderSheet(); renderStats(); }

  function renderChips() {
    const list = MILESTONES.map(([n, t]) => [torn >= n, t, n]);
    list.push(
      [fellOff, 'Сорвал со стены', `${SERIES_GOAL} подряд`],
      [eggs.saw4, 'Видел 4 сентября', eggs.saw4 ? 'было' : '???'],
      [eggs.overflow, 'Полное ведро', 'ведро'],
      [eggs.burned, 'Феникс', `${BURN_AT} на полу`],
      [owned.length === ORDER.length, 'Коллекционер', `${ORDER.length} календарей`]
    );
    $('chips').innerHTML = list.map(([on, t, i]) => `<span class="chip${on ? ' on' : ''}">${t} <i>${i}</i></span>`).join('');
  }
  function renderSkins() {
    $('skins').innerHTML = ORDER.map(k => {
      const s = SKINS[k];
      if (owned.includes(k)) {
        return `<button type="button" class="chip${k === skin ? ' on' : ''}" data-skin="${k}" aria-pressed="${k === skin}">${s.name}</button>`;
      }
      if (s.unlock()) return `<span class="chip ready">${s.name} <i>ждёт на почте</i></span>`;
      return `<span class="chip">${s.name} <i>${s.how}</i></span>`;
    }).join('');
  }

  function applySkin() {
    ORDER.forEach(k => mount.classList.toggle('skin-' + k, k === skin));
    mount.classList.toggle('wall', SKINS[skin].wall);
  }
  function setSkin(k, animate) {
    if (!SKINS[k] || !owned.includes(k)) return;
    skin = k;
    store.set('skin', k);
    applySkin();
    renderSheet();
    renderSkins();
    if (animate) {
      hang.classList.remove('rehang'); void hang.offsetWidth; hang.classList.add('rehang');
      setTimeout(() => hang.classList.remove('rehang'), 900);
    }
  }

  // ---------- пол ----------
  function addMini(animate, num = 3, sunday = false, k = skin) {
    const m = document.createElement('div');
    const w = floor.clientWidth || 380;
    m.className = `mini m-${k}` + (sunday ? ' sunday' : '');
    m.textContent = numText(num, k);
    m.style.left = Math.round(Math.random() * Math.max(10, w - 44 - 80)) + 'px';
    m.style.top = Math.round(30 + Math.random() * 80) + 'px';
    m.style.transform = `rotate(${Math.round(Math.random() * 80 - 40)}deg)`;
    if (!animate) m.style.animation = 'none';
    floor.appendChild(m);
    const minis = floor.querySelectorAll('.mini');
    if (minis.length > FLOOR_MAX) minis[0].remove();
    return m;
  }
  function fillFloor() {
    const shown = floor.querySelectorAll('.mini:not(.char)').length;
    for (let i = shown; i < Math.min(pile, FLOOR_MAX); i++) addMini(false);
  }
  function updateBin() {
    $('binFill').style.height = Math.min(100, binN / BIN_CAP * 100) + '%';
    $('binN').textContent = binN;
  }

  // ---------- звук ----------
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
      if (Math.random() < 0.25) {
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
  function playPaper(buf, gain, rate = 1) {
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
      playPaper(bufs[key], 0.7, 0.92 + Math.random() * 0.16);
    } catch (e) {}
  }
  function tickSound() {
    const a = audio(); if (!a) return;
    try {
      bufs.tick = bufs.tick || perfBuffer(a, 0.012, 0.004, 0.004, 0.0);
      playPaper(bufs.tick, 0.55, 0.85 + Math.random() * 0.3);
    } catch (e) {}
  }
  // шум с огибающей env(p), p = 0…1, через фильтр
  function noise(dur, env, { type = 'bandpass', f = 2000, f2 = 0, q = .7, gain = .4, at = 0 } = {}) {
    const a = audio(); if (!a) return;
    try {
      const len = Math.floor(a.sampleRate * dur), b = a.createBuffer(1, len, a.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * env(i / len);
      const t = a.currentTime + at;
      const src = a.createBufferSource(); src.buffer = b;
      const fl = a.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, t); fl.Q.value = q;
      if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur);
      const g = a.createGain(); g.gain.value = gain;
      src.connect(fl).connect(g).connect(a.destination); src.start(t);
    } catch (e) {}
  }
  function tone(freq, dur, { type = 'sine', gain = .2, at = 0 } = {}) {
    const a = audio(); if (!a) return;
    try {
      const t = a.currentTime + at;
      const o = a.createOscillator(); o.type = type; o.frequency.value = freq;
      const g = a.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(gain, t + .006);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + .05);
    } catch (e) {}
  }
  const sfx = {
    glue: () => noise(.22, p => Math.sin(p * Math.PI) * .25, { f: 3200, q: .5, gain: .35 }),
    whoosh: () => noise(.34, p => Math.sin(p * Math.PI), { f: 500, f2: 3800, q: .9, gain: .35 }),
    beep: () => { tone(1760, .06, { type: 'square', gain: .05 }); tone(1760, .06, { type: 'square', gain: .05, at: .09 }); },
    tap: () => { tone(2300, .03, { gain: .1 }); noise(.2, p => (1 - p) * .6, { type: 'highpass', f: 2500, gain: .12 }); },
    stone: () => { noise(.55, p => Math.min(1, p * 8) * (1 - p), { type: 'lowpass', f: 420, q: .5, gain: 1 }); tone(70, .35, { gain: .5, at: .45 }); },
    hiss: () => noise(.6, p => Math.min(1, p * 10) * Math.sqrt(1 - p), { type: 'highpass', f: 3500, q: .4, gain: .3 }),
    toss: () => { noise(.14, p => (1 - p) ** 2, { f: 1500, q: .8, gain: .35 }); tone(520, .3, { type: 'triangle', gain: .05, at: .07 }); },
    crash: () => { noise(.5, p => (1 - p) ** 1.5, { f: 900, q: .4, gain: .5 }); tone(360, .5, { type: 'triangle', gain: .06 }); },
    thud: () => tone(80, .3, { gain: .5 }),
    crackle: () => {
      noise(2.4, p => (Math.random() < .03 ? 1 : .1) * Math.min(1, p * 5) * Math.pow(1 - p, .4), { f: 1800, q: .4, gain: .7 });
      noise(2.4, p => Math.min(1, p * 4) * (1 - p), { type: 'lowpass', f: 220, gain: .6 });
    },
    bell: () => [[1, .25], [2, .12], [2.76, .08], [4.07, .05], [5.4, .03]].forEach(([k, g]) => tone(196 * k, 2.8 / Math.sqrt(k), { gain: g }))
  };
  function tearSound(fast) {
    if (skin === 'tear') ripSound(fast);
    else if (skin === 'flip') sfx.whoosh();
    else if (skin === 'led') sfx.beep();
    else if (skin === 'phone') sfx.tap();
    else sfx.stone();
  }

  function save() {
    store.set('torn', torn); store.set('pos', pos); store.set('pile', pile); store.set('bin', binN);
    store.set('fell', fellOff); store.set('eggs', eggs); store.set('owned', owned); store.set('skin', skin);
  }

  // ---------- отрыв ----------
  function tornEdge() {
    const pts = ['0 100%', '0 7px'];
    for (let x = 4; x < 100; x += 4) pts.push(`${x}% ${2 + Math.round(Math.random() * 8)}px`);
    pts.push('100% 6px', '100% 100%');
    return `polygon(${pts.join(',')})`;
  }
  function placeLike(el) {
    el.style.top = sheet.offsetTop + 'px';
    el.style.left = sheet.offsetLeft + 'px';
    el.style.width = sheet.offsetWidth + 'px';
    el.style.right = 'auto';
  }
  function makeClone() {
    const c = sheet.cloneNode(true);
    ['id', 'role', 'tabindex', 'aria-label'].forEach(a => c.removeAttribute(a));
    c.classList.add('flying');
    placeLike(c);
    return c;
  }
  function launch(clone, fromTransform) {
    const wasPre = clone.classList.contains('pre');
    const sunday = !!clone.querySelector('.num.sunday');
    const k = skin;
    clone.classList.remove('drag', 'settle');
    if (k === 'tear') clone.style.clipPath = tornEdge();
    clone.style.setProperty('--from', fromTransform || 'none');
    clone.style.transform = '';
    clone.style.setProperty('--dx', Math.round(Math.random() * 120 - 40) + 'px');
    clone.style.setProperty('--rot', Math.round(Math.random() * 50 - 10) + 'deg');
    const tl = clone.querySelector('.tearline'); if (tl) tl.remove();
    if (!clone.isConnected) stack.appendChild(clone);
    void clone.offsetWidth;
    clone.classList.add('fwd');
    const done = () => { if (clone.isConnected) { clone.remove(); addMini(true, wasPre ? 2 : 3, sunday, k); } };
    clone.addEventListener('animationend', done, { once: true });
    setTimeout(done, 1000);
    const fl = stack.querySelectorAll('.flying.fwd');
    if (fl.length > 6) fl[0].remove();
    if (k === 'maya') { board.classList.remove('thud'); void board.offsetWidth; board.classList.add('thud'); }
  }

  function commitTear() {
    const wasPre = preMode;
    torn++; pile++;
    counter.add(1);
    if (wasPre) preMode = false; else pos++;

    const fake = !wasPre && torn >= 8 && (torn % 23 === 0 || Math.random() < .06);
    if (fake) {
      sheet.innerHTML = sheetHTML({ num: 4 });
      sheet.classList.remove('pre');
      sheet.dataset.fake = '1';
      decorate(sheet);
      setTimeout(() => {
        if (sheet.dataset.fake !== '1') return;
        sheet.dataset.fake = '';
        const num = sheet.querySelector('.num');
        if (!num) return;
        num.textContent = numText(3);
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
    const fresh = ORDER.find(k => !owned.includes(k) && SKINS[k].unlock() && k !== 'maya' && SKINS[k].how === `${torn} листов`);
    if (fresh) setTimeout(() => toast(`На почте новый календарь: ${SKINS[fresh].name}`, 2600), 1500);
    bumpStreak();
    save();
  }

  function doTear() {
    launch(makeClone());
    tearSound(false);
    commitTear();
  }
  function tear() { if (!locked) doTear(); }

  function back() {
    if (locked) return;
    preMode = false;
    pos--;
    if (pile > 0) {
      pile--;
      const minis = floor.querySelectorAll('.mini:not(.char)');
      if (minis.length) minis[minis.length - 1].remove();
      fillFloor();
    }
    const glued = document.createElement('div');
    glued.className = 'sheet flying back';
    glued.innerHTML = sheetHTML();
    decorate(glued);
    placeLike(glued);
    stack.appendChild(glued);
    sfx.glue();
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
    sfx.crash();
    toast('Календарь не выдержал.', 1500);
    const first = !fellOff;
    fellOff = true; save(); renderChips();
    const again = SKINS[skin].wall ? 'Повесили обратно' : 'Поставили обратно';
    setTimeout(() => {
      hang.classList.remove('off');
      void hang.offsetWidth;
      hang.classList.add('rehang');
      toast(first ? `Достижение: Сорвал со стены. ${again}. 3 сентября.` : `${again}. 3 сентября.`, 3000);
      setTimeout(() => { hang.classList.remove('rehang'); locked = false; }, 900);
    }, 1500);
  }

  // ---------- отрыв пальцем ----------
  const PULL = 120;
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
    if (skin === 'tear') { const tl = document.createElement('div'); tl.className = 'tearline'; c.appendChild(tl); }
    stack.appendChild(c);
    drag.clone = c;
    // под ним уже следующий лист — и это снова 3 сентября
    sheet.innerHTML = sheetHTML({ p: preMode ? pos : pos + 1, n: torn + 1 });
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
    if (skin === 'tear') {
      const holes = Math.floor(p * 16);
      while (drag.holes < holes) { drag.holes++; tickSound(); }
    }
    if (d >= PULL * 1.25) { const dd = drag; drag = null; suppressUntil = performance.now() + 900; finishDrag(dd); }
  }
  function finishDrag(dd = drag) {
    if (!dd || !dd.clone) return;
    launch(dd.clone, dd.tr);
    tearSound(true);
    commitTear();
  }
  function cancelDrag() {
    const c = drag.clone; if (!c) return;
    c.classList.add('settle');
    c.style.transform = 'none';
    const tl = c.querySelector('.tearline'); if (tl) { tl.style.transition = 'width .2s'; tl.style.width = '0'; }
    setTimeout(() => { c.remove(); renderSheet(); }, 230);
  }

  // ---------- перевернуть ----------
  function flipOver() {
    if (locked) return;
    locked = true;
    hang.classList.add('upside');
    sfx.whoosh();
    setTimeout(() => toast('Ɛ сентября? Нет. Всё ещё 3.', 2200), 650);
    const fin = () => { hang.classList.remove('upside'); locked = false; };
    hang.addEventListener('animationend', fin, { once: true });
    setTimeout(() => { if (hang.classList.contains('upside')) fin(); }, 2700);
  }

  // ---------- пасхалки ----------
  const HISS = ['Ш-ш-ш. Никаких четвёрок.', 'Четвёрка не принята.', 'Здесь такое не печатают.', 'Даже не думайте.'];
  function hiss() {
    if (locked) return;
    sheet.classList.remove('hiss'); void sheet.offsetWidth; sheet.classList.add('hiss');
    setTimeout(() => sheet.classList.remove('hiss'), 520);
    sfx.hiss();
    toast(HISS[Math.floor(Math.random() * HISS.length)]);
  }
  function flash4() {
    if (locked) return;
    sheet.innerHTML = sheetHTML({ num: 4, w: (wdOf(pos) + 1) % 7, fact: `<b>4 сентября.</b> Оно существует.`, foot: 'Завтра: 5 сентября' });
    setTimeout(() => {
      renderSheet();
      const num = sheet.querySelector('.num');
      if (num) num.classList.add('snap');
      toast('Показалось.');
    }, 120);
    if (!eggs.saw4) {
      eggs.saw4 = true; save(); renderChips();
      setTimeout(() => toast('Достижение: Видел 4 сентября', 2600), 1700);
    }
  }
  const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA'];
  let kseq = [];
  let taps365 = [];
  $('b365').addEventListener('click', () => {
    const t = performance.now();
    taps365 = taps365.filter(x => t - x < 1500);
    taps365.push(t);
    if (taps365.length >= 4) { taps365 = []; flash4(); }
  });

  // ---------- ведро ----------
  let md = null;
  floor.addEventListener('pointerdown', e => {
    const m = e.target.closest('.mini');
    if (!m || m.classList.contains('char') || locked) return;
    e.preventDefault();
    md = { m, id: e.pointerId, dx: e.clientX - m.offsetLeft, dy: e.clientY - m.offsetTop };
    m.classList.add('held');
    m.style.animation = 'none';
    try { floor.setPointerCapture(e.pointerId); } catch (err) {}
  });
  floor.addEventListener('pointermove', e => {
    if (!md || e.pointerId !== md.id) return;
    const W = floor.clientWidth, H = floor.clientHeight;
    md.m.style.left = Math.max(-10, Math.min(W - 30, e.clientX - md.dx)) + 'px';
    md.m.style.top = Math.max(-10, Math.min(H - 30, e.clientY - md.dy)) + 'px';
    bin.classList.toggle('hot', overBin(md.m));
  });
  const dropMini = e => {
    if (!md || e.pointerId !== md.id) return;
    const m = md.m; md = null;
    m.classList.remove('held'); bin.classList.remove('hot');
    if (overBin(m)) toBin(m);
  };
  floor.addEventListener('pointerup', dropMini);
  floor.addEventListener('pointercancel', dropMini);
  function overBin(m) {
    const a = m.getBoundingClientRect(), b = bin.getBoundingClientRect();
    const cx = a.left + a.width / 2, cy = a.top + a.height / 2;
    return cx > b.left - 8 && cx < b.right + 8 && cy > b.top - 18 && cy < b.bottom;
  }
  function toBin(m) {
    m.remove();
    binN++; pile = Math.max(0, pile - 1);
    sfx.toss();
    updateBin();
    if (binN > BIN_CAP) { overflowBin(); return; }
    fillFloor(); renderStats(); save();
  }
  function overflowBin() {
    locked = true;
    bin.classList.add('tip');
    sfx.crash();
    setTimeout(() => {
      const spill = binN;
      binN = 0; pile += spill; updateBin();
      const room = FLOOR_MAX - floor.querySelectorAll('.mini').length;
      for (let i = 0; i < Math.min(spill, room); i++) addMini(true);
      const first = !eggs.overflow;
      eggs.overflow = true;
      renderStats(); save();
      toast(first ? 'Ведро переполнилось. Всё обратно на пол. Достижение: Полное ведро' : 'Ведро переполнилось. Всё обратно на пол.', 2800);
      setTimeout(() => { bin.classList.remove('tip'); locked = false; }, 300);
    }, 420);
  }

  // ---------- сжечь кучу ----------
  function burn() {
    if (locked || pile < BURN_AT) return;
    locked = true;
    floor.classList.add('burning');
    sfx.crackle();
    floor.querySelectorAll('.mini').forEach(m => m.classList.add('char'));
    toast('Горит.', 1600);
    setTimeout(() => {
      floor.querySelectorAll('.mini').forEach(m => m.remove());
      floor.classList.remove('burning');
      floor.classList.add('ash');
      pile = 0; renderStats();
      setTimeout(() => {
        const first = !eggs.burned;
        eggs.burned = true;
        const m = addMini(true);
        m.classList.add('phoenix');
        m.style.left = Math.round((floor.clientWidth - 80) / 2 - 19) + 'px';
        m.style.top = '70px';
        m.style.transform = 'rotate(-6deg)';
        pile = 1;
        floor.classList.remove('ash');
        save(); renderStats();
        toast(first ? 'Из пепла поднялся один лист. 3 сентября. На почте календарь майя.' : 'Из пепла поднялся один лист. 3 сентября.', 3400);
        locked = false;
      }, 900);
    }, 2300);
  }

  // ---------- посылка с новым календарём ----------
  const parcel = $('parcel'), box = $('box');
  let parcelFresh = null, parcelState = 'none';
  function buy() {
    if (locked) return;
    locked = true;
    parcelFresh = ORDER.find(k => !owned.includes(k) && SKINS[k].unlock()) || null;
    const item = $('boxItem');
    const k = parcelFresh || skin;
    item.className = `box-item mini m-${k}`;
    item.textContent = numText(3, k);
    parcel.classList.remove('opened');
    $('parcelMsg').textContent = 'Тапните, чтобы открыть';
    parcel.hidden = false;
    box.classList.remove('drop'); void box.offsetWidth; box.classList.add('drop');
    setTimeout(sfx.thud, 480);
    parcelState = 'closed';
    setTimeout(() => box.focus({ preventScroll: true }), 50);
  }
  function openParcel() {
    if (parcelState !== 'closed') return;
    parcelState = 'opening';
    ripSound(true);
    parcel.classList.add('opened');
    const name = parcelFresh ? SKINS[parcelFresh].name : SKINS[skin].name;
    $('parcelMsg').textContent = parcelFresh ? `Внутри: ${name}` : 'Внутри точно такой же';
    setTimeout(() => {
      parcel.hidden = true;
      parcelState = 'none';
      locked = false;
      if (parcelFresh) {
        owned.push(parcelFresh);
        save();
        setSkin(parcelFresh, true);
        renderStats();
        const all = owned.length === ORDER.length;
        toast(all ? `${name}. Тоже 3 сентября. Достижение: Коллекционер` : `Новый календарь: ${name}. Показывает 3 сентября.`, 3000);
      } else {
        const all = owned.length === ORDER.length;
        toast(all ? 'Пришёл такой же. Коллекция и так полная. 3 сентября.' : 'Пришёл такой же. 3 сентября. Новые модели — за достижения.', 3200);
      }
    }, 1500);
  }
  box.addEventListener('click', openParcel);

  // ---------- кнопки и клавиатура ----------
  sheet.addEventListener('click', () => { if (performance.now() < suppressUntil) return; tear(); });
  $('tear').addEventListener('click', tear);
  $('back').addEventListener('click', back);
  $('flipBtn').addEventListener('click', flipOver);
  $('buy').addEventListener('click', buy);
  $('burn').addEventListener('click', burn);
  $('sound').addEventListener('click', () => { sound = !sound; store.set('sound', sound); renderStats(); });
  $('share').addEventListener('click', () => shareText(
    `Я оторвал ${fmt(torn)} ${plural(torn, 'лист', 'листа', 'листов')} календаря. Всё ещё 3 сентября. Попробуй сам: ${siteUrl}`));
  $('skins').addEventListener('click', e => {
    const b = e.target.closest('[data-skin]');
    if (!b || locked || b.dataset.skin === skin) return;
    setSkin(b.dataset.skin, true);
    sfx.thud();
  });

  document.addEventListener('keydown', e => {
    if (!$('sleep').hidden) { if (e.key === 'Escape') wake(); return; }
    if (!parcel.hidden) return;
    kseq.push(e.code);
    if (kseq.length > KONAMI.length) kseq.shift();
    const konami = kseq.length === KONAMI.length && kseq.every((c, i) => c === KONAMI[i]);
    if (konami) { kseq = []; e.preventDefault(); setTimeout(flash4, 350); return; }
    if (e.key === '4' || e.code === 'Digit4' || e.code === 'Numpad4') { hiss(); return; }
    // на кнопке пробел и Enter нажимают саму кнопку
    const onControl = e.target.closest && e.target.closest('button, a');
    if ((e.key === ' ' || e.key === 'Enter') && onControl) return;
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
  function updateOutside(n) {
    const m = n.getMonth(), d = n.getDate();
    const today = new Date(n.getFullYear(), m, d);
    let text, cls = '', nervous = false;
    if (m === 8 && d === 3) { text = 'За окном тоже 3 сентября. Впервые всё сходится.'; cls = 'sync'; }
    else if (m === 11 && d === 31) { text = `До Нового года ${hms(new Date(n.getFullYear() + 1, 0, 1) - n)}. Потом опять 3 сентября.`; cls = 'alarm'; }
    else if (m === 0 && d <= 2) { text = 'С Новым годом! Год сменился. Число нет.'; cls = 'sync'; }
    else if (m === 8 && d >= 25) text = 'Сентябрь почти закончился. Здесь он не закончится никогда.';
    else if (m === 8 && d > 3) text = `За окном ${d} сентября. Здесь всё ещё 3-е.`;
    else if (m === 9 && d === 1) { text = 'Сентябрь закончился. Здесь об этом не слышали.'; cls = 'alarm'; }
    else {
      let next = new Date(n.getFullYear(), 8, 3);
      if (today > next) next = new Date(n.getFullYear() + 1, 8, 3);
      const days = Math.round((next - today) / 864e5);
      if (days === 1) { text = `Завтра начнётся. Осталось ${hms(next - n)}.`; cls = 'alarm'; nervous = true; }
      else if (NERVES[days]) { text = NERVES[days]; cls = 'alarm'; nervous = days <= 4; }
      else text = `За окном ${d} ${MONTHS[m]} ${n.getFullYear()}. До настоящего 3 сентября ${days} ${plural(days, 'день', 'дня', 'дней')}. Здесь не ждут.`;
    }
    if (out.textContent !== text) out.textContent = text;
    if (out.className !== cls) out.className = cls;
    board.classList.toggle('nervous', nervous);
  }
  function applySeason(n) {
    const m = n.getMonth(), d = n.getDate();
    mount.classList.toggle('newyear', (m === 11 && d >= 20) || (m === 0 && d <= 7));
  }

  // новогодняя полночь: куранты, поздравление, лист отрывается сам
  function newYear(n) {
    applySeason(n);
    let k = 0;
    const strike = () => {
      k++;
      sfx.bell();
      toast(`Бом! ${k}`, 800);
      if (k < 12) { setTimeout(strike, 850); return; }
      setTimeout(() => {
        setYear(n.getFullYear());
        renderSheet();
        toast('С Новым годом!', 2200);
        setTimeout(() => { doTear(); toast('А под ним 3 сентября.', 2800); }, 1900);
      }, 900);
    };
    strike();
  }

  let lastDay = dayKeyOf(clock());
  function tick() {
    const n = clock();
    const t = hhmm(n);
    document.querySelectorAll('[data-clock]').forEach(el => { if (el.textContent !== t) el.textContent = t; });
    updateOutside(n);
    const k = dayKeyOf(n);
    if (k !== lastDay) {
      lastDay = k;
      applySeason(n);
      if (n.getMonth() === 0 && n.getDate() === 1) newYear(n);
      else if (n.getMonth() === 8 && n.getDate() === 3) toast('Началось. Ничего не изменилось.', 3000);
    }
  }

  // ---------- конец сентября: календарь спит ----------
  function wake() {
    $('sleep').hidden = true;
    locked = false;
    store.set('sleptDay', dayKeyOf(clock()));
    sfx.beep();
    setTimeout(() => toast('Сентябрь закончился? Нет. 3 сентября.', 2800), 200);
  }
  $('wake').addEventListener('click', wake);
  function maybeSleep() {
    const n = clock();
    if (n.getMonth() !== 8 || n.getDate() < 25) return false;
    if (store.get('sleptDay', '') === dayKeyOf(n)) return false;
    $('sleep').hidden = false;
    locked = true;
    setTimeout(() => $('wake').focus({ preventScroll: true }), 50);
    return true;
  }

  // ---------- визиты и приветствие ----------
  function visitsAndGreeting(sleeping) {
    const n = clock(), today = dayKeyOf(n);
    let visits = store.get('visits', 0);
    if (store.get('lastVisit', '') !== today) {
      visits++;
      store.set('visits', visits);
      store.set('lastVisit', today);
    }
    $('visits').textContent = visits <= 1
      ? 'Вы здесь впервые. Сегодня, конечно, 3 сентября.'
      : `Вы заходите сюда ${visits}-й день. Каждый раз 3 сентября.`;

    let greeted = false;
    try { greeted = sessionStorage.getItem('sep3:greeted') === '1'; sessionStorage.setItem('sep3:greeted', '1'); } catch (e) {}
    if (greeted || sleeping) return;
    const h = n.getHours();
    const msg = h >= 5 && h < 12 ? 'Доброе утро. Угадайте, какое сегодня число.'
      : h >= 12 && h < 17 ? 'Добрый день. Число вы и так знаете.'
      : h >= 17 && h < 23 ? 'Добрый вечер. Завтра будет то же самое.'
      : 'Не спится? Здесь всё ещё 3 сентября.';
    setTimeout(() => toast(msg, 3000), 700);
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
  applySkin();
  applySeason(clock());
  render();
  fillFloor();
  updateBin();
  window.Sep3.postcard.init();
  tick();
  setInterval(tick, 1000);
  visitsAndGreeting(maybeSleep());
})();
