// ======== CONFIG ========
const URL_STANDINGS = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS1pXJCNLgchygyLnGbDEsnIV3QAdPUiLcmgzMAhlzYRivXV4fnoSBW5VwiopwXEMfwk32mvdF3gWZC/pub?output=csv";
const LOGO_BASE_PATH = "img/";       // cambia se necessario
const LOGO_EXT = ".png";               // .png o .jpg in base ai tuoi file
const SCORES = {
  // Round 1 — Left
  L1:  { home: 0, away: 0 },
  L2:  { home: 0, away: 0 },
  L3:  { home: 0, away: 0 },
  L4:  { home: 0, away: 0 },
  // Round 1 — Right
  R1:  { home: 0, away: 0 },
  R2:  { home: 0, away: 0 },
  R3:  { home: 0, away: 0 },
  R4:  { home: 0, away: 0 },
  // Semifinali
  LSF1:{ home: 0, away: 0 },
  LSF2:{ home: 0, away: 0 },
  RSF1:{ home: 0, away: 0 },
  RSF2:{ home: 0, away: 0 },
  // Finali di Conference
  LCF: { home: 0, away: 0 },
  RCF: { home: 0, away: 0 },
  // Finals
  F:   { home: 0, away: 0 },
};
const SCORE_DEFAULT = "0";

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

// ======== RENDER ========
function clearBracket() {
  ["left-round-1","left-round-2","left-round-3","right-round-1","right-round-2","right-round-3","nbafinals","bracket-mobile"]
    .forEach(id => { const el = document.getElementById(id); if (el) el.innerHTML = ""; });
}

function createMatchElement(match) {
  const tpl = document.getElementById("match-template");
  const node = tpl.content.firstElementChild.cloneNode(true);
  node.dataset.series = match.id;

  const [homeEl, awayEl] = $$(".team", node);
  const [homeSeed, awaySeed] = $$(".seed", node);
  const [homeLogo, awayLogo] = $$(".logo", node);
  const [homeBox, awayBox]   = $$(".score-box", node);

  // dati base
  homeSeed.textContent = match.home.seed || "";
  awaySeed.textContent = match.away.seed || "";

  homeLogo.alt = match.home.team;
  awayLogo.alt = match.away.team;

  if (match.home.team && match.home.team !== "TBD") homeLogo.src = logoSrc(match.home.team);
  if (match.away.team && match.away.team !== "TBD") awayLogo.src = logoSrc(match.away.team);

  homeLogo.onerror = () => { homeLogo.classList.add("hidden"); homeLogo.parentElement.classList.add("no-logo"); };
  awayLogo.onerror = () => { awayLogo.classList.add("hidden"); awayLogo.parentElement.classList.add("no-logo"); };

  homeEl.title = match.home.team;
  awayEl.title = match.away.team;

  // ===== punteggio singolo per box (0..3) =====
  const keyHome   = `seriesScore:${match.id}:home`;
  const keyAway   = `seriesScore:${match.id}:away`;
  const legacyKey = `seriesScore:${match.id}`; // per retrocompatibilità "0-0"

  function clamp03(v){
    const n = parseInt(String(v).replace(/\D/g,""), 10);
    if (isNaN(n)) return "0";
    return String(Math.max(0, Math.min(3, n)));
  }

  // carica (prima chiavi nuove, poi fallback al legacy "h-a")
  let hVal = localStorage.getItem(keyHome);
  let aVal = localStorage.getItem(keyAway);

  if (hVal == null || aVal == null) {
    const legacy = localStorage.getItem(legacyKey);
    if (legacy && legacy.includes("-")) {
      const [h,a] = legacy.split("-").map(clamp03);
      if (hVal == null) hVal = h;
      if (aVal == null) aVal = a;
    }
  }

  homeBox.textContent = clamp03(hVal ?? SCORE_DEFAULT);
  awayBox.textContent = clamp03(aVal ?? SCORE_DEFAULT);

  function saveSide(box, key){
    const val = clamp03(box.textContent);
    box.textContent = val;                 // normalizza subito
    localStorage.setItem(key, val);        // salva singolo numero
  }

  [[homeBox, keyHome], [awayBox, keyAway]].forEach(([box, key]) => {
    box.addEventListener("input", () => saveSide(box, key));
    box.addEventListener("blur",  () => saveSide(box, key));
    box.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); box.blur(); } });
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

  } catch (err) {
    console.error("Errore costruzione bracket:", err);
  }
}

// Pulsanti
document.addEventListener("DOMContentLoaded", () => {
  $("#refreshBracket")?.addEventListener("click", buildBracket);
  buildBracket(); // build iniziale
});
