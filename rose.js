/* =============== CONFIG =============== */
console.log("rose.js loaded @", new Date().toISOString());

const rose = {};

const conferencePerSquadra = {
  "Team Bartowski":"Conference League","Desperados":"Conference League",
  "riverfilo":"Conference Championship","Golden Knights":"Conference Championship",
  "Fantaugusta":"Conference Championship","Union Librino":"Conference Championship",
  "Rubinkebab":"Conference Championship","Eintracht Franco 126":"Conference Championship",
  "Fc Disoneste":"Conference Championship","POKERMANTRA":"Conference Championship",
  "wildboys78":"Conference Championship","Bayern Christiansen":"Conference League",
  "Minnesode Timberland":"Conference League","Giulay":"Conference League",
  "MinneSota Snakes":"Conference League","Ibla":"Conference League",
  "Pandinicoccolosini":"Conference League","Athletic Pongao":"Conference League"
};

const giocatoriFP = new Set();

const giocatoriU21PerSquadra = {
  "Team Bartowski":["comuzzo","carboni v.","mateus lusuardi"],
  "Desperados":["rodriguez je.","bravo","ramon"],
  "riverfilo":["paz n.","esposito f.p.","akinsanmiro"],
  "Golden Knights":["leoni","camarda","tiago gabriel"],
  "Fantaugusta":["comuzzo","bravo","ekhator"],
  "Fc Disoneste":["gineitis","norton-cuffy","mateus lusuardi"],
  "Rubinkebab":["diao","pisilli","ahanor"],
  "Eintracht Franco 126":["carboni v.","valle","ramon"],
  "POKERMANTRA":["ordonez c.","goglichidze","belahyane"],
  "wildboys78":["jimenez a.","castro s.","ferguson e."],
  "Bayern Christiansen":["paz n.","addai","ordonez c."],
  "Minnesode Timberland":["diao","ferguson e.","pisilli"],
  "Athletic Pongao":["valle","tiago gabriel","norton-cuffy"],
  "MinneSota Snakes":["esposito f.p.","akinsanmiro","goglichidze"],
  "Ibla":["camarda","belahyane","mbambi"],
  "Pandinicoccolosini":["jimenez a.","ahanor","athekame"]
};

const giocatoriFPManualiPerSquadra = {
  "Rubinkebab": [], "wildboys78": [], "Desperados": [], "MinneSota Snakes": [],
  "POKERMANTRA": [], "Minnesode Timberland": [], "Bayern Christiansen": [],
  "Golden Knights": [], "Ibla": [], "Fc Disoneste": [], "Athletic Pongao": [],
  "Pandinicoccolosini": []
};

const giocatoriFPSceltiPerSquadra = {
  "Pandinicoccolosini":["ekkelenkamp"],
  "Ibla":["angelino"],
  "Rubinkebab":["de ketelaere"]
};

const giocatoriU21SceltiPerSquadra = {
  "Desperados":["fazzini "],
  "Pandinicoccolosini":["yildiz"],
  "POKERMANTRA":["yildiz"],
  "Fc Disoneste":["soulè"],
  "Ibla":["soulè"],
  "Bayern Christiansen":["castro s."],
  "Minnesode Timberland":["scalvini"],
  "Eintracht Franco 126":["casadei"]
};

// GViz CSV (con cache-busting)
const URL_ROSE = "https://docs.google.com/spreadsheets/d/1weMP9ajaScUSQhExCe7D7jtC7SjC9udw5ISg8f6Bezg/gviz/tq?tqx=out:csv&gid=0&cachebust=" + Date.now();
const URL_QUOTAZIONI = "https://docs.google.com/spreadsheets/d/1weMP9ajaScUSQhExCe7D7jtC7SjC9udw5ISg8f6Bezg/gviz/tq?tqx=out:csv&gid=2087990274&cachebust=" + Date.now();

// Blocchi (coordinate “storiche” – non devono essere perfette: l’algoritmo corregge)
const squadre = [
  { col:0, start:1, end:28, headerRow:0 }, { col:5, start:1, end:28, headerRow:0 },
  { col:0, start:32, end:59, headerRow:30 }, { col:5, start:32, end:59, headerRow:30 },
  { col:0, start:63, end:90, headerRow:61 }, { col:5, start:63, end:90, headerRow:61 },
  { col:0, start:94, end:121, headerRow:92 }, { col:5, start:94, end:121, headerRow:92 },
  { col:0, start:125, end:152, headerRow:123 }, { col:5, start:125, end:152, headerRow:123 },
  { col:0, start:156, end:183, headerRow:154 }, { col:5, start:156, end:183, headerRow:154 },
  { col:0, start:187, end:214, headerRow:185 }, { col:5, start:187, end:214, headerRow:185 },
  { col:0, start:218, end:245, headerRow:216 }, { col:5, start:218, end:245, headerRow:216 },
];

/* =============== UTILITY CSV/TESTO =============== */
const parseCSV = (t) =>
  t.replace(/^\uFEFF/, "")               // BOM
   .replace(/\r/g, "")                   // CRLF -> LF
   .split("\n")                          // NON rimuovere righe vuote!
   .map(r =>
     r.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)   // split sicuro su virgole
      .map(c => c.replace(/^"|"$/g, ""))       // togli apici esterni
   );

async function fetchCSV(url){
  const res = await fetch(url, { cache:"no-store", redirect:"follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status} su ${url}`);
  const txt = await res.text();
  if (!txt) throw new Error("CSV vuoto");
  return parseCSV(txt);
}

const norm = (s="") =>
  s.toLowerCase()
   .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
   .replace(/[^a-z0-9 ]+/g," ").replace(/\s+/g," ").trim();

/* =============== LOGO =============== */
function trovaLogo(nomeSquadra) {
  const base = [
    nomeSquadra,
    nomeSquadra.toLowerCase(),
    nomeSquadra.replaceAll(" ","_").toLowerCase()
  ];
  for (const b of base) {
    for (const ext of [".png",".jpg"]) return `img/${b}${ext}`;
  }
  return "img/default.png";
}

/* =============== FP =============== */
function isFP(nome, squadra) {
  const n = (nome||"").toLowerCase();
  if (giocatoriFP.has(n)) {
    // se è stato marcato manuale per una squadra specifica, vale solo lì
    const existsSomeManual = Object.values(giocatoriFPManualiPerSquadra).some(lst => lst.includes(n));
    if (!existsSomeManual) return true;
    return (giocatoriFPManualiPerSquadra[squadra]||[]).includes(n);
  }
  return false;
}

async function caricaGiocatoriFP() {
  try {
    const rows = await fetchCSV(URL_QUOTAZIONI);
    const portieriPerSquadra = {};
    for (let i=1;i<rows.length;i++) {
      const ruolo = (rows[i][0]||"").toUpperCase();
      const nome = rows[i][2]||"";
      const squadra = rows[i][3]||"";
      const q = parseFloat((rows[i][4]||"").replace(",","."));
      if (!nome || isNaN(q)) continue;
      const n = nome.toLowerCase();

      if (ruolo === "P") {
        (portieriPerSquadra[squadra] ||= []).push({ nome:n, q });
      } else if ((ruolo==="D" && q<=9) || (ruolo==="C" && q<=14) || (ruolo==="A" && q<=19)) {
        giocatoriFP.add(n);
      }
    }
    for (const s in portieriPerSquadra) {
      const blocco = portieriPerSquadra[s];
      if (Math.max(...blocco.map(p=>p.q)) <= 12) blocco.forEach(p=>giocatoriFP.add(p.nome));
    }
    for (const lst of Object.values(giocatoriFPManualiPerSquadra)) {
      lst.forEach(n => giocatoriFP.add((n||"").toLowerCase()));
    }
  } catch(e) {
    console.error("Errore nel caricamento FP:", e);
  }
}

/* =============== RILEVAMENTO STRUTTURA BLOCCHI =============== */
function detectCols(rows, headerRow, startCol) {
  const headers = [rows[headerRow], rows[headerRow+1], rows[headerRow+2]].filter(Boolean);
  let ruolo=-1, nome=-1, squadra=-1, costo=-1;
  const isRuolo   = v => ["ruolo","ruoli"].includes(norm(v));
  const isNome    = v => { const n=norm(v); return n==="calciatore"||n==="nome"||n.includes("calciatore")||n.includes("giocatore"); };
  const isSquadra = v => norm(v).includes("squadra");
  const isCosto   = v => ["costo","quotazione","prezzo","valore"].includes(norm(v));
  for (const hdr of headers){
    for (let c=startCol;c<startCol+14;c++){
      const v = hdr[c] ?? "";
      if (ruolo<0 && isRuolo(v)) ruolo=c;
      if (nome<0 && isNome(v)) nome=c;
      if (squadra<0 && isSquadra(v)) squadra=c;
      if (costo<0 && isCosto(v)) costo=c;
    }
    if (ruolo>=0 && nome>=0 && squadra>=0) break;
  }
  if (ruolo<0) ruolo=startCol+0;
  if (nome<0) nome=startCol+1;
  if (squadra<0) squadra=startCol+2;
  if (costo<0) costo=startCol+3;
  return { ruolo, nome, squadra, costo };
}

function detectTeamName(rows, headerRow, startCol) {
  const banHdr = /^(ruolo|calciatore|nome|squadra|costo|quotazione|prezzo|valore|crediti|crediti attuali)$/i;
  const banRuoli = /^(p|por|d|dc|dd|ds|e|m|c|a|w|t|c;?t|m;?c|dd;?dc|dc;?dd|dc;?ds|ds;?dc)$/i;
  for (let c=startCol;c<startCol+4;c++){
    const raw = (rows[headerRow]?.[c]||"").trim();
    if (!raw) continue;
    if (banHdr.test(raw)) continue;
    if (banRuoli.test(raw)) continue;
    return raw.replace(/\bruolo\b.*$/i,"").trim();
  }
  return "";
}

function detectHeaderRowInBlock(rows, s, cols) {
  const from = Math.max(0, s.start-3), to = s.start+3;
  const isHdrCell = (r,c,exp) => norm(rows[r]?.[c]||"") === exp;
  const candidates = [
    {r:s.headerRow+1, weight:3},
    {r:s.start-1, weight:2}, {r:s.start, weight:2}, {r:s.start+1, weight:2}
  ];
  for (let r=from;r<=to;r++) candidates.push({r,weight:1});
  let best=null;
  for (const {r,weight} of candidates){
    if (r<0||r>=rows.length) continue;
    const ok = isHdrCell(r,cols.ruolo,"ruolo") &&
               (isHdrCell(r,cols.nome,"calciatore") || isHdrCell(r,cols.nome,"nome")) &&
               isHdrCell(r,cols.squadra,"squadra");
    if (ok && (!best || weight>best.weight)) best={r,weight};
  }
  return best ? best.r : s.headerRow+1;
}

function isEmptyRow(rows, r, cols){
  const a=(rows[r]?.[cols.ruolo]||"").trim();
  const b=(rows[r]?.[cols.nome]||"").trim();
  const c=(rows[r]?.[cols.squadra]||"").trim();
  return !a && !b && !c;
}
function isHeaderRow(rows, r, cols){
  const ruolo=(rows[r]?.[cols.ruolo]||"").trim().toLowerCase();
  const nome =(rows[r]?.[cols.nome] ||"").trim().toLowerCase();
  return ruolo==="ruolo" || nome==="nome" || nome==="calciatore";
}
function firstDataRow(rows, from, cols){
  let r=from;
  while (r<rows.length){
    if (!isHeaderRow(rows,r,cols) && !isEmptyRow(rows,r,cols)) return r;
    r++;
  }
  return from;
}

function parseBlock(rows, s) {
  const team = detectTeamName(rows, s.headerRow, s.col);
  if (!team) return null;

  const cols   = detectCols(rows, s.headerRow, s.col);
  const hdrRow = detectHeaderRowInBlock(rows, s, cols);

  // ✅ prima riga dati vera dopo l’header (salta header e eventuali righe vuote)
  const dataStart = firstDataRow(rows, hdrRow + 1, cols);
  const dataEnd   = s.end;

  // debug, puoi tenerlo per controllare i blocchi 3/4
  console.log(`Bloc: ${team}  hdrRow=${hdrRow}  dataStart=${dataStart}`, cols);

  const giocatori = [];
  for (let r = dataStart; r <= dataEnd; r++) {
    const ruolo   = (rows[r]?.[cols.ruolo]   || "").trim();
    const nome    = (rows[r]?.[cols.nome]    || "").trim();
    const squadra = (rows[r]?.[cols.squadra] || "").trim();
    const quota   = (rows[r]?.[cols.costo]   || "").trim();

    // salta intestazioni/righe vuote eventualmente ricomparse in mezzo
    const rn = norm(ruolo), nn = norm(nome);
    const isHeaderLike = rn === "ruolo" || nn === "nome" || nn === "calciatore";
    if (!nome || isHeaderLike) continue;

    giocatori.push({
      nome,
      ruolo,
      squadra,
      quotazione: quota,
      fp: isFP(nome, team),
      u21: !!giocatoriU21PerSquadra[team]?.includes(nome.toLowerCase()),
    });
  }

  return { team, giocatori };
}


function getTeamNameFlexible(rows, headerRow, startCol){
  const banHdr = new Set(["ruolo","calciatore","nome","squadra","costo","quotazione","prezzo","valore","crediti","crediti attuali"]);
  const banRuoli = /^(p|por|d|dc|dd|ds|e|m|c|a|w|t|c;?t|m;?c|dd;?dc|dc;?dd|dc;?ds|ds;?dc)$/i;

  const tryRows = [headerRow, headerRow-1, headerRow+1].filter(r => r>=0 && r<rows.length);
  for (const r of tryRows){
    for (let c=startCol; c<startCol+4; c++){
      const raw = (rows[r]?.[c] || "").trim();
      if (!raw) continue;
      const n = norm(raw);
      if (banHdr.has(n)) continue;
      if (banRuoli.test(raw)) continue;
      // togli eventuale "... Ruolo"
      return raw.replace(/\bruolo\b.*$/i,"").trim();
    }
  }
  return "";
}



/* =============== LOAD & RENDER =============== */
async function caricaRose(){
  await caricaGiocatoriFP();
  const rows = await fetchCSV(URL_ROSE);

  for (const s of squadre){
    const parsed = parseBlock(rows, s);   // <— usa la funzione che calcola la riga giusta
    if (!parsed || !parsed.giocatori.length) continue;

    rose[parsed.team] = {
      logo: trovaLogo(parsed.team),
      giocatori: parsed.giocatori
    };
  }

  console.log("Blocchi caricati:", Object.keys(rose));
  mostraRose();
  popolaFiltri();
}

    const giocatori = [];
    for (let i = s.start; i <= s.end; i++){
      const r = rows[i];
      if (!r) continue;

      // se per caso la prima riga del blocco è l’header, salta
      if (i === s.start && norm(r[s.col]||"") === "ruolo") continue;

      const ruolo = (r[s.col]     || "").trim();
      const nome  = (r[s.col + 1] || "").trim();
      const team  = (r[s.col + 2] || "").trim();
      const quota = (r[s.col + 3] || "").trim();

      if (!nome || norm(nome) === "nome") continue;

      const nomeClean = nome.toLowerCase();
      giocatori.push({
        nome, ruolo, squadra: team, quotazione: quota,
        fp: isFP(nome, nomeSquadra),
        u21: !!giocatoriU21PerSquadra[nomeSquadra]?.includes(nomeClean),
      });
    }

    if (giocatori.length){
      rose[nomeSquadra] = { logo: trovaLogo(nomeSquadra), giocatori };
    }
  }

  console.log("Blocchi caricati:", Object.keys(rose));
  mostraRose();
  popolaFiltri();
}

function mostraRose(){
  const container = document.getElementById("contenitore-rose");
  if (!container) return;
  container.innerHTML = "";

  const nomeCercato = (document.getElementById("filtro-nome")?.value || "").toLowerCase();

  for (const [nome, data] of Object.entries(rose)){
    const div = document.createElement("div");
    div.className = "box-rosa giocatore";
    div.dataset.squadra = nome;
    div.dataset.conference = conferencePerSquadra[nome] || "N/A";

    const header = document.createElement("div");
    header.className = "logo-nome";

    const img = document.createElement("img");
    img.src = data.logo; img.alt = nome; img.onerror = () => img.style.display="none";
    const span = document.createElement("span"); span.textContent = nome;
    header.appendChild(img); header.appendChild(span);
    div.appendChild(header);

    const rowsHtml = data.giocatori.map(g => {
      const nomeBasso = g.nome.toLowerCase();
      const evid = nomeCercato && nomeBasso.includes(nomeCercato)
        ? g.nome.replace(new RegExp(`(${nomeCercato})`,'i'), '<span class="evidenziato">$1</span>')
        : g.nome;
      return `
        <tr>
          <td>${g.ruolo}</td>
          <td class="nome">
            ${g.fp ? `<strong>${evid}</strong>` : evid}
            ${g.u21 ? '<span class="badge-u21">U21</span>' : ''}
            ${giocatoriFPSceltiPerSquadra[nome]?.includes(g.nome.toLowerCase()) ? '<span class="badge-fp">⭐</span>' : ''}
            ${giocatoriU21SceltiPerSquadra[nome]?.includes(g.nome.toLowerCase()) ? '<span class="badge-u21-scelto">🐣</span>' : ''}
          </td>
          <td>${g.squadra}</td>
        </tr>`;
    }).join("");

    const table = document.createElement("table");
    table.innerHTML = `<thead><tr><th>Ruolo</th><th>Nome</th><th>Squadra</th></tr></thead><tbody>${rowsHtml}</tbody>`;
    div.appendChild(table);
    container.appendChild(div);
  }
}

function popolaFiltri(){
  const selectSquadra = document.getElementById("filtro-squadra");
  const selectConference = document.getElementById("filtro-conference");
  if (!selectSquadra || !selectConference) return;

  selectSquadra.innerHTML = '<option value="Tutte">Tutte le squadre</option>';
  selectConference.innerHTML = '<option value="Tutte">Tutte le Conference</option>';

  const squadreSet = new Set(Object.keys(rose));
  const conferenceSet = new Set(Object.keys(rose).map(s => conferencePerSquadra[s] || "N/A"));

  [...squadreSet].sort().forEach(sq => {
    const o = document.createElement("option"); o.value = o.textContent = sq; selectSquadra.appendChild(o);
  });
  [...conferenceSet].sort().forEach(cf => {
    const o = document.createElement("option"); o.value = o.textContent = cf; selectConference.appendChild(o);
  });
}

function filtraGiocatori(){
  mostraRose();
  const nome = (document.getElementById('filtro-nome').value || "").toLowerCase();
  const conf = document.getElementById('filtro-conference').value;
  const team = document.getElementById('filtro-squadra').value;

  document.querySelectorAll('.giocatore').forEach(row => {
    const nomi = [...row.querySelectorAll('.nome')].map(e => e.textContent.toLowerCase());
    const okNome = !nome || nomi.some(n => n.includes(nome));
    const okConf = conf === 'Tutte' || row.dataset.conference === conf;
    const okTeam = team === 'Tutte' || row.dataset.squadra === team;
    row.style.display = (okNome && okConf && okTeam) ? '' : 'none';
  });
}

function resetFiltri(){
  document.getElementById('filtro-nome').value = '';
  document.getElementById('filtro-conference').value = 'Tutte';
  document.getElementById('filtro-squadra').value = 'Tutte';
  filtraGiocatori();
}

/* =============== BOOT =============== */
document.getElementById('filtro-nome')?.addEventListener('input', filtraGiocatori);
document.getElementById('filtro-conference')?.addEventListener('change', filtraGiocatori);
document.getElementById('filtro-squadra')?.addEventListener('change', filtraGiocatori);

window.addEventListener("DOMContentLoaded", caricaRose);
