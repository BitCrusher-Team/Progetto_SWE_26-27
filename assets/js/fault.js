/* =====================================================================
   BIT CRUSHER // fault.js
   Repo non raggiungibile: resa privata, rinominata o rimossa, rete
   assente, GitHub in errore, limite di richieste dell'API.
   Un solo blocco componibile (codice, titolo, spiegazione, pulsanti) in
   tre formati:
   - "inline": riquadro dentro una sezione (Telemetria);
   - "banner": striscia sotto la barra in alto del sito;
   - schermata intera (screen): dopo l'attesa, con la fascia centrale
     come il breach e il nero sopra e sotto.
   I casi stanno in KINDS e i pulsanti in ACTIONS: per un caso nuovo basta
   una voce. of() ricava il caso dagli errori delle richieste di BC.GH e
   BC.raw, fromRepo() dallo stato di BC.Repo.
   ===================================================================== */
(function () {
  'use strict';

  const BC = window.BC;
  const { h } = BC;

  const hhmm = (sec) => {
    const p = BC.parts(new Date(sec * 1000));
    return `${p.hour}:${p.minute}`;
  };

  // casi: codice breve, titolo, spiegazione (err: il primo errore utile)
  const KINDS = {
    private: {
      code: '404', title: 'Repo non accessibile',
      text: () => 'GitHub non mostra la repo a chi non ha accesso: può essere stata resa privata, rinominata o rimossa.',
    },
    ratelimit: {
      code: '403', title: 'Limite di richieste',
      text: (err) => `Senza login l'API di GitHub accetta 60 richieste l'ora per rete${err && err.reset ? `: riprova dopo le ${hhmm(err.reset)}` : ''}.`,
    },
    network: {
      code: 'NET', title: 'Rete non raggiungibile',
      text: () => 'Il browser non riesce a contattare GitHub: controlla la connessione.',
    },
    server: {
      code: '5XX', title: 'GitHub non risponde',
      text: () => 'I server di GitHub hanno risposto con un errore: di solito passa in pochi minuti.',
    },
    partial: {
      code: '206', title: 'Segnale parziale',
      text: () => 'Una parte dei dati della repo non è arrivata: dove manca, il sito usa i dati locali.',
    },
    data: {
      code: 'DAT', title: 'Dati non leggibili',
      text: () => 'I dati della repo non hanno il formato atteso: il sito usa quelli locali.',
    },
  };
  const LOCAL = 'Il sito mostra i dati locali (content.js): possono non essere aggiornati.';

  // pulsanti: run(ctx), con ctx.close() che chiude il blocco (o la schermata)
  const ACTIONS = {
    retry: { label: 'Riprova', run: () => BC.Repo.retry() },
    enter: { label: 'Entra con i dati locali', run: (ctx) => ctx.close() },
    repo: { label: 'Apri su GitHub', href: () => BC.repoUrl },
    close: { label: 'Chiudi ×', run: (ctx) => ctx.close() },
  };

  // le richieste che contano per dire "parziale": senza queste il sito perde
  // sezioni intere; le altre (es. .spr.yml rimosso) non meritano un avviso
  const CORE = ['readme', 'repo', 'milestones', 'tree'];

  // caso dagli errori delle richieste ({ status, remaining, reset })
  function of(errors) {
    const list = (errors || []).filter(Boolean);
    if (!list.length) return null;
    if (list.some((e) => (e.status === 403 || e.status === 429) && String(e.remaining) === '0')) return 'ratelimit';
    if (list.some((e) => e.status === 404)) return 'private';
    if (list.some((e) => !e.status)) return 'network';
    return 'server';
  }

  // caso dallo stato di BC.Repo; null se non c'è niente da segnalare
  function fromRepo(R) {
    if (!R) return null;
    if (R.status === 'ripiego') return 'data';
    if (R.status === 'offline') return of(R.errors) || 'network';
    if (R.status === 'parziale') {
      const core = (R.errors || []).filter((e) => CORE.includes(e.job));
      if (!core.length) return null;
      return of(core) === 'ratelimit' ? 'ratelimit' : 'partial';
    }
    return null;
  }

  function button(a, ctx) {
    const A = typeof a === 'string' ? ACTIONS[a] : a;
    if (!A) return null;
    if (A.href) {
      return h('a', { class: 'btn btn--sm', href: A.href(), target: '_blank', rel: 'noopener' },
        A.label, h('span', { 'aria-hidden': 'true' }, ' »'));
    }
    return h('button', { type: 'button', class: 'btn btn--sm', onclick: () => A.run(ctx) }, A.label);
  }

  // il blocco base. opts: variant, errors, actions (nomi di ACTIONS o
  // { label, run }), local (riga sui dati locali), onClose
  function render(kind, opts = {}) {
    const K = KINDS[kind] || KINDS.network;
    const { variant = 'inline', errors = [], actions = ['retry', 'repo'], local = kind !== 'partial', onClose } = opts;
    const err = errors.find((e) => e && e.reset) || errors[0] || null;
    const id = `fault-${variant}-${kind}`;
    const el = h('div', { class: `fault fault--${variant}`, 'data-kind': kind, role: variant === 'band' ? null : 'status', 'aria-labelledby': id });
    const ctx = { el, close: onClose || (() => el.remove()) };
    el.append(
      h('span', { class: 'fault__code', 'aria-hidden': 'true' }, K.code),
      h('div', { class: 'fault__body' },
        h('p', { class: 'micro fault__kicker' }, `${kind === 'partial' ? 'Segnale debole' : 'Segnale assente'} // ${BC.repoSlug}`),
        h('strong', { id, class: 'fault__title' }, K.title),
        h('p', { class: 'fault__text' }, K.text(err)),
        local ? h('p', { class: 'micro fault__local' }, LOCAL) : null),
      h('div', { class: 'fault__acts' }, actions.map((a) => button(a, ctx))));
    return el;
  }

  // striscia sotto la barra in alto del sito (una sola alla volta)
  function banner(kind, opts = {}) {
    const site = BC.$('#site');
    if (!site || !kind) return null;
    BC.$$('.fault--banner', site).forEach((x) => x.remove());
    const el = render(kind, { actions: ['retry', 'close'], ...opts, variant: 'banner' });
    site.appendChild(el);
    return el;
  }

  // schermata intera: si chiude con "Entra con i dati locali" o con Esc, e
  // lascia la striscia nel sito
  function screen(kind, opts = {}) {
    if (!kind) return null;
    BC.$$('.fault-screen').forEach((x) => x.remove());
    const K = KINDS[kind] || KINDS.network;
    let el = null;
    const close = () => {
      if (!el) return;
      el.remove();
      el = null;
      document.removeEventListener('keydown', onKey, true);
      banner(kind, opts);
      const scr = BC.$('#screen');
      if (scr) scr.focus({ preventScroll: true });
    };
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      close();
    };
    const core = render(kind, { actions: ['enter', 'retry', 'repo'], ...opts, variant: 'band', onClose: close });
    el = h('div', { class: 'fault-screen', role: 'alertdialog', 'aria-modal': 'true', 'aria-labelledby': `fault-band-${kind}` },
      h('div', { class: 'fault-screen__hud', 'aria-hidden': 'true' },
        h('span', null, 'BC//LINK — SINCRONIZZAZIONE FALLITA', h('br'), h('span', { class: 'jp', lang: 'ja' }, '接続 待機中')),
        h('span', { 'data-clock': '' }, BC.clock())),
      h('div', { class: 'fault-screen__band' }, BC.SKULL.svg('fault-screen__skull'), core),
      h('div', { class: 'fault-screen__foot', 'aria-hidden': 'true' },
        BC.glyphRow(9, BC.hash(kind)),
        h('span', null, `ERR.${K.code} // ${BC.repoSlug}`)));
    document.body.appendChild(el);
    document.addEventListener('keydown', onKey, true);
    BC.SFX.error();
    requestAnimationFrame(() => {
      const first = el && BC.$('.fault__acts .btn', el);
      if (first) first.focus({ preventScroll: true });
    });
    return el;
  }

  BC.Fault = { KINDS, ACTIONS, of, fromRepo, render, banner, screen };
})();
