/* =====================================================================
   BIT CRUSHER // site.js
   Stadio 3: il sito. Ogni sezione è generata da BC.content: i dati di
   content.js aggiornati con quelli della repo (repo.js: README,
   milestone, configurazioni, albero dei file). La telemetria legge
   l'API pubblica di GitHub. Tutto in sola lettura.
   ===================================================================== */
(function () {
  'use strict';

  const BC = window.BC;
  const C = BC.content;
  const { h, s, tbd, val, pad } = BC;

  // colori dei grafici (palette validata per daltonismo, ordine fisso)
  const TYPE_ORDER = ['feat', 'docs', 'fix', 'chore', 'altro'];
  const TYPE_COLOR = { feat: 'var(--c-feat)', docs: 'var(--c-docs)', fix: 'var(--c-fix)', chore: 'var(--c-chore)', altro: 'var(--c-other)' };

  const ext = (href, ...kids) => h('a', { href, target: '_blank', rel: 'noopener' }, ...kids);
  const micro = (...kids) => h('p', { class: 'micro' }, ...kids);
  const docLink = (path, label) => (path
    ? h('a', { class: 'btn btn--sm', href: BC.fileUrl(path), target: '_blank', rel: 'noopener' }, label, h('span', { 'aria-hidden': 'true' }, ' »'))
    : null);
  const setText = (sel, txt) => BC.$$(sel).forEach((el) => { el.textContent = txt; });

  BC.feeds = [];

  /* ---------- struttura comune delle sezioni ---------- */
  // da dove arrivano i dati di ogni sezione (chiavi di BC.Repo.src)
  const SOURCES = {
    panoramica: ['panoramica', 'milestone'],
    capitolati: ['capitolati', 'priorita', 'albero'],
    documenti: ['verbali', 'documenti', 'albero', 'issueTemplate'],
    processo: ['ci', 'spr', 'codeowners', 'issueTemplate'],
    squadra: ['team'],
    setup: ['setup', 'riferimenti', 'albero'],
  };
  const sourceOf = (id) => (id === 'telemetria' ? 'API GitHub' : BC.Repo.label(...(SOURCES[id] || [])));

  function head(sec) {
    return h('header', { class: 'sec__head' },
      h('div', { class: 'sec__num', 'aria-hidden': 'true' }, sec.num),
      h('div', { class: 'sec__titles' },
        h('p', { class: 'micro sec__kicker' }, `SEC.${sec.num} // ${sec.en}`, h('span', { class: 'jp', lang: 'ja' }, sec.jp)),
        h('h2', { id: `h-${sec.id}`, class: 'sec__title', 'data-scramble': '' }, sec.label)),
      h('div', { class: 'sec__meta' },
        h('span', { 'aria-hidden': 'true' }, BC.glyphRow(7, BC.hash(sec.id))),
        h('span', { class: 'micro', 'aria-hidden': 'true' }, `BC-${sec.num}/27`),
        h('span', { class: 'micro sec__src', title: 'Da dove arrivano i dati di questa sezione' }, `DATI // ${sourceOf(sec.id)}`)));
  }

  function section(sec, ...body) {
    return h('section', { id: sec.id, class: `sec sec--${sec.id}`, 'aria-labelledby': `h-${sec.id}` },
      h('div', { class: 'wrap' }, head(sec), h('div', { class: 'ruler', 'aria-hidden': 'true' }), ...body));
  }

  function msProgress(m) {
    if (m.stato === 'completata') return 1;
    if (m.stato === 'in-corso') return m.avanzamento == null ? null : Math.max(0, Math.min(100, m.avanzamento)) / 100;
    return 0;
  }

  /* ---------- 00 // home ---------- */
  function renderHome() {
    const P = C.progetto;
    const canvas = h('canvas', { class: 'feed__canvas', 'aria-hidden': 'true' });
    const segs = C.milestone.map((m) => h('span', { class: `seg is-${m.stato}`, title: `${m.sigla}: ${m.stato}` }));
    const done = C.milestone.filter((m) => m.stato === 'completata').length;
    const cur = C.milestone.find((m) => m.stato === 'in-corso');
    const meta = (label, value) => h('div', null, h('dt', { class: 'micro' }, label), h('dd', null, value));

    const el = h('section', { id: 'home', class: 'hero', 'aria-labelledby': 'h-home' },
      h('div', { class: 'wrap hero__wrap' },
        h('div', { class: 'hero__grid' },
          h('div', { class: 'hero__id' },
            h('p', { class: 'micro hero__kicker' }, `${P.titolo} // UNIPD // A.A. ${P.annoAccademico}`),
            h('h1', { id: 'h-home', class: 'hero__title' },
              h('span', { class: 'hero__t1' }, 'Bit'),
              h('span', { class: 'hero__t2' }, 'Crusher')),
            h('div', { class: 'hero__sub' },
              h('p', { class: 'hero__serif' }, 'Progetto di ', h('em', null, 'Ingegneria del Software')),
              h('p', { class: 'hero__jp jp', lang: 'ja' }, 'ビット・クラッシャー')),
            h('p', { class: 'hero__tag', 'aria-hidden': 'true' },
              h('span', null, 'SCHIACCIA ++'), h('span', null, 'OGNI'), h('span', null, 'BIT'))),
          h('figure', { class: 'feed' },
            h('div', { class: 'feed__hud feed__hud--top' },
              h('span', { class: 'micro rec' }, 'REC'),
              h('span', { class: 'micro' }, 'CAM-01 // BC-SKULL.SYS'),
              h('span', { class: 'micro', 'data-clock-time': '' }, '--:--:--')),
            canvas,
            h('div', { class: 'feed__hud feed__hud--bottom' },
              h('div', { class: 'feed__phase' }, h('span', { class: 'micro' }, 'FASE ATTUALE'), h('strong', null, val(P.fase))),
              h('div', { class: 'feed__prog' },
                h('div', { class: 'segbar', role: 'img', 'aria-label': `Milestone completate: ${done} su ${C.milestone.length}` }, segs),
                h('span', { class: 'micro' }, `MILESTONE ${done}/${C.milestone.length}${cur ? ` · ${cur.sigla} IN CORSO` : ''}`))),
            h('figcaption', { class: 'sr-only' }, 'Il teschio del logo Bit Crusher reso in caratteri ASCII, come un feed video disturbato.'))),
        h('dl', { class: 'hero__meta' },
          meta('Gruppo', P.gruppo),
          meta('Relatore', val(P.relatore)),
          meta('Corso', P.corso),
          meta('Anno accademico', P.annoAccademico),
          meta('Capitolato', P.capitolatoAggiudicato
            ? `${P.capitolatoAggiudicato}${(C.capitolati.find((c) => c.id === P.capitolatoAggiudicato) || {}).nome ? ` // ${C.capitolati.find((c) => c.id === P.capitolatoAggiudicato).nome}` : ''}`
            : tbd('In aggiudicazione')),
          meta('Ultimo push', h('span', { 'data-live': 'push' }, '—'))),
        h('div', { class: 'hero__spread', 'aria-hidden': 'true' },
          ['Analizza', 'Progetta', 'Codifica', 'Verifica', 'Rilascia'].map((w) => h('span', null, w)),
          h('span', { class: 'hero__coord' }, 'N 45°24\'27"  E 11°52\'38"'))));
    BC.feeds.push(new AsciiFeed(canvas));
    return el;
  }

  /* Feed ASCII: il teschio del logo come segnale video disturbato */
  class AsciiFeed {
    constructor(canvas) {
      this.cv = canvas;
      this.ctx = canvas.getContext('2d');
      this.bits = BC.SKULL.burst(77, 110);
      this.tick = 0;
      this.last = 0;
      this.raf = 0;
      this.cols = 0;
      this.loop = this.loop.bind(this);
      new ResizeObserver(() => this.layout()).observe(canvas);
      new IntersectionObserver(([e]) => (e.isIntersecting ? this.start() : this.stop())).observe(canvas);
    }
    layout() {
      const r = this.cv.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.W = r.width;
      this.H = r.height;
      this.cv.width = Math.round(r.width * dpr);
      this.cv.height = Math.round(r.height * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // celle quadrate: 2 caratteri per cella, interlinea = 2 larghezze carattere
      const cw = Math.min(r.width / (56 * 2), r.height / 46 / 2);
      this.cw = cw;
      this.lh = cw * 2;
      this.fs = cw / 0.6;
      this.cols = Math.floor(r.width / cw);
      this.rows = Math.floor(r.height / this.lh);
      this.ox = Math.floor((this.cols - BC.SKULL.w * 2) / 2);
      this.oy = Math.floor((this.rows - BC.SKULL.h) / 2) + 1;
      const rnd = BC.rng(5);
      this.noise = new Float32Array(this.cols * this.rows).map(() => rnd());
      this.bitAt = new Map();
      for (const b of this.bits) for (let i = 0; i < b.w; i++) this.bitAt.set(`${b.x + i},${b.y}`, b.k);
      this.draw();
    }
    start() {
      if (BC.reduced || this.raf) return;
      this.raf = requestAnimationFrame(this.loop);
    }
    stop() {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
    }
    loop(now) {
      this.raf = requestAnimationFrame(this.loop);
      if (now - this.last < 90) return;
      this.last = now;
      this.tick++;
      for (let i = 0; i < this.noise.length * 0.04; i++) this.noise[(Math.random() * this.noise.length) | 0] = Math.random();
      this.draw();
    }
    draw() {
      const { ctx, cols, rows, cw, lh } = this;
      if (!cols) return;
      const SET = {
        bone: '#%@&8$WM#%', shade: ':+=*~:+=', acid: '=#*=', green: '+=+*', cyan: '-~=-', dust: '..:.',
      };
      const COLR = { bone: '#ECECE4', shade: '#7D827A', acid: '#D4FF1E', green: '#3BD16F', cyan: '#19C6FF', dust: '#343934' };
      ctx.clearRect(0, 0, this.W, this.H);
      ctx.font = `600 ${this.fs.toFixed(2)}px "JetBrains Mono", monospace`;
      ctx.textBaseline = 'top';
      const band = (this.tick * 0.7) % (rows + 24) - 12;
      const tear = Math.random() < 0.22 ? (Math.random() * rows) | 0 : -1;
      const tearOff = ((Math.random() * 8) | 0) - 4;
      for (let r = 0; r < rows; r++) {
        const y = r - this.oy;
        const skRow = BC.SKULL.rows[y];
        const inBand = Math.abs(r - band) < 2;
        const off = r === tear ? tearOff : inBand ? 1 : 0;
        const lines = {};
        for (const k in SET) lines[k] = new Array(cols).fill(' ');
        for (let c = 0; c < cols; c++) {
          const sc = c - off;
          const x = Math.floor((sc - this.ox) / 2);
          const n = this.noise[r * cols + c];
          let k = null;
          const cell = skRow && sc >= this.ox && x >= 0 && x < BC.SKULL.w ? skRow[x] : '.';
          if (cell === 'S') k = 'bone';
          else if (cell === 's') k = 'shade';
          else {
            const b = this.bitAt.get(`${x},${y}`);
            if (b && sc >= this.ox) k = b;
            else if (n > 0.965) k = 'dust';
          }
          if (!k) continue;
          const set = SET[k];
          lines[k][c] = set[(n * set.length) | 0];
        }
        for (const k in lines) {
          const str = lines[k].join('');
          if (!str.trim()) continue;
          ctx.fillStyle = r === tear && k !== 'dust' ? '#FF2E63' : COLR[k];
          ctx.globalAlpha = inBand ? 1 : k === 'bone' ? 0.92 : 1;
          ctx.fillText(str, 0, r * lh);
        }
      }
      ctx.globalAlpha = 1;
      // striscia rossa luminosa
      if (this.tick % 40 < 6) {
        const y = ((this.tick * 37) % rows) * lh + lh / 2;
        ctx.fillStyle = '#FF2E63';
        ctx.shadowColor = '#FF2E63';
        ctx.shadowBlur = 12;
        ctx.fillRect(this.W * 0.35, y, this.W * 0.5, 1.5);
        ctx.shadowBlur = 0;
      }
      void cw;
    }
  }

  /* Feed statico: rumore che si stabilizza con l'avanzamento */
  class StaticFeed {
    constructor(canvas, text, p, tint) {
      this.cv = canvas;
      this.ctx = canvas.getContext('2d');
      this.text = text;
      this.p = p;
      this.tint = tint;
      this.w = canvas.width;
      this.h = canvas.height;
      this.img = this.ctx.createImageData(this.w, this.h);
      this.t = 0;
      this.last = 0;
      this.raf = 0;
      this.base = null;
      this.loop = this.loop.bind(this);
      const ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
      ready.then(() => {
        this.makeBase();
        this.frame();
      });
      new IntersectionObserver(([e]) => (e.isIntersecting ? this.start() : this.stop())).observe(canvas);
    }
    makeBase() {
      const off = document.createElement('canvas');
      off.width = this.w;
      off.height = this.h;
      const o = off.getContext('2d');
      o.fillStyle = '#000';
      o.fillRect(0, 0, this.w, this.h);
      o.fillStyle = '#fff';
      o.textAlign = 'center';
      o.textBaseline = 'middle';
      o.font = `800 ${this.text.length > 2 ? 50 : 62}px Saira, sans-serif`;
      o.fillText(this.text, this.w / 2, this.h / 2 + 3);
      o.fillRect(8, 8, 10, 1);
      o.fillRect(8, 8, 1, 10);
      o.fillRect(this.w - 18, this.h - 9, 10, 1);
      o.fillRect(this.w - 9, this.h - 18, 1, 10);
      const d = o.getImageData(0, 0, this.w, this.h).data;
      this.base = new Uint8Array(this.w * this.h);
      for (let i = 0; i < this.base.length; i++) this.base[i] = d[i * 4];
    }
    start() {
      if (BC.reduced || this.raf) return;
      this.raf = requestAnimationFrame(this.loop);
    }
    stop() {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
    }
    loop(now) {
      this.raf = requestAnimationFrame(this.loop);
      if (now - this.last < 110) return;
      this.last = now;
      this.t++;
      this.frame();
    }
    frame() {
      if (!this.base) return;
      const { w, h, base } = this;
      const data = this.img.data;
      const noise = 0.92 - this.p * 0.8;
      const band = (this.t * 4) % (h + 40) - 20;
      const tear = Math.random() < 0.3 ? (Math.random() * h) | 0 : -1;
      const tearOff = ((Math.random() * 18) | 0) - 9;
      const [r0, g0, b0] = this.tint;
      for (let y = 0; y < h; y++) {
        const inBand = Math.abs(y - band) < 7;
        const off = y === tear || y === tear + 1 ? tearOff : inBand ? 2 : 0;
        const scan = y & 1 ? 0.72 : 1;
        for (let x = 0; x < w; x++) {
          const sx = Math.min(w - 1, Math.max(0, x + off));
          const n = Math.random();
          let v = (base[y * w + sx] / 255) * (1 - noise) + n * noise * 0.85;
          if (n > 0.986) v = 1;
          if (inBand) v = Math.min(1, v + 0.16);
          const i = (y * w + x) * 4;
          data[i] = r0 * v * scan;
          data[i + 1] = g0 * v * scan;
          data[i + 2] = b0 * v * scan;
          data[i + 3] = 255;
        }
      }
      this.ctx.putImageData(this.img, 0, 0);
    }
  }

  /* ---------- 01 // panoramica ---------- */
  function renderPanoramica(sec) {
    const P = C.progetto;
    const PA = C.panoramica;
    const weeks = PA.durataSprintSettimane;
    const done = C.milestone.filter((m) => m.stato === 'completata').length;
    const published = C.documenti.filter((d) => d.stato === 'approvato' || d.stato === 'pubblicato').length;
    const fromGitHub = BC.Repo.src.milestone;
    const stat = (v, label) => h('div', { class: 'stat' },
      h('span', { class: 'stat__v' }, typeof v === 'number' ? pad(v) : v),
      h('span', { class: 'micro stat__l' }, label));

    return section(sec,
      h('div', { class: 'pano' },
        h('div', { class: 'pano__main' },
          h('div', { class: 'note' },
            h('p', { class: 'micro note__label' }, 'NOTA // STATO DELLA REPO'),
            h('p', null, BC.rich(P.nota))),
          h('div', { class: 'pano__desc' },
            micro('PANORAMICA AD ALTO LIVELLO'),
            // dal README il paragrafo arriva intero, con i suoi segnaposto
            PA.testo
              ? h('p', { class: 'lead' }, BC.rich(PA.testo))
              : [
                h('p', { class: 'lead' }, val(PA.descrizione, 'Descrizione del prodotto da definire')),
                h('p', { class: 'pano__agile' }, 'Il progetto segue un processo di sviluppo agile con cicli di ',
                  weeks ? h('strong', null, `${weeks} settimane`) : tbd('N settimane'), '.'),
              ])),
        h('div', { class: 'stats' },
          stat(C.capitolati.length, 'Capitolati analizzati'),
          stat(C.priorita.length, 'Priorità espresse'),
          stat(C.verbali.length, 'Verbali redatti'),
          stat(C.team.length, 'Operatori'),
          stat(h('span', { 'data-live': 'commits' }, '—'), 'Commit su main · live'),
          stat(`${published}/${C.documenti.length}`, 'Documenti pubblicati'))),
      h('div', { class: 'feeds' },
        h('div', { class: 'feeds__bar' },
          micro(`REVISIONI DI AVANZAMENTO // ${fromGitHub ? 'MILESTONE DELLA REPO' : 'FEED DI STABILIZZAZIONE'}`),
          micro(`${done}/${C.milestone.length} SEGNALI STABILI`)),
        h('ol', { class: 'feeds__grid' }, C.milestone.map(milestoneFeed))));
  }

  function milestoneFeed(m, i) {
    const p = msProgress(m);
    const cv = h('canvas', { class: 'mfeed__cv', width: 168, height: 104, 'aria-hidden': 'true' });
    const state = { completata: 'SEGNALE STABILE', 'in-corso': 'STABILIZZAZIONE', attesa: 'SEGNALE ASSENTE' }[m.stato] || m.stato;
    const tint = m.stato === 'completata' ? [212, 255, 30] : m.stato === 'in-corso' ? [44, 245, 180] : [190, 192, 186];
    BC.feeds.push(new StaticFeed(cv, m.sigla, p == null ? 0.45 : p, tint));
    return h('li', { class: `mfeed is-${m.stato}` },
      h('div', { class: 'mfeed__screen' }, cv,
        h('span', { class: 'micro mfeed__cam' }, `CAM-0${i + 1} // ${m.sigla}`),
        h('span', { class: 'micro mfeed__state' }, state)),
      h('div', { class: 'mfeed__info' },
        h('strong', { class: 'mfeed__sigla' }, m.sigla),
        h('span', { class: 'mfeed__nome' }, m.nome),
        m.descrizione ? h('span', { class: 'mfeed__desc' }, m.descrizione) : null,
        h('span', { class: 'mfeed__data' },
          m.stato === 'completata' && m.chiusa ? `Chiusa il ${BC.fmtDate(m.chiusa)}`
            : m.data ? `Scadenza ${BC.fmtDate(m.data)}` : tbd('Data da definire'))),
      h('div', { class: `meter${p == null ? ' meter--indet' : ''}`, style: { '--p': p == null ? 0.5 : p } }, h('span')),
      h('span', { class: 'micro mfeed__pct' },
        p == null ? 'IN CORSO · NON QUANTIFICATO' : `${pad(Math.round(p * 100), 3)}%`,
        m.issue ? ` · ISSUE ${m.issue.chiuse}/${m.issue.chiuse + m.issue.aperte}` : ''),
      m.url ? ext(m.url, h('span', { class: 'micro mfeed__link' }, 'MILESTONE', h('span', { 'aria-hidden': 'true' }, ' »'))) : null);
  }

  /* ---------- 02 // capitolati ---------- */
  function renderCapitolati(sec) {
    const byId = Object.fromEntries(C.capitolati.map((c) => [c.id, c]));
    const prio = C.priorita.map((p, i) => ({ ...byId[p.capitolato], rank: i + 1, why: p.motivazione, whyFile: p.file })).filter((p) => p.id);
    const rankOf = Object.fromEntries(prio.map((p) => [p.id, p.rank]));
    const award = C.progetto.capitolatoAggiudicato;

    const list = h('ul', { class: 'caplist__rows' }, C.capitolati.map((c) => capRow(c, rankOf[c.id])));
    const chips = h('div', { class: 'tabs', role: 'group', 'aria-label': 'Filtra i capitolati' },
      h('button', { type: 'button', 'aria-pressed': 'true', 'data-f': 'all' }, `Tutti ${pad(C.capitolati.length)}`),
      h('button', { type: 'button', 'aria-pressed': 'false', 'data-f': 'prio' }, `Prioritari ${pad(prio.length)}`));
    chips.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      BC.$$('button', chips).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      list.dataset.filter = b.dataset.f;
    });

    return section(sec,
      h('div', { class: 'award' },
        h('span', { class: 'micro' }, 'CAPITOLATO AGGIUDICATO'),
        award && byId[award] ? h('strong', null, `${award} // ${byId[award].nome}`) : tbd('In attesa di aggiudicazione')),
      h('div', { class: 'prio' },
        h('div', { class: 'prio__cards' }, prio.map(prioCard)),
        h('figure', { class: 'orbit' },
          orbit(prio),
          h('figcaption', { class: 'micro' }, 'ORBITA DI PRIORITÀ // PIÙ VICINO = PIÙ DESIDERATO'))),
      h('div', { class: 'caplist' },
        h('div', { class: 'caplist__bar' }, micro(`ARCHIVIO CAPITOLATI // C0-C${C.capitolati.length - 1}`), chips),
        list));
  }

  function prioCard(c) {
    return h('article', { class: `pcard pcard--${c.rank}` },
      h('div', { class: 'pcard__top' },
        h('span', { class: 'micro' }, `PRIORITÀ ${pad(c.rank)}`),
        h('span', { class: 'micro jp', lang: 'ja' }, '優先'),
        BC.barcode(c.id + c.rank, 72, 14)),
      h('div', { class: 'pcard__body' },
        h('span', { class: 'pcard__code', 'aria-hidden': 'true' }, c.id),
        h('div', { class: 'pcard__txt' },
          h('h3', { class: 'pcard__name' }, h('span', { class: 'sr-only' }, `${c.id}: `), c.nome),
          h('p', { class: 'pcard__desc' }, c.descrizione),
          h('p', { class: 'micro pcard__prop' }, 'PROPONENTE // ', val(c.proponente)))),
      h('div', { class: 'pcard__why' }, h('span', { class: 'micro' }, 'MOTIVAZIONE'), h('span', null, c.why ? BC.rich(c.why) : tbd('Espansione in corso'))),
      h('div', { class: 'pcard__links' }, docLink(c.capitolato, 'Capitolato'), docLink(c.presentazione, 'Presentazione'), docLink(c.whyFile, 'Motivazione')));
  }

  function capRow(c, rank) {
    return h('li', { class: 'caprow' + (rank ? ' is-prio' : '') },
      h('span', { class: 'caprow__id' }, c.id),
      h('div', { class: 'caprow__main' }, h('strong', null, c.nome), h('span', null, c.descrizione)),
      h('span', { class: 'caprow__prop' }, val(c.proponente)),
      h('span', { class: 'caprow__tag' }, rank ? h('span', { class: `chip chip--p${rank}` }, `P${rank}`) : null),
      h('span', { class: 'caprow__links' },
        c.capitolato ? ext(BC.fileUrl(c.capitolato), 'PDF') : null,
        c.presentazione ? ext(BC.fileUrl(c.presentazione), 'SLIDE') : null));
  }

  function orbit(prio) {
    const W = 420, H = 300, cx = 210, cy = 120, deg = -14;
    const rad = (deg * Math.PI) / 180;
    const rx = [60, 108, 156, 196];
    const ry = (r) => r * 0.36;
    const rot = (x, y) => [
      cx + (x - cx) * Math.cos(rad) - (y - cy) * Math.sin(rad),
      cy + (x - cx) * Math.sin(rad) + (y - cy) * Math.cos(rad),
    ];
    const at = (r, a) => rot(cx + r * Math.cos(a), cy + ry(r) * Math.sin(a));
    const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'orbit__svg', role: 'img',
      'aria-label': `Orbita delle priorità: ${prio.map((p) => `${p.id} priorità ${p.rank}`).join(', ')}` });
    rx.forEach((r, i) => svg.appendChild(s('ellipse', {
      cx, cy, rx: r, ry: ry(r), transform: `rotate(${deg} ${cx} ${cy})`, class: i === rx.length - 1 ? 'orb orb--dash' : 'orb',
    })));
    svg.append(
      s('line', { x1: cx - 14, y1: cy, x2: cx + 14, y2: cy, class: 'orb-x' }),
      s('line', { x1: cx, y1: cy - 14, x2: cx, y2: cy + 14, class: 'orb-x' }),
      s('rect', { x: cx - 4, y: cy - 4, width: 8, height: 8, class: 'orb-core' }),
      s('text', { x: cx + 9, y: cy - 8, class: 'orb-t' }, 'BIT CRUSHER'));
    const others = C.capitolati.filter((c) => !prio.some((p) => p.id === c.id));
    others.forEach((c, i) => {
      const [x, y] = at(rx[3], -0.3 - (i / Math.max(1, others.length - 1)) * 2.6);
      svg.append(s('circle', { cx: x, cy: y, r: 2.5, class: 'orb-o' }), s('text', { x: x + 5, y: y - 5, class: 'orb-t orb-t--dim' }, c.id));
    });
    const ang = [2.0, 0.75, 2.75];
    prio.forEach((p, i) => {
      if (i > 2) return;
      const [x, y] = at(rx[i], ang[i]);
      svg.append(
        s('line', { x1: x, y1: y + 7, x2: x, y2: 254, class: 'orb-lead' }),
        s('circle', { cx: x, cy: y, r: 6, class: `orb-p orb-p--${p.rank}` }),
        s('text', { x, y: 272, 'text-anchor': 'middle', class: 'orb-t orb-t--hi' }, `P${p.rank} // ${p.id}`),
        s('text', { x, y: 286, 'text-anchor': 'middle', class: 'orb-t orb-t--dim' }, p.nome.toUpperCase().slice(0, 18)));
    });
    return svg;
  }

  /* ---------- 03 // documenti ---------- */
  function renderDocumenti(sec) {
    const vs = C.verbali.slice().sort((a, b) => String(b.data || '').localeCompare(String(a.data || '')));
    const nI = vs.filter((v) => v.tipo === 'interno').length;
    const log = h('ol', { class: 'vlog' }, vs.map(vRow));
    const tabs = h('div', { class: 'tabs', role: 'group', 'aria-label': 'Filtra i verbali' },
      h('button', { type: 'button', 'aria-pressed': 'true', 'data-f': 'all' }, `Tutti ${pad(vs.length)}`),
      h('button', { type: 'button', 'aria-pressed': 'false', 'data-f': 'interno' }, `Interni ${pad(nI)}`),
      h('button', { type: 'button', 'aria-pressed': 'false', 'data-f': 'esterno' }, `Esterni ${pad(vs.length - nI)}`));
    tabs.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      BC.$$('button', tabs).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      log.dataset.filter = b.dataset.f;
    });
    const D = C.diario;

    return section(sec,
      h('div', { class: 'docs' },
        h('div', { class: 'docs__log' },
          h('div', { class: 'docs__bar' }, h('h3', { class: 'h3' }, 'Verbali delle riunioni'), tabs),
          log),
        h('aside', { class: 'docs__side' },
          h('div', { class: 'card corners' },
            micro('DIARIO DI BORDO'),
            h('p', { class: 'card__txt' }, "Andamento del progetto settimana per settimana: attività, ostacoli, decisioni e obiettivi del ciclo successivo."),
            h('dl', { class: 'kv' },
              h('div', null, h('dt', null, 'Stato'), h('dd', null, val(D.stato))),
              h('div', null, h('dt', null, 'Ultimo intervento'), h('dd', null, D.aggiornato ? BC.fmtDate(D.aggiornato) : tbd()))),
            D.atteso && !D.file ? h('p', { class: 'micro' }, `FILE ATTESO // ${D.atteso}`) : null,
            D.mancante ? h('span', { class: 'chip chip--warn' }, 'File non trovato nella repo') : docLink(D.file, 'Apri il diario'),
            D.sorgente && !D.sorgenteMancante ? docLink(D.sorgente, 'Sorgente LaTeX') : null),
          h('div', { class: 'card' },
            micro('DOCUMENTI DI PROGETTO'),
            h('ul', { class: 'deliv' }, C.documenti.map((d) => h('li', { class: d.stato ? `is-${d.stato.replace(/\s+/g, '-')}` : '' },
              h('span', { class: 'deliv__box', 'aria-hidden': 'true' }),
              d.file ? ext(BC.fileUrl(d.file), d.nome) : h('span', { class: 'deliv__name' }, d.nome),
              h('span', { class: 'deliv__ver micro' }, d.versione ? `v${d.versione}` : 'v —'),
              d.stato ? h('span', { class: 'chip' }, d.stato) : tbd())))),
          h('div', { class: 'card' },
            micro('APRI UNA ISSUE DAI TEMPLATE'),
            h('div', { class: 'issue-grid' }, C.issueTemplate.map((t) => h('a', { href: BC.issueUrl(t.file), target: '_blank', rel: 'noopener', title: t.desc || null },
              h('span', null, t.nome), h('span', { 'aria-hidden': 'true' }, '+')))),
            micro('TEMPLATE LATEX'),
            h('ul', { class: 'plain' }, C.template.map((t) => h('li', null, ext(BC.fileUrl(t.file), t.nome, ' »'))))))));
  }

  function vRow(v) {
    const meta = [v.redattore && `RED. ${v.redattore}`, v.verificatore && `VER. ${v.verificatore}`, v.versione && `v${v.versione}`].filter(Boolean);
    return h('li', { class: 'vrow', 'data-tipo': v.tipo },
      h('span', { class: 'vrow__id' }, v.id || '—'),
      v.data ? h('time', { class: 'vrow__date', datetime: v.data }, BC.fmtDate(v.data)) : h('span', { class: 'vrow__date' }, tbd('Data')),
      h('div', { class: 'vrow__main' },
        h('div', { class: 'vrow__tags' },
          h('span', { class: `chip${v.tipo === 'esterno' ? ' chip--mint' : ''}` }, v.tipo),
          v.con ? h('span', { class: 'chip' }, `con ${v.con}`) : null,
          v.firmato ? h('span', { class: 'chip chip--acid' }, 'firmato') : null,
          v.mancante ? h('span', { class: 'chip chip--warn' }, 'PDF non trovato') : null),
        h('p', { class: 'vrow__title' }, val(v.titolo)),
        meta.length ? h('p', { class: 'vrow__meta micro' }, meta.join(' · ')) : null),
      v.file && !v.mancante ? ext(BC.fileUrl(v.file), h('span', { class: 'vrow__open' }, 'PDF', h('span', { 'aria-hidden': 'true' }, ' »'))) : h('span'));
  }

  /* ---------- 04 // processo ---------- */
  function renderProcesso(sec) {
    const P = C.processo;
    const owners = (list) => list.map((u, i) => [i ? ' ' : '', ext(BC.userUrl(u), '@' + u)]);
    const rules = [{ chiave: 'Merge', valore: BC.ci.merge }, ...P.spr];
    return section(sec,
      ciBar(),
      validator(),
      h('div', { class: 'proc' },
        h('div', { class: 'card proc__types' },
          micro('TIPI DI COMMIT AMMESSI'),
          h('ul', { class: 'types' }, P.tipiCommit.map((t) => h('li', null,
            h('span', { class: 'tchip', style: { '--sw': TYPE_COLOR[t.tipo] || 'var(--line-2)' } }, t.tipo),
            h('span', null, t.desc))))),
        h('div', { class: 'card proc__flow' },
          micro('FLUSSO A STACK // SPR'),
          h('ol', { class: 'flow' }, P.flusso.map((f, i) => h('li', null,
            h('span', { class: 'flow__n' }, pad(i + 1)),
            h('div', null, codeBlock(f.cmd), h('p', null, f.desc.replace('{merge}', BC.ci.merge))))))),
        h('div', { class: 'card proc__rules' },
          micro('REGOLE DEL BRANCH MAIN // .spr.yml'),
          h('dl', { class: 'kv' }, rules.map((r) => h('div', null, h('dt', null, r.chiave), h('dd', null, r.valore))))),
        h('div', { class: 'card proc__owners' },
          micro('CODEOWNERS'),
          h('ul', { class: 'owners' }, P.codeowners.map((o) => h('li', null,
            h('code', null, o.path), h('span', { class: 'owners__who' }, owners(o.owners)), o.nota ? h('span', { class: 'owners__note' }, o.nota) : null)))),
        h('div', { class: 'card proc__roles' },
          micro('RUOLI A ROTAZIONE'),
          h('ul', { class: 'roles' }, C.ruoli.map((r, i) => h('li', null, h('span', { class: 'micro' }, `R.${pad(i + 1)}`), r))),
          h('p', { class: 'dim' }, 'Ogni membro può assumere responsabilità diverse nei vari cicli di sviluppo.')),
        h('div', { class: 'card proc__dod' },
          micro('DEFINITION OF DONE'),
          h('ul', { class: 'dod' }, P.definitionOfDone.map((d) => h('li', null, h('span', { class: 'deliv__box', 'aria-hidden': 'true' }), h('span', null, BC.rich(d))))))));
  }

  function codeBlock(cmd) {
    return h('div', { class: 'code' },
      h('span', { class: 'code__prompt', 'aria-hidden': 'true' }, '$'),
      h('code', null, cmd),
      h('button', { type: 'button', class: 'code__copy', 'data-copy': cmd, 'aria-label': `Copia il comando ${cmd}` }, 'Copia'));
  }

  // regole della CI usate dal validatore, e da dove arrivano
  function ciBar() {
    const max = BC.ci.lunghezzaMax;
    const rules = [
      max ? `massimo ${max} caratteri` : 'nessun limite di lunghezza',
      BC.ci.troncamentoSpr ? 'troncamento di GitHub riconosciuto' : null,
      `merge ${BC.ci.merge}`,
    ].filter(Boolean).join(' // ');
    return h('div', { class: 'cibar' },
      h('span', { class: 'micro' }, `REGOLE CI // ${BC.Repo.ciRepo ? 'lette da ci.yml della repo' : 'da content.js'}`),
      h('strong', null, rules));
  }

  function validator() {
    const max = BC.ci.lunghezzaMax; // null nella variante spr: nessun limite
    const ref = max || BC.GH_HEADLINE;
    const countText = (len) => {
      if (max) return `${len}/${max}`;
      return len > BC.GH_HEADLINE ? `${len} CARATTERI · OLTRE ${BC.GH_HEADLINE}: GITHUB LO TRONCA` : `${len} CARATTERI · NESSUN LIMITE`;
    };
    const input = h('input', { id: 'pr-title', class: 'val__input', type: 'text', placeholder: 'feat(scope): descrizione.', spellcheck: 'false', autocomplete: 'off', autocapitalize: 'off' });
    const count = h('span', { class: 'micro val__count' }, countText(0));
    const meter = h('div', { class: 'meter val__meter' }, h('span'));
    const verdict = h('div', { class: 'val__verdict', 'aria-live': 'polite' });
    const checks = h('ul', { class: 'val__checks' });
    const segs = h('ol', { class: 'val__segs' });
    const note = h('div', { class: 'val__note', hidden: true });
    const check = (ok, label) => h('li', { class: ok ? 'is-ok' : 'is-ko' },
      h('span', { class: 'val__mark', 'aria-hidden': 'true' }, ok ? 'OK' : 'KO'),
      h('span', null, label, h('span', { class: 'sr-only' }, ok ? ' (superato)' : ' (non superato)')));

    function update() {
      const v = input.value;
      if (!v) {
        count.textContent = countText(0);
        meter.style.setProperty('--p', 0);
        meter.classList.remove('is-over', 'is-trunc');
        verdict.className = 'val__verdict';
        verdict.replaceChildren(h('span', { class: 'micro' }, 'IN ATTESA DI INPUT // SCRIVI O SCEGLI UN ESEMPIO'));
        checks.replaceChildren();
        segs.replaceChildren();
        note.hidden = true;
        return;
      }
      const r = BC.validateTitle(v);
      count.textContent = countText(r.len);
      meter.style.setProperty('--p', Math.min(1, r.len / ref));
      meter.classList.toggle('is-over', !!max && r.len > max);
      meter.classList.toggle('is-trunc', !max && r.len > BC.GH_HEADLINE);
      verdict.className = 'val__verdict ' + (r.ok ? 'is-ok' : 'is-ko');
      verdict.replaceChildren(
        h('strong', null, r.ok ? 'VALIDO' : 'NON VALIDO'),
        h('span', null, r.ok ? `Titolo valido (${r.segments.length} ${r.segments.length === 1 ? 'segmento' : 'segmenti'}).` : r.error));
      checks.replaceChildren(...[
        max ? check(r.len <= max, `Lunghezza ${r.len} su max ${max} caratteri`) : null,
        check(r.endsDot, 'Termina con il punto'),
        check(r.segments.every((x) => x.ok), `Segmenti validi ${r.segments.filter((x) => x.ok).length}/${r.segments.length}`),
      ].filter(Boolean));
      note.hidden = !r.truncated;
      if (r.truncated) {
        note.replaceChildren(
          h('span', { class: 'micro' }, 'DOPO GIT SPR MERGE // ANTEPRIMA INDICATIVA'),
          h('code', null, r.truncated),
          h('span', null, `GitHub accorcia il titolo oltre ${BC.GH_HEADLINE} caratteri e sposta il resto nel body: la CI riconosce il troncamento e valida il titolo completo.`));
      }
      segs.replaceChildren(...r.segments.map((sg, i) => h('li', { class: sg.ok ? 'is-ok' : 'is-ko' },
        h('span', { class: 'micro' }, `SEG.${pad(i + 1)}`),
        h('code', null, sg.text || '(vuoto)'),
        h('span', { class: 'micro val__parts' }, `tipo ${sg.type || '—'} · scope ${sg.scope || '—'}${sg.breaking ? ' · breaking' : ''}`))));
    }
    input.addEventListener('input', update);

    const examples = [
      'docs(verbale): aggiunto il verbale interno 04.',
      'feat(ci): validazione dei titoli; fix(readme): corretti i link.',
      'fix(ci)!: rimosso il controllo obsoleto.',
      'fix!(ci): rimosso il controllo obsoleto.',
      'docs(norme_di_progetto): aggiunta la sezione sulle convenzioni dei commit e sul flusso a stack.',
      'Docs: Aggiunto il verbale',
    ];
    const lenRule = max
      ? `max ${max} caratteri`
      : `nessun limite di lunghezza: oltre ${BC.GH_HEADLINE} caratteri GitHub tronca il titolo con «…», la CI valida quello completo`;
    update();
    return h('div', { class: 'val corners' },
      h('div', { class: 'val__head' },
        h('label', { class: 'micro', for: 'pr-title' }, 'VALIDATORE DEL TITOLO PR // STESSE REGOLE DI ci.yml'),
        count),
      input,
      meter,
      verdict,
      note,
      h('div', { class: 'val__grid' }, checks, segs),
      h('div', { class: 'val__ex' },
        h('span', { class: 'micro' }, 'ESEMPI'),
        examples.map((ex) => h('button', { type: 'button', class: 'exchip', onclick: () => { input.value = ex; update(); input.focus(); } }, ex))),
      h('p', { class: 'micro val__fmt' }, `FORMATO: tipo(scope)!: descrizione; tipo2: descrizione2. // scope e ! opzionali, ! dopo lo scope // la descrizione non inizia con maiuscola o spazio // niente «;» interni // ${lenRule}`));
  }

  /* ---------- 05 // squadra ---------- */
  function renderSquadra(sec) {
    const owners = new Set(C.processo.codeowners.flatMap((o) => o.owners.map((u) => u.toLowerCase())));
    return section(sec,
      h('p', { class: 'lead squad__intro' }, "I ruoli all'interno del gruppo sono ", h('strong', null, 'a rotazione'),
        ': ogni membro può assumere responsabilità diverse nei vari cicli di sviluppo.'),
      h('ul', { class: 'squad' }, C.team.map((m, i) => opCard(m, i, owners.has(String(m.github || '').toLowerCase())))));
  }

  function opCard(m, i, isOwner) {
    const initials = m.nome.split(/\s+/).map((w) => w[0]).slice(0, 2).join('');
    const img = h('img', { src: `https://github.com/${encodeURIComponent(m.github)}.png?size=48`, alt: '', width: 48, height: 48, loading: 'lazy', decoding: 'async' });
    img.addEventListener('error', () => img.remove());
    return h('li', { class: 'op' },
      h('div', { class: 'op__top' }, h('span', { class: 'micro' }, `OP-${pad(i + 1)}`), BC.barcode(m.matricola, 80, 14)),
      h('div', { class: 'op__avatar' }, h('span', { class: 'op__initials', 'aria-hidden': 'true' }, initials), img),
      h('h3', { class: 'op__name' }, m.nome),
      h('dl', { class: 'kv kv--tight' },
        h('div', null, h('dt', null, 'Matricola'), h('dd', null, val(m.matricola))),
        h('div', null, h('dt', null, 'GitHub'), h('dd', null, m.github ? ext(BC.userUrl(m.github), '@' + m.github) : tbd())),
        h('div', null, h('dt', null, 'Ruolo'), h('dd', null, val(m.ruolo))),
        m.commit ? h('div', null, h('dt', null, 'Commit su main'), h('dd', null, pad(m.commit))) : null),
      isOwner ? h('div', { class: 'op__tags' }, h('span', { class: 'chip chip--acid' }, 'codeowner')) : null);
  }

  /* ---------- 06 // telemetria ---------- */
  function renderTelemetria(sec) {
    const tile = (key, label) => h('div', { class: 'tile', 'data-tile': key },
      h('span', { class: 'micro' }, label),
      h('span', { class: 'tile__v' }, '—'),
      h('span', { class: 'tile__s micro' }, 'in attesa'));
    return section(sec,
      h('div', { class: 'tele__bar' },
        h('span', { class: 'micro rec' }, 'LIVE'),
        h('span', { class: 'micro' }, `FEED // api.github.com // ${BC.repoSlug}`),
        h('span', { class: 'micro', 'data-tele-sync': '' }, 'SYNC —'),
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
        h('div', { class: 'docs__bar' }, h('h3', { class: 'h3' }, 'Ultimi commit su main'), ext(`${BC.repoUrl}/commits/${C.repo.branch}`, h('span', { class: 'micro' }, 'STORICO COMPLETO »'))),
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
    setText('[data-tele-sync]', 'SYNC ' + BC.clock().split(' // ')[1]);

    if (ok(repo)) {
      const r = repo.value;
      setText('[data-live="push"]', BC.relTime(r.pushed_at));
      setTile('push', BC.relTime(r.pushed_at), BC.dateTime(r.pushed_at));
      const nPR = ok(pulls) ? pulls.value.length : 0;
      setTile('issues', pad(Math.max(0, r.open_issues_count - nPR)), 'PR escluse');
    }
    if (ok(pulls)) setTile('prs', pad(pulls.value.length), pulls.value[0] ? `ultima #${pulls.value[0].number}` : 'nessuna in revisione');
    if (ok(total)) {
      setText('[data-live="commits"]', pad(total.value));
      setTile('commits', pad(total.value), `ramo ${C.repo.branch}`);
    }
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
    const label = (t) => (t === 'altro' ? 'altro' : t);
    BC.$('[data-tele-stack]').replaceChildren(...TYPE_ORDER.filter((t) => counts[t]).map((t) => {
      const tip = `${label(t)}: ${counts[t]} (${pct(counts[t])}%)`;
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

  /* ---------- 07 // setup ---------- */
  function renderSetup(sec) {
    return section(sec,
      h('div', { class: 'setup' },
        h('ol', { class: 'steps' }, C.setup.map((st, i) => h('li', { class: 'step' },
          h('span', { class: 'step__n', 'aria-hidden': 'true' }, pad(i + 1)),
          h('div', { class: 'step__body' },
            h('h3', { class: 'h3' }, st.titolo),
            st.cmd ? codeBlock(st.cmd) : h('div', { class: 'code code--tbd' }, tbd('Comando da definire')))))),
        h('aside', { class: 'setup__side' },
          h('div', { class: 'card' },
            micro('STRUMENTI E TECNOLOGIE'),
            h('ul', { class: 'tools' }, C.strumenti.map((t) => h('li', null, h('strong', null, t.nome), h('span', null, val(t.uso, 'Predisposto')))))),
          h('div', { class: 'card' },
            micro('RIFERIMENTI'),
            h('ul', { class: 'refs' }, C.riferimenti.map(refItem))),
          structure())));
  }

  // riferimento da content.js ({ titolo, url, nota }) o dal README ({ testo, url }):
  // una voce tutta tra parentesi quadre è un segnaposto con la sua nota
  function refItem(r) {
    const text = r.testo || r.titolo;
    const ph = text && /^\[(.*)\]$/.exec(text);
    const note = ph ? ph[1].replace(/^(prematuro|espansione in corso|da definire)\s*[,:]?\s*/i, '') : r.nota;
    return h('li', null,
      ph || !text ? tbd() : r.url ? ext(r.url, text, ' »') : h('strong', null, BC.rich(text)),
      note ? h('span', { class: 'dim' }, note) : null);
  }

  // struttura dichiarata nel README, confrontata con l'albero della repo
  function structure() {
    const list = C.struttura || [];
    if (!list.length) return null;
    return h('div', { class: 'card' },
      micro('STRUTTURA DELLA REPO // README E ALBERO'),
      h('ul', { class: 'tree' }, list.map((d) => h('li', null,
        d.esiste === false ? h('code', null, `${d.path}/`) : ext(BC.treeUrl(d.path), h('code', null, `${d.path}/`)),
        d.esiste === false ? h('span', { class: 'chip chip--warn' }, 'non trovata')
          : d.vuota ? h('span', { class: 'chip' }, 'vuota')
            : d.files ? h('span', { class: 'micro' }, `${d.files} file`) : null,
        d.desc ? h('span', { class: 'dim' }, d.desc) : null))));
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
          micro('SISTEMA'),
          h('div', { class: 'fsys' },
            h('button', { type: 'button', class: 'btn btn--sm', 'data-console-open': '' }, 'Terminale ', h('kbd', null, '\\')),
            h('button', { type: 'button', class: 'btn btn--sm', 'data-sound-toggle': '', 'aria-pressed': 'true' }, 'Suono ', h('b', { 'data-sound-state': '' }, 'ON')),
            h('button', { type: 'button', class: 'btn btn--sm', 'data-reboot': '' }, 'Riavvia sequenza')))),
      h('div', { class: 'footer__base micro' },
        h('span', null, 'Progetto con licenza ', ext(BC.fileUrl('LICENSE'), BC.Repo.meta.licenza || 'MIT')),
        h('span', null, 'Omaggio estetico non ufficiale a Marathon. Nessuna affiliazione con Bungie.'),
        h('span', null, 'BC-2627 // v0.1'))));
  }

  /* ---------- navigazione, rail, tooltip, rivelazioni ---------- */
  function renderNav() {
    const ol = BC.$('[data-nav]');
    ol.replaceChildren(...BC.sections.filter((x) => x.id !== 'home').map((x) => h('li', null,
      h('a', { href: `#${x.id}`, 'data-nav-link': x.id }, h('span', { class: 'nav__n' }, x.num), x.label))));
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

  // sottotitolo in basso, scritto un carattere alla volta come nel video
  let subTimer = 0;
  function subtitle(sec) {
    const el = BC.$('[data-subtitle]');
    if (!el) return;
    const text = typeof sec.sub === 'function' ? sec.sub() : sec.sub || '';
    clearInterval(subTimer);
    if (BC.reduced) {
      el.textContent = text;
      return;
    }
    let i = 0;
    el.textContent = '';
    subTimer = setInterval(() => {
      el.textContent = text.slice(0, ++i);
      if (i >= text.length) clearInterval(subTimer);
    }, 22);
  }

  function initObservers() {
    const links = new Map(BC.$$('[data-nav-link]').map((a) => [a.dataset.navLink, a]));
    const railSec = BC.$('[data-rail-sec]');
    let current = null;
    const spy = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (!e.isIntersecting || current === e.target.id) return;
      current = e.target.id;
      links.forEach((a) => a.removeAttribute('aria-current'));
      const a = links.get(e.target.id);
      if (a) a.setAttribute('aria-current', 'true');
      const sec = BC.sections.find((x) => x.id === e.target.id);
      if (railSec && sec) railSec.textContent = `SEC.${sec.num}`;
      if (sec) subtitle(sec);
    }), { rootMargin: '-40% 0px -55% 0px' });

    const reveal = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      const title = BC.$('[data-scramble]', e.target);
      if (title) BC.scramble(title, title.textContent, 700);
      reveal.unobserve(e.target);
    }), { rootMargin: '0px 0px -8% 0px' });

    BC.sections.forEach((x) => {
      const el = document.getElementById(x.id);
      if (!el) return;
      spy.observe(el);
      if (x.id !== 'home') reveal.observe(el);
    });
  }

  function initRail() {
    const rail = BC.$('.rail');
    const screen = BC.$('#screen');
    if (!rail) return;
    const pct = BC.$('[data-rail-pct]', rail);
    let queued = false;
    const update = () => {
      queued = false;
      const max = screen.scrollHeight - screen.clientHeight;
      const p = max > 0 ? Math.min(1, screen.scrollTop / max) : 0;
      rail.style.setProperty('--scroll', p.toFixed(4));
      pct.textContent = pad(Math.round(p * 100), 3);
    };
    screen.addEventListener('scroll', () => {
      if (!queued) {
        queued = true;
        requestAnimationFrame(update);
      }
    }, { passive: true });
    update();
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
    BC.$('#screen').addEventListener('scroll', () => cur && hide(), { passive: true });
  }

  BC.goto = function (id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: BC.reduced ? 'auto' : 'smooth', block: 'start' });
    history.replaceState(null, '', `#${id}`);
  };

  BC.renderSite = function () {
    const builders = {
      home: renderHome, panoramica: renderPanoramica, capitolati: renderCapitolati, documenti: renderDocumenti,
      processo: renderProcesso, squadra: renderSquadra, telemetria: renderTelemetria, setup: renderSetup,
    };
    // prima si costruisce tutto, poi si tocca la pagina: se un renderer fallisce
    // (dati inattesi) la pagina resta com'è e main.js riprova con content.js
    BC.feeds = [];
    const main = BC.sections.map((x) => builders[x.id](x));
    const footer = renderFooter();
    BC.$('#main').replaceChildren(...main);
    BC.$('#footer-slot').replaceWith(footer);
    renderNav();
    initObservers();
    initRail();
    initTooltip();
    BC.Sphere.init();
  };
})();
