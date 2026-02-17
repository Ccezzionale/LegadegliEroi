// =====================================
// GIORNALE TRASH - Manuale + Bozza
// =====================================

// 1) INCOLLA QUI il CSV delle statistiche (risultati / calendario)
// (quello che avevi: .../pub?...&output=csv)
const STATS_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRhEJKfZhVb7V08KI29T_aPTR0hfx7ayIOlFjQn_v-fqgktImjXFg-QAEA6z7w5eyEh2B3w5KLpaRYz/pub?gid=1118969717&single=true&output=csv";

// 2) CSV del tab Giornale (manuale) - già ok
const MANUAL_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTIIcMsU01jJD0WJ8bz_V3rhlYXQOTpU0q8rnFaGzeG1edoqIVk9U3WaIb1WvCBKkrm8ciWYRgdY1ae/pub?output=csv";

const CLASSIFICA_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTduESMbJiPuCDLaAFdOHjep9GW-notjraILSyyjo6SA0xKSR0H0fgMLPNNYSwXgnGGJUyv14kjFRqv/pub?gid=691152130&single=true&output=csv";

// Mapping colonne (stats)
const COL = {
  gw: "GW_Stagionale",
  team: "Team",
  opp: "Opponent",
  pf: "PointsFor",
  pa: "PointsAgainst"
};

// Mapping colonne (manuale)
const MAN = {
  gw: "GW",
  title: "Titolo_manual",
  text: "Testo_manual",
  updated: "UpdatedAt"
};

// -------------------------------------
// Helpers
// -------------------------------------
const $ = (id) => document.getElementById(id);

function norm(v){ return String(v ?? "").trim(); }
function toNum(x){
  const v = String(x ?? "").trim().replace(",", ".");
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}
function gwNum(v){
  const m = String(v ?? "").match(/\d+/);
  return m ? Number(m[0]) : NaN;
}
function pick(arr){ return arr[Math.floor(Math.random() * arr.length)]; }

// CSV parser robusto (quote + virgole)
function parseCSV(text){
  const rows = [];
  let row = [], cur = "", inQ = false;
  for (let i=0; i<text.length; i++){
    const ch = text[i], nxt = text[i+1];
    if (ch === '"' && inQ && nxt === '"'){ cur += '"'; i++; continue; }
    if (ch === '"'){ inQ = !inQ; continue; }
    if (!inQ && ch === ","){ row.push(cur); cur=""; continue; }
    if (!inQ && (ch === "\n" || ch === "\r")){
      if (ch === "\r" && nxt === "\n") i++;
      row.push(cur); cur="";
      if (row.some(c => c !== "")) rows.push(row);
      row = [];
      continue;
    }
    cur += ch;
  }
  row.push(cur);
  if (row.some(c => c !== "")) rows.push(row);
  return rows;
}

function rowsToObjects(rows){
  if (!rows.length) return [];
  const header = rows[0].map(h => norm(h));
  return rows.slice(1).map(r => {
    const o = {};
    header.forEach((h, idx) => o[h] = r[idx] ?? "");
    return o;
  });
}

async function fetchCSV(url){
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Fetch fallita (${res.status})`);
  const text = await res.text();
  const rows = parseCSV(text);
  return rowsToObjects(rows);
}

// -------------------------------------
// Manual overrides
// -------------------------------------
async function loadManualMap(){
  const data = await fetchCSV(MANUAL_CSV_URL);
  const map = new Map(); // gw -> {title,text,updatedAt}
  for (const r of data){
    const g = gwNum(r[MAN.gw]);
    if (!Number.isFinite(g)) continue;

    const title = norm(r[MAN.title]);
    const text  = norm(r[MAN.text]);
    const upd   = norm(r[MAN.updated]);

    if (title || text){
      map.set(g, { title, text, updatedAt: upd });
    }
  }
  return map;
}

// -------------------------------------
// Stats -> match list (dedup)
// -------------------------------------
function buildMatchesForGW(data, gw){
  // filtro giornata
  const rows = data.filter(r => gwNum(r[COL.gw]) === Number(gw));

  // dedup: ogni match è doppio (Team/Opponent)
  const seen = new Set();
  const matches = [];

  for (const r of rows){
    const A = norm(r[COL.team]);
    const B = norm(r[COL.opp]);
    const pf = toNum(r[COL.pf]);
    const pa = toNum(r[COL.pa]);
    if (!A || !B || !Number.isFinite(pf) || !Number.isFinite(pa)) continue;

    const key = [A, B].sort().join("||");
    if (seen.has(key)) continue;

    // prendiamo una riga "stabile": A alfabeticamente <= B
    if (A > B) continue;

    seen.add(key);

    const winner = pf > pa ? A : (pa > pf ? B : null);
    const loser  = pf > pa ? B : (pa > pf ? A : null);
    const margin = Math.abs(pf - pa);

    matches.push({
      gw,
      home: A, away: B,
      aPoints: pf, bPoints: pa,
      winner, loser, margin
    });
  }

  return matches;
}

function buildTeamStats(matches){
  const m = new Map();
  const add = (name, pf, pa) => {
    if (!m.has(name)) m.set(name, { name, pf: 0, pa: 0, w:0, l:0, t:0 });
    const t = m.get(name);
    t.pf += pf; t.pa += pa;
    if (pf > pa) t.w++;
    else if (pf < pa) t.l++;
    else t.t++;
  };

  for (const game of matches){
    add(game.home, game.aPoints, game.bPoints);
    add(game.away, game.bPoints, game.aPoints);
  }

  return Array.from(m.values());
}

// -------------------------------------
// Trash generators (bozza)
// -------------------------------------
function headline(ctx){
  const { upset, bigMargin, topTeam, flopTeam, gw } = ctx;
  if (upset) return `SCANDALO SPORTIVO (GW ${gw}): ${upset.winner} FA IL COLPO GROSSO`;
  if (bigMargin) return `GW ${gw}: MASSACRO A PORTE APERTE, ${bigMargin.winner} SMONTA ${bigMargin.loser}`;
  if (topTeam) return `GW ${gw}: ${topTeam} FA PAURA (E GLI ALTRI FANNO SCUSE)`;
  if (flopTeam) return `GW ${gw}: ${flopTeam} DISPERSA, AVVISTATA SOLO IN BASSA CLASSIFICA`;
  return `GW ${gw}: CAOS, DRAMMI E PUNTI LANCIATI DALLA FINESTRA`;
}

function editorial(ctx){
  const openers = [
    "Settimana intensa: anche i numeri hanno chiesto ferie.",
    "Giornata con la delicatezza di una chat di condominio.",
    "Qui non si gioca: si sopravvive."
  ];
  const mids = [
    `Il re è ${ctx.topTeam} con ${ctx.topPF.toFixed(1)}: prestazione da far firmare ai notai.`,
    `Il fondo del barile lo firma ${ctx.flopTeam} con ${ctx.flopPF.toFixed(1)}: presente solo col badge.`,
    ctx.bigMargin
      ? `${ctx.bigMargin.winner} ha steso ${ctx.bigMargin.loser} di ${ctx.bigMargin.margin.toFixed(1)}: intervento necessario (psicologico).`
      : "Scarti stretti? Sì, come la pazienza a fine mese."
  ];
  const closers = [
    "Ora tutti a promettere la rimonta. Va bene, ci crediamo.",
    "Ci vediamo alla prossima, con nuove illusioni e vecchi traumi.",
    "Idratatevi: qui si suda anche da seduti."
  ];
  return `${pick(openers)} ${pick(mids)} ${pick(closers)}`;
}

function voteFromPoints(p){
  if (p >= 85) return 10;
  if (p >= 80) return 9;
  if (p >= 75) return 8;
  if (p >= 70) return 7;
  if (p >= 65) return 6;
  if (p >= 60) return 5;
  return 4;
}
function commentForVote(v){
  const map = {
    10: ["Giornata illegale, ma splendida.", "Ha giocato con l’algoritmo in tasca."],
    9:  ["Quasi perfetto: ha lasciato briciole.", "Prestazione da denuncia (degli altri)."],
    8:  ["Solido e cattivo.", "Ha fatto il suo e anche quello altrui."],
    7:  ["Buono, senza poesia ma con punti.", "Ha vinto pure senza charme."],
    6:  ["Sufficienza con faccia tosta.", "Ha portato a casa la pagnotta."],
    5:  ["Caffè annacquato, ma bevibile.", "Ha camminato. Ogni tanto ha corso."],
    4:  ["Presente solo col badge.", "Ha perso pure contro l’entusiasmo."]
  };
  return pick(map[v] || ["Indescrivibile."]);
}

// costruisce la bozza automatica
function buildAutoArticle(data, gw){
  const matches = buildMatchesForGW(data, gw);
  const teamStats = buildTeamStats(matches);

  let topTeam=null, topPF=-Infinity;
  let flopTeam=null, flopPF=Infinity;
  for (const t of teamStats){
    if (t.pf > topPF){ topPF = t.pf; topTeam = t.name; }
    if (t.pf < flopPF){ flopPF = t.pf; flopTeam = t.name; }
  }

  const matchClose = matches.slice().sort((a,b) => a.margin - b.margin)[0] || null;
  const matchBlow  = matches.slice().sort((a,b) => b.margin - a.margin)[0] || null;

  const upset = matches.find(m => m.winner && Math.min(m.aPoints, m.bPoints) < 68) || null;

  const thief = matches
    .filter(m => m.winner)
    .map(m => {
      const winnerPts = (m.winner === m.home) ? m.aPoints : m.bPoints;
      return { ...m, winnerPts };
    })
    .sort((a,b) => (a.winnerPts - b.winnerPts) || (a.margin - b.margin))[0] || null;

  const ctx = {
    gw,
    matches,
    teamStats,
    topTeam, topPF: Number.isFinite(topPF) ? topPF : 0,
    flopTeam, flopPF: Number.isFinite(flopPF) ? flopPF : 0,
    matchOfWeek: matchClose,
    bigMargin: matchBlow && matchBlow.winner ? { winner: matchBlow.winner, loser: matchBlow.loser, margin: matchBlow.margin } : null,
    upset: upset && upset.winner ? { winner: upset.winner } : null,
    thief: thief ? { winner: thief.winner, winnerPts: thief.winnerPts, margin: thief.margin } : null,
  };

  return {
    title: headline(ctx),
    subtitle: new Date().toLocaleDateString("it-IT", { weekday:"long", year:"numeric", month:"long", day:"numeric" }),
    editorial: editorial(ctx),
    matches,
    teamStats,
    matchOfWeek: matchClose,
    top: { team: ctx.topTeam, pf: ctx.topPF },
    flop: { team: ctx.flopTeam, pf: ctx.flopPF },
    thief: ctx.thief
  };
}

// render bozza (HTML)
function renderAutoHTML(article){
  const linesMatch = article.matches
    .map(m => `<li><b>${m.home}</b> ${m.aPoints.toFixed(1)} - ${m.bPoints.toFixed(1)} <b>${m.away}</b> <span class="muted">(scarto ${m.margin.toFixed(1)})</span></li>`)
    .join("");

  const pagelle = article.teamStats
    .sort((a,b) => b.pf - a.pf)
    .map(t => {
      const v = voteFromPoints(t.pf);
      return `<li><b>${t.name}</b> <span class="pill">${v.toFixed(1)}</span> <span class="muted">${commentForVote(v)}</span> <span class="muted">(${t.pf.toFixed(1)} PF)</span></li>`;
    })
    .join("");

  const mow = article.matchOfWeek
    ? `<p><b>${article.matchOfWeek.home}</b> ${article.matchOfWeek.aPoints.toFixed(1)} - ${article.matchOfWeek.bPoints.toFixed(1)} <b>${article.matchOfWeek.away}</b>
       <span class="muted">(scarto ${article.matchOfWeek.margin.toFixed(1)})</span></p>`
    : `<p class="muted">Nessun match trovato per questa giornata.</p>`;

  return `
    <div>
      <div class="pill">Bozza automatica</div>
      <h1 class="title">${article.title}</h1>
      <p class="subtitle">${article.subtitle}</p>

      <div class="section">
        <h3>🧨 Editoriale</h3>
        <p>${article.editorial}</p>
      </div>

      <div class="section grid2">
        <div>
          <h3>🔥 Match della Settimana</h3>
          ${mow}
        </div>
        <div>
          <h3>🏆 Premi discutibili</h3>
          <ul class="list">
            <li><b>Re:</b> ${article.top.team} (${article.top.pf.toFixed(1)})</li>
            <li><b>Pagliaccio d’Oro:</b> ${article.flop.team} (${article.flop.pf.toFixed(1)})</li>
            ${article.thief ? `<li><b>Ladro:</b> ${article.thief.winner} (vittoria con ${article.thief.winnerPts.toFixed(1)}, scarto ${article.thief.margin.toFixed(1)})</li>` : `<li class="muted">Nessun ladro (evento raro).</li>`}
          </ul>
        </div>
      </div>

      <div class="section">
        <h3>📌 Risultati</h3>
        <ul class="list">${linesMatch}</ul>
      </div>

      <div class="section">
        <h3>📝 Pagelle</h3>
        <ul class="list">${pagelle}</ul>
      </div>
    </div>
  `;
}

function buildStatsBlocks(article){
  // Match of the week
  const matchHTML = article.matchOfWeek
    ? `<div><b>${article.matchOfWeek.home}</b> <span class="score">${article.matchOfWeek.aPoints.toFixed(1)} - ${article.matchOfWeek.bPoints.toFixed(1)}</span> <b>${article.matchOfWeek.away}</b>
       <div class="small">Scarto ${article.matchOfWeek.margin.toFixed(1)}</div></div>`
    : `<div class="small">Nessun match trovato.</div>`;

  // Premi
  const premiHTML = `
    <ul class="ul">
      <li><b>Re:</b> ${article.top.team} <span class="badge gold">${article.top.pf.toFixed(1)}</span></li>
      <li><b>Pagliaccio d’Oro:</b> ${article.flop.team} <span class="badge">${article.flop.pf.toFixed(1)}</span></li>
      ${article.thief ? `<li><b>Ladro:</b> ${article.thief.winner} <span class="badge blue">${article.thief.winnerPts.toFixed(1)}</span> <span class="small">(scarto ${article.thief.margin.toFixed(1)})</span></li>` : `<li class="small">Nessun ladro (evento raro).</li>`}
    </ul>
  `;

  // Results table
  const rows = article.matches.map(m => `
    <tr>
      <td><b>${m.home}</b> vs <b>${m.away}</b><div class="small">scarto ${m.margin.toFixed(1)}</div></td>
      <td class="score">${m.aPoints.toFixed(1)} - ${m.bPoints.toFixed(1)}</td>
    </tr>
  `).join("");

  const resultsTableHTML = `
    <table class="table">
      <thead><tr><th>Partita</th><th>Punti</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  // Pagelle list “giornale”
  const pagelleHTML = `
    <table class="table">
      <thead><tr><th>Squadra</th><th>Voto</th><th>Nota</th></tr></thead>
      <tbody>
        ${article.teamStats
          .sort((a,b) => b.pf - a.pf)
          .map(t => {
            const v = voteFromPoints(t.pf);
            return `<tr>
              <td><b>${t.name}</b><div class="small">${t.pf.toFixed(1)} PF</div></td>
              <td><span class="badge">${v.toFixed(1)}</span></td>
              <td class="small">${commentForVote(v)}</td>
            </tr>`;
          }).join("")}
      </tbody>
    </table>
  `;

    // Classifica di giornata: ordina per PF (poi PA)
  const standingsRows = article.teamStats
    .slice()
    .sort((a,b) => (b.pf - a.pf) || (a.pa - b.pa))
    .map((t, idx) => `
      <tr>
        <td class="small">${idx + 1}</td>
        <td><b>${t.name}</b></td>
        <td class="score">${t.w}-${t.l}${t.t ? `-${t.t}` : ""}</td>
        <td class="score">${t.pf.toFixed(1)}</td>
        <td class="score small">${t.pa.toFixed(1)}</td>
      </tr>
    `).join("");

  const standingsHTML = `
    <table class="table">
      <thead>
        <tr>
          <th>#</th>
          <th>Squadra</th>
          <th>W-L(-T)</th>
          <th>PF</th>
          <th>PA</th>
        </tr>
      </thead>
      <tbody>${standingsRows}</tbody>
    </table>
  `;


    return { matchHTML, premiHTML, resultsTableHTML, standingsHTML, pagelleHTML };
}

// render manuale (HTML)
function renderManualHTML(gw, manual, stats){
  const title = manual.title ? manual.title : `GW ${gw} | Editoriale`;
  const subtitle = manual.updatedAt ? `Aggiornato: ${manual.updatedAt}` : "Editoriale manuale";
  const text = manual.text || "<i>(Nessun testo manuale inserito)</i>";

  return `
    <div class="lede">
      <span class="kicker">EDIZIONE MANUALE</span>
      <div class="h1">${title}</div>
      <div class="subline">${subtitle}</div>
    </div>

    <div class="columns">
      <div>
        <div class="block editorial">
          <h3>Editoriale</h3>
          <p>${text}</p>
        </div>

      <div class="block">
  <h3>Risultati</h3>
  ${stats.resultsTableHTML}
</div>

<div class="block">
  <h3>Classifica</h3>
  ${stats.standingsHTML}
</div>

<div class="block">
  <h3>Pagelle</h3>
  ${stats.pagelleHTML}
</div>


      <div>
        <div class="block">
          <h3>Match della settimana</h3>
          ${stats.matchHTML}
        </div>

        <div class="block">
          <h3>Premi discutibili</h3>
          ${stats.premiHTML}
        </div>
      </div>
    </div>
  `;
}



// -------------------------------------
// UI flow
// -------------------------------------
let STATS_DATA = [];
let MANUAL_MAP = new Map();
let CURRENT_GW = null;
let VIEW_MODE = "manual"; // "manual" | "auto"

function setStatus(msg, isErr=false){
  const el = $("status");
  el.textContent = msg || "";
  el.className = isErr ? "error" : "muted";
}

function setViewMode(mode){
  VIEW_MODE = mode;
  $("btnViewManual").classList.toggle("active", mode === "manual");
  $("btnViewAuto").classList.toggle("active", mode === "auto");
  renderCurrent();
}

function getAllGWs(data){
  const set = new Set();
  for (const r of data){
    const n = gwNum(r[COL.gw]);
    if (Number.isFinite(n)) set.add(n);
  }
  return Array.from(set).sort((a,b) => a - b);
}

function fillGWSelect(gws, selected){
  const sel = $("gwSelect");
  sel.innerHTML = "";
  for (const g of gws){
    const opt = document.createElement("option");
    opt.value = String(g);
    opt.textContent = `GW ${g}`;
    if (Number(g) === Number(selected)) opt.selected = true;
    sel.appendChild(opt);
  }
}

function renderCurrent(){
  const out = $("output");
  if (!CURRENT_GW){
    out.innerHTML = `<p class="error">Nessuna GW disponibile.</p>`;
    return;
  }

  const gw = Number(CURRENT_GW);
  const manual = MANUAL_MAP.get(gw);

  // chips masthead (se esistono)
  const d = new Date().toLocaleDateString("it-IT", { weekday:"long", year:"numeric", month:"long", day:"numeric" });
  const chipDate = document.getElementById("chipDate");
  const chipGW = document.getElementById("chipGW");
  if (chipDate) chipDate.textContent = d;
  if (chipGW) chipGW.textContent = `GW ${gw}`;

  // Manuale + stats (stile giornale)
  if (VIEW_MODE === "manual" && manual){
    const auto = buildAutoArticle(STATS_DATA, gw);
    const statsBlocks = buildStatsBlocks(auto);
    out.innerHTML = renderManualHTML(gw, manual, statsBlocks);
    setStatus(`GW ${gw} | Manuale ✅ + Stats`);
    return;
  }

  // Manuale ma non c’è testo: fallback bozza completa
  if (VIEW_MODE === "manual" && !manual){
    const auto = buildAutoArticle(STATS_DATA, gw);
    out.innerHTML = renderAutoHTML(auto);
    setStatus(`GW ${gw} | Bozza (manca manuale)`);
    return;
  }

  // View bozza
  const auto = buildAutoArticle(STATS_DATA, gw);
  out.innerHTML = renderAutoHTML(auto);
  setStatus(`GW ${gw} | Bozza ✅`);
}


async function loadAll(){
  if (STATS_CSV_URL.includes("INCOLLA_QUI")) {
    throw new Error("Devi impostare STATS_CSV_URL con il tuo link CSV delle statistiche.");
  }

  setStatus("Carico statistiche…");
  STATS_DATA = await fetchCSV(STATS_CSV_URL);

  setStatus("Carico giornale manuale…");
  try {
    MANUAL_MAP = await loadManualMap();
  } catch(e){
    console.warn("Manuale non disponibile:", e.message);
    MANUAL_MAP = new Map();
  }

  const gws = getAllGWs(STATS_DATA);
  if (!gws.length) throw new Error("Nessuna GW trovata nel CSV statistiche.");

  CURRENT_GW = gws[gws.length - 1];
  fillGWSelect(gws, CURRENT_GW);

  // Se esiste manuale per l’ultima GW, partiamo in manuale, altrimenti bozza
  const hasManual = MANUAL_MAP.has(Number(CURRENT_GW));
  setViewMode(hasManual ? "manual" : "auto");
}

async function reloadKeepingGW(){
  const gw = Number($("gwSelect").value || CURRENT_GW);
  await loadAll();
  CURRENT_GW = gw;
  $("gwSelect").value = String(gw);
  renderCurrent();
}

// Listeners
$("gwSelect").addEventListener("change", (e) => {
  CURRENT_GW = Number(e.target.value);
  renderCurrent();
});

$("btnReload").addEventListener("click", async () => {
  try{
    await reloadKeepingGW();
  } catch(e){
    console.error(e);
    setStatus(`Errore: ${e.message}`, true);
    $("output").innerHTML = `<p class="error">${e.message}</p>`;
  }
});

$("btnViewManual").addEventListener("click", () => setViewMode("manual"));
$("btnViewAuto").addEventListener("click", () => setViewMode("auto"));

// Boot
(async () => {
  try{
    await loadAll();
    renderCurrent();
  } catch(e){
    console.error(e);
    setStatus(`Errore: ${e.message}`, true);
    $("output").innerHTML = `<p class="error">${e.message}</p>`;
  }
})();
