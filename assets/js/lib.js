/* =====================================================================
   BIT CRUSHER // lib.js
   Utilità condivise: DOM, storage, formattazione, API GitHub (sola
   lettura), suoni della console e teschio del logo.
   ===================================================================== */
(function () {
  'use strict';

  const BC = (window.BC = window.BC || {});
  const C = (BC.content = window.BC_CONTENT || {});
  const R = C.repo || {};

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
  // documento da aprire: dal sito pubblicato (il PDF nel visualizzatore del
  // browser) se la repo ha GitHub Pages, altrimenti la pagina del file
  BC.docUrl = (p) => (R.pages ? R.pages + enc(p) : BC.fileUrl(p));
  BC.userUrl = (u) => `https://github.com/${encodeURIComponent(u)}`;

  /* ---------- sezioni del sito (nav, intestazioni, terminale) ---------- */
  // ordine voluto dal docente: prima i prodotti (documenti e verbali)
  BC.sections = [
    { id: 'home', label: 'Home' },
    { id: 'documenti', label: 'Documenti', desc: 'I prodotti consegnati a ogni revisione, dal più recente, e il diario di bordo.' },
    { id: 'verbali', label: 'Verbali', desc: 'Verbali delle riunioni esterne e interne, dal più recente.' },
    { id: 'squadra', label: 'Squadra', desc: 'I membri del gruppo. I ruoli ruotano tra i cicli di sviluppo.' },
    { id: 'telemetria', label: 'Repo', desc: "L'attività della repo, letta dall'API pubblica di GitHub." },
  ];

  /* ---------- micrografiche ---------- */
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

  /* ---------- messaggi di commit (grafici della telemetria) ---------- */
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

  /* ---------- suoni della console: sintesi WebAudio, spenti di default ---------- */
  BC.SFX = {
    ctx: null,
    out: null,
    // si accendono dal terminale («suono on»)
    enabled: BC.store.get('bc.sound') === 'on',
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
    },
    tone(freq, dur, { type = 'square', vol = 0.2, delay = 0 } = {}) {
      const ctx = this.ensure();
      if (!ctx) return;
      const t = ctx.currentTime + delay;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(this.out);
      o.start(t);
      o.stop(t + dur + 0.02);
    },
    key() { this.tone(1500 + Math.random() * 700, 0.016, { vol: 0.05 }); },
    blip() { this.tone(980, 0.05, { vol: 0.08 }); },
    error() {
      this.tone(150, 0.16, { type: 'sawtooth', vol: 0.1 });
      this.tone(112, 0.2, { type: 'sawtooth', vol: 0.09, delay: 0.08 });
    },
  };

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
    milestones: (o) => GH.get('/milestones?state=all&per_page=50', o).then((c) => c.data),
    tree: (o) => GH.get(`/git/trees/${R.branch}?recursive=1`, o).then((c) => c.data.tree || []),
    contributors: (o) => GH.get('/contributors?per_page=50', o).then((c) => c.data || []),
    languages: (o) => GH.get('/languages', o).then((c) => c.data || {}),
    releases: (o) => GH.get('/releases?per_page=5', o).then((c) => c.data || []),
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
