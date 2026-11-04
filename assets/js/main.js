/* =====================================================================
   BIT CRUSHER // main.js
   Regia: il sito si apre subito sui contenuti, senza effetti né suoni.
   Il terminale è una console sopra il sito (tasto \ o `, pulsante >_)
   per esplorare la repo in sola lettura.
   Parametri utili: #sezione, ?cmd=<comando> (apre la console e lo
   esegue), ?stage=fault&kind=private|ratelimit|network|server
   (anteprima della schermata di repo non raggiungibile).
   ===================================================================== */
(function () {
  'use strict';

  const BC = window.BC;
  const $ = BC.$;
  const params = new URLSearchParams(location.search);

  // dati della repo (repo.js): partono subito; il sito li aspetta al massimo
  // REPO_WAIT_MS, poi usa content.js
  const REPO_WAIT_MS = 4000;
  const repoReady = BC.Repo.load().catch((e) => console.warn('repo.js', e));

  function enterSite(section) {
    $('#main').replaceChildren(BC.h('p', { class: 'micro site__sync' }, 'Caricamento dei dati della repo…'));
    Promise.race([repoReady, BC.sleep(REPO_WAIT_MS)]).then(() => {
      build();
      land(section);
      BC.loadTelemetry();
      repoReady.then(signal);
      if (params.get('cmd')) {
        openConsole();
        consoleTerm.exec(params.get('cmd'));
      }
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

  // repo non raggiungibile: una striscia in cima al contenuto, il sito resta
  // consultabile con i dati locali
  function signal() {
    const kind = BC.Fault.fromRepo(BC.Repo);
    if (kind) BC.Fault.banner(kind, { errors: BC.Repo.errors });
  }

  function land(section) {
    requestAnimationFrame(() => {
      const target = section && document.getElementById(section);
      if (target) target.scrollIntoView({ block: 'start' });
      $('#screen').focus({ preventScroll: true });
    });
  }

  /* ---------- console (tasto \ o `) ---------- */
  let consoleTerm = null;
  const consoleEl = $('#console');

  function openConsole() {
    if (!consoleTerm) {
      consoleTerm = new BC.Terminal(consoleEl, { onClose: closeConsole });
      consoleTerm.line('Console della repo in sola lettura. «aiuto» per i comandi, ESC per chiudere.', 'dim');
    }
    consoleEl.hidden = false;
    BC.$$('[data-console-open]').forEach((b) => b.setAttribute('aria-expanded', 'true'));
    consoleTerm.focus();
  }

  function closeConsole() {
    consoleEl.hidden = true;
    BC.$$('[data-console-open]').forEach((b) => b.setAttribute('aria-expanded', 'false'));
    $('#screen').focus({ preventScroll: true });
  }

  document.addEventListener('keydown', (e) => {
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
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-console-open], [data-console-close]');
    if (!t) return;
    if (t.hasAttribute('data-console-open')) {
      openConsole();
    } else {
      closeConsole();
    }
  });

  // orologio della schermata di errore, se aperta
  setInterval(() => {
    BC.$$('[data-clock]').forEach((el) => { el.textContent = BC.clock(); });
  }, 1000);

  /* ---------- avvio ---------- */
  const hash = decodeURIComponent(location.hash.slice(1));
  enterSite(BC.sections.some((x) => x.id === hash) ? hash : null);
  if (params.get('stage') === 'fault') BC.Fault.screen(BC.Fault.KINDS[params.get('kind')] ? params.get('kind') : 'private');
})();
