// ======== CONFIG ========
const URL_STANDINGS = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS1pXJCNLgchygyLnGbDEsnIV3QAdPUiLcmgzMAhlzYRivXV4fnoSBW5VwiopwXEMfwk32mvdF3gWZC/pub?output=csv";
const LOGO_BASE_PATH = "img/";       // cambia se necessario
const LOGO_EXT = ".png";               // .png o .jpg in base ai tuoi file
const SCORE_DEFAULT = "0";
const BEST_OF = 5;
const WINS_NEEDED = Math.floor(BEST_OF / 2) + 1; // 3
const RESULTS = {
  // Round 1
  L1:[3,0], L2:[0,3], L3:[0,3], L4:[0,3],
  R1:[3,0], R2:[0,3], R3:[3,0], R4:[3,0],

  // Semifinali di Conference
  LSF1:[0,3], LSF2:[3,0], RSF1:[3,0], RSF2:[0,3],

  // Finali di Conference
  LCF:[3,0], RCF:[0,3],

  // Finals
  F:[3,0],
};

// ======== UTILS ========
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function urlNoCache(url) {
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}_cb=${Date.now()}`;
}
function isNumeric(v){ return /^\d+$/.test((v ?? "").toString().trim()); }
function logoSrc(team){
  const file = `${LOGO_BASE_PATH}${team}${LOGO_EXT}`;
  return encodeURI(file);
}

// ======== NAVBAR (identico comportamento del tuo index) ========
document.addEventListener("DOMContentLoaded", () => {
  const hamburger = $("#hamburger");
  const mainMenu = $("#mainMenu");
  const submenuToggles = $$(".toggle-submenu");

  hamburger?.addEventListener("click", () => {
    mainMenu.classList.toggle("show");
  });

  submenuToggles.forEach(toggle => {
    toggle.addEventListener("click", function (e) {
      e.preventDefault();
      const parent = this.closest(".dropdown");
      parent.classList.toggle("show");
    });
  });
});

// ======== PARSE CSV (prende solo A=posizione, B=nome) ========
async function loadStandings() {
  const res = await fetch(urlNoCache(URL_STANDINGS));
  const text = await res.text();
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  const entries = [];
  for (const line of lines) {
    const cells = line.split(","); // CSV semplice senza virgole nei nomi
    const pos = cells[0]?.trim();
    const name = cells[1]?.trim();

    if (!isNumeric(pos)) continue;         // salta header o righe sporche
    if (!name) continue;

    entries.push({ seed: Number(pos), team: name });
  }

  // ordina per seed crescente e prendi i primi 16
  entries.sort((a, b) => a.seed - b.seed);
  return entries.slice(0, 16);
}

// ======== BRACKET MODEL ========
// Mappatura stile NBA su due colonne (sinistra/destra) con 1–16, 8–9, 5–12, 4–13 | 3–14, 6–11, 7–10, 2–15
function makeRound1Pairs(seeds) {
  // seeds è array ordinato per seed (1..16)
  const bySeed = Object.fromEntries(seeds.map(x => [x.seed, x]));

  return {
    left: [
      { id: "L1", home: bySeed[1],  away: bySeed[16] },
      { id: "L2", home: bySeed[8],  away: bySeed[9]  },
      { id: "L3", home: bySeed[5],  away: bySeed[12] },
      { id: "L4", home: bySeed[4],  away: bySeed[13] },
    ],
    right: [
      { id: "R1", home: bySeed[3],  away: bySeed[14] },
      { id: "R2", home: bySeed[6],  away: bySeed[11] },
      { id: "R3", home: bySeed[7],  away: bySeed[10] },
      { id: "R4", home: bySeed[2],  away: bySeed[15] },
    ]
  };
}

function makeEmptyMatch(id){
  return { id, home: { seed: "", team: "TBD" }, away: { seed: "", team: "TBD" } };
}

function makeBracketStructure(seeds){
  const r1 = makeRound1Pairs(seeds);

  // Semifinali (winners: L1 vs L2, L3 vs L4 | R1 vs R2, R3 vs R4)
  const leftSF  = [ makeEmptyMatch("LSF1"), makeEmptyMatch("LSF2") ];
  const rightSF = [ makeEmptyMatch("RSF1"), makeEmptyMatch("RSF2") ];

  // Finali di Conference (winners: LSF1 vs LSF2 | RSF1 vs RSF2)
  const leftCF = [ makeEmptyMatch("LCF") ];
  const rightCF = [ makeEmptyMatch("RCF") ];

  // Finals (LCF vs RCF)
  const finals = [ makeEmptyMatch("F") ];

  return { r1, leftSF, rightSF, leftCF, rightCF, finals };
}

// trova un match ovunque nel bracket
function findMatchById(bracket, id) {
  const pools = [
    ...bracket.r1.left, ...bracket.r1.right,
    ...bracket.leftSF, ...bracket.rightSF,
    ...bracket.leftCF, ...bracket.rightCF,
    ...bracket.finals
  ];
  return pools.find(m => m.id === id) || null;
}

// dato un match, ritorna l'oggetto squadra vincente se ha raggiunto WINS_NEEDED
function getWinner(match) {
  const res = RESULTS[match.id];
  if (!res) return null;
  const [home, away] = res;
  if (home >= WINS_NEEDED && home > away) return match.home;
  if (away >= WINS_NEEDED && away > home) return match.away;
  return null;
}

// copia seed/nome dentro uno slot del turno successivo
function setSlot(targetMatch, side, teamObj) {
  if (!targetMatch || !teamObj) return;
  targetMatch[side].seed = teamObj.seed;
  targetMatch[side].team = teamObj.team;
}

// Propagazione vincitori Round→Round
function propagateWinners(bracket) {
  // --- Semifinali di conference (da Round 1) ---
  setSlot(findMatchById(bracket, "LSF1"), "home", getWinner(findMatchById(bracket, "L1")));
  setSlot(findMatchById(bracket, "LSF1"), "away", getWinner(findMatchById(bracket, "L2")));
  setSlot(findMatchById(bracket, "LSF2"), "home", getWinner(findMatchById(bracket, "L3")));
  setSlot(findMatchById(bracket, "LSF2"), "away", getWinner(findMatchById(bracket, "L4")));

  setSlot(findMatchById(bracket, "RSF1"), "home", getWinner(findMatchById(bracket, "R1")));
  setSlot(findMatchById(bracket, "RSF1"), "away", getWinner(findMatchById(bracket, "R2")));
  setSlot(findMatchById(bracket, "RSF2"), "home", getWinner(findMatchById(bracket, "R3")));
  setSlot(findMatchById(bracket, "RSF2"), "away", getWinner(findMatchById(bracket, "R4")));

  // --- Finali di conference (da Semifinali) ---
  setSlot(findMatchById(bracket, "LCF"), "home", getWinner(findMatchById(bracket, "LSF1")));
  setSlot(findMatchById(bracket, "LCF"), "away", getWinner(findMatchById(bracket, "LSF2")));
  setSlot(findMatchById(bracket, "RCF"), "home", getWinner(findMatchById(bracket, "RSF1")));
  setSlot(findMatchById(bracket, "RCF"), "away", getWinner(findMatchById(bracket, "RSF2")));

  // --- Finals (da Finali di conference) ---
  setSlot(findMatchById(bracket, "F"), "home", getWinner(findMatchById(bracket, "LCF")));
  setSlot(findMatchById(bracket, "F"), "away", getWinner(findMatchById(bracket, "RCF")));
}


// ======== RENDER ========
function clearBracket() {
  ["left-round-1","left-round-2","left-round-3","right-round-1","right-round-2","right-round-3","nbafinals","bracket-mobile"]
    .forEach(id => { const el = document.getElementById(id); if (el) el.innerHTML = ""; });
}

function createMatchElement(match) {
  const tpl = document.getElementById("match-template");
  const node = tpl.content.firstElementChild.cloneNode(true);
  node.dataset.series = match.id;

  const teamsEls = $$(".team", node);
  const seedEls  = $$(".seed", node);
  const logoEls  = $$(".logo", node);
  const scoreBoxes = $$(".score-box", node);

  // dati squadra/seed
  seedEls[0].textContent = match.home.seed || "";
  seedEls[1].textContent = match.away.seed || "";

  logoEls[0].alt = match.home.team;
  logoEls[1].alt = match.away.team;

  if (match.home.team && match.home.team !== "TBD") logoEls[0].src = logoSrc(match.home.team);
  if (match.away.team && match.away.team !== "TBD") logoEls[1].src = logoSrc(match.away.team);

  // fallback logo
  logoEls[0].onerror = function () { this.classList.add("hidden"); this.parentElement.classList.add("no-logo"); };
  logoEls[1].onerror = function () { this.classList.add("hidden"); this.parentElement.classList.add("no-logo"); };

  // tooltip
  teamsEls[0].title = match.home.team;
  teamsEls[1].title = match.away.team;

  // ===== punteggi SOLO da RESULTS, non editabili in pagina =====
  const [homeScore, awayScore] = (RESULTS[match.id] ?? [0,0]).map(x => String(x));
  scoreBoxes[0].textContent = homeScore;
  scoreBoxes[1].textContent = awayScore;

  // assicurati che non siano editabili
  scoreBoxes.forEach(b => {
    b.removeAttribute("contenteditable");
    b.style.cursor = "default";
    b.title = "Risultati bloccati (si aggiornano dal file JS)";
  });

  return node;
}

function renderRound(containerId, matches){
  const container = document.getElementById(containerId);
  matches.forEach(m => container.appendChild(createMatchElement(m)));
}

function renderMobileList(bracket){
  const mob = document.getElementById("bracket-mobile");
  const makeGroup = (title, matches) => {
    const wrp = document.createElement("section");
    wrp.className = "round-mobile";
    wrp.innerHTML = `<h3>${title}</h3>`;
    matches.forEach(m => wrp.appendChild(createMatchElement(m)));
    mob.appendChild(wrp);
  };
  mob.innerHTML = "";
  makeGroup("Round 1 — Left",  bracket.r1.left);
  makeGroup("Round 1 — Right", bracket.r1.right);
  makeGroup("Semifinali — Left",  bracket.leftSF);
  makeGroup("Semifinali — Right", bracket.rightSF);
  makeGroup("Finale Conference — Left", bracket.leftCF);
  makeGroup("Finale Conference — Right", bracket.rightCF);
  makeGroup("Finals", bracket.finals);
}

// ======== BUILD & ACTIONS ========
async function buildBracket() {
  try {
    clearBracket();
    const seeds = await loadStandings();
    if (seeds.length < 16) {
      console.warn("Trovate meno di 16 squadre. Ne servono 16.");
    }
    const bracket = makeBracketStructure(seeds);

    // Round 1
    renderRound("left-round-1", bracket.r1.left);
    renderRound("right-round-1", bracket.r1.right);

    // Semifinali (slot vuoti)
    renderRound("left-round-2", bracket.leftSF);
    renderRound("right-round-2", bracket.rightSF);

    // Finali Conference (slot vuoti)
    renderRound("left-round-3", bracket.leftCF);
    renderRound("right-round-3", bracket.rightCF);

    // Finals
    renderRound("nbafinals", bracket.finals);

    // Mobile
    renderMobileList(bracket);

    propagateWinners(bracket);

  } catch (err) {
    console.error("Errore costruzione bracket:", err);
  }
}

// Pulsanti
document.addEventListener("DOMContentLoaded", () => {
  $("#refreshBracket")?.addEventListener("click", buildBracket);
  buildBracket(); // build iniziale
});
