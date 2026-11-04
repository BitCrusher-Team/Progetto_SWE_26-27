/* =====================================================================
   BIT CRUSHER // site.js
   Il sito. Ogni sezione è generata da BC.content: i dati di content.js
   aggiornati con quelli della repo (repo.js: README, milestone, cartelle
   docs/). La telemetria legge l'API pubblica di GitHub.
   Tutto in sola lettura.
   Impostazione chiesta dal docente per la vista web della repo:
   - prima i prodotti, per categoria e dal più recente;
   - la Lettera di presentazione "sopra l'involucro": in apertura e in
     testa alla sua consegna;
   - i documenti si aprono sempre in una nuova scheda;
   - niente contenuti nascosti dietro filtri, effetti o animazioni.
   ===================================================================== */
(function () {
  'use strict';

  const BC = window.BC;
  const C = BC.content;
  const { h, s, tbd, val, pad } = BC;

  // colori dei grafici (palette validata per daltonismo, ordine fisso)
  const TYPE_ORDER = ['feat', 'docs', 'fix', 'chore', 'altro'];
  const TYPE_COLOR = { feat: 'var(--c-feat)', docs: 'var(--c-docs)', fix: 'var(--c-fix)', chore: 'var(--c-chore)', altro: 'var(--c-other)' };
  const STATE = { completata: 'Completata', 'in-corso': 'In corso', attesa: 'In attesa' };

  // link esterni e documenti: sempre in una nuova scheda, detto anche agli screen reader
  const newTab = () => h('span', { class: 'sr-only' }, ' (si apre in una nuova scheda)');
  const ext = (href, ...kids) => h('a', { href, target: '_blank', rel: 'noopener' }, ...kids, newTab());
  const fmtOf = (path) => ((/\.([a-z0-9]+)$/i.exec(path || '') || [])[1] || '').toUpperCase();
  const docLink = (path, label, cls = 'btn btn--sm') => (path
    ? h('a', { class: cls, href: BC.docUrl(path), target: '_blank', rel: 'noopener' },
      label || fmtOf(path) || 'Apri', h('span', { 'aria-hidden': 'true' }, ' »'), newTab())
    : null);
  const micro = (...kids) => h('p', { class: 'micro' }, ...kids);
  const setText = (sel, txt) => BC.$$(sel).forEach((el) => { el.textContent = txt; });
  const idNum = (id) => Number((/\d+/.exec(id || '') || [0])[0]);

  /* ---------- struttura comune delle sezioni ---------- */
  // da dove arrivano i dati di ogni sezione (chiavi di BC.Repo.src)
  const SOURCES = {
    documenti: ['consegne', 'diario', 'milestone'],
    verbali: ['verbali', 'albero'],
    squadra: ['team'],
  };
  const sourceOf = (id) => (id === 'telemetria' ? 'API GitHub' : BC.Repo.label(...(SOURCES[id] || [])));

  function section(sec, ...body) {
    return h('section', { id: sec.id, class: `sec sec--${sec.id}`, 'aria-labelledby': `h-${sec.id}` },
      h('div', { class: 'wrap' },
        h('header', { class: 'sec__head' },
          h('h2', { id: `h-${sec.id}`, class: 'sec__title' }, sec.label),
          sec.desc ? h('p', { class: 'sec__desc' }, sec.desc) : null,
          h('p', { class: 'micro sec__src', title: 'Da dove arrivano i dati di questa sezione' }, `Dati: ${sourceOf(sec.id)}`)),
        ...body));
  }

  // stato di una revisione: icona ed etichetta, mai solo il colore
  const stateChip = (stato) => h('span', { class: `state state--${stato}` },
    h('span', { class: 'state__icon', 'aria-hidden': 'true' }), STATE[stato] || stato);

  function msProgress(m) {
    if (m.stato === 'completata') return 1;
    if (m.stato === 'in-corso') return m.avanzamento == null ? null : Math.max(0, Math.min(100, m.avanzamento)) / 100;
    return 0;
  }

  /* ---------- home: chi siamo e l'ultima consegna ---------- */
  function renderHome() {
    const P = C.progetto;
    const latest = BC.Repo.deliveries()[0];
    const letter = latest && latest.docs.find((d) => /lettera/i.test(d.nome));
    const cap = P.capitolatoAggiudicato && C.capitolati.find((c) => c.id === P.capitolatoAggiudicato);
    const fact = (label, value) => h('div', null, h('dt', { class: 'micro' }, label), h('dd', null, value));
    return h('section', { id: 'home', class: 'hero', 'aria-labelledby': 'h-home' },
      h('div', { class: 'wrap' },
        // la lettera viene subito dopo il nome del gruppo anche su schermi stretti
        h('div', { class: 'hero__grid' },
          h('div', { class: 'hero__id' },
            h('div', { class: 'hero__brand' },
              BC.SKULL.svg('hero__skull'),
              h('h1', { id: 'h-home', class: 'hero__title' }, P.gruppo)),
            h('p', { class: 'hero__sub' }, `${P.titolo} · ${P.universita} · A.A. ${P.annoAccademico}`)),
          letter ? cover(latest.rev, letter) : null,
          h('dl', { class: 'facts' },
            fact('Relatore', val(P.relatore)),
            fact('Fase attuale', val(P.fase)),
            fact('Capitolato', cap ? `${cap.id} · ${cap.nome}` : tbd('In attesa di aggiudicazione')),
            fact('Contatti', P.email ? h('a', { href: `mailto:${P.email}` }, P.email) : tbd()))),
        timeline(),
        P.nota ? h('p', { class: 'hero__note' }, h('span', { class: 'micro' }, 'Nota'), ' ', BC.rich(P.nota)) : null));
  }

  // la "busta": la lettera di presentazione dell'ultima consegna, prima di tutto il resto
  function cover(rev, d) {
    return h('article', { class: 'cover', 'aria-labelledby': 'cover-title' },
      h('p', { class: 'micro cover__kicker' }, `Ultima consegna · ${rev.nome}`),
      h('h2', { id: 'cover-title', class: 'cover__title' }, d.nome),
      h('p', { class: 'cover__meta' }, [d.versione ? `Versione ${d.versione}` : null, d.stato, fmtOf(d.file)].filter(Boolean).join(' · ')),
      docLink(d.file, 'Apri la lettera', 'btn cover__btn'),
      h('a', { class: 'cover__more', href: '#documenti' }, 'Tutti i documenti consegnati »'));
  }

  // revisioni di avanzamento, in ordine di calendario
  function timeline() {
    return h('ol', { class: 'revs', 'aria-label': 'Revisioni di avanzamento' }, C.milestone.map((m) => {
      const p = msProgress(m);
      return h('li', { class: `rev is-${m.stato}` },
        h('div', { class: 'rev__top' }, h('span', { class: 'rev__sigla' }, m.sigla), stateChip(m.stato)),
        h('span', { class: 'rev__nome' }, m.nome),
        h('span', { class: 'micro rev__date' },
          m.stato === 'completata' && m.chiusa ? `Chiusa il ${BC.fmtDate(m.chiusa)}`
            : m.data ? `Scadenza ${BC.fmtDate(m.data)}` : tbd('Data da definire')),
        m.stato === 'in-corso' && p != null
          ? h('div', { class: 'meter', style: { '--p': p }, role: 'img', 'aria-label': `Avanzamento ${Math.round(p * 100)}%` }, h('span'))
          : null,
        m.issue ? h('span', { class: 'micro rev__issues' }, `${m.issue.chiuse}/${m.issue.chiuse + m.issue.aperte} attività chiuse`) : null,
        m.url ? ext(m.url, h('span', { class: 'micro' }, 'Milestone su GitHub »')) : null);
    }));
  }

  /* ---------- documenti: consegne per revisione, poi il diario ---------- */
  function renderDocumenti(sec) {
    const groups = BC.Repo.deliveries();
    return section(sec,
      groups.length ? groups.map((g, i) => delivery(g, i === 0)) : h('p', { class: 'empty' }, 'Nessun documento consegnato.'),
      diary(C.diario || {}));
  }

  // una consegna: la lettera in testa, poi i documenti per categoria
  function delivery({ rev, docs }, latest) {
    const letter = docs.find((d) => /lettera/i.test(d.nome));
    const cats = new Map();
    docs.filter((d) => d !== letter).forEach((d) => {
      const k = d.categoria || 'Documenti';
      if (!cats.has(k)) cats.set(k, []);
      cats.get(k).push(d);
    });
    return h('article', { class: `delivery${latest ? ' is-latest' : ''}`, 'aria-labelledby': `rev-${rev.sigla}` },
      h('header', { class: 'delivery__head' },
        h('h3', { id: `rev-${rev.sigla}`, class: 'delivery__title' }, rev.nome),
        rev.stato ? stateChip(rev.stato) : null,
        latest ? h('span', { class: 'chip chip--acid' }, 'Più recente') : null,
        rev.data ? h('span', { class: 'micro delivery__date' }, `Scadenza ${BC.fmtDate(rev.data)}`) : null),
      letter ? h('div', { class: 'delivery__cover' }, docRow(letter, 'div')) : null,
      [...cats].map(([cat, list]) => h('div', { class: 'delivery__cat' },
        h('h4', { class: 'micro delivery__cat-title' }, cat),
        h('ul', { class: 'doclist' }, list.map((d) => docRow(d))))));
  }

  function docRow(d, tag = 'li') {
    return h(tag, { class: 'doc' },
      h('span', { class: 'doc__name' }, d.nome),
      h('span', { class: 'micro doc__ver' }, d.versione ? `v${d.versione}` : ''),
      d.stato ? h('span', { class: 'chip' }, d.stato) : h('span'),
      docLink(d.file));
  }

  // diario di bordo: dal più recente, con il template
  function diary(D) {
    const voci = D.voci || [];
    return h('article', { class: 'delivery', 'aria-labelledby': 'diario-title' },
      h('header', { class: 'delivery__head' },
        h('h3', { id: 'diario-title', class: 'delivery__title' }, 'Diario di bordo'),
        h('span', { class: 'micro delivery__date' }, `${pad(voci.length)} ${voci.length === 1 ? 'intervento' : 'interventi'}`)),
      h('p', { class: 'delivery__txt' }, 'Andamento del progetto ciclo per ciclo: attività svolte, ostacoli incontrati, decisioni prese e obiettivi del ciclo successivo.'),
      voci.length
        ? h('ul', { class: 'doclist' }, voci.map((v) => docRow(v)))
        : h('p', { class: 'empty' }, D.atteso ? `In preparazione: ${D.atteso}.` : 'Nessun intervento ancora.'),
      D.template ? h('p', { class: 'micro delivery__foot' }, 'Template: ', ext(BC.docUrl(D.template), D.template.split('/').pop())) : null);
  }

  /* ---------- verbali: esterni e interni, dal più recente ---------- */
  function renderVerbali(sec) {
    const recent = (a, b) => String(b.data || '9999').localeCompare(String(a.data || '9999')) || idNum(b.id) - idNum(a.id);
    const list = (tipo) => C.verbali.filter((v) => v.tipo === tipo).sort(recent);
    return section(sec, vgroup('Verbali esterni', list('esterno')), vgroup('Verbali interni', list('interno')));
  }

  function vgroup(title, list) {
    return h('div', { class: 'vgroup' },
      h('h3', { class: 'vgroup__title' }, title, h('span', { class: 'micro' }, pad(list.length))),
      list.length ? h('ol', { class: 'vlog' }, list.map(vRow)) : h('p', { class: 'empty' }, 'Nessun verbale.'));
  }

  function vRow(v) {
    const meta = [v.redattore && `Redattore: ${v.redattore}`, v.verificatore && `Verificatore: ${v.verificatore}`, v.versione && `v${v.versione}`].filter(Boolean);
    return h('li', { class: 'vrow' },
      h('span', { class: 'vrow__id' }, v.id || '—'),
      v.data ? h('time', { class: 'vrow__date', datetime: v.data }, BC.fmtDate(v.data)) : h('span', { class: 'vrow__date' }, '—'),
      h('div', { class: 'vrow__main' },
        h('p', { class: 'vrow__title' }, val(v.titolo), v.con ? h('span', { class: 'dim' }, ` · con ${v.con}`) : null),
        meta.length ? h('p', { class: 'micro vrow__meta' }, meta.join(' · ')) : null),
      h('span', { class: 'vrow__tags' },
        v.firmato ? h('span', { class: 'chip chip--acid' }, 'firmato') : null,
        v.mancante ? h('span', { class: 'chip chip--warn' }, 'PDF non trovato') : null),
      v.file && !v.mancante ? docLink(v.file, 'PDF') : h('span'));
  }

  /* ---------- squadra ---------- */
  function renderSquadra(sec) {
    return section(sec, h('ul', { class: 'squad' }, C.team.map(member)));
  }

  function member(m) {
    const initials = m.nome.split(/\s+/).map((w) => w[0]).slice(0, 2).join('');
    const img = m.github ? h('img', { src: `https://github.com/${encodeURIComponent(m.github)}.png?size=96`, alt: '', width: 56, height: 56, loading: 'lazy', decoding: 'async' }) : null;
    if (img) img.addEventListener('error', () => img.remove());
    return h('li', { class: 'member' },
      h('div', { class: 'member__avatar' }, h('span', { class: 'member__initials', 'aria-hidden': 'true' }, initials), img),
      h('div', { class: 'member__info' },
        h('h3', { class: 'member__name' }, m.nome),
        h('p', { class: 'member__meta' }, `Matricola ${m.matricola || '—'}`),
        m.github ? h('p', { class: 'member__meta' }, ext(BC.userUrl(m.github), `@${m.github}`)) : null,
        h('p', { class: 'member__meta' }, 'Ruolo attuale: ', val(m.ruolo, 'A rotazione'))));
  }

  /* ---------- repo: telemetria ---------- */
  function renderTelemetria(sec) {
    const tile = (key, label) => h('div', { class: 'tile', 'data-tile': key },
      h('span', { class: 'micro' }, label),
      h('span', { class: 'tile__v' }, '—'),
      h('span', { class: 'tile__s micro' }, 'in attesa'));
    return section(sec,
      h('div', { class: 'tele__bar' },
        h('span', { class: 'micro' }, `api.github.com // ${BC.repoSlug}`),
        h('span', { class: 'micro', 'data-tele-sync': '' }, 'Aggiornato —'),
        h('button', { type: 'button', class: 'btn btn--sm', onclick: () => BC.loadTelemetry(true) }, 'Aggiorna')),
      h('div', { class: 'tele__offline', 'data-tele-offline': '', hidden: true }),
      repoMeta(),
      h('div', { class: 'tele__tiles' },
        tile('ci', 'Pipeline CI'), tile('push', 'Ultimo push'), tile('issues', 'Issue aperte'), tile('prs', 'PR aperte'), tile('commits', 'Commit su main')),
      h('div', { class: 'tele__charts' },
        h('figure', { class: 'chart' },
          h('figcaption', { class: 'chart__head' }, h('span', { class: 'h3' }, 'Commit al giorno'), h('span', { class: 'micro' }, 'ULTIMI 21 GIORNI · MAIN')),
          h('div', { class: 'act', 'data-tele-activity': '' }),
          h('div', { class: 'act__axis micro' }, h('span', { 'data-tele-act-from': '' }, ''), h('span', { 'data-tele-act-max': '' }, ''), h('span', null, 'OGGI'))),
        h('figure', { class: 'chart' },
          h('figcaption', { class: 'chart__head' }, h('span', { class: 'h3' }, 'Tipi di modifica'), h('span', { class: 'micro', 'data-tele-mix-n': '' }, 'ULTIMI COMMIT')),
          h('div', { class: 'stack', 'data-tele-stack': '' }),
          h('ul', { class: 'legend', 'data-tele-legend': '' }))),
      h('div', { class: 'tele__log' },
        h('div', { class: 'tele__logbar' }, h('h3', { class: 'h3' }, 'Ultimi commit su main'), ext(`${BC.repoUrl}/commits/${C.repo.branch}`, h('span', { class: 'micro' }, 'STORICO COMPLETO »'))),
        h('ol', { class: 'clog', 'data-tele-log': '' })));
  }

  // metadati della repo letti da repo.js (assenti se l'API non ha risposto)
  function repoMeta() {
    const M = BC.Repo.meta;
    if (!M.creata) return null;
    const langs = Object.entries(M.linguaggi || {});
    const tot = langs.reduce((a, [, n]) => a + n, 0) || 1;
    const item = (k, ...v) => h('div', null, h('dt', { class: 'micro' }, k), h('dd', null, ...v));
    return h('dl', { class: 'tele__meta' },
      item('Licenza', M.licenza ? ext(BC.fileUrl('LICENSE'), M.licenza) : tbd('Nessuna')),
      item('Linguaggi', langs.length ? langs.map(([l, n]) => `${l} ${Math.round((n / tot) * 100)}%`).join(' · ') : '—'),
      item('Contributori', pad(M.contributori || 0)),
      item('Ultima release', M.release ? ext(M.release.html_url, M.release.tag_name) : 'nessuna'),
      item('Creata il', BC.fmtDate(BC.dayKey(new Date(M.creata)))),
      item('Stelle', pad(M.stelle || 0)));
  }

  function setTile(key, v, sub, cls) {
    const t = BC.$(`[data-tile="${key}"]`);
    if (!t) return;
    t.className = 'tile' + (cls ? ' ' + cls : '');
    BC.$('.tile__v', t).replaceChildren(v);
    BC.$('.tile__s', t).replaceChildren(sub);
  }

  BC.loadTelemetry = async function (force) {
    const box = document.getElementById('telemetria');
    if (!box) return;
    box.classList.add('is-loading');
    const o = { force: !!force };
    const [repo, commits, total, run, pulls] = await Promise.allSettled([
      BC.GH.repo(o), BC.GH.commits(50, o), BC.GH.totalCommits(o), BC.GH.lastRun(o), BC.GH.pulls(o),
    ]);
    box.classList.remove('is-loading');
    const ok = (r) => r.status === 'fulfilled';
    const off = BC.$('[data-tele-offline]', box);
    if (!ok(repo) && !ok(commits)) {
      const errors = [repo.reason, commits.reason];
      off.hidden = false;
      off.replaceChildren(BC.Fault.render(BC.Fault.of(errors) || 'network', {
        errors, local: false,
        actions: [{ label: 'Riprova', run: () => BC.loadTelemetry(true) }, 'repo'],
      }));
      return;
    }
    off.hidden = true;
    setText('[data-tele-sync]', 'Aggiornato alle ' + BC.clock().split(' // ')[1]);

    if (ok(repo)) {
      const r = repo.value;
      const nPR = ok(pulls) ? pulls.value.length : 0;
      setTile('push', BC.relTime(r.pushed_at), BC.dateTime(r.pushed_at));
      setTile('issues', pad(Math.max(0, r.open_issues_count - nPR)), 'PR escluse');
    }
    if (ok(pulls)) setTile('prs', pad(pulls.value.length), pulls.value[0] ? `ultima #${pulls.value[0].number}` : 'nessuna in revisione');
    if (ok(total)) setTile('commits', pad(total.value), `ramo ${C.repo.branch}`);
    if (ok(run)) {
      const rv = run.value;
      const label = BC.ciLabel(rv);
      const cls = !rv ? '' : rv.status !== 'completed' ? 'is-run' : rv.conclusion === 'success' ? 'is-pass' : rv.conclusion === 'failure' ? 'is-fail' : '';
      setTile('ci', rv ? ext(rv.html_url, h('span', { class: 'ci__icon', 'aria-hidden': 'true' }), label) : '—',
        rv ? `${BC.relTime(rv.updated_at)} · ${rv.display_title}` : 'nessuna esecuzione', cls);
    }
    if (ok(commits)) {
      activity(commits.value);
      typeMix(commits.value);
      commitLog(commits.value);
    }
  };

  function activity(list) {
    const days = 21;
    const p = BC.parts(new Date());
    const keys = [];
    for (let i = days - 1; i >= 0; i--) keys.push(new Date(Date.UTC(+p.year, +p.month - 1, +p.day - i)).toISOString().slice(0, 10));
    const counts = new Map(keys.map((k) => [k, 0]));
    list.forEach((c) => {
      const k = BC.dayKey(new Date(c.commit.committer.date));
      if (counts.has(k)) counts.set(k, counts.get(k) + 1);
    });
    const max = Math.max(1, ...counts.values());
    BC.$('[data-tele-activity]').replaceChildren(...keys.map((k, i) => {
      const n = counts.get(k);
      const label = `${BC.fmtDate(k)}: ${n} commit`;
      return h('div', { class: 'act__col' + (i === keys.length - 1 ? ' is-today' : ''), tabindex: '0', 'data-tip': label, 'aria-label': label },
        h('span', { class: 'act__bar' + (n ? '' : ' is-zero'), style: { height: n ? `${Math.max(6, (n / max) * 100)}%` : '1px' } }));
    }));
    setText('[data-tele-act-from]', BC.fmtDate(keys[0]));
    setText('[data-tele-act-max]', `MAX ${max}/GIORNO`);
  }

  function typeMix(list) {
    const counts = Object.fromEntries(TYPE_ORDER.map((t) => [t, 0]));
    let total = 0;
    list.forEach((c) => BC.parseCommit(c.commit.message).segs.forEach((sg) => {
      const k = sg.type && sg.type in counts && sg.type !== 'altro' ? sg.type : 'altro';
      counts[k]++;
      total++;
    }));
    setText('[data-tele-mix-n]', `${total} SEGMENTI · ${list.length} COMMIT`);
    const pct = (n) => Math.round((n / Math.max(1, total)) * 100);
    BC.$('[data-tele-stack]').replaceChildren(...TYPE_ORDER.filter((t) => counts[t]).map((t) => {
      const tip = `${t}: ${counts[t]} (${pct(counts[t])}%)`;
      return h('span', { class: 'stack__seg', tabindex: '0', 'data-tip': tip, 'aria-label': tip, style: { flexGrow: counts[t], '--sw': TYPE_COLOR[t] } });
    }));
    BC.$('[data-tele-legend]').replaceChildren(...TYPE_ORDER.map((t) => h('li', { class: counts[t] ? '' : 'is-empty' },
      h('span', { class: 'sw', style: { '--sw': TYPE_COLOR[t] }, 'aria-hidden': 'true' }),
      h('span', { class: 'legend__k' }, t === 'altro' ? 'altro (style, ci, test…)' : t),
      h('span', { class: 'legend__v' }, `${counts[t]} · ${pct(counts[t])}%`))));
  }

  function commitLog(list) {
    BC.$('[data-tele-log]').replaceChildren(...list.slice(0, 10).map((c) => {
      const pc = BC.parseCommit(c.commit.message);
      const first = pc.segs[0];
      const types = pc.types.length ? [...new Set(pc.types)] : [];
      return h('li', { class: 'crow' },
        ext(c.html_url, h('span', { class: 'crow__sha' }, c.sha.slice(0, 7))),
        h('span', { class: 'crow__types' }, types.length
          ? types.map((t) => h('span', { class: 'tchip', style: { '--sw': TYPE_COLOR[TYPE_ORDER.includes(t) ? t : 'altro'] } }, t))
          : h('span', { class: 'tchip', style: { '--sw': 'var(--c-other)' } }, 'n/d')),
        h('span', { class: 'crow__msg', title: pc.subject },
          first.type ? `${first.scope ? `(${first.scope}) ` : ''}${first.desc}` : pc.subject,
          pc.segs.length > 1 ? h('span', { class: 'crow__more' }, ` +${pc.segs.length - 1}`) : null),
        h('span', { class: 'crow__author' }, c.author ? '@' + c.author.login : c.commit.author.name),
        h('time', { class: 'crow__time', datetime: c.commit.committer.date, title: BC.dateTime(c.commit.committer.date) }, BC.relTime(c.commit.committer.date)));
    }));
  }

  /* ---------- footer ---------- */
  // "BIT CRUSHER" a tutta larghezza in SVG. viewBox e textLength vengono dalla
  // misura di Saira 900 a 200 px (stretch 125%, spaziatura -.035em): la scritta
  // riempie la riga senza tagli, e con un font di ripiego viene stirata alla
  // stessa larghezza. Il contorno sta sotto il riempimento (paint-order in
  // main.css), così le sovrapposizioni interne del font variabile, come la
  // gamba della R, restano coperte.
  const MARK = { x: 8, y: -144, w: 1387, h: 150 };
  function footerMark() {
    return h('div', { class: 'footer__mark', 'aria-hidden': 'true' },
      s('svg', { viewBox: `${MARK.x} ${MARK.y} ${MARK.w} ${MARK.h}`, preserveAspectRatio: 'xMidYMid meet' },
        s('text', { x: 0, y: 0, textLength: MARK.w, lengthAdjust: 'spacingAndGlyphs' }, 'BIT CRUSHER')));
  }

  function renderFooter() {
    const P = C.progetto;
    const links = [
      ['Repository', BC.repoUrl],
      ['Pipeline CI', `${BC.repoUrl}/actions/workflows/ci.yml`],
      ['Issue', `${BC.repoUrl}/issues`],
      ['Pull request', `${BC.repoUrl}/pulls`],
      ['Board del team', C.repo.board],
    ].filter(([, u]) => u);
    return h('footer', { class: 'footer' }, h('div', { class: 'wrap' },
      footerMark(),
      h('div', { class: 'footer__grid' },
        h('div', null,
          micro('PROGETTO'),
          h('p', null, P.titolo),
          h('p', { class: 'dim' }, P.universita, h('br'), `${P.corso} · A.A. ${P.annoAccademico}`),
          h('p', { class: 'dim' }, 'In collaborazione con ', val(P.proponente, 'Proponente da definire'))),
        h('div', null,
          micro('COLLEGAMENTI'),
          h('ul', { class: 'flinks' },
            links.map(([l, u]) => h('li', null, ext(u, l, h('span', { 'aria-hidden': 'true' }, ' »')))),
            P.email ? h('li', null, h('a', { href: `mailto:${P.email}` }, P.email)) : null)),
        h('div', null,
          micro('TERMINALE'),
          h('p', { class: 'dim' }, 'Per esplorare la repo da tastiera: ls, tree, find, grep, cat, documenti, verbali.'),
          h('div', { class: 'fsys' },
            h('button', { type: 'button', class: 'btn btn--sm', 'data-console-open': '' }, 'Apri il terminale ', h('kbd', null, '\\'))))),
      h('div', { class: 'footer__base micro' },
        h('span', null, 'Progetto con licenza ', ext(BC.fileUrl('LICENSE'), BC.Repo.meta.licenza || 'MIT')),
        h('span', null, 'Omaggio estetico non ufficiale a Marathon. Nessuna affiliazione con Bungie.'),
        h('span', null, 'BC-2627 // v0.2'))));
  }

  /* ---------- navigazione e tooltip ---------- */
  function renderNav() {
    const ol = BC.$('[data-nav]');
    ol.replaceChildren(...BC.sections.filter((x) => x.id !== 'home').map((x) => h('li', null,
      h('a', { href: `#${x.id}`, 'data-nav-link': x.id }, x.label))));
    BC.$('.brand__mark').replaceChildren(BC.SKULL.svg('brand__svg'));
    const btn = BC.$('[data-nav-toggle]');
    const nav = BC.$('#nav');
    btn.addEventListener('click', () => {
      const open = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', String(open));
      nav.classList.toggle('is-open', open);
    });
    nav.addEventListener('click', (e) => {
      if (!e.target.closest('a')) return;
      btn.setAttribute('aria-expanded', 'false');
      nav.classList.remove('is-open');
    });
  }

  // voce di menu della sezione a schermo (aria-current), senza effetti
  function initSpy() {
    const links = new Map(BC.$$('[data-nav-link]').map((a) => [a.dataset.navLink, a]));
    const spy = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (!e.isIntersecting) return;
      links.forEach((a) => a.removeAttribute('aria-current'));
      const a = links.get(e.target.id);
      if (a) a.setAttribute('aria-current', 'true');
    }), { rootMargin: '-40% 0px -55% 0px' });
    BC.sections.forEach((x) => {
      const el = document.getElementById(x.id);
      if (el) spy.observe(el);
    });
  }

  function initTooltip() {
    const tip = BC.$('#tooltip');
    let cur = null;
    const place = (el) => {
      const r = el.getBoundingClientRect();
      const tw = tip.offsetWidth;
      const th = tip.offsetHeight;
      const x = Math.max(8, Math.min(window.innerWidth - tw - 8, r.left + r.width / 2 - tw / 2));
      let y = r.top - th - 8;
      if (y < 60) y = r.bottom + 8;
      tip.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    };
    const show = (el) => {
      cur = el;
      tip.textContent = el.dataset.tip;
      tip.hidden = false;
      place(el);
    };
    const hide = () => {
      cur = null;
      tip.hidden = true;
    };
    document.addEventListener('pointerover', (e) => {
      const el = e.target.closest('[data-tip]');
      if (el) show(el);
      else if (cur) hide();
    });
    document.addEventListener('focusin', (e) => {
      const el = e.target.closest('[data-tip]');
      if (el) show(el);
    });
    document.addEventListener('focusout', hide);
    window.addEventListener('scroll', () => cur && hide(), { passive: true });
  }

  BC.goto = function (id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ block: 'start' });
    history.replaceState(null, '', `#${id}`);
  };

  BC.renderSite = function () {
    const builders = {
      home: renderHome, documenti: renderDocumenti, verbali: renderVerbali, squadra: renderSquadra, telemetria: renderTelemetria,
    };
    // prima si costruisce tutto, poi si tocca la pagina: se un renderer fallisce
    // (dati inattesi) la pagina resta com'è e main.js riprova con content.js
    const main = BC.sections.map((x) => builders[x.id](x));
    const footer = renderFooter();
    BC.$('#main').replaceChildren(...main);
    BC.$('#footer-slot').replaceWith(footer);
    renderNav();
    initSpy();
    initTooltip();
  };
})();
