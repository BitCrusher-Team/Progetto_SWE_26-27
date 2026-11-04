/* =====================================================================
   BIT CRUSHER // repo.js
   Il sito legge i propri dati dalla repo di progetto, in sola lettura:
   - README.md: scheda del gruppo (<aside>), nota, template del diario,
     verbali, capitolati e priorità, squadra, proponente (riga finale);
   - milestone di GitHub: revisioni di avanzamento con scadenza, stato
     e percentuale (issue chiuse sul totale);
   - template Attività: nomi ufficiali dei documenti (menu "Documento");
   - albero dei file: consegne di ogni revisione (docs/<revisione>/),
     interventi del diario di bordo, verbali, e verifica che i link del
     README puntino a file esistenti;
   - API: contributori, licenza, linguaggi, release.
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
  const clean = (s) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
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

    // diario: il README indica il template (un file con "template" nel percorso);
    // gli interventi si leggono dall'albero, in docs/diario_di_bordo/. Un link
    // con un segnaposto nel percorso ("[TO_REPLACE]") è un file non ancora
    // caricato, e il testo del link dice quale
    const diario = findSec(secs, 'diario');
    if (diario) {
      const links = [...dom(diario.text).querySelectorAll('a')]
        .map((a) => ({ path: repoPath(a.getAttribute('href')), text: clean(a.textContent) }))
        .filter((a) => a.path);
      const pending = (a) => /\[[^\]]*\]/.test(a.path);
      const later = links.find(pending);
      d.diario = {
        template: (links.find((a) => !pending(a) && /template/i.test(a.path) && /\.[a-z0-9]+$/i.test(a.path)) || {}).path || null,
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

    // capitolati e priorità: per il capitolato aggiudicato in home e per il
    // comando «capitolati» del terminale
    const cap = findSec(secs, 'capitolati');
    if (cap) {
      d.capitolati = [...dom(cap.text).querySelectorAll('dt')].map((dt) => {
        const id = (/C\d+/i.exec(dt.textContent) || [])[0];
        const dd = dt.nextElementSibling && dt.nextElementSibling.tagName === 'DD' ? dt.nextElementSibling : null;
        const [main, prop] = clean(dd ? dd.textContent : '').split(/\s+—\s+/);
        const i = main.indexOf(':');
        return { id: id ? id.toUpperCase() : null, nome: i > 0 ? clean(main.slice(0, i)) : null, proponente: value(prop) };
      }).filter((c) => c.id);
    }

    const prio = findSec(secs, 'scelta per priorita', 'priorita');
    if (prio) {
      d.priorita = tableRows(dom(prio.text)).map((row) => ({
        rank: Number((/\d+/.exec(cellText(row, 'priorita') || '') || [])[0]) || 99,
        ids: ((cellText(row, 'capitolat') || '').match(/C\d+/gi) || []).map((x) => x.toUpperCase()),
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
    if (d.diario) {
      if (d.diario.template) C.diario.template = d.diario.template;
      C.diario.atteso = d.diario.atteso;
    }
    if (d.capitolati && d.capitolati.length) {
      const old = Object.fromEntries(C.capitolati.map((c) => [c.id, c]));
      C.capitolati = d.capitolati.map((c) => {
        const o = old[c.id] || {};
        return { id: c.id, nome: c.nome || o.nome || c.id, proponente: c.proponente || o.proponente || null };
      });
    }
    if (d.priorita && d.priorita.length) {
      C.priorita = d.priorita.flatMap((p) => p.ids.map((id) => ({ capitolato: id })));
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
  }

  /* ---------- milestone: revisioni di avanzamento ---------- */
  function codeOf(title) {
    const acr = /\b([A-Z]{2,4})\b/.exec(title);
    if (acr) return acr[1];
    const words = clean(title).split(' ').filter((w) => w.length > 2);
    return (words.slice(0, 3).map((w) => w[0]).join('') || clean(title).slice(0, 3)).toUpperCase();
  }

  // Le milestone della repo, in ordine di scadenza. Una milestone che cita una
  // revisione di content.js (la sigla come parola, "RTB", il nome completo o un
  // alias) ne prende sigla e nome ufficiale, così sul sito resta "Candidatura"
  // anche se la milestone si chiama "Aggiudicazione appalto". Le revisioni
  // future ancora senza milestone restano in coda come "attesa".
  function applyMilestones(list) {
    if (!Array.isArray(list) || !list.length) return;
    const ms = list.slice().sort((a, b) => (a.due_on || '9999').localeCompare(b.due_on || '9999') || a.number - b.number);
    const current = ms.find((m) => m.state === 'open');
    const reviews = C.milestone || [];
    const used = new Set();
    const cites = (m, x) => new RegExp(`\\b${x.sigla}\\b`).test(m.title)
      || [x.nome, ...(x.alias || [])].some((n) => n && key(m.title).includes(key(n)));
    const fromRepo = ms.map((m) => {
      const r = reviews.find((x) => !used.has(x) && cites(m, x));
      if (r) used.add(r);
      const tot = m.open_issues + m.closed_issues;
      const stato = m.state === 'closed' ? 'completata' : m === current || m.closed_issues > 0 ? 'in-corso' : 'attesa';
      if (m === current) C.progetto.fase = r ? r.nome : m.title;
      return {
        sigla: r ? r.sigla : codeOf(m.title),
        nome: r ? r.nome : m.title,
        alias: r ? r.alias : undefined,
        data: m.due_on ? BC.dayKey(new Date(m.due_on)) : null,
        chiusa: m.closed_at ? BC.dayKey(new Date(m.closed_at)) : null,
        stato,
        avanzamento: tot ? Math.round((m.closed_issues / tot) * 100) : null,
        issue: { aperte: m.open_issues, chiuse: m.closed_issues },
        url: m.html_url,
      };
    });
    C.milestone = [...fromRepo, ...reviews.filter((r) => !used.has(r) && r.stato === 'attesa')];
    BC.Repo.src.milestone = 'milestone GitHub';
  }

  /* ---------- consegne: i documenti di ogni revisione ---------- */
  // chiave tollerante per i nomi dei documenti, senza articoli e preposizioni:
  // "Valutazione dei capitolati" = "Valutazione_Capitolati"
  const STOP = /\b(il|lo|la|i|gli|le|di|del|dello|della|dei|degli|delle|e|ed)\b/g;
  const docKey = (s) => norm(s).replace(STOP, ' ').replace(/[^a-z0-9]/g, '');

  // nomi ufficiali dei documenti: il menu "Documento" del template Attività
  async function applyDocNames(files) {
    const f = files.find((x) => /^\.github\/ISSUE_TEMPLATE\/[^/]*attivit[^/]*\.ya?ml$/i.test(x.path));
    if (!f) return;
    const menu = /id:\s*documento\b[\s\S]*?options:\s*\n((?:[ \t]*-[^\n]*\n?)+)/.exec(await BC.raw(f.path));
    if (!menu) return;
    const names = [...menu[1].matchAll(/-\s*(.+?)\s*$/gm)]
      .map((m) => clean(m[1]).replace(/^["']|["']$/g, ''))
      .filter((n) => n && !/^(nessuno|altro)$/i.test(n));
    if (names.length) C.documenti = names.map((nome) => ({ nome }));
  }

  // nome leggibile di un file: senza estensione, versione e nome del gruppo
  // ("Lettera_Di_Presentazione_BitCrusher_v1.0.0.pdf" -> "Lettera di presentazione")
  function prettyName(path) {
    const group = String(C.progetto.gruppo || '').split(/\s+/).filter(Boolean).join('[_\\s-]*');
    let n = fileName(path).replace(/\.[a-z0-9]+$/i, '').replace(/[_\s-]*v?\d+(?:[._]\d+){1,2}$/i, '');
    if (group) n = n.replace(new RegExp(`[_\\s-]*${group}`, 'ig'), '');
    n = n.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
    return n.charAt(0).toUpperCase() + n.slice(1);
  }
  // nome ufficiale, se il file ne corrisponde uno
  const canonical = (name) => ((C.documenti || []).find((d) => docKey(d.nome) === docKey(name)) || {}).nome || name;

  const versionOf = (p) => {
    const m = /v?(\d+)\.(\d+)\.(\d+)/i.exec(fileName(p));
    return m ? `${m[1]}.${m[2]}.${m[3]}` : null;
  };

  // la revisione a cui appartiene una cartella di docs/ (per sigla, nome o alias)
  const reviewOf = (folder) => (C.milestone || [])
    .find((r) => [r.sigla, r.nome, ...(r.alias || [])].some((n) => n && key(n) === key(folder))) || null;

  // docs/<revisione>/[<categoria>/]<file>: es. docs/candidatura/Lettera….pdf,
  // docs/rtb/documenti_esterni/Analisi_dei_Requisiti_v1.0.0.pdf
  const DELIVERY = /^docs\/([^/]+)\/(?:([^/]+)\/)?([^/]+\.(?:pdf|pptx?|docx?|odt|odp|xlsx?))$/i;
  function applyDeliveries(files) {
    const old = C.consegne || [];
    const found = [];
    files.forEach((f) => {
      const m = DELIVERY.exec(f.path);
      const r = m && reviewOf(m[1]);
      if (!r || !f.size) return;
      const nome = canonical(prettyName(m[3]));
      const prev = old.find((d) => d.revisione === r.sigla && docKey(d.nome) === docKey(nome)) || {};
      found.push({
        revisione: r.sigla,
        nome,
        file: f.path,
        categoria: m[2] ? prettyName(m[2]) : null,
        versione: versionOf(f.path) || prev.versione || null,
        stato: prev.stato || null,
      });
    });
    if (!found.length) return;
    C.consegne = found;
    BC.Repo.src.consegne = 'cartelle docs/';
  }

  /* ---------- albero dei file ---------- */
  function applyTree(tree) {
    const files = tree.filter((t) => t.type === 'blob');
    const size = new Map(files.map((f) => [f.path, f.size]));
    BC.Repo.files = size;
    BC.Repo.dirs = new Set(tree.filter((t) => t.type === 'tree').map((t) => t.path));

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

    // verbali già nella repo ma non ancora nel README: entrano senza data, con
    // sigla e tipo ricavati dal nome del file
    const base = (p) => String(p || '').toLowerCase().replace(/_firmato(?=\.pdf$)/, '');
    const known = new Set(C.verbali.map((v) => base(v.file)));
    files.filter((f) => /^docs\/verbali\/.*\.pdf$/i.test(f.path)).forEach((f) => {
      const m = /verbale_(interno|esterno)_0*(\d+)/i.exec(fileName(f.path));
      if (!m || known.has(base(f.path))) return;
      known.add(base(f.path));
      const tipo = m[1].toLowerCase();
      const signed = f.path.replace(/(_firmato)?\.pdf$/i, '_firmato.pdf');
      C.verbali.push({
        id: `${tipo === 'esterno' ? 'E' : 'I'}${m[2].padStart(2, '0')}`, tipo, data: null, titolo: null,
        file: size.has(signed) ? signed : f.path, firmato: size.has(signed),
      });
    });

    // diario di bordo: gli interventi in docs/diario_di_bordo/, dal più recente
    // (numero più alto nel nome del file)
    const voci = files
      .filter((f) => /^docs\/diario_di_bordo\/[^/]+\.(pdf|pptx?|odp)$/i.test(f.path) && f.size)
      .map((f) => {
        const n = (/(\d+)\.[a-z0-9]+$/i.exec(f.path) || [])[1];
        return { nome: n ? `Diario di bordo ${n.padStart(2, '0')}` : prettyName(f.path), numero: n ? Number(n) : 0, file: f.path };
      })
      .sort((a, b) => b.numero - a.numero);
    if (voci.length) {
      C.diario.voci = voci;
      BC.Repo.src.diario = 'docs/diario_di_bordo';
    }
    if (C.diario.template && !size.has(C.diario.template)) C.diario.template = null;

    BC.Repo.src.albero = 'albero dei file';
    return files;
  }

  // copia dei dati di content.js prima di applicare la repo, per reset()
  let pristine = null;

  BC.Repo = {
    src: {},
    meta: {},
    files: null,
    dirs: null,
    // idle | loading | ok | parziale (qualche richiesta fallita) | offline
    // (nessuna risposta) | ripiego (dati della repo scartati da reset())
    status: 'idle',
    errors: [],

    load() {
      if (this.p) return this.p;
      this.status = 'loading';
      pristine = JSON.stringify(C);
      const jobs = {
        readme: BC.raw('README.md'),
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
        // ordine: prima il README (elenchi), poi ciò che li arricchisce
        run('readme', (md) => applyReadme(parseReadme(md)));
        run('milestones', applyMilestones);
        const files = run('tree', applyTree);
        if (files) {
          try { await applyDocNames(files); } catch (e) { console.warn('repo.js: nomi dei documenti non leggibili', e); }
          try { applyDeliveries(files); } catch (e) { console.warn('repo.js: consegne non leggibili', e); }
        }
        run('contributors', (l) => { this.meta.contributori = l.length; });
        run('repo', (x) => {
          this.meta.licenza = x.license && x.license.spdx_id !== 'NOASSERTION' ? x.license.spdx_id : null;
          this.meta.creata = x.created_at;
          this.meta.stelle = x.stargazers_count;
        });
        run('languages', (l) => { this.meta.linguaggi = l; });
        run('releases', (l) => { this.meta.release = l[0] || null; });
        this.errors = names.map((n, i) => (res[i].status === 'rejected' ? { job: n, ...pickErr(res[i].reason) } : null)).filter(Boolean);
        const okCount = res.length - this.errors.length;
        this.status = okCount === res.length ? 'ok' : okCount ? 'parziale' : 'offline';
        return this.status;
      });
      return this.p;
    },

    // i dati della repo hanno rotto il rendering: si torna a quelli di content.js
    reset() {
      if (!pristine) return false;
      const data = JSON.parse(pristine);
      Object.keys(C).forEach((k) => { delete C[k]; });
      Object.assign(C, data);
      this.src = {};
      this.status = 'ripiego';
      return true;
    },

    // consegne raggruppate per revisione, dalla più recente; in ogni gruppo la
    // lettera di presentazione viene per prima, poi l'ordine del catalogo
    deliveries() {
      const order = (C.milestone || []).map((m) => m.sigla);
      const rank = (d) => {
        const i = (C.documenti || []).findIndex((x) => docKey(x.nome) === docKey(d.nome));
        return /lettera/i.test(d.nome) ? -1 : i < 0 ? 999 : i;
      };
      const groups = new Map();
      (C.consegne || []).filter((d) => d.file).forEach((d) => {
        if (!groups.has(d.revisione)) groups.set(d.revisione, []);
        groups.get(d.revisione).push(d);
      });
      return [...groups.entries()]
        .map(([sigla, docs]) => ({
          rev: (C.milestone || []).find((m) => m.sigla === sigla) || { sigla, nome: sigla },
          docs: docs.slice().sort((a, b) => rank(a) - rank(b) || a.nome.localeCompare(b.nome)),
        }))
        .sort((a, b) => order.indexOf(b.rev.sigla) - order.indexOf(a.rev.sigla));
    },

    // nuova lettura: svuota la cache di sessione della repo e ricarica la pagina
    retry() {
      try {
        Object.keys(sessionStorage).filter((k) => /^bc\.(gh|raw):/.test(k)).forEach((k) => sessionStorage.removeItem(k));
      } catch (e) { /* storage bloccato: si ricarica comunque */ }
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
