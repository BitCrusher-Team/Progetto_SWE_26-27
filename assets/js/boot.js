/* =====================================================================
   BIT CRUSHER // boot.js
   Stadio 1, fase rossa (come l'apertura di Cryo Archive): un orizzonte
   di voxel rossi e il teschio del logo che si compone mentre si tiene
   premuto. Al 100% la mandibola si spalanca e poi si chiude una volta
   sola, lenta ma con forza: l'impatto trasforma i bit in un'onda
   quantizzata che corre verso i lati, e qualche bit viene scaraventato
   via. Poi il "breach": mosaico rosso con le fasce gialle, nero, e il
   terminale.
   ===================================================================== */
(function () {
  'use strict';

  const BC = window.BC;
  const SK = BC.SKULL;
  const COL = { S: '#ff3348', s: '#8e1426', acid: '#ff3348', green: '#c80848', cyan: '#ff8a98' };
  const FILL_MS = 1600; // pressione necessaria per arrivare al 100%
  const DRAIN = 0.9;    // scarica al secondo quando si rilascia

  // coreografia del morso, in secondi dal 100%
  const T_OPEN = 0.34;           // la mandibola si spalanca (carica)
  const T_CLOSE = 0.62;          // chiusura unica: lenta, ma accelera fino all'impatto
  const T_HIT = T_OPEN + T_CLOSE;
  const T_WAVE = 1.3;            // durata dell'onda prima del flash
  const MX = 14;                 // colonna centrale della bocca
  const MY = SK.mouth;           // riga della bocca

  const clamp = (v) => Math.max(0, Math.min(1, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const easeOutBack = (t) => 1 + 2.4 * Math.pow(t - 1, 3) + 1.4 * Math.pow(t - 1, 2);
  const smooth = (a, b, x) => {
    const t = clamp((x - a) / (b - a));
    return t * t * (3 - 2 * t);
  };

  // apertura della mandibola in righe (positivo = aperta, -2 = denti chiusi)
  function jawAt(ct) {
    if (ct < T_OPEN) return 1.3 * easeOut(ct / T_OPEN);
    if (ct < T_HIT) return 1.3 - 3.3 * Math.pow((ct - T_OPEN) / T_CLOSE, 3.2);
    const d = ct - T_HIT;
    return -2 + 0.45 * Math.max(0, Math.sin(d * 16)) * Math.exp(-d * 7);
  }

  BC.Boot = function Boot(root, onDone) {
    const canvas = root.querySelector('[data-boot-canvas]');
    const ctx = canvas.getContext('2d');
    const pctEl = root.querySelector('[data-boot-pct]');
    const statusEl = root.querySelector('[data-boot-status]');
    const meters = root.querySelectorAll('[data-boot-p]');
    const glyphs = root.querySelector('[data-boot-glyphs]');
    const rnd = BC.rng(2627);

    if (glyphs && !glyphs.childElementCount) glyphs.appendChild(BC.glyphRow(9, 404));

    // soglia di accensione di ogni pixel: dall'alto verso il basso, con rumore
    const cells = SK.cells().map((c) => ({ ...c, th: (c.y / SK.h) * 0.5 + rnd() * 0.38 }));
    const bits = SK.burst(26, 210).map((b) => ({
      ...b, u: rnd(), v: rnd() * 0.8, ph: rnd() * 6.283, sp: 0.35 + rnd() * 0.8, q: rnd(),
      side: b.x < MX ? -1 : b.x > MX ? 1 : rnd() < 0.5 ? -1 : 1,
    }));
    const marks = Array.from({ length: 30 }, () => ({ a: rnd(), h: rnd(), f: rnd() }));

    let W = 0, H = 0, cs = 8, gap = 1, ox = 0, oy = 0, dpr = 1;
    let planet = null;
    // un solo orologio, performance.now() letto a ogni frame (t0 si fissa al primo)
    let p = 0, holding = false, done = false, crunchAt = 0, raf = 0, waved = false;
    let last = 0;
    let t0 = 0;

    function layout() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = root.clientWidth;
      H = root.clientHeight;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cs = Math.max(4, Math.floor(Math.min((H * 0.4) / SK.h, (W * 0.56) / SK.w)));
      gap = cs >= 7 ? 1 : 0;
      ox = Math.round(W / 2 - (SK.w * cs) / 2);
      oy = Math.round(H * 0.36 - (SK.h * cs) / 2);
      planet = makePlanet();
    }

    // superficie del pianeta: blocchi rossi su una texture larga il doppio,
    // fatta scorrere dentro un arco per simulare la rotazione
    function makePlanet() {
      const r = Math.max(W, H) * 1.3;
      const top = H * 0.83;
      const cy = top + r;
      const b = Math.max(9, Math.round(W / 84));
      const th = Math.ceil(H - top + b);
      const tex = document.createElement('canvas');
      tex.width = Math.ceil(W * 2);
      tex.height = th;
      const t = tex.getContext('2d');
      const shades = ['#5a0812', '#7a0a1a', '#a00d24', '#c80c2c', '#e0102c', '#ff3348', '#2a0408'];
      const R = BC.rng(77);
      for (let y = 0; y < th; y += b) {
        for (let x = 0; x < tex.width; x += b) {
          const depth = y / th;
          const k = Math.min(shades.length - 2, Math.floor(R() * 3 + (1 - depth) * 3.2));
          t.fillStyle = R() < 0.06 ? shades[6] : shades[k];
          const w = R() < 0.2 ? b * 2 : b;
          t.fillRect(x, y, w - 1, b - 1);
          if (R() < 0.12) {
            t.strokeStyle = 'rgba(255, 90, 110, .55)';
            t.strokeRect(x + 0.5, y + 0.5, w - 2, b - 2);
          }
        }
      }
      t.fillStyle = 'rgba(255, 70, 90, .35)';
      for (let y = b * 2; y < th; y += b * 4) t.fillRect(0, y, tex.width, 1);
      return { tex, cx: W / 2, cy, r, top };
    }

    function drawPlanet(t) {
      if (!planet) return;
      const { tex, cx, cy, r, top } = planet;
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.clip();
      const off = BC.reduced ? 0 : (t * 14) % W;
      ctx.globalAlpha = 0.9;
      ctx.drawImage(tex, -off, top);
      ctx.restore();
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, r, Math.PI * 1.1, Math.PI * 1.9);
      ctx.strokeStyle = 'rgba(255, 40, 60, .28)';
      ctx.lineWidth = 10;
      ctx.stroke();
      ctx.strokeStyle = '#ff3348';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.strokeStyle = '#ff3348';
      ctx.lineWidth = 1.4;
      for (const m of marks) {
        const ang = Math.PI * (1.2 + m.a * 0.6);
        const x = cx + Math.cos(ang) * r;
        const y = cy + Math.sin(ang) * r - 6 - m.h * 34;
        if (!BC.reduced && Math.sin(t * 3 + m.f * 9) > 0.86) continue;
        const s = 4 + m.f * 3;
        ctx.globalAlpha = 0.55 + m.f * 0.45;
        ctx.beginPath();
        ctx.moveTo(x - s, y - s); ctx.lineTo(x + s, y + s);
        ctx.moveTo(x + s, y - s); ctx.lineTo(x - s, y + s);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    // all'impatto: ogni bit diventa un punto dell'onda o un proiettile
    function prepareWave() {
      waved = true;
      const halfCells = W / 2 / cs + 6;
      for (const side of [-1, 1]) {
        const group = bits.filter((b) => b.side === side);
        group.forEach((b) => {
          const near = 1 - Math.min(1, Math.abs(b.x - MX) / 30);
          b.fly = !!b.mouth || b.q < 0.06 + near * 0.16;
        });
        const wave = group.filter((b) => !b.fly).sort((a, c) => Math.abs(a.x - MX) - Math.abs(c.x - MX));
        const span = Math.max(4, halfCells - 15);
        wave.forEach((b, i) => { b.wx = MX + side * (15 + ((i + 0.5) / wave.length) * span); });
        group.filter((b) => b.fly).forEach((b) => {
          b.vx = side * (46 + rnd() * 70);
          b.vy = -14 - rnd() * 34 + (b.mouth ? 10 : 0);
        });
      }
    }

    function slice() {
      const y = Math.random() * H;
      const hh = 3 + Math.random() * 26;
      const dx = (Math.random() - 0.5) * 44;
      ctx.drawImage(canvas, 0, y * dpr, canvas.width, hh * dpr, dx, y, W, hh);
    }

    function draw(now) {
      const t = (now - t0) / 1000;
      const ct = done ? (now - crunchAt) / 1000 : 0;
      const d = ct - T_HIT; // tempo dall'impatto (negativo prima)
      const e = done ? 1 : ease(p);
      ctx.clearRect(0, 0, W, H);

      // alone rosso dietro al teschio: fisso durante la carica, pulsa solo all'impatto
      const g = ctx.createRadialGradient(W / 2, oy + SK.h * cs * 0.45, 0, W / 2, oy + SK.h * cs * 0.45, SK.h * cs);
      g.addColorStop(0, `rgba(255, 30, 50, ${0.09 + (done && d > 0 ? 0.25 * Math.exp(-d * 4) : 0)})`);
      g.addColorStop(1, 'rgba(255, 30, 50, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);

      drawPlanet(t);

      // tremito: cresce durante la chiusura, scoppia all'impatto
      let sx = 0, sy = 0;
      if (!BC.reduced) {
        let amp = 0;
        if (!done) amp = p > 0.55 ? (p - 0.55) * 5 : 0;
        else if (d < 0) amp = ct > T_OPEN ? 2.6 * Math.pow((ct - T_OPEN) / T_CLOSE, 2) : 0;
        else amp = 13 * Math.exp(-d * 6);
        if (amp) {
          sx = (Math.random() - 0.5) * amp;
          sy = (Math.random() - 0.5) * amp;
        }
      }
      if (done && d >= 0 && !waved) prepareWave();

      const drift = BC.reduced ? 0 : 1 - e;
      for (const b of bits) {
        if (b.mouth && !done && p < 0.92) continue;
        let x, y, w = b.w, color = COL[b.k], alpha;
        if (!waved) {
          const fx = b.u * (W / cs) - ox / cs;
          const fy = b.v * (H / cs) - oy / cs;
          x = lerp(fx, b.x, e) + Math.sin(t * b.sp + b.ph) * 0.8 * drift;
          y = lerp(fy, b.y, e) + Math.cos(t * b.sp * 0.8 + b.ph) * 0.8 * drift;
          if (done) {
            // la bocca risucchia i bit mentre si carica e si chiude
            const pull = 0.12 * easeOut(clamp(ct / T_OPEN)) + 0.3 * Math.pow(clamp((ct - T_OPEN) / T_CLOSE), 2);
            x = lerp(x, MX, pull);
            y = lerp(y, MY, pull);
          }
          if ((holding || done) && !BC.reduced) {
            const j = done ? 0.4 : 0.3 * p;
            x += (Math.random() - 0.5) * j;
            y += (Math.random() - 0.5) * j;
          }
          b.cx = x;
          b.cy = y;
          alpha = 0.3 + 0.7 * e;
        } else if (b.fly) {
          // scaraventati ai lati, frenati dall'aria e tirati giù
          const k = 1.4;
          const f = (1 - Math.exp(-k * d)) / k;
          x = b.cx + b.vx * f;
          y = b.cy + b.vy * f + 30 * d * d;
          w = b.w + Math.min(4, Math.abs(b.vx) * Math.exp(-k * d) * 0.05);
          alpha = 1;
          if (d < 0.12) color = '#ffe3e7';
        } else {
          // onda quantizzata che corre verso l'esterno e si spegne
          const X = b.wx + b.side * d * 5;
          const dist = Math.max(0, Math.abs(X - MX) - 15);
          const amp = 7.5 * (1 - Math.exp(-d * 9)) * Math.exp(-d * 1.1) * Math.exp(-dist / 85) * smooth(0, 5, dist);
          const Y = MY + amp * Math.sin(dist * 0.3 - d * 10.5);
          const s = easeOutBack(clamp(d / 0.32));
          x = lerp(b.cx, X, s);
          y = lerp(b.cy, Y, s);
          if (s >= 1) {
            x = Math.round(x);
            y = Math.round(y);
          }
          alpha = 1;
          if (d < 0.1) color = '#ffe3e7';
        }
        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        ctx.fillRect(ox + x * cs + sx, oy + y * cs + sy, Math.max(1, w * cs - gap), cs - gap);
      }

      // onda d'urto
      if (done && d >= 0 && d < 0.55 && !BC.reduced) {
        const k = d / 0.55;
        ctx.globalAlpha = 0.6 * (1 - k);
        ctx.strokeStyle = '#ff3348';
        ctx.lineWidth = 2;
        ctx.beginPath();
        const rx = 30 + k * W * 0.75;
        ctx.ellipse(ox + MX * cs + cs / 2, oy + MY * cs, rx, rx * 0.32, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // teschio: fantasma all'8%, i pixel si accendono superata la soglia
      const jaw = done ? jawAt(ct) : 0;
      const flash = done && d >= 0 && d < 0.08;
      for (const c of cells) {
        const on = done || p >= c.th;
        const flick = !on && p > 0 && p > c.th - 0.07 && Math.random() < 0.45;
        ctx.globalAlpha = on ? 1 : flick ? 0.6 : 0.08;
        ctx.fillStyle = flash ? '#ffd5da' : COL[c.c];
        const y = c.y >= SK.jaw ? c.y + jaw : c.y;
        ctx.fillRect(ox + c.x * cs + sx, oy + y * cs + sy, cs - gap, cs - gap);
      }
      ctx.globalAlpha = 1;

      if (!BC.reduced && ((holding && p > 0.7) || (done && d >= 0 && d < 0.35)) && Math.random() < 0.35) slice();
    }

    function meter() {
      pctEl.textContent = BC.pad(Math.round(p * 100), 3);
      meters.forEach((m) => m.style.setProperty('--p', p.toFixed(3)));
    }

    function setStatus(txt) {
      statusEl.textContent = txt;
    }

    function loop() {
      const now = performance.now();
      if (!t0) t0 = last = now;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!done) {
        p = holding ? Math.min(1, p + (dt * 1000) / FILL_MS) : Math.max(0, p - dt * DRAIN);
        BC.SFX.holdUpdate(p);
        meter();
        if (p >= 1) complete(now);
      }
      draw(now);
      raf = requestAnimationFrame(loop);
    }

    function start() {
      if (done || holding) return;
      holding = true;
      root.classList.add('is-holding');
      BC.SFX.holdStart();
      setStatus('INIZIALIZZAZIONE');
    }

    function end() {
      if (!holding) return;
      holding = false;
      root.classList.remove('is-holding');
      BC.SFX.holdStop();
      if (!done) setStatus(p > 0.02 ? 'SEGNALE PERSO // RIPROVA' : 'IN ATTESA DI OPERATORE');
    }

    function complete(now) {
      done = true;
      holding = false;
      crunchAt = now;
      p = 1;
      meter();
      root.classList.remove('is-holding');
      root.classList.add('is-done');
      BC.SFX.holdStop();
      BC.SFX.bite(T_HIT);
      setStatus('MORSO');
      const ms = (s) => (BC.reduced ? Math.min(400, s * 300) : s * 1000);
      setTimeout(() => setStatus('ACCESSO AL KERNEL'), ms(T_HIT));
      setTimeout(() => root.classList.add('is-flash'), ms(T_HIT + T_WAVE - 0.12));
      setTimeout(() => {
        stopLoop();
        breach(() => finish());
      }, ms(T_HIT + T_WAVE + 0.18));
    }

    /* ---- breach: mosaico rosso/rosa con fasce gialle ---- */
    function breach(next) {
      const el = root.querySelector('[data-breach]');
      const cv = el.querySelector('[data-breach-canvas]');
      const bctx = cv.getContext('2d');
      const id = Array.from({ length: 7 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789'[Math.floor(Math.random() * 33)]).join('');
      el.querySelector('[data-breach-id]').textContent = `ID: ${id}`;
      el.hidden = false;
      root.classList.remove('is-flash');
      // il mosaico riempie solo la fascia centrale (.breach__field, misure nel
      // CSS), sempre a celle quadrate; sopra e sotto resta il nero
      const cell = Math.max(18, Math.round(Math.min(W, H) / 22));
      const cols = Math.ceil((cv.clientWidth || W) / cell);
      const rows = Math.ceil((cv.clientHeight || H) / cell);
      cv.width = cols;
      cv.height = rows;
      const pal = ['#cc0c2c', '#d0103a', '#c80848', '#e0306a', '#8c0a20', '#5a0812', '#2a0408'];
      const region = [];
      for (let i = 0; i < Math.ceil(cols / 3) * Math.ceil(rows / 3); i++) region.push(Math.random());
      const pick = (x, y) => {
        const rg = region[Math.floor(y / 3) * Math.ceil(cols / 3) + Math.floor(x / 3)];
        const n = Math.random();
        if (rg < 0.18) return n < 0.6 ? pal[5] : pal[4];
        if (rg < 0.42) return n < 0.7 ? pal[2] : pal[3];
        return n < 0.75 ? pal[0] : n < 0.9 ? pal[1] : pal[6];
      };
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        bctx.fillStyle = pick(x, y);
        bctx.fillRect(x, y, 1, 1);
      }
      BC.SFX.alarm();
      const timer = BC.reduced ? 0 : setInterval(() => {
        for (let i = 0; i < cols * rows * 0.1; i++) {
          const x = Math.floor(Math.random() * cols);
          const y = Math.floor(Math.random() * rows);
          bctx.fillStyle = pick(x, y);
          bctx.fillRect(x, y, 1, 1);
        }
        if (Math.random() < 0.4) {
          const y = Math.floor(Math.random() * rows);
          bctx.drawImage(cv, 0, y, cols, 1, Math.random() < 0.5 ? -1 : 1, y, cols, 1);
        }
      }, 70);
      setTimeout(() => el.classList.add('is-cut'), BC.reduced ? 300 : 1350);
      setTimeout(() => {
        clearInterval(timer);
        el.hidden = true;
        canvas.style.opacity = '0';
        root.querySelector('.boot__center').style.visibility = 'hidden';
        root.querySelector('.boot__hud').style.visibility = 'hidden';
      }, BC.reduced ? 600 : 1700);
      setTimeout(next, BC.reduced ? 700 : 2050);
    }

    function onPointerDown(e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (e.target.closest('[data-boot-ctl]') || done) return;
      e.preventDefault();
      try { root.setPointerCapture(e.pointerId); } catch (_) { /* non supportato */ }
      start();
    }

    function onKey(e) {
      if (e.key !== ' ' && e.key !== 'Enter' && e.code !== 'Space') return;
      if (e.target.closest && e.target.closest('[data-boot-ctl]')) return;
      e.preventDefault();
      if (e.type === 'keydown') {
        if (!e.repeat) start();
      } else end();
    }

    const noMenu = (e) => e.preventDefault();
    const ro = new ResizeObserver(layout);

    function stopLoop() {
      cancelAnimationFrame(raf);
      ro.disconnect();
    }

    function finish(res) {
      stopLoop();
      root.removeEventListener('pointerdown', onPointerDown);
      root.removeEventListener('pointerup', end);
      root.removeEventListener('pointercancel', end);
      root.removeEventListener('lostpointercapture', end);
      root.removeEventListener('contextmenu', noMenu);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
      window.removeEventListener('blur', end);
      BC.SFX.holdStop();
      onDone(res);
    }

    root.addEventListener('pointerdown', onPointerDown);
    root.addEventListener('pointerup', end);
    root.addEventListener('pointercancel', end);
    root.addEventListener('lostpointercapture', end);
    root.addEventListener('contextmenu', noMenu);
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    window.addEventListener('blur', end);
    root.querySelector('[data-boot-skip]').addEventListener('click', () => finish({ skip: true }));

    // aggancio per le verifiche headless: porta subito la carica al 100%
    root.bootComplete = () => {
      if (!done) complete(performance.now());
    };

    ro.observe(root);
    layout();
    meter();
    setStatus('IN ATTESA DI OPERATORE');
    root.querySelector('#boot-hold').focus({ preventScroll: true });
    raf = requestAnimationFrame(loop);
  };
})();
