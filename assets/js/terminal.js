/* =====================================================================
   BIT CRUSHER // terminal.js
   Stadio 2: terminale verde di accesso. Il boot log riproduce il modo
   in cui il terminale di Cryo Archive disegna le righe: ogni riga entra
   già lunga quanto il testo finale ma con caratteri sbagliati, il
   timestamp è una barra piena, una barra gialla fa da testina, e in
   pochi fotogrammi tutto si "decodifica". Più righe insieme, con scroll.
   La stessa classe alimenta la console del sito (tasto \ o `).
   Tutti i comandi sulla repo sono in sola lettura (API pubblica).
   ===================================================================== */
(function () {
  'use strict';

  const BC = window.BC;
  const C = BC.content;
  const h = BC.h;
  const GATEWAY = 'bc_swe2627.archive';
  const TICK = 55; // ms per fotogramma di decodifica

  const kbd = (cmd) => h('button', { type: 'button', class: 'kbd', 'data-cmd': cmd }, cmd);
  const size = (n) => (n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(1)} MB`);

  function decodeB64(b64) {
    const bin = atob(String(b64).replace(/\s/g, ''));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder('utf-8').decode(bytes);
  }

  function ciLabel(run) {
    if (!run) return 'nessuna esecuzione';
    if (run.status !== 'completed') return 'IN CORSO';
    return { success: 'PASS', failure: 'FAIL', cancelled: 'ANNULLATA', skipped: 'SALTATA' }[run.conclusion] || String(run.conclusion).toUpperCase();
  }
  BC.ciLabel = ciLabel;

  /* ---------- decodifica di una riga ---------- */
  const LOW = 'abcdefghijklmnopqrstuvwxyz';
  const UP = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const DIG = '0123456789';
  const PUN = '[]<>:;.,_-=/';
  const rand = (s) => s[(Math.random() * s.length) | 0];
  function noiseChar(ch) {
    if (ch === ' ') return ' ';
    if (DIG.includes(ch)) return rand(DIG);
    if (/\p{L}/u.test(ch)) return ch === ch.toLowerCase() ? rand(LOW) : rand(UP);
    return rand(PUN);
  }
  const TS = '[    0.000000] ';

  class Decoder {
    // base: caratteri che precedono el nella riga (per allineare la testina gialla)
    constructor(el, text, { ts = false, frames = 4, base = 0 } = {}) {
      this.el = el;
      this.chars = Array.from(text);
      this.ts = ts;
      this.base = base;
      this.frames = frames;
      this.f = 0;
      this.at = this.chars.map(() => (Math.random() * (frames + 1)) | 0);
      this.head = 0.25 + Math.random() * 0.3;
      el.textContent = '';
      if (ts) {
        this.tsEl = h('span');
        el.appendChild(this.tsEl);
      }
      this.body = document.createTextNode('');
      el.appendChild(this.body);
      this.yb = h('span', { class: 'yb' });
      el.appendChild(this.yb);
      this.render();
    }
    step() {
      this.f++;
      if (this.f >= this.frames) {
        this.finish();
        return true;
      }
      this.render();
      return false;
    }
    render() {
      const f = this.f;
      if (this.tsEl) {
        if (f < this.frames - 1) {
          this.tsEl.replaceChildren(']    ', h('span', { class: 'bar', style: { width: '8ch' } }), '] ');
        } else {
          this.tsEl.textContent = `[    ${Array.from('0.000000', (c) => (c === '.' ? c : Math.random() < 0.4 ? '4' : c)).join('')}] `;
        }
      }
      let out = '';
      for (let i = 0; i < this.chars.length; i++) out += this.at[i] <= f ? this.chars[i] : noiseChar(this.chars[i]);
      this.body.data = out;
      const n = this.chars.length;
      const col = Math.min(n, Math.round(n * (this.head + (f / this.frames) * 0.6)));
      const w = 2 + ((Math.random() * 9) | 0);
      this.yb.style.left = `${this.base + (this.ts ? TS.length : 0) + Math.max(0, col - w)}ch`;
      this.yb.style.width = `${w}ch`;
    }
    finish() {
      this.f = this.frames;
      this.el.textContent = (this.ts ? TS : '') + this.chars.join('');
    }
  }

  class Terminal {
    constructor(root, opts = {}) {
      this.root = root;
      this.mode = opts.mode || 'gate';
      this.onEnter = opts.onEnter;
      this.onClose = opts.onClose;
      this.out = root.querySelector('[data-term-out]');
      this.form = root.querySelector('[data-term-form]');
      this.input = root.querySelector('[data-term-input]');
      this.prompt = root.querySelector('[data-term-prompt]');
      this.field = this.input.parentElement;
      this.history = [];
      this.hi = 0;
      this.cwd = '';
      this.fast = false;
      this.locked = false;
      this.active = new Set();
      this.timer = 0;
      this.headEl = null;

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
          if (!this.locked) this.exec(b.dataset.cmd);
          return;
        }
        if (e.target.closest('a, button, input')) return;
        if (!String(window.getSelection())) this.focus();
      });
      this.setPrompt();
    }

    focus() {
      if (!this.locked) this.input.focus({ preventScroll: true });
    }

    syncCaret() {
      this.field.style.setProperty('--pos', String(this.input.selectionStart || 0));
    }

    setPrompt() {
      this.prompt.textContent = `guest@bitcrusher:~${this.cwd ? '/' + this.cwd : ''}$`;
    }

    scroll() {
      this.out.scrollTop = this.out.scrollHeight;
    }

    append(el) {
      if (this.headEl && this.headEl.parentNode === this.out) this.out.insertBefore(el, this.headEl);
      else this.out.appendChild(el);
      this.scroll();
      return el;
    }

    // riga istantanea (output dei comandi)
    line(content, cls) {
      const empty = content == null || content === '';
      return this.append(h('div', { class: 'tl' + (cls ? ' ' + cls : '') }, empty ? ' ' : content));
    }

    // riga decodificata: ritorna una promessa risolta a decodifica finita
    print(text, { ts = false, frames = 4, cls = '' } = {}) {
      const el = this.append(h('div', { class: 'tl' + (cls ? ' ' + cls : '') }));
      if (this.fast || BC.reduced) {
        el.textContent = (ts ? TS : '') + text;
        return Promise.resolve(el);
      }
      return new Promise((resolve) => {
        const d = new Decoder(el, text, { ts, frames });
        d.done = () => resolve(el);
        this.active.add(d);
        BC.SFX.tick();
        if (!this.timer) this.timer = setInterval(() => this.tick(), TICK);
      });
    }

    tick() {
      if (this.headEl) {
        const yb = this.headEl.firstChild;
        yb.style.left = `${(Math.random() * 18) | 0}ch`;
        yb.style.width = `${4 + ((Math.random() * 10) | 0)}ch`;
      }
      for (const d of this.active) {
        if (this.fast ? (d.finish(), true) : d.step()) {
          this.active.delete(d);
          d.done();
        }
      }
      if (!this.active.size && !this.headEl) {
        clearInterval(this.timer);
        this.timer = 0;
      }
      this.scroll();
    }

    async flush() {
      while (this.active.size) await BC.sleep(TICK);
    }

    headOn() {
      if (this.headEl || BC.reduced) return;
      this.headEl = h('div', { class: 'head', 'aria-hidden': 'true' }, h('span', { class: 'yb' }));
      this.out.appendChild(this.headEl);
      if (!this.timer) this.timer = setInterval(() => this.tick(), TICK);
    }

    headOff() {
      if (this.headEl) this.headEl.remove();
      this.headEl = null;
    }

    wait(ms) {
      return this.fast || BC.reduced ? Promise.resolve() : BC.sleep(ms);
    }

    clear() {
      this.out.textContent = '';
      this.headEl = null;
    }

    lock(on) {
      this.locked = on;
      this.input.disabled = on;
      this.form.classList.toggle('is-locked', on);
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
        this.line(`errore: ${err && err.message ? err.message : err}`, 'err');
      }
    }

    complete() {
      const parts = this.input.value.replace(/^\s+/, '').split(/\s+/);
      let pool, pre, head = '';
      if (parts.length <= 1) {
        pool = COMMANDS.filter((c) => !c.hidden).map((c) => c.name);
        pre = (parts[0] || '').toLowerCase();
      } else if (['vai', 'goto'].includes(parts[0].toLowerCase())) {
        pool = BC.sections.map((s) => s.id);
        pre = parts[1].toLowerCase();
        head = parts[0] + ' ';
      } else return;
      const hits = pool.filter((n) => n.startsWith(pre));
      if (hits.length === 1) this.input.value = head + hits[0] + (head ? '' : ' ');
      else if (hits.length > 1) this.line(hits.join('   '), 'dim');
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

    /* ---- sequenza di avvio del terminale di accesso ---- */
    async boot() {
      const P = C.processo;
      const nI = C.verbali.filter((v) => v.tipo === 'interno').length;
      const prio = C.priorita.map((p) => p.capitolato).join(' > ');
      const award = C.progetto.capitolatoAggiudicato;
      const LOG = [
        'Booting BC-NET on physical CPU 0x0',
        'Initializing cgroup subsys cpuset',
        'Initializing cgroup subsys cpuacct',
        'BC QTERM version 26.27 (unipd-sc1167) #1 SMP',
        'Initializing cpu override...',
        '...',
        '...',
        'External repo connect...',
        `CPU: Repo mirror ${BC.repoSlug} [READ-ONLY]`,
        `CPU: Branch ruleset ${C.repo.branch}: ${BC.ci.merge.split(' ')[0]}, checks + approval required`,
        `CPU: CI pipeline ci.yml armed (${BC.ci.lunghezzaMax ? `PR title max ${BC.ci.lunghezzaMax} char` : 'PR title, spr truncation aware'})`,
        'CPU: Cache cataloged, connections notified',
        'CPU: Sync prepped for full sys connect',
        `Gateway: ${GATEWAY} limited (open)`,
        `Gateway: ${GATEWAY} limited (connect)`,
        'Signal integrity check: Data cache stability (strong)',
        `Built 1 zonelist in Priority order, grouping on.  Total capitolati: ${C.capitolati.length}`,
        `Priority stack: ${prio}`,
        `Verbali entries: ${C.verbali.length} (interni: ${nI}, esterni: ${C.verbali.length - nI})`,
        `Team roster: ${C.team.length} operatori (ruoli a rotazione)`,
        `CODEOWNERS ACL: ${P.codeowners.length} rules loaded`,
        'Memory: ------K/------K available',
        'Transport kernel mem breakdown:',
        '      docs:  [synced]    (  xx zB)',
        '    assets:  [synced]    ( xxx zB)',
        '   scripts:  [synced]    (  xx zB)',
        '       src:  [NULL]      (   0 zB)',
        '      test:  [NULL]      (   0 zB)',
        `BC: Fase=${C.progetto.fase || '?'}, Capitolato=${award || '???'}, Sprint=?, RTB=?????`,
        'Presignal readthrough QTERM implementation.',
        'BC_ACCESS:---',
      ];
      const ff = () => { this.fast = true; };
      window.addEventListener('keydown', ff, { once: true });
      this.root.addEventListener('pointerdown', ff, { once: true });
      this.lock(true);

      await this.wait(500);
      this.headOn();
      await this.print('REMOTE CMD ON', { frames: 4 });
      const l2 = await this.print('RIAVVIO IN MODALITÀ SICURA...', { frames: 4 });
      this.headOff();
      const cur = h('span', { class: 'cur', 'aria-hidden': 'true' });
      l2.appendChild(cur);
      await this.wait(1100);
      cur.remove();
      const tail = h('span');
      l2.appendChild(tail);
      await new Promise((resolve) => {
        if (this.fast || BC.reduced) {
          tail.textContent = ' fatto. Avvio del kernel.';
          return resolve();
        }
        const d = new Decoder(tail, ' fatto. Avvio del kernel.', { frames: 5, base: Array.from(l2.textContent).length });
        d.done = resolve;
        this.active.add(d);
        if (!this.timer) this.timer = setInterval(() => this.tick(), TICK);
      });
      await this.wait(350);

      this.headOn();
      for (const text of LOG) {
        this.print(text, { ts: true, frames: 3 + ((Math.random() * 3) | 0), cls: 'log' });
        await this.wait(48 + Math.random() * 46);
      }
      await this.flush();
      this.headOff();
      window.removeEventListener('keydown', ff);
      this.fast = false;

      this.line('');
      await this.print(':attesa comando operatore', { frames: 4 });
      this.line(['digita ', kbd('accedi'), ' per entrare nel sistema, ', kbd('aiuto'), " per l'elenco dei comandi."], 'dim');
      this.lock(false);
      this.root.classList.add('is-ready');
      this.focus();
    }

    async access(section) {
      if (this.locked) return;
      this.lock(true);
      this.root.classList.remove('is-ready');
      this.fast = false;
      this.headOn();
      await this.print(':override manuale del gateway', { frames: 4 });
      await this.wait(120);
      await this.print(':limitatore di zona disattivato', { frames: 4 });
      await this.wait(120);
      await this.print(':AVVIO SEQUENZA DI ACCESSO', { frames: 4 });
      await this.wait(120);
      await this.print(':TRASFERIMENTO QUANDO PRONTO', { frames: 4 });
      const last = await this.print(':buon viaggio...', { frames: 7 });
      this.headOff();
      last.appendChild(h('span', { class: 'cur', 'aria-hidden': 'true' }));
      await this.wait(550);
      BC.SFX.granted();
      this.root.classList.add('is-granted');
      await BC.sleep(BC.reduced ? 700 : 2700);
      if (this.onEnter) this.onEnter(section);
    }
  }

  /* ---------- comandi ---------- */
  const COMMANDS = [
    {
      name: 'aiuto', alias: ['help', '?'], desc: 'mostra questo elenco',
      run(t) {
        t.line('COMANDI DISPONIBILI', 'hi');
        COMMANDS.filter((c) => !c.hidden).forEach((c) => {
          t.line([h('span', { class: 'tcmd' }, (c.usage || c.name).padEnd(19)), c.desc]);
        });
        t.line('Tab completa · ↑↓ cronologia · Ctrl+L pulisce', 'dim');
      },
    },
    {
      name: 'accedi', alias: ['enter', 'login', 'start', 'entra'], desc: 'entra nel sito',
      run(t) {
        if (t.mode !== 'gate') return t.line('sei già dentro. Usa «vai <sezione>» per spostarti.');
        return t.access();
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
        if (t.mode === 'gate') return t.access(sec.id);
        t.line(`» ${sec.label}`);
        if (t.onClose) t.onClose();
        BC.goto(sec.id);
      },
    },
    {
      name: 'ls', alias: ['dir'], usage: 'ls [percorso]', desc: 'elenca i file della repo (live)',
      async run(t, [arg]) {
        const path = t.resolve(arg);
        let data;
        try {
          data = await BC.GH.contents(path);
        } catch (e) {
          return t.line(`ls: ${BC.ghError(e)}`, 'err');
        }
        if (!Array.isArray(data)) return t.line(`${data.name}  ${size(data.size)}`);
        data.slice()
          .sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'dir' ? -1 : 1))
          .forEach((it) => t.line(it.type === 'dir'
            ? h('span', { class: 'tdir' }, it.name + '/')
            : [it.name, h('span', { class: 'tsz' }, '  ' + size(it.size))]));
      },
    },
    {
      name: 'cd', usage: 'cd <percorso>', desc: 'cambia cartella nella repo',
      async run(t, [arg]) {
        const path = t.resolve(arg || '~');
        if (path) {
          try {
            const d = await BC.GH.contents(path);
            if (!Array.isArray(d)) return t.line(`cd: non è una cartella: ${path}`, 'err');
          } catch (e) {
            return t.line(`cd: ${BC.ghError(e)}`, 'err');
          }
        }
        t.cwd = path;
        t.setPrompt();
      },
    },
    {
      name: 'cat', usage: 'cat <file>', desc: 'mostra un file di testo della repo',
      async run(t, [arg]) {
        if (!arg) return t.line('uso: cat <file>', 'dim');
        const path = t.resolve(arg);
        if (!/\.(md|ya?ml|sh|txt|tex|json|gitconfig)$|(^|\/)(LICENSE|Dockerfile|CODEOWNERS|NULL)$/i.test(path)) {
          return t.line(`cat: ${path}: non è un file di testo, prova «apri ${arg}»`, 'err');
        }
        let d;
        try {
          d = await BC.GH.contents(path);
        } catch (e) {
          return t.line(`cat: ${BC.ghError(e)}`, 'err');
        }
        if (Array.isArray(d)) return t.line(`cat: ${path}: è una cartella`, 'err');
        if (d.size > 40000) return t.line(`cat: file troppo grande (${size(d.size)}), usa «apri ${arg}»`, 'err');
        const text = decodeB64(d.content || '');
        if (!text) return t.line('(file vuoto)', 'dim');
        text.replace(/\n$/, '').split('\n').forEach((l) => t.line(l));
      },
    },
    {
      name: 'apri', alias: ['open'], usage: 'apri [percorso]', desc: 'apri un file o la repo su GitHub',
      run(t, [arg]) {
        const path = t.resolve(arg || '');
        const url = path ? BC.fileUrl(path) : BC.repoUrl;
        window.open(url, '_blank', 'noopener');
        t.line(['apertura ', h('a', { href: url, target: '_blank', rel: 'noopener' }, url)]);
      },
    },
    { name: 'pwd', desc: 'cartella corrente', run(t) { t.line(`~/${t.cwd}`); } },
    {
      name: 'squadra', alias: ['team'], desc: 'elenco degli operatori',
      run(t) {
        t.line(`OPERATORI // ${C.team.length}`, 'hi');
        C.team.forEach((m, i) => t.line(`OP-${BC.pad(i + 1)}  ${m.nome.padEnd(26)}${(m.matricola || '-------').padEnd(7)}  ${m.github ? '@' + m.github : '@-'}${m.ruolo ? `  [${m.ruolo}]` : ''}`));
        t.line('ruoli a rotazione · «vai squadra» per le schede', 'dim');
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
      name: 'verbali', desc: 'registro dei verbali',
      run(t) {
        const list = C.verbali.slice().sort((a, b) => String(b.data || '').localeCompare(String(a.data || '')));
        list.forEach((v) => t.line(`${v.id || '---'}  ${v.data ? BC.fmtDate(v.data) : '--.--.----'}  ${v.tipo.toUpperCase().padEnd(8)} ${v.titolo || 'titolo da definire'}`));
        const first = list.find((v) => v.file && !v.mancante);
        if (first) t.line(['per aprirne uno: ', kbd(`apri ${first.file}`)], 'dim');
      },
    },
    {
      name: 'stato', alias: ['status'], desc: 'telemetria live della repo',
      async run(t) {
        t.line('interrogazione api.github.com ...', 'dim');
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
      name: 'log', usage: 'log [n]', desc: 'ultimi commit su main',
      async run(t, [n]) {
        const k = Math.min(20, Math.max(1, parseInt(n, 10) || 8));
        let list;
        try {
          list = await BC.GH.commits(50);
        } catch (e) {
          return t.line(`log: ${BC.ghError(e)}`, 'err');
        }
        list.slice(0, k).forEach((c) => t.line([h('span', { class: 'tsha' }, c.sha.slice(0, 7)), ' ', c.commit.message.split('\n')[0]]));
      },
    },
    { name: 'whoami', desc: 'chi sei', run(t) { t.line('guest // clearance: sola lettura // nodo: ' + (location.host || 'locale')); } },
    { name: 'data', alias: ['date'], desc: 'data e ora di Padova', run(t) { t.line(BC.clock() + ' (Europe/Rome)'); } },
    { name: 'echo', usage: 'echo <testo>', desc: 'ripete il testo', run(t, args) { t.line(args.join(' ')); } },
    {
      name: 'storia', alias: ['history'], desc: 'comandi digitati',
      run(t) { t.history.forEach((c, i) => t.line(`${String(i + 1).padStart(4)}  ${c}`)); },
    },
    {
      name: 'suono', alias: ['sound'], usage: 'suono [on|off]', desc: 'effetti sonori',
      run(t, [v]) {
        const on = v === 'on' ? true : v === 'off' ? false : !BC.SFX.enabled;
        BC.SFX.set(on);
        t.line(`suono ${on ? 'attivo' : 'disattivato'}`);
      },
    },
    {
      name: 'sfera', alias: ['sphere'], usage: 'sfera [on|off]', desc: 'effetto sfera del sito',
      run(t, [v]) {
        if (!BC.Sphere) return t.line('sfera non disponibile', 'err');
        const on = v === 'on' ? true : v === 'off' ? false : !BC.Sphere.on;
        BC.Sphere.set(on);
        t.line(`sfera ${on ? 'attiva' : 'disattivata'}`);
      },
    },
    { name: 'pulisci', alias: ['clear', 'cls'], desc: 'pulisce lo schermo', run(t) { t.clear(); } },
    { name: 'riavvia', alias: ['reboot'], desc: 'riavvia la sequenza di apertura', run() { BC.reboot(); } },
    {
      name: 'esci', alias: ['exit', 'quit'], desc: 'chiude la console',
      run(t) {
        if (t.onClose) return t.onClose();
        t.line("non c'è via d'uscita. Solo «accedi».");
      },
    },
    {
      name: 'sudo', hidden: true,
      run(t) {
        BC.SFX.error();
        t.line('permesso negato: la repo è montata in sola lettura. Questo incidente verrà segnalato.', 'err');
      },
    },
    { name: 'rm', hidden: true, run(t) { t.line('rm: impossibile rimuovere: file system in sola lettura', 'err'); } },
    {
      name: 'schiaccia', alias: ['crush'], hidden: true,
      run(t) {
        BC.SKULL.rows.forEach((r) => t.line(r.replace(/S/g, '#').replace(/s/g, '+').replace(/\./g, ' '), 'skull'));
        BC.SFX.crunch();
      },
    },
  ];

  function find(name) {
    return COMMANDS.find((c) => c.name === name || (c.alias || []).includes(name));
  }

  /* ---------- colonna laterale: emblema a LED e liste micro ---------- */
  function drawEmblem(cv) {
    const ctx = cv.getContext('2d');
    const k = 7;
    BC.SKULL.rows.forEach((r, y) => {
      for (let x = 0; x < r.length; x++) {
        const c = r[x];
        ctx.beginPath();
        if (c === 'S') {
          ctx.fillStyle = '#4fd44f';
          ctx.arc(x * k + k / 2, y * k + k / 2, k * 0.42, 0, Math.PI * 2);
        } else {
          ctx.fillStyle = c === 's' ? '#2f8a2f' : 'rgba(79, 212, 79, .07)';
          ctx.arc(x * k + k / 2, y * k + k / 2, k * (c === 's' ? 0.32 : 0.22), 0, Math.PI * 2);
        }
        ctx.fill();
      }
    });
  }

  BC.renderTermSide = function (root) {
    const side = root.querySelector('[data-term-side]');
    if (!side || side.childElementCount) return;
    const cv = h('canvas', { class: 'term__emblem', width: BC.SKULL.w * 7, height: BC.SKULL.h * 7 });
    drawEmblem(cv);
    const P = C.processo;
    const row = (a, b = '') => `${a.padEnd(17)}${b}`;
    side.append(cv, h('div', { class: 'term__list' },
      h('p', null, 'REPO [SOLA LETTURA]'),
      h('p', null, 'SYS OVERRIDE'),
      h('p', null, '002627-SWE BC_LINK'),
      h('p', { class: 'gap' }, row('  DOCS', 'SINCRONIZZATO')),
      h('p', null, row('  ASSETS', 'SINCRONIZZATO')),
      h('p', null, row('  SCRIPTS', 'SINCRONIZZATO')),
      h('p', { class: 'gap' }, 'NO SRC'),
      h('p', null, row('  SRC', 'NULL')),
      h('p', null, row('  TEST', 'NULL')),
      h('p', { class: 'gap' }, 'ACL CODEOWNERS'),
      P.codeowners.map((o) => h('p', null, row(`  ${o.path.toUpperCase()}`, String(o.owners.length)))),
      h('p', { class: 'gap' }, 'SYS SYNC [OK]'),
      h('p', null, `CAPITOLATI ${C.capitolati.length} · P1 ${(C.priorita[0] || {}).capitolato || '-'}`),
      h('p', null, '[SÌ]'),
      h('p', null, 'RESULT PRNT')));
  };

  BC.Terminal = Terminal;
})();
