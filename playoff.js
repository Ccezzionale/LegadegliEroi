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
  WC4: { home: '', away: 'W' },
  // Quarti
  Q1:  { home: 'W', away: '' },
  Q2:  { home: 'W', away: '' },
  Q3:  { home: 'W', away: '' },
  Q4:  { home: '', away: 'W' },
  // Semifinali
  S1:  { home: '', away: 'W' },
  S2:  { home: '', away: 'W' },
  // Finale
  F:   { home: '', away: 'W' },
};

/* 2) Abbinamenti Wildcard (indici 0-based nella classifica ordinata) */
const WC_PAIRS = {
  WC1: [7, 8],   // SINISTRA in alto  -> 8ª vs 9ª
  WC3: [4, 11],  // SINISTRA in basso -> 5ª vs 12ª
  WC2: [6, 9],   // DESTRA  in alto   -> 7ª vs 10ª
  WC4: [5, 10],  // DESTRA  in basso  -> 6ª vs 11ª
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

// ---- QUARTI ---- (schema Excel corretto)
// Sinistra (1 in alto, 4 in basso)
P.Q1 = { home: { name: S[0].nome, seed: 1 }, away: winnerOf('WC1') || { name: 'Vincente WC1' } }; // 1 vs 8–9
P.Q4 = { home: { name: S[3].nome, seed: 4 }, away: winnerOf('WC3') || { name: 'Vincente WC3' } }; // 4 vs 5–12

// Destra (2 in alto, 3 in basso)
P.Q2 = { home: { name: S[1].nome, seed: 2 }, away: winnerOf('WC2') || { name: 'Vincente WC2' } }; // 2 vs 7–10
P.Q3 = { home: { name: S[2].nome, seed: 3 }, away: winnerOf('WC4') || { name: 'Vincente WC4' } }; // 3 vs 6–11

// ---- SEMIFINALI ---- (tabellone fisso)
P.S1 = { home: winnerOf('Q1') || { name: 'Vincente Q1' }, away: winnerOf('Q4') || { name: 'Vincente Q4' } };
P.S2 = { home: winnerOf('Q2') || { name: 'Vincente Q2' }, away: winnerOf('Q3') || { name: 'Vincente Q3' } };


  // ---- FINALE ----
  P.F  = { home: winnerOf('S1') || { name: `Vincente S1` }, away: winnerOf('S2') || { name: `Vincente S2` } };

  return P;
}

function aggiornaPlayoff() {
  const P = computeParticipants();
  if (!Object.keys(P).length) return;

  const codes = ["WC1","WC2","WC3","WC4","Q1","Q2","Q3","Q4","S1","S2","F"];

  const fill = (code, side) => {
    const data = P[code]?.[side];
    if (!data) return;
    const slot = side === 'home' ? 'A' : 'B'; // A sopra, B sotto
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

  // Vincitore assoluto se F decisa
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

  // ordina i blocchi dei quarti nelle rispettive colonne
  placeQuarterPairs();
  // allinea le altezze e centra le semifinali
  alignLikeExcel();
}

/* — helpers layout — */

// crea un wrapper per la coppia Qx-A/B e lo ritorna (idempotente)
function ensurePairWrap(code) {
  const a = document.querySelector(`.match[data-match="${code}-A"]`);
  const b = document.querySelector(`.match[data-match="${code}-B"]`);
  if (!a || !b) return null;

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

// helper per recuperare le colonne (con fallback se non hai le classi semantiched)
function getCol(selector, nthFallback){
  return document.querySelector(`${selector} .colonna`)
      || document.querySelector(`.bracket > .blocco-colonna:nth-of-type(${nthFallback}) .colonna`);
}

// Q1/Q4 a sinistra — Q2/Q3 a destra (ordine top/bottom)
function placeQuarterPairs() {
  const colQsx = getCol('.q-sx', 2);
  const colQdx = getCol('.q-dx', 6);

  if (colQsx) {
    const q1 = ensurePairWrap('Q1'); // top sinistra
    const q4 = ensurePairWrap('Q4'); // bottom sinistra
    colQsx.innerHTML = '';           // pulisco e ri-appendo in ordine
    if (q1) colQsx.append(q1);
    if (q4) colQsx.append(q4);
  }
  if (colQdx) {
    const q2 = ensurePairWrap('Q2'); // top destra
    const q3 = ensurePairWrap('Q3'); // bottom destra
    colQdx.innerHTML = '';
    if (q2) colQdx.append(q2);
    if (q3) colQdx.append(q3);
  }
}

// allinea le colonne: quarti “spalmati”, altezze uguali alle wildcard
// e semifinali centrate esattamente a metà
// allinea le colonne: quarti “spalmati”, altezze uguali alle wildcard
// e semifinali centrate esattamente a metà
function alignLikeExcel() {
  const wcL = getCol('.wc-sx', 1);
  const qL  = getCol('.q-sx', 2);
  const sL  = getCol('.s-sx', 3);

  const wcR = getCol('.wc-dx', 7);
  const qR  = getCol('.q-dx', 6);
  const sR  = getCol('.s-dx', 5);

  // classi comportamento
  [qL, qR].forEach(c => c && c.classList.add('col--spread'));
  [sL, sR].forEach(c => c && c.classList.add('col--center'));

  // altezze colonne = wildcard adiacente (hL/hR)
  const hL = wcL ? wcL.offsetHeight : 0;
  const hR = wcR ? wcR.offsetHeight : 0;

  if (qL) { qL.style.height = hL + 'px'; qL.style.minHeight = hL + 'px'; }
  if (sL) { sL.style.height = hL + 'px'; sL.style.minHeight = hL + 'px'; }

  if (qR) { qR.style.height = hR + 'px'; qR.style.minHeight = hR + 'px'; }
  if (sR) { sR.style.height = hR + 'px'; sR.style.minHeight = hR + 'px'; }

  // *** centratura verticale precisa delle semifinali nella loro colonna ***
  if (sL) centerSemiColumn(sL, hL);
  if (sR) centerSemiColumn(sR, hR);
}

// calcola quanto spazio libero c’è nella colonna e
// aggiunge padding-top/padding-bottom uguale per centrare il blocco semifinali
function centerSemiColumn(col, targetHeight){
  if (!col) return;

  // azzero padding per misurare correttamente
  col.style.paddingTop = '0px';
  col.style.paddingBottom = '0px';

  // altezza contenuto effettivo (item + gap)
  const items = Array.from(col.children).filter(el => el.nodeType === 1);
  const cs = getComputedStyle(col);
  const gap = parseFloat(cs.rowGap || cs.gap || 0) || 0;

  let contentH = 0;
  items.forEach((el, i) => {
    contentH += el.offsetHeight;
    if (i > 0) contentH += gap;
  });

  // centro "geometrico" della colonna (stessa altezza dei wildcard)
  const pad = Math.max(0, (targetHeight - contentH) / 2);

  // bias opzionale da CSS: positivo = sposta SU (riduce padding-top)
  const root = getComputedStyle(document.documentElement);
  const bias =
    col.closest('.s-sx') ? (parseFloat(root.getPropertyValue('--semi-shift-left')) || 0) :
    col.closest('.s-dx') ? (parseFloat(root.getPropertyValue('--semi-shift-right')) || 0) :
    0;

  const topPad = Math.max(0, pad - bias);
  const bottomPad = Math.max(0, pad + bias);

  col.style.paddingTop = topPad + 'px';
  col.style.paddingBottom = bottomPad + 'px';
}


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

