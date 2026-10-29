/* =====================================================================
   BIT CRUSHER // sphere.js
   Effetto "dentro una sfera", come nel filmato di Cryo Archive, senza
   deformare i pixel (una vera distorsione radiale del DOM spezza il
   testo e sfasa i click):
   - curvatura: ogni blocco del sito è orientato in 3D come se stesse
     sull'interno di una sfera. Verso i bordi alto e basso si piega
     verso chi guarda (rotateX + scala, legati allo scroll); se sta a
     sinistra o a destra si gira verso il centro (rotateY fisso, --ry).
     Lo scroll lo gestisce il CSS (animation-timeline: view()) dove c'è,
     altrimenti un ripiego JS. Le trasformazioni CSS lasciano il testo
     leggibile e i click esatti;
   - cornice da lente: maschere nere a bordo curvo in alto e in basso
     con le fasce che fanno scorrere il testo (HUD SVG), vignettatura.
   Si spegne dal tasto SFERA (scelta ricordata nel browser) e da sola se
   il dispositivo non regge.
   ===================================================================== */
(function () {
  'use strict';

  const BC = window.BC;
  // blocchi che si piegano: tenere allineata la stessa lista in main.css
  const CURVE = [
    '.hero__grid > *', '.hero__meta', '.hero__spread', '.sec__head', '.ruler', '.note', '.pano__desc', '.stats',
    '.feeds__bar', '.mfeed', '.award', '.pcard', '.orbit', '.caplist__bar', '.caprow', '.docs__bar', '.vrow',
    '.docs__side > .card', '.val', '.proc > .card', '.squad__intro', '.op', '.tele__bar', '.tele__offline', '.tele__meta',
    '.tele__tiles', '.chart', '.crow', '.step', '.setup__side > .card', '.footer__mark', '.footer__grid', '.footer__base',
  ].join(', ');
  const PITCH = 18;    // inclinazione massima ai bordi alto/basso (come i keyframe bc-curve)
  const YAW = 10;      // rotazione massima verso il centro per i blocchi laterali
  const GROW = 0.045;  // ingrandimento massimo ai bordi
  const BAND_TEXT = '######## [SOLA LETTURA] · ######## [BIT CRUSHER] · ';
  const cssCurve = !!(window.CSS && CSS.supports && CSS.supports('animation-timeline: view()'));
  // ?sfera=off|on forza lo stato senza memorizzarlo (presentazioni, verifiche)
  const forced = new URLSearchParams(location.search).get('sfera');

  const Sphere = (BC.Sphere = {
    on: forced ? forced !== 'off' : BC.store.get('bc.sphere') !== 'off',
    forced: !!forced,
    ready: false,
    items: [],

    init() {
      this.screen = document.getElementById('screen');
      this.hud = document.querySelector('[data-hud]');
      this.onScroll = () => {
        if (this.queued) return;
        this.queued = true;
        requestAnimationFrame(() => this.tick());
      };
      this.ready = true;
      const ro = new ResizeObserver(() => this.schedule());
      ro.observe(this.screen);
      ro.observe(document.getElementById('main'));
      this.apply();
    },

    schedule() {
      clearTimeout(this.t);
      this.t = setTimeout(() => this.build(), 100);
    },

    get active() {
      return this.on && !BC.reduced;
    },

    // il ripiego JS serve solo senza scroll-driven animations
    get js() {
      return this.active && !cssCurve;
    },

    build() {
      if (!this.ready || !this.on) return;
      const W = this.screen.clientWidth;
      const H = this.screen.clientHeight;
      if (!W || !H) return;
      this.drawHud(W, H);
      if (!this.active) return;
      this.measure(W);
      this.tick();
    },

    // posizione di ogni blocco nel contenuto di #screen: offsetTop/Left
    // ignorano le trasformazioni, quindi la misura non si rincorre
    measure(W) {
      this.items = BC.$$(CURVE, this.screen).map((el) => {
        let x = 0;
        let y = 0;
        for (let n = el; n && n !== this.screen; n = n.offsetParent) {
          x += n.offsetLeft;
          y += n.offsetTop;
        }
        const w = el.offsetWidth;
        const nx = (x + w / 2 - W / 2) / (W / 2);
        const ry = w > W * 0.7 ? 0 : -Math.max(-1, Math.min(1, nx)) * YAW;
        el.style.setProperty('--ry', `${ry.toFixed(2)}deg`);
        return { el, c: y + el.offsetHeight / 2, ry, on: false };
      });
    },

    tick() {
      this.queued = false;
      if (!this.js) return;
      const H = this.screen.clientHeight;
      const mid = this.screen.scrollTop + H / 2;
      for (const it of this.items) {
        const ny = (it.c - mid) / (H / 2);
        // curva continua: quasi piatta al centro, piena ai bordi
        const k = Math.abs(ny) > 1.8 ? 0 : Math.pow(Math.min(1, Math.abs(ny)), 1.7);
        if (!k && !it.ry) {
          if (it.on) {
            it.el.style.transform = '';
            it.on = false;
          }
          continue;
        }
        it.el.style.transform = `perspective(1100px) rotateY(${it.ry}deg) rotateX(${(Math.sign(ny) * PITCH * k).toFixed(2)}deg) scale(${(1 + GROW * k).toFixed(4)})`;
        it.on = true;
      }
    },

    clear() {
      this.items.forEach((it) => {
        it.el.style.transform = '';
        it.el.style.removeProperty('--ry');
        it.on = false;
      });
      this.items = [];
    },

    // bordo curvo del contenuto: più profondo al centro, quasi nullo ai lati
    drawHud(W, H) {
      const s = BC.s;
      const svg = this.hud;
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      svg.setAttribute('width', W);
      svg.setAttribute('height', H);
      const deep = Math.max(24, Math.min(68, H * 0.065));
      const edge = (x) => {
        const n = (2 * x) / W - 1;
        return 4 + (deep - 4) * (1 - n * n);
      };
      const N = 48;
      const top = [];
      const bot = [];
      for (let i = 0; i <= N; i++) {
        const x = (i / N) * W;
        top.push([x, edge(x)]);
        bot.push([x, H - edge(x)]);
      }
      const pts = (list, dy = 0) => list.map(([x, y]) => `${x.toFixed(1)} ${(y + dy).toFixed(1)}`).join(' L');
      const T = 14;
      const probe = s('text', { class: 'hud__txt' }, BAND_TEXT);
      svg.replaceChildren(probe);
      const len = probe.getComputedTextLength() || BAND_TEXT.length * 6.7;
      const text = BAND_TEXT.repeat(Math.ceil((W * 1.6) / len) + 2);
      const band = (id, list, dy, dir) => {
        const t = s('text', { class: 'hud__txt' });
        const tp = s('textPath', { href: `#${id}` }, text);
        tp.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', `#${id}`);
        t.appendChild(tp);
        if (!BC.reduced) {
          tp.appendChild(s('animate', {
            attributeName: 'startOffset', from: dir > 0 ? '0' : `${-len}`, to: dir > 0 ? `${-len}` : '0',
            dur: `${(len / 18).toFixed(1)}s`, repeatCount: 'indefinite',
          }));
        }
        return [
          s('path', { d: `M${pts(list, dy)}`, class: 'hud__band', 'stroke-width': T }),
          s('path', { id, d: `M${pts(list, dy + 3)}`, fill: 'none' }),
          t,
        ];
      };
      // linee di latitudine appena visibili dentro le maschere
      const wires = [-10, -20, -32].map((o) => [
        s('path', { class: 'hud__wire', d: `M${pts(top, o)}` }),
        s('path', { class: 'hud__wire', d: `M${pts(bot, -o)}` }),
      ]).flat();
      svg.replaceChildren(
        s('path', { class: 'hud__mask', d: `M0 0 L${pts(top)} L${W} 0 Z` }),
        s('path', { class: 'hud__mask', d: `M0 ${H} L${pts(bot)} L${W} ${H} Z` }),
        ...wires,
        ...band('hud-top', top, T / 2, 1),
        ...band('hud-bot', bot, -T / 2, -1));
    },

    apply() {
      document.body.classList.toggle('sphere-on', this.on);
      document.body.classList.toggle('sphere-css', this.active && cssCurve);
      BC.$$('[data-sphere-toggle]').forEach((b) => {
        b.setAttribute('aria-pressed', String(this.on));
        const st = b.querySelector('[data-sphere-state]');
        if (st) st.textContent = this.on ? 'ON' : 'OFF';
      });
      if (!this.ready) return;
      if (this.js) this.screen.addEventListener('scroll', this.onScroll, { passive: true });
      else this.screen.removeEventListener('scroll', this.onScroll);
      if (!this.active) this.clear();
      this.build();
    },

    set(on, remember = true) {
      this.on = on;
      if (remember) BC.store.set('bc.sphere', on ? 'on' : 'off');
      this.apply();
    },

    toggle() {
      this.set(!this.on);
    },

    // se lo scorrimento resta a scatti, spegne la sfera (solo se l'utente non ha scelto)
    probe() {
      if (!this.on || this.forced || BC.store.get('bc.sphere')) return;
      let n = 0;
      let last = 0;
      let slow = 0;
      const step = (t) => {
        if (last && t - last > 60) slow++;
        last = t;
        if (++n < 100) return requestAnimationFrame(step);
        if (slow > 40) {
          this.set(false, false);
          BC.toast('Effetto sfera disattivato per mantenere fluido il sito. Puoi riattivarlo da SFERA.');
        }
      };
      setTimeout(() => requestAnimationFrame(step), 600);
    },
  });
  void Sphere;
})();
