// ======== CONFIG ========
const URL_STANDINGS = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS1pXJCNLgchygyLnGbDEsnIV3QAdPUiLcmgzMAhlzYRivXV4fnoSBW5VwiopwXEMfwk32mvdF3gWZC/pub?output=csv";
const LOGO_BASE_PATH = "img/";   // cambia se necessario
const LOGO_EXT = ".png";         // .png o .jpg in base ai tuoi file
const SCORE_DEFAULT = "0";

// ======== UTILS ========
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function urlNoCache(url) {
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}_cb=${Date.now()}`;
}
function isNumeric(v) {
  return /^\d+$/.test((v ?? "").toString().trim());
}
function logoSrc(team) {
  const file = `${LOGO_BASE_PATH}${team}${LOGO_EXT}`;
  return encodeURI(file);
}

// ======== NAVBAR (come index) ========
document.addEventListener("DOMContentLoaded", function () {
  const hamburger = $("#hamburger");
  const mainMenu = $("#mainMenu");
  const submenuToggles = $$(".toggle-submenu");

  if (hamburger) {
    hamburger.addEventListener("click", function () {
      mainMenu && mainMenu.classList.toggle("show");
    });
  }

  submenuToggles.forEach(function (toggle) {
    toggle.addEventListener("click", function (e) {
      e.preventDefault();
      const parent = this.closest(".dropdown");
      if (parent) parent.classList.toggle("show");
    });
  });
});

// ======== PARSE CSV (A=posizione, B=nome) ========
async function loadStandings() {
  const res = await fetch(urlNoCache(URL_STANDINGS));
  const text = await res.text();
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  const entries = [];
  for (const line of lines) {
    const cells = line.split(",");
    const pos = cells[0] ? cells[0].trim() : "";
    const name = cells[1] ? cells[1].trim() : "";

    if (!isNumeric(pos)) continue;
    if (!name) continue;

    entries.push({ seed: Number(pos), team: name });
  }

  entries.sort((a, b) => a.seed - b.seed);
  return entries.slice(0, 16);
}

// ======== BRACKET MODEL ========
function makeRound1Pairs(seeds) {
  const bySeed = Object.fromEntries(seeds.map(x => [x.seed, x]));
  return {
    left: [
      { id: "L1", home: bySeed[1], away: bySeed[16] },
      { id: "L2", home: bySeed[8], away: bySeed[9] },
      { id: "L3", home: bySeed[5], away: bySeed[12] },
      { id: "L4", home: bySeed[4], away: bySeed[13] }
    ],
    right: [
      { id: "R1", home: bySeed[3], away: bySeed[14] },
      { id: "R2", home: bySeed[6], away: bySeed[11] },
      { id: "R3", home: bySeed[7], away: bySeed[10] },
      { id: "R4", home: bySeed[2], away: bySeed[15] }
    ]
  };
}

function makeEmptyMatch(id) {
  return { id, home: { seed: "", team: "TBD" }, away: { seed: "", team: "TBD" } };
}

function makeBracketStructure(seeds) {
  const r1 = makeRound1Pairs(seeds);
  const leftSF = [ makeEmptyMatch("LSF1"), makeEmptyMatch("LSF2") ];
  const rightSF = [ makeEmptyMatch("RSF1"), makeEmptyMatch("RSF2") ];
  const leftCF = [ makeEmptyMatch("LCF") ];
  const rightCF = [ makeEmptyMatch("RCF") ];
  const finals = [ makeEmptyMatch("F") ];
  return { r1, leftSF, rightSF, leftCF, rightCF, finals };
}

// ======== RENDER ========
function clearBracket() {
  ["round-1","round-2","round-3","round-final","bracket-mobile"]
    .forEach(id => { const el = document.getElementById(id); if (el) el.innerHTML = ""; });
}

function createMatchElement(match) {
  const tpl = document.getElementById("match-template");
  const node = tpl.content.firstElementChild.cloneNode(true);
  node.dataset.series = match.id;

  const teamsEls = $$(".team", node);
  const seedEls = $$(".seed", node);
  const logoEls = $$(".logo", node);
  const scoreBoxes = $$(".score-box", node);

  // dati
  seedEls[0].textContent = match.home.seed || "";
  seedEls[1].textContent = match.away.seed || "";

  // logo + alt
  logoEls[0].alt = match.home.team;
  logoEls[1].alt = match.away.team;

  if (match.home.team && match.home.team !== "TBD") {
    logoEls[0].src = logoSrc(match.home.team);
  }
  if (match.away.team && match.away.team !== "TBD") {
    logoEls[1].src = logoSrc(match.away.team);
  }

  // fallback logo
  logoEls[0].onerror = function () {
    this.classList.add("hidden");
    this.parentElement.classList.add("no-logo");
  };
  logoEls[1].onerror = function () {
    this.classList.add("hidden");
    this.parentElement.classList.add("no-logo");
  };

  // title tooltip
  teamsEls[0].title = match.home.team;
  teamsEls[1].title = match.away.team;

  // SCORE (un box per squadra, salvato in localStorage)
  scoreBoxes.forEach((b, idx) => {
    const key = `seriesScore:${match.id}:${idx}`; // 0=home, 1=away
    const saved = localStorage.getItem(key) || SCORE_DEFAULT;
    b.textContent = saved;

    b.addEventListener("input", () => {
      let val = b.textContent.trim().replace(/\D+/g, "");
      if (val === "") val = SCORE_DEFAULT;
      const num = Math.max(0, Math.min(3, parseInt(val, 10)));
      b.textContent = String(isNaN(num) ? SCORE_DEFAULT : num);
      localStorage.setItem(key, b.textContent);
    });

    b.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); b.blur(); }
    });
  });

  return node;
}

function renderRound(containerId, matches) {
  const container = document.getElementById(containerId);
  matches.forEach(m => container.appendChild(createMatchElement(m)));
}

function renderMobileList(bracket){
  const mob = document.getElementById("bracket-mobile");
  mob.innerHTML = "";

  const add = (title, roundKey, arr) => {
    const wrp = document.createElement("section");
    wrp.className = "round-mobile";
    wrp.dataset.round = roundKey; // r1, r2, r3, rf (serve al CSS)
    wrp.innerHTML = `<h3>${title}</h3>`;
    arr.forEach(m => wrp.appendChild(createMatchElement(m)));
    mob.appendChild(wrp);
  };

  // Unisco left+right per ogni round
  add("Round 1", "r1", [...bracket.r1.left, ...bracket.r1.right]);
  add("Semifinali", "r2", [...bracket.leftSF, ...bracket.rightSF]);
  add("Finale di Conference", "r3", [...bracket.leftCF, ...bracket.rightCF]);
  add("Finals", "rf", bracket.finals);
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

// Round 1 (8 serie): unisco left+right
renderRound("round-1", [...bracket.r1.left, ...bracket.r1.right]);

// Round 2 (4 serie): unisco le due semifinali di conference
renderRound("round-2", [...bracket.leftSF, ...bracket.rightSF]);

// Round 3 (2 serie): finali di conference
renderRound("round-3", [...bracket.leftCF, ...bracket.rightCF]);

// Finals (1 serie)
renderRound("round-final", bracket.finals);

// Mobile (puoi anche lasciarlo uguale)
renderMobileList(bracket);

  } catch (err) {
    console.error("Errore costruzione bracket:", err);
  }
}

// Pulsanti
document.addEventListener("DOMContentLoaded", function () {
  const refreshBtn = $("#refreshBracket");
  if (refreshBtn) refreshBtn.addEventListener("click", buildBracket);

  // build iniziale
  buildBracket();
});

