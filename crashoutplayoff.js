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
    "finals-top","finals-bottom",      // <— aggiunti
    "bracket-mobile"
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

function createFinalSide(teamObj, side /* 'home' | 'away' */, seriesId){
  // Parto dalla card standard così ho gli stessi stili
  const node = createMatchElement({
    id: seriesId,
    home: side === 'home' ? teamObj : { seed:"", team:"TBD" },
    away: side === 'away' ? teamObj : { seed:"", team:"TBD" },
  });

  // tengo solo la riga della squadra giusta
  const rows = node.querySelectorAll('.team');
  if (side === 'home') rows[1]?.remove();
  else rows[0]?.remove();

  node.classList.add('one-team');

  // sistema il punteggio: prendi solo quello del lato giusto
  const s = getScoreFor(seriesId);
  const scoreBox = node.querySelector('.score-box');
  scoreBox.textContent = String(side === 'home' ? s.home : s.away);

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
      zIndex: '0'
    });
    // PRIMO figlio: sta sempre dietro
    bracket.insertBefore(layer, bracket.firstChild);
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
    background: 'var(--wire-color)',
    borderRadius: (h <= 2 || w <= 2) ? '1px' : '3px'
  });
  layer.appendChild(d);
}

// ridisegna tutti i connettori con ancore stabili
function drawWires() {
  const layer = ensureWireLayer(true);
  if (!layer) return;

  const H_PAD  = 14;
  const STROKE = 3;

  const container = document.querySelector('.cup-container');
  const bracket   = document.querySelector('.bracket');

  // gomito tra due card, coordinate relative alla .bracket + scroll del container
  function elbow(fromEl, toEl, nearTo = false) {
    const p  = bracket.getBoundingClientRect();
    const fr = fromEl.getBoundingClientRect();
    const tr = toEl.getBoundingClientRect();
    const sx = container.scrollLeft;
    const sy = container.scrollTop;

    let ax = fr.right - p.left + sx;
    let ay = fr.top   - p.top  + sy + fr.height / 2;
    let bx = tr.left  - p.left + sx;
    let by = tr.top   - p.top  + sy + tr.height / 2;

    // se il FROM è a destra del TO, inverti i bordi
    if (ax > bx) { ax = fr.left - p.left + sx; bx = tr.right - p.left + sx; }

    const dir = (bx > ax) ? 1 : -1;
    const xk = nearTo ? (bx - dir * H_PAD) : (ax + (bx - ax) / 2);

    addSeg(layer, Math.min(ax, xk), ay - STROKE / 2, Math.abs(xk - ax), STROKE);
    addSeg(layer, xk - STROKE / 2, Math.min(ay, by), STROKE, Math.abs(by - ay));
    addSeg(layer, Math.min(xk, bx), by - STROKE / 2, Math.abs(bx - xk), STROKE);
  }

  const MAP = [
    // LEFT: R1 → R2
    {from:'#left-round-1 .match:nth-of-type(1)', to:'#left-round-2 .match:nth-of-type(1)'},
    {from:'#left-round-1 .match:nth-of-type(2)', to:'#left-round-2 .match:nth-of-type(1)'},
    {from:'#left-round-1 .match:nth-of-type(3)', to:'#left-round-2 .match:nth-of-type(2)'},
    {from:'#left-round-1 .match:nth-of-type(4)', to:'#left-round-2 .match:nth-of-type(2)'},
    // LEFT: R2 → R3
    {from:'#left-round-2 .match:nth-of-type(1)', to:'#left-round-3 .match:nth-of-type(1)', nearTo:true},
    {from:'#left-round-2 .match:nth-of-type(2)', to:'#left-round-3 .match:nth-of-type(1)', nearTo:true},

    // RIGHT: R1 → R2
    {from:'#right-round-1 .match:nth-of-type(1)', to:'#right-round-2 .match:nth-of-type(1)'},
    {from:'#right-round-1 .match:nth-of-type(2)', to:'#right-round-2 .match:nth-of-type(1)'},
    {from:'#right-round-1 .match:nth-of-type(3)', to:'#right-round-2 .match:nth-of-type(2)'},
    {from:'#right-round-1 .match:nth-of-type(4)', to:'#right-round-2 .match:nth-of-type(2)'},
    // RIGHT: R2 → R3
    {from:'#right-round-2 .match:nth-of-type(1)', to:'#right-round-3 .match:nth-of-type(1)', nearTo:true},
    {from:'#right-round-2 .match:nth-of-type(2)', to:'#right-round-3 .match:nth-of-type(1)', nearTo:true},

    // FINALS
    {from:'#left-round-3  .match:nth-of-type(1)', to:'#finals-top .match:nth-of-type(1)'},
    {from:'#right-round-3 .match:nth-of-type(1)', to:'#finals-bottom .match:nth-of-type(1)'}
  ];

  MAP.forEach(({from, to, nearTo}) => {
    const f = document.querySelector(from);
    const t = document.querySelector(to);
    if (f && t) elbow(f, t, !!nearTo);
  });
}

// --- Layer e ridisegno reattivo (una volta sola) ---
const container = document.querySelector('.cup-container');
const bracket   = document.querySelector('.bracket');

function sizeWireLayer(){
  const layer = ensureWireLayer(false);
  if (!layer) return;
  layer.style.width  = bracket.scrollWidth + 'px';
  layer.style.height = bracket.scrollHeight + 'px';
}

let rafId;
function scheduleRedraw(){
  cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(() => {
    sizeWireLayer();
    drawWires();
  });
}

// listener unici
window.addEventListener('resize', scheduleRedraw, {passive:true});
window.addEventListener('orientationchange', scheduleRedraw);
container.addEventListener('scroll', scheduleRedraw, {passive:true});
document.querySelectorAll('img').forEach(img=>{
  if(!img.complete) img.addEventListener('load', scheduleRedraw, {once:true});
});
(document.fonts?.ready || Promise.resolve()).then(scheduleRedraw);
window.addEventListener('load', scheduleRedraw);

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

function propagateWinners(bracketData){
  const [L1m,L2m,L3m,L4m] = bracketData.r1.left;
  const [R1m,R2m,R3m,R4m] = bracketData.r1.right;

  const wL1 = winnerOf(L1m, 'L1'); const wL2 = winnerOf(L2m, 'L2');
  const wL3 = winnerOf(L3m, 'L3'); const wL4 = winnerOf(L4m, 'L4');
  bracketData.leftSF[0].home = wL1 || TBD;  bracketData.leftSF[0].away = wL2 || TBD;
  bracketData.leftSF[1].home = wL3 || TBD;  bracketData.leftSF[1].away = wL4 || TBD;

  const wR1 = winnerOf(R1m, 'R1'); const wR2 = winnerOf(R2m, 'R2');
  const wR3 = winnerOf(R3m, 'R3'); const wR4 = winnerOf(R4m, 'R4');
  bracketData.rightSF[0].home = wR1 || TBD; bracketData.rightSF[0].away = wR2 || TBD;
  bracketData.rightSF[1].home = wR3 || TBD; bracketData.rightSF[1].away = wR4 || TBD;

  const wLSF1 = winnerOf(bracketData.leftSF[0],  'LSF1');
  const wLSF2 = winnerOf(bracketData.leftSF[1],  'LSF2');
  bracketData.leftCF[0].home = wLSF1 || TBD;  bracketData.leftCF[0].away = wLSF2 || TBD;

  const wRSF1 = winnerOf(bracketData.rightSF[0], 'RSF1');
  const wRSF2 = winnerOf(bracketData.rightSF[1], 'RSF2');
  bracketData.rightCF[0].home = wRSF1 || TBD; bracketData.rightCF[0].away = wRSF2 || TBD;

  const wLCF = winnerOf(bracketData.leftCF[0],  'LCF');
  const wRCF = winnerOf(bracketData.rightCF[0], 'RCF');
  bracketData.finals[0].home = wLCF || TBD;
  bracketData.finals[0].away = wRCF || TBD;
}

async function buildBracket() {
  try {
    clearBracket();
    const seeds = await loadStandings();
    if (seeds.length < 16) console.warn("Trovate meno di 16 squadre. Ne servono 16.");

    const bracketData = makeBracketStructure(seeds);
    propagateWinners(bracketData);

    // Round 1 / 2 / 3
    renderRound("left-round-1",  bracketData.r1.left);
    renderRound("right-round-1", bracketData.r1.right);
    renderRound("left-round-2",  bracketData.leftSF);
    renderRound("right-round-2", bracketData.rightSF);
    renderRound("left-round-3",  bracketData.leftCF);
    renderRound("right-round-3", bracketData.rightCF);

    // Finals split
    const f = bracketData.finals[0];
    document.getElementById("finals-top")
      .appendChild(createFinalSide(f.home, "home", "F"));
    document.getElementById("finals-bottom")
      .appendChild(createFinalSide(f.away, "away", "F"));

    // Mobile
    renderMobileList(bracketData);

    // Connettori
    scheduleRedraw();

  } catch (err) {
    console.error("Errore costruzione bracket:", err);
  }
}

// avvio pagina
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('refreshBracket')?.addEventListener('click', buildBracket);
  buildBracket();
});
