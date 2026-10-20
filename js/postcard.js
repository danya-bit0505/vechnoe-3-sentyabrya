// Открытка дня: рисуется на canvas, на каждой — плашка с адресом сайта и QR-кодом.
(() => {
  const { clock, siteUrl, MONTHS, toast } = window.Sep3;
  const SITE_LABEL = siteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');

  const PHRASES = [
    'С 3 сентября! И с завтрашним тоже.',
    'Пусть 3 сентября никогда не кончается. Оно и не кончится.',
    'Желаю счастья, здоровья и 3 сентября!',
    'Поздравляю с днём, который всегда с тобой.',
    'Листай смело: дальше всё равно 3-е.',
    'Доброе утро! Сегодня 3 сентября. Как и вчера.',
    'Тёплого 3 сентября и уютного 3 сентября!',
    'Не грусти! Впереди ещё много 3 сентября.',
    'Мира, добра и отрывных календарей!',
    'Хорошего дня! Он будет таким же, как этот.',
    'Пусть всё в жизни меняется. Кроме даты.',
    'Обнимаю. Увидимся 3 сентября. То есть завтра.'
  ];
  const STYLES = ['kitsch', 'soviet', 'autumn'];
  const KITSCH = [['#ff7ab6', '#7b2ff7'], ['#ffd36e', '#ff5e62'], ['#5ee7df', '#3b5bdb'], ['#f9a8d4', '#c026d3']];
  const AUTUMN = [['#2f3d27', '#d98a1f'], ['#4a2516', '#e2a03f'], ['#23302f', '#c8553d']];

  let variant = 0, blob = null, blobUrl = null, phrase = '', file = null;
  const $ = id => document.getElementById(id);

  const dayKey = () => { const n = clock(); return `${n.getFullYear()}-${n.getMonth() + 1}-${n.getDate()}`; };
  const fileName = () => {
    const n = clock(), p = x => String(x).padStart(2, '0');
    return `3-sentyabrya-${n.getFullYear()}-${p(n.getMonth() + 1)}-${p(n.getDate())}.png`;
  };

  function rngFrom(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = h << 13 | h >>> 19; }
    let a = h >>> 0;
    return () => {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function wrap(ctx, text, maxW) {
    const words = text.split(' '), lines = []; let line = '';
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test;
    }
    if (line) lines.push(line);
    return lines;
  }
  function star(ctx, x, y, r, color) {
    ctx.save(); ctx.translate(x, y); ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = r * 1.5;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, rr = i % 2 ? r * .22 : r; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    ctx.closePath(); ctx.fill(); ctx.restore();
  }
  function flower(ctx, x, y, s, rnd) {
    const hues = ['#ff3d6e', '#ff8fb1', '#ffd1dc', '#e11d48'];
    const c = hues[Math.floor(rnd() * hues.length)];
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = '#2f7d32';
    for (let i = 0; i < 3; i++) {
      ctx.save(); ctx.rotate(i * 2.1 + rnd());
      ctx.beginPath(); ctx.ellipse(s * 1.1, 0, s * .9, s * .35, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    for (let ring = 3; ring >= 1; ring--) {
      const n = 5 + ring;
      for (let i = 0; i < n; i++) {
        ctx.save(); ctx.rotate(i * Math.PI * 2 / n + ring);
        ctx.fillStyle = ring === 1 ? '#b3123c' : c;
        ctx.globalAlpha = .92;
        ctx.beginPath(); ctx.ellipse(s * .22 * ring, 0, s * .26 * ring, s * .17 * ring, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    }
    ctx.restore();
  }
  function leaf(ctx, x, y, s, rot, color) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, -52);
    ctx.bezierCurveTo(18, -40, 46, -38, 34, -10);
    ctx.bezierCurveTo(52, -6, 44, 18, 22, 16);
    ctx.bezierCurveTo(20, 34, 6, 40, 0, 50);
    ctx.bezierCurveTo(-6, 40, -20, 34, -22, 16);
    ctx.bezierCurveTo(-44, 18, -52, -6, -34, -10);
    ctx.bezierCurveTo(-46, -38, -18, -40, 0, -52);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.22)'; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(0, -44); ctx.lineTo(0, 70); ctx.moveTo(0, 0); ctx.lineTo(26, -20); ctx.moveTo(0, 0); ctx.lineTo(-26, -20); ctx.stroke();
    ctx.restore();
  }
  function miniSheet(ctx, x, y, w, rot, alpha) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha = alpha;
    ctx.fillStyle = '#f6f1e4'; ctx.shadowColor = 'rgba(0,0,0,.2)'; ctx.shadowBlur = 8;
    ctx.fillRect(-w / 2, -w * .6, w, w * 1.2);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#bd261e'; ctx.font = `700 ${w * .16}px "PT Sans Narrow", sans-serif`; ctx.textAlign = 'center';
    ctx.fillText('СЕНТЯБРЬ', 0, -w * .38);
    ctx.fillStyle = '#1e1c19'; ctx.font = `700 ${w * .8}px "PT Sans Narrow", sans-serif`;
    ctx.fillText('3', 0, w * .4);
    ctx.restore();
  }
  function drawQR(ctx, x, y, size) {
    if (typeof window.qrcode !== 'function') return false;
    try {
      const qr = window.qrcode(0, 'M'); qr.addData(siteUrl); qr.make();
      const n = qr.getModuleCount(), pad = size * .07, cell = (size - pad * 2) / n;
      ctx.fillStyle = '#ffffff'; ctx.fillRect(x, y, size, size);
      ctx.fillStyle = '#1e1c19';
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
        if (qr.isDark(r, c)) ctx.fillRect(x + pad + c * cell, y + pad + r * cell, Math.ceil(cell), Math.ceil(cell));
      }
      return true;
    } catch (e) { return false; }
  }

  function draw() {
    const W = 1080, H = 1350, BAND = 230;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');
    const rnd = rngFrom(dayKey() + ':' + variant);
    const style = STYLES[Math.floor(rnd() * STYLES.length)];
    phrase = PHRASES[Math.floor(rnd() * PHRASES.length)];
    const n = clock();
    const stamp = `Открытка на ${n.getDate()} ${MONTHS[n.getMonth()]} ${n.getFullYear()}`;
    const art = H - BAND;
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';

    if (style === 'kitsch') {
      const [c1, c2] = KITSCH[Math.floor(rnd() * KITSCH.length)];
      const g = ctx.createRadialGradient(W / 2, art * .42, 40, W / 2, art * .5, W);
      g.addColorStop(0, c1); g.addColorStop(1, c2);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, art);
      for (let i = 0; i < 90; i++) star(ctx, rnd() * W, rnd() * art, 4 + rnd() * 16, rnd() < .5 ? '#ffffff' : '#fff3a8');
      flower(ctx, 110, 120, 70, rnd); flower(ctx, W - 120, 150, 58, rnd);
      flower(ctx, 120, art - 120, 62, rnd); flower(ctx, W - 110, art - 110, 76, rnd);
      const gold = ctx.createLinearGradient(0, 230, 0, 720);
      gold.addColorStop(0, '#fff6c2'); gold.addColorStop(.5, '#ffc93c'); gold.addColorStop(1, '#d9861a');
      ctx.font = '560px Lobster, cursive';
      ctx.lineWidth = 16; ctx.strokeStyle = '#7a1f3d'; ctx.lineJoin = 'round';
      ctx.shadowColor = 'rgba(255,255,255,.8)'; ctx.shadowBlur = 40;
      ctx.strokeText('3', W / 2, 700); ctx.shadowBlur = 0;
      ctx.fillStyle = gold; ctx.fillText('3', W / 2, 700);
      ctx.font = '120px Lobster, cursive';
      ctx.lineWidth = 10; ctx.strokeText('сентября', W / 2, 830);
      ctx.fillStyle = '#ffffff'; ctx.fillText('сентября', W / 2, 830);
      ctx.font = '60px Lobster, cursive';
      wrap(ctx, phrase, W - 220).forEach((l, i) => {
        const yy = 940 + i * 72;
        ctx.lineWidth = 8; ctx.strokeText(l, W / 2, yy);
        ctx.fillStyle = '#fff8d6'; ctx.fillText(l, W / 2, yy);
      });
      ctx.font = '700 30px "PT Sans Narrow", sans-serif'; ctx.fillStyle = 'rgba(255,255,255,.85)';
      ctx.fillText(stamp.toUpperCase(), W / 2, 90);
    } else if (style === 'soviet') {
      ctx.fillStyle = '#efe9da'; ctx.fillRect(0, 0, W, art);
      for (let i = 0; i < 14; i++) miniSheet(ctx, rnd() * W, rnd() * art, 90 + rnd() * 60, rnd() * 1.2 - .6, .18);
      ctx.strokeStyle = '#bd261e'; ctx.lineWidth = 10; ctx.strokeRect(46, 46, W - 92, art - 92);
      ctx.lineWidth = 3; ctx.strokeRect(70, 70, W - 140, art - 140);
      ctx.fillStyle = '#bd261e'; ctx.font = '700 64px "PT Sans Narrow", sans-serif';
      ctx.fillText('С   П Р А З Д Н И К О М', W / 2, 190);
      ctx.fillStyle = '#1e1c19'; ctx.font = '700 520px "PT Sans Narrow", sans-serif';
      ctx.fillText('3', W / 2, 680);
      ctx.fillStyle = '#bd261e'; ctx.font = '700 96px "PT Sans Narrow", sans-serif';
      ctx.fillText('С Е Н Т Я Б Р Я', W / 2, 810);
      ctx.fillStyle = '#3d3830'; ctx.font = 'italic 46px "PT Serif", serif';
      wrap(ctx, phrase, W - 260).slice(0, 2).forEach((l, i) => ctx.fillText(l, W / 2, 900 + i * 58));
      ctx.font = '26px "PT Mono", monospace'; ctx.fillStyle = '#7a7266';
      ctx.fillText(stamp, W / 2, art - 88);
    } else {
      const [bg, acc] = AUTUMN[Math.floor(rnd() * AUTUMN.length)];
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, art);
      const leafColors = ['#d98a1f', '#c8553d', '#e8b64a', '#a8321e', '#f2c14e'];
      for (let i = 0; i < 26; i++) leaf(ctx, rnd() * W, rnd() * art, .8 + rnd() * 1.4, rnd() * 6.3, leafColors[Math.floor(rnd() * leafColors.length)]);
      ctx.fillStyle = 'rgba(0,0,0,.38)'; ctx.fillRect(0, 300, W, art - 340);
      ctx.fillStyle = acc; ctx.font = '520px Lobster, cursive';
      ctx.shadowColor = 'rgba(0,0,0,.4)'; ctx.shadowBlur = 24;
      ctx.fillText('3', W / 2, 700);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#f6efe0'; ctx.font = '110px Lobster, cursive';
      ctx.fillText('сентября', W / 2, 820);
      ctx.font = '54px Lobster, cursive';
      wrap(ctx, phrase, W - 200).forEach((l, i) => ctx.fillText(l, W / 2, 970 + i * 68));
      ctx.font = '700 30px "PT Sans Narrow", sans-serif'; ctx.fillStyle = 'rgba(246,239,224,.8)';
      ctx.fillText(stamp.toUpperCase(), W / 2, 90);
    }

    // рекламная плашка — на каждой открытке
    ctx.fillStyle = '#1e1c19'; ctx.fillRect(0, art, W, BAND);
    ctx.fillStyle = '#bd261e'; ctx.fillRect(0, art, W, 8);
    const qrSize = 170, qrX = W - 50 - qrSize, qrY = art + (BAND - qrSize) / 2 + 4;
    const hasQR = drawQR(ctx, qrX, qrY, qrSize);
    const textW = (hasQR ? qrX - 40 : W - 50) - 60;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#efebe1'; ctx.font = '700 58px "PT Sans Narrow", sans-serif';
    ctx.fillText('Оторви свой лист', 60, art + 88);
    ctx.fillStyle = '#c9c3b5'; ctx.font = '32px "PT Serif", serif';
    ctx.fillText('на сайте «Вечное 3 сентября»', 60, art + 136);
    ctx.fillStyle = '#e8a33a';
    let fs = 28;
    ctx.font = `${fs}px "PT Mono", monospace`;
    while (ctx.measureText(SITE_LABEL).width > textW && fs > 16) { fs--; ctx.font = `${fs}px "PT Mono", monospace`; }
    ctx.fillText(SITE_LABEL, 60, art + 186);

    return new Promise(res => cv.toBlob(b => res(b), 'image/png'));
  }

  let fontsReady = null;
  function ensureFonts() {
    if (!document.fonts) return Promise.resolve();
    fontsReady = fontsReady || Promise.race([
      Promise.all([
        document.fonts.load('100px Lobster'),
        document.fonts.load('700 100px "PT Sans Narrow"'),
        document.fonts.load('italic 40px "PT Serif"'),
        document.fonts.load('40px "PT Serif"'),
        document.fonts.load('24px "PT Mono"')
      ]),
      new Promise(r => setTimeout(r, 4000)) // шрифты не пришли — рисуем запасными
    ]).catch(() => {});
    return fontsReady;
  }

  let qrWait = null; // ждём библиотеку QR один раз, не дольше 3 секунд
  const qrReady = () => qrWait = qrWait || new Promise(r => {
    if (typeof window.qrcode === 'function') return r();
    let tries = 0;
    const iv = setInterval(() => { if (typeof window.qrcode === 'function' || ++tries > 30) { clearInterval(iv); r(); } }, 100);
  });

  let drawToken = 0;
  async function show() {
    const my = ++drawToken;
    $('pcShare').disabled = true;
    await Promise.all([ensureFonts(), qrReady()]);
    if (my !== drawToken) return;
    const b = await draw();
    if (!b || my !== drawToken) return;
    blob = b;
    file = new File([blob], fileName(), { type: 'image/png' }); // готовим заранее, чтобы «Отправить» сработало с первого тапа
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    blobUrl = URL.createObjectURL(blob);
    const frame = $('pcFrame');
    frame.innerHTML = '';
    const img = document.createElement('img');
    img.src = blobUrl; img.alt = 'Открытка с 3 сентября и ссылкой на сайт';
    frame.appendChild(img);
    const a = $('pcSave'); a.href = blobUrl; a.download = fileName();
    $('pcShare').disabled = false;
  }

  async function share() {
    if (!file) return;
    const text = `${phrase}\n${siteUrl}`;
    // телефон: системное меню «Поделиться» сразу с картинкой и подписью
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], text, title: 'Вечное 3 сентября' });
        return;
      } catch (e) {
        if (e && e.name === 'AbortError') return;
      }
    }
    // компьютер: картинка + подпись в буфер обмена, остаётся вставить в чат
    try {
      if (window.ClipboardItem && navigator.clipboard && navigator.clipboard.write) {
        await navigator.clipboard.write([new ClipboardItem({
          'image/png': blob,
          'text/plain': new Blob([text], { type: 'text/plain' })
        })]);
        toast('Открытка в буфере обмена. Вставьте в чат');
        return;
      }
    } catch (e) {
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        toast('Открытка в буфере обмена. Вставьте в чат');
        return;
      } catch (e2) {}
    }
    // совсем по-старинке: скачиваем
    $('pcSave').click();
    toast('Открытка скачана');
  }

  function init() {
    $('pcShare').addEventListener('click', share);
    $('pcNext').addEventListener('click', () => { variant++; show(); });
    $('pcSave').addEventListener('click', e => { if (!blobUrl) e.preventDefault(); });
    show();
  }

  window.Sep3.postcard = { init };
})();
