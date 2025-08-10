// ======== CONFIG ========
// ⚠️ Inserisci qui gli URL CSV pubblicati
const URL_STANDINGS = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS1pXJCNLgchygyLnGbDEsnIV3QAdPUiLcmgzMAhlzYRivXV4fnoSBW5VwiopwXEMfwk32mvdF3gWZC/pub?output=csv";

// Se true, il seeding resta fisso (non rilegge la classifica)
let LOCK_SEEDING = false;

// ======== STATE ========
let seeds = []; // [{seed:1, team:"..."}, ...]
const BRACKET = { R16: [], QF: [], SF: [], F: [] };

// ======== UTILS ========
const $ = (sel)=>document.querySelector(sel);
const statusEl = $('#status');
const errorsEl = $('#errors');
const bracketEl = $('#bracket');
const seedStateEl = $('#seedState');

$('#refreshBtn').addEventListener('click', ()=> init(true));
$('#lockBtn').addEventListener('click', ()=> { LOCK_SEEDING = !LOCK_SEEDING; render(); });

function setStatus(msg){ if(statusEl) statusEl.textContent = msg; }
function setError(msg){ if(errorsEl) errorsEl.innerHTML = `<div class="error">${msg}</div>`; }

function csvToRows(text){
  return text.trim().split(/\r?\n/).map(r=> r.split(',').map(c=> c.replace(/^\"|\"$/g,'').trim()));
}

async function fetchCSV(url){
  if(!url) return null;
  const res = await fetch(url);
  if(!res.ok) throw new Error('Impossibile caricare: '+url);
  return csvToRows(await res.text());
}

function findTeamColumn(header){
  const lower = header.map(h=> (h||'').toLowerCase());
  let idx = lower.findIndex(h => h.includes('squadra'));
  if(idx===-1) idx = lower.findIndex(h => h.includes('team'));
  if(idx===-1) idx = lower.findIndex(h => h.includes('nome'));
  if(idx===-1) idx = 0;
  return idx;
}

function buildSeedsFromStandings(rows){
  if(!rows || !rows.length) throw new Error('CSV classifica vuoto.');
  const header = rows[0];
  const teamCol = findTeamColumn(header);
  const data = rows.slice(1).filter(r => (r[teamCol]||'').trim());
  const top16 = data.slice(0,16).map((r,i)=> ({ seed:i+1, team:r[teamCol].trim() }));
  if(top16.length<16) throw new Error('Servono almeno 16 squadre nella classifica per comporre il tabellone.');
  return top16;
}

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
    advanceWinnersFrom('R16','QF'); BRACKET.SF.forEach(m=> m.winner=null); BRACKET.F[0].winner=null; advanceWinnersFrom('QF','SF'); advanceWinnersFrom('SF','F');
  } else if(round==='QF'){
    BRACKET.SF.forEach(m=> m.winner=null); BRACKET.F[0].winner=null; advanceWinnersFrom('QF','SF'); advanceWinnersFrom('SF','F');
  } else if(round==='SF'){
    BRACKET.F[0].winner=null; advanceWinnersFrom('SF','F');
  }
  render();
}

function teamNode(t, round, matchId){
  const div = document.createElement('div');
  div.className = 'team';
  if(!t){ div.classList.add('empty'); div.innerHTML = `<span class="seed">–</span><span class="name">In attesa</span><span class="score"> </span>`; return div; }
  div.classList.add('clickable');
  div.innerHTML = `<span class="seed">${t.seed ?? '–'}</span><span class="name">${t.team}</span><span class="score"></span>`;
  div.addEventListener('click', ()=> selectWinner(round, matchId, t));
  return div;
}

function matchNode(m, round, withConnector){
  const card = document.createElement('div'); card.className = 'match';
  const a = teamNode(m.a, round, m.id); const b = teamNode(m.b, round, m.id);
  if(m.winner){ const isA = m.winner && m.a && m.winner.team===m.a.team; a.classList.toggle('win', isA); b.classList.toggle('loss', isA); b.classList.toggle('win', !isA); a.classList.toggle('loss', !isA); }
  card.appendChild(a); card.appendChild(b);
  if(withConnector){ const c = document.createElement('div'); c.className='connector'; card.appendChild(c); }
  return card;
}

function col(title, nodes){
  const div = document.createElement('div'); div.className='round-col';
  const h = document.createElement('div'); h.className='round-title'; h.textContent = title; div.appendChild(h);
  nodes.forEach(n=> div.appendChild(n)); return div;
}

function render(){
  if(seedStateEl) seedStateEl.textContent = `Seeding: ${LOCK_SEEDING? 'bloccato' : 'attivo'}`;
  bracketEl.innerHTML = '';
  const r16Nodes = BRACKET.R16.map((m)=> matchNode(m,'R16',true));
  advanceWinnersFrom('R16','QF');
  const qfNodes = BRACKET.QF.map((m)=> matchNode(m,'QF',true));
  advanceWinnersFrom('QF','SF');
  const sfNodes = BRACKET.SF.map((m)=> matchNode(m,'SF',true));
  advanceWinnersFrom('SF','F');
  const fNodes  = BRACKET.F.map((m)=> matchNode(m,'F',false));
  bracketEl.appendChild(col('Ottavi (R16)', r16Nodes));
  bracketEl.appendChild(col('Quarti', qfNodes));
  bracketEl.appendChild(col('Semifinali', sfNodes));
  bracketEl.appendChild(col('Finale', fNodes));
}

function applyResults(resultsRows){
  const header = resultsRows[0].map(h=> (h||'').toLowerCase());
  const idx = {
    round: header.findIndex(h=>h==='round'),
    match: header.findIndex(h=>h==='match'),
    home: header.findIndex(h=>h==='home'),
    away: header.findIndex(h=>h==='away'),
    homePts: header.findIndex(h=>h==='homepts'),
    awayPts: header.findIndex(h=>h==='awaypts'),
    winner: header.findIndex(h=>h==='winner'),
  };
  const rows = resultsRows.slice(1);
  const groups = { R16:[], QF:[], SF:[], F:[] };
  rows.forEach(r=>{
    const round = (r[idx.round]||'').toUpperCase(); if(!groups[round]) return;
    groups[round].push({ round, match: r[idx.match], home: r[idx.home], away: r[idx.away], homePts: Number(r[idx.homePts]), awayPts: Number(r[idx.awayPts]), winner: r[idx.winner] });
  });
  const setWinnerByName = (round, matchId, name)=>{
    const match = BRACKET[round].find(m=>m.id.toLowerCase()===String(matchId).toLowerCase()); if(!match) return;
    const cand = [match.a, match.b].find(t=> t && t.team.toLowerCase()===String(name||'').toLowerCase()); if(cand) match.winner = cand;
  }
  ['R16','QF','SF','F'].forEach(round=>{
    const arr = groups[round]; if(!arr || !arr.length) return;
    arr.forEach(entry=>{
      const id = `${round}-${String(entry.match).replace(/\s+/g,'')}`;
      let chosen = entry.winner;
      if(!chosen && Number.isFinite(entry.homePts) && Number.isFinite(entry.awayPts)){
        if(entry.homePts>entry.awayPts) chosen = entry.home; else if(entry.awayPts>entry.homePts) chosen = entry.away;
      }
      if(chosen) setWinnerByName(round, id, chosen);
    });
    if(round==='R16') advanceWinnersFrom('R16','QF');
    if(round==='QF')  advanceWinnersFrom('QF','SF');
    if(round==='SF')  advanceWinnersFrom('SF','F');
  });
}

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
      if(resRows) applyResults(resRows);
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

// NAVBAR: hamburger + submenu (mobile)
function setupNav(){
  const burger = document.getElementById('hamburger');
  const menu   = document.getElementById('mainMenu');
  const ddBtns = document.querySelectorAll('.toggle-submenu');
  burger?.addEventListener('click', ()=>{
    const open = menu.classList.toggle('open');
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
