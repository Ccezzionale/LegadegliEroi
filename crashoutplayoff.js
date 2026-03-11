// ======== CONFIG ========
const URL_STANDINGS = "https://docs.google.com/spreadsheets/d/1xPual_RkDPsnAW1Gy_ZCcVlAUATtquTbbym3NPk8UfI/export?format=csv&gid=1127607135";
const LOGO_BASE_PATH = "img/";
const LOGO_EXT = ".png";

// PUNTEGGI (best-of-5: 0..3)
const SCORES = {
  // Round 1 — Left
  L1:   { home: 3, away: 2 },
  L2:   { home: 3, away: 2 },
  L3:   { home: 3, away: 1 },
  L4:   { home: 3, away: 1 },

  // Round 1 — Right
  R1:   { home: 3, away: 1 },
  R2:   { home: 3, away: 2 },
  R3:   { home: 3, away: 1 },
  R4:   { home: 3, away: 2 },

  // Semifinali
  LSF1: { home: 3, away: 2 },
  LSF2: { home: 3, away: 0 },
  RSF1: { home: 0, away: 3 },
  RSF2: { home: 2, away: 3 },

  // Finali di conference
  LCF:  { home: 1, away: 3 },
  RCF:  { home: 3, away: 1 },

  // Finals
  F:    { home: 1, away: 3 },
};

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
  return encodeURI(`${LOGO_BASE_PATH}${team}${LOGO_EXT}`);
}

function clamp03(n) {
  n = Number(n || 0);
  return Math.max(0, Math.min(3, n));
}

function getScoreFor(seriesId) {
  const s = SCORES?.[seriesId] || {};
  return { home: clamp03(s.home), away: clamp03(s.away) };
}

function safeTeamName(team) {
  return team && team !== "TBD" ? team : "TBD";
}

// ======== NAVBAR ========
document.addEventListener("DOMContentLoaded", () => {
  const hamburger = $("#hamburger");
  const mainMenu = $("#mainMenu");
  const submenuToggles = $$(".toggle-submenu");

  hamburger?.addEventListener("click", () => {
    mainMenu?.classList.toggle("show");
  });

  submenuToggles.forEach(toggle => {
    toggle.addEventListener("click", e => {
      e.preventDefault();
      toggle.closest(".dropdown")?.classList.toggle("show");
    });
  });
});

// ======== PARSE CSV ========
async function loadStandings() {
  const res = await fetch(urlNoCache(URL_STANDINGS));
  const text = await res.text();

  const lines = text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  const entries = [];

  for (const line of lines) {
    const cells = line.split(",");
    const pos = cells[0]?.trim();
    const name = cells[1]?.trim();

    if (!isNumeric(pos) || !name) continue;

    entries.push({
      seed: Number(pos),
      team: name
    });
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
      { id: "L4", home: bySeed[4], away: bySeed[13] },
    ],
    right: [
      { id: "R1", home: bySeed[3], away: bySeed[14] },
      { id: "R2", home: bySeed[6], away: bySeed[11] },
      { id: "R3", home: bySeed[7], away: bySeed[10] },
      { id: "R4", home: bySeed[2], away: bySeed[15] },
    ]
  };
}

function makeEmptyMatch(id) {
  return {
    id,
    home: { seed: "", team: "TBD" },
    away: { seed: "", team: "TBD" }
  };
}

function makeBracketStructure(seeds) {
  const r1 = makeRound1Pairs(seeds);

  return {
    r1,
    leftSF:  [makeEmptyMatch("LSF1"), makeEmptyMatch("LSF2")],
    rightSF: [makeEmptyMatch("RSF1"), makeEmptyMatch("RSF2")],
    leftCF:  [makeEmptyMatch("LCF")],
    rightCF: [makeEmptyMatch("RCF")],
    finals:  [makeEmptyMatch("F")]
  };
}

// ======== WINNERS ========
const TBD = { seed: "", team: "TBD" };

function winnerOf(match, seriesId) {
  const s = getScoreFor(seriesId);

  if (s.home >= 3 && s.home > s.away) return match.home;
  if (s.away >= 3 && s.away > s.home) return match.away;

  return null;
}

function propagateWinners(bracket) {
  const [L1m, L2m, L3m, L4m] = bracket.r1.left;
  const [R1m, R2m, R3m, R4m] = bracket.r1.right;

  const wL1 = winnerOf(L1m, "L1");
  const wL2 = winnerOf(L2m, "L2");
  const wL3 = winnerOf(L3m, "L3");
  const wL4 = winnerOf(L4m, "L4");

  bracket.leftSF[0].home = wL1 || TBD;
  bracket.leftSF[0].away = wL2 || TBD;
  bracket.leftSF[1].home = wL3 || TBD;
  bracket.leftSF[1].away = wL4 || TBD;

  const wR1 = winnerOf(R1m, "R1");
  const wR2 = winnerOf(R2m, "R2");
  const wR3 = winnerOf(R3m, "R3");
  const wR4 = winnerOf(R4m, "R4");

  bracket.rightSF[0].home = wR1 || TBD;
  bracket.rightSF[0].away = wR2 || TBD;
  bracket.rightSF[1].home = wR3 || TBD;
  bracket.rightSF[1].away = wR4 || TBD;

  const wLSF1 = winnerOf(bracket.leftSF[0], "LSF1");
  const wLSF2 = winnerOf(bracket.leftSF[1], "LSF2");
  bracket.leftCF[0].home = wLSF1 || TBD;
  bracket.leftCF[0].away = wLSF2 || TBD;

  const wRSF1 = winnerOf(bracket.rightSF[0], "RSF1");
  const wRSF2 = winnerOf(bracket.rightSF[1], "RSF2");
  bracket.rightCF[0].home = wRSF1 || TBD;
  bracket.rightCF[0].away = wRSF2 || TBD;

  const wLCF = winnerOf(bracket.leftCF[0], "LCF");
  const wRCF = winnerOf(bracket.rightCF[0], "RCF");
  bracket.finals[0].home = wLCF || TBD;
  bracket.finals[0].away = wRCF || TBD;
}

// ======== CLEAR ========
function clearBracket() {
  [
    "left-round-1",
    "left-round-2",
    "left-round-3",
    "right-round-1",
    "right-round-2",
    "right-round-3",
    "finals-top",
    "finals-bottom",
    "bracket-mobile"
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = "";
  });
}

// ======== MATCH UI ========
function applyScoresToNode(node, seriesId) {
  const scoreBoxes = node.querySelectorAll(".score-box");
  const s = getScoreFor(seriesId);

  if (scoreBoxes[0]) scoreBoxes[0].textContent = String(s.home);
  if (scoreBoxes[1]) scoreBoxes[1].textContent = String(s.away);

  scoreBoxes.forEach(box => {
    box.setAttribute("contenteditable", "false");
  });
}

function applyWinnerStyles(node, seriesId) {
  const s = getScoreFor(seriesId);
  const teams = node.querySelectorAll(".team");
  const homeEl = teams[0];
  const awayEl = teams[1];

  if (homeEl && s.home >= 3 && s.home > s.away) {
    homeEl.classList.add("is-winner");
    node.classList.add("winner-home");
  }

  if (awayEl && s.away >= 3 && s.away > s.home) {
    awayEl.classList.add("is-winner");
    node.classList.add("winner-away");
  }
}

function createMatchElement(match) {
  const tpl = document.getElementById("match-template");
  const node = tpl.content.firstElementChild.cloneNode(true);
  node.dataset.series = match.id;

  const [homeEl, awayEl] = node.querySelectorAll(".team");
  const [homeSeed, awaySeed] = node.querySelectorAll(".seed");
  const [homeLogo, awayLogo] = node.querySelectorAll(".logo");
  const [homeName, awayName] = node.querySelectorAll(".team-name");

  homeSeed.textContent = match.home.seed || "";
  awaySeed.textContent = match.away.seed || "";

  homeLogo.alt = safeTeamName(match.home.team);
  awayLogo.alt = safeTeamName(match.away.team);

  homeName.textContent = safeTeamName(match.home.team);
  awayName.textContent = safeTeamName(match.away.team);

  if (match.home.team && match.home.team !== "TBD") {
    homeLogo.src = logoSrc(match.home.team);
  }

  if (match.away.team && match.away.team !== "TBD") {
    awayLogo.src = logoSrc(match.away.team);
  }

  homeLogo.onerror = () => {
    homeLogo.classList.add("hidden");
    homeLogo.parentElement.classList.add("no-logo");
  };

  awayLogo.onerror = () => {
    awayLogo.classList.add("hidden");
    awayLogo.parentElement.classList.add("no-logo");
  };

  homeEl.title = safeTeamName(match.home.team);
  awayEl.title = safeTeamName(match.away.team);

  applyScoresToNode(node, match.id);
  applyWinnerStyles(node, match.id);

  return node;
}

function createFinalSide(teamObj, side, seriesId) {
  const node = createMatchElement({
    id: seriesId,
    home: side === "home" ? teamObj : { seed: "", team: "TBD" },
    away: side === "away" ? teamObj : { seed: "", team: "TBD" }
  });

  const rows = node.querySelectorAll(".team");

  if (side === "home") {
    rows[1]?.remove();
  } else {
    rows[0]?.remove();
  }

  node.classList.add("one-team");

  const scoreBox = node.querySelector(".score-box");
  const s = getScoreFor(seriesId);

  if (scoreBox) {
    scoreBox.textContent = String(side === "home" ? s.home : s.away);
  }

  const remainingTeam = node.querySelector(".team");
  if (remainingTeam) {
    const homeWon = s.home >= 3 && s.home > s.away;
    const awayWon = s.away >= 3 && s.away > s.home;

    if ((side === "home" && homeWon) || (side === "away" && awayWon)) {
      remainingTeam.classList.add("is-winner");
      node.classList.add("winner-both");
    }
  }

  return node;
}

// ======== RENDER ========
function renderRound(containerId, matches) {
  const container = document.getElementById(containerId);
  if (!container) return;

  matches.forEach(match => {
    container.appendChild(createMatchElement(match));
  });
}

function createMobileTrophyHero() {
  const hero = document.createElement("section");
  hero.className = "mobile-trophy-hero";
  hero.innerHTML = `
    <div class="mobile-trophy-kicker">Crash Out Cup</div>
    <div class="mobile-trophy-image" aria-hidden="true"></div>
    <h2 class="mobile-trophy-title">Playoff</h2>
    <div class="mobile-trophy-subtitle">Knockout Stage</div>
  `;
  return hero;
}

function renderMobileList(bracket) {
  const mob = document.getElementById("bracket-mobile");
  if (!mob) return;

  const makeGroup = (title, matches, extraClass = "") => {
    const wrp = document.createElement("section");
    wrp.className = `round-mobile ${extraClass}`.trim();
    wrp.innerHTML = `<h3>${title}</h3>`;

    matches.forEach(match => {
      wrp.appendChild(createMatchElement(match));
    });

    mob.appendChild(wrp);
  };

  mob.innerHTML = "";
  mob.appendChild(createMobileTrophyHero());

  makeGroup("Ottavi di Finale", bracket.r1.left);
  makeGroup("Ottavi di Finale", bracket.r1.right);
  makeGroup("Quarti di Finale", bracket.leftSF);
  makeGroup("Quarti di Finale", bracket.rightSF);
  makeGroup("Semifinali", [...bracket.leftCF, ...bracket.rightCF]);

  const finalSection = document.createElement("section");
  finalSection.className = "round-mobile round-mobile-finale";
  finalSection.innerHTML = `
    <h3>Finale</h3>
    <div class="mobile-final-hero">
      <div class="mini-trophy" aria-hidden="true"></div>
      <div class="mini-caption">Crash Out Cup Finals</div>
    </div>
  `;
  bracket.finals.forEach(match => finalSection.appendChild(createMatchElement(match)));
  mob.appendChild(finalSection);
}

// ======== WIRES ========
function ensureWireLayer(clear = false) {
  const bracket = document.querySelector(".bracket");
  if (!bracket) return null;

  if (getComputedStyle(bracket).position === "static") {
    bracket.style.position = "relative";
  }

  const layers = bracket.querySelectorAll(".wire-layer");
  layers.forEach((layer, index) => {
    if (index > 0) layer.remove();
  });

  let layer = layers[0];

  if (!layer) {
    layer = document.createElement("div");
    layer.className = "wire-layer";
    Object.assign(layer.style, {
      position: "absolute",
      inset: "0",
      pointerEvents: "none",
      zIndex: "0"
    });
    bracket.appendChild(layer);
  }

  if (clear) layer.replaceChildren();
  return layer;
}

function addSeg(layer, x, y, w, h) {
  const seg = document.createElement("div");
  seg.className = "wire";

  Object.assign(seg.style, {
    position: "absolute",
    left: `${x}px`,
    top: `${y}px`,
    width: `${w}px`,
    height: `${h}px`,
    background: "var(--wire-color)",
    borderRadius: (h <= 3 || w <= 3) ? "2px" : "6px"
  });

  layer.appendChild(seg);
}

function drawWires() {
  if (window.innerWidth <= 768) return;

  const layer = ensureWireLayer(true);
  if (!layer) return;

  const bracketRect = document.querySelector(".bracket").getBoundingClientRect();
  const H_PAD = 16;
  const STROKE = 4;

  function elbow(fromEl, toEl, nearTo = false) {
    const fr = fromEl.getBoundingClientRect();
    const tr = toEl.getBoundingClientRect();

    let ax = fr.right - bracketRect.left;
    let ay = fr.top - bracketRect.top + fr.height / 2;

    let bx = tr.left - bracketRect.left;
    let by = tr.top - bracketRect.top + tr.height / 2;

    if (ax > bx) {
      ax = fr.left - bracketRect.left;
      bx = tr.right - bracketRect.left;
    }

    const dir = (bx > ax) ? 1 : -1;
    const xk = nearTo ? (bx - dir * H_PAD) : (ax + (bx - ax) / 2);

    addSeg(layer, Math.min(ax, xk), ay - STROKE / 2, Math.abs(xk - ax), STROKE);
    addSeg(layer, xk - STROKE / 2, Math.min(ay, by), STROKE, Math.abs(by - ay));
    addSeg(layer, Math.min(xk, bx), by - STROKE / 2, Math.abs(bx - xk), STROKE);
  }

  const MAP = [
    { from: "#left-round-1 .match:nth-of-type(1)", to: "#left-round-2 .match:nth-of-type(1)" },
    { from: "#left-round-1 .match:nth-of-type(2)", to: "#left-round-2 .match:nth-of-type(1)" },
    { from: "#left-round-1 .match:nth-of-type(3)", to: "#left-round-2 .match:nth-of-type(2)" },
    { from: "#left-round-1 .match:nth-of-type(4)", to: "#left-round-2 .match:nth-of-type(2)" },

    { from: "#left-round-2 .match:nth-of-type(1)", to: "#left-round-3 .match:nth-of-type(1)", nearTo: true },
    { from: "#left-round-2 .match:nth-of-type(2)", to: "#left-round-3 .match:nth-of-type(1)", nearTo: true },

    { from: "#right-round-1 .match:nth-of-type(1)", to: "#right-round-2 .match:nth-of-type(1)" },
    { from: "#right-round-1 .match:nth-of-type(2)", to: "#right-round-2 .match:nth-of-type(1)" },
    { from: "#right-round-1 .match:nth-of-type(3)", to: "#right-round-2 .match:nth-of-type(2)" },
    { from: "#right-round-1 .match:nth-of-type(4)", to: "#right-round-2 .match:nth-of-type(2)" },

    { from: "#right-round-2 .match:nth-of-type(1)", to: "#right-round-3 .match:nth-of-type(1)", nearTo: true },
    { from: "#right-round-2 .match:nth-of-type(2)", to: "#right-round-3 .match:nth-of-type(1)", nearTo: true },

    { from: "#left-round-3 .match:nth-of-type(1)", to: "#finals-top .match:nth-of-type(1)" },
    { from: "#right-round-3 .match:nth-of-type(1)", to: "#finals-bottom .match:nth-of-type(1)" }
  ];

  MAP.forEach(({ from, to, nearTo }) => {
    const fromEl = document.querySelector(from);
    const toEl = document.querySelector(to);
    if (fromEl && toEl) elbow(fromEl, toEl, !!nearTo);
  });
}

// ======== BUILD ========
async function buildBracket() {
  try {
    clearBracket();

    const seeds = await loadStandings();
    if (seeds.length < 16) {
      console.warn("Trovate meno di 16 squadre. Ne servono 16.");
    }

    const bracket = makeBracketStructure(seeds);
    propagateWinners(bracket);

    renderRound("left-round-1", bracket.r1.left);
    renderRound("right-round-1", bracket.r1.right);
    renderRound("left-round-2", bracket.leftSF);
    renderRound("right-round-2", bracket.rightSF);
    renderRound("left-round-3", bracket.leftCF);
    renderRound("right-round-3", bracket.rightCF);

    const finalMatch = bracket.finals[0];

    document
      .getElementById("finals-top")
      ?.appendChild(createFinalSide(finalMatch.home, "home", "F"));

    document
      .getElementById("finals-bottom")
      ?.appendChild(createFinalSide(finalMatch.away, "away", "F"));

    renderMobileList(bracket);

    requestAnimationFrame(() => {
      drawWires();
      setTimeout(drawWires, 0);
    });

  } catch (error) {
    console.error("Errore costruzione bracket:", error);
  }
}

// ======== EVENTS ========
window.addEventListener("resize", () => {
  requestAnimationFrame(drawWires);
});

document.addEventListener("DOMContentLoaded", () => {
  buildBracket();
});
