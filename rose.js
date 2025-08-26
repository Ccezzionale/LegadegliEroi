const rose = {};


const conferencePerSquadra = {
  "Team Bartowski": "Conference League",
  "Desperados": "Conference League",
  "riverfilo": "Conference Championship",
  "Golden Knights": "Conference Championship",
  "Fantaugusta": "Conference Championship",
  "Union Librino": "Conference Championship",
  "Rubinkebab": "Conference Championship",
  "Eintracht Franco 126": "Conference Championship",
  "Fc Disoneste": "Conference Championship",
  "POKERMANTRA": "Conference Championship",
  "wildboys78": "Conference Championship",
  "Bayern Christiansen": "Conference League",
  "Minnesode Timberland": "Conference League",
  "Giulay": "Conference League",
  "MinneSota Snakes": "Conference League",
  "Ibla": "Conference League",
  "Pandinicoccolosini": "Conference League",
  "Athletic Pongao": "Conference League"
};

const giocatoriFP = new Set();

const giocatoriU21PerSquadra = {
  "Team Bartowski": ["comuzzo", "carboni v.", "mateus lusuardi"],
  "Desperados": ["rodriguez je.", "bravo", "ramon"],
  "riverfilo": ["paz n.", "esposito f.p.", "akinsanmiro"],
  "Golden Knights": ["leoni", "camarda", "tiago gabriel"],
  "Fantaugusta": ["comuzzo", "bravo", "ekhator"],
  "Fc Disoneste": ["gineitis", "norton-cuffy", "mateus lusuardi"],
  "Rubinkebab": ["diao", "pisilli", "ahanor"],
  "Eintracht Franco 126": ["carboni v.", "valle", "ramon"],
  "POKERMANTRA": ["ordonez c.", "goglichidze", "belahyane"],
  "wildboys78": ["jimenez a.", "castro s.", "ferguson e."],
  "Bayern Christiansen": ["paz n.", "addai", "ordonez c."],
  "Minnesode Timberland": ["diao", "ferguson e.", "pisilli"],
  "Athletic Pongao": ["valle", "tiago gabriel", "norton-cuffy"],
  "MinneSota Snakes": ["esposito f.p.", "akinsanmiro", "goglichidze"],
  "Ibla": ["camarda", "belahyane", "mbambi"],
  "Pandinicoccolosini": ["jimenez a.", "ahanor", "athekame"]
};

const giocatoriFPManualiPerSquadra = {
  "Rubinkebab": [],
  "wildboys78": [],
  "Desperados": [],
  "MinneSota Snakes": [],
  "POKERMANTRA": [],
  "Minnesode Timberland": [],
  "Bayern Christiansen": [],
  "Golden Knights": [],
  "Ibla": [],
  "Fc Disoneste": [],
  "Athletic Pongao": [],
  "Pandinicoccolosini": [],
};

const giocatoriFPSceltiPerSquadra = {
  "Pandinicoccolosini": ["ekkelenkamp"],
  "Ibla": ["angelino"],
  "Rubinkebab": ["de ketelaere"]
};

const giocatoriU21SceltiPerSquadra = {
  "Desperados": ["fazzini "],
  "Pandinicoccolosini": ["yildiz"],
  "POKERMANTRA": ["yildiz"],
  "Fc Disoneste": ["soulè"],
  "Ibla": ["soulè"],
  "Bayern Christiansen": ["castro s."],
  "Minnesode Timberland": ["scalvini"],
  "Eintracht Franco 126": ["casadei"]
  
};

// GViz CSV stabile
const URL_ROSE =
  "https://docs.google.com/spreadsheets/d/1weMP9ajaScUSQhExCe7D7jtC7SjC9udw5ISg8f6Bezg/gviz/tq?tqx=out:csv&gid=0&cachebust=" + Date.now();

const URL_QUOTAZIONI =
  "https://docs.google.com/spreadsheets/d/1weMP9ajaScUSQhExCe7D7jtC7SjC9udw5ISg8f6Bezg/gviz/tq?tqx=out:csv&gid=2087990274&cachebust=" + Date.now();

const squadre = [
  { col: 0,  start: 1, end: 28, headerRow: 0 },   // prima era 2..29
  { col: 5,  start: 1, end: 28, headerRow: 0 },
  { col: 0,  start: 32, end: 59, headerRow: 30 }, // prima era 33..60
  { col: 5,  start: 32, end: 59, headerRow: 30 },
  { col: 0,  start: 63, end: 90, headerRow: 61 },
  { col: 5,  start: 63, end: 90, headerRow: 61 },
  { col: 0,  start: 94, end: 121, headerRow: 92 },
  { col: 5,  start: 94, end: 121, headerRow: 92 },
  { col: 0,  start: 125, end: 152, headerRow: 123 },
  { col: 5,  start: 125, end: 152, headerRow: 123 },
  { col: 0,  start: 156, end: 183, headerRow: 154 },
  { col: 5,  start: 156, end: 183, headerRow: 154 },
  { col: 0,  start: 187, end: 214, headerRow: 185 },
  { col: 5,  start: 187, end: 214, headerRow: 185 },
  { col: 0,  start: 218, end: 245, headerRow: 216 },
  { col: 5,  start: 218, end: 245, headerRow: 216 },
];

const parseCSV = t =>
  t.replace(/\r/g,"").split("\n").filter(Boolean)
   .map(r => r.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(c => c.replace(/^"|"$/g,"")));

async function fetchCSV(url){
  const res = await fetch(url, { cache: "no-store", redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status} su ${url}`);
  const txt = await res.text();
  if (!txt) throw new Error("CSV vuoto");
  return parseCSV(txt);
}

// helper: prende il nome squadra cercando nella riga headerRow tra le 4 celle del blocco
function getTeamNameFixed(rows, headerRow, startCol) {
  for (let c = startCol; c < startCol + 4; c++) {
    const v = (rows[headerRow]?.[c] || "").trim();
    if (v && v.toLowerCase() !== "ruolo") return v;
  }
  return "";
}

async function caricaRose() {
  await caricaGiocatoriFP();
  const rows = await fetchCSV(URL_ROSE);

  // 🔎 DEBUG qui
  console.log("Row 0 (header blocco 1):", rows[0]);
  console.log("Row 1 (intestazioni):", rows[1]);
  console.log("Row 2 (primo giocatore?):", rows[2]);

  for (const s of squadre) {
    const nomeSquadra = (rows[s.headerRow]?.[s.col] || "").trim();
    console.log("DEBUG squadra:", nomeSquadra, "row:", rows[s.headerRow]);

    const giocatori = [];
    for (let i = s.start; i <= s.end; i++) {
      const ruolo = (rows[i]?.[s.col]     || "").trim();
      const nome  = (rows[i]?.[s.col + 1] || "").trim();
      const team  = (rows[i]?.[s.col + 2] || "").trim();
      const quota = (rows[i]?.[s.col + 3] || "").trim();

      if (!nome || nome.toLowerCase() === "nome") continue;

      const nomeClean = nome.toLowerCase();
      giocatori.push({
        nome,
        ruolo,
        squadra: team,
        quotazione: quota,
        fp: isFP(nome, nomeSquadra),
        u21: !!giocatoriU21PerSquadra[nomeSquadra]?.includes(nomeClean),
      });
    }

    if (giocatori.length) {
      rose[nomeSquadra] = { logo: trovaLogo(nomeSquadra), giocatori };
    }
  }

  mostraRose();
  popolaFiltri();
}


function trovaLogo(nomeSquadra) {
  const estensioni = [".png", ".jpg"];
  const varianti = [
    nomeSquadra,
    nomeSquadra.toLowerCase(),
    nomeSquadra.replaceAll(" ", "_").toLowerCase()
  ];
  for (const base of varianti) {
    for (const ext of estensioni) {
      return `img/${base}${ext}`;
    }
  }
  return "img/default.png";
}

async function caricaGiocatoriFP() {
  try {
    const rows = await fetchCSV(URL_QUOTAZIONI);
    const portieriPerSquadra = {};

    for (let i = 1; i < rows.length; i++) {
      const ruolo = (rows[i][0] || "").toUpperCase();
      const nome = rows[i][2] || "";
      const squadra = rows[i][3] || "";
      const quotazione = parseFloat((rows[i][4] || "").replace(",", "."));
      if (!nome || isNaN(quotazione)) continue;

      const nomeLower = nome.toLowerCase();

      if (ruolo === "P") {
        (portieriPerSquadra[squadra] ||= []).push({ nome: nomeLower, quotazione });
      } else if (
        (ruolo === "D" && quotazione <= 9) ||
        (ruolo === "C" && quotazione <= 14) ||
        (ruolo === "A" && quotazione <= 19)
      ) {
        giocatoriFP.add(nomeLower);
      }
    }

    for (const squadra in portieriPerSquadra) {
      const blocco = portieriPerSquadra[squadra];
      const maxQuota = Math.max(...blocco.map(p => p.quotazione));
      if (maxQuota <= 12) blocco.forEach(p => giocatoriFP.add(p.nome));
    }

    for (const lst of Object.values(giocatoriFPManualiPerSquadra)) {
      lst.forEach(n => giocatoriFP.add((n || "").toLowerCase()));
    }
  } catch (e) {
    console.error("Errore nel caricamento FP:", e);
  }
}

function isFP(nome, squadra) {
  const nomeClean = nome.toLowerCase();

  // Se è FP automatico, va bene ovunque
  if (giocatoriFP.has(nomeClean)) {
    // Se non è stato forzato in una squadra specifica, è valido ovunque
    const squadreManuali = Object.keys(giocatoriFPManualiPerSquadra);
    const èManuale = squadreManuali.some(s => giocatoriFPManualiPerSquadra[s].includes(nomeClean));
    if (!èManuale) return true;

    // Se è stato forzato manualmente, è FP solo nella squadra specifica
    return giocatoriFPManualiPerSquadra[squadra]?.includes(nomeClean) || false;
  }

  return false;
}

function norm(s="") {
  return s
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"") // senza accentate
    .replace(/[^a-z0-9 ]+/g," ")                     // rimuovi punteggiatura
    .replace(/\s+/g," ")                             // spazi singoli
    .trim();
}

// trova gli indici reali delle 4 colonne cercando nella riga di intestazione (quella sotto al titolo squadra)
function detectCols(rows, headerRow, startCol) {
  const headerCandidates = [rows[headerRow], rows[headerRow + 1], rows[headerRow + 2]].filter(Boolean);
  let ruolo=-1, nome=-1, squadra=-1, costo=-1;

  const isRuolo   = v => ["ruolo","ruoli"].includes(norm(v));
  const isNome    = v => {
    const n = norm(v);
    return n === "calciatore" || n === "nome" || n.includes("calciatore") || n.includes("giocatore");
  };
  const isSquadra = v => {
    const n = norm(v);
    return n === "squadra" || n.includes("squadra");
  };
  const isCosto   = v => {
    const n = norm(v);
    return n === "costo" || n === "quotazione" || n === "prezzo" || n.includes("credito") || n.includes("valore");
  };

  for (const hdr of headerCandidates) {
    for (let c = startCol; c < startCol + 14; c++) {
      const v = hdr[c] ?? "";
      if (ruolo   < 0 && isRuolo(v))   ruolo   = c;
      if (nome    < 0 && isNome(v))    nome    = c;
      if (squadra < 0 && isSquadra(v)) squadra = c;
      if (costo   < 0 && isCosto(v))   costo   = c;
    }
    if (ruolo>=0 && nome>=0 && squadra>=0) break;
  }

  // Fallback alle posizioni storiche se qualcosa manca
  if (ruolo   < 0) ruolo   = startCol + 0;
  if (nome    < 0) nome    = startCol + 1;
  if (squadra < 0) squadra = startCol + 2;
  if (costo   < 0) costo   = startCol + 3;

  return { ruolo, nome, squadra, costo };
}

// prende il nome squadra guardando nella riga headerRow nell'area del blocco
function detectTeamName(rows, headerRow, startCol) {
  // parole da escludere (intestazioni)
  const banHdr = /^(ruolo|calciatore|nome|squadra|costo|quotazione|prezzo|valore|crediti|crediti attuali)$/i;
  // codici ruolo da escludere (anche composti)
  const banRuoli = /^(p|por|d|dc|dd|ds|e|m|c|a|w|t|c;?t|m;?c|dd;?dc|dc;?dd|dc;?ds|ds;?dc)$/i;

  // guarda solo sulla riga del titolo (celle unite -> un valore nelle prime 1–4 celle)
  let candidate = "";
  for (let c = startCol; c < startCol + 4; c++) {
    const v = (rows[headerRow]?.[c] || "").trim();
    if (!v) continue;
    if (banHdr.test(v)) continue;
    if (banRuoli.test(v)) continue;
    candidate = v;
    break;
  }
  if (!candidate) return "";

  // se la cella per sbaglio contiene " ... Ruolo" appendiciamolo via
  candidate = candidate.replace(/\bruolo\b.*$/i, "").trim();

  return candidate;
}


// trova la riga con le intestazioni (Ruolo/Calciatore/Squadra/...) vicino a s.start
function detectHeaderRowInBlock(rows, s, cols) {
  // cerca da 3 righe sopra a 3 righe sotto lo start previsto
  const from = Math.max(0, s.start - 3);
  const to   = s.start + 3;
  const isHdrCell = (r,c,expect) => norm(rows[r]?.[c] || "") === expect;

  const candidates = [
    {r: s.headerRow + 1, weight: 3}, // prima scelta: come da schema storico
    {r: s.start - 1,     weight: 2},
    {r: s.start,         weight: 2},
    {r: s.start + 1,     weight: 2},
  ];

  // aggiungi lo scan nella finestra
  for (let r = from; r <= to; r++) candidates.push({r, weight: 1});

  let best = null;
  for (const {r, weight} of candidates) {
    if (r < 0 || r >= rows.length) continue;
    const ok =
      isHdrCell(r, cols.ruolo,   "ruolo") &&
      (isHdrCell(r, cols.nome,   "calciatore") || isHdrCell(r, cols.nome, "nome")) &&
      isHdrCell(r, cols.squadra, "squadra");
    if (ok) {
      if (!best || weight > best.weight) best = {r, weight};
    }
  }
  return best ? best.r : (s.headerRow + 1); // fallback
}

function isEmptyRow(rows, r, cols) {
  const a = (rows[r]?.[cols.ruolo]   || "").trim();
  const b = (rows[r]?.[cols.nome]    || "").trim();
  const c = (rows[r]?.[cols.squadra] || "").trim();
  return !a && !b && !c;
}
function isHeaderRow(rows, r, cols) {
  const nome = (rows[r]?.[cols.nome] || "").trim().toLowerCase();
  const ruolo = (rows[r]?.[cols.ruolo] || "").trim().toLowerCase();
  return nome === "nome" || nome === "calciatore" || ruolo === "ruolo";
}
function firstDataRow(rows, from, cols) {
  let r = from;
  while (r < rows.length) {
    if (!isHeaderRow(rows, r, cols) && !isEmptyRow(rows, r, cols)) return r;
    r++;
  }
  return from;
}

// --- SOSTITUISCI parseBlock con questa ---
function parseBlock(rows, s) {
  const team = detectTeamName(rows, s.headerRow, s.col);
  if (!team) return null;

  const cols = detectCols(rows, s.headerRow, s.col);

  // trova la riga di intestazione reale (quella con Ruolo/Nome/Squadra)
  const hdrRow = detectHeaderRowInBlock(rows, s, cols);

  // parti dalla prima riga realmente piena dopo l'header
  const startRow = firstDataRow(rows, hdrRow + 1, cols);

  // fermati a fine-blocco oppure dopo 3 righe vuote consecutive
  const hardEnd = s.end;
  let emptyStreak = 0;
  const giocatori = [];

  for (let r = startRow; r <= hardEnd && emptyStreak < 3; r++) {
    const ruolo   = (rows[r]?.[cols.ruolo]   || "").trim();
    const nome    = (rows[r]?.[cols.nome]    || "").trim();
    const squadra = (rows[r]?.[cols.squadra] || "").trim();
    const quota   = (rows[r]?.[cols.costo]   || "").trim();

    if (!ruolo && !nome && !squadra) { emptyStreak++; continue; }
    emptyStreak = 0;
    if (!nome || nome.toLowerCase() === "nome") continue;

    const nomeClean = nome.toLowerCase();
    giocatori.push({
      nome, ruolo, squadra, quotazione: quota,
      fp: isFP(nome, team),
      u21: !!giocatoriU21PerSquadra[team]?.includes(nomeClean),
    });
  }

  console.log(`Bloc: ${team}  hdrRow=${hdrRow}  startRow=${startRow}  cols=`, cols);
  return { team, giocatori }

async function caricaRose() {
  await caricaGiocatoriFP();
  const rows = await fetchCSV(URL_ROSE);

  // (debug opzionale per il primo blocco)
  // const first = squadre[0];
  // console.log("HDR row", first.headerRow, rows[first.headerRow]);
  // console.log("HDR row+1", first.headerRow+1, rows[first.headerRow+1]);
  // console.log("Cols", detectCols(rows, first.headerRow, first.col));
  // console.log("Team", detectTeamName(rows, first.headerRow, first.col));

  for (const s of squadre) {
    const parsed = parseBlock(rows, s);
    if (!parsed || !parsed.giocatori.length) continue;

    rose[parsed.team] = {
      logo: trovaLogo(parsed.team),
      giocatori: parsed.giocatori
    };
  }

  mostraRose();
  popolaFiltri();
}



function mostraRose() {
  const container = document.getElementById("contenitore-rose");
  if (!container) return;
  container.innerHTML = "";

  const nomeCercato = document.getElementById("filtro-nome")?.value?.toLowerCase() || "";

  for (const [nome, data] of Object.entries(rose)) {
    const div = document.createElement("div");
    div.className = "box-rosa giocatore";
    div.setAttribute("data-squadra", nome);
    div.setAttribute("data-conference", conferencePerSquadra[nome] || "N/A");

    const header = document.createElement("div");
    header.className = "logo-nome";

    const img = document.createElement("img");
    img.src = data.logo;
    img.alt = nome;
    img.onerror = () => { img.style.display = "none"; };

    const name = document.createElement("span");
    name.textContent = nome;

    header.appendChild(img);
    header.appendChild(name);
    div.appendChild(header);

    const table = document.createElement("table");
    table.innerHTML = `
      <thead><tr><th>Ruolo</th><th>Nome</th><th>Squadra</th></tr></thead>
      <tbody>
        ${data.giocatori.map(g => {
          const nomeBasso = g.nome.toLowerCase();
          const evidenziato = nomeCercato && nomeBasso.includes(nomeCercato)
            ? g.nome.replace(new RegExp(`(${nomeCercato})`, 'i'), '<span class="evidenziato">$1</span>')
            : g.nome;

          return `
            <tr>
              <td>${g.ruolo}</td>
<td class="nome">
  ${g.fp ? `<strong>${evidenziato}</strong>` : evidenziato}
  ${g.u21 ? '<span class="badge-u21">U21</span>' : ''}
  ${giocatoriFPSceltiPerSquadra[nome]?.includes(g.nome.toLowerCase()) ? '<span class="badge-fp">⭐</span>' : ''}
  ${giocatoriU21SceltiPerSquadra[nome]?.includes(g.nome.toLowerCase()) ? '<span class="badge-u21-scelto">🐣</span>' : ''}
</td>
              <td>${g.squadra}</td>
            </tr>`;
        }).join("")}
      </tbody>
    `;
    div.appendChild(table);
    container.appendChild(div);
  }
}
function popolaFiltri() {
  const selectSquadra = document.getElementById("filtro-squadra");
  const selectConference = document.getElementById("filtro-conference");

  selectSquadra.innerHTML = '<option value="Tutte">Tutte le squadre</option>';
  selectConference.innerHTML = '<option value="Tutte">Tutte le Conference</option>';

  const squadreSet = new Set();
  const conferenceSet = new Set();

  for (const squadra in rose) {
    squadreSet.add(squadra);
    const conf = conferencePerSquadra[squadra] || "N/A";
    conferenceSet.add(conf);
  }

  Array.from(squadreSet).sort().forEach(sq => {
    const option = document.createElement("option");
    option.value = sq;
    option.textContent = sq;
    selectSquadra.appendChild(option);
  });

  Array.from(conferenceSet).sort().forEach(conf => {
    const option = document.createElement("option");
    option.value = conf;
    option.textContent = conf;
    selectConference.appendChild(option);
  });
}

function filtraGiocatori() {
  const nome = document.getElementById('filtro-nome').value.toLowerCase();
  const conference = document.getElementById('filtro-conference').value;
  const squadra = document.getElementById('filtro-squadra').value;

  // Mostra di nuovo tutte le rose aggiornate con evidenziato
  mostraRose();

  document.querySelectorAll('.giocatore').forEach(row => {
    const nomiGiocatori = [...row.querySelectorAll('.nome')].map(e => e.textContent.toLowerCase());
    const conf = row.getAttribute('data-conference');
    const team = row.getAttribute('data-squadra');

    const matchNome = nomiGiocatori.some(n => n.includes(nome));
    const matchConf = (conference === 'Tutte' || conf === conference);
    const matchTeam = (squadra === 'Tutte' || team === squadra);

    if (matchNome && matchConf && matchTeam) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  });
}


document.getElementById('filtro-nome').addEventListener('input', filtraGiocatori);
document.getElementById('filtro-conference').addEventListener('change', filtraGiocatori);
document.getElementById('filtro-squadra').addEventListener('change', filtraGiocatori);

function resetFiltri() {
  document.getElementById('filtro-nome').value = '';
  document.getElementById('filtro-conference').value = 'Tutte';
  document.getElementById('filtro-squadra').value = 'Tutte';
  filtraGiocatori();
}

window.addEventListener("DOMContentLoaded", caricaRose);
