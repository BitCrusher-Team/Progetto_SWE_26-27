/* =====================================================================
   BIT CRUSHER // repo.js
   Il sito legge i propri dati dalla repo di progetto, in sola lettura:
   - README.md: scheda del gruppo (<aside>), nota, panoramica,
     struttura, diario, verbali, capitolati, priorità, squadra, setup,
     riferimenti e proponente (riga finale);
   - milestone di GitHub: revisioni di avanzamento con scadenza, stato
     e percentuale (issue chiuse sul totale);
   - configurazioni: ci.yml (tipi di commit, limite del titolo,
     troncamento di spr), .spr.yml, CODEOWNERS, template delle issue
     (nomi e Definition of Done);
   - albero dei file: PDF di capitolati e documenti, verifica che i
     link del README puntino a file esistenti;
   - API: contributori, licenza, descrizione, linguaggi, release, issue.
   content.js resta il ripiego per ciò che la repo non dice o se la rete
   non risponde. BC.Repo.src dice da dove arriva ogni parte.
   ===================================================================== */
(function () {
  'use strict';

  const BC = window.BC;
  const C = BC.content;
  const R = C.repo;
  const PH_ONLY = new RegExp(`^${BC.PLACEHOLDER.source}$`, 'i');

  const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  const key = (s) => norm(s).replace(/[^a-z0-9]/g, '');
  const clean = (s) => String(s == null ? '' : s).replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
  // null se il testo è vuoto o è solo un segnaposto
  const value = (s) => {
    const t = clean(s);
    return !t || PH_ONLY.test(t) ? null : t;
  };
  const dom = (html) => new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html').body;
  const fileName = (p) => String(p).split('/').pop();
  // errore di una richiesta -> i dati che servono a fault.js per la diagnosi
  const pickErr = (e) => ({ status: (e && e.status) || null, remaining: e && e.remaining != null ? e.remaining : null, reset: (e && e.reset) || null });

  // link del README -> percorso nella repo (null se esterno)
  function repoPath(href) {
    if (!href) return null;
    if (/^[a-z]+:/i.test(href)) {
      const m = new RegExp(`github\\.com/${R.owner}/${R.name}/(?:blob|tree)/[^/]+/(.+)$`, 'i').exec(href);
      return m ? decodeURIComponent(m[1]) : null;
    }
    return decodeURIComponent(href.replace(/^\.?\//, '').replace(/[#?].*$/, '').replace(/\/$/, ''));
  }

  /* ---------- README ---------- */
  function sectionsOf(md) {
    const out = [];
    let cur = { title: '', level: 0, lines: [] };
    // il README chiude un <dd senza ">": lo si ripara prima di leggerlo
    for (const line of md.replace(/<\/dd(?!>)/g, '</dd>').split('\n')) {
      const m = /^(#{1,3})\s+(.+?)\s*#*\s*$/.exec(line);
      if (m) {
        out.push(cur);
        cur = { title: m[2], level: m[1].length, lines: [] };
      } else cur.lines.push(line);
    }
    out.push(cur);
    return out.map((s) => ({ ...s, key: norm(s.title), text: s.lines.join('\n') }));
  }
  const findSec = (secs, ...keys) => secs.find((s) => s.level > 1 && keys.some((k) => s.key.startsWith(k)));

  function tableRows(el) {
    const t = el && el.querySelector('table');
    if (!t) return [];
    const heads = [...t.querySelectorAll('tr:first-child th, thead th')].map((th) => norm(th.textContent));
    const body = [...t.querySelectorAll('tbody tr')];
    const rows = body.length ? body : [...t.querySelectorAll('tr')].slice(1);
    return rows.map((tr) => {
      const o = {};
      [...tr.children].forEach((td, i) => { if (heads[i]) o[heads[i]] = td; });
      return o;
    }).filter((o) => Object.keys(o).length);
  }
  const cell = (row, ...names) => {
    for (const k in row) if (names.some((n) => k.startsWith(n))) return row[k];
    return null;
  };
  const cellText = (row, ...names) => {
    const td = cell(row, ...names);
    return td ? clean(td.textContent) : null;
  };

  function parseReadme(md) {
    const secs = sectionsOf(md);
    const d = {};
    const h1 = secs.find((s) => s.level === 1);
    if (h1) d.titolo = clean(h1.title);

    // scheda: <aside> con <strong>Etichetta:</strong> valore | ...
    const asideSec = secs.find((s) => /<aside/i.test(s.text));
    if (asideSec) {
      const aside = dom(asideSec.text).querySelector('aside');
      d.scheda = {};
      aside.querySelectorAll('strong').forEach((st) => {
        let v = '';
        for (let n = st.nextSibling; n && !(n.nodeType === 1 && n.tagName === 'STRONG'); n = n.nextSibling) v += n.textContent;
        d.scheda[norm(st.textContent.replace(/:\s*$/, ''))] = clean(v.replace(/\|/g, ' '));
      });
    }

    const note = /^>\s*\[!(?:NOTE|IMPORTANT|WARNING|TIP|CAUTION)\]\s*\n((?:>.*(?:\n|$))+)/m.exec(md);
    if (note) d.nota = clean(note[1].replace(/^>\s?/gm, ' '));

    const pano = findSec(secs, 'panoramica');
    if (pano) d.panoramica = clean([...dom(pano.text).querySelectorAll('p')].map((p) => p.textContent).join(' ') || dom(pano.text).textContent);

    const str = findSec(secs, 'struttura');
    if (str) {
      const el = dom(str.text);
      d.struttura = [...el.querySelectorAll('dt')].map((dt) => {
        const dd = dt.nextElementSibling && dt.nextElementSibling.tagName === 'DD' ? dt.nextElementSibling : null;
        return { path: clean(dt.textContent).replace(/\/$/, ''), desc: dd ? clean(dd.textContent) : null };
      });
    }

    // diario: un link con un segnaposto nel percorso ("[TO_REPLACE]") è un file
    // non ancora caricato; il testo del link dice quale
    const diario = findSec(secs, 'diario');
    if (diario) {
      const links = [...dom(diario.text).querySelectorAll('a')]
        .map((a) => ({ path: repoPath(a.getAttribute('href')), text: clean(a.textContent) }))
        .filter((a) => a.path);
      const pending = (a) => /\[[^\]]*\]/.test(a.path);
      const real = links.filter((a) => !pending(a));
      const later = links.find(pending);
      d.diario = {
        file: (real.find((a) => /\.(pdf|pptx?|odp|docx?)$/i.test(a.path)) || {}).path || null,
        sorgente: (real.find((a) => /\.tex$/i.test(a.path)) || {}).path || null,
        atteso: later ? later.text || fileName(later.path) : null,
      };
    }

    const verb = findSec(secs, 'verbali');
    if (verb) {
      d.verbali = tableRows(dom(verb.text)).map((row) => {
        const a = (cell(row, 'documento', 'file', 'link', 'verbale') || { querySelector: () => null }).querySelector('a');
        const file = a ? repoPath(a.getAttribute('href')) : null;
        const label = a ? clean(a.textContent) : '';
        const idm = /\b([IE])\s?0*(\d+)\b/i.exec(label) || /verbale_(interno|esterno)_0*(\d+)/i.exec(file || '');
        const tipo = /esterno|verbali_esterni/i.test(file || '') || /^E/i.test(idm ? idm[1] : '') ? 'esterno' : 'interno';
        const id = idm ? `${tipo === 'esterno' ? 'E' : 'I'}${String(idm[2]).padStart(2, '0')}` : null;
        return {
          id, tipo, file,
          data: (/(\d{4}-\d{2}-\d{2})/.exec(cellText(row, 'data') || '') || [])[1] || null,
          titolo: value(cellText(row, 'tipologia', 'descrizione', 'titolo', 'oggetto')),
          redattore: value(cellText(row, 'redattore', 'autore')),
          verificatore: value(cellText(row, 'verificatore')),
          versione: value((cellText(row, 'versione') || '').replace(/^v/i, '')),
          con: value(cellText(row, 'con', 'azienda', 'proponente')),
        };
      }).filter((v) => v.data || v.file);
    }

    const cap = findSec(secs, 'capitolati');
    if (cap) {
      d.capitolati = [...dom(cap.text).querySelectorAll('dt')].map((dt) => {
        const a = dt.querySelector('a');
        const id = (/C\d+/i.exec(dt.textContent) || [])[0];
        const dd = dt.nextElementSibling && dt.nextElementSibling.tagName === 'DD' ? dt.nextElementSibling : null;
        const [main, prop] = clean(dd ? dd.textContent : '').split(/\s+—\s+/);
        const i = main.indexOf(':');
        return {
          id: id ? id.toUpperCase() : null,
          dir: a ? repoPath(a.getAttribute('href')) : null,
          nome: i > 0 ? clean(main.slice(0, i)) : null,
          descrizione: i > 0 ? clean(main.slice(i + 1)) : value(main),
          proponente: value(prop),
        };
      }).filter((c) => c.id);
    }

    const prio = findSec(secs, 'scelta per priorita', 'priorita');
    if (prio) {
      d.priorita = tableRows(dom(prio.text)).map((row) => ({
        rank: Number((/\d+/.exec(cellText(row, 'priorita') || '') || [])[0]) || 99,
        ids: ((cellText(row, 'capitolat') || '').match(/C\d+/gi) || []).map((x) => x.toUpperCase()),
        motivazione: value(cellText(row, 'motivazione')),
      })).filter((p) => p.ids.length).sort((a, b) => a.rank - b.rank);
    }

    const team = findSec(secs, 'team', 'squadra', 'membri', 'componenti');
    if (team) {
      d.team = tableRows(dom(team.text)).map((row) => {
        const gh = cell(row, 'github', 'utente', 'account');
        const a = gh && gh.querySelector('a');
        const handle = (a && /github\.com\/([^/?#]+)/i.exec(a.getAttribute('href') || '')) || /@?([A-Za-z0-9-]+)/.exec(gh ? clean(gh.textContent) : '');
        return {
          nome: value(cellText(row, 'nome')),
          matricola: value(cellText(row, 'matricola')),
          github: handle ? handle[1] : null,
          ruolo: value(cellText(row, 'ruolo')),
        };
      }).filter((m) => m.nome);
    }

    const setup = findSec(secs, 'setup', 'installazione');
    if (setup) {
      d.setup = [...dom(setup.text).querySelectorAll('ol > li, ul > li')].map((li) => {
        const code = li.querySelector('pre, code');
        const copy = li.cloneNode(true);
        copy.querySelectorAll('pre, code').forEach((n) => n.remove());
        return { titolo: clean(copy.textContent).replace(/:\s*$/, ''), cmd: code ? value(code.textContent) : null };
      }).filter((s) => s.titolo);
    }

    const refs = findSec(secs, 'riferimenti');
    if (refs) {
      d.riferimenti = [...dom(refs.text).querySelectorAll('li')].map((li) => {
        const a = li.querySelector('a[href^="http"]');
        return { testo: clean(li.textContent), url: a ? a.getAttribute('href') : null };
      }).filter((r) => r.testo);
    }

    const coll = /collaborazione con\s+(.+?)\s+[—–-]\s/i.exec(md);
    if (coll) d.proponente = value(coll[1]);
    return d;
  }

  function applyReadme(d) {
    const P = C.progetto;
    const S = BC.Repo.src;
    if (d.titolo) P.titolo = d.titolo;
    if (d.scheda) {
      const f = d.scheda;
      const take = (names, field, fn = (x) => x) => {
        const k = names.find((n) => n in f);
        if (k) P[field] = fn(value(f[k]));
      };
      take(['gruppo'], 'gruppo');
      take(['relatore', 'docente', 'responsabile del corso'], 'relatore');
      // l'università ha già la sua riga: dal corso si toglie ", Università di …"
      take(['corso'], 'corso', (v) => (v ? v.replace(/,\s*Universit\S*\s.*$/i, '') : v));
      take(['anno accademico'], 'annoAccademico');
      take(['capitolato aggiudicato', 'capitolato'], 'capitolatoAggiudicato', (v) => (v ? ((/C\d+/i.exec(v) || [])[0] || '').toUpperCase() || null : null));
      take(['proponente', 'azienda'], 'proponente');
      take(['email', 'e-mail', 'contatti'], 'email');
      S.progetto = 'README';
    }
    if (d.nota) P.nota = d.nota;
    if (d.proponente !== undefined && P.proponente == null) P.proponente = d.proponente;
    if (d.panoramica) {
      C.panoramica.testo = d.panoramica;
      S.panoramica = 'README';
    }
    if (d.struttura && d.struttura.length) C.struttura = d.struttura;
    // il README è la fonte del diario: se non collega un file, sul sito non ce n'è
    if (d.diario) {
      Object.assign(C.diario, d.diario);
      if (!d.diario.file) C.diario.stato = C.diario.stato || 'In preparazione';
    }

    if (d.capitolati && d.capitolati.length) {
      const old = Object.fromEntries(C.capitolati.map((c) => [c.id, c]));
      C.capitolati = d.capitolati.map((c) => {
        const o = old[c.id] || {};
        // "Nome: descrizione" nel README; senza ":" il testo è la descrizione,
        // a meno che coincida con il nome già noto
        const nome = c.nome || o.nome || c.descrizione || c.id;
        const descrizione = c.nome ? c.descrizione : c.descrizione && key(c.descrizione) !== key(nome) ? c.descrizione : o.descrizione || null;
        return { ...o, id: c.id, dir: c.dir || o.dir, nome, descrizione, proponente: c.proponente || o.proponente || null };
      });
      S.capitolati = 'README';
    }
    if (d.priorita && d.priorita.length) {
      const old = Object.fromEntries(C.priorita.map((p) => [p.capitolato, p]));
      C.priorita = d.priorita.flatMap((p) => p.ids.map((id) => ({
        capitolato: id, rank: p.rank, motivazione: p.motivazione || (old[id] || {}).motivazione || null,
      })));
      S.priorita = 'README';
    }
    if (d.verbali && d.verbali.length) {
      const old = Object.fromEntries(C.verbali.map((v) => [v.id, v]));
      C.verbali = d.verbali.map((v) => {
        const o = (v.id && old[v.id]) || {};
        const pick = (k) => (v[k] != null ? v[k] : o[k] != null ? o[k] : null);
        return { ...o, ...v, titolo: pick('titolo'), redattore: pick('redattore'), verificatore: pick('verificatore'), versione: pick('versione'), con: pick('con'), firmato: /firmat/i.test(v.file || '') || !!o.firmato };
      });
      S.verbali = 'README';
    }
    if (d.team && d.team.length) {
      const old = Object.fromEntries(C.team.map((m) => [key(m.github), m]));
      C.team = d.team.map((m) => ({ ...(old[key(m.github)] || {}), ...Object.fromEntries(Object.entries(m).filter(([, v]) => v != null)) }));
      S.team = 'README';
    }
    if (d.setup && d.setup.length) {
      C.setup = d.setup;
      S.setup = 'README';
    }
    if (d.riferimenti && d.riferimenti.length) {
      C.riferimenti = d.riferimenti;
      S.riferimenti = 'README';
    }
  }

  /* ---------- milestone: revisioni di avanzamento ---------- */
  function codeOf(title) {
    const acr = /\b([A-Z]{2,4})\b/.exec(title);
    if (acr) return acr[1];
    const words = clean(title).split(' ').filter((w) => w.length > 2);
    return (words.slice(0, 3).map((w) => w[0]).join('') || clean(title).slice(0, 3)).toUpperCase();
  }

  // Le milestone della repo, in ordine di scadenza. Una milestone che cita una
  // revisione di content.js (la sigla come parola, "RTB", o il nome completo)
  // ne prende sigla e nome; le revisioni future ancora senza milestone restano
  // in coda come "attesa".
  function applyMilestones(list) {
    if (!Array.isArray(list) || !list.length) return;
    const ms = list.slice().sort((a, b) => (a.due_on || '9999').localeCompare(b.due_on || '9999') || a.number - b.number);
    const current = ms.find((m) => m.state === 'open');
    const reviews = C.milestone || [];
    const used = new Set();
    const fromRepo = ms.map((m) => {
      const r = reviews.find((x) => !used.has(x) && (new RegExp(`\\b${x.sigla}\\b`).test(m.title) || key(m.title).includes(key(x.nome))));
      if (r) used.add(r);
      const tot = m.open_issues + m.closed_issues;
      const stato = m.state === 'closed' ? 'completata' : m === current || m.closed_issues > 0 ? 'in-corso' : 'attesa';
      return {
        sigla: r ? r.sigla : codeOf(m.title),
        nome: r && key(m.title) === key(r.sigla) ? r.nome : m.title,
        descrizione: value(m.description),
        data: m.due_on ? BC.dayKey(new Date(m.due_on)) : null,
        chiusa: m.closed_at ? BC.dayKey(new Date(m.closed_at)) : null,
        stato,
        avanzamento: tot ? Math.round((m.closed_issues / tot) * 100) : null,
        issue: { aperte: m.open_issues, chiuse: m.closed_issues },
        url: m.html_url,
      };
    });
    C.milestone = [...fromRepo, ...reviews.filter((r) => !used.has(r) && r.stato === 'attesa')];
    if (current) C.progetto.fase = current.title;
    BC.Repo.src.milestone = 'milestone GitHub';
  }

  /* ---------- configurazioni ---------- */
  function applyCI(yml) {
    const types = /types='([^']+)'/.exec(yml);
    if (types) {
      const desc = Object.fromEntries((C.processo.tipiCommit || []).map((t) => [t.tipo, t.desc]));
      C.processo.tipiCommit = types[1].split('|').map((t) => ({ tipo: t, desc: desc[t] || '' }));
      BC.commitTypes = C.processo.tipiCommit.map((t) => t.tipo);
    }
    // limite di lunghezza se c'è il controllo "(( len <= N ))"; troncamento di
    // spr riconosciuto se la CI confronta il titolo con quello precedente
    const max = /\(\(\s*len\s*<=\s*(\d+)\s*\)\)/.exec(yml);
    BC.Repo.ciRepo = { lunghezzaMax: max ? Number(max[1]) : null, troncamentoSpr: /OLD_TITLE/.test(yml) };
    BC.ci = { ...BC.ci, ...BC.Repo.ciRepo };
    BC.Repo.src.ci = 'ci.yml';
  }

  function applySpr(yml) {
    const get = (k) => {
      const m = new RegExp(`^${k}:\\s*(.+?)\\s*$`, 'm').exec(yml);
      return m ? m[1].replace(/^["']|["']$/g, '') : null;
    };
    const yes = (v) => (v === 'true' ? 'sì' : v === 'false' ? 'no' : null);
    const merge = get('mergeMethod');
    if (merge) BC.ci = { ...BC.ci, merge };
    C.processo.spr = [
      { chiave: 'Check obbligatori', valore: yes(get('requireChecks')) },
      { chiave: 'Approvazione obbligatoria', valore: yes(get('requireApproval')) },
      { chiave: 'Push dei branch', valore: get('branchPushIndividually') == null ? null : get('branchPushIndividually') === 'true' ? 'uno per volta' : 'tutti insieme' },
      { chiave: 'Branch dopo il merge', valore: get('deleteMergedBranches') == null ? null : get('deleteMergedBranches') === 'true' ? 'eliminati' : 'mantenuti' },
    ].filter((r) => r.valore != null);
    BC.Repo.src.spr = '.spr.yml';
  }

  function applyOwners(txt) {
    const rules = [];
    let note = [];
    for (const line of txt.split('\n')) {
      const l = line.trim();
      if (!l) { note = []; continue; }
      if (l.startsWith('#')) {
        const c = l.replace(/^#\s?/, '');
        if (c && !/codeowners$/i.test(c)) note.push(c);
        continue;
      }
      const [path, ...owners] = l.split(/\s+/);
      rules.push({ path, owners: owners.map((o) => o.replace(/^@/, '')), nota: note.join(' ') || null });
      note = [];
    }
    if (rules.length) {
      C.processo.codeowners = rules;
      BC.Repo.src.codeowners = 'CODEOWNERS';
    }
  }

  // template delle issue: nome, descrizione, la Definition of Done e l'elenco
  // dei documenti di progetto (menu "Documento" del template Attività)
  const unquote = (s) => clean(s).replace(/^["']|["']$/g, '');
  async function applyTemplates(files) {
    const tpl = files.filter((f) => /^\.github\/ISSUE_TEMPLATE\/[^/]+\.ya?ml$/i.test(f.path) && !/config\.ya?ml$/i.test(f.path));
    if (!tpl.length) return;
    const texts = await Promise.allSettled(tpl.map((f) => BC.raw(f.path)));
    const list = [];
    let dod = null;
    let docs = null;
    texts.forEach((r, i) => {
      if (r.status !== 'fulfilled') return;
      const y = r.value;
      const name = (/^name:\s*(.+)$/m.exec(y) || [])[1];
      const desc = (/^description:\s*(.+)$/m.exec(y) || [])[1];
      list.push({ nome: unquote(name || fileName(tpl[i].path)), desc: desc ? unquote(desc) : null, file: fileName(tpl[i].path) });
      const block = /id:\s*dod[\s\S]*?options:\s*\n([\s\S]*?)(?=\n\s*-\s*type:|\s*$)/.exec(y);
      if (block && (!dod || /attivit/i.test(name || ''))) {
        dod = [...block[1].matchAll(/-\s*label:\s*(.+?)\s*$/gm)].map((m) => m[1].replace(/^["']|["']$/g, '').replace(/\\"/g, '"'));
      }
      const menu = /id:\s*documento\b[\s\S]*?options:\s*\n((?:[ \t]*-[^\n]*\n?)+)/.exec(y);
      if (menu && !docs) docs = [...menu[1].matchAll(/-\s*(.+?)\s*$/gm)].map((m) => unquote(m[1])).filter((n) => n && !/^(nessuno|altro)$/i.test(n));
    });
    if (list.length) {
      C.issueTemplate = list;
      BC.Repo.src.issueTemplate = 'ISSUE_TEMPLATE';
    }
    if (dod && dod.length) C.processo.definitionOfDone = dod;
    if (docs && docs.length) {
      const old = Object.fromEntries(C.documenti.map((d) => [key(d.nome), d]));
      C.documenti = docs.map((n) => old[key(n)] || { nome: n, versione: null, stato: null, file: null });
      BC.Repo.src.documenti = 'template Attività';
    }
  }

  // documenti di progetto: un PDF con il nome del documento nel nome del file
  // (la versione più alta, se il nome ne contiene una)
  function matchDocuments(files) {
    const pdfs = files.filter((f) => /\.pdf$/i.test(f.path));
    C.documenti.forEach((d) => {
      const k = key(d.nome);
      const hits = pdfs.filter((f) => key(fileName(f.path)).includes(k));
      if (!hits.length) return;
      const best = hits.map((f) => ({ f, v: versionOf(f.path) })).sort((a, b) => vcmp(a.v, b.v))[0];
      d.file = best.f.path;
      d.versione = best.v || d.versione;
      d.stato = d.stato || 'pubblicato';
    });
  }

  // motivazioni delle priorità: docs/capitolati/scelte_priorita/<rango>.md,
  // letto solo se non è vuoto (il primo paragrafo diventa la motivazione)
  async function applyPriorityNotes(files) {
    const notes = files.filter((f) => /\/scelt[ae]_priorita\/\d+\.md$/i.test(f.path) && f.size);
    await Promise.all(notes.map(async (f) => {
      const rank = Number(/(\d+)\.md$/i.exec(f.path)[1]);
      const hits = C.priorita.filter((p, i) => (p.rank || i + 1) === rank);
      if (!hits.length) return;
      const md = await BC.raw(f.path);
      const para = md.split(/\n\s*\n/).map((b) => clean(b.replace(/^#+\s.*$/gm, '').replace(/[*_>#]/g, ''))).find(Boolean);
      hits.forEach((p) => {
        p.file = f.path;
        if (!p.motivazione && para) p.motivazione = para;
      });
    }));
  }

  /* ---------- albero dei file ---------- */
  const versionOf = (p) => {
    const m = /v?(\d+)\.(\d+)\.(\d+)/i.exec(fileName(p));
    return m ? `${m[1]}.${m[2]}.${m[3]}` : null;
  };
  const vcmp = (a, b) => {
    const pa = (a || '0.0.0').split('.').map(Number);
    const pb = (b || '0.0.0').split('.').map(Number);
    return pb[0] - pa[0] || pb[1] - pa[1] || pb[2] - pa[2];
  };

  function applyTree(tree) {
    const files = tree.filter((t) => t.type === 'blob');
    const size = new Map(files.map((f) => [f.path, f.size]));
    const dirs = new Set(tree.filter((t) => t.type === 'tree').map((t) => t.path));
    BC.Repo.files = size;
    BC.Repo.dirs = dirs;
    const pdfs = files.filter((f) => /\.pdf$/i.test(f.path));

    // capitolati: presentazione = Cnp.pdf, capitolato = l'altro PDF della cartella
    C.capitolati.forEach((c) => {
      const dir = `${c.dir || `docs/capitolati/${c.id}`}/`;
      const inDir = pdfs.filter((f) => f.path.startsWith(dir));
      const pres = inDir.find((f) => /^C\d+p\.pdf$/i.test(fileName(f.path)));
      const doc = inDir.find((f) => f !== pres);
      if (doc) c.capitolato = doc.path;
      if (pres) c.presentazione = pres.path;
    });

    // verbali: preferisce la versione firmata e segnala i link rotti
    C.verbali.forEach((v) => {
      if (!v.file) return;
      const signed = v.file.replace(/(_firmato)?\.pdf$/i, '_firmato.pdf');
      if (!/_firmato\.pdf$/i.test(v.file) && size.has(signed)) {
        v.file = signed;
        v.firmato = true;
      }
      v.mancante = !size.has(v.file);
    });

    // template LaTeX: "template" nel nome del file, non solo nel percorso
    const tex = files.filter((f) => /\.tex$/i.test(f.path) && /template/i.test(fileName(f.path)));
    if (tex.length) {
      C.template = tex.map((f) => ({ nome: fileName(f.path).replace(/\.tex$/i, '').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' '), file: f.path }));
      BC.Repo.src.template = 'albero dei file';
    }

    // diario: il PDF vuoto è "in preparazione", i link rotti spariscono
    const D = C.diario;
    if (D.file) {
      if (!size.has(D.file)) D.mancante = true;
      else if (!size.get(D.file)) D.stato = D.stato || 'In preparazione';
      else if (/preparazione/i.test(D.stato || '')) D.stato = 'Pubblicato';
    }
    if (D.sorgente && !size.has(D.sorgente)) D.sorgenteMancante = true;

    // struttura: file per cartella, cartelle con solo segnaposto NULL
    const top = (p) => p.split('/')[0];
    const count = {};
    files.forEach((f) => {
      const t = top(f.path);
      if (f.path.includes('/')) (count[t] = count[t] || []).push(f);
    });
    BC.Repo.dirStats = Object.fromEntries(Object.entries(count).map(([dname, list]) => [dname, {
      files: list.length,
      vuota: list.every((f) => /(^|\/)NULL$/.test(f.path) || !f.size),
    }]));
    (C.struttura || []).forEach((s) => {
      const name = s.path.replace(/\/$/, '');
      s.esiste = dirs.has(name);
      s.files = (BC.Repo.dirStats[name] || {}).files || 0;
      s.vuota = !!(BC.Repo.dirStats[name] || {}).vuota;
    });

    // Docker predisposto ma vuoto
    const docker = C.strumenti.find((t) => /docker/i.test(t.nome));
    if (docker && size.has('Dockerfile')) docker.uso = size.get('Dockerfile') ? docker.uso || 'Ambiente containerizzato' : null;
    BC.Repo.src.albero = 'albero dei file';
    return files;
  }

  /* ---------- metadati dell'API ---------- */
  function applyContributors(list) {
    const by = Object.fromEntries(list.map((c) => [key(c.login), c.contributions]));
    C.team.forEach((m) => { m.commit = by[key(m.github)] || 0; });
    BC.Repo.meta.contributori = list.length;
  }

  function applyRepo(r) {
    const M = BC.Repo.meta;
    M.descrizione = r.description || null;
    M.topics = r.topics || [];
    M.licenza = r.license && r.license.spdx_id !== 'NOASSERTION' ? r.license.spdx_id : null;
    M.creata = r.created_at;
    M.stelle = r.stargazers_count;
    M.fork = r.forks_count;
    M.osservatori = r.subscribers_count;
    M.dimensione = r.size;
    M.homepage = r.homepage || null;
  }

  // copia dei dati di content.js prima di applicare la repo, per reset()
  let pristine = null;
  function snapshot() {
    try {
      pristine = { content: JSON.stringify(C), ci: { ...BC.ci }, commitTypes: BC.commitTypes.slice() };
    } catch (e) { pristine = null; }
  }

  BC.Repo = {
    src: {},
    meta: {},
    files: null,
    dirs: null,
    dirStats: null,
    // idle | loading | ok | parziale (qualche richiesta fallita) | offline
    // (nessuna risposta) | ripiego (dati della repo scartati da reset())
    status: 'idle',
    errors: [],
    syncedAt: null,

    load() {
      if (this.p) return this.p;
      this.status = 'loading';
      snapshot();
      const jobs = {
        readme: BC.raw('README.md'),
        ci: BC.raw('.github/workflows/ci.yml'),
        spr: BC.raw('.spr.yml'),
        owners: BC.raw('.github/CODEOWNERS'),
        milestones: BC.GH.milestones(),
        tree: BC.GH.tree(),
        contributors: BC.GH.contributors(),
        repo: BC.GH.repo(),
        languages: BC.GH.languages(),
        releases: BC.GH.releases(),
      };
      const names = Object.keys(jobs);
      this.p = Promise.allSettled(Object.values(jobs)).then(async (res) => {
        const r = Object.fromEntries(names.map((n, i) => [n, res[i]]));
        const run = (name, fn) => {
          if (r[name].status !== 'fulfilled') return;
          try { return fn(r[name].value); } catch (e) { console.warn(`repo.js: ${name} non leggibile`, e); }
        };
        const later = async (what, fn) => {
          try { await fn(); } catch (e) { console.warn(`repo.js: ${what} non leggibili`, e); }
        };
        // ordine: prima il README (elenchi), poi ciò che li arricchisce
        run('readme', (md) => applyReadme(parseReadme(md)));
        run('milestones', applyMilestones);
        run('ci', applyCI);
        run('spr', applySpr);
        run('owners', applyOwners);
        const files = run('tree', applyTree);
        if (files) {
          await later('template', () => applyTemplates(files));
          await later('motivazioni', () => applyPriorityNotes(files));
          await later('documenti', () => matchDocuments(files));
        }
        run('contributors', applyContributors);
        run('repo', applyRepo);
        run('languages', (l) => { this.meta.linguaggi = l; });
        run('releases', (l) => { this.meta.release = l[0] || null; });
        this.errors = names.map((n, i) => (res[i].status === 'rejected' ? { job: n, ...pickErr(res[i].reason) } : null)).filter(Boolean);
        const okCount = res.length - this.errors.length;
        this.status = okCount === res.length ? 'ok' : okCount ? 'parziale' : 'offline';
        this.syncedAt = Date.now();
        return this.status;
      });
      return this.p;
    },

    // i dati della repo hanno rotto il rendering: si torna a quelli di content.js
    reset() {
      if (!pristine) return false;
      const data = JSON.parse(pristine.content);
      Object.keys(C).forEach((k) => { delete C[k]; });
      Object.assign(C, data);
      BC.ci = pristine.ci;
      BC.commitTypes = pristine.commitTypes;
      this.src = {};
      this.ciRepo = null;
      this.status = 'ripiego';
      return true;
    },

    // nuova lettura: svuota la cache di sessione della repo e ricarica la pagina
    // (senza intro)
    retry() {
      try {
        Object.keys(sessionStorage).filter((k) => /^bc\.(gh|raw):/.test(k)).forEach((k) => sessionStorage.removeItem(k));
      } catch (e) { /* storage bloccato: si ricarica comunque */ }
      BC.store.sset('bc.entered', '1');
      location.reload();
    },

    // etichetta della sorgente di una sezione (per le micro-etichette del sito)
    label(...keys) {
      if (this.status === 'idle') return 'content.js';
      if (this.status === 'offline') return 'content.js (offline)';
      const found = keys.map((k) => this.src[k]).filter(Boolean);
      return found.length ? [...new Set(found)].join(' · ') : 'content.js';
    },
  };
})();
