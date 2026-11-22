/* =====================================================================
   BIT CRUSHER // site.js
   La pagina, semplice come la vuole il docente:
   - in testa il gruppo e il capitolato aggiudicato;
   - le consegne, dalla più recente: in ognuna la Lettera di
     presentazione in evidenza, poi la documentazione esterna e quella
     interna (documenti, verbali, diari di bordo con la loro data);
   - di lato il gruppo: presentazione, componenti, contatti;
   - in testata il pulsante del Glossario (glossario.html), se c'è.
   Niente menu, niente effetti; ogni documento si apre in una nuova scheda.
   ===================================================================== */
(function () {
  'use strict';

  const BC = window.BC;
  const C = BC.content;
  const { h } = BC;

  const newTab = BC.newTab;
  const FORMATI = { pdf: 'PDF', ppt: 'PowerPoint', pptx: 'PowerPoint', doc: 'Word', docx: 'Word', odt: 'ODT', odp: 'ODP' };
  const formato = (path) => FORMATI[((/\.([a-z0-9]+)$/i.exec(path || '') || [])[1] || '').toLowerCase()] || 'file';
  const dettagli = (versione, path) => [versione && `versione ${versione}`, formato(path)].filter(Boolean).join(' · ');
  // "docs/verbali/verbali_interni/Verbale_interno_09.pdf" -> "Verbale interno 09"
  const nomeDaFile = (path) => String(path).split('/').pop().replace(/\.[a-z0-9]+$/i, '').replace(/_firmato$/i, '').replace(/_/g, ' ');

  // consegna di un verbale o di un diario: la prima con data uguale o
  // successiva alla sua; senza data, o dopo l'ultima consegna datata, la prima
  // consegna ancora senza data (quella in corso)
  function consegnaDi(data) {
    const datata = data && C.consegne.find((c) => c.data && c.data >= data);
    if (datata) return datata.id;
    return (C.consegne.find((c) => !c.data) || C.consegne[C.consegne.length - 1]).id;
  }

  /* ---------- righe degli elenchi ---------- */
  // verbali e diari hanno la colonna della data: vuota se la data manca,
  // così i titoli restano allineati
  function riga(file, titolo, info, data, datata) {
    return h('li', null,
      h('a', { href: BC.docUrl(file), target: '_blank', rel: 'noopener' },
        data ? h('time', { class: 'riga__data', datetime: data }, BC.fmtDate(data))
          : datata ? h('span', { class: 'riga__data' }) : null,
        h('span', { class: 'riga__titolo' }, titolo),
        h('span', { class: 'riga__info' }, info),
        newTab()));
  }
  const rigaDocumento = (d) => riga(d.file, d.nome, dettagli(d.versione, d.file));
  const rigaVerbale = (v) => riga(v.file, `${v.titolo || nomeDaFile(v.file)}${v.con ? ` (${v.con})` : ''}`, dettagli(v.versione, v.file), v.data, true);
  const rigaDiario = (d) => riga(d.file, d.numero ? `Diario di bordo ${d.numero}` : nomeDaFile(d.file), formato(d.file), d.data, true);

  // riquadro di un documento: quello letto dalla repo, altrimenti il catalogo
  const usoDi = (d) => d.uso || (C.catalogo.find((x) => x.nome === d.nome) || {}).uso || 'esterno';

  // titoletto ed elenco, oppure niente se l'elenco è vuoto
  const elenco = (titolo, voci) => (voci.length ? [h('h4', null, titolo), h('ul', { class: 'elenco' }, voci)] : null);

  /* ---------- una consegna ---------- */
  function consegna(c) {
    const documenti = C.documenti.filter((d) => d.consegna === c.id);
    const verbali = C.verbali.filter((v) => consegnaDi(v.data) === c.id);
    const diari = C.diari.filter((d) => consegnaDi(d.data) === c.id);
    if (!documenti.length && !verbali.length && !diari.length) return null;

    const lettera = documenti.find((d) => /lettera/i.test(d.nome));
    const posto = (d) => {
      const i = C.catalogo.findIndex((x) => x.nome === d.nome);
      return i < 0 ? C.catalogo.length : i;
    };
    const recenti = (a, b) => String(b.data || '9999').localeCompare(String(a.data || '9999'));

    function blocco(uso, titolo, titoloVerbali) {
      const parti = [
        elenco('Documenti', documenti.filter((d) => d !== lettera && usoDi(d) === uso)
          .sort((a, b) => posto(a) - posto(b) || a.nome.localeCompare(b.nome)).map(rigaDocumento)),
        elenco(titoloVerbali, verbali.filter((v) => v.tipo === uso).sort(recenti).map(rigaVerbale)),
        uso === 'esterno' ? elenco('Diari di bordo', diari.slice().sort((a, b) => recenti(a, b) || (b.numero || 0) - (a.numero || 0)).map(rigaDiario)) : null,
      ].filter(Boolean);
      return h('section', { class: 'blocco', 'aria-label': `${titolo}, ${c.titolo}` },
        h('h3', null, titolo),
        parti.length ? parti : h('p', { class: 'vuoto' }, 'Ancora nessun documento.'));
    }

    return h('section', { id: c.id, class: 'consegna', 'aria-labelledby': `titolo-${c.id}` },
      h('div', { class: 'consegna__testata' },
        h('h2', { id: `titolo-${c.id}` }, c.titolo),
        c.data ? h('time', { datetime: c.data }, BC.fmtDate(c.data)) : h('span', null, 'in corso')),
      lettera
        ? h('a', { class: 'lettera', href: BC.docUrl(lettera.file), target: '_blank', rel: 'noopener' },
          h('span', null,
            h('span', { class: 'lettera__titolo' }, lettera.nome),
            h('span', { class: 'lettera__info' }, dettagli(lettera.versione, lettera.file))),
          h('span', { class: 'lettera__apri', 'aria-hidden': 'true' }, 'Apri'),
          newTab())
        : null,
      h('div', { class: 'blocchi' },
        blocco('esterno', 'Documentazione esterna', 'Verbali esterni'),
        blocco('interno', 'Documentazione interna', 'Verbali interni')));
  }

  /* ---------- la pagina ---------- */
  BC.renderSite = function () {
    const S = C.sito;
    const cap = S.capitolato;
    // si costruisce tutto prima di toccare la pagina
    const sezioni = C.consegne.slice().reverse().map(consegna).filter(Boolean);
    // il Glossario, se in content.js c'è un file e la repo non dice che manca
    const glossario = (C.glossari || []).some((g) => BC.percorsi(g.file).length && g.presente !== false);
    const pagina = [
      BC.testata(S.gruppo, [
        h('p', null, S.corso),
        cap && cap.id
          ? h('p', { class: 'testata__capitolato' },
            `Capitolato aggiudicato: ${cap.id}${cap.titolo ? ` – ${cap.titolo}` : ''}${cap.proponente ? `, proposto da ${cap.proponente}` : ''}`)
          : null,
      ], glossario
        ? h('a', { class: 'testata__azione', href: 'glossario.html', target: '_blank', rel: 'noopener' }, 'Glossario', newTab())
        : null),
      h('div', { class: 'contenitore griglia' },
        h('main', { id: 'contenuto' }, sezioni.length ? sezioni : h('p', { class: 'vuoto' }, 'Ancora nessun documento pubblicato.')),
        h('aside', { class: 'gruppo', 'aria-labelledby': 'titolo-gruppo' },
          h('h2', { id: 'titolo-gruppo' }, 'Il gruppo'),
          h('p', null, S.presentazione),
          h('h3', null, 'Componenti'),
          h('ul', null, C.componenti.map((n) => h('li', null, n))),
          h('h3', null, 'Contatti'),
          h('ul', null,
            h('li', null, h('a', { href: `mailto:${S.email}` }, S.email)),
            h('li', null, h('a', { href: BC.repoUrl, target: '_blank', rel: 'noopener' }, 'Repository su GitHub', newTab()))))),
      h('footer', { class: 'piede' },
        h('div', { class: 'contenitore' }, 'Ogni documento si apre in una nuova scheda. L\'elenco si aggiorna da solo dalla repository del progetto.')),
    ];
    BC.$('#pagina').replaceChildren(...pagina);
  };

  // la repository non risponde: una riga in cima, la pagina resta consultabile
  BC.notice = function () {
    if (['ok', 'idle', 'loading'].includes(BC.Repo.status) || BC.$('.avviso')) return;
    BC.$('#contenuto').prepend(h('p', { class: 'avviso', role: 'status' },
      'In questo momento non riusciamo a leggere la repository del progetto: l\'elenco potrebbe non essere aggiornato. ',
      h('button', { type: 'button', onclick: () => BC.Repo.retry() }, 'Riprova')));
  };
})();
