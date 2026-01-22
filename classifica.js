const URL_MAP = {
  "Conference": "https://docs.google.com/spreadsheets/d/1kPDuSW9IKwJArUS4oOv0iIVRHU7F4zPASPXT8Qf86Fo/export?format=csv&gid=0",
  "Championship": "https://docs.google.com/spreadsheets/d/1kPDuSW9IKwJArUS4oOv0iIVRHU7F4zPASPXT8Qf86Fo/export?format=csv&gid=547378102",
  "Totale": "https://docs.google.com/spreadsheets/d/1kPDuSW9IKwJArUS4oOv0iIVRHU7F4zPASPXT8Qf86Fo/export?format=csv&gid=691152130"
};

function formattaNumero(val) {
  if (!isNaN(val) && val.toString().includes(".")) {
    const num = parseFloat(val).toFixed(2);
    return num.replace(".", ",");
  }
  return val;
}

function normTeamName(val){
  return String(val || "").replace(/[👑🎖️💀]/g, "").trim();
}

function teamKey(val){
  return normTeamName(val).toLowerCase().replace(/\s+/g, " ").trim();
}

function parseCSVbasic(csv){
  // come il tuo: split semplice (ok se non ci sono virgole dentro celle)
  return csv.trim().split(/\r?\n/).map(r => r.split(",").map(c => c.replace(/"/g, "").trim()));
}

function toNumberSmart(x){
  const s = String(x ?? "").replace(",", ".");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

// ====== RACE: Evoluzione classifica da "Risultati PR - Master" ======
const RESULTS_PR_MASTER_CSV =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRhEJKfZhVb7V08KI29T_aPTR0hfx7ayIOlFjQn_v-fqgktImjXFg-QAEA6z7w5eyEh2B3w5KLpaRYz/pub?gid=1118969717&single=true&output=csv";

// Normalizzazioni nomi (case-insensitive)
const TEAM_OFFICIAL = {
  "riverfilo": "Riverfilo",
  "pokermantra": "PokerMantra"
};

function canonTeamName(raw){
  const k = teamKey(raw);
  return TEAM_OFFICIAL[k] || normTeamName(raw);
}

// Regola gol da MP (CLASSICA): 66 = 1 gol, poi +6 per ogni gol
const GOAL_BASE = 66;
const GOAL_STEP = 6;

function mpToGoals(mp){
  let g = 0;
  let thr = GOAL_BASE;
  while (mp >= thr){
    g += 1;
    thr += GOAL_STEP;
  }
  return g;
}

const RACE_SLOT_W = 66; // spazio tra loghi (px)
let raceNodes = new Map();
let raceDataByDay = {}; // day -> [{teamKey, teamName, pt, mp}]
let raceMaxDay = 1;
let raceOrder = []; // ordine fisso delle squadre sull'asse X


function initRaceDOM(teamNames){
  const track = document.getElementById("raceTrack");
  if (!track) return;

  track.innerHTML = "";
  raceNodes = new Map();

  // ordine fisso X (alfabetico, ma puoi cambiarlo se vuoi)
  raceOrder = teamNames.slice().sort((a,b)=>a.localeCompare(b));

  raceOrder.forEach(teamName => {
    const el = document.createElement("div");
    el.className = "race-item";

    const img = document.createElement("img");
    img.src = `img/${teamName}.png`;
    img.alt = teamName;
    img.onerror = () => (img.style.display = "none");

    el.appendChild(img);
    track.appendChild(el);

    raceNodes.set(teamKey(teamName), { el, teamName });
  });
}



function renderRaceDay(day){
  const track = document.getElementById("raceTrack");
  const slider = document.getElementById("raceDay");
  const label = document.getElementById("raceLabel");
  if (!track || !slider || !label) return;

  const rows = raceDataByDay[day] || [];

  // mappa: teamKey -> pt
  const ptMap = new Map();
  rows.forEach(r => ptMap.set(r.teamKey, Number(r.pt) || 0));

  // max punti (per scalare l'altezza)
  const maxPt = Math.max(1, ...raceOrder.map(n => ptMap.get(teamKey(n)) || 0));

  const ICON = 56;
  const PAD  = 12;

  const W = track.clientWidth;
  const H = track.clientHeight;

  // spazio disponibile per "salire"
  const climbH = Math.max(0, H - ICON - PAD*2);

  // slot orizzontale: distribuisci i loghi su tutta la larghezza
  const n = Math.max(1, raceOrder.length);
  const slot = (n === 1) ? 0 : (W - ICON - PAD*2) / (n - 1);

  raceOrder.forEach((teamName, idx) => {
    const k = teamKey(teamName);
    const node = raceNodes.get(k);
    if (!node) return;

    const pt = ptMap.get(k) || 0;

    // X fisso per squadra
    const x = PAD + idx * slot;

    // Y dipende dai punti (0 = baseline, maxPt = top)
    const y = (pt / maxPt) * climbH;

    // bottom è già 12px, quindi spostiamo in su con -y
    node.el.style.transform = `translate(${x}px, ${-y}px)`;
  });

  slider.value = day;
  label.textContent = `Giornata ${day}`;
}


function wireRaceControls(){
  const prev = document.getElementById("racePrev");
  const next = document.getElementById("raceNext");
  const slider = document.getElementById("raceDay");
  if (!prev || !next || !slider) return;

  slider.oninput = e => renderRaceDay(Number(e.target.value));
  prev.onclick = () => renderRaceDay(Math.max(1, Number(slider.value) - 1));
  next.onclick = () => renderRaceDay(Math.min(raceMaxDay, Number(slider.value) + 1));
}

function findIdx(headers, candidates){
  const H = headers.map(h => String(h).toLowerCase().replace(/\s+/g,"").replace(/_/g,""));
  for (const c of candidates){
    const k = c.toLowerCase().replace(/\s+/g,"").replace(/_/g,"");
    const idx = H.indexOf(k);
    if (idx !== -1) return idx;
  }
  return -1;
}

function fixRowToHeaderLen(row, headerLen){
  // sistema righe tipo: 78,5 -> ["78","5"] finché la lunghezza torna uguale all’header
  const r = [...row];
  while (r.length > headerLen){
    let merged = false;
    for (let j = r.length - 1; j > 0; j--){
      if (/^\d+$/.test(r[j - 1]) && r[j] === "5"){
        r.splice(j - 1, 2, `${r[j - 1]}.5`);
        merged = true;
        break;
      }
    }
    if (!merged) break;
  }
  return r;
}

async function loadRaceFromResults(){
  const section = document.getElementById("raceSection");
  if (!section) return;

  let text;
  try{
    text = await fetch(RESULTS_PR_MASTER_CSV).then(r => r.text());
  }catch(e){
    console.error("Race: fetch CSV failed", e);
    section.style.display = "none";
    return;
  }

  const rows = parseCSVbasic(text);
  if (!rows.length) { section.style.display = "none"; return; }

  const header = rows[0];

  const idxDay  = findIdx(header, ["GW_Stagionale","GWStagionale","GWSeason","GWS","GW"]);
  const idxTeam = findIdx(header, ["Team","Squadra"]);
  const idxPF   = findIdx(header, ["PointsFor","PF","MP","MagicPoints","PuntiFatti"]);
  const idxPA   = findIdx(header, ["PointsAgainst","PA","PuntiSubiti"]);

  if (idxDay === -1 || idxTeam === -1 || idxPF === -1 || idxPA === -1) {
    console.warn("Race: colonne non trovate (servono almeno GW_Stagionale, Team, PointsFor, PointsAgainst).", header);
    section.style.display = "none";
    return;
  }

  const byDay = new Map();
  const teamsSet = new Set();

  // dedup (day|team)
  const seen = new Set();
  const dups = [];

  for (let i=1; i<rows.length; i++){
    const r = fixRowToHeaderLen(rows[i], header.length);

    const day = parseInt(String(r[idxDay] || "").replace(/[^\d]/g,""), 10);
    if (!Number.isFinite(day) || day <= 0) continue;

    const teamName = canonTeamName(r[idxTeam]);
    if (!teamName) continue;

    const tKey = teamKey(teamName);
    const key = `${day}|${tKey}`;

    if (seen.has(key)){
      dups.push({ day, team: teamName });
      continue;
    }
    seen.add(key);

    teamsSet.add(teamName);

    const mpFor = toNumberSmart(r[idxPF]);
    const mpAg  = toNumberSmart(r[idxPA]);

    // ✅ punti LEGA calcolati da GOL (non da MP puro)
    const gf = mpToGoals(mpFor);
    const ga = mpToGoals(mpAg);

    const pts = gf > ga ? 3 : (gf < ga ? 0 : 1);

    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day).push({ teamKey: tKey, teamName, pts, mp: mpFor });
  }

  if (dups.length){
    console.warn("Race: duplicati ignorati (stesso team nella stessa giornata).", dups);
  }

  const days = Array.from(byDay.keys()).sort((a,b)=>a-b);
  raceMaxDay = days.length ? days[days.length - 1] : 1;

  const teamNames = Array.from(teamsSet).sort((a,b)=>a.localeCompare(b));
  initRaceDOM(teamNames);

  const totals = new Map(); // teamKey -> {pt, mp, teamName}
  teamNames.forEach(n => totals.set(teamKey(n), { pt:0, mp:0, teamName:n }));

  raceDataByDay = {};
  for (let d=1; d<=raceMaxDay; d++){
    const games = byDay.get(d) || [];
    games.forEach(g => {
      const cur = totals.get(g.teamKey) || { pt:0, mp:0, teamName:g.teamName };
      cur.pt += g.pts;
      cur.mp += g.mp;
      cur.teamName = g.teamName;
      totals.set(g.teamKey, cur);
    });

    raceDataByDay[d] = Array.from(totals.entries()).map(([k,v]) => ({
      teamKey: k,
      teamName: v.teamName,
      pt: v.pt,
      mp: v.mp
    }));
  }

  const slider = document.getElementById("raceDay");
  if (slider){
    slider.min = "1";
    slider.max = String(raceMaxDay);
    slider.value = "1";
  }

  wireRaceControls();
  renderRaceDay(1);
}

// ====== la tua parte classifica (identica) ======
async function teamPointsFromSheet(sheetName){
  const url = URL_MAP[sheetName];
  const text = await fetch(url).then(r => r.text());
  const rows = parseCSVbasic(text);

  const startRow = 4;
  const header = rows[startRow - 1];
  const headerFixed = [...header];
  headerFixed.splice(2, 1);

  let idxPT = headerFixed.findIndex(h => h.toUpperCase() === "PT");
  if (idxPT === -1) idxPT = headerFixed.findIndex(h => h.toLowerCase().includes("punt"));

  const map = new Map();

  for (let i = startRow; i < rows.length; i++){
    let cols = rows[i];

    if (cols.length > header.length) {
      const ultimo = cols[cols.length - 1];
      const penultimo = cols[cols.length - 2];
      if (/^\d+$/.test(penultimo) && ultimo === "5") {
        cols.splice(-2, 2, `${penultimo}.5`);
      }
    }

    const fixed = [...cols];
    fixed.splice(2, 1);

    const team = teamKey(fixed[1]);
    if (!team) continue;

    const pt = (idxPT !== -1) ? toNumberSmart(fixed[idxPT]) : toNumberSmart(fixed.at(-2));
    map.set(team, pt);
  }
  return map;
}

async function caricaClassifica(nomeFoglio = "Conference") {

  if (nomeFoglio === "Round Robin") {
    try {
      const [confMap, champMap] = await Promise.all([
        teamPointsFromSheet("Conference"),
        teamPointsFromSheet("Championship")
      ]);

      const csvTot = await fetch(URL_MAP["Totale"]).then(r => r.text());
      const rowsTot = parseCSVbasic(csvTot);

      const startRow = 1;
      const header = rowsTot[startRow - 1];
      const idxTeam = 1;

      let idxPT = header.findIndex(h => String(h).replace(/"/g,"").trim().toUpperCase() === "PT");
      if (idxPT === -1) idxPT = header.findIndex(h => String(h).toLowerCase().includes("punt"));
      if (idxPT === -1) idxPT = header.length - 2;

      const tbody = document.querySelector("#tabella-classifica tbody");
      const thead = document.querySelector("#tabella-classifica thead");
      const mobile = document.getElementById("classifica-mobile");
      tbody.innerHTML = "";
      thead.innerHTML = "";
      mobile.innerHTML = "";

      const intestazione = ["Pos", "Squadra", "RR PT"];
      const headerRow = document.createElement("tr");
      intestazione.forEach(col => {
        const th = document.createElement("th");
        th.textContent = col;
        headerRow.appendChild(th);
      });
      thead.appendChild(headerRow);

      const rr = [];
      for (let i = startRow; i < rowsTot.length; i++) {
        const cols = rowsTot[i];
        const teamRaw = cols[idxTeam];
        const team = teamKey(teamRaw);
        if (!team) continue;

        const ptTot = toNumberSmart(cols[idxPT]);
        const ptConf = confMap.has(team) ? confMap.get(team) : (champMap.get(team) || 0);
        const rrPt = ptTot - ptConf;

        rr.push({ teamRaw, team, rrPt });
      }

      rr.sort((a,b) => b.rrPt - a.rrPt);

      rr.forEach((r, k) => {
        const pos = k + 1;

        const tr = document.createElement("tr");
        tr.classList.add("riga-classifica");
        if (pos === 1) tr.classList.add("top1");

        const tdPos = document.createElement("td");
        tdPos.textContent = pos;
        tr.appendChild(tdPos);

        const tdTeam = document.createElement("td");
        const div = document.createElement("div");
        div.className = "logo-nome";
        const img = document.createElement("img");
        const name = normTeamName(r.teamRaw);
        img.src = `img/${name}.png`;
        img.onerror = () => (img.style.display = "none");
        const span = document.createElement("span");
        span.textContent = r.teamRaw;
        div.appendChild(img);
        div.appendChild(span);
        tdTeam.appendChild(div);
        tr.appendChild(tdTeam);

        const tdPt = document.createElement("td");
        tdPt.textContent = Math.round(r.rrPt);
        tr.appendChild(tdPt);

        tbody.appendChild(tr);

        const item = document.createElement("div");
        item.className = "accordion-item";
        if (pos === 1) item.classList.add("top1");

        const header = document.createElement("div");
        header.className = "accordion-header";

        const img2 = document.createElement("img");
        img2.src = `img/${name}.png`;
        img2.onerror = () => (img2.style.display = "none");

        const span2 = document.createElement("span");
        span2.innerHTML = `<strong>${pos}\u00B0 ${r.teamRaw}</strong><br><span style='font-weight:normal'>RR PT. ${Math.round(r.rrPt)}</span>`;

        header.appendChild(img2);
        header.appendChild(span2);

        const body = document.createElement("div");
        body.className = "accordion-body";
        const p = document.createElement("span");
        p.innerHTML = `<strong>RR PT:</strong> ${formattaNumero(r.rrPt.toFixed(2))}`;
        body.appendChild(p);

        header.addEventListener("click", () => item.classList.toggle("active"));
        item.appendChild(header);
        item.appendChild(body);
        mobile.appendChild(item);
      });

      return;
    } catch (e) {
      console.error("Errore Round Robin:", e);
      return;
    }
  }

  const url = URL_MAP[nomeFoglio];
  if (!url) return;

  fetch(url)
    .then(response => response.text())
    .then(csv => {
      const righe = csv.trim().split("\n");
      const startRow = nomeFoglio === "Totale" ? 1 : 4;
      const intestazione = righe[startRow - 1].split(",").map(cell => cell.replace(/"/g, "").trim());
      if (nomeFoglio !== "Totale") intestazione.splice(2, 1);

      const tbody = document.querySelector("#tabella-classifica tbody");
      const thead = document.querySelector("#tabella-classifica thead");
      const mobile = document.getElementById("classifica-mobile");
      tbody.innerHTML = "";
      thead.innerHTML = "";
      mobile.innerHTML = "";

      const headerRow = document.createElement("tr");
      intestazione.forEach(col => {
        const th = document.createElement("th");
        th.textContent = col;
        headerRow.appendChild(th);
      });
      thead.appendChild(headerRow);

      for (let i = startRow; i < righe.length; i++) {
        const colonneGrezze = righe[i].split(",").map(c => c.replace(/"/g, "").trim());

        if (colonneGrezze.length > intestazione.length) {
          const ultimo = colonneGrezze[colonneGrezze.length - 1];
          const penultimo = colonneGrezze[colonneGrezze.length - 2];
          if (/^\d+$/.test(penultimo) && ultimo === "5") {
            colonneGrezze.splice(-2, 2, `${penultimo}.5`);
          }
        }

        const colonne = [...colonneGrezze];
        if (nomeFoglio !== "Totale") colonne.splice(2, 1);

        const tr = document.createElement("tr");
        tr.classList.add("riga-classifica");
        if (nomeFoglio === "Totale" && i <= 4) tr.classList.add("top4");
        if (nomeFoglio === "Totale" && i >= righe.length - 4) tr.classList.add("ultime4");
        if ((nomeFoglio === "Conference" || nomeFoglio === "Championship") && i === startRow) tr.classList.add("top1");

        colonne.forEach((val, idx) => {
          const td = document.createElement("td");
          if (idx === 1) {
            const div = document.createElement("div");
            div.className = "logo-nome";
            const img = document.createElement("img");
            const name = val.replace(/[👑🎖️💀]/g, "").trim();
            img.src = `img/${name}.png`;
            img.onerror = () => (img.style.display = "none");
            const span = document.createElement("span");
            span.textContent = val;
            div.appendChild(img);
            div.appendChild(span);
            td.appendChild(div);
          } else {
            td.textContent = formattaNumero(val);
          }
          tr.appendChild(td);
        });
        tbody.appendChild(tr);

        const item = document.createElement("div");
        item.className = "accordion-item";
        if (tr.classList.contains("top4")) item.classList.add("top4");
        if (tr.classList.contains("ultime4")) item.classList.add("ultime4");
        if (tr.classList.contains("top1")) item.classList.add("top1");

        const header = document.createElement("div");
        header.className = "accordion-header";
        const img = document.createElement("img");
        const team = colonne[1].replace(/[👑🎖️💀]/g, "").trim();
        img.src = `img/${team}.png`;
        img.onerror = () => (img.style.display = "none");
        const span = document.createElement("span");
        const posClean = String(colonne[0]).replace(/[^\d]/g, "").trim();
        span.innerHTML = `<strong>${posClean}\u00B0 ${colonne[1]}</strong><br><span style='font-weight:normal'>PT. ${colonne.at(-2)} / MP. ${colonne.at(-1)}</span>`;
        header.appendChild(img);
        header.appendChild(span);

        const body = document.createElement("div");
        body.className = "accordion-body";
        for (let j = 2; j < colonne.length; j++) {
          const label = intestazione[j];
          const v = formattaNumero(colonne[j]);
          const p = document.createElement("span");
          p.innerHTML = `<strong>${label}:</strong> ${v}`;
          body.appendChild(p);
        }

        header.addEventListener("click", () => item.classList.toggle("active"));
        item.appendChild(header);
        item.appendChild(body);
        mobile.appendChild(item);
      }
    })
    .catch(e => console.error("Errore caricamento classifica:", e));
}

const NOMI_ESTESI = {
  "Conference": "Conference League",
  "Championship": "Conference Championship",
  "Round Robin": "Round Robin",
  "Totale": "Totale"
};

window.onload = () => {
  caricaClassifica("Conference");
  loadRaceFromResults(); // ✅ avvia la race
};

document.querySelectorAll(".switcher button").forEach(btn => {
  btn.addEventListener("click", () => {
    const nomeFoglio = btn.textContent;
    document.querySelector("h1").textContent = "Classifica " + NOMI_ESTESI[nomeFoglio];
    caricaClassifica(nomeFoglio);
  });
});

