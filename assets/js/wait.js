/* =====================================================================
   BIT CRUSHER // wait.js
   Schermata di attesa tra terminale e sito, come le attese prepartita
   di Marathon. Siamo dentro una sfera wireframe che non ruota: a
   muoversi è la telecamera, che orbita lenta attorno a un punto focale
   leggermente spostato dal centro, guidata da rumore procedurale a più
   ottave (deriva lenta, vagare, tremore), non da keyframe.
   La sensazione di stare *dentro* viene dagli strati a profondità
   diverse che scorrono a velocità diverse (griglia sulla parete,
   particelle nel volume, banchi di nebbia) e dalla lente: proiezione
   fisheye con distorsione radiale, profondità di campo (bokeh davanti
   e dietro al fuoco), aberrazione cromatica ai bordi e vignettatura.
   Al centro il bersaglio segna il punto focale. Intanto i dati della
   telemetria vengono scaricati davvero (cache di BC.GH), così il sito
   parte con i dati pronti.
   ===================================================================== */
(function () {
  'use strict';

  const BC = window.BC;
  const C = BC.content;
  const D2R = Math.PI / 180;
  const FOV = 84;        // campo verticale della lente (gradi)
  const MIN_MS = 3200;   // durata minima: l'attesa deve leggersi
  const MAX_MS = 7500;   // oltre, i compiti non finiti risultano "lenti"
  const GAP_MS = 260;    // ritmo con cui i compiti compaiono come acquisiti
  const ZOOM_MS = 650;   // tuffo finale verso il punto focale

  /* ---------- rumore di gradiente 1D (Perlin) ---------- */
  const PERM = new Uint8Array(512);
  {
    const r = BC.rng(1987);
    const p = Array.from({ length: 256 }, (_, i) => i);
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }
    for (let i = 0; i < 512; i++) PERM[i] = p[i & 255];
  }
  const grad = (i) => PERM[i & 255] / 127.5 - 1;
  function noise(x) {
    const i = Math.floor(x);
    const f = x - i;
    const u = f * f * f * (f * (f * 6 - 15) + 10);
    return (grad(i) * f * (1 - u) + grad(i + 1) * (f - 1) * u) * 2;
  }
  const fbm = (x) => noise(x) * 0.62 + noise(x * 2.07 + 17.3) * 0.26 + noise(x * 4.13 + 41.9) * 0.12;

  /* ---------- vettori ---------- */
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const norm = (a) => {
    const l = Math.hypot(a[0], a[1], a[2]) || 1;
    return [a[0] / l, a[1] / l, a[2] / l];
  };
  const onSphere = (lat, lon, r = 1) => [r * Math.cos(lat) * Math.sin(lon), r * Math.sin(lat), r * Math.cos(lat) * Math.cos(lon)];
  const randomIn = (rng, rMin, rMax, flat = 1) => {
    const rad = rMin + Math.cbrt(rng()) * (rMax - rMin);
    const z = rng() * 2 - 1;
    const t = rng() * 2 * Math.PI;
    const s = Math.sqrt(1 - z * z);
    return [s * Math.cos(t) * rad, z * rad * flat, s * Math.sin(t) * rad];
  };

  /* ---------- strato 1: la parete (griglia della sfera, raggio 1) ---------- */
  const GRID = [];
  const EQUATOR = [];
  for (let lat = -75; lat <= 75; lat += 15) {
    const pts = [];
    for (let i = 0; i <= 96; i++) pts.push(onSphere(lat * D2R, (i / 96) * 2 * Math.PI));
    (lat === 0 ? EQUATOR : GRID).push(pts);
  }
  for (let lon = 0; lon < 360; lon += 15) {
    const pts = [];
    for (let i = 0; i <= 64; i++) pts.push(onSphere((-90 + (i / 64) * 180) * D2R, lon * D2R));
    GRID.push(pts);
  }
  const ORBITS = [[0.32, 1, 0.18], [-0.55, 0.42, 1]].map((n) => {
    const nn = norm(n);
    const a = norm(cross(nn, [0, 0, 1]));
    const b = cross(nn, a);
    const pts = [];
    for (let i = 0; i <= 128; i++) {
      const t = (i / 128) * 2 * Math.PI;
      pts.push([0, 1, 2].map((k) => (a[k] * Math.cos(t) + b[k] * Math.sin(t)) * 0.985));
    }
    return pts;
  });
  // nodi dei dati sulla parete
  const NODES = [[16, 18], [-20, 72], [28, 128], [-8, 186], [22, 240], [-26, 296], [6, 338]]
    .map(([la, lo]) => onSphere(la * D2R, lo * D2R, 0.97));

  /* ---------- strato 2: particelle sospese nel volume ---------- */
  const VOL = (() => {
    const r = BC.rng(77);
    return Array.from({ length: 520 }, () => ({ p: randomIn(r, 0.12, 0.95), acid: r() < 0.1 }));
  })();

  /* ---------- strato 3: banchi di nebbia ---------- */
  const FOG = (() => {
    const r = BC.rng(91);
    return Array.from({ length: 8 }, () => ({ p: randomIn(r, 0.3, 0.85, 0.6), size: 0.3 + r() * 0.32, a: 0.05 + r() * 0.05 }));
  })();

  // i compiti di preparazione: le chiamate di rete partono tutte subito
  const TASKS = [
    { label: 'Interfaccia', run: () => (document.fonts ? document.fonts.ready : null), ok: () => 'pronta' },
    { label: 'Repo', run: () => BC.GH.repo(), ok: (r) => `push ${BC.relTime(r.pushed_at)}` },
    { label: 'Commit', run: () => BC.GH.totalCommits(), ok: (n) => `${n} su ${C.repo.branch}` },
    { label: 'Storico', run: () => BC.GH.commits(50), ok: (l) => `${l.length} recenti` },
    { label: 'Pipeline CI', run: () => BC.GH.lastRun(), ok: (run) => BC.ciLabel(run) },
    { label: 'Pull request', run: () => BC.GH.pulls(), ok: (l) => `${l.length} aperte` },
    { label: 'README', run: () => BC.raw('README.md'), ok: (t) => `${t.split('\n').length} righe` },
    { label: 'Milestone', run: () => BC.GH.milestones(), ok: (l) => `${l.length} in repo` },
    // stesse richieste di repo.js (cache e richieste in corso condivise)
    { label: 'Contenuti', run: () => BC.Repo.load(), ok: (st) => `${st === 'offline' ? 'locali' : st === 'ok' ? 'dalla repo' : 'in parte locali'} · ${C.verbali.length} verbali · ${C.team.length} op` },
  ];

  BC.Wait = function Wait(root, onReady) {
    const cv = root.querySelector('[data-wait-canvas]');
    const ctx = cv.getContext('2d');
    const lockEl = root.querySelector('[data-wait-lock]');
    const camEl = root.querySelector('[data-wait-cam]');
    const listEl = root.querySelector('[data-wait-tasks]');
    const countEl = root.querySelector('[data-wait-count]');
    const barEl = root.querySelector('[data-wait-p]');
    const liveEl = root.querySelector('[data-wait-live]');
    const h = BC.h;

    // un solo orologio, performance.now() letto a ogni frame (t0 e clock si aggiornano in step)
    let W = 0, H = 0, dpr = 1, raf = 0, exiting = false, exitAt = 0, lastReveal = 0, lastHud = 0, readyCalled = false;
    let t0 = 0;
    let clock = 0;

    root.hidden = false;
    root.classList.remove('is-out');

    function layout() {
      dpr = Math.min(window.devicePixelRatio || 1, 1.25);
      W = root.clientWidth;
      H = root.clientHeight;
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    const ro = new ResizeObserver(layout);
    ro.observe(root);
    layout();

    const tasks = TASKS.map((tk, i) => {
      const item = { ...tk, i, state: 'wait', val: '', settled: false, result: null, failed: false, node: NODES[i % NODES.length] };
      item.li = h('li', null, h('span', { class: 'wait__st' }, '[..]'), h('span', { class: 'wait__name' }, tk.label), h('span', { class: 'wait__val' }, 'in corso'));
      Promise.resolve()
        .then(() => tk.run())
        .then((r) => { item.result = r; }, () => { item.failed = true; })
        .finally(() => { item.settled = true; });
      return item;
    });
    listEl.replaceChildren(...tasks.map((tk) => tk.li));
    countEl.textContent = `00/${BC.pad(tasks.length)}`;
    barEl.style.setProperty('--p', 0);
    lockEl.textContent = 'IN ATTESA DEL SEGNALE';
    BC.SFX.drone(true);

    function reveal(tk, timedOut) {
      if (timedOut || tk.failed) {
        tk.state = 'ko';
        tk.val = timedOut ? 'lenta' : 'offline';
      } else {
        tk.state = 'ok';
        try { tk.val = tk.ok(tk.result); } catch (e) { tk.val = 'ok'; }
      }
      tk.li.className = `is-${tk.state}`;
      tk.li.children[0].textContent = tk.state === 'ok' ? '[OK]' : '[--]';
      tk.li.children[2].textContent = tk.val;
      const n = tasks.filter((x) => x.state !== 'wait').length;
      countEl.textContent = `${BC.pad(n)}/${BC.pad(tasks.length)}`;
      barEl.style.setProperty('--p', (n / tasks.length).toFixed(3));
      lockEl.textContent = `${tk.state === 'ok' ? 'ACQUISITO' : 'NON RAGGIUNTO'} // ${tk.label} · ${tk.val}`;
      root.classList.remove('is-lock');
      void root.offsetWidth;
      root.classList.add('is-lock');
      liveEl.textContent = `Sincronizzazione: ${n} di ${tasks.length}`;
      BC.SFX.tick();
    }

    // telecamera: orbita attorno al punto focale, tutta da rumore
    function camera(t, fovDeg, zoom) {
      const F = [0.1 + 0.035 * fbm(t * 0.09 + 5), -0.06 + 0.025 * fbm(t * 0.08 + 9), 0.18 + 0.035 * fbm(t * 0.07 + 13)];
      const th = 0.6 + 1.1 * fbm(t * 0.11) + 0.07 * noise(t * 0.55 + 3) + 0.006 * noise(t * 2.7 + 7);
      const ph = 0.22 + 0.32 * fbm(t * 0.1 + 37) + 0.05 * noise(t * 0.6 + 11) + 0.005 * noise(t * 3.1 + 19);
      const rr = (0.44 + 0.07 * fbm(t * 0.09 + 71)) * (1 - 0.6 * zoom);
      const pos = [F[0] + rr * Math.cos(ph) * Math.sin(th), F[1] + rr * Math.sin(ph), F[2] + rr * Math.cos(ph) * Math.cos(th)];
      const f = norm(sub(F, pos));
      const r0 = norm(cross(f, [0, 1, 0]));
      const u0 = cross(r0, f);
      const roll = 0.07 * fbm(t * 0.12 + 113) + 0.004 * noise(t * 2.3 + 29);
      const cr = Math.cos(roll);
      const sr = Math.sin(roll);
      return {
        pos, f, F, focus: rr,
        r: [r0[0] * cr + u0[0] * sr, r0[1] * cr + u0[1] * sr, r0[2] * cr + u0[2] * sr],
        u: [u0[0] * cr - r0[0] * sr, u0[1] * cr - r0[1] * sr, u0[2] * cr - r0[2] * sr],
        fl: H / 2 / ((fovDeg * D2R) / 2),
        fov: fovDeg,
      };
    }

    // proiezione fisheye equidistante: il raggio sullo schermo cresce con
    // l'angolo dall'asse, non con la sua tangente. È la distorsione radiale
    // della lente che piega le linee della griglia.
    function project(p, cam, k = 1) {
      const d = sub(p, cam.pos);
      const x = dot(d, cam.r);
      const y = dot(d, cam.u);
      const z = dot(d, cam.f);
      const dist = Math.hypot(x, y, z) || 1e-6;
      const th = Math.acos(Math.max(-1, Math.min(1, z / dist)));
      if (th > 1.45) return null;
      const rr = Math.hypot(x, y) || 1e-6;
      const R = cam.fl * k * th;
      return [W / 2 + (x / rr) * R, H / 2 - (y / rr) * R, z, dist, th];
    }

    const fogOf = (dist) => Math.max(0, Math.min(1, 1.25 - 0.6 * dist));

    function strokeLines(list, cam, color, boost, { buckets = 6, k = 1, step = 1 } = {}) {
      const segs = Array.from({ length: buckets }, () => []);
      for (const pts of list) {
        let prev = project(pts[0], cam, k);
        for (let i = step; i < pts.length; i += step) {
          const cur = project(pts[i], cam, k);
          if (prev && cur && Math.abs(cur[0] - prev[0]) < W * 0.5 && Math.abs(cur[1] - prev[1]) < H * 0.5) {
            const a = Math.max(0.05, fogOf((prev[3] + cur[3]) / 2) * 0.92);
            segs[Math.min(buckets - 1, Math.floor(a * buckets))].push(prev[0], prev[1], cur[0], cur[1]);
          }
          prev = cur;
        }
      }
      ctx.strokeStyle = color;
      segs.forEach((s, b) => {
        if (!s.length) return;
        ctx.globalAlpha = Math.min(1, ((b + 0.5) / buckets) * boost);
        ctx.beginPath();
        for (let i = 0; i < s.length; i += 4) {
          ctx.moveTo(s[i], s[i + 1]);
          ctx.lineTo(s[i + 2], s[i + 3]);
        }
        ctx.stroke();
      });
      ctx.globalAlpha = 1;
    }

    function draw(now) {
      const t = BC.reduced ? 4 : (now - t0) / 1000;
      const z = exiting ? Math.min(1, (now - exitAt) / ZOOM_MS) : 0;
      const zoom = z * z * z;
      const cam = camera(t, FOV - 58 * zoom, zoom);
      const boost = 1 + zoom * 0.8;
      ctx.clearRect(0, 0, W, H);

      // luce diffusa attorno al fuoco
      const glow = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.7);
      glow.addColorStop(0, 'rgba(24, 80, 30, .32)');
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, H);

      // strato 3: nebbia, sprite morbidi che scorrono più lenti o più veloci
      ctx.globalCompositeOperation = 'lighter';
      for (const fg of FOG) {
        const s = project(fg.p, cam);
        if (!s) continue;
        const rad = cam.fl * Math.atan(fg.size / s[3]);
        const g = ctx.createRadialGradient(s[0], s[1], 0, s[0], s[1], rad);
        g.addColorStop(0, `rgba(70, 200, 110, ${(fg.a * fogOf(s[3] * 0.7)).toFixed(3)})`);
        g.addColorStop(1, 'rgba(70, 200, 110, 0)');
        ctx.fillStyle = g;
        ctx.fillRect(s[0] - rad, s[1] - rad, rad * 2, rad * 2);
      }
      ctx.globalCompositeOperation = 'source-over';

      // strato 1: la parete. Prima la frangia magenta (aberrazione cromatica:
      // la stessa griglia proiettata un filo più larga), poi il verde.
      ctx.lineWidth = 1;
      strokeLines(GRID, cam, '#ff2e63', 0.55 * boost, { buckets: 4, k: 1.012, step: 2 });
      strokeLines(GRID, cam, '#4fd44f', boost);
      ctx.lineWidth = 1.6;
      strokeLines(EQUATOR, cam, '#8cff7a', boost, { buckets: 3 });
      ctx.setLineDash([3, 6]);
      ctx.lineWidth = 1;
      strokeLines(ORBITS, cam, '#d4ff1e', boost * 0.9, { buckets: 3 });

      // collegamenti dal fuoco ai dati acquisiti
      const fc = project(cam.F, cam);
      for (const tk of tasks) {
        if (tk.state !== 'ok' || !fc) continue;
        const s = project(tk.node, cam);
        if (!s) continue;
        ctx.strokeStyle = '#d4ff1e';
        ctx.globalAlpha = 0.45;
        ctx.beginPath();
        ctx.moveTo(fc[0], fc[1]);
        ctx.lineTo(s[0], s[1]);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;

      // strato 2: particelle nel volume, con profondità di campo. Nitide
      // vicino alla distanza del fuoco, dischi sfocati (bokeh) davanti e dietro.
      for (const v of VOL) {
        const s = project(v.p, cam);
        if (!s) continue;
        const fa = fogOf(s[3]);
        if (fa < 0.03) continue;
        const coc = Math.min(28, (Math.max(0, Math.abs(s[3] - cam.focus) - 0.16) * 30) / s[3]);
        const base = Math.max(1, Math.min(4, 1.6 / s[3]));
        ctx.fillStyle = v.acid ? '#d4ff1e' : '#6fe06f';
        if (coc < 2) {
          ctx.globalAlpha = fa * 0.9;
          ctx.fillRect(s[0] - base / 2, s[1] - base / 2, base, base);
        } else {
          const rad = base + coc;
          ctx.globalAlpha = fa * Math.min(0.45, 7 / (rad * rad));
          ctx.beginPath();
          ctx.arc(s[0], s[1], rad, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;

      // nodi con etichetta: si spostano con la telecamera
      ctx.font = '600 10px "JetBrains Mono", monospace';
      ctx.textBaseline = 'middle';
      for (const tk of tasks) {
        const s = project(tk.node, cam);
        if (!s || s[0] < -60 || s[0] > W + 60 || s[1] < -20 || s[1] > H + 20) continue;
        const col = tk.state === 'ok' ? '#d4ff1e' : tk.state === 'ko' ? '#ff2e63' : '#4fd44f';
        const sz = Math.max(4, Math.min(9, 9 / s[3]));
        ctx.strokeStyle = col;
        ctx.fillStyle = col;
        ctx.globalAlpha = 0.4 + 0.6 * fogOf(s[3] * 0.8);
        ctx.strokeRect(s[0] - sz, s[1] - sz, sz * 2, sz * 2);
        if (tk.state !== 'wait') ctx.fillRect(s[0] - sz / 2, s[1] - sz / 2, sz, sz);
        ctx.beginPath();
        ctx.moveTo(s[0] + sz + 3, s[1]);
        ctx.lineTo(s[0] + sz + 14, s[1] - 10);
        ctx.stroke();
        ctx.fillText(`${tk.label.toUpperCase()} // ${tk.state === 'wait' ? 'in corso' : tk.val}`, s[0] + sz + 17, s[1] - 10);
      }
      ctx.globalAlpha = 1;

      // oggetto sul punto focale: ottaedro wireframe che gira piano
      if (fc) {
        const a = 0.014;
        const sp = t * 0.6;
        const cs = Math.cos(sp);
        const sn = Math.sin(sp);
        const V = [[a, 0, 0], [-a, 0, 0], [0, a, 0], [0, -a, 0], [0, 0, a], [0, 0, -a]]
          .map(([x, y, zz]) => project([cam.F[0] + x * cs - zz * sn, cam.F[1] + y, cam.F[2] + x * sn + zz * cs], cam));
        const E = [[0, 2], [0, 3], [0, 4], [0, 5], [1, 2], [1, 3], [1, 4], [1, 5], [2, 4], [4, 3], [3, 5], [5, 2]];
        ctx.strokeStyle = '#d4ff1e';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (const [i, j] of E) {
          if (!V[i] || !V[j]) continue;
          ctx.moveTo(V[i][0], V[i][1]);
          ctx.lineTo(V[j][0], V[j][1]);
        }
        ctx.stroke();
      }

      if (camEl && now - lastHud > 100) {
        lastHud = now;
        const f = (v) => (v >= 0 ? '+' : '-') + Math.abs(v).toFixed(3);
        camEl.textContent = `CAM X${f(cam.pos[0])} Y${f(cam.pos[1])} Z${f(cam.pos[2])} · FOV ${cam.fov.toFixed(0)}°`;
      }
    }

    function step() {
      const now = performance.now();
      if (!t0) t0 = now;
      clock = now;
      const el = now - t0;
      if (!exiting) {
        const next = tasks.find((tk) => tk.state === 'wait');
        if (next && now - lastReveal > GAP_MS && (next.settled || el > MAX_MS)) {
          reveal(next, !next.settled);
          lastReveal = now;
        }
        if (!next && el > (BC.reduced ? 800 : MIN_MS) && now - lastReveal > 480) startExit(false);
      }
      draw(now);
      if (exiting && now - exitAt >= ZOOM_MS) {
        if (!readyCalled) {
          readyCalled = true;
          onReady();
          root.classList.add('is-out');
          setTimeout(finish, 520);
        }
        return;
      }
      raf = requestAnimationFrame(step);
    }

    function startExit(fast) {
      if (exiting) return;
      exiting = true;
      exitAt = clock - (fast ? ZOOM_MS * 0.6 : 0);
      BC.SFX.drone(false);
      BC.SFX.granted();
    }

    function skip(e) {
      if (e.type === 'keydown' && !['Enter', 'Escape', ' '].includes(e.key)) return;
      if (e.type === 'keydown') e.preventDefault();
      startExit(true);
    }

    function finish() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('keydown', skip);
      root.removeEventListener('pointerdown', skip);
      root.hidden = true;
      root.classList.remove('is-out', 'is-lock');
    }

    window.addEventListener('keydown', skip);
    root.addEventListener('pointerdown', skip);
    raf = requestAnimationFrame(step);
  };
})();
