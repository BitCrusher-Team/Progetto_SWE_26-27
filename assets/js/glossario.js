/* =====================================================================
   BIT CRUSHER // glossario.js
   La pagina del Glossario (glossario.html), semplice come il resto:
   - i glossari scelti in content.js («glossari»), letti dalla repo: le
     voci sono quelle scritte con \VoceGlossario{id}{termine}{definizione},
     in ordine alfabetico e divise per lettera;
   - una casella di ricerca che resta in cima mentre si scorre, le lettere
     per saltare, i rimandi tra le voci (\RifGlossario) come collegamenti
     nella pagina;
   - glossario.html#gls-<id> apre la pagina su quella voce, come l'ancora
     gls-<id> del PDF.
   Se la repo non risponde, una riga di avviso con "Riprova" e la versione
   PDF, se c'è.
   ===================================================================== */
(function () {
  'use strict';

  const BC = window.BC;
  const C = BC.content;
  const { h } = BC;
  const ATTESA_MS = 12000;

  /* =====================================================================
     Dal LaTeX alle voci. Si riconosce quel che serve a un glossario
     (corsivo, grassetto, rimandi, collegamenti, elenchi, formule semplici,
     accenti e simboli); il resto si mostra come testo semplice.
     ===================================================================== */

  // il sorgente senza commenti: da % (non \%) a fine riga, a capo compreso
  function senzaCommenti(s) {
    let out = '';
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (c === '\\') {
        out += s.slice(i, i + 2);
        i++;
      } else if (c === '%') {
        const fine = s.indexOf('\n', i);
        if (fine < 0) break;
        i = fine;
        while (s[i + 1] === ' ' || s[i + 1] === '\t') i++;
      } else out += c;
    }
    return out;
  }

  // gruppo {…} che si apre in s[i]: [contenuto, posizione dopo la graffa chiusa]
  function gruppo(s, i) {
    for (let j = i, livello = 0; j < s.length; j++) {
      if (s[j] === '\\') j++;
      else if (s[j] === '{') livello++;
      else if (s[j] === '}' && --livello === 0) return [s.slice(i + 1, j), j + 1];
    }
    return [s.slice(i + 1), s.length];
  }

  // fino a n argomenti {…} da s[i], saltando le opzioni […] (e gli spazi,
  // se spazi è vero): [argomenti, posizione dopo l'ultimo]
  function argomenti(s, i, n, spazi = true) {
    const args = [];
    while (args.length < n) {
      let j = i;
      if (spazi) while (j < s.length && /\s/.test(s[j])) j++;
      if (s[j] === '[') {
        const k = s.indexOf(']', j);
        if (k < 0) break;
        i = k + 1;
      } else if (s[j] === '{') {
        const [arg, dopo] = gruppo(s, j);
        args.push(arg);
        i = dopo;
      } else break;
    }
    return [args, i];
  }

  // macro senza argomenti definite nel sorgente (\newcommand{\Nome}{testo}):
  // nelle voci si mostrano col loro testo
  function macroDi(s) {
    const out = new Map();
    const re = /\\(?:(?:re|provide)?newcommand\*?\s*\{?\s*\\([A-Za-z@]+)\s*\}?|def\s*\\([A-Za-z@]+))/g;
    for (let m; (m = re.exec(s));) {
      let i = re.lastIndex;
      while (i < s.length && /\s/.test(s[i])) i++;
      if (s[i] !== '{') continue;                // con argomenti ([2]…): non serve
      const [corpo, dopo] = gruppo(s, i);
      out.set(m[1] || m[2], corpo);
      re.lastIndex = dopo;
    }
    return out;
  }

  const SEGNAPOSTO = /^\s*\[[^\]]*\]\s*$/;       // [Termine A] del modello

  // le voci \VoceGlossario{id}{termine}{definizione} del corpo del documento
  function vociDi(sorgente) {
    const s = senzaCommenti(sorgente);
    const inizio = s.indexOf('\\begin{document}');
    const corpo = inizio >= 0 ? s.slice(inizio) : s;
    const voci = [];
    const re = /\\VoceGlossario(?![A-Za-z@])/g;
    for (let m; (m = re.exec(corpo));) {
      const [args, dopo] = argomenti(corpo, re.lastIndex, 3);
      re.lastIndex = Math.max(dopo, re.lastIndex);
      if (args.length === 3 && args[1].trim() && !SEGNAPOSTO.test(args[1])) {
        voci.push({ id: args[0].trim(), nome: args[1], def: args[2] });
      }
    }
    return { voci, macro: macroDi(s) };
  }

  const COMANDO = /\\(?:([A-Za-z@]+)\*?|([^A-Za-z@]?))/y;
  // \% \& \_ … e gli spazi di LaTeX
  const SIMBOLI = {
    '%': '%', '&': '&', '_': '_', '#': '#', '$': '$', '{': '{', '}': '}', ' ': ' ', '\n': ' ', '\t': ' ',
    ',': ' ', ';': ' ', ':': ' ', '!': '', '-': '', '/': '', '@': '', '': '',
  };
  // accenti: \'e \`a \"o \^i \~n \c{c} \v{s}…
  const ACCENTI = {
    "'": '́', '`': '̀', '"': '̈', '^': '̂', '~': '̃', '=': '̄', '.': '̇',
    u: '̆', v: '̌', H: '̋', c: '̧', k: '̨', r: '̊', d: '̣', b: '̱',
  };
  // comandi senza argomenti che valgono un carattere o una parola
  const PAROLE = {
    ldots: '…', dots: '…', textellipsis: '…', LaTeX: 'LaTeX', LaTeXe: 'LaTeX2ε', TeX: 'TeX',
    euro: '€', EUR: '€', texteuro: '€', textdegree: '°', S: '§', P: '¶', copyright: '©',
    textcopyright: '©', textregistered: '®', texttrademark: '™', textbullet: '•',
    textquotedblleft: '“', textquotedblright: '”', textquoteleft: '‘', textquoteright: '’',
    guillemotleft: '«', guillemotright: '»', og: '«', fg: '»', textless: '<', textgreater: '>',
    textbackslash: '\\', textasciitilde: '~', textasciicircum: '^', textbar: '|', slash: '/',
    textendash: '–', textemdash: '—', quad: ' ', qquad: ' ', enspace: ' ', space: ' ',
    thinspace: ' ', nobreakspace: ' ', i: 'ı', j: 'ȷ', ss: 'ß', ae: 'æ', AE: 'Æ',
    oe: 'œ', OE: 'Œ', o: 'ø', O: 'Ø', aa: 'å', AA: 'Å', l: 'ł', L: 'Ł', today: '',
  };
  // comandi che non si mostrano, con il numero dei loro argomenti
  const SCARTA = {
    label: 1, index: 1, glossary: 1, vspace: 1, hspace: 1, addvspace: 1, ref: 1, pageref: 1, eqref: 1,
    autoref: 1, cite: 1, nocite: 1, includegraphics: 1, addcontentsline: 3, setlength: 2, color: 1,
    hypersetup: 1, selectlanguage: 1, hypertarget: 1, phantomsection: 0, newpage: 0, clearpage: 0,
    pagebreak: 0, nopagebreak: 0, noindent: 0, indent: 0, centering: 0, raggedright: 0, raggedleft: 0,
    hfill: 0, vfill: 0, smallskip: 0, medskip: 0, bigskip: 0, hline: 0, toprule: 0, midrule: 0,
    bottomrule: 0, normalsize: 0, small: 0, footnotesize: 0, scriptsize: 0, tiny: 0, large: 0, Large: 0,
    LARGE: 0, huge: 0, Huge: 0, normalfont: 0, itshape: 0, bfseries: 0, ttfamily: 0, rmfamily: 0,
    sffamily: 0, upshape: 0, mdseries: 0, relax: 0, protect: 0, xspace: 0,
  };
  const STILI = {
    textit: 'em', emph: 'em', textsl: 'em', textbf: 'strong', texttt: 'code',
    textsuperscript: 'sup', textsubscript: 'sub',
  };
  // vecchio stile: {\em …}, {\bf …}
  const INTERRUTTORI = {
    em: 'em', it: 'em', itshape: 'em', sl: 'em', slshape: 'em', bf: 'strong', bfseries: 'strong',
    tt: 'code', ttfamily: 'code',
  };
  // rimandi a un'altra voce: [quanti argomenti, quale è l'id, quale il testo]
  const RIMANDI = {
    RifGlossario: [2, 0, 1], RifGlossarioEsterno: [3, 1, 2], RifGlossarioWeb: [3, 1, 2], hyperlink: [2, 0, 1],
  };
  const ELENCHI = { itemize: 'ul', enumerate: 'ol', description: 'ul' };
  // ambienti con argomenti da saltare prima del contenuto
  const ARG_AMBIENTI = {
    tabular: 1, 'tabular*': 2, tabularx: 2, tabulary: 2, longtable: 1, array: 1, minipage: 1, multicols: 1,
  };
  const MATEMATICA = /^(equation|align|gather|multline|displaymath|math|eqnarray)\*?$/;
  const BLOCCHI = new Set(['UL', 'OL', 'PRE', 'DIV']);
  const SIMBOLI_MAT = {
    cdot: '·', times: '×', div: '÷', pm: '±', mp: '∓', leq: '≤', le: '≤', geq: '≥', ge: '≥', neq: '≠',
    ne: '≠', approx: '≈', sim: '∼', simeq: '≃', equiv: '≡', propto: '∝', infty: '∞', to: '→',
    rightarrow: '→', leftarrow: '←', Rightarrow: '⇒', Leftarrow: '⇐', leftrightarrow: '↔',
    Leftrightarrow: '⇔', mapsto: '↦', in: '∈', notin: '∉', subset: '⊂', subseteq: '⊆', supset: '⊃',
    cup: '∪', cap: '∩', emptyset: '∅', forall: '∀', exists: '∃', neg: '¬', land: '∧', wedge: '∧',
    lor: '∨', vee: '∨', sum: '∑', prod: '∏', int: '∫', partial: '∂', nabla: '∇', sqrt: '√', ldots: '…',
    cdots: '⋯', dots: '…', prime: '′', circ: '∘', alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ',
    epsilon: 'ε', varepsilon: 'ε', zeta: 'ζ', eta: 'η', theta: 'θ', kappa: 'κ', lambda: 'λ', mu: 'μ',
    nu: 'ν', xi: 'ξ', pi: 'π', rho: 'ρ', sigma: 'σ', tau: 'τ', phi: 'φ', varphi: 'φ', chi: 'χ', psi: 'ψ',
    omega: 'ω', Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ', Pi: 'Π', Sigma: 'Σ', Phi: 'Φ',
    Psi: 'Ψ', Omega: 'Ω', lbrace: '{', rbrace: '}', langle: '⟨', rangle: '⟩', vert: '|', mid: '|',
    quad: ' ', qquad: ' ', left: '', right: '', log: 'log', ln: 'ln', exp: 'exp', sin: 'sin',
    cos: 'cos', tan: 'tan', max: 'max', min: 'min', lim: 'lim', arg: 'arg', det: 'det', sup: 'sup', inf: 'inf',
  };

  // lettera con accento: \'e, \'{e}, \c{c}, \'\i
  function accentato(s, i, segno) {
    while (s[i] === ' ') i++;
    let base;
    let dopo;
    if (s[i] === '{') {
      [base, dopo] = gruppo(s, i);
    } else if (s[i] === '\\' && /[ij]/.test(s[i + 1] || '') && !/[A-Za-z]/.test(s[i + 2] || '')) {
      base = s[i + 1];
      dopo = i + 2;
    } else {
      base = s[i] || '';
      dopo = i + 1;
    }
    base = base.trim().replace(/^\\([ij])(?![A-Za-z])\s*/, '$1');
    return [(base.charAt(0) + segno + base.slice(1)).normalize('NFC'), dopo];
  }

  // collegamento a un indirizzo esterno (solo http, https e mailto)
  function esterno(url, figli) {
    const u = String(url || '').trim().replace(/\\([#%&_~])/g, '$1');
    if (/^https?:/i.test(u)) return h('a', { href: u, target: '_blank', rel: 'noopener' }, figli, BC.newTab());
    if (/^mailto:/i.test(u)) return h('a', { href: u }, figli);
    return figli;
  }

  // contenuto di un ambiente fino al suo \end, anche con ambienti uguali
  // dentro: [corpo, posizione dopo \end{…}]
  function ambiente(s, i, nome) {
    const esc = nome.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`\\\\(begin|end)\\s*\\{${esc}\\}`, 'g');
    re.lastIndex = i;
    let livello = 1;
    for (let m; (m = re.exec(s));) {
      if (m[1] === 'begin') livello++;
      else if (--livello === 0) return [s.slice(i, m.index), re.lastIndex];
    }
    return [s.slice(i), s.length];
  }

  // i pezzi di un elenco, uno per \item (non quelli degli elenchi interni)
  function elementi(corpo) {
    const parti = [];
    let graffe = 0;
    let annidati = 0;
    let da = -1;
    const re = /\\(?:item(?![A-Za-z@])|begin(?![A-Za-z@])|end(?![A-Za-z@]))|\\[\s\S]|[{}]/g;
    for (let m; (m = re.exec(corpo));) {
      const x = m[0];
      if (x === '{') graffe++;
      else if (x === '}') graffe--;
      else if (x === '\\begin') annidati++;
      else if (x === '\\end') annidati--;
      else if (x === '\\item' && graffe === 0 && annidati === 0) {
        if (da >= 0) parti.push(corpo.slice(da, m.index));
        da = re.lastIndex;
      }
    }
    if (da >= 0) parti.push(corpo.slice(da));
    return parti;
  }

  // posizione della ] che chiude la [ in s[0] (per \item[etichetta])
  function chiusaQuadra(s) {
    let graffe = 0;
    for (let j = 1; j < s.length; j++) {
      if (s[j] === '\\') j++;
      else if (s[j] === '{') graffe++;
      else if (s[j] === '}') graffe--;
      else if (s[j] === ']' && graffe === 0) return j;
    }
    return s.length;
  }

  // i paragrafi di una definizione: righe vuote e \par fuori da gruppi e ambienti
  function paragrafi(s) {
    const parti = [];
    let graffe = 0;
    let annidati = 0;
    let da = 0;
    const re = /\\(?:begin(?![A-Za-z@])|end(?![A-Za-z@])|par(?![A-Za-z@]))|\\[\s\S]|[{}]|\n[ \t]*\n\s*/g;
    for (let m; (m = re.exec(s));) {
      const x = m[0];
      if (x === '{') graffe++;
      else if (x === '}') graffe--;
      else if (x === '\\begin') annidati++;
      else if (x === '\\end') annidati--;
      else if ((x === '\\par' || x[0] === '\n') && graffe <= 0 && annidati <= 0) {
        parti.push(s.slice(da, m.index));
        da = re.lastIndex;
      }
    }
    parti.push(s.slice(da));
    return parti.filter((p) => p.trim());
  }

  // formula: solo testo, con segni, apici e pedici
  function matematica(s, ctx) {
    const out = [];
    let t = '';
    let i = 0;
    const nodo = (n) => {
      if (t) {
        out.push(t);
        t = '';
      }
      if (Array.isArray(n)) out.push(...n);
      else if (n) out.push(n);
    };
    // dopo ^ e _: un gruppo {…} o un solo segno
    const indice = () => {
      while (s[i] === ' ') i++;
      if (s[i] === '{') {
        const [g, dopo] = gruppo(s, i);
        i = dopo;
        return matematica(g, ctx);
      }
      if (s[i] === '\\') {
        COMANDO.lastIndex = i;
        const m = COMANDO.exec(s);
        i = COMANDO.lastIndex;
        return [m[1] ? SIMBOLI_MAT[m[1]] || '' : m[2] in SIMBOLI ? SIMBOLI[m[2]] : m[2]];
      }
      return [s[i++] || ''];
    };
    while (i < s.length) {
      const c = s[i];
      if (c === '\\') {
        COMANDO.lastIndex = i;
        const m = COMANDO.exec(s);
        i = COMANDO.lastIndex;
        const nome = m[1];
        if (nome == null) {
          t += m[2] in SIMBOLI ? SIMBOLI[m[2]] : m[2];
        } else if (/^(text\w*|math(rm|it|bf|sf|tt)|operatorname|mbox)$/.test(nome)) {
          const [a, dopo] = argomenti(s, i, 1);
          i = dopo;
          nodo(nodi(a[0] || '', ctx));
        } else if (/^[dt]?frac$/.test(nome)) {
          const [a, dopo] = argomenti(s, i, 2);
          i = dopo;
          nodo([...matematica(a[0] || '', ctx), '/', ...matematica(a[1] || '', ctx)]);
        } else if (nome in SIMBOLI_MAT) {
          t += SIMBOLI_MAT[nome];
        }
      } else if (c === '^' || c === '_') {
        i++;
        nodo(h(c === '^' ? 'sup' : 'sub', null, indice()));
      } else if (c === '{') {
        const [g, dopo] = gruppo(s, i);
        i = dopo;
        nodo(matematica(g, ctx));
      } else if (c === '}') {
        i++;
      } else if (c === '-') {
        t += '−';
        i++;
      } else if (/\s/.test(c)) {
        if ((t || out.length) && !t.endsWith(' ')) t += ' ';
        i++;
      } else {
        t += c;
        i++;
      }
    }
    nodo(null);
    return out;
  }

  // un ambiente: elenchi, formule, codice; degli altri resta il contenuto
  function blocco(nome, corpo, ctx, prof) {
    const sotto = (x) => nodi(x || '', ctx, prof + 1);
    const base = nome.replace(/\*$/, '');
    if (ELENCHI[base]) {
      return h(ELENCHI[base], null, elementi(corpo).map((parte) => {
        let resto = parte.replace(/^\s+/, '');
        let etichetta = null;
        if (resto[0] === '[') {
          const k = chiusaQuadra(resto);
          etichetta = resto.slice(1, k);
          resto = resto.slice(k + 1);
        }
        return h('li', null, etichetta != null ? [h('strong', null, sotto(etichetta)), ' '] : null, sotto(resto));
      }));
    }
    if (MATEMATICA.test(nome)) return h('div', { class: 'formula' }, matematica(corpo, ctx));
    if (/^(verbatim|Verbatim|lstlisting|minted)$/.test(base)) {
      return h('pre', null, h('code', null, corpo.replace(/^\s*\[[^\]]*\]/, '').replace(/^\s*\n/, '')));
    }
    if (/^(figure|table|tikzpicture|picture)$/.test(base)) return null;
    const salta = ARG_AMBIENTI[nome] || ARG_AMBIENTI[base] || 0;
    return sotto(salta ? corpo.slice(argomenti(corpo, 0, salta)[1]) : corpo);
  }

  // testo LaTeX -> nodi (stringhe ed elementi)
  function nodi(s, ctx, prof = 0) {
    if (prof > 12) return [s.replace(/\\[A-Za-z@]+|[{}]/g, '')];   // macro che si richiamano all'infinito
    const out = [];
    let t = '';
    let i = 0;
    const testo = (x) => { t += x; };
    const nodo = (n) => {
      if (t) {
        out.push(t.replace(/[ \t\r\n]+/g, ' '));
        t = '';
      }
      if (Array.isArray(n)) out.push(...n);
      else if (n != null && n !== '') out.push(n);
    };
    // dopo una parola di controllo LaTeX ignora gli spazi; \ldots{} li tiene
    const dopoParola = () => {
      if (s[i] === '{' && s[i + 1] === '}') i += 2;
      else while (i < s.length && /[ \t\r\n]/.test(s[i])) i++;
    };
    const sotto = (x) => nodi(x || '', ctx, prof + 1);

    while (i < s.length) {
      const c = s[i];
      if (c === '\\') {
        COMANDO.lastIndex = i;
        const m = COMANDO.exec(s);
        i = COMANDO.lastIndex;
        const nome = m[1];
        const simbolo = m[2];
        if (nome == null) {
          if (simbolo === '\\') {                            // \\, \\* e \\[2pt]: a capo
            nodo(h('br'));
            if (s[i] === '*') i++;
            if (s[i] === '[') {
              const k = s.indexOf(']', i);
              if (k > 0) i = k + 1;
            }
          } else if (simbolo === '(' || simbolo === '[') {   // \( … \) e \[ … \]: formula
            const fine = s.indexOf(simbolo === '(' ? '\\)' : '\\]', i);
            const f = fine < 0 ? s.length : fine;
            nodo(matematica(s.slice(i, f), ctx));
            i = f + 2;
          } else if (ACCENTI[simbolo]) {
            const [x, dopo] = accentato(s, i, ACCENTI[simbolo]);
            testo(x);
            i = dopo;
          } else {
            testo(simbolo in SIMBOLI ? SIMBOLI[simbolo] : simbolo);
          }
        } else if (STILI[nome]) {
          const [a, dopo] = argomenti(s, i, 1);
          i = dopo;
          nodo(h(STILI[nome], null, sotto(a[0])));
        } else if (RIMANDI[nome]) {
          const [n, k, j] = RIMANDI[nome];
          const [a, dopo] = argomenti(s, i, n);
          i = dopo;
          nodo(ctx.rimando(a[k], sotto(a[j]), nome === 'hyperlink'));
        } else if (nome === 'href') {
          const [a, dopo] = argomenti(s, i, 2);
          i = dopo;
          nodo(esterno(a[0], sotto(a[1] || a[0])));
        } else if (nome === 'url' || nome === 'nolinkurl') {
          const [a, dopo] = argomenti(s, i, 1);
          i = dopo;
          nodo(esterno(a[0], [String(a[0] || '').trim()]));
        } else if (nome === 'footnote') {
          const [a, dopo] = argomenti(s, i, 1);
          i = dopo;
          nodo([' (', ...sotto(a[0]), ')']);
        } else if (nome === 'begin') {
          const [a, dopo] = argomenti(s, i, 1);
          const amb = String(a[0] || '').trim();
          const [corpo, fine] = ambiente(s, dopo, amb);
          i = fine;
          nodo(blocco(amb, corpo, ctx, prof));
        } else if (nome === 'end') {                         // \end spaiato
          i = argomenti(s, i, 1)[1];
        } else if (nome === 'item') {                        // \item fuori da un elenco
          testo('• ');
          dopoParola();
        } else if (nome === 'par' || nome === 'newline' || nome === 'linebreak') {
          nodo(h('br'));
          dopoParola();
        } else if (nome.length === 1 && ACCENTI[nome]) {     // \c{c}, \v{s}…
          const [x, dopo] = accentato(s, i, ACCENTI[nome]);
          testo(x);
          i = dopo;
        } else if (Object.prototype.hasOwnProperty.call(PAROLE, nome)) {
          testo(PAROLE[nome]);
          dopoParola();
        } else if (Object.prototype.hasOwnProperty.call(SCARTA, nome)) {
          if (SCARTA[nome]) i = argomenti(s, i, SCARTA[nome])[1];
          else dopoParola();
        } else if (ctx.macro && ctx.macro.has(nome)) {
          nodo(sotto(ctx.macro.get(nome)));
          dopoParola();
        } else {                                             // sconosciuto: il suo ultimo argomento, se c'è
          const [a, dopo] = argomenti(s, i, 9, false);
          i = dopo;
          if (a.length) nodo(sotto(a[a.length - 1]));
          else dopoParola();
        }
      } else if (c === '{') {
        const [g, dopo] = gruppo(s, i);
        i = dopo;
        const sw = /^\s*\\([A-Za-z]+)(?![A-Za-z])\s*/.exec(g);
        if (sw && INTERRUTTORI[sw[1]]) nodo(h(INTERRUTTORI[sw[1]], null, sotto(g.slice(sw[0].length))));
        else nodo(sotto(g));
      } else if (c === '}') {
        i++;
      } else if (c === '$') {
        const doppio = s[i + 1] === '$';
        const da = i + (doppio ? 2 : 1);
        let f = da;
        while (f < s.length && !(s[f] === '$' && s[f - 1] !== '\\')) f++;
        nodo(matematica(s.slice(da, f), ctx));
        i = f + (doppio ? 2 : 1);
      } else if (c === '~') {
        testo(' ');
        i++;
      } else if (c === '-' && s[i + 1] === '-') {
        const tre = s[i + 2] === '-';
        testo(tre ? '—' : '–');
        i += tre ? 3 : 2;
      } else if ((c === '`' || c === "'") && s[i + 1] === c) {
        testo(c === '`' ? '“' : '”');
        i += 2;
      } else if (c === '`') {
        testo('‘');
        i++;
      } else if (c === '&') {                                // colonne di una tabella
        testo(' · ');
        i++;
      } else {
        testo(c);
        i++;
      }
    }
    nodo(null);
    return out;
  }

  // la definizione: paragrafi <p>, con elenchi e formule tra un paragrafo e l'altro
  function definizione(def, ctx) {
    const dd = h('dd');
    paragrafi(def).forEach((par) => {
      let p = null;
      nodi(par, ctx).forEach((n) => {
        if (n instanceof Element && BLOCCHI.has(n.tagName)) {
          dd.append(n);
          p = null;
        } else if (p || typeof n !== 'string' || n.trim()) {
          if (!p) p = dd.appendChild(h('p'));
          p.append(n);
        }
      });
    });
    return dd;
  }

  /* =====================================================================
     La pagina
     ===================================================================== */
  const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ').trim();
  const slug = (s) => norm(s).replace(/ /g, '-');
  const alfabetico = new Intl.Collator('it', { sensitivity: 'base', numeric: true });
  const quanti = (n) => `${n} ${n === 1 ? 'termine' : 'termini'}`;

  // lettera sotto cui va una voce: A–Z, 0–9 per i numeri, # per il resto
  function inizialeDi(testo) {
    const c = norm(testo).replace(/ /g, '').charAt(0);
    return !c ? '#' : /[0-9]/.test(c) ? '0-9' : c.toUpperCase();
  }
  const pesoIniziale = (l) => (l === '0-9' ? 0 : l === '#' ? 2 : 1);
  const nomeIniziale = (l) => (l === '0-9' ? '0–9' : l === '#' ? 'Altri' : l);
  const idIniziale = (gid, l) => `${gid}-${l === '0-9' ? 'numeri' : l === '#' ? 'altri' : l.toLowerCase()}`;

  // un file della repo, con un limite di attesa
  function leggi(percorso) {
    return Promise.race([
      BC.raw(percorso),
      BC.sleep(ATTESA_MS).then(() => { throw new Error('nessuna risposta'); }),
    ]);
  }

  // i glossari di content.js letti dalla repo: { ...glossario, voci, rete }
  // (rete: qualche file non si è letto per un problema di rete)
  function carica() {
    const elenco = (C.glossari || [])
      .map((g, n) => ({ ...g, id: slug(g.id) || `glossario-${n + 1}`, file: BC.percorsi(g.file) }))
      .filter((g) => g.file.length);
    return Promise.all(elenco.map((g) => Promise.allSettled(g.file.map(leggi)).then((letti) => {
      const voci = [];
      let rete = false;
      letti.forEach((r, n) => {
        if (r.status === 'rejected') {
          // un file che non c'è (404) si salta senza avvisi sulla pagina
          if (r.reason && r.reason.status === 404) console.warn(`glossario: ${g.file[n]} non è nella repository`);
          else {
            rete = true;
            console.warn(`glossario: ${g.file[n]} non si legge`, r.reason);
          }
          return;
        }
        try {
          const letto = vociDi(r.value);
          letto.voci.forEach((v) => voci.push({ ...v, macro: letto.macro }));
          if (!letto.voci.length) console.warn(`glossario: in ${g.file[n]} non ci sono voci \\VoceGlossario`);
        } catch (e) {
          console.warn(`glossario: ${g.file[n]} non interpretabile`, e);
        }
      });
      return { ...g, voci, rete };
    })));
  }

  // termine e definizione di ogni voce, in ordine alfabetico, con le ancore
  // gls-<id> come nel PDF (se due glossari hanno lo stesso id, il secondo
  // aggiunge il suo); i rimandi si collegano dopo, quando ci sono tutte
  function prepara(glossari) {
    const usate = new Set();
    glossari.forEach((G) => {
      G.voci.forEach((v) => {
        const ctx = {
          macro: v.macro,
          rimando: (id, figli, hyperlink) => {
            let k = String(id || '').trim();
            if (hyperlink) {
              if (!/^gls-/.test(k)) return figli;
              k = k.slice(4);
            }
            return h('a', { class: 'rif', 'data-rif': k, 'data-glossario': G.id }, figli);
          },
        };
        v.dt = h('dt', null, nodi(v.nome, ctx));
        v.dd = definizione(v.def, ctx);
        v.chiaro = v.dt.textContent.replace(/\s+/g, ' ').trim();
      });
      G.voci = G.voci.filter((v) => v.chiaro).sort((a, b) => alfabetico.compare(a.chiaro, b.chiaro));
      G.ancore = new Map();
      G.voci.forEach((v) => {
        const base = slug(v.id) || slug(v.chiaro);
        let a = `gls-${base}`;
        if (usate.has(a)) a = `gls-${G.id}-${base}`;
        for (let n = 2; usate.has(a); n++) a = `gls-${G.id}-${base}-${n}`;
        usate.add(a);
        [v.id, slug(v.id)].forEach((k) => { if (k && !G.ancore.has(k)) G.ancore.set(k, a); });
        v.el = h('div', { class: 'voce', id: a }, v.dt, v.dd);
      });
    });
  }

  // rimandi: alla voce dello stesso glossario, altrimenti di un altro;
  // se la voce non c'è, resta il testo
  function collegaRimandi(radice, glossari) {
    radice.querySelectorAll('a.rif').forEach((a) => {
      const k = a.getAttribute('data-rif');
      const proprio = glossari.find((G) => G.id === a.getAttribute('data-glossario'));
      const dove = [proprio, ...glossari].filter(Boolean)
        .map((G) => G.ancore.get(k) || G.ancore.get(slug(k))).find(Boolean);
      if (dove) a.setAttribute('href', `#${dove}`);
      else a.replaceWith(...a.childNodes);
    });
  }

  // un glossario: titolo, lettere, voci divise per lettera
  function sezione(G, molti) {
    const gruppi = new Map();
    G.voci.forEach((v) => {
      const l = inizialeDi(v.chiaro);
      if (!gruppi.has(l)) gruppi.set(l, []);
      gruppi.get(l).push(v);
    });
    const lettere = [...gruppi.keys()].sort((a, b) => pesoIniziale(a) - pesoIniziale(b) || a.localeCompare(b));
    G.sezioni = lettere.map((l) => ({
      voci: gruppi.get(l),
      el: h('section', { class: 'iniziale', 'aria-labelledby': idIniziale(G.id, l) },
        h('h3', { id: idIniziale(G.id, l) }, nomeIniziale(l)),
        h('dl', { class: 'voci' }, gruppi.get(l).map((v) => v.el))),
    }));
    G.nessuno = h('p', { class: 'vuoto', hidden: true }, 'In questo glossario nessun termine corrisponde alla ricerca.');
    return h('section', { class: 'glossario', id: `glossario-${G.id}`, 'aria-labelledby': `titolo-${G.id}` },
      h('div', { class: 'glossario__testata' },
        h('h2', { id: `titolo-${G.id}` }, G.titolo || 'Glossario'),
        h('span', null, quanti(G.voci.length))),
      G.descrizione ? h('p', { class: 'glossario__descrizione' }, G.descrizione) : null,
      G.pdf
        ? h('p', { class: 'glossario__pdf' },
          h('a', { href: BC.docUrl(G.pdf), target: '_blank', rel: 'noopener' }, 'Versione PDF, da scaricare o stampare', BC.newTab()))
        : null,
      h('nav', { class: 'iniziali', 'aria-label': molti ? `Lettere del ${G.titolo || 'glossario'}` : 'Lettere' },
        lettere.map((l) => h('a', { href: `#${idIniziale(G.id, l)}`, 'aria-label': l === '#' ? 'Altri' : `Lettera ${nomeIniziale(l)}` },
          nomeIniziale(l)))),
      G.sezioni.map((x) => x.el),
      G.nessuno);
  }

  // la casella di ricerca, che resta in cima mentre si scorre
  function casellaDiRicerca() {
    const campo = h('input', {
      id: 'cerca-campo', type: 'text', inputmode: 'search', enterkeyhint: 'search', autocomplete: 'off',
      autocapitalize: 'off', spellcheck: 'false', placeholder: 'ad esempio: cache', 'aria-describedby': 'cerca-esito',
    });
    const cancella = h('button', { type: 'button', hidden: true }, 'Cancella');
    const esito = h('p', { id: 'cerca-esito', class: 'cerca__esito', 'aria-live': 'polite' });
    const barra = h('div', { class: 'cerca', role: 'search' },
      h('div', { class: 'cerca__riga' }, h('label', { for: 'cerca-campo' }, 'Cerca un termine'), campo, cancella),
      esito);
    return { barra, campo, cancella, esito };
  }

  // la ricerca, senza badare a maiuscole e accenti: le parole scritte sono
  // l'inizio delle parole del nome («api» trova «API key», non «Capitolato»);
  // se nessun nome va bene, un pezzo del nome («mail» trova «E-mail»), poi
  // le parole delle definizioni. Una sola lettera: i termini che iniziano così
  function attivaRicerca({ barra, campo, cancella, esito }, glossari, risultati) {
    const tutte = glossari.flatMap((G) => G.voci);
    tutte.forEach((v) => {
      const testo = v.dd.cloneNode(true);
      testo.querySelectorAll('.sr-only').forEach((x) => x.remove());
      v.kNome = norm(v.chiaro).split(' ');
      v.kCompatto = v.kNome.join('');
      v.kTesto = norm(testo.textContent).split(' ');
      v.kIniziale = inizialeDi(v.chiaro);
    });
    // le parole cercate; dalle parole lunghe si toglie la vocale finale,
    // così «verbali» trova «Verbale» (ma «costo» non trova «costituisce»)
    const cercate = (q) => norm(q).split(' ').filter(Boolean)
      .map((w) => ({ w, radice: w.length >= 5 && /[aeiou]$/.test(w) ? w.slice(0, -1) : null }));
    const trova = (parole, p) => parole.some((x) => x.startsWith(p.w) ||
      (p.radice && x.startsWith(p.radice) && x.length <= p.radice.length + 3));

    function filtra() {
      const q = campo.value.trim();
      const parole = cercate(q);
      let trovate = null;
      let nelTesto = false;
      let iniziale = null;
      if (parole.length === 1 && parole[0].w.length === 1) {
        iniziale = /[0-9]/.test(parole[0].w) ? '0-9' : parole[0].w.toUpperCase();
        trovate = tutte.filter((v) => v.kIniziale === iniziale);
      } else if (parole.length) {
        const compatta = parole.map((p) => p.w).join('');
        trovate = tutte.filter((v) => parole.every((p) => trova(v.kNome, p)));
        if (!trovate.length && compatta.length >= 3) trovate = tutte.filter((v) => v.kCompatto.includes(compatta));
        if (!trovate.length) {
          trovate = tutte.filter((v) => parole.every((p) => trova(v.kTesto, p)));
          nelTesto = trovate.length > 0;
        }
      }
      trovate = trovate && new Set(trovate);
      document.body.classList.toggle('in-ricerca', Boolean(trovate));
      cancella.hidden = !q;
      glossari.forEach((G) => {
        let visibili = 0;
        G.sezioni.forEach((x) => {
          let n = 0;
          x.voci.forEach((v) => {
            const si = !trovate || trovate.has(v);
            v.el.hidden = !si;
            if (si) n++;
          });
          x.el.hidden = n === 0;
          visibili += n;
        });
        G.nessuno.hidden = !trovate || visibili > 0 || glossari.length < 2;
      });
      const n = trovate ? trovate.size : 0;
      esito.textContent = !trovate ? ''
        : iniziale ? (n ? `${n === 1 ? 'C\'è 1 termine' : `Ci sono ${n} termini`} che iniziano con ${nomeIniziale(iniziale)}.`
          : `Nessun termine inizia con ${nomeIniziale(iniziale)}.`)
        : nelTesto ? `Nessun termine si chiama «${q}», ma la parola compare nella spiegazione di ${n === 1 ? 'questo termine' : `questi ${n} termini`}.`
        : n ? (n === 1 ? 'Trovato 1 termine.' : `Trovati ${n} termini.`)
        : `Nessun termine trovato per «${q}». Controllate come è scritta la parola, oppure premete «Cancella».`;
      // se si era scesi nella pagina, si torna all'inizio dei risultati
      if (trovate && risultati.getBoundingClientRect().top < 0) risultati.scrollIntoView();
    }

    campo.addEventListener('input', filtra);
    campo.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && campo.value) {
        campo.value = '';
        filtra();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        campo.blur();                               // sul telefono chiude la tastiera
      }
    });
    cancella.addEventListener('click', () => {
      campo.value = '';
      filtra();
      campo.focus();
    });
    // un rimando a una voce nascosta dalla ricerca: si cancella la ricerca, poi si salta
    risultati.addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="#"]');
      const dest = a && document.getElementById(decodeURIComponent(a.getAttribute('href').slice(1)));
      if (dest && dest.closest('[hidden]')) {
        campo.value = '';
        filtra();
      }
    });
    // le ancore non finiscono sotto la casella di ricerca
    const misura = () => document.documentElement.style.setProperty('--cerca-h', `${barra.offsetHeight}px`);
    misura();
    if ('ResizeObserver' in window) new ResizeObserver(misura).observe(barra);
  }

  // la voce (o la lettera) dell'indirizzo, evidenziata
  function evidenzia() {
    document.querySelectorAll('.voce.evidenziata').forEach((x) => x.classList.remove('evidenziata'));
    let id = '';
    try { id = decodeURIComponent(location.hash.slice(1)); } catch (e) { /* indirizzo storpiato */ }
    const el = id ? document.getElementById(id) : null;
    if (el && el.classList.contains('voce')) el.classList.add('evidenziata');
    return el;
  }

  function riprova() {
    try {
      Object.keys(sessionStorage).filter((k) => /^bc\.raw:/.test(k)).forEach((k) => sessionStorage.removeItem(k));
    } catch (e) { /* storage bloccato: si ricarica comunque */ }
    location.reload();
  }

  // la repo non risponde: una riga di avviso, con la versione PDF se c'è
  function avviso(guasti, nessuno) {
    const pdf = guasti.filter((G) => G.pdf);
    return h('p', { class: 'avviso', role: 'status' },
      nessuno
        ? 'In questo momento non riusciamo a leggere il glossario dalla repository del progetto. '
        : 'In questo momento non riusciamo a leggere tutto il glossario dalla repository del progetto. ',
      h('button', { type: 'button', onclick: riprova }, 'Riprova'),
      pdf.length
        ? [' Intanto potete aprire la versione PDF: ',
          pdf.map((G, n) => [n ? ', ' : '', h('a', { href: BC.docUrl(G.pdf), target: '_blank', rel: 'noopener' }, G.titolo || 'Glossario', BC.newTab())]),
          '.']
        : null);
  }

  function disegna(tutti) {
    const S = C.sito;
    const glossari = tutti.filter((G) => G.voci.length);
    const guasti = tutti.filter((G) => G.rete);
    prepara(glossari);
    const molti = glossari.length > 1;
    const risultati = h('div', { id: 'risultati', class: 'risultati' }, glossari.map((G) => sezione(G, molti)));
    collegaRimandi(risultati, glossari);
    const ricerca = glossari.length ? casellaDiRicerca() : null;
    const conRimandi = Boolean(risultati.querySelector('a.rif'));

    const pagina = [
      BC.testata('Glossario', [h('p', null, `${S.gruppo} · ${S.corso}`)],
        h('a', { class: 'testata__azione testata__azione--chiara', href: 'index.html' }, 'Torna ai documenti')),
      h('main', { id: 'contenuto', class: 'contenitore glossario-pagina' },
        guasti.length ? avviso(guasti, !glossari.length) : null,
        glossari.length
          ? [
            h('p', { class: 'glossario-guida' },
              'Qui trovate il significato dei termini usati nei nostri documenti, in ordine alfabetico. ' +
              'Per trovare un termine scrivetelo nella casella qui sotto, oppure scegliete la lettera iniziale.',
              conRimandi
                ? ' Le parole sottolineate portano a un\'altra voce; con il tasto «Indietro» del browser si torna dove si era.'
                : null),
            molti
              ? h('nav', { class: 'glossari-indice', 'aria-label': 'Glossari in questa pagina' },
                h('p', null, `In questa pagina ci sono ${glossari.length} glossari:`),
                h('ul', null, glossari.map((G) => h('li', null,
                  h('a', { href: `#glossario-${G.id}` }, G.titolo || 'Glossario'), ` (${quanti(G.voci.length)})`))))
              : null,
            ricerca.barra,
            risultati,
          ]
          : guasti.length ? null : h('p', { class: 'vuoto' }, 'Il glossario non è ancora disponibile.')),
      h('footer', { class: 'piede' },
        h('div', { class: 'contenitore' }, 'Il glossario si aggiorna da solo dalla repository del progetto.')),
    ];
    BC.$('#pagina').replaceChildren(...pagina);
    if (ricerca) attivaRicerca(ricerca, glossari, risultati);

    const el = evidenzia();
    if (el) el.scrollIntoView();
    window.addEventListener('hashchange', evidenzia);
  }

  carica().then(disegna).catch((e) => {
    console.error('glossario', e);
    BC.$('#pagina').replaceChildren(h('main', { id: 'contenuto', class: 'contenitore glossario-pagina' },
      h('p', { class: 'avviso', role: 'status' }, 'Il glossario non si è caricato. ',
        h('button', { type: 'button', onclick: riprova }, 'Riprova'))));
  });
})();
