// ======== CONFIG ========
const URL_STANDINGS = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS1pXJCNLgchygyLnGbDEsnIV3QAdPUiLcmgzMAhlzYRivXV4fnoSBW5VwiopwXEMfwk32mvdF3gWZC/pub?output=csv";
const LOGO_BASE_PATH = "img/";
const LOGO_EXT = ".png";

// PUNTEGGI (best-of-5: 0..3)
const SCORES = {
  // Round 1 — Left
  L1:  { home: 3, away: 0 },
  L2:  { home: 0, away: 3 },
  L3:  { home: 0, away: 3 },
  L4:  { home: 3, away: 0 },
  // Round 1 — Right
  R1:  { home: 3, away: 0 },
  R2:  { home: 0, away: 3 },
  R3:  { home: 3, away: 0 },
  R4:  { home: 3, away: 0 },
  // Semifinali
  LSF1:{ home: 3, away: 0 },
  LSF2:{ home: 3, away: 0 },
  RSF1:{ home: 0, away: 3 },
  RSF2:{ home: 3, away: 0 },
  // Finali di Conference
  LCF: { home: 0, away: 3 },
  RCF: { home: 3, away: 0 },
  // Finals
  F:   { home: 3, away: 0 },
};

// ======== UTILS ========
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function urlNoCache(url) {
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}_cb=${Date.now()}`;
}
function isNumeric(v){ return /^\d+$/.test((v ?? "").toString().trim()); }
function logoSrc(team){ return encodeURI(`${LOGO_BASE_PATH}${team}${LOGO_EXT}`); }

// ======== NAVBAR ========
document.addEventListener("DOMContentLoaded", () => {
  const hamburger = $("#hamburger");
  const mainMenu = $("#mainMenu");
  const submenuToggles = $$(".toggle-submenu");

  hamburger?.addEventListener("click", () => {
    mainMenu.classList.toggle("show");
  });
  submenuToggles.forEach(t => {
    t.addEventListener("click", e => {
      e.preventDefault();
      t.closest(".dropdown")?.classList.toggle("show");
    });
  });
});

// ======== PARSE CSV ========
async function loadStandings() {
  const res = await fetch(urlNoCache(URL_STANDINGS));
  const text = await res.text();
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  const entries = [];
  for (const line of lines) {
    const cells = line.split(",");
    const pos = cells[0]?.trim();
    const name = cells[1]?.trim();
    if (!isNumeric(pos) || !name) continue;
    entries.push({ seed: Number(pos), team: name });
  }
  entries.sort((a,b) => a.seed - b.seed);
  return entries.slice(0,16);
}

// ======== BRACKET MODEL ========
function makeRound1Pairs(seeds) {
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
  const leftSF  = [ makeEmptyMatch("LSF1"), makeEmptyMatch("LSF2") ];
  const rightSF = [ makeEmptyMatch("RSF1"), makeEmptyMatch("RSF2") ];
  const leftCF  = [ makeEmptyMatch("LCF") ];
  const rightCF = [ makeEmptyMatch("RCF") ];
  const finals  = [ makeEmptyMatch("F") ];
  return { r1, leftSF, rightSF, leftCF, rightCF, finals };
}

// ======== RENDER ========
function clearBracket() {
  [
    "left-round-1","left-round-2","left-round-3",
    "right-round-1","right-round-2","right-round-3",
    "nbafinals","bracket-mobile"
  ].forEach(id => { const el = document.getElementById(id); if (el) el.innerHTML = ""; });
}

function applyScoresToNode(node, seriesId){
  const [homeBox, awayBox] = node.querySelectorAll(".score-box");
  const s = SCORES?.[seriesId] || { home:0, away:0 };
  homeBox.textContent = String(s.home ?? 0);
  awayBox.textContent = String(s.away ?? 0);
  homeBox.setAttribute("contenteditable","false");
  awayBox.setAttribute("contenteditable","false");
}

function createMatchElement(match) {
  const tpl  = document.getElementById("match-template");
  const node = tpl.content.firstElementChild.cloneNode(true);
  node.dataset.series = match.id;

  const [homeEl, awayEl]     = node.querySelectorAll(".team");
  const [homeSeed, awaySeed] = node.querySelectorAll(".seed");
  const [homeLogo, awayLogo] = node.querySelectorAll(".logo");

  homeSeed.textContent = match.home.seed || "";
  awaySeed.textContent = match.away.seed || "";

  homeLogo.alt = match.home.team;  awayLogo.alt = match.away.team;
  if (match.home.team && match.home.team !== "TBD") homeLogo.src = logoSrc(match.home.team);
  if (match.away.team && match.away.team !== "TBD") awayLogo.src = logoSrc(match.away.team);
  homeLogo.onerror = () => { homeLogo.classList.add("hidden"); homeLogo.parentElement.classList.add("no-logo"); };
  awayLogo.onerror = () => { awayLogo.classList.add("hidden"); awayLogo.parentElement.classList.add("no-logo"); };
  homeEl.title = match.home.team;  awayEl.title = match.away.team;

  applyScoresToNode(node, match.id);
  return node;
}

// --- RENDER HELPERS (aggiungi dopo createMatchElement) ----
function renderRound(containerId, matches){
  const container = document.getElementById(containerId);
  if (!container) return;
  matches.forEach(m => container.appendChild(createMatchElement(m)));
}

function renderMobileList(bracket){
  const mob = document.getElementById("bracket-mobile");
  if (!mob) return;

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


// ======== WIRES (connettori) ========

// Crea (una volta sola) il layer dove disegnare i fili e lo ripulisce
function ensureWireLayer(clear = false) {
  const bracket = document.querySelector('.bracket');
  if (!bracket) return null;

  if (getComputedStyle(bracket).position === 'static') {
    bracket.style.position = 'relative';
  }

  const layers = bracket.querySelectorAll('.wire-layer');
  layers.forEach((n, i) => { if (i > 0) n.remove(); });

  let layer = layers[0];
  if (!layer) {
    layer = document.createElement('div');
    layer.className = 'wire-layer';
    Object.assign(layer.style, {
      position: 'absolute',
      inset: '0',
      pointerEvents: 'none',
      zIndex: '0' // dietro alle card
    });
    bracket.appendChild(layer);
  }

  if (clear) layer.replaceChildren();
  return layer;
}

// Aggiunge un segmento (div) al layer
function addSeg(layer, x, y, w, h) {
  const d = document.createElement('div');
  d.className = 'wire';
  Object.assign(d.style, {
    position: 'absolute',
    left: x + 'px',
    top: y + 'px',
    width: w + 'px',
    height: h + 'px',
    background: 'var(--wire-color)',   // usa la CSS var (emerald)
    borderRadius: (h <= 2 || w <= 2) ? '1px' : '3px'
  });
  layer.appendChild(d);
}

// helper posizioni
const rectOf = el => el.getBoundingClientRect();
const relToBracket = pt => {
  const p = document.querySelector('.bracket').getBoundingClientRect();
  return { x: pt.x - p.left, y: pt.y - p.top };
};

// --- punti medi relativi al contenitore .bracket (serve a drawWires)
const midRight = (el) => {
  const r = el.getBoundingClientRect();
  const p = document.querySelector('.bracket').getBoundingClientRect();
  return { x: r.right - p.left, y: r.top - p.top + r.height / 2 };
};
const midLeft = (el) => {
  const r = el.getBoundingClientRect();
  const p = document.querySelector('.bracket').getBoundingClientRect();
  return { x: r.left - p.left, y: r.top - p.top + r.height / 2 };
};


// ridisegna tutti i connettori con ancore stabili
function drawWires() {
  const layer = ensureWireLayer(true);
  if (!layer) return;

  const H_PAD = 14; // quanto vicino al target mettiamo la verticale
  const STROKE = 3; // spessore linea

  function elbow(fromEl, toEl, nearTo = false) {
    const a = midRight(fromEl);
    const b = midLeft(toEl);

    const x1 = a.x, y1 = a.y;
    const x2 = b.x, y2 = b.y;

    // verticale vicino al target solo quando richiesto
    const xk = nearTo
      ? x2 + (x2 > x1 ? -H_PAD : H_PAD)
      : Math.min(x1, x2) + Math.abs(x2 - x1) / 2;

    // orizzontale from -> xk
    addSeg(layer, x1, y1 - STROKE / 2, Math.max(1, xk - x1), STROKE);
    // verticale xk
    const top = Math.min(y1, y2);
    addSeg(layer, xk - STROKE / 2, top, STROKE, Math.max(1, Math.abs(y2 - y1)));
    // orizzontale xk -> to
    addSeg(layer, xk, y2 - STROKE / 2, Math.max(1, x2 - xk), STROKE);
  }

  const MAP = [
    // LEFT: R1 → R2
    {from:'#left-round-1 .match:nth-of-type(1)', to:'#left-round-2 .match:nth-of-type(1)'},
    {from:'#left-round-1 .match:nth-of-type(2)', to:'#left-round-2 .match:nth-of-type(1)'},
    {from:'#left-round-1 .match:nth-of-type(3)', to:'#left-round-2 .match:nth-of-type(2)'},
    {from:'#left-round-1 .match:nth-of-type(4)', to:'#left-round-2 .match:nth-of-type(2)'},
    // LEFT: R2 → R3 (verticale vicino al target)
    {from:'#left-round-2 .match:nth-of-type(1)', to:'#left-round-3 .match:nth-of-type(1)', nearTo:true},
    {from:'#left-round-2 .match:nth-of-type(2)', to:'#left-round-3 .match:nth-of-type(1)', nearTo:true},

    // RIGHT: R1 → R2
    {from:'#right-round-1 .match:nth-of-type(1)', to:'#right-round-2 .match:nth-of-type(1)'},
    {from:'#right-round-1 .match:nth-of-type(2)', to:'#right-round-2 .match:nth-of-type(1)'},
    {from:'#right-round-1 .match:nth-of-type(3)', to:'#right-round-2 .match:nth-of-type(2)'},
    {from:'#right-round-1 .match:nth-of-type(4)', to:'#right-round-2 .match:nth-of-type(2)'},
    // RIGHT: R2 → R3 (verticale vicino al target)
    {from:'#right-round-2 .match:nth-of-type(1)', to:'#right-round-3 .match:nth-of-type(1)', nearTo:true},
    {from:'#right-round-2 .match:nth-of-type(2)', to:'#right-round-3 .match:nth-of-type(1)', nearTo:true},

    // FINALS
    {from:'#left-round-3  .match:nth-of-type(1)', to:'#nbafinals .match:nth-of-type(1)'},
    {from:'#right-round-3 .match:nth-of-type(1)', to:'#nbafinals .match:nth-of-type(1)'},
  ];

  MAP.forEach(({from, to, nearTo}) => {
    const f = document.querySelector(from);
    const t = document.querySelector(to);
    if (f && t) elbow(f, t, !!nearTo);
  });
}


// ======== BUILD & ACTIONS ========
function clamp03(n){ n = Number(n||0); return Math.max(0, Math.min(3, n)); }
function getScoreFor(seriesId){
  const s = SCORES?.[seriesId] || {};
  return { home: clamp03(s.home), away: clamp03(s.away) };
}
function winnerOf(match, seriesId){
  const s = getScoreFor(seriesId);
  if (s.home >= 3 && s.home > s.away) return match.home;
  if (s.away >= 3 && s.away > s.home) return match.away;
  return null;
}
const TBD = { seed: "", team: "TBD" };

function propagateWinners(bracket){
  // round 1
  const [L1m,L2m,L3m,L4m] = bracket.r1.left;
  const [R1m,R2m,R3m,R4m] = bracket.r1.right;

  // semifinali (left)
  const wL1 = winnerOf(L1m, 'L1'); const wL2 = winnerOf(L2m, 'L2');
  const wL3 = winnerOf(L3m, 'L3'); const wL4 = winnerOf(L4m, 'L4');
  bracket.leftSF[0].home = wL1 || TBD;  bracket.leftSF[0].away = wL2 || TBD; // LSF1
  bracket.leftSF[1].home = wL3 || TBD;  bracket.leftSF[1].away = wL4 || TBD; // LSF2

  // semifinali (right)
  const wR1 = winnerOf(R1m, 'R1'); const wR2 = winnerOf(R2m, 'R2');
  const wR3 = winnerOf(R3m, 'R3'); const wR4 = winnerOf(R4m, 'R4');
  bracket.rightSF[0].home = wR1 || TBD; bracket.rightSF[0].away = wR2 || TBD; // RSF1
  bracket.rightSF[1].home = wR3 || TBD; bracket.rightSF[1].away = wR4 || TBD; // RSF2

  // finali di conference
  const wLSF1 = winnerOf(bracket.leftSF[0],  'LSF1');
  const wLSF2 = winnerOf(bracket.leftSF[1],  'LSF2');
  bracket.leftCF[0].home = wLSF1 || TBD;  bracket.leftCF[0].away = wLSF2 || TBD;

  const wRSF1 = winnerOf(bracket.rightSF[0], 'RSF1');
  const wRSF2 = winnerOf(bracket.rightSF[1], 'RSF2');
  bracket.rightCF[0].home = wRSF1 || TBD; bracket.rightCF[0].away = wRSF2 || TBD;

  // finals
  const wLCF = winnerOf(bracket.leftCF[0],  'LCF');
  const wRCF = winnerOf(bracket.rightCF[0], 'RCF');
  bracket.finals[0].home = wLCF || TBD;
  bracket.finals[0].away = wRCF || TBD;
}

async function buildBracket() {
  try {
    clearBracket();
    const seeds = await loadStandings();
    if (seeds.length < 16) console.warn("Trovate meno di 16 squadre. Ne servono 16.");

    const bracket = makeBracketStructure(seeds);
    propagateWinners(bracket);

    // Render
    renderRound("left-round-1",  bracket.r1.left);
    renderRound("right-round-1", bracket.r1.right);
    renderRound("left-round-2",  bracket.leftSF);
    renderRound("right-round-2", bracket.rightSF);
    renderRound("left-round-3",  bracket.leftCF);
    renderRound("right-round-3", bracket.rightCF);
    renderRound("nbafinals",     bracket.finals);

    renderMobileList(bracket);

    // Disegna i connettori dopo che il DOM è stato aggiornato
    requestAnimationFrame(() => {
      drawWires();
      // secondo pass rapidissimo (immagini che finiscono di caricarsi)
      setTimeout(drawWires, 0);
    });
  } catch (err) {
    console.error("Errore costruzione bracket:", err);
  }
}

// ridisegna i fili al resize
window.addEventListener('resize', () => requestAnimationFrame(drawWires));

// boot
document.addEventListener("DOMContentLoaded", () => {
  $("#refreshBracket")?.addEventListener("click", buildBracket);
  buildBracket();
});
