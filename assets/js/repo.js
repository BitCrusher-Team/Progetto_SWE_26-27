/* =====================================================================
   BIT CRUSHER // repo.js
   Il sito legge i documenti dalla repo di progetto, in sola lettura:
   - README.md: tabella dei verbali (data, argomento, file), tabella del
     team (componenti), "Capitolato aggiudicato" nella scheda <aside>;
   - albero dei file: documenti delle consegne in docs/<consegna>/ o
     docs/compiled/<consegna>/, verbali in docs/verbali/ o
     docs/compiled/verbali/ (anche quelli non ancora nel README, e la
     versione _firmato se c'è), diari in docs/diario_di_bordo/, e quali
     file dei glossari (content.js) ci sono davvero.
   content.js resta il ripiego se la repo non risponde. Due richieste in
   tutto: l'albero (API) e il README (file grezzo).
   ===================================================================== */
(function () {
  'use strict';

  const BC = window.BC;
  const C = BC.content;
  const R = C.repo;

  const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  const clean = (s) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  // null se il testo è vuoto o è solo un segnaposto del README ("[Prematuro]")
  const value = (s) => {
    const t = clean(s);
    return !t || /^\[[^\]]*\]$/.test(t) ? null : t;
  };
  const fileName = (p) => String(p).split('/').pop();
  // stesso verbale con o senza la versione firmata
  const base = (p) => String(p).toLowerCase().replace(/_firmato(?=\.pdf$)/, '');
  const dom = (html) => new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html').body;

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
  // sezioni "## Titolo" -> testo; il README chiude un <dd senza ">"
  function section(md, ...keys) {
    const parts = md.replace(/<\/dd(?!>)/g, '</dd>').split(/^#{1,3}\s+/m);
    const hit = parts.find((p) => keys.some((k) => norm(p.split('\n')[0]).startsWith(k)));
    return hit ? dom(hit.slice(hit.indexOf('\n') + 1)) : null;
  }

  // righe di una tabella come { intestazione: cella }
  function rows(el) {
    const t = el && el.querySelector('table');
    if (!t) return [];
    const heads = [...t.querySelectorAll('thead th, tr:first-child th')].map((th) => norm(th.textContent));
    const body = [...t.querySelectorAll('tbody tr')];
    return (body.length ? body : [...t.querySelectorAll('tr')].slice(1)).map((tr) => {
      const o = {};
      [...tr.children].forEach((td, i) => { if (heads[i]) o[heads[i]] = td; });
      return o;
    });
  }
  const cell = (row, ...names) => {
    for (const k in row) if (names.some((n) => k.startsWith(n))) return row[k];
    return null;
  };

  function applyReadme(md) {
    // capitolato aggiudicato: "<strong>Capitolato aggiudicato:</strong> C6" nella scheda
    const aside = /<aside>([\s\S]*?)<\/aside>/i.exec(md);
    const award = aside && /capitolato[^<:]*:\s*<\/strong>\s*(C\d+)/i.exec(aside[1]);
    if (award && award[1].toUpperCase() !== C.sito.capitolato.id) {
      const id = award[1].toUpperCase();
      const caps = section(md, 'capitolati');
      const dt = caps && [...caps.querySelectorAll('dt')].find((x) => new RegExp(`\\b${id}\\b`, 'i').test(x.textContent));
      const dd = dt && dt.nextElementSibling;
      C.sito.capitolato = { id, titolo: dd ? clean(dd.textContent).replace(/^[^:]+:\s*/, '') : null, proponente: null };
    }

    const verb = rows(section(md, 'verbali'));
    if (verb.length) {
      const old = Object.fromEntries(C.verbali.map((v) => [base(fileName(v.file)), v]));
      const lette = verb.map((row) => {
        const a = (cell(row, 'documento', 'file', 'link', 'verbale') || dom('')).querySelector('a');
        const file = a ? repoPath(a.getAttribute('href')) : null;
        if (!file) return null;
        const o = old[base(fileName(file))] || {};
        return {
          ...o,
          tipo: /estern/i.test(file) ? 'esterno' : 'interno',
          data: (/(\d{4}-\d{2}-\d{2})/.exec(clean((cell(row, 'data') || {}).textContent)) || [])[1] || o.data || null,
          titolo: value((cell(row, 'tipologia', 'descrizione', 'titolo', 'argomento', 'oggetto') || {}).textContent) || o.titolo || null,
          file,
        };
      }).filter(Boolean);
      // i verbali di content.js che il README non elenca ancora restano, con data e titolo
      const nelReadme = new Set(lette.map((v) => base(fileName(v.file))));
      C.verbali = lette.concat(C.verbali.filter((v) => !nelReadme.has(base(fileName(v.file)))));
    }

    const team = rows(section(md, 'team', 'squadra', 'componenti', 'membri'))
      .map((row) => value((cell(row, 'nome') || {}).textContent))
      .filter(Boolean);
    if (team.length) C.componenti = team;
  }

  /* ---------- albero dei file ---------- */
  // chiave tollerante per i nomi dei documenti, senza articoli e preposizioni:
  // "Valutazione dei capitolati" = "Valutazione_Capitolati"
  const STOP = /\b(il|lo|la|i|gli|le|di|del|dello|della|dei|degli|delle|e|ed)\b/g;
  const docKey = (s) => norm(s).replace(STOP, ' ').replace(/[^a-z0-9]/g, '');
  const versionOf = (p) => {
    const m = /v?(\d+)\.(\d+)\.(\d+)/i.exec(fileName(p));
    return m ? `${m[1]}.${m[2]}.${m[3]}` : null;
  };
  // nome leggibile di un file: senza estensione, versione e nome del gruppo
  // ("Lettera_Presentazione_BitCrusher_v1.0.0.pdf" -> "Lettera presentazione")
  function prettyName(path) {
    const group = String(C.sito.gruppo || '').split(/\s+/).filter(Boolean).join('[_\\s-]*');
    let n = fileName(path).replace(/\.[a-z0-9]+$/i, '').replace(/[_\s-]*v?\d+(?:[._]\d+){1,2}$/i, '');
    if (group) n = n.replace(new RegExp(`[_\\s-]*${group}`, 'ig'), '');
    n = n.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
    return n.charAt(0).toUpperCase() + n.slice(1);
  }
  // voce del catalogo che corrisponde a un nome (anche senza preposizioni)
  const fromCatalog = (name) => C.catalogo.find((d) => docKey(d.nome) === docKey(name)) ||
    C.catalogo.find((d) => docKey(name).startsWith(docKey(d.nome)) || docKey(d.nome).startsWith(docKey(name)));

  // docs/[compiled/]<consegna>/[<sottocartelle>/]<file>: in docs/compiled/
  // l'automazione dei documenti mette i PDF compilati dai sorgenti di docs/tex/
  const DOC = /^docs\/(compiled\/)?([^/]+)\/((?:[^/]+\/)*)([^/]+\.(?:pdf|pptx?|docx?|odt|odp))$/i;
  const VERBALE = /^docs\/(?:compiled\/)?verbali\/.+\.pdf$/i;
  const firmato = (p) => p.replace(/(_firmato)?\.pdf$/i, '_firmato.pdf');

  function applyTree(tree) {
    const files = tree.filter((t) => t.type === 'blob' && t.size);
    const has = new Set(files.map((f) => f.path));
    const ids = new Set(C.consegne.map((c) => c.id));

    // documenti delle consegne; un file sia in docs/ sia in docs/compiled/ vale una volta, compilato
    const docs = [];
    files.forEach((f) => {
      const m = DOC.exec(f.path);
      if (!m || !ids.has(m[2].toLowerCase()) || (!m[1] && has.has(f.path.replace(/^docs\//, 'docs/compiled/')))) return;
      const consegna = m[2].toLowerCase();
      const cat = fromCatalog(prettyName(m[4]));
      const nome = cat ? cat.nome : prettyName(m[4]);
      const prev = C.documenti.find((d) => d.consegna === consegna && docKey(d.nome) === docKey(nome)) || {};
      docs.push({
        consegna,
        nome,
        uso: /intern/i.test(m[3]) ? 'interno' : /estern/i.test(m[3]) ? 'esterno' : cat ? cat.uso : 'esterno',
        versione: versionOf(f.path) || prev.versione || null,
        file: f.path,
      });
    });
    if (docs.length) C.documenti = docs;

    // verbali, riconosciuti dal nome del file anche se spostati in docs/compiled/:
    // la versione firmata se c'è, file mancanti fuori, nuovi file in coda
    const inRepo = {};
    const peso = (p) => (/_firmato\.pdf$/i.test(p) ? 2 : 0) + (/^docs\/compiled\//i.test(p) ? 1 : 0);
    files.filter((f) => VERBALE.test(f.path)).forEach((f) => {
      const k = base(fileName(f.path));
      if (!inRepo[k] || peso(f.path) > peso(inRepo[k])) inRepo[k] = f.path;
    });
    C.verbali = C.verbali.map((v) => ({
      ...v,
      file: inRepo[base(fileName(v.file))] || (has.has(firmato(v.file)) ? firmato(v.file) : has.has(v.file) ? v.file : null),
    })).filter((v, i, all) => v.file && all.findIndex((x) => x.file === v.file) === i);
    const known = new Set(C.verbali.map((v) => base(fileName(v.file))));
    Object.keys(inRepo).filter((k) => !known.has(k)).forEach((k) => {
      known.add(k);
      C.verbali.push({ tipo: /estern/i.test(inRepo[k]) ? 'esterno' : 'interno', data: null, titolo: null, file: inRepo[k] });
    });

    // glossari: il pulsante compare se almeno un file scelto in content.js c'è
    (C.glossari || []).forEach((g) => { g.presente = BC.percorsi(g.file).some((p) => has.has(p)); });

    // diari di bordo: numero dal nome del file, data dal ripiego (se c'è)
    const diari = files
      .filter((f) => /^docs\/diario_di_bordo\/[^/]+\.(pdf|pptx?|odp)$/i.test(f.path))
      .map((f) => {
        const numero = Number((/(\d+)\.[a-z0-9]+$/i.exec(f.path) || [])[1]) || null;
        const prev = C.diari.find((d) => d.file === f.path || (numero && d.numero === numero)) || {};
        return { numero, data: prev.data || null, file: f.path };
      });
    if (diari.length) C.diari = diari;
  }

  // copia dei dati di content.js prima di applicare la repo, per reset()
  let pristine = null;

  BC.Repo = {
    // idle | loading | ok | parziale (una delle due richieste è fallita) |
    // offline (nessuna risposta) | ripiego (dati della repo scartati)
    status: 'idle',

    load() {
      if (this.p) return this.p;
      this.status = 'loading';
      pristine = JSON.stringify(C);
      this.p = Promise.allSettled([BC.raw('README.md'), BC.GH.tree()]).then(([readme, tree]) => {
        const run = (r, fn, what) => {
          if (r.status !== 'fulfilled') return false;
          try { fn(r.value); } catch (e) { console.warn(`repo.js: ${what} non leggibile`, e); }
          return true;
        };
        // prima il README (elenco dei verbali), poi l'albero che lo verifica
        const ok = [run(readme, applyReadme, 'README'), run(tree, applyTree, 'albero dei file')];
        this.status = ok.every(Boolean) ? 'ok' : ok.some(Boolean) ? 'parziale' : 'offline';
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
      this.status = 'ripiego';
      return true;
    },

    // nuova lettura: svuota la cache di sessione della repo e ricarica la pagina
    retry() {
      try {
        Object.keys(sessionStorage).filter((k) => /^bc\.(gh|raw):/.test(k)).forEach((k) => sessionStorage.removeItem(k));
      } catch (e) { /* storage bloccato: si ricarica comunque */ }
      location.reload();
    },
  };
})();
