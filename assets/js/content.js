/* =====================================================================
   CONTENUTI DEL SITO // Bit Crusher // Progetto SWE 26-27
   ---------------------------------------------------------------------
   Il sito legge i dati dalla repo di progetto (repo.js): README,
   milestone, cartelle docs/, configurazioni. Questo file è il ripiego
   se la repo non risponde, e contiene ciò che la repo non dice.

   Convenzioni:
   - Un valore `null` compare sul sito come segnaposto "DA DEFINIRE",
     così si vede subito cosa manca.
   - I percorsi dei file ("docs/...", "assets/...") sono relativi alla
     root della repo di progetto e si aprono sempre in una nuova scheda.
   - Le date usano il formato AAAA-MM-GG.
   ===================================================================== */
window.BC_CONTENT = {
  repo: {
    owner: "BitCrusher-Team",
    name: "Progetto_SWE_26-27",
    branch: "main",
    // GitHub Project collegato ai template delle issue (visibile al team)
    board: "https://github.com/orgs/BitCrusher-Team/projects/4",
    // Il sito è pubblicato dalla stessa repo: i documenti si aprono da qui, nel
    // visualizzatore del browser (null = pagina del file su GitHub)
    pages: "https://bitcrusher-team.github.io/Progetto_SWE_26-27/",
  },

  progetto: {
    gruppo: "Bit Crusher",
    titolo: "Progetto di Ingegneria del Software",
    universita: "Università degli Studi di Padova",
    corso: "Informatica (cod. SC1167)",
    annoAccademico: "2026/2027",
    relatore: "Prof. Tullio Vardanega",
    email: "bitcrusherteam@gmail.com",
    fase: "Candidatura",          // fase corrente, mostrata in apertura
    capitolatoAggiudicato: null,  // es. "C6", quando arriva l'aggiudicazione
    proponente: null,             // azienda del capitolato aggiudicato
    nota: "Specifiche tecniche riguardo il progetto scelto non sono disponibili per completo. Attualmente il repo agisce come wrapper generico a scopo organizzativo per il team.",
  },

  // Revisioni di avanzamento, in ordine di calendario: adattare all'edizione del corso.
  // stato: "completata" | "in-corso" | "attesa"
  // avanzamento: 0-100, usato solo per "in-corso" (null = non quantificato).
  // Le milestone della repo le aggiornano: una milestone vale per la revisione se
  // il titolo ne contiene la sigla, il nome o un alias.
  milestone: [
    { sigla: "CND", nome: "Candidatura", alias: ["aggiudicazione"], data: null, stato: "in-corso", avanzamento: null },
    { sigla: "RTB", nome: "Requirements and Technology Baseline", data: null, stato: "attesa", avanzamento: null },
    { sigla: "PB", nome: "Product Baseline", data: null, stato: "attesa", avanzamento: null },
    { sigla: "CA", nome: "Customer Acceptance", data: null, stato: "attesa", avanzamento: null },
  ],

  // Capitolati del bando: servono al capitolato aggiudicato in home e al comando
  // «capitolati» del terminale (i PDF stanno in docs/capitolati/ della repo)
  capitolati: [
    { id: "C0", nome: "AIRA", proponente: "Sanmarco Informatica S.p.A." },
    { id: "C1", nome: "AURA", proponente: "Vimar S.p.A." },
    { id: "C2", nome: "Concierge", proponente: "Eggon" },
    { id: "C3", nome: "Fossdot", proponente: "Uranion EMEA Ltd" },
    { id: "C4", nome: "Gestione Veicoli", proponente: "M31 S.r.l." },
    { id: "C5", nome: "RareCare", proponente: "Miriade S.r.l." },
    { id: "C6", nome: "Caching Semantico", proponente: "Var Group S.p.A." },
    { id: "C7", nome: "SmartDashboard", proponente: "Ergon Informatica S.r.l." },
    { id: "C8", nome: "Sonar", proponente: "Halue S.r.l. Società Benefit" },
    { id: "C9", nome: "SpecCheck", proponente: "Zucchetti S.p.A." },
  ],

  // Ordine di preferenza dei capitolati (il primo è la priorità 1)
  priorita: [{ capitolato: "C6" }, { capitolato: "C3" }, { capitolato: "C1" }],

  // tipo: "interno" | "esterno". Redattore e verificatore della prima stesura.
  verbali: [
    { id: "I01", tipo: "interno", data: "2026-10-17", titolo: "Primo incontro conoscitivo",
      versione: "1.0.2", redattore: "Riccardo Pozzato", verificatore: "Antonio Tufano",
      file: "docs/verbali/verbali_interni/Verbale_interno_01.pdf" },
    { id: "I02", tipo: "interno", data: "2026-10-21", titolo: "Organizzazione repo, stesura domande ed invio mail ai proponenti",
      versione: "1.0.0", redattore: "Antonio Tufano", verificatore: "Riccardo Pozzato",
      file: "docs/verbali/verbali_interni/Verbale_interno_02.pdf" },
    { id: "I03", tipo: "interno", data: "2026-10-24", titolo: "Formazione del primo diario di bordo ed il relativo template",
      versione: "1.0.0", redattore: "Pietro Leonardo Acampora", verificatore: "Marco Bollettin, Antonio Tufano",
      file: "docs/verbali/verbali_interni/Verbale_interno_03.pdf" },
    { id: "E01", tipo: "esterno", data: "2026-10-26", titolo: "Confronto su dubbi e domande con l'azienda proponente",
      con: "Var Group", firmato: true,
      versione: "1.0.1", redattore: "Marco Bollettin", verificatore: "Alex Singh",
      file: "docs/verbali/verbali_esterni/Verbale_esterno_01_firmato.pdf" },
    { id: "I04", tipo: "interno", data: "2026-10-28", titolo: "Redazione bozza dei documenti di candidatura",
      versione: "1.0.0", redattore: "Pietro Leonardo Acampora", verificatore: "Erik Giuliano",
      file: "docs/verbali/verbali_interni/Verbale_interno_04.pdf" },
    { id: "I05", tipo: "interno", data: "2026-10-29", titolo: "Revisione documenti per candidatura ed elezione responsabile",
      file: "docs/verbali/verbali_interni/verbale_interno_05.pdf" },
  ],

  // Diario di bordo: gli interventi stanno in docs/diario_di_bordo/ (il sito li
  // legge dalla repo, dal più recente); il template è indicato nel README
  diario: {
    voci: [
      { nome: "Diario di bordo 01", file: "docs/diario_di_bordo/Diario_di_Bordo_01.pptx" },
    ],
    template: "assets/pptx_templates/Meeting_Bit_Crusher.pptx",
  },

  // Nomi ufficiali dei documenti di progetto (il sito li legge dal menu
  // "Documento" del template Attività): servono a riconoscere i file
  documenti: [
    { nome: "Lettera di presentazione" },
    { nome: "Valutazione dei capitolati" },
    { nome: "Dichiarazione degli impegni" },
    { nome: "Norme di Progetto" },
    { nome: "Piano di Progetto" },
    { nome: "Piano di Qualifica" },
    { nome: "Analisi dei Requisiti" },
    { nome: "Glossario" },
  ],

  // Documenti consegnati a ogni revisione (sigla di `milestone`). Il sito li legge
  // dalle cartelle docs/<revisione>/ della repo (es. docs/candidatura/,
  // docs/rtb/), con le sottocartelle come categorie; questo è il ripiego.
  // stato: null | "bozza" | "in verifica" | "approvato"
  consegne: [
    { revisione: "CND", nome: "Lettera di presentazione", versione: "1.0.0", stato: "approvato",
      file: "docs/candidatura/Lettera_Di_Presentazione_BitCrusher.pdf" },
    { revisione: "CND", nome: "Valutazione dei capitolati", versione: "1.0.0", stato: "approvato",
      file: "docs/candidatura/Valutazione_Capitolati_BitCrusher.pdf" },
    { revisione: "CND", nome: "Dichiarazione degli impegni", versione: "1.0.0", stato: "approvato",
      file: "docs/candidatura/Dichiarazione_Impegni_BitCrusher.pdf" },
  ],

  // ruolo: ruolo del periodo corrente (i ruoli sono a rotazione), null se non assegnato
  team: [
    { nome: "Alex Singh", matricola: "2148621", github: "ZiraelOneTwo", ruolo: null },
    { nome: "Pietro Leonardo Acampora", matricola: "2146762", github: "hipietro", ruolo: null },
    { nome: "Marco Bollettin", matricola: "2147955", github: "Ahwrs", ruolo: null },
    { nome: "Erik Giuliano", matricola: "2138012", github: "FlameStorm199", ruolo: null },
    { nome: "Alexandru Mitu", matricola: "2101083", github: "aycollapse", ruolo: null },
    { nome: "Riccardo Pozzato", matricola: "2147988", github: "rpozzato", ruolo: null },
    { nome: "Antonio Tufano", matricola: "2137972", github: "antotuf06", ruolo: null },
  ],
};
