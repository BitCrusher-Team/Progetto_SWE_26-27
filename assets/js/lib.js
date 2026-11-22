/* =====================================================================
   BIT CRUSHER // lib.js
   Utilità condivise: DOM, storage, date, indirizzi della repo e lettura
   in sola lettura dell'API GitHub e dei file grezzi.
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
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    return append(el, kids);
  };

  BC.$ = (sel, root = document) => root.querySelector(sel);
  BC.sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  BC.newTab = () => BC.h('span', { class: 'sr-only' }, ' (si apre in una nuova scheda)');
  // un percorso o un elenco di percorsi di content.js -> elenco (vuoto se null)
  BC.percorsi = (f) => (Array.isArray(f) ? f : [f]).filter((p) => typeof p === 'string' && p.trim()).map((p) => p.trim());

  // testata uguale in tutte le pagine: logo, titolo, righe sotto il titolo
  // e, a destra, un pulsante (facoltativo)
  BC.testata = (titolo, righe, azione) => BC.h('header', { class: 'testata' },
    BC.h('div', { class: 'contenitore testata__riga' },
      BC.h('img', { class: 'logo', src: 'assets/img/favicon.svg', alt: `Logo di ${(C.sito || {}).gruppo || ''}`, width: 72, height: 72 }),
      BC.h('div', { class: 'testata__testo' }, BC.h('h1', null, titolo), righe),
      azione));

  /* ---------- storage (può essere bloccato: mai fidarsi) ---------- */
  function safe(fn, fallback) {
    try { return fn(); } catch (e) { return fallback; }
  }
  BC.store = {
    sget: (k) => safe(() => sessionStorage.getItem(k), null),
    sset: (k, v) => safe(() => sessionStorage.setItem(k, v)),
  };

  /* ---------- date ---------- */
  // "2026-10-29" -> "29/10/2026"
  BC.fmtDate = (iso) => {
    const [y, m, d] = String(iso).slice(0, 10).split('-');
    return `${d}/${m}/${y}`;
  };

  /* ---------- indirizzi della repo di progetto ---------- */
  const enc = (p) => p.split('/').map(encodeURIComponent).join('/');
  BC.repoUrl = `https://github.com/${R.owner}/${R.name}`;
  BC.fileUrl = (p) => `${BC.repoUrl}/blob/${R.branch}/${enc(p)}`;
  // documento da aprire: dal sito pubblicato (il PDF nel visualizzatore del
  // browser) se la repo ha GitHub Pages, altrimenti la pagina del file
  BC.docUrl = (p) => (R.pages ? R.pages + enc(p) : BC.fileUrl(p));

  /* ---------- API GitHub: solo GET pubbliche, con cache di sessione ---------- */
  const TTL = 10 * 60 * 1000;
  const inflight = {};

  // risposta in cache (sessionStorage) se ha meno di TTL, altrimenti richiesta
  function cached(key, load) {
    const raw = BC.store.sget(key);
    if (raw) {
      try {
        const c = JSON.parse(raw);
        if (Date.now() - c.t < TTL) return Promise.resolve(c.data);
      } catch (e) { /* cache corrotta: si riscarica */ }
    }
    if (inflight[key]) return inflight[key];
    inflight[key] = load()
      .then((data) => {
        BC.store.sset(key, JSON.stringify({ t: Date.now(), data }));
        return data;
      })
      .finally(() => { delete inflight[key]; });
    return inflight[key];
  }

  function get(url, type) {
    return fetch(url, type === 'json' ? { headers: { Accept: 'application/vnd.github+json' } } : undefined).then((res) => {
      if (!res.ok) {
        const err = new Error('HTTP ' + res.status);
        err.status = res.status;
        throw err;
      }
      return type === 'json' ? res.json() : res.text();
    });
  }

  BC.GH = {
    // albero dei file del ramo principale (una sola richiesta per tutta la repo)
    tree: () => cached(`bc.gh:/git/trees/${R.branch}?recursive=1`, () =>
      get(`https://api.github.com/repos/${R.owner}/${R.name}/git/trees/${R.branch}?recursive=1`, 'json'))
      .then((d) => d.tree || []),
  };

  // file grezzi della repo (README): fuori dal limite dell'API
  BC.raw = (path) => cached(`bc.raw:${path}`, () =>
    get(`https://raw.githubusercontent.com/${R.owner}/${R.name}/${R.branch}/${enc(path)}`, 'text'));
})();
