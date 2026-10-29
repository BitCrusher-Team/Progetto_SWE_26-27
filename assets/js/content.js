/* =====================================================================
   CONTENUTI DEL SITO // Bit Crusher // Progetto SWE 26-27
   ---------------------------------------------------------------------
   Per aggiornare il sito di solito basta modificare questo file.

   Convenzioni:
   - Un valore `null` compare sul sito come segnaposto "DA DEFINIRE",
     così si vede subito cosa manca.
   - I percorsi dei file ("docs/...", "assets/...") sono relativi alla
     root della repo di progetto e vengono aperti su GitHub.
   - Le date usano il formato AAAA-MM-GG.
   ===================================================================== */
window.BC_CONTENT = {
  repo: {
    owner: "BitCrusher-Team",
    name: "Progetto_SWE_26-27",
    branch: "main",
    // GitHub Project collegato ai template delle issue (visibile al team)
    board: "https://github.com/orgs/BitCrusher-Team/projects/4",
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

  panoramica: {
    descrizione: null,            // panoramica ad alto livello del prodotto
    durataSprintSettimane: null,  // durata dei cicli di sviluppo agile
  },

  // Revisioni di avanzamento: adattare all'edizione del corso.
  // stato: "completata" | "in-corso" | "attesa"
  // avanzamento: 0-100, usato solo per "in-corso" (null = non quantificato).
  // Sul sito ogni milestone è un feed disturbato che si stabilizza.
  milestone: [
    { sigla: "CND", nome: "Candidatura", data: null, stato: "in-corso", avanzamento: null },
    { sigla: "RTB", nome: "Requirements and Technology Baseline", data: null, stato: "attesa", avanzamento: null },
    { sigla: "PB", nome: "Product Baseline", data: null, stato: "attesa", avanzamento: null },
    { sigla: "CA", nome: "Customer Acceptance", data: null, stato: "attesa", avanzamento: null },
  ],

  capitolati: [
    { id: "C0", nome: "AIRA", descrizione: "AI Requests Automation",
      proponente: "Sanmarco Informatica S.p.A.",
      capitolato: "docs/capitolati/C0/C0-AIRA.pdf", presentazione: "docs/capitolati/C0/C0p.pdf" },
    { id: "C1", nome: "AURA", descrizione: "AI for Understanding, Reasoning and Automation",
      proponente: "Vimar S.p.A.",
      capitolato: "docs/capitolati/C1/C1-AURA.pdf", presentazione: "docs/capitolati/C1/C1p.pdf" },
    { id: "C2", nome: "Concierge", descrizione: "Assistente conversazionale per la piattaforma NEXUM",
      proponente: "Eggon",
      capitolato: "docs/capitolati/C2/C2-Concierge.pdf", presentazione: "docs/capitolati/C2/C2p.pdf" },
    { id: "C3", nome: "Fossdot", descrizione: "Smart speaker open source, estensibile e rispettoso della privacy",
      proponente: "Uranion EMEA Ltd",
      capitolato: "docs/capitolati/C3/C3-Fossdot.pdf", presentazione: "docs/capitolati/C3/C3p.pdf" },
    { id: "C4", nome: "Gestione Veicoli", descrizione: "Piattaforma per la gestione dei veicoli e dei servizi post-vendita",
      proponente: "M31 S.r.l.",
      capitolato: "docs/capitolati/C4/C4-GVSPV.pdf", presentazione: "docs/capitolati/C4/C4p.pdf" },
    { id: "C5", nome: "RareCare", descrizione: "Piattaforma AI per la raccolta dati e il supporto decisionale nelle malattie rare",
      proponente: "Miriade S.r.l.",
      capitolato: "docs/capitolati/C5/C5-RareCare.pdf", presentazione: "docs/capitolati/C5/C5p.pdf" },
    { id: "C6", nome: "Caching Semantico", descrizione: "Sistema AI di caching semantico e dashboard FinOps, estendendo LiteLLM",
      proponente: "Var Group S.p.A.",
      capitolato: "docs/capitolati/C6/C6-SCSDF.pdf", presentazione: "docs/capitolati/C6/C6p.pdf" },
    { id: "C7", nome: "SmartDashboard", descrizione: "Piattaforma di Business Intelligence self-service potenziata da AI",
      proponente: "Ergon Informatica S.r.l.",
      capitolato: "docs/capitolati/C7/C7-SD.pdf", presentazione: "docs/capitolati/C7/C7p.pdf" },
    { id: "C8", nome: "Sonar", descrizione: "Documentazione vivente di uno store Shopify",
      proponente: "Halue S.r.l. Società Benefit",
      capitolato: "docs/capitolati/C8/C8-Sonar.pdf", presentazione: "docs/capitolati/C8/C8p.pdf" },
    { id: "C9", nome: "SpecCheck", descrizione: "Skills OpenCode per la tracciabilità tra casi d'uso, requisiti e codice sorgente",
      proponente: "Zucchetti S.p.A.",
      capitolato: "docs/capitolati/C9/C9-SpecCheck.pdf", presentazione: "docs/capitolati/C9/C9p.pdf" },
  ],

  // Ordine di preferenza dei capitolati (il primo è la priorità 1)
  priorita: [
    { capitolato: "C6", motivazione: null },
    { capitolato: "C3", motivazione: null },
    { capitolato: "C1", motivazione: null },
  ],

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
  ],

  // Di solito arriva dal README (sezione "Diario di Bordo"); questo è il ripiego
  diario: {
    file: null,                   // percorso nella repo, quando il file c'è
    atteso: "diario_di_bordo.pptx",
    aggiornato: null,             // data dell'ultimo intervento
    stato: "In preparazione",
  },

  // Documenti di progetto. stato: null | "bozza" | "in verifica" | "approvato"
  documenti: [
    { nome: "Lettera di presentazione", versione: null, stato: null, file: null },
    { nome: "Valutazione dei capitolati", versione: null, stato: null, file: null },
    { nome: "Dichiarazione degli impegni", versione: null, stato: null, file: null },
    { nome: "Norme di Progetto", versione: null, stato: null, file: null },
    { nome: "Piano di Progetto", versione: null, stato: null, file: null },
    { nome: "Piano di Qualifica", versione: null, stato: null, file: null },
    { nome: "Analisi dei Requisiti", versione: null, stato: null, file: null },
    { nome: "Glossario", versione: null, stato: null, file: null },
  ],

  template: [
    { nome: "Verbale interno (LaTeX)", file: "assets/latex_templates/TemplateVerbaleRiunioni/TemplateVerbaleInterno.tex" },
  ],

  // Template delle issue in .github/ISSUE_TEMPLATE/
  issueTemplate: [
    { nome: "Verbale riunione", file: "template_verbale.yml" },
    { nome: "Diario di bordo", file: "template_diario_di_bordo.yml" },
    { nome: "Attività", file: "template_attivita_generica.yml" },
    { nome: "Segnalazione", file: "template_segnalazione.yml" },
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

  ruoli: ["Responsabile", "Amministratore", "Analista", "Progettista", "Programmatore", "Verificatore"],

  processo: {
    // Tipi ammessi dalla CI (.github/workflows/ci.yml): tenere allineati
    tipiCommit: [
      { tipo: "feat", desc: "nuova funzionalità o contenuto" },
      { tipo: "fix", desc: "correzione di un errore" },
      { tipo: "docs", desc: "documentazione" },
      { tipo: "style", desc: "formattazione, senza cambi di significato" },
      { tipo: "refactor", desc: "ristrutturazione senza cambi di comportamento" },
      { tipo: "perf", desc: "prestazioni" },
      { tipo: "test", desc: "aggiunta o modifica di test" },
      { tipo: "build", desc: "build e dipendenze" },
      { tipo: "ci", desc: "pipeline di integrazione continua" },
      { tipo: "chore", desc: "manutenzione e attività di supporto" },
      { tipo: "revert", desc: "annulla un commit precedente" },
    ],
    // Regole della CI sul titolo delle PR. Il sito le legge da .github/workflows/ci.yml
    // e .spr.yml della repo; queste valgono solo se la repo non risponde.
    // Con spr non c'è limite di lunghezza: dopo `git spr merge` GitHub tronca il
    // titolo oltre 72 caratteri ("…") e la CI valida quello completo.
    ci: { lunghezzaMax: null, troncamentoSpr: true, merge: "squash" },
    // Configurazione di spr (.spr.yml); il metodo di merge sta in `ci.merge`
    spr: [
      { chiave: "Check obbligatori", valore: "sì" },
      { chiave: "Approvazione obbligatoria", valore: "sì" },
      { chiave: "Push dei branch", valore: "uno per volta" },
      { chiave: "Branch dopo il merge", valore: "eliminati" },
    ],
    flusso: [
      { cmd: "git config --local include.path ../.gitconfig", desc: "Attiva gli alias condivisi del team. Una volta per clone." },
      { cmd: "git newstack <nome>", desc: "Crea stack/<nome> da origin/main appena aggiornato. Mai commit sul main locale." },
      { cmd: "git commit", desc: "Un commit per PR: il subject del commit diventa il titolo della PR, validato dalla CI." },
      { cmd: "git spr update", desc: "Pubblica lo stack: una pull request impilata per ogni commit." },
      { cmd: "git spr merge", desc: "Con CI verde e approvazione, unisce lo stack su main ({merge})." },
      { cmd: "git delstack <nome>", desc: "Riallinea main a origin/main ed elimina lo stack. Con -f anche se abbandonato." },
    ],
    codeowners: [
      { path: "*", owners: ["ZiraelOneTwo", "Ahwrs", "rpozzato"], nota: "Ogni PR richiede almeno una review dall'insieme delegato" },
      { path: "docs/verbali/", owners: ["rpozzato", "Ahwrs", "antotuf06"], nota: "I ruoli non fissi sono modificabili con permesso esplicito" },
      { path: ".github/", owners: ["ZiraelOneTwo"], nota: "La CI e i CODEOWNERS richiedono permesso esplicito" },
    ],
    definitionOfDone: [
      "Commit con «Closes #<numero issue>» nel messaggio",
      "Verificato da un membro diverso dall'autore (PR approvata)",
      "Registro delle modifiche del documento aggiornato",
      "Nuovi termini aggiunti al Glossario",
    ],
  },

  strumenti: [
    { nome: "GitHub Actions", uso: "CI: validazione dei titoli delle PR" },
    { nome: "GitHub Projects", uso: "Board delle attività e degli sprint" },
    { nome: "spr", uso: "Pull request impilate (stacked PR)" },
    { nome: "LaTeX", uso: "Verbali e documentazione" },
    { nome: "Docker", uso: null },
  ],

  // cmd: null finché il comando non è definito
  setup: [
    { titolo: "Clona il repository", cmd: "git clone https://github.com/BitCrusher-Team/Progetto_SWE_26-27.git" },
    { titolo: "Attiva gli alias del team", cmd: "git config --local include.path ../.gitconfig" },
    { titolo: "Riproduci l'ambiente ed installa le dipendenze", cmd: null },
    { titolo: "Esegui i test", cmd: null },
    { titolo: "Lancia l'applicativo", cmd: null },
  ],

  riferimenti: [
    { titolo: null, url: null, nota: "Risorse esterne e riferimenti tecnici" },
    { titolo: null, url: null, nota: "Conformità a standard e normative nazionali ed europee" },
  ],
};
