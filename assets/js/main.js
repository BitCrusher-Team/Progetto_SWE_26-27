/* =====================================================================
   BIT CRUSHER // main.js
   Regia degli stadi: apertura rossa -> terminale verde -> attesa nella
   sfera (mentre si scaricano i dati) -> sito. Più i controlli globali
   (orologio, suono, sfera, copia, console).
   Parametri utili: ?stage=boot|terminal|wait|site|fault, ?skip, #sezione.
   ===================================================================== */
(function () {
  'use strict';

  const BC = window.BC;
  const $ = BC.$;
  const stages = { boot: $('#boot'), term: $('#term'), site: $('#site') };
  const params = new URLSearchParams(location.search);

  // dati della repo (repo.js): partono subito, durante apertura e terminale;
  // il sito li aspetta al massimo REPO_WAIT_MS, poi usa content.js
  const REPO_WAIT_MS = 4000;
  const repoReady = BC.Repo.load().catch((e) => console.warn('repo.js', e));

  function show(name) {
    Object.entries(stages).forEach(([k, el]) => { el.hidden = k !== name; });
    document.body.dataset.stage = name;
  }

  function startBoot() {
    show('boot');
    BC.Boot(stages.boot, (res) => (res && res.skip ? enterSite() : startTerminal()));
  }

  function startTerminal() {
    show('term');
    BC.renderTermSide(stages.term);
    const term = new BC.Terminal(stages.term, {
      mode: 'gate',
      onEnter: (section) => startWait(section),
    });
    // ?cmd=... esegue un comando appena il terminale è pronto (demo)
    term.boot().then(() => {
      if (params.get('cmd')) term.exec(params.get('cmd'));
    });
  }

  // l'attesa resta sopra al sito e sfuma solo quando il sito è pronto sotto
  function startWait(section) {
    BC.Wait($('#wait'), () => enterSite({ section, fromWait: true }));
  }

  function enterSite({ section, fromWait = false } = {}) {
    BC.store.sset('bc.entered', '1');
    show('site');
    if (BC.siteReady) return land(section);
    BC.siteReady = true;
    $('#main').replaceChildren(BC.h('p', { class: 'micro site__sync' }, 'SINCRONIZZAZIONE CON LA REPO…'));
    Promise.race([repoReady, BC.sleep(REPO_WAIT_MS)]).then(() => {
      build();
      syncSound(BC.SFX.enabled);
      land(section);
      BC.loadTelemetry();
      BC.Sphere.probe();
      repoReady.then(() => signal(fromWait));
    });
  }

  // se i dati della repo rompono il rendering si riparte da quelli di content.js
  function build() {
    try {
      BC.renderSite();
    } catch (e) {
      console.error('sito: dati della repo non utilizzabili, uso content.js', e);
      if (!BC.Repo.reset()) throw e;
      BC.renderSite();
    }
  }

  // repo non raggiungibile: dopo l'attesa la schermata intera, altrimenti
  // solo la striscia sotto la barra in alto
  function signal(fromWait) {
    const kind = BC.Fault.fromRepo(BC.Repo);
    if (!kind) return;
    if (fromWait && BC.Repo.status === 'offline') BC.Fault.screen(kind, { errors: BC.Repo.errors });
    else BC.Fault.banner(kind, { errors: BC.Repo.errors });
  }

  function land(section) {
    const screen = $('#screen');
    requestAnimationFrame(() => {
      const target = section && document.getElementById(section);
      if (target) target.scrollIntoView({ behavior: 'instant', block: 'start' });
      else screen.scrollTop = 0;
      screen.focus({ preventScroll: true });
    });
  }

  BC.reboot = function () {
    BC.store.sdel('bc.entered');
    location.href = location.pathname;
  };

  BC.toast = function (msg) {
    const t = $('[data-toast]');
    if (!t) return;
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(BC.toastTimer);
    BC.toastTimer = setTimeout(() => { t.hidden = true; }, 5200);
  };

  /* ---------- console di sistema (tasto \ o `) ---------- */
  let consoleTerm = null;
  const consoleEl = $('#console');

  function openConsole() {
    if (!consoleTerm) {
      consoleTerm = new BC.Terminal(consoleEl, { mode: 'console', onClose: closeConsole });
      consoleTerm.print('BC QTERM // console di sistema. Digita «aiuto» per i comandi, ESC per chiudere.', { frames: 4, cls: 'dim' });
    }
    consoleEl.hidden = false;
    requestAnimationFrame(() => consoleEl.classList.add('is-open'));
    BC.$$('[data-console-open]').forEach((b) => b.setAttribute('aria-expanded', 'true'));
    setTimeout(() => consoleTerm.focus(), 60);
  }

  function closeConsole() {
    consoleEl.classList.remove('is-open');
    BC.$$('[data-console-open]').forEach((b) => b.setAttribute('aria-expanded', 'false'));
    setTimeout(() => {
      consoleEl.hidden = true;
      $('#screen').focus({ preventScroll: true });
    }, 240);
  }

  document.addEventListener('keydown', (e) => {
    if (document.body.dataset.stage !== 'site') return;
    const inField = e.target.closest && e.target.closest('input, textarea, select, [contenteditable]');
    const inConsole = e.target.closest && e.target.closest('#console');
    if ((e.key === '\\' || e.key === '`') && (!inField || inConsole)) {
      e.preventDefault();
      if (consoleEl.hidden) openConsole();
      else closeConsole();
    } else if (e.key === 'Escape' && !consoleEl.hidden) {
      closeConsole();
    }
  });

  /* ---------- controlli globali ---------- */
  function syncSound(on) {
    BC.$$('[data-sound-toggle]').forEach((b) => {
      b.setAttribute('aria-pressed', String(on));
      const st = b.querySelector('[data-sound-state]');
      if (st) st.textContent = on ? 'ON' : 'OFF';
    });
  }
  BC.SFX.onChange(syncSound);
  syncSound(BC.SFX.enabled);

  document.addEventListener('click', async (e) => {
    const t = e.target.closest('[data-sound-toggle], [data-sphere-toggle], [data-reboot], [data-copy], [data-console-open], [data-console-close]');
    if (!t) return;
    if (t.hasAttribute('data-sound-toggle')) {
      BC.SFX.toggle();
      BC.SFX.blip();
    } else if (t.hasAttribute('data-sphere-toggle')) {
      BC.Sphere.toggle();
      BC.SFX.blip();
    } else if (t.hasAttribute('data-reboot')) {
      BC.reboot();
    } else if (t.hasAttribute('data-console-open')) {
      openConsole();
    } else if (t.hasAttribute('data-console-close')) {
      closeConsole();
    } else if (t.hasAttribute('data-copy')) {
      const label = t.dataset.label || (t.dataset.label = t.textContent);
      const ok = await BC.copy(t.dataset.copy);
      t.textContent = ok ? 'Copiato' : 'Errore';
      BC.SFX.blip();
      setTimeout(() => { t.textContent = label; }, 1200);
    }
  });

  function tick() {
    const full = BC.clock();
    const time = full.split(' // ')[1];
    BC.$$('[data-clock]').forEach((el) => { el.textContent = full; });
    BC.$$('[data-clock-time]').forEach((el) => { el.textContent = time; });
  }
  tick();
  setInterval(tick, 1000);

  /* ---------- avvio ---------- */
  const forced = params.get('stage');
  const hash = decodeURIComponent(location.hash.slice(1));
  const deep = BC.sections.some((x) => x.id === hash) ? hash : null;

  if (forced === 'boot') startBoot();
  else if (forced === 'terminal') startTerminal();
  else if (forced === 'fault') {
    // anteprima della schermata di repo non raggiungibile (?kind=private|ratelimit|network|server)
    enterSite({ section: deep });
    BC.Fault.screen(BC.Fault.KINDS[params.get('kind')] ? params.get('kind') : 'private');
  }
  else if (forced === 'wait') {
    show('wait');
    startWait(deep);
  } else if (forced === 'site' || params.has('skip') || deep || BC.store.sget('bc.entered') === '1') enterSite({ section: deep });
  else startBoot();
})();
