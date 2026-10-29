/* =====================================================================
   BIT CRUSHER // lib.js
   Utilità condivise: DOM, storage, formattazione, effetti, audio,
   API GitHub (sola lettura) e sprite del teschio.
   ===================================================================== */
(function () {
  'use strict';

  const BC = (window.BC = window.BC || {});
  const C = (BC.content = window.BC_CONTENT || {});
  const R = C.repo || {};

  BC.reduced = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* ---------- DOM ---------- */
  function append(el, kids) {
    for (const k of kids.flat(Infinity)) {
      if (k == null || k === false) continue;
      el.appendChild(k instanceof Node ? k : document.createTextNode(String(k)));
    }
    return el;
  }

  // h('a', { href, class, onclick }, ...figli): crea nodi senza innerHTML
  BC.h = function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const k in attrs || {}) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'style' && typeof v === 'object') {
        for (const p in v) {
          if (p.startsWith('--')) el.style.setProperty(p, v[p]);
          else el.style[p] = v[p];
        }
      } else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    return append(el, kids);
  };

  const SVGNS = 'http://www.w3.org/2000/svg';
  BC.s = function s(tag, attrs, ...kids) {
    const el = document.createElementNS(SVGNS, tag);
    for (const k in attrs || {}) if (attrs[k] != null) el.setAttribute(k, attrs[k]);
    return append(el, kids);
  };

  BC.$ = (sel, root = document) => root.querySelector(sel);
  BC.$$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  BC.sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // Segnaposto per i valori ancora da definire (null nei contenuti)
  BC.tbd = (label) => BC.h('span', { class: 'tbd' }, label || 'Da definire');
  BC.val = (v, label) => (v == null || v === '' ? BC.tbd(label) : v);

  // Testo con i segnaposto del README ("[Prematuro]", "[Espansione in corso]"…)
  // trasformati in chip, e `codice` tra backtick
  BC.PLACEHOLDER = /\[(?:prematuro|espansione|da definire|tbd)[^\]]*\]/gi;
  BC.rich = function (text) {
    const out = [];
    String(text == null ? '' : text).split(/(`[^`]+`)/).forEach((part) => {
      if (/^`[^`]+`$/.test(part)) {
        out.push(BC.h('code', { class: 'inl' }, part.slice(1, -1)));
        return;
      }
      let last = 0;
      part.replace(BC.PLACEHOLDER, (m, at) => {
        if (at > last) out.push(part.slice(last, at));
        out.push(BC.h('span', { class: 'tbd', title: m.slice(1, -1) }, 'Da definire'));
        const note = m.slice(1, -1).split(/,\s*/).slice(1).join(', ');
        if (note) out.push(BC.h('span', { class: 'dim' }, ` ${note}`));
        last = at + m.length;
        return m;
      });
      if (last < part.length) out.push(part.slice(last));
    });
    return out;
  };

  /* ---------- storage (può essere bloccato: mai fidarsi) ---------- */
  function safe(fn, fallback) {
    try { return fn(); } catch (e) { return fallback; }
  }
  BC.store = {
    get: (k) => safe(() => localStorage.getItem(k), null),
    set: (k, v) => safe(() => localStorage.setItem(k, v)),
    sget: (k) => safe(() => sessionStorage.getItem(k), null),
    sset: (k, v) => safe(() => sessionStorage.setItem(k, v)),
    sdel: (k) => safe(() => sessionStorage.removeItem(k)),
  };

  /* ---------- numeri casuali deterministici ---------- */
  BC.hash = function (str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  };
  BC.rng = function (seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  /* ---------- formattazione ---------- */
  BC.pad = (n, w = 2) => String(n).padStart(w, '0');
  BC.fmtDate = (iso) => {
    const [y, m, d] = String(iso).slice(0, 10).split('-');
    return `${d}.${m}.${y}`;
  };

  const TZ = 'Europe/Rome';
  const fmtParts = new Intl.DateTimeFormat('it-IT', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  });
  BC.parts = function (date) {
    const o = {};
    for (const p of fmtParts.formatToParts(date)) o[p.type] = p.value;
    return o;
  };
  BC.dayKey = (date) => {
    const p = BC.parts(date);
    return `${p.year}-${p.month}-${p.day}`;
  };
  BC.clock = (date = new Date()) => {
    const p = BC.parts(date);
    return `${p.day}.${p.month}.${p.year} // ${p.hour}:${p.minute}:${p.second}`;
  };
  BC.dateTime = (date) => {
    const p = BC.parts(new Date(date));
    return `${p.day}.${p.month}.${p.year} ${p.hour}:${p.minute}`;
  };
  BC.relTime = (date) => {
    const s = Math.round((Date.now() - new Date(date).getTime()) / 1000);
    if (s < 60) return 'ora';
    const m = Math.round(s / 60);
    if (m < 60) return `${m} min fa`;
    const h = Math.round(m / 60);
    if (h < 24) return `${h} h fa`;
    const d = Math.round(h / 24);
    if (d < 30) return d === 1 ? '1 giorno fa' : `${d} giorni fa`;
    const mo = Math.round(d / 30);
    return mo === 1 ? '1 mese fa' : `${mo} mesi fa`;
  };

  /* ---------- URL della repo di progetto ---------- */
  const enc = (p) => p.split('/').map(encodeURIComponent).join('/');
  BC.repoUrl = `https://github.com/${R.owner}/${R.name}`;
  BC.repoSlug = `${R.owner}/${R.name}`;
  BC.fileUrl = (p) => `${BC.repoUrl}/blob/${R.branch}/${enc(p)}`;
  BC.treeUrl = (p) => `${BC.repoUrl}/tree/${R.branch}/${enc(p)}`;
  BC.issueUrl = (tpl) => `${BC.repoUrl}/issues/new?template=${encodeURIComponent(tpl)}`;
  BC.userUrl = (u) => `https://github.com/${encodeURIComponent(u)}`;

  /* ---------- sezioni del sito (nav, intestazioni, terminale) ---------- */
  // sub: il "sottotitolo" mostrato in basso, come nel video, quando la sezione è a schermo
  BC.sections = [
    { id: 'home', num: '00', label: 'Home', en: 'INDEX', jp: '起動', sub: 'Bit Crusher. Progetto di Ingegneria del Software.' },
    { id: 'panoramica', num: '01', label: 'Panoramica', en: 'OVERVIEW', jp: '概要', sub: 'Lo stato del progetto, a colpo d\'occhio.' },
    { id: 'capitolati', num: '02', label: 'Capitolati', en: 'PROPOSALS', jp: '仕様書', sub: () => `${(C.capitolati || []).length} proposte. ${(C.priorita || []).length} priorità.` },
    { id: 'documenti', num: '03', label: 'Documenti', en: 'RECORDS', jp: '記録', sub: 'Ogni riunione lascia una traccia.' },
    { id: 'processo', num: '04', label: 'Processo', en: 'WAY OF WORKING', jp: '作業方法', sub: 'Le regole del gioco, verificate dalla CI.' },
    { id: 'squadra', num: '05', label: 'Squadra', en: 'OPERATORS', jp: '仲間', sub: () => `${(C.team || []).length} operatori. Ruoli a rotazione.` },
    { id: 'telemetria', num: '06', label: 'Telemetria', en: 'TELEMETRY', jp: '遠隔測定', sub: 'Il segnale della repo, in tempo reale.' },
    { id: 'setup', num: '07', label: 'Setup', en: 'PROCEDURE', jp: '手順', sub: 'Pronti a clonare.' },
  ];

  /* ---------- effetti testuali e micrografiche ---------- */
  const NOISE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=/<>';
  BC.scramble = function (el, text, duration = 650) {
    text = text == null ? el.textContent : text;
    if (BC.reduced) {
      el.textContent = text;
      return Promise.resolve();
    }
    el.setAttribute('aria-label', text);
    const start = performance.now();
    const n = Math.max(1, text.length - 1);
    return new Promise((done) => {
      function frame(now) {
        const t = Math.min(1, (now - start) / duration);
        let out = '';
        for (let i = 0; i < text.length; i++) {
          const ch = text[i];
          out += ch === ' ' || t >= (i / n) * 0.8 + 0.2 ? ch : NOISE[(Math.random() * NOISE.length) | 0];
        }
        el.textContent = out;
        if (t < 1) requestAnimationFrame(frame);
        else {
          el.removeAttribute('aria-label');
          done();
        }
      }
      requestAnimationFrame(frame);
    });
  };

  // Codice a barre decorativo e deterministico (stessa stringa, stesse barre)
  BC.barcode = function (str, width = 96, height = 18) {
    const rnd = BC.rng(BC.hash(String(str)));
    let d = '';
    let x = 0;
    while (true) {
      const w = 1 + Math.floor(rnd() * 3);
      if (x + w > width) break;
      d += `M${x} 0h${w}v${height}h-${w}z`;
      x += w + 1 + Math.floor(rnd() * 2);
    }
    return BC.s('svg', { class: 'barcode', viewBox: `0 0 ${width} ${height}`, preserveAspectRatio: 'none', 'aria-hidden': 'true' },
      BC.s('path', { d, fill: 'currentColor' }));
  };

  // Fila di glifi (simboli SVG definiti in index.html)
  const GLYPHS = ['x', 'sq', 'ring', 'dia', 'tri', 'bars', 'plus', 'dot', 'half'];
  BC.glyphRow = function (n, seed = 7) {
    const rnd = BC.rng(seed);
    const wrap = BC.h('span', { class: 'glyphs', 'aria-hidden': 'true' });
    for (let i = 0; i < n; i++) {
      const id = GLYPHS[Math.floor(rnd() * GLYPHS.length)];
      wrap.appendChild(BC.s('svg', { class: 'g', viewBox: '0 0 10 10' }, BC.s('use', { href: '#g-' + id })));
    }
    return wrap;
  };

  BC.copy = async function (text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      const ta = BC.h('textarea', { style: { position: 'fixed', opacity: '0', top: '0' } });
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (_) { /* niente */ }
      ta.remove();
      return ok;
    }
  };

  /* ---------- convenzioni di commit (porting di .github/workflows/ci.yml) ---------- */
  BC.commitTypes = (C.processo && C.processo.tipiCommit || []).map((t) => t.tipo);

  // regole della CI sul titolo delle PR: quelle di content.js, che repo.js
  // sostituisce con quelle lette da ci.yml e .spr.yml della repo
  BC.ci = { lunghezzaMax: null, troncamentoSpr: true, merge: 'squash', ...((C.processo && C.processo.ci) || {}) };
  BC.GH_HEADLINE = 72; // oltre questa lunghezza GitHub tronca il titolo con «…»

  // Stessa logica e stessi messaggi della CI: lunghezza (se c'è un limite),
  // punto finale, segmenti
  BC.validateTitle = function (title) {
    const max = BC.ci.lunghezzaMax;
    const sp = ' \\t\\n\\v\\f\\r';
    const segRe = new RegExp(`^(${BC.commitTypes.join('|')})(\\([A-Za-z0-9_./+-]+\\))?!?: [^A-Z${sp};]([^;]*[^${sp};])?$`);
    const len = Array.from(title).length;
    const endsDot = title.endsWith('.');
    const segments = [];
    let rest = endsDot ? title.slice(0, -1) : title;
    for (;;) {
      const i = rest.indexOf('; ');
      const text = i < 0 ? rest : rest.slice(0, i);
      // scomposizione solo per la visualizzazione: accetta il "!" anche prima dello scope
      const m = /^([^(!:\s]*)(!)?(\(([^)]*)\))?(!)?:\s?(.*)$/.exec(text);
      segments.push({
        text,
        ok: segRe.test(text),
        type: m ? m[1] : null,
        scope: m ? m[4] || null : null,
        breaking: !!(m && (m[2] || m[5])),
        desc: m ? m[6] : text,
      });
      if (i < 0) break;
      rest = rest.slice(i + 2);
    }
    let error = null;
    if (max && len > max) error = `titolo di ${len} caratteri (max ${max}): accorcia il subject del commit, i dettagli vanno nel body`;
    else if (!endsDot) error = "il titolo deve terminare con '.'";
    else {
      const bad = segments.findIndex((s) => !s.ok);
      if (bad >= 0) error = `segmento ${bad + 1} non valido: '${segments[bad].text}'`;
    }
    // con spr: come apparirà il titolo dopo il troncamento di GitHub (indicativo)
    const truncated = BC.ci.troncamentoSpr && len > BC.GH_HEADLINE
      ? `${Array.from(title).slice(0, BC.GH_HEADLINE).join('')}…`
      : null;
    return { ok: !error, error, len, max, endsDot, segments, truncated };
  };

  // Tipi dei segmenti di un messaggio di commit ("feat(x): a; fix: b.")
  BC.parseCommit = function (message) {
    const subject = String(message).split('\n')[0];
    const segs = subject.replace(/\.$/, '').split('; ').map((sg) => {
      const m = /^([a-z]+)(\(([^)]*)\))?(!)?(\(([^)]*)\))?:\s*(.*)$/i.exec(sg);
      return m
        ? { type: m[1].toLowerCase(), scope: m[3] || m[6] || null, breaking: !!m[4], desc: m[7] }
        : { type: null, scope: null, breaking: false, desc: sg };
    });
    return { subject, segs, types: segs.map((s) => s.type).filter(Boolean) };
  };

  /* ---------- audio: sintesi WebAudio, nessun file esterno ---------- */
  function crushCurve(bits) {
    const n = 2048;
    const steps = Math.pow(2, bits) / 2;
    const c = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * 2 - 1;
      c[i] = Math.round(x * steps) / steps;
    }
    return c;
  }

  const SFX = (BC.SFX = {
    ctx: null,
    out: null,
    hold: null,
    enabled: BC.store.get('bc.sound') !== 'off',
    listeners: [],
    ensure() {
      if (!this.enabled) return null;
      // il browser blocca l'audio finché l'utente non interagisce con la pagina
      if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return null;
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        this.ctx = new AC();
        this.out = this.ctx.createGain();
        this.out.gain.value = 0.16;
        this.out.connect(this.ctx.destination);
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return this.ctx;
    },
    set(on) {
      this.enabled = on;
      BC.store.set('bc.sound', on ? 'on' : 'off');
      if (!on) this.holdStop();
      this.listeners.forEach((f) => f(on));
    },
    toggle() {
      this.set(!this.enabled);
      return this.enabled;
    },
    onChange(f) {
      this.listeners.push(f);
    },
    tone(freq, dur, { type = 'square', vol = 0.2, slide = 0, delay = 0 } = {}) {
      const ctx = this.ensure();
      if (!ctx) return;
      const t = ctx.currentTime + delay;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(this.out);
      o.start(t);
      o.stop(t + dur + 0.02);
    },
    noise(dur, { vol = 0.3, freq = 1200, q = 0.7, delay = 0 } = {}) {
      const ctx = this.ensure();
      if (!ctx) return;
      const t = ctx.currentTime + delay;
      const len = Math.ceil(ctx.sampleRate * dur);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = freq;
      f.Q.value = q;
      const g = ctx.createGain();
      g.gain.value = vol;
      src.connect(f).connect(g).connect(this.out);
      src.start(t);
    },
    key() { this.tone(1500 + Math.random() * 700, 0.016, { vol: 0.05 }); },
    tick() { this.tone(2300, 0.012, { vol: 0.035, type: 'triangle' }); },
    blip() { this.tone(980, 0.05, { vol: 0.08 }); },
    error() {
      this.tone(150, 0.16, { type: 'sawtooth', vol: 0.1 });
      this.tone(112, 0.2, { type: 'sawtooth', vol: 0.09, delay: 0.08 });
    },
    granted() {
      [392, 523, 659, 1046].forEach((f, i) => this.tone(f, 0.14, { vol: 0.07, delay: i * 0.075 }));
    },
    alarm() {
      for (let i = 0; i < 6; i++) this.tone(i % 2 ? 660 : 880, 0.11, { vol: 0.06, delay: i * 0.13 });
      this.noise(0.5, { vol: 0.25, freq: 400, q: 0.6 });
    },
    crunch() {
      this.noise(0.38, { vol: 0.6, freq: 850, q: 0.5 });
      this.tone(96, 0.42, { vol: 0.24, slide: -64 });
      this.noise(0.12, { vol: 0.4, freq: 3400, q: 1, delay: 0.13 });
      this.noise(0.12, { vol: 0.35, freq: 2600, q: 1, delay: 0.3 });
    },
    // morso unico: ringhio che sale mentre la mandibola si chiude, impatto
    // a `hit` secondi, poi un basso "frantumato" che oscilla come l'onda
    bite(hit = 0.96) {
      const ctx = this.ensure();
      if (!ctx) return;
      const t = ctx.currentTime;
      const growl = ctx.createOscillator();
      growl.type = 'sawtooth';
      growl.frequency.setValueAtTime(42, t);
      growl.frequency.exponentialRampToValueAtTime(96, t + hit);
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(220, t);
      lp.frequency.linearRampToValueAtTime(900, t + hit);
      const gg = ctx.createGain();
      gg.gain.setValueAtTime(0.0001, t);
      gg.gain.exponentialRampToValueAtTime(0.16, t + hit - 0.05);
      gg.gain.exponentialRampToValueAtTime(0.0001, t + hit + 0.04);
      growl.connect(lp).connect(gg).connect(this.out);
      growl.start(t);
      growl.stop(t + hit + 0.08);

      this.noise(0.42, { vol: 0.7, freq: 700, q: 0.5, delay: hit });
      const kick = ctx.createOscillator();
      kick.frequency.setValueAtTime(130, t + hit);
      kick.frequency.exponentialRampToValueAtTime(38, t + hit + 0.34);
      const kg = ctx.createGain();
      kg.gain.setValueAtTime(0.0001, t + hit);
      kg.gain.exponentialRampToValueAtTime(0.5, t + hit + 0.01);
      kg.gain.exponentialRampToValueAtTime(0.0001, t + hit + 0.38);
      kick.connect(kg).connect(this.out);
      kick.start(t + hit);
      kick.stop(t + hit + 0.42);

      const wob = ctx.createOscillator();
      wob.type = 'sawtooth';
      wob.frequency.value = 68;
      const sh = ctx.createWaveShaper();
      sh.curve = crushCurve(3);
      const wg = ctx.createGain();
      wg.gain.setValueAtTime(0.0001, t + hit);
      wg.gain.exponentialRampToValueAtTime(0.14, t + hit + 0.06);
      wg.gain.exponentialRampToValueAtTime(0.0001, t + hit + 1.4);
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 6;
      const lg = ctx.createGain();
      lg.gain.value = 22;
      lfo.connect(lg).connect(wob.frequency);
      wob.connect(sh).connect(wg).connect(this.out);
      wob.start(t + hit);
      lfo.start(t + hit);
      wob.stop(t + hit + 1.45);
      lfo.stop(t + hit + 1.45);
    },
    // bordone basso della schermata di attesa
    drone(on) {
      if (!on) {
        if (this.dr) {
          const t = this.ctx.currentTime;
          this.dr.g.gain.setTargetAtTime(0.0001, t, 0.15);
          this.dr.o.forEach((o) => o.stop(t + 0.8));
          this.dr = null;
        }
        return;
      }
      const ctx = this.ensure();
      if (!ctx || this.dr) return;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.setTargetAtTime(0.03, ctx.currentTime, 0.4);
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 380;
      const o = [55, 82.4, 110.6].map((f) => {
        const osc = ctx.createOscillator();
        osc.type = f > 100 ? 'triangle' : 'sine';
        osc.frequency.value = f;
        osc.connect(lp);
        osc.start();
        return osc;
      });
      lp.connect(g).connect(this.out);
      this.dr = { g, o };
    },
    // Ronzio del "tieni premuto": oscillatori passati in un bitcrusher
    // che riduce i bit man mano che la carica sale.
    holdStart() {
      const ctx = this.ensure();
      if (!ctx || this.hold) return;
      const o = ctx.createOscillator();
      const o2 = ctx.createOscillator();
      o.type = 'sawtooth';
      o2.type = 'square';
      o.frequency.value = 55;
      o2.frequency.value = 55.6;
      const sh = ctx.createWaveShaper();
      sh.curve = crushCurve(8);
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 700;
      const g = ctx.createGain();
      g.gain.value = 0.0001;
      o.connect(sh);
      o2.connect(sh);
      sh.connect(lp).connect(g).connect(this.out);
      o.start();
      o2.start();
      this.hold = { o, o2, sh, lp, g, bits: 8 };
    },
    holdUpdate(p) {
      const H = this.hold;
      if (!H) return;
      const t = this.ctx.currentTime;
      const f = 55 * Math.pow(2, p * 2.6);
      H.o.frequency.setTargetAtTime(f, t, 0.03);
      H.o2.frequency.setTargetAtTime(f * 1.012, t, 0.03);
      H.g.gain.setTargetAtTime(0.02 + p * 0.15, t, 0.04);
      H.lp.frequency.setTargetAtTime(700 + p * 3800, t, 0.05);
      const bits = Math.max(2, Math.round(8 - p * 6));
      if (bits !== H.bits) {
        H.bits = bits;
        H.sh.curve = crushCurve(bits);
      }
    },
    holdStop() {
      const H = this.hold;
      if (!H) return;
      const t = this.ctx.currentTime;
      H.g.gain.setTargetAtTime(0.0001, t, 0.05);
      H.o.stop(t + 0.3);
      H.o2.stop(t + 0.3);
      this.hold = null;
    },
  });
  void SFX;

  /* ---------- API GitHub: solo GET pubbliche, con cache di sessione ---------- */
  const GH = (BC.GH = {
    base: `https://api.github.com/repos/${R.owner}/${R.name}`,
    ttl: 10 * 60 * 1000,
    inflight: {},
    get(path, { force = false } = {}) {
      const key = 'bc.gh:' + path;
      if (!force) {
        const raw = BC.store.sget(key);
        if (raw) {
          try {
            const c = JSON.parse(raw);
            if (Date.now() - c.t < GH.ttl) return Promise.resolve(c);
          } catch (e) { /* cache corrotta: si riscarica */ }
        }
      }
      if (GH.inflight[path]) return GH.inflight[path];
      const p = fetch(GH.base + path, { headers: { Accept: 'application/vnd.github+json' } })
        .then(async (res) => {
          if (!res.ok) {
            const err = new Error('HTTP ' + res.status);
            err.status = res.status;
            err.reset = Number(res.headers.get('x-ratelimit-reset')) || null;
            err.remaining = res.headers.get('x-ratelimit-remaining');
            throw err;
          }
          const c = { t: Date.now(), data: await res.json(), link: res.headers.get('link') };
          BC.store.sset(key, JSON.stringify(c));
          return c;
        })
        .finally(() => { delete GH.inflight[path]; });
      GH.inflight[path] = p;
      return p;
    },
    repo: (o) => GH.get('', o).then((c) => c.data),
    commits: (n = 50, o) => GH.get(`/commits?sha=${R.branch}&per_page=${n}`, o).then((c) => c.data),
    totalCommits: (o) => GH.get(`/commits?sha=${R.branch}&per_page=1`, o).then((c) => {
      const m = /[?&]page=(\d+)>;\s*rel="last"/.exec(c.link || '');
      return m ? Number(m[1]) : c.data.length;
    }),
    lastRun: (o) => GH.get('/actions/workflows/ci.yml/runs?per_page=1', o).then((c) => (c.data.workflow_runs || [])[0] || null),
    pulls: (o) => GH.get('/pulls?state=open&per_page=50', o).then((c) => c.data),
    contents: (path, o) => GH.get(`/contents/${enc(path)}?ref=${R.branch}`, o).then((c) => c.data),
    milestones: (o) => GH.get('/milestones?state=all&per_page=50', o).then((c) => c.data),
    tree: (o) => GH.get(`/git/trees/${R.branch}?recursive=1`, o).then((c) => c.data.tree || []),
    contributors: (o) => GH.get('/contributors?per_page=50', o).then((c) => c.data || []),
    languages: (o) => GH.get('/languages', o).then((c) => c.data || {}),
    releases: (o) => GH.get('/releases?per_page=5', o).then((c) => c.data || []),
    issues: (o) => GH.get('/issues?state=all&per_page=100', o).then((c) => (c.data || []).filter((i) => !i.pull_request)),
  });

  // file grezzi della repo (README, configurazioni): fuori dal limite dell'API,
  // stessa cache di sessione
  const RAW = `https://raw.githubusercontent.com/${R.owner}/${R.name}/${R.branch}/`;
  BC.raw = function (path, { force = false } = {}) {
    const key = 'bc.raw:' + path;
    if (!force) {
      const hit = BC.store.sget(key);
      if (hit) {
        try {
          const c = JSON.parse(hit);
          if (Date.now() - c.t < GH.ttl) return Promise.resolve(c.data);
        } catch (e) { /* cache corrotta: si riscarica */ }
      }
    }
    if (GH.inflight[key]) return GH.inflight[key];
    const p = fetch(RAW + enc(path))
      .then(async (res) => {
        if (!res.ok) {
          const err = new Error('HTTP ' + res.status);
          err.status = res.status;
          throw err;
        }
        const data = await res.text();
        BC.store.sset(key, JSON.stringify({ t: Date.now(), data }));
        return data;
      })
      .finally(() => { delete GH.inflight[key]; });
    GH.inflight[key] = p;
    return p;
  };

  BC.ghError = function (err) {
    if (!err) return 'errore sconosciuto';
    if ((err.status === 403 || err.status === 429) && err.remaining === '0') {
      const at = err.reset ? BC.parts(new Date(err.reset * 1000)) : null;
      return `limite di richieste API raggiunto${at ? `, riprova dopo le ${at.hour}:${at.minute}` : ''}`;
    }
    if (err.status === 404) return 'risorsa non trovata';
    if (err.status) return `risposta HTTP ${err.status}`;
    return 'rete non raggiungibile';
  };

  /* ---------- sprite: il teschio del logo Bit Crusher (29x37 celle) ---------- */
  // S = osso, s = ombra laterale. Ricavato dalla griglia pixel del logo del team.
  const ROWS = [
    '......SSSSSSSSSSSSSSSSS......',
    '.....SSSSSSSSSSSSSSSSSSS.....',
    '....SSSSSSSSSSSSSSSSSSSSS....',
    '..s.SSSSSSSSSSSSSSSSSSSSS.s..',
    '.ss.SSSSSSSSSSSSSSSSSSSSS.ss.',
    '.ss.SSSSSSSSSSSSSSSSSSSSS.ss.',
    'sss.SSSSSSSSSSSSSSSSSSSSS.sss',
    'sss.SSSSSSSSSSSSSSSSSSSSS.sss',
    'ss.SSSSSSSSSSSSSSSSSSSSSSS.ss',
    'ss.SSSSSSSSSSSSSSSSSSSSSSS.ss',
    'ss.SSS.....SSSSSSS.....SSS.ss',
    'ss.SS.......SSSSS.......SS.ss',
    'ss.S........SSSSS........S.ss',
    'ss.S........SSSSS........S.ss',
    'ss.S........SSSSS........S.ss',
    'ss.S.......SSS.SSS.......S.ss',
    'ss.SS.....SSS...SSS.....SS.ss',
    'ss.SSS...SSS.....SSS...SSS.ss',
    'ss.SSSSSSSSS.....SSSSSSSSS.ss',
    'sss.SSSSSSSS..S..SSSSSSSS.sss',
    'sSSsSSSSSSSSSSSSSSSSSSSSSsSSs',
    '.ssS....SSSSSSSSSSSSS....Sss.',
    '...ssss.SSSSSSSSSSSSS.ssss...',
    '........SSSSSSSSSSSSS........',
    '........SS.SSS.SSS.SS........',
    '........SS.SSS.SSS.SS........',
    '.............................',
    '.............................',
    '.....SS...............SS.....',
    '.....SS...............SS.....',
    '.....SS...............SS.....',
    '.....SSS.S.SS...SS.S.SSS.....',
    '.....SSSS.S.SS.SS.S.SSSS.....',
    '......SSSSSSSSSSSSSSSSS......',
    '.......SSSSSSSSSSSSSSS.......',
    '........SSSSSSSSSSSSS........',
    '.........SSSSSSSSSSS.........',
  ];

  BC.SKULL = {
    rows: ROWS,
    w: 29,
    h: ROWS.length,
    jaw: 28,      // prima riga della mandibola
    mouth: 26.5,  // linea della bocca
    solid(x, y) {
      const r = ROWS[y];
      return !!r && x >= 0 && x < r.length && r[x] !== '.';
    },
    near(x, y) {
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (this.solid(x + dx, y + dy)) return true;
      return false;
    },
    cells() {
      const out = [];
      ROWS.forEach((r, y) => {
        for (let x = 0; x < r.length; x++) if (r[x] !== '.') out.push({ x, y, c: r[x] });
      });
      return out;
    },
    // Esplosione di bit ai lati della bocca, come nel logo (k = colore)
    burst(seed = 26, n = 140) {
      const rnd = BC.rng(seed);
      const pal = ['acid', 'acid', 'acid', 'green', 'green', 'cyan', 'cyan'];
      const out = [10, 12, 14, 16, 18].map((x, i) => ({ x, y: 26 + (i % 2), w: 1, k: i % 2 ? 'green' : 'acid', mouth: true }));
      let guard = 0;
      while (out.length < n && guard++ < n * 60) {
        const side = rnd() < 0.5 ? -1 : 1;
        const d = Math.pow(rnd(), 1.25) * 27;
        const x = Math.round(14 + side * (10 + d));
        const y = Math.round(this.mouth + (rnd() + rnd() + rnd() - 1.5) * (1.6 + d * 0.38) * 1.2);
        if (y < 14 || y > 39 || this.near(x, y)) continue;
        const w = rnd() < 0.22 ? 2 : 1;
        if (w === 2 && this.near(x + side, y)) continue;
        out.push({ x: side < 0 && w === 2 ? x - 1 : x, y, w, k: pal[Math.floor(rnd() * pal.length)] });
      }
      return out;
    },
    // Versione SVG con pixel nitidi (marchio nella barra superiore)
    svg(cls) {
      const runs = { S: '', s: '' };
      ROWS.forEach((r, y) => {
        let x = 0;
        while (x < r.length) {
          const c = r[x];
          if (c === '.') { x++; continue; }
          let x2 = x;
          while (x2 < r.length && r[x2] === c) x2++;
          runs[c] += `M${x} ${y}h${x2 - x}v1h-${x2 - x}z`;
          x = x2;
        }
      });
      return BC.s('svg', { class: cls, viewBox: `0 0 ${this.w} ${this.h}`, 'shape-rendering': 'crispEdges', 'aria-hidden': 'true' },
        BC.s('path', { d: runs.s, class: 'sk-shade' }),
        BC.s('path', { d: runs.S, class: 'sk-bone' }));
    },
  };
})();
