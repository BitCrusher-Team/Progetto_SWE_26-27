/* =====================================================================
   BIT CRUSHER // main.js
   Avvio: legge i dati della repo (al massimo REPO_WAIT_MS di attesa, poi
   usa content.js), disegna la pagina e, se i dati della repo arrivano
   dopo, la ridisegna. Con #<consegna> (es. #candidatura) apre la pagina
   su quella consegna.
   ===================================================================== */
(function () {
  'use strict';

  const BC = window.BC;
  const REPO_WAIT_MS = 4000;
  let loaded = false;
  const ready = BC.Repo.load()
    .catch((e) => console.warn('repo.js', e))
    .then(() => { loaded = true; });

  // se i dati della repo rompono il disegno si riparte da quelli di content.js
  function build() {
    try {
      BC.renderSite();
    } catch (e) {
      console.error('sito: dati della repo non utilizzabili, uso content.js', e);
      if (!BC.Repo.reset()) throw e;
      BC.renderSite();
    }
  }

  function land() {
    const target = location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (target) target.scrollIntoView();
  }

  Promise.race([ready, BC.sleep(REPO_WAIT_MS)]).then(() => {
    build();
    land();
    if (loaded) BC.notice();
    else {
      ready.then(() => {
        build();
        BC.notice();
      });
    }
  });
})();
