// ========== CRASH OUT CUP – BRACKET ==========
/*
- Legge la classifica pubblicata in CSV e costruisce il seeding Top 16.
- Intestazione trovata in modo dinamico (cerca "Pos" e "Squadra/Team").
- Evita ReferenceError se alcuni elementi non esistono (bottoni, ecc.).
- Supporto opzionale ai risultati da un secondo CSV (URL_RESULTS).
*/

// ======== CONFIG ========
const URL_STANDINGS = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS1pXJCNLgchygyLnGbDEsnIV3QAdPUiLcmgzMAhlzYRivXV4fnoSBW5VwiopwXEMfwk32mvdF3gWZC/pub?output=csv";
const URL_RESULTS   = ""; // opzionale: CSV con risultati; lascia vuoto se non lo usi

// === Colori anello per-team (facoltativo) ===
const TEAM_COLORS = {
  "Riverfilo": "#04532d",
  "Lokomotiv Lipsia": "#8b5cf6",
  "Golden Knights": "#0b1220",
  "Athletic Pongao": "#60a5fa",
  "Rubinkebab": "#ef4444",
  "Team Bartowski": "#991b1b",
  "Bayern Christiansen": "#7f1d1d",
  "Ibla": "#86efac",
  "Minnesode Timberland": "#f97316",
  "PokerMantra": "#4c1d95",
  "Wildboys 78": "#facc15",
  "Eintracht Franco 126": "#fb923c",
  "Desperados": "#9f1239",
  "Pandinicoccolosini": "#22c55e",
  "MinneSota Snakes": "#10b981",
  "Fc Disoneste": "#3b82f6",
};
const ringColor = (name)=> TEAM_COLORS?.[name] || "var(--primary)";


// Se true, il seeding resta fisso (non rilegge la classifica)
let LOCK_SEEDING = false;

// Stato testuale per serie (facoltativo)
const SERIES_STATUS = {
  "R16-1": "Serie in parità 0-0",
  "R16-2": "Serie in parità 0-0",
  "R16-3": "Serie in parità 0-0",
  "R16-4": "Serie in parità 0-0",
  "R16-5": "Serie in parità 0-0",
  "R16-6": "Serie in parità 0-0",
  "R16-7": "Serie in parità 0-0",
  "R16-8": "Serie in parità 0-0",  
  // aggiungi altri se vuoi...
};

// ======== STATE ========
let seeds = []; // [{seed:1, team:"..."}, ...]
const BRACKET = { R16: [], QF: [], SF: [], F: [] };

// ======== UTILS ========
const $ = (sel)=>document.querySelector(sel);
const statusEl   = $('#status');
const errorsEl   = $('#errors');
const bracketEl  = $('#bracket');
const seedStateEl= $('#seedState');

$('#refreshBtn')?.addEventListener('click', ()=> init(true));
$('#lockBtn')?.addEventListener('click', ()=> { LOCK_SEEDING = !LOCK_SEEDING; render(); });

function setStatus(msg){ if(statusEl) statusEl.textContent = msg; }
function setError(msg){ if(errorsEl) errorsEl.innerHTML = msg ? `<div class="error">${msg}</div>` : ''; }

// CSV parser che gestisce virgolette e virgole all’interno di campi
function parseCSV(text) {
  const rows = [];
  let cur = '', cell = [], inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') { cur += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === ',' && !inQuotes) {
      cell.push(cur); cur = '';
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (cur !== '' || cell.length) { cell.push(cur); rows.push(cell); cell = []; cur = ''; }
    } else {
      cur += ch;
    }
  }
  if (cur !== '' || cell.length) { cell.push(cur); rows.push(cell); }
  // rimuovi eventuali righe completamente vuote
  return rows.filter(r => r.some(x => String(x).trim() !== ''));
}

async function fetchCSV(url){
  if(!url) return null;
  const res = await fetch(url, { cache: 'no-store' });
  if(!res.ok) throw new Error('Impossibile caricare: '+url);
  return parseCSV(await res.text());
}

function findTeamColumn(header){
  const lower = header.map(h=> (h||'').toLowerCase().trim());
  let idx = lower.findIndex(h => h.includes('squadra'));
  if(idx===-1) idx = lower.findIndex(h => h.includes('team'));
  if(idx===-1) idx = lower.findIndex(h => h.includes('nome'));
  if(idx===-1) idx = 0;
  return idx;
}

// ======== STANDINGS -> SEEDS ========
function buildSeedsFromStandings(rows){
  if(!rows || !rows.length) throw new Error('CSV classifica vuoto.');

  // Trova dinamicamente la riga intestazione (ha "pos" e "squadra"/"team")
  const headerIdx = rows.findIndex(r => {
    const cells = r.map(c => String(c).trim().toLowerCase());
    return cells.includes('pos') && (cells.includes('squadra') || cells.includes('team'));
  });
  if (headerIdx === -1) throw new Error("Intestazione non trovata (serve 'Pos' e 'Squadra').");

  const header  = rows[headerIdx];
  const teamCol = findTeamColumn(header);

  // Dati effettivi dalla riga successiva all'header
  const data = rows.slice(headerIdx + 1).filter(r => (r[teamCol]||'').trim());

  // Prendi le prime 16 squadre
  const top16 = data.slice(0,16).map((r,i)=> ({
    seed: i+1,
    team: r[teamCol].trim()
  }));

  if(top16.length<16) throw new Error('Servono almeno 16 squadre nella classifica per comporre il tabellone.');
  return top16;
}

// ======== BRACKET BUILDING ========
function defaultPairing(seeds){
  // Classico: 1v16, 8v9, 5v12, 4v13 | 3v14, 6v11, 7v10, 2v15
  const order = [ [1,16],[8,9],[5,12],[4,13], [3,14],[6,11],[7,10],[2,15] ];
  const bySeed = Object.fromEntries(seeds.map(s=>[s.seed,s]));
  return order.map((pair, idx)=> ({ id: 'R16-'+(idx+1), a: bySeed[pair[0]], b: bySeed[pair[1]], winner: null }));
}

function linkNextRound(){
  BRACKET.QF = [0,1,2,3].map(i=> ({ id:'QF-'+(i+1), a:null, b:null, winner:null }));
  BRACKET.SF = [0,1].map(i=> ({ id:'SF-'+(i+1), a:null, b:null, winner:null }));
  BRACKET.F  = [{ id:'F-1', a:null, b:null, winner:null }];
}

function advanceWinnersFrom(roundFrom, roundTo){
  const pairs = [];
  for(let i=0;i<BRACKET[roundFrom].length;i+=2){ pairs.push([BRACKET[roundFrom][i], BRACKET[roundFrom][i+1]]); }
  BRACKET[roundTo].forEach((m, idx)=>{
    const [m1, m2] = pairs[idx] || [];
    m.a = m1?.winner || null; m.b = m2?.winner || null;
  });
}

function clearWinners(){ ['R16','QF','SF','F'].forEach(r=> BRACKET[r].forEach(m=> m.winner=null)); }
function ensureStructure(){ if(!BRACKET.R16.length) BRACKET.R16 = defaultPairing(seeds); if(!BRACKET.QF.length || !BRACKET.SF.length || !BRACKET.F.length) linkNextRound(); }

function selectWinner(round, matchId, winnerObj){
  const match = BRACKET[round].find(m=>m.id===matchId);
  if(!match) return;
  match.winner = winnerObj;

  if(round==='R16'){
    advanceWinnersFrom('R16','QF'); BRACKET.SF.forEach(m=> m.winner=null); BRACKET.F[0].winner=null;
    advanceWinnersFrom('QF','SF');  advanceWinnersFrom('SF','F');
  } else if(round==='QF'){
    BRACKET.SF.forEach(m=> m.winner=null); BRACKET.F[0].winner=null;
    advanceWinnersFrom('QF','SF');  advanceWinnersFrom('SF','F');
  } else if(round==='SF'){
    BRACKET.F[0].winner=null;       advanceWinnersFrom('SF','F');
  }
  render();
}

// ======== RENDER ========

function tileNode(t, round, matchId){
  const tile = document.createElement('div');
  tile.className = 'tile';
  if(!t){
    tile.innerHTML = `
      <div class="seed-strip">–</div>
      <div class="logo-box"><img alt="TBA" /></div>
    `;
    return tile;
  }
  tile.addEventListener('click', ()=> selectWinner(round, matchId, t));

  const seed = document.createElement('div');
  seed.className = 'seed-strip';
  seed.textContent = t.seed ?? '–';

  const logo = document.createElement('div');
  logo.className = 'logo-box';
  const img = document.createElement('img');
  img.alt = t.team;
  img.src = `img/${t.team}.png`;
  img.onerror = function(){ this.style.display='none'; };
  logo.appendChild(img);

  tile.append(seed, logo);
  return tile;
}


function teamNode(t, round, matchId){  // compat: non più usata direttamente
  return tileNode(t, round, matchId);
}

function matchNode(m, round, withConnector){
  const card = document.createElement('div');
  card.className = 'match';

  const stack = document.createElement('div');
  stack.className = 'series-stack';

  const a = tileNode(m.a, round, m.id);
  const b = tileNode(m.b, round, m.id);

  if(m.winner){
    const aWin = m.a && m.winner.team === m.a.team;
    a.classList.toggle('win', aWin);
    b.classList.toggle('loss', aWin);
    b.classList.toggle('win', !aWin);
    a.classList.toggle('loss', !aWin);
  }

  stack.append(a,b);
  card.appendChild(stack);

  const statusDiv = document.createElement('div');
  statusDiv.className = 'series-status';
  statusDiv.textContent = SERIES_STATUS[m.id] || 'In attesa';
  card.appendChild(statusDiv);

  if(withConnector){
    const c = document.createElement('div');
    c.className = 'connector';
    card.appendChild(c);
  }
  return card;
}


function col(title, nodes, extraClass=''){
  const div = document.createElement('div');
  div.className = 'round-col ' + extraClass;
  const h = document.createElement('div');
  h.className = 'round-title'; h.textContent = title;
  div.appendChild(h);
  nodes.forEach(n=> div.appendChild(n));
  return div;
}

function render(){
  if (seedStateEl) seedStateEl.textContent = `Seeding: ${LOCK_SEEDING ? 'bloccato' : 'attivo'}`;
  if (!bracketEl) return;
  bracketEl.innerHTML = '';

  const r16Nodes = BRACKET.R16.map(m => matchNode(m, 'R16', true));
  advanceWinnersFrom('R16', 'QF');

  const qfNodes  = BRACKET.QF.map(m  => matchNode(m, 'QF',  true));
  advanceWinnersFrom('QF',  'SF');

  const sfNodes  = BRACKET.SF.map(m  => matchNode(m, 'SF',  true));
  advanceWinnersFrom('SF',  'F');

  const fNodes   = BRACKET.F.map(m   => matchNode(m, 'F',   false));

  // Colonne con etichette di conference (prime due = west, ultime due = east) — regola come preferisci
  bracketEl.appendChild(col('Ottavi (R16)', r16Nodes.slice(0,4), 'west'));
  bracketEl.appendChild(col('Quarti',        qfNodes.slice(0,2),  'west'));
  bracketEl.appendChild(col('Semifinali',    sfNodes.slice(0,1),  'west'));
  const finalCol = col('Finale',             fNodes,              'final');
  bracketEl.appendChild(finalCol);
  bracketEl.appendChild(col('Semifinali',    sfNodes.slice(1),    'east'));
  bracketEl.appendChild(col('Quarti',        qfNodes.slice(2),    'east'));
  bracketEl.appendChild(col('Ottavi (R16)',  r16Nodes.slice(4),   'east'));
}


// ======== RISULTATI (opzionali) ========
function applyResults(resultsRows){
  const header = resultsRows[0].map(h=> (h||'').toLowerCase());
  const idx = {
    round:  header.findIndex(h=>h==='round'),
    match:  header.findIndex(h=>h==='match'),
    home:   header.findIndex(h=>h==='home'),
    away:   header.findIndex(h=>h==='away'),
    homePts:header.findIndex(h=>h==='homepts'),
    awayPts:header.findIndex(h=>h==='awaypts'),
    winner: header.findIndex(h=>h==='winner'),
  };
  const rows = resultsRows.slice(1);
  const groups = { R16:[], QF:[], SF:[], F:[] };

  rows.forEach(r=>{
    const round = (r[idx.round]||'').toUpperCase();
    if(!groups[round]) return;
    groups[round].push({
      round, match: r[idx.match], home: r[idx.home], away: r[idx.away],
      homePts: Number(r[idx.homePts]), awayPts: Number(r[idx.awayPts]),
      winner: r[idx.winner]
    });
  });

  const setWinnerByName = (round, matchId, name)=>{
    const match = BRACKET[round].find(m=>m.id.toLowerCase()===String(matchId).toLowerCase());
    if(!match) return;
    const cand = [match.a, match.b].find(t=> t && t.team.toLowerCase()===String(name||'').toLowerCase());
    if(cand) match.winner = cand;
  };

  ['R16','QF','SF','F'].forEach(round=>{
    const arr = groups[round]; if(!arr || !arr.length) return;
    arr.forEach(entry=>{
      const id = `${round}-${String(entry.match).replace(/\s+/g,'')}`;
      let chosen = entry.winner;
      if(!chosen && Number.isFinite(entry.homePts) && Number.isFinite(entry.awayPts)){
        if(entry.homePts>entry.awayPts) chosen = entry.home;
        else if(entry.awayPts>entry.homePts) chosen = entry.away;
      }
      if(chosen) setWinnerByName(round, id, chosen);
    });
    if(round==='R16') advanceWinnersFrom('R16','QF');
    if(round==='QF')  advanceWinnersFrom('QF','SF');
    if(round==='SF')  advanceWinnersFrom('SF','F');
  });
}

// ======== INIT ========
async function init(force=false){
  setError('');
  try{
    setStatus('Caricamento…');

    if(!LOCK_SEEDING || force){
      if(URL_STANDINGS){
        const rows = await fetchCSV(URL_STANDINGS);
        seeds = buildSeedsFromStandings(rows);
      } else if(!seeds.length){
        seeds = Array.from({length:16}, (_,i)=>({seed:i+1, team:`Squadra ${i+1}`}));
      }
      BRACKET.R16 = defaultPairing(seeds);
      linkNextRound();
      clearWinners();
    } else {
      ensureStructure();
    }

    if(URL_RESULTS){
      const resRows = await fetchCSV(URL_RESULTS);
      if(resRows && resRows.length) applyResults(resRows);
    }

    render();
    const ts = new Date();
    setStatus(`Aggiornato alle ${ts.toLocaleTimeString()} · ${LOCK_SEEDING? 'Seeding bloccato' : 'Seeding attivo'}`);
  } catch(err){
    console.error(err);
    setError(err.message || String(err));
    render();
    setStatus('');
  }
}

// ======== NAVBAR (mobile) ========
function setupNav(){
  const burger = document.getElementById('hamburger');
  const menu   = document.getElementById('mainMenu');
  const ddBtns = document.querySelectorAll('.toggle-submenu');

  burger?.addEventListener('click', ()=>{
    const open = menu?.classList.toggle('open');
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  ddBtns.forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      e.preventDefault();
      const li = btn.closest('.dropdown');
      li?.classList.toggle('open');
      const exp = li?.classList.contains('open');
      btn.setAttribute('aria-expanded', exp ? 'true' : 'false');
    });
  });
}

// Auto init
setupNav();
init();
