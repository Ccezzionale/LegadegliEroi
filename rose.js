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
  { col: 0, start: 2, end: 29, headerRow: 0 },
  { col: 5, start: 2, end: 29, headerRow: 0 },
  { col: 0, start: 33, end: 60, headerRow: 31 },
  { col: 5, start: 33, end: 60, headerRow: 31 },
  { col: 0, start: 64, end: 91, headerRow: 62 },
  { col: 5, start: 64, end: 91, headerRow: 62 },
  { col: 0, start: 95, end: 122, headerRow: 93 },
  { col: 5, start: 95, end: 122, headerRow: 93 },
  { col: 0, start: 126, end: 153, headerRow: 124 },
  { col: 5, start: 126, end: 153, headerRow: 124 },
  { col: 0, start: 157, end: 184, headerRow: 155 },
  { col: 5, start: 157, end: 184, headerRow: 155 },
  { col: 0, start: 188, end: 215, headerRow: 186 },
  { col: 5, start: 188, end: 215, headerRow: 186 },
  { col: 0, start: 219, end: 246, headerRow: 217 },
  { col: 5, start: 219, end: 246, headerRow: 217 },
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
  // prova su headerRow e anche headerRow-1 (alcuni incolli lasciano il nome un rigo sopra)
  const rowsToTry = [headerRow, headerRow - 1];
  const ban = new Set(["ruolo","calciatore","nome","squadra","costo","quotazione","prezzo","valore","crediti","crediti attuali"]);
  for (const hr of rowsToTry) {
    const row = rows[hr] || [];
    for (let c = startCol; c < startCol + 8; c++) {
      const raw = (row[c] || "").trim();
      const n = norm(raw);
      if (!raw) continue;
      if (ban.has(n)) continue;
      return raw;
    }
  }
  return "";
}

// parsing robusto di un blocco + fallback
function parseBlock(rows, s) {
  const team = detectTeamName(rows, s.headerRow, s.col);
  if (!team) {
    console.warn("Team non rilevato in blocco", s);
    return null;
  }

  const cols = detectCols(rows, s.headerRow, s.col);
  // debug: vedi dove ha trovato le colonne
  console.log("Cols per", team, cols);

  const giocatori = [];
  for (let r = s.start; r <= s.end; r++) {
    const ruolo   = rows[r]?.[cols.ruolo]   || "";
    const nome    = rows[r]?.[cols.nome]    || "";
    const squadra = rows[r]?.[cols.squadra] || "";
    const quota   = rows[r]?.[cols.costo]   || "";

    if (!nome || norm(nome) === "nome") continue;

    const nomeClean = nome.toLowerCase();
    giocatori.push({
      nome, ruolo, squadra, quotazione: quota,
      fp: isFP(nome, team),
      u21: !!giocatoriU21PerSquadra[team]?.includes(nomeClean)
    });
  }

  return { team, giocatori };
}

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
