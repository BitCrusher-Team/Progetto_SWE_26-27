/* =====================================================================
   CONTENUTI DEL SITO // Bit Crusher // Progetto SWE 26-27
   ---------------------------------------------------------------------
   La pagina legge i documenti dalla repo di progetto (repo.js):
   - i documenti di ogni consegna da docs/<consegna>/ o da
     docs/compiled/<consegna>/ (es. docs/candidatura/, docs/rtb/); una
     sottocartella con "esterni" o "interni" nel nome decide il riquadro,
     altrimenti decide il catalogo qui sotto;
   - i verbali dalla tabella del README e da docs/verbali/ (o
     docs/compiled/verbali/);
   - i diari di bordo da docs/pptx/diari_di_bordo/;
   - i componenti dalla tabella del team nel README.
   La pagina del Glossario (glossario.html) legge i file scelti in
   «glossari», più sotto.
   Questo file contiene i testi della pagina, le consegne con le loro date
   e i dati di ripiego, usati se la repo non risponde.

   Convenzioni:
   - I percorsi dei file sono relativi alla root della repo e si aprono
     sempre in una nuova scheda.
   - Le date usano il formato AAAA-MM-GG.
   - Verbali e diari vanno nella prima consegna con data uguale o
     successiva alla loro; senza data, o dopo l'ultima consegna datata,
     vanno nella prima consegna ancora senza data (quella in corso).
   ===================================================================== */
window.BC_CONTENT = {
  repo: {
    owner: "BitCrusher-Team",
    name: "Progetto_SWE_26-27",
    branch: "main",
    // Il sito è pubblicato dalla stessa repo: i documenti si aprono da qui, nel
    // visualizzatore del browser (null = pagina del file su GitHub)
    pages: "https://bitcrusher-team.github.io/Progetto_SWE_26-27/",
  },

  sito: {
    gruppo: "Bit Crusher",
    corso: "Ingegneria del Software · Università degli Studi di Padova · A.A. 2026/2027",
    // capitolato aggiudicato (dalla scheda del README, se c'è "Capitolato aggiudicato")
    capitolato: { id: "C6", titolo: "Sistema AI di caching semantico e dashboard FinOps", proponente: "Var Group S.p.A." },
    presentazione: "Siamo sette studenti del corso di Ingegneria del Software. In questa pagina " +
      "trovate i documenti del nostro progetto, raccolti per consegna e divisi tra documentazione " +
      "esterna e interna. I ruoli ruotano tra i componenti nel corso del progetto.",
    email: "bitcrusherteam@gmail.com",
  },

  // Consegne, dalla prima all'ultima. id = nome della cartella in docs/,
  // data = scadenza della consegna (null finché non è fissata)
  consegne: [
    // primo invio il 30/10, documenti rifatti per C6 e inviati di nuovo il 9/11
    { id: "candidatura", titolo: "Candidatura", data: "2026-11-09" },
    { id: "rtb", titolo: "Requirements and Technology Baseline", data: null },
    { id: "pb", titolo: "Product Baseline", data: null },
  ],

  // Nomi ufficiali dei documenti e riquadro in cui vanno (esterno o interno).
  // Servono a riconoscere i PDF: "Valutazione_Capitolati_BitCrusher.pdf"
  // diventa "Valutazione dei capitolati"
  catalogo: [
    { nome: "Lettera di presentazione", uso: "esterno" },
    { nome: "Valutazione dei capitolati", uso: "esterno" },
    { nome: "Dichiarazione degli impegni", uso: "esterno" },
    { nome: "Analisi dei Requisiti", uso: "esterno" },
    { nome: "Piano di Progetto", uso: "esterno" },
    { nome: "Piano di Qualifica", uso: "esterno" },
    { nome: "Glossario", uso: "esterno" },
    { nome: "Norme di Progetto", uso: "interno" },
  ],

  // ---------------------------------------------------------------------
  // Glossari: la pagina «Glossario» (glossario.html, pulsante in testata)
  // li mostra uno dopo l'altro, in questo ordine, con le voci in ordine
  // alfabetico, la ricerca e i rimandi tra le voci.
  // - file: il sorgente LaTeX nella repo, oppure un elenco di sorgenti che
  //   formano lo stesso glossario (es. ["docs/tex/rtb/A.tex", "docs/tex/rtb/B.tex"]).
  //   Le voci si scrivono come nel modello del glossario:
  //   \VoceGlossario{id}{termine}{definizione}; il resto del file si ignora.
  //   Con file: null il glossario non compare.
  // - pdf: la versione da stampare, se c'è (facoltativo).
  // - id: minuscole e trattini, usato negli indirizzi della pagina.
  // Una voce si apre con glossario.html#gls-<id>, come l'ancora gls-<id> del PDF.
  // ---------------------------------------------------------------------
  glossari: [
    { id: "progetto", titolo: "Glossario di progetto",
      descrizione: "I termini usati in tutti i documenti del progetto: processi, ruoli, strumenti e capitolato.",
      file: "assets/latex_templates/Glossario.tex", pdf: null },
    { id: "c6", titolo: "Glossario del capitolato C6",
      descrizione: "I termini del capitolato C6 usati nell'Analisi dei Requisiti, nella progettazione e nei casi d'uso.",
      file: null, pdf: null },
  ],

  // ---------------------------------------------------------------------
  // Ripiego: la repo resta la fonte. La versione dei documenti si legge dal
  // nome del file (_v1.2.0); se manca, vale quella scritta qui
  // ---------------------------------------------------------------------
  documenti: [
    { consegna: "candidatura", nome: "Lettera di presentazione", versione: "finale",
      file: "docs/candidatura/Lettera_Presentazione_BitCrusher.pdf" },
    { consegna: "candidatura", nome: "Valutazione dei capitolati", versione: "1.1.0",
      file: "docs/candidatura/Valutazione_Capitolati_BitCrusher.pdf" },
    { consegna: "candidatura", nome: "Dichiarazione degli impegni", versione: "1.2.0",
      file: "docs/candidatura/Dichiarazione_Impegni_BitCrusher.pdf" },
  ],

  // tipo: "interno" | "esterno"
  verbali: [
    { tipo: "interno", data: "2026-10-17", titolo: "Primo incontro conoscitivo", versione: "1.0.2",
      file: "docs/verbali/verbali_interni/Verbale_interno_01.pdf" },
    { tipo: "interno", data: "2026-10-21", titolo: "Organizzazione repo, stesura domande ed invio mail ai proponenti", versione: "1.0.0",
      file: "docs/verbali/verbali_interni/Verbale_interno_02.pdf" },
    { tipo: "interno", data: "2026-10-24", titolo: "Formazione del primo diario di bordo ed il relativo template", versione: "1.0.0",
      file: "docs/verbali/verbali_interni/Verbale_interno_03.pdf" },
    { tipo: "esterno", data: "2026-10-26", titolo: "Confronto su dubbi e domande con l'azienda proponente", con: "Var Group", versione: "1.0.1",
      file: "docs/verbali/verbali_esterni/Verbale_esterno_01_firmato.pdf" },
    { tipo: "interno", data: "2026-10-28", titolo: "Redazione bozza dei documenti di candidatura", versione: "1.0.0",
      file: "docs/verbali/verbali_interni/Verbale_interno_04.pdf" },
    { tipo: "interno", data: "2026-10-29", titolo: "Revisione documenti per candidatura ed elezione responsabile", versione: "1.0.0",
      file: "docs/verbali/verbali_interni/Verbale_interno_05.pdf" },
    { tipo: "interno", data: "2026-11-03", titolo: "Ristesura dei documenti per la candidatura", versione: "1.0.0",
      file: "docs/verbali/verbali_interni/Verbale_interno_06.pdf" },
    { tipo: "interno", data: "2026-11-07", titolo: "Decisioni su organizzazione interna", versione: "1.0.0",
      file: "docs/verbali/verbali_interni/Verbale_interno_07.pdf" },
    { tipo: "interno", data: "2026-11-12", titolo: "Discussione sull'uso e funzionamento di OpenProject", versione: "1.0.0",
      file: "docs/verbali/verbali_interni/Verbale_interno_08.pdf" },
    { tipo: "interno", data: "2026-11-16", titolo: "Mosaico e pianificazione sprint", versione: "1.0.0",
      file: "docs/verbali/verbali_interni/Verbale_interno_09.pdf" },
    { id: "I01", tipo: "interno", data: "2026-10-17", titolo: "Primo incontro conoscitivo",
      versione: "v1.0.0", redattore: "Riccardo Pozzato",
      verificatore: "-",
      file: "docs/compiled/verbali/verbali_interni/Verbale_interno_01.pdf" },
    { id: "I02", tipo: "interno", data: "2026-10-21", titolo: "Organizzazione repo, stesura domande ed invio mail ai proponenti",
      versione: "v1.0.0", redattore: "Riccardo Pozzato",
      verificatore: "-",
      file: "docs/compiled/verbali/verbali_interni/Verbale_interno_02.pdf" },
    { id: "I03", tipo: "interno", data: "2026-10-24", titolo: "Formazione del primo diario di bordo ed il relativo template",
      versione: "v1.0.0", redattore: "Riccardo Pozzato",
      verificatore: "-",
      file: "docs/compiled/verbali/verbali_interni/Verbale_interno_03.pdf" },
    { id: "I04", tipo: "interno", data: "2026-10-28", titolo: "Redazione bozza dei documenti di candidatura",
      versione: "v1.0.0", redattore: "Pietro Acampora",
      verificatore: "-",
      file: "docs/compiled/verbali/verbali_interni/Verbale_interno_04.pdf" },
    { id: "I05", tipo: "interno", data: "2026-10-29", titolo: "Revisione documenti per candidatura ed elezione responsabile",
      versione: "v1.0.0", redattore: "Pietro Acampora",
      verificatore: "-",
      file: "docs/compiled/verbali/verbali_interni/Verbale_interno_05.pdf" },
    { id: "I06", tipo: "interno", data: "2026-11-03", titolo: "Ristesura dei documenti per la candidatura",
      versione: "v1.0.0", redattore: "Erik Giuliano",
      verificatore: "-",
      file: "docs/compiled/verbali/verbali_interni/Verbale_interno_06.pdf" },
    { id: "I07", tipo: "interno", data: "2026-11-07", titolo: "Decisioni su organizzazione interna",
      versione: "v0.1.1", redattore: "Pietro Leonardo Acampora",
      verificatore: "-",
      file: "docs/compiled/verbali/verbali_interni/Verbale_interno_07.pdf" },
    { id: "I08", tipo: "interno", data: "2026-11-12", titolo: "Discussione sull'uso e funzionamento di OpenProject",
      versione: "v1.0.0", redattore: "Marco Bollettin",
      verificatore: "-",
      file: "docs/compiled/verbali/verbali_interni/Verbale_interno_08.pdf" },
    { id: "I09", tipo: "interno", data: "2026-11-16", titolo: "Mosaico e pianificazione sprint",
      versione: "v1.0.0", redattore: "Riccardo Pozzato",
      verificatore: "-",
      file: "docs/compiled/verbali/verbali_interni/Verbale_interno_09.pdf" }
  ],

  // Diari di bordo: il numero si legge dal nome del file. La data è quella
  // della presentazione (è scritta sulla prima slide): compare sulla pagina
  // e mette il diario nella consegna giusta. Un diario nuovo va aggiunto qui
  // con la sua data; finché manca, sta nella consegna in corso senza data
  diari: [
    { numero: 1, data: "2026-10-26", file: "docs/pptx/diari_di_bordo/Diario_di_Bordo_01.pptx" },
    { numero: 2, data: "2026-11-02", file: "docs/pptx/diari_di_bordo/Diario_di_Bordo_02.pptx" },
    { numero: 3, data: "2026-11-09", file: "docs/pptx/diari_di_bordo/Diario_di_Bordo_03.pptx" },
    { numero: 4, data: "2026-11-16", file: "docs/pptx/diari_di_bordo/Diario_di_Bordo_04.pptx" },
    { numero: 5, data: "2026-11-21", file: "docs/pptx/diari_di_bordo/Diario_di_Bordo_05.pptx" },
  ],

  componenti: [
    "Alex Singh",
    "Pietro Leonardo Acampora",
    "Marco Bollettin",
    "Erik Giuliano",
    "Alexandru Mitu",
    "Riccardo Pozzato",
    "Antonio Tufano",
  ],
};
