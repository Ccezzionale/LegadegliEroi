/* =========================================
   CLASSIFICA (Google Sheet)
   ========================================= */
const URL_CLASSIFICA_TOTALE = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTduESMbJiPuCDLaAFdOHjep9GW-notjraILSyyjo6SA0xKSR0H0fgMLPNNYSwXgnGGJUyv14kjFRqv/pub?gid=691152130&single=true&output=csv";

/* =========================================
   UTILS & COLORI SQUADRE
   ========================================= */

// normalizza: toglie seed "8°", spazi doppi, case, accenti
const norm = (s) => (s || "")
  .toString()
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // accenti
  .replace(/^\s*\d+\s*°?\s*/,"")                    // "8° " iniziale
  .replace(/\s+/g," ")
  .trim()
  .toLowerCase();

const TEAM_COLORS = {
  "team bartowski":         "#C1121F",
  "bayern christiansen":    "#8B0A1A",
  "wildboys78":             "#A07900",
  "desperados":             "#0B1F3A",
  "minnesode timberland":   "#00A651",
  "golden knights":         "#B4975A",
  "pokermantra":            "#5B2A86",
  "rubinkebab":             "#C27A33",
  "pandinicoccolosini":     "#228B22",
  "ibla":                   "#F97316",
  "fc disoneste":           "#A78BFA",
  "athletic pongao":        "#C1121F",
  "riverfilo":              "#D5011D",
  "eintracht franco 126":   "#E1000F",
  "lokomotiv lipsia":       "#FACC15",
};

function applyTeamColorFromCard(cardEl){
  const nameEl = cardEl.querySelector('.squadra.orizzontale span');
  if (!nameEl) return;
  const key = norm(nameEl.textContent);
  const c = TEAM_COLORS[key] || "#123c7a"; // fallback
  cardEl.style.setProperty('--team-color', c);
}

/* =========================================
   RENDER DELLA SQUADRA (HTML)
   ========================================= */
function creaHTMLSquadra(nome, posizione = "", punteggio = "", isVincente = false) {
  const nomePulito = (nome || "").replace(/[°]/g, "").trim();
  const usaLogo = !/vincente|classificata/i.test(nome || "");
  const fileLogo = `img/${nomePulito}.png`;
  const classe = isVincente ? "vincente" : "perdente";

  const logoHTML = usaLogo
    ? `<img src="${fileLogo}" alt="${nomePulito}" onerror="this.style.display='none'">`
    : "";

  return `
    <div class="squadra orizzontale ${classe}">
      ${logoHTML}
      <span>${posizione ? posizione + " " : ""}${nomePulito}</span>
    </div>`;
}

/* =========================================
   BRACKET MANUALE (home/away)
   - metti un valore truthy in PICKS.<match>.<home|away> per far passare
   - top-4 direttamente ai Quarti (home)
   - 5..12 in Wildcard
   Convenzione UI: A = riquadro sopra (home), B = riquadro sotto (away)
   ========================================= */

/* 1) EDITA QUI per indicare i vincitori */
const PICKS = {
  // Wildcard
  WC1: { home: 'W', away: '' },
  WC2: { home: 'W', away: '' },
  WC3: { home: '', away: 'W' },
  WC4: { home: 'W', away: '' },
  // Quarti
  Q1:  { home: '', away: '' },
  Q2:  { home: '', away: '' },
  Q3:  { home: '', away: '' },
  Q4:  { home: '', away: '' },
  // Semifinali
  S1:  { home: '', away: '' },
  S2:  { home: '', away: '' },
  // Finale
  F:   { home: '', away: '' },
};

/* 2) Abbinamenti Wildcard (indici 0-based nella classifica ordinata) */
const WC_PAIRS = {
  WC1: [7, 8],   // 8ª vs 9ª
  WC2: [6, 9],  // 5ª vs 12ª
  WC3: [4, 11],  // 6ª vs 11ª
  WC4: [5, 10],   // 7ª vs 10ª
};

/* 3) Helpers */
const truthy = v => !(v === '' || v === 0 || v === null || v === undefined || v === false);
const stripSeed = (txt) => (txt || "").replace(/^\s*\d+\s*°\s*/, "").trim();

/* 4) Costruisce tutti i partecipanti (WC → Q → S → F) in base a classifica + PICKS */
function computeParticipants() {
  const S = window.squadre || [];
  if (S.length < 12) return {};

  const P = {}; // partecipanti per match: { code: {home:{name,seed}, away:{...}} }

  // ---- WILDCARD ----
  for (const [code, [iH, iA]] of Object.entries(WC_PAIRS)) {
    P[code] = {
      home: { name: S[iH].nome, seed: iH + 1 },
      away: { name: S[iA].nome, seed: iA + 1 },
    };
  }

  // funzione per calcolare vincitore di un match (se selezionato in PICKS)
  const winnerOf = (code) => {
    const p = PICKS[code];
    const m = P[code];
    if (!p || !m) return null;
    const h = truthy(p.home), a = truthy(p.away);
    if (h && !a) return { name: stripSeed(m.home.name), seed: m.home.seed };
    if (a && !h) return { name: stripSeed(m.away.name), seed: m.away.seed };
    return null; // non deciso o ambiguità
  };


// ---- QUARTI ---- (tabellone fisso da regolamento)
// Q1: 1ª vs (8–9)  → WC1
// Q2: 2ª vs (7–10) → WC4
// Q3: 3ª vs (6–11) → WC3
// Q4: 4ª vs (5–12) → WC2
P.Q1 = { home: { name: S[0].nome, seed: 1 }, away: winnerOf('WC1') || { name: 'Vincente WC1' } };
P.Q2 = { home: { name: S[1].nome, seed: 2 }, away: winnerOf('WC4') || { name: 'Vincente WC4' } };
P.Q3 = { home: { name: S[2].nome, seed: 3 }, away: winnerOf('WC3') || { name: 'Vincente WC3' } }; // 3ª vs 6–11
P.Q4 = { home: { name: S[3].nome, seed: 4 }, away: winnerOf('WC2') || { name: 'Vincente WC2' } }; // 4ª vs 5–12

// ---- SEMIFINALI ---- (tabellone fisso)
P.S1 = { home: winnerOf('Q1') || { name: 'Vincente Q1' }, away: winnerOf('Q4') || { name: 'Vincente Q4' } };
P.S2 = { home: winnerOf('Q2') || { name: 'Vincente Q2' }, away: winnerOf('Q3') || { name: 'Vincente Q3' } };


  // ---- FINALE ----
  P.F  = { home: winnerOf('S1') || { name: `Vincente S1` }, away: winnerOf('S2') || { name: `Vincente S2` } };

  return P;
}

/* 5) Render di tutte le card .match */
function aggiornaPlayoff() {
  const P = computeParticipants();
  if (!Object.keys(P).length) return;

  const codes = ["WC1","WC2","WC3","WC4","Q1","Q2","Q3","Q4","S1","S2","F"];

  const fill = (code, side) => {
    const data = P[code]?.[side];
    if (!data) return;
    const slot = side === 'home' ? 'A' : 'B';
    const el = document.querySelector(`.match[data-match="${code}-${slot}"]`);
    if (!el) return;

    const posText = data.seed ? `${data.seed}°` : "";
    el.innerHTML = creaHTMLSquadra(data.name, posText, "", false);
    applyTeamColorFromCard(el);

    const pick = PICKS[code];
    const won = pick && truthy(pick[side]) && !truthy(pick[side === 'home' ? 'away' : 'home']);
    el.classList.toggle('vincente', !!won);
  };

  codes.forEach(code => { fill(code, 'home'); fill(code, 'away'); });

  // Vincitore assoluto
  const fPick = PICKS.F;
  const winnerSide = fPick && truthy(fPick.home) !== truthy(fPick.away)
    ? (truthy(fPick.home) ? 'home' : 'away')
    : null;
  const champ = winnerSide ? P.F?.[winnerSide]?.name : null;

  const container = document.getElementById("vincitore-assoluto");
  if (container) {
    container.innerHTML = champ
      ? `<img src="img/${champ}.png" alt="${champ}" class="logo-vincitore" onerror="this.style.display='none'">
         <div class="nome-vincitore">${champ}</div>`
      : "";
  }

  // === SOLO la soluzione “offset per blocco” ===
  wrapPairOnce('Q1', 'pair-Q1'); // primo quarto a sinistra
  wrapPairOnce('Q2', 'pair-Q2'); // primo quarto a destra
}

// --- crea un wrapper per la coppia Qx-A/B e lo ritorna (idempotente)
function ensurePairWrap(code) {
  const a = document.querySelector(`.match[data-match="${code}-A"]`);
  const b = document.querySelector(`.match[data-match="${code}-B"]`);
  if (!a || !b) return null;

  // già wrappati?
  if (a.parentElement.classList.contains('pair-offset') &&
      a.parentElement === b.parentElement) {
    return a.parentElement;
  }

  const parent = a.parentElement;
  if (parent !== b.parentElement) return null;

  const w = document.createElement('div');
  w.className = 'pair-offset';
  parent.insertBefore(w, a);
  w.appendChild(a);
  w.appendChild(b);
  return w;
}

// --- ordina i blocchi dei quarti nelle colonne giuste (top/bottom)
function placeQuarterPairs() {
  const colQsx = document.querySelector('.q-sx .colonna');
  const colQdx = document.querySelector('.q-dx .colonna');
  if (colQsx) {
    const q1 = ensurePairWrap('Q1');
    const q2 = ensurePairWrap('Q2');
    // Q1 sopra, Q2 sotto
    if (q1) colQsx.append(q1);
    if (q2) colQsx.append(q2);
  }
  if (colQdx) {
    const q3 = ensurePairWrap('Q3');
    const q4 = ensurePairWrap('Q4');
    // Q3 sopra, Q4 sotto
    if (q3) colQdx.append(q3);
    if (q4) colQdx.append(q4);
  }
}

// --- allinea le colonne: i Quarti “spalmati”, le Semi centrate
function alignLikeExcel() {
  const getCol = sel => document.querySelector(`${sel} .colonna`);
  const wcL = getCol('.wc-sx'), wcR = getCol('.wc-dx');
  const qL  = getCol('.q-sx'),  sL  = getCol('.s-sx');
  const qR  = getCol('.q-dx'),  sR  = getCol('.s-dx');

  // classi di comportamento
  [qL, qR].forEach(c => c && c.classList.add('col--spread'));
  [sL, sR].forEach(c => c && c.classList.add('col--center'));

  // altezze minime uguali a quelle delle wildcard adiacenti
  if (qL) qL.style.minHeight = (wcL ? wcL.offsetHeight : 0) + 'px';
  if (sL) sL.style.minHeight = (wcL ? wcL.offsetHeight : 0) + 'px';
  if (qR) qR.style.minHeight = (wcR ? wcR.offsetHeight : 0) + 'px';
  if (sR) sR.style.minHeight = (wcR ? wcR.offsetHeight : 0) + 'px';
}

// >>> dopo aver popolato tutte le .match:
placeQuarterPairs();
alignLikeExcel();
window.addEventListener('resize', alignLikeExcel);

/* =========================================
   FETCH CLASSIFICA e AVVIO
   ========================================= */
fetch(URL_CLASSIFICA_TOTALE)
  .then(res => res.text())
  .then(csv => {
    const righe = csv.trim().split("\n");
    const startRow = 1;
    const squadre = [];

    for (let i = startRow; i < righe.length; i++) {
      const colonne = righe[i].split(",").map(c => c.replace(/"/g, "").trim());
      const nome = colonne[1];
      const punti = parseInt(colonne[10]);
      const mp = parseFloat(colonne[11]?.replace(",", ".")) || 0;
      if (!nome || isNaN(punti)) continue;
      squadre.push({ nome, punti, mp });
      if (squadre.length === 12) break;
    }

    squadre.sort((a, b) => b.punti - a.punti || b.mp - a.mp);
    window.squadre = squadre;

    // Render iniziale (legge anche PICKS)
    aggiornaPlayoff();
  })
  .catch(err => console.error("Errore nel caricamento classifica:", err));

/* Facoltativo: richiamabile da console se cambi PICKS a runtime */
window.aggiornaPlayoff = aggiornaPlayoff;
window.PICKS = PICKS;

