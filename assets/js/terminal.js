/* =====================================================================
   BIT CRUSHER // terminal.js
   Console del sito (tasto \ o `, pulsante >_): esplorare la repo di
   progetto da tastiera, in sola lettura e senza effetti.
   - ls, cd, tree e find usano l'albero dei file letto da repo.js (una
     sola richiesta per tutta la repo);
   - cat, head e grep leggono i file di testo da raw.githubusercontent.com,
     fuori dal limite dell'API;
   - documenti, verbali, revisioni, capitolati e squadra mostrano i dati
     del sito; stato e log interrogano l'API pubblica di GitHub.
   ===================================================================== */
(function () {
  'use strict';

  const BC = window.BC;
  const C = BC.content;
  const h = BC.h;

  const kbd = (cmd) => h('button', { type: 'button', class: 'kbd', 'data-cmd': cmd }, cmd);
  const size = (n) => (n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(1)} MB`);
  const baseName = (p) => String(p).replace(/\/$/, '').split('/').pop();
  // comandi che prendono un percorso della repo (per il completamento con Tab)
  const PATH_CMDS = ['ls', 'dir', 'cd', 'cat', 'head', 'apri', 'open', 'tree', 'grep'];

  function ciLabel(run) {
    if (!run) return 'nessuna esecuzione';
    if (run.status !== 'completed') return 'IN CORSO';
    return { success: 'PASS', failure: 'FAIL', cancelled: 'ANNULLATA', skipped: 'SALTATA' }[run.conclusion] || String(run.conclusion).toUpperCase();
  }
  BC.ciLabel = ciLabel;

  /* ---------- file system della repo (sola lettura) ---------- */
  // l'albero letto da repo.js; se non c'è ancora lo si chiede qui
  async function repoFs() {
    if (!BC.Repo.files) {
      const tree = await BC.GH.tree();
      BC.Repo.files = new Map(tree.filter((x) => x.type === 'blob').map((x) => [x.path, x.size]));
      BC.Repo.dirs = new Set(tree.filter((x) => x.type === 'tree').map((x) => x.path));
    }
    return { files: BC.Repo.files, dirs: BC.Repo.dirs };
  }
  const isDir = (fs, p) => p === '' || fs.dirs.has(p);
  // file che si possono mostrare come testo
  const TEXT = /\.(md|ya?ml|sh|txt|tex|json|js|css|html|svg|csv|gitconfig|gitignore)$|(^|\/)(LICENSE|Dockerfile|CODEOWNERS|NULL)$/i;

  // contenuto diretto di una cartella, cartelle prima: [{ name, dir, size }]
  function children(fs, dir) {
    const pre = dir ? `${dir}/` : '';
    const out = new Map();
    const direct = (p) => p.startsWith(pre) && p.length > pre.length && !p.slice(pre.length).includes('/');
    fs.dirs.forEach((d) => { if (direct(d)) out.set(d, { name: d.slice(pre.length), dir: true }); });
    fs.files.forEach((sz, p) => { if (direct(p)) out.set(p, { name: p.slice(pre.length), dir: false, size: sz }); });
    return [...out.values()].sort((a, b) => (a.dir === b.dir ? a.name.localeCompare(b.name) : a.dir ? -1 : 1));
  }

  // "*.pdf", "verbale_?" -> espressione regolare sul nome del file
  const globRe = (q) => new RegExp(`^${q.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.')}$`, 'i');

  // testo con le corrispondenze evidenziate (per grep)
  function mark(text, re) {
    const out = [];
    let last = 0;
    let m;
    re.lastIndex = 0;
    while ((m = re.exec(text))) {
      out.push(text.slice(last, m.index), h('mark', { class: 'tmark' }, m[0]));
      last = m.index + m[0].length;
    }
    out.push(text.slice(last));
    return out;
  }

  // testo di un file, con i controlli comuni a cat e head
  async function readText(t, cmd, arg) {
    if (!arg) {
      t.line(`uso: ${cmd} <file>`, 'dim');
      return null;
    }
    const fs = await repoFs();
    const path = t.resolve(arg);
    let err = null;
    if (isDir(fs, path)) err = `${path}: è una cartella`;
    else if (!fs.files.has(path)) err = `${path}: file inesistente`;
    else if (!TEXT.test(path)) err = [`${path}: non è un file di testo, prova `, kbd(`apri ${path}`)];
    if (err) {
      t.line([`${cmd}: `, err], 'err');
      return null;
    }
    return { path, size: fs.files.get(path), text: await BC.raw(path) };
  }

  class Terminal {
    constructor(root, opts = {}) {
      this.root = root;
      this.onClose = opts.onClose;
      this.out = root.querySelector('[data-term-out]');
      this.form = root.querySelector('[data-term-form]');
      this.input = root.querySelector('[data-term-input]');
      this.prompt = root.querySelector('[data-term-prompt]');
      this.field = this.input.parentElement;
      this.history = [];
      this.hi = 0;
      this.cwd = '';

      this.form.addEventListener('submit', (e) => {
        e.preventDefault();
        const v = this.input.value;
        this.input.value = '';
        this.syncCaret();
        this.exec(v);
      });
      this.input.addEventListener('keydown', (e) => this.key(e));
      ['input', 'keyup', 'click', 'select', 'focus'].forEach((ev) => this.input.addEventListener(ev, () => this.syncCaret()));
      root.addEventListener('click', (e) => {
        const b = e.target.closest('[data-cmd]');
        if (b && root.contains(b)) {
          e.preventDefault();
          this.exec(b.dataset.cmd);
          return;
        }
        if (e.target.closest('a, button, input')) return;
        if (!String(window.getSelection())) this.focus();
      });
      this.setPrompt();
    }

    focus() {
      this.input.focus({ preventScroll: true });
    }

    syncCaret() {
      this.field.style.setProperty('--pos', String(this.input.selectionStart || 0));
    }

    setPrompt() {
      this.prompt.textContent = `guest@bitcrusher:~${this.cwd ? '/' + this.cwd : ''}$`;
    }

    line(content, cls) {
      const empty = content == null || content === '';
      const el = this.out.appendChild(h('div', { class: 'tl' + (cls ? ' ' + cls : '') }, empty ? ' ' : content));
      this.out.scrollTop = this.out.scrollHeight;
      return el;
    }

    clear() {
      this.out.textContent = '';
    }

    key(e) {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        if (e.key === 'ArrowUp' && this.hi > 0) this.hi--;
        if (e.key === 'ArrowDown' && this.hi < this.history.length) this.hi++;
        this.input.value = this.history[this.hi] || '';
        const n = this.input.value.length;
        requestAnimationFrame(() => {
          this.input.setSelectionRange(n, n);
          this.syncCaret();
        });
      } else if (e.key === 'Tab') {
        e.preventDefault();
        this.complete();
        this.syncCaret();
      } else if (e.ctrlKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        this.clear();
      } else if (e.ctrlKey && e.key.toLowerCase() === 'c' && !String(window.getSelection())) {
        e.preventDefault();
        this.line([this.prompt.textContent, ' ', this.input.value, '^C'], 'dim');
        this.input.value = '';
        this.syncCaret();
      } else if (e.key === 'Escape' && this.onClose) {
        e.preventDefault();
        this.onClose();
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
        BC.SFX.key();
      }
    }

    async exec(raw) {
      const text = String(raw).trim();
      this.line([h('span', { class: 'tp' }, this.prompt.textContent), ' ', text], 'echo');
      if (!text) return;
      this.history.push(text);
      this.hi = this.history.length;
      const [name, ...args] = text.split(/\s+/);
      const cmd = find(name.toLowerCase());
      if (!cmd) {
        BC.SFX.error();
        this.line(`comando non trovato: ${name}. Digita «aiuto» per l'elenco.`, 'err');
        return;
      }
      BC.SFX.blip();
      try {
        await cmd.run(this, args);
      } catch (err) {
        // errori di rete o dell'API: il messaggio di BC.ghError; gli altri così come sono
        const net = err && (err.status || /fetch|network/i.test(err.message || ''));
        this.line(`errore: ${net ? BC.ghError(err) : (err && err.message) || err}`, 'err');
      }
    }

    // Tab: completa i comandi, le sezioni di «vai» e i percorsi della repo
    complete() {
      const parts = this.input.value.replace(/^\s+/, '').split(/\s+/);
      const cmd = (parts[0] || '').toLowerCase();
      let pool, pre, head = '';
      if (parts.length <= 1) {
        pool = COMMANDS.filter((c) => !c.hidden).map((c) => c.name);
        pre = cmd;
      } else if (['vai', 'goto'].includes(cmd)) {
        pool = BC.sections.map((s) => s.id);
        pre = parts[1].toLowerCase();
        head = parts[0] + ' ';
      } else if (PATH_CMDS.includes(cmd) && BC.Repo.files) {
        const arg = parts[parts.length - 1];
        const cut = arg.lastIndexOf('/') + 1;
        pool = children({ files: BC.Repo.files, dirs: BC.Repo.dirs }, this.resolve(arg.slice(0, cut)))
          .map((it) => arg.slice(0, cut) + it.name + (it.dir ? '/' : ''));
        pre = arg;
        head = parts.slice(0, -1).join(' ') + ' ';
      } else return;
      const hits = pool.filter((n) => n.startsWith(pre));
      if (hits.length === 1) this.input.value = head + hits[0] + (head ? '' : ' ');
      else if (hits.length > 1) {
        // si completa il prefisso comune e si elencano le possibilità
        let common = hits[0];
        hits.forEach((x) => { while (!x.startsWith(common)) common = common.slice(0, -1); });
        if (common.length > pre.length) this.input.value = head + common;
        this.line(hits.map((x) => x.slice(x.lastIndexOf('/', x.length - 2) + 1)).join('   '), 'dim');
      }
    }

    // percorsi relativi alla root della repo ("~" = root)
    resolve(arg) {
      const a = String(arg || '');
      const parts = a.startsWith('/') || a.startsWith('~') ? [] : this.cwd ? this.cwd.split('/') : [];
      for (const seg of a.replace(/^~/, '').split('/')) {
        if (!seg || seg === '.') continue;
        if (seg === '..') parts.pop();
        else parts.push(seg);
      }
      return parts.join('/');
    }
  }

  /* ---------- comandi ---------- */
  const COMMANDS = [
    {
      name: 'aiuto', alias: ['help', '?'], desc: 'mostra questo elenco',
      run(t) {
        t.line('COMANDI DISPONIBILI', 'hi');
        COMMANDS.filter((c) => !c.hidden).forEach((c) => {
          t.line([h('span', { class: 'tcmd' }, (c.usage || c.name).padEnd(30)), c.desc]);
        });
        t.line('Tab completa comandi e percorsi · ↑↓ cronologia · Ctrl+L pulisce', 'dim');
      },
    },
    {
      name: 'vai', alias: ['goto'], usage: 'vai <sezione>', desc: 'raggiungi una sezione del sito',
      run(t, [id]) {
        const sec = BC.sections.find((s) => s.id === String(id || '').toLowerCase());
        if (!sec) {
          t.line('uso: vai <sezione>', 'dim');
          t.line('sezioni: ' + BC.sections.map((s) => s.id).join(' · '), 'dim');
          return;
        }
        t.line(`» ${sec.label}`);
        if (t.onClose) t.onClose();
        BC.goto(sec.id);
      },
    },
    {
      name: 'ls', alias: ['dir'], usage: 'ls [percorso]', desc: 'elenca una cartella della repo',
      async run(t, [arg]) {
        const fs = await repoFs();
        const path = t.resolve(arg);
        if (fs.files.has(path)) return t.line([baseName(path), h('span', { class: 'tsz' }, '  ' + size(fs.files.get(path)))]);
        if (!isDir(fs, path)) return t.line(`ls: ${path}: percorso inesistente`, 'err');
        children(fs, path).forEach((it) => t.line(it.dir
          ? h('span', { class: 'tdir' }, it.name + '/')
          : [it.name, h('span', { class: 'tsz' }, '  ' + size(it.size))]));
      },
    },
    {
      name: 'cd', usage: 'cd <percorso>', desc: 'cambia cartella nella repo',
      async run(t, [arg]) {
        const fs = await repoFs();
        const path = t.resolve(arg || '~');
        if (!isDir(fs, path)) return t.line(`cd: ${path}: ${fs.files.has(path) ? 'non è una cartella' : 'percorso inesistente'}`, 'err');
        t.cwd = path;
        t.setPrompt();
      },
    },
    { name: 'pwd', desc: 'cartella corrente', run(t) { t.line(`~/${t.cwd}`); } },
    {
      name: 'tree', usage: 'tree [percorso] [-L n]', desc: 'albero dei file (2 livelli, -L per cambiarli)',
      async run(t, args) {
        const fs = await repoFs();
        let depth = 2;
        const rest = [];
        for (let i = 0; i < args.length; i++) {
          if (args[i] === '-L') depth = Math.max(1, parseInt(args[++i], 10) || depth);
          else rest.push(args[i]);
        }
        const path = t.resolve(rest[0]);
        if (!isDir(fs, path)) return t.line(`tree: ${path}: non è una cartella`, 'err');
        let nd = 0;
        let nf = 0;
        t.line(h('span', { class: 'tdir' }, path ? `${path}/` : '.'));
        const walk = (dir, prefix, level) => {
          const list = children(fs, dir);
          list.forEach((it, i) => {
            const last = i === list.length - 1;
            const branch = h('span', { class: 'ttree' }, prefix + (last ? '`-- ' : '|-- '));
            if (!it.dir) {
              nf++;
              return t.line([branch, it.name]);
            }
            nd++;
            t.line([branch, h('span', { class: 'tdir' }, it.name + '/')]);
            if (level < depth) walk(dir ? `${dir}/${it.name}` : it.name, prefix + (last ? '    ' : '|   '), level + 1);
          });
        };
        walk(path, '', 1);
        t.line(`${nd} cartelle, ${nf} file`, 'dim');
      },
    },
    {
      name: 'find', usage: 'find <nome>', desc: 'cerca file e cartelle per nome (anche *.pdf)',
      async run(t, [q]) {
        if (!q) return t.line('uso: find <nome>, es. «find verbale» o «find *.pdf»', 'dim');
        const fs = await repoFs();
        const re = /[*?]/.test(q) ? globRe(q) : null;
        const low = q.toLowerCase();
        const pre = t.cwd ? `${t.cwd}/` : '';
        const hits = [...fs.dirs].map((d) => `${d}/`).concat([...fs.files.keys()])
          .filter((p) => p.startsWith(pre) && (re ? re.test(baseName(p)) : p.slice(pre.length).toLowerCase().includes(low)))
          .sort();
        hits.slice(0, 60).forEach((p) => t.line(p.endsWith('/') ? h('span', { class: 'tdir' }, p) : p));
        t.line(hits.length ? `${hits.length} risultati${hits.length > 60 ? ' (mostrati i primi 60)' : ''}` : 'nessun risultato', 'dim');
      },
    },
    {
      name: 'grep', usage: 'grep [-i] <testo> [percorso]', desc: 'cerca un testo nei file della repo',
      async run(t, args) {
        const ci = args.some((a) => /^-[a-z]*i/i.test(a));
        const [q, where] = args.filter((a) => !/^-[a-z]+$/i.test(a));
        if (!q) return t.line('uso: grep [-i] <testo> [percorso], es. «grep -i responsabile docs»', 'dim');
        const fs = await repoFs();
        const root = t.resolve(where || '');
        const one = fs.files.has(root);
        const targets = [...fs.files]
          .filter(([p, sz]) => (one ? p === root : p.startsWith(root ? `${root}/` : '')) && TEXT.test(p) && sz > 0 && sz <= 200000)
          .map(([p]) => p);
        if (!targets.length) return t.line(`grep: nessun file di testo in ${root || '~'}`, 'err');
        if (targets.length > 40) return t.line(`grep: ${targets.length} file da leggere, restringi il percorso (es. «grep ${q} docs»)`, 'err');
        const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), ci ? 'gi' : 'g');
        t.line(`ricerca in ${targets.length} file...`, 'dim');
        const texts = await Promise.allSettled(targets.map((p) => BC.raw(p)));
        let n = 0;
        texts.forEach((r, i) => {
          if (r.status !== 'fulfilled') return;
          r.value.split('\n').forEach((text, j) => {
            re.lastIndex = 0;
            if (n >= 200 || !re.test(text)) return;
            n++;
            t.line([h('span', { class: 'tdir' }, targets[i]), h('span', { class: 'tsz' }, `:${j + 1}: `), ...mark(text.trim().slice(0, 300), re)]);
          });
        });
        t.line(n ? `${n} righe trovate${n >= 200 ? ' (mostrate le prime 200)' : ''}` : 'nessuna corrispondenza', 'dim');
      },
    },
    {
      name: 'cat', usage: 'cat <file>', desc: 'mostra un file di testo della repo',
      async run(t, [arg]) {
        const f = await readText(t, 'cat', arg);
        if (!f) return;
        if (f.size > 60000) return t.line(['cat: file grande (', size(f.size), '), prova ', kbd(`head ${f.path}`)], 'err');
        if (!f.text) return t.line('(file vuoto)', 'dim');
        f.text.replace(/\n$/, '').split('\n').forEach((l) => t.line(l));
      },
    },
    {
      name: 'head', usage: 'head <file> [n]', desc: 'prime righe di un file di testo (10)',
      async run(t, [arg, n]) {
        const f = await readText(t, 'head', arg);
        if (!f) return;
        const lines = f.text.replace(/\n$/, '').split('\n');
        const k = Math.max(1, parseInt(n, 10) || 10);
        lines.slice(0, k).forEach((l) => t.line(l));
        if (lines.length > k) t.line(`... altre ${lines.length - k} righe`, 'dim');
      },
    },
    {
      name: 'apri', alias: ['open'], usage: 'apri [percorso]', desc: 'apri un file in una nuova scheda (o la repo)',
      run(t, [arg]) {
        const path = t.resolve(arg || '');
        const dir = path && BC.Repo.dirs && BC.Repo.dirs.has(path);
        const url = !path ? BC.repoUrl : dir ? BC.treeUrl(path) : BC.docUrl(path);
        window.open(url, '_blank', 'noopener');
        t.line(['apertura ', h('a', { href: url, target: '_blank', rel: 'noopener' }, url)]);
      },
    },
    {
      name: 'documenti', alias: ['docs', 'consegne'], desc: 'documenti consegnati, dal più recente',
      run(t) {
        const groups = BC.Repo.deliveries();
        if (!groups.length) return t.line('nessun documento consegnato', 'dim');
        groups.forEach(({ rev, docs }) => {
          t.line(rev.nome.toUpperCase(), 'hi');
          docs.forEach((d) => t.line(['  ', d.nome.padEnd(30), (d.versione ? `v${d.versione}` : '').padEnd(8), kbd(`apri ${d.file}`)]));
        });
      },
    },
    {
      name: 'verbali', desc: 'verbali, dal più recente',
      run(t) {
        const list = C.verbali.slice().sort((a, b) => String(b.data || '9999').localeCompare(String(a.data || '9999')));
        list.forEach((v) => t.line([
          `${v.id || '---'}  ${v.data ? BC.fmtDate(v.data) : '--.--.----'}  ${v.tipo.padEnd(8)} ${v.titolo || 'titolo da definire'}  `,
          v.file && !v.mancante ? kbd(`apri ${v.file}`) : '',
        ]));
      },
    },
    {
      name: 'revisioni', alias: ['milestone', 'avanzamento'], desc: 'revisioni di avanzamento e stato',
      run(t) {
        const STATI = { completata: 'completata', 'in-corso': 'in corso', attesa: 'in attesa' };
        C.milestone.forEach((m) => t.line([
          `${m.sigla.padEnd(4)} ${String(m.nome).padEnd(38)} ${(STATI[m.stato] || m.stato).padEnd(11)}`,
          m.data ? ` scadenza ${BC.fmtDate(m.data)}` : '',
          m.issue ? ` · ${m.issue.chiuse}/${m.issue.chiuse + m.issue.aperte} attività chiuse` : '',
        ], m.stato === 'in-corso' ? 'hi' : null));
      },
    },
    {
      name: 'capitolati', alias: ['cap'], desc: 'capitolati e priorità',
      run(t) {
        const prio = C.priorita.map((p) => p.capitolato);
        C.capitolati.forEach((c) => {
          const r = prio.indexOf(c.id);
          t.line(`${c.id}  ${r >= 0 ? 'P' + (r + 1) : '  '}  ${String(c.nome || c.id).padEnd(18)} ${c.proponente || 'proponente da definire'}`, r >= 0 ? 'hi' : null);
        });
        t.line(`priorità ${prio.join(' > ')} · aggiudicato: ${C.progetto.capitolatoAggiudicato || 'in attesa'}`, 'dim');
      },
    },
    {
      name: 'squadra', alias: ['team'], desc: 'membri del gruppo',
      run(t) {
        C.team.forEach((m) => t.line(`${m.nome.padEnd(26)}${(m.matricola || '-------').padEnd(9)}${m.github ? '@' + m.github : ''}${m.ruolo ? `  [${m.ruolo}]` : ''}`));
        t.line('ruoli a rotazione · «vai squadra» per le schede', 'dim');
      },
    },
    {
      name: 'stato', alias: ['status'], desc: 'stato della repo (API GitHub)',
      async run(t) {
        const [repo, run, pulls, total] = await Promise.allSettled([BC.GH.repo(), BC.GH.lastRun(), BC.GH.pulls(), BC.GH.totalCommits()]);
        if (repo.status === 'rejected') return t.line(`stato: ${BC.ghError(repo.reason)}`, 'err');
        const r = repo.value;
        const nPR = pulls.status === 'fulfilled' ? pulls.value.length : null;
        t.line(`REPO         ${r.full_name}`);
        t.line(`ULTIMO PUSH  ${BC.relTime(r.pushed_at)} (${BC.dateTime(r.pushed_at)})`);
        if (run.status === 'fulfilled' && run.value) {
          t.line(`CI           ${ciLabel(run.value)} · ${run.value.display_title}`, run.value.conclusion === 'failure' ? 'err' : null);
        }
        t.line(`ISSUE        ${nPR == null ? r.open_issues_count : r.open_issues_count - nPR} aperte`);
        if (nPR != null) t.line(`PR           ${nPR} aperte`);
        if (total.status === 'fulfilled') t.line(`COMMIT       ${total.value} su ${C.repo.branch}`);
      },
    },
    {
      name: 'log', usage: 'log [n]', desc: 'ultimi commit su main (API GitHub)',
      async run(t, [n]) {
        const k = Math.min(20, Math.max(1, parseInt(n, 10) || 8));
        const list = await BC.GH.commits(50);
        list.slice(0, k).forEach((c) => t.line([h('span', { class: 'tsha' }, c.sha.slice(0, 7)), ' ', c.commit.message.split('\n')[0]]));
      },
    },
    { name: 'data', alias: ['date'], desc: 'data e ora di Padova', run(t) { t.line(BC.clock() + ' (Europe/Rome)'); } },
    { name: 'whoami', desc: 'chi sei', run(t) { t.line('ospite · accesso alla repo in sola lettura'); } },
    {
      name: 'storia', alias: ['history'], desc: 'comandi digitati',
      run(t) { t.history.forEach((c, i) => t.line(`${String(i + 1).padStart(4)}  ${c}`)); },
    },
    {
      name: 'suono', alias: ['sound'], usage: 'suono [on|off]', desc: 'suoni della console (spenti di default)',
      run(t, [v]) {
        const on = v === 'on' ? true : v === 'off' ? false : !BC.SFX.enabled;
        BC.SFX.set(on);
        t.line(`suono ${on ? 'attivo' : 'disattivato'}`);
      },
    },
    { name: 'pulisci', alias: ['clear', 'cls'], desc: 'pulisce lo schermo', run(t) { t.clear(); } },
    { name: 'esci', alias: ['exit', 'quit'], desc: 'chiude la console', run(t) { if (t.onClose) t.onClose(); } },
    {
      name: 'sudo', hidden: true,
      run(t) { t.line('permesso negato: la repo è montata in sola lettura.', 'err'); },
    },
    { name: 'rm', hidden: true, run(t) { t.line('rm: impossibile rimuovere: file system in sola lettura', 'err'); } },
  ];

  function find(name) {
    return COMMANDS.find((c) => c.name === name || (c.alias || []).includes(name));
  }

  BC.Terminal = Terminal;
})();
