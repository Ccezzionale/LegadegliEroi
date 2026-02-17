// =========================
// GIORNALE TRASH - Lega degli Eroi
// Usa il CSV pubblicato delle statistiche / calendario
// =========================

const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRhEJKfZhVb7V08KI29T_aPTR0hfx7ayIOlFjQn_v-fqgktImjXFg-QAEA6z7w5eyEh2B3w5KLpaRYz/pub?gid=1118969717&single=true&output=csv";

// Se i nomi colonne nel CSV sono diversi, mappali qui.
const COL = {
  gw: "GW",
  team: "Team",
  opp: "Opponent",
  pf: "PointsFor",
  pa: "PointsAgainst",
  result: "Result" // W/L (se non c'è, lo calcoliamo da pf vs pa)
};

// ---------- helpers ----------
function norm(s){ return String(s ?? "").trim(); }
function toNum(x){
  const v = String(x ?? "").trim().replace(",", ".");
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

// CSV parser semplice (compatibile con campi quotati)
function parseCSV(text){
  const rows = [];
  let row = [], cur = "", inQ = false;
  for (let i=0; i<text.length; i++){
    const ch = text[i];
    const nxt = text[i+1];
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

// ---------- trash phrases ----------
function pick(arr){ return arr[Math.floor(Math.random() * arr.length)]; }

function headlineFactory(ctx){
  const { upset, bigMargin, topTeam, flopTeam } = ctx;
  const base = [
    `GIORNATA ${ctx.gw}: CAOS E CONFETTI (MA SOLO PER QUALCUNO)`,
    `GIORNATA ${ctx.gw}: IL CALCIO È SEMPLICE, POI ARRIVANO LORO`,
    `GIORNATA ${ctx.gw}: SI RIDE, SI PIANGE, SI RESETTA IL CERVELLO`,
    `GIORNATA ${ctx.gw}: STATISTICHE URLANO, CUORI PURE`
  ];
  if (upset) return `SCANDALO SPORTIVO: ${upset.winner} FA IL COLPO GROSSO`;
  if (bigMargin) return `MASSACRO A PORTE APERTE: ${bigMargin.winner} FA SPOLVERO DI ${bigMargin.loser}`;
  if (topTeam) return `DOMINIO ASSOLUTO: ${topTeam} FA PAURA (E PURE UN PO' SCHIFO)`;
  if (flopTeam) return `CRONACA NERA: ${flopTeam} È DISPERSA, RICERCE IN CORSO`;
  return pick(base);
}

function editorialFactory(ctx){
  const openers = [
    "Si entra in giornata e si esce con un mal di testa elegante.",
    "La scienza dice: numeri. Il fantacalcio dice: offese creative.",
    "Questa giornata ha avuto la delicatezza di un frigorifero che cade dalle scale."
  ];
  const mids = [
    `Il re è ${ctx.topTeam} con ${ctx.topPF.toFixed(1)} punti: roba da togliere la patente agli altri.`,
    `Il fondo del barile lo firma ${ctx.flopTeam} con ${ctx.flopPF.toFixed(1)}: presente solo con il badge.`,
    ctx.bigMargin
      ? `Nel frattempo ${ctx.bigMargin.winner} ha steso ${ctx.bigMargin.loser} con uno scarto di ${ctx.bigMargin.margin.toFixed(1)}: chiamate il prete e un fisioterapista.`
      : `Scarti contenuti? Sì, come la rabbia trattenuta in ufficio.`
  ];
  const closers = [
    "Ora tutti a dire “settimana prossima svolto”. Certo. Come no.",
    "Appuntamento alla prossima, con nuove illusioni e vecchi traumi.",
    "Se vi sentite male, è normale: è fantacalcio. Idratatevi."
  ];
  return `${pick(openers)} ${pick(mids)} ${pick(closers)}`;
}

// ---------- build matches ----------
function buildMatchesForGW(data, gw){
  // filtro giornata
  const rows = data.filter(r => norm(r[COL.gw]) === String(gw));
  // ogni match è duplicato (team e opponent). Dedup con una chiave ordinata.
  const seen = new Set();
  const matches = [];

  for (const r of rows){
    const A = norm(r[COL.team]);
    const B = norm(r[COL.opp]);
    const pf = toNum(r[COL.pf]);
    const pa = toNum(r[COL.pa]);

    if (!A || !B || !Number.isFinite(pf) || !Number.isFinite(pa)) continue;

    const key = [A, B].sort().join("||");
    // dedup prendendo SOLO la riga in cui A < B alfabeticamente (stabile)
    if (seen.has(key)) continue;
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
  const team = new Map();
  for (const m of matches){
    const add = (name, pts, oppPts) => {
      if (!team.has(name)) team.set(name, { name, pf: 0, pa: 0, w:0, l:0, t:0 });
      const t = team.get(name);
      t.pf += pts; t.pa += oppPts;
      if (pts > oppPts) t.w++;
      else if (pts < oppPts) t.l++;
      else t.t++;
    };
    add(m.home, m.aPoints, m.bPoints);
    add(m.away, m.bPoints, m.aPoints);
  }
  return Array.from(team.values());
}

function voteFromPoints(p){
  // scala “trash” morbida
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
    10: ["Ha giocato con l’algoritmo in tasca.", "Giornata illegale, ma bella da vedere."],
    9:  ["Quasi perfetto: ha lasciato solo briciole.", "Prestazione da far firmare ai notai."],
    8:  ["Solido, cattivo, inevitabile.", "Ha fatto il suo e pure quello degli altri."],
    7:  ["Buono, senza poesia ma con punti.", "Ha vinto anche senza charme."],
    6:  ["Sufficienza: presenza scenica minima, risultato massimo.", "Ha portato a casa la pagnotta."],
    5:  ["Ha camminato. Ogni tanto ha corso. Fine.", "Prestazione “ok”, tipo caffè annacquato."],
    4:  ["Presente solo con il badge.", "Ha perso pure contro il proprio entusiasmo."]
  };
  return pick(map[v] || ["Giornata indescrivibile."]);
}

function buildArticleHTML(ctx){
  const linesMatch = ctx.matches
    .map(m => `<li><b>${m.home}</b> ${m.aPoints.toFixed(1)} - ${m.bPoints.toFixed(1)} <b>${m.away}</b> <span class="muted">(scarto ${m.margin.toFixed(1)})</span></li>`)
    .join("");

  const pagelle = ctx.teamStats
    .sort((a,b) => b.pf - a.pf)
    .map(t => {
      const v = voteFromPoints(t.pf);
      return `<li><b>${t.name}</b> <span class="badge">${v.toFixed(1)}</span> <span class="muted">${commentForVote(v)}</span> <span class="muted">(${t.pf.toFixed(1)} PF)</span></li>`;
    })
    .join("");

  const matchWeek = ctx.matchOfWeek
    ? `<p><b>${ctx.matchOfWeek.home}</b> ${ctx.matchOfWeek.aPoints.toFixed(1)} - ${ctx.matchOfWeek.bPoints.toFixed(1)} <b>${ctx.matchOfWeek.away}</b> <span class="muted">(scarto ${ctx.matchOfWeek.margin.toFixed(1)})</span><br>
       <span class="muted">${ctx.matchOfWeek.margin <= 1 ? "Finale al fotofinish: qui anche un refuso poteva ribaltarla." : "Gara con contatto fisico emotivo garantito."}</span></p>`
    : `<p class="muted">Nessun match trovato per questa giornata.</p>`;

  return `
    <div>
      <div class="badge">GW ${ctx.gw}</div>
      <h1 class="title">${ctx.headline}</h1>
      <p class="subtitle">${ctx.dateStr}</p>

      <div class="section">
        <h3>🧨 Editoriale</h3>
        <p>${ctx.editorial}</p>
      </div>

      <div class="section grid2">
        <div>
          <h3>🔥 Match della Settimana</h3>
          ${matchWeek}
        </div>
        <div>
          <h3>🏆 Premi discutibili</h3>
          <ul class="list">
            <li><b>Re della Giornata:</b> ${ctx.topTeam} (${ctx.topPF.toFixed(1)})</li>
            <li><b>Pagliaccio d’Oro:</b> ${ctx.flopTeam} (${ctx.flopPF.toFixed(1)})</li>
            ${ctx.thief ? `<li><b>Ladro del Giorno:</b> ${ctx.thief.winner} (vittoria con ${ctx.thief.winnerPts.toFixed(1)} e scarto ${ctx.thief.margin.toFixed(1)})</li>` : `<li class="muted">Nessun “ladro” individuato (miracolo).</li>`}
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

// ---------- main ----------
async function loadData(){
  const res = await fetch(CSV_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`Fetch fallita: ${res.status}`);
  const text = await res.text();
  const rows = parseCSV(text);
  return rowsToObjects(rows);
}

function getAllGWs(data){
  const set = new Set();
  for (const r of data){
    const g = norm(r[COL.gw]);
    if (g) set.add(g);
  }
  // sort numerico se possibile
  return Array.from(set).sort((a,b) => Number(a) - Number(b));
}

function buildContextForGW(data, gw){
  const matches = buildMatchesForGW(data, gw);
  const teamStats = buildTeamStats(matches);

  let topTeam = null, topPF = -Infinity;
  let flopTeam = null, flopPF = Infinity;

  for (const t of teamStats){
    if (t.pf > topPF){ topPF = t.pf; topTeam = t.name; }
    if (t.pf < flopPF){ flopPF = t.pf; flopTeam = t.name; }
  }

  // match of week: scarto più piccolo (thriller). Se vuoi massacro, cambia sort.
  const matchOfWeek = matches.slice().sort((a,b) => a.margin - b.margin)[0] || null;

  // big margin (massacro)
  const bigMargin = matches.slice().sort((a,b) => b.margin - a.margin)[0] || null;

  // upset (euristica trash: vince chi fa meno di 68 ma vince comunque, oppure scarto minimo)
  const upset = matches.find(m => (Math.min(m.aPoints, m.bPoints) < 68 && m.winner)) || null;

  // thief: vince col punteggio più basso possibile + margin piccolo
  const thiefCand = matches
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
    matchOfWeek,
    bigMargin: bigMargin && bigMargin.winner ? { winner: bigMargin.winner, loser: bigMargin.loser, margin: bigMargin.margin } : null,
    upset: upset && upset.winner ? { winner: upset.winner } : null,
    thief: thiefCand ? { winner: thiefCand.winner, winnerPts: thiefCand.winnerPts, margin: thiefCand.margin } : null,
    dateStr: new Date().toLocaleDateString("it-IT", { weekday:"long", year:"numeric", month:"long", day:"numeric" })
  };

  ctx.headline = headlineFactory(ctx);
  ctx.editorial = editorialFactory(ctx);

  return ctx;
}

function fillGWSelect(gws, selected){
  const sel = document.getElementById("gwSelect");
  sel.innerHTML = "";
  for (const g of gws){
    const opt = document.createElement("option");
    opt.value = g;
    opt.textContent = `GW ${g}`;
    if (String(g) === String(selected)) opt.selected = true;
    sel.appendChild(opt);
  }
}

function setStatus(msg, isErr=false){
  const el = document.getElementById("status");
  el.textContent = msg || "";
  el.className = isErr ? "error" : "muted";
}

async function render(gwOverride=null){
  try{
    setStatus("Carico dati…");
    const data = await loadData();

    const gws = getAllGWs(data);
    if (!gws.length) throw new Error("Nessuna GW trovata nel CSV.");

    const gw = gwOverride ?? gws[gws.length - 1]; // ultima giornata
    fillGWSelect(gws, gw);

    setStatus("Cucino il trash…");
    const ctx = buildContextForGW(data, gw);

    const out = document.getElementById("output");
    out.innerHTML = buildArticleHTML(ctx);

    setStatus(`Pronto ✅ (GW ${gw})`);
  } catch(e){
    console.error(e);
    setStatus(`Errore: ${e.message}`, true);
    document.getElementById("output").innerHTML = `<p class="error">Non riesco a generare il giornale. ${e.message}</p>`;
  }
}

document.getElementById("gwSelect").addEventListener("change", (e) => {
  render(e.target.value);
});
document.getElementById("btnReload").addEventListener("click", () => {
  const gw = document.getElementById("gwSelect").value;
  render(gw);
});

// avvio
render();
