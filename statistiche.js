/********** CONFIG **********/
const DEFAULT_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRhEJKfZhVb7V08KI29T_aPTR0hfx7ayIOlFjQn_v-fqgktImjXFg-QAEA6z7w5eyEh2B3w5KLpaRYz/pub?gid=1118969717&single=true&output=csv";

// "" = tutte le fasi, altrimenti "Regular" o "Playoff"
const PHASE_FILTER = "";
const LOGO_DIR = "img/";

/********** UTILS **********/
function slug(s){
  return String(s||'')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
}
function logoFor(team){
  return TEAM_LOGOS[team] || `img/${slug(team)}.png`;
}

function logoHTML(team, mini=false){
  const cls = mini ? 'logo-nome mini' : 'logo-nome';
  const png = `${LOGO_DIR}${team}.png`;
  const jpg = `${LOGO_DIR}${team}.jpg`;
  const ph  = `${LOGO_DIR}_placeholder.png`;
  return `
    <div class="${cls}">
      <img src="${png}" alt="${team}" loading="lazy"
           onerror="if(!this.dataset.jpg){ this.dataset.jpg=1; this.src='${jpg}'; }
                    else { this.onerror=null; this.src='${ph}'; }">
      <span>${team}</span>
    </div>`;
}


function parseNumber(s){
  if (s==null) return NaN;
  if (typeof s !== 'string') return Number(s);
  const t = s.replace(',', '.').trim();
  const v = parseFloat(t);
  return isNaN(v) ? NaN : v;
}
async function fetchCSV(url){
  const res = await fetch(url, { cache: 'no-store' });
  if(!res.ok) throw new Error(`Errore fetch CSV (${res.status})`);
  const text = await res.text();
  return parseCSV(text);
}
// CSV robusto
function parseCSV(text){
  const rows=[]; let field="", row=[], inQ=false;
  for (let i=0;i<text.length;i++){
    const c=text[i];
    if(c==='"'){ if(inQ && text[i+1]==='"'){ field+='"'; i++; } else inQ=!inQ; }
    else if(c===',' && !inQ){ row.push(field); field=""; }
    else if((c==='\n'||c==='\r') && !inQ){ if(c==='\r' && text[i+1]==='\n') i++; row.push(field); rows.push(row); field=""; row=[]; }
    else field+=c;
  }
  if(field.length||row.length){ row.push(field); rows.push(row); }
  const head = rows.shift().map(s=>s.trim());
  const objs = rows.filter(r=>r.length && r.some(x=>x!=="")).map(r=>{
    const o={}; for(let k=0;k<head.length;k++) o[head[k]]=(r[k]??'').trim();
    o.GW = +(o.GW_Stagionale || o.GW) || null; o.PointsFor=parseNumber(o.PointsFor); o.PointsAgainst=parseNumber(o.PointsAgainst);
    return o;
  });
  return { head, rows: objs };
}
function groupBy(arr, key){ const m=new Map(); for(const it of arr){ const k=it[key]; if(!m.has(k)) m.set(k,[]); m.get(k).push(it);} return m; }
function lastN(a,n){ return a.slice(Math.max(0,a.length-n)); }
function mean(ns){ const v=ns.filter(Number.isFinite); return v.length? v.reduce((a,b)=>a+b,0)/v.length : 0; }
function stdDev(ns){ const v=ns.filter(Number.isFinite); if(v.length<=1) return 0; const m=mean(v); return Math.sqrt(mean(v.map(x=>(x-m)*(x-m)))); }
function normalize(vals){
  const f=vals.filter(Number.isFinite); if(!f.length) return vals.map(_=>0);
  const min=Math.min(...f), max=Math.max(...f); if(max===min) return vals.map(v=>Number.isFinite(v)?50:0);
  return vals.map(v=>Number.isFinite(v)? ((v-min)/(max-min))*100 : 0);
}

/********** DATA PREP **********/

function canonTeamName(name){
  return String(name || '')
    .trim()
    .replace(/\s+/g,' ')
    .toLowerCase();
}

function sanitizeRows(rows, phaseFilter){
  const filtered = rows
    .filter(r => !phaseFilter || r.Phase === phaseFilter)
    .map(r => {
      const GW = +r.GW || null;

      const Team = (r.Team || '').trim();
      const Opponent = (r.Opponent || '').trim();

      const TeamKey = canonTeamName(Team);
      const OpponentKey = canonTeamName(Opponent);

      const PF = parseNumber(r.PointsFor);
      const PA = parseNumber(r.PointsAgainst);

      let Result = (r.Result || '').trim();
      if (!Result && Number.isFinite(PF) && Number.isFinite(PA)) {
        Result = PF>PA ? 'W' : PF<PA ? 'L' : 'D';
      }

      return {
        GW,
        Team, Opponent,
        TeamKey, OpponentKey,
        Result,
        PointsFor: PF,
        PointsAgainst: PA
      };
    })
    .filter(r =>
      r.GW &&
      Number.isFinite(r.PointsFor) &&
      Number.isFinite(r.PointsAgainst) &&
      !(r.PointsFor===0 && r.PointsAgainst===0)
    );

  // dedupe TeamKey×GW
  const seen = new Set(), out=[];
  for(const r of filtered){
    const key = r.TeamKey + '|' + r.GW;
    if(!seen.has(key)){ seen.add(key); out.push(r); }
  }
  return out;
}



/********** POWER RANKING **********/
function computePower(clean){
  const byTeam = groupBy(clean, 'TeamKey');
  const teams = Array.from(byTeam.keys()).filter(Boolean);
  const labelByKey = new Map();
for (const r of clean){
  if (r.TeamKey && r.Team && !labelByKey.has(r.TeamKey)) labelByKey.set(r.TeamKey, r.Team);
}

  const maxGW = Math.max(...clean.map(r => r.GW||0));
  const prevGW = Number.isFinite(maxGW) ? maxGW - 1 : null;

  const w = (maxGW < 5) ? { forma:0.2, media:0.7, cons:0.1 } : { forma:0.5, media:0.3, cons:0.2 };

  function scoreAt(upToGW){
    const items=[];
    for(const team of teams){
      const series = byTeam.get(team).filter(r=>r.GW && r.GW<=upToGW).sort((a,b)=>a.GW-b.GW);
      const pts = series.map(s=>s.PointsFor);
      const last5 = lastN(pts,5);
      items.push({ team, media:mean(pts), forma:mean(last5), cons:1/(1+stdDev(last5)) });
    }
    const nF=normalize(items.map(x=>x.forma)), nM=normalize(items.map(x=>x.media)), nC=normalize(items.map(x=>x.cons));
    return items.map((x,i)=>({ team:x.team, forma:nF[i], media:nM[i], cons:nC[i], score:w.forma*nF[i]+w.media*nM[i]+w.cons*nC[i] }))
                .sort((a,b)=>b.score-a.score);
  }

  const now=scoreAt(maxGW), prev=prevGW>=1?scoreAt(prevGW):[];
  const prevPos=new Map(); prev.forEach((it,idx)=>prevPos.set(it.team,idx+1));
 const ranked = now.map((it,idx)=>({
  rank: idx+1,
  teamKey: it.team,
  team: (labelByKey.get(it.team) || it.team), // nome originale
  score: it.score, forma: it.forma, media: it.media, cons: it.cons,
  delta: (prevPos.get(it.team)||idx+1)-(idx+1)
}));

  return { ranked, maxGW };
}

function renderPR(res){
  const tbody = document.getElementById('tbody-pr');
  const rows = res.ranked.map(r=>{
    const arrow = r.delta>0?'▲':(r.delta<0?'▼':'•');
    const cls   = r.delta>0?'trend up':(r.delta<0?'trend down':'');
    return `<tr class="riga-classifica">
      <td class="mono"><strong>${r.rank}</strong></td>
      <td>${logoHTML(r.team)}</td>
      <td class="mono">${r.score.toFixed(1)}</td>
      <td class="${cls}">${arrow} ${r.delta===0?'':Math.abs(r.delta)}</td>
      <td class="mono">${r.media.toFixed(0)}</td>
      <td class="mono">${r.forma.toFixed(0)}</td>
      <td class="mono">${r.cons.toFixed(0)}</td>
    </tr>`;
  }).join('');
  tbody.innerHTML = rows;
  const metaTop = document.getElementById('meta-top');
  if (metaTop) metaTop.textContent = `Ultima giornata inclusa: GW ${res.maxGW}`;
}

function renderPRMobile(res){
  const wrap = document.getElementById('pr-mobile');
  if (!wrap) return;

  const html = res.ranked.map(r => {
    const trend = r.delta>0 ? `▲ ${r.delta}` : (r.delta<0 ? `▼ ${Math.abs(r.delta)}` : '•');
    const png = `${LOGO_DIR}${r.team}.png`;
    const jpg = `${LOGO_DIR}${r.team}.jpg`;
    const ph  = `${LOGO_DIR}_placeholder.png`;
    return `
      <div class="acc-item" onclick="this.classList.toggle('open')">
        <div class="acc-head">
          <span class="badge">#${r.rank}</span>
          <img src="${png}" alt="${r.team}" loading="lazy"
               onerror="if(!this.dataset.jpg){ this.dataset.jpg=1; this.src='${jpg}'; }
                        else { this.onerror=null; this.src='${ph}'; }">
          <div class="acc-title">
            <div class="team-name">${r.team}</div>
            <div class="sub">Score ${r.score.toFixed(1)} • Trend ${trend}</div>
          </div>
        </div>
        <div class="acc-body">
          <div><strong>Media</strong><br>${r.media.toFixed(1)}</div>
          <div><strong>Forma (ult.5)</strong><br>${r.forma.toFixed(1)}</div>
          <div><strong>Consistenza</strong><br>${r.cons.toFixed(1)}</div>
        </div>
      </div>
    `;
  }).join('');

  wrap.innerHTML = html;
}


/********** HALL OF SHAME / CURIOSITA' **********/
function median(a){ const v=a.filter(Number.isFinite).slice().sort((x,y)=>x-y); const n=v.length; return n? (n%2?v[(n-1)/2]:(v[n/2-1]+v[n/2])/2):0; }

// === CONFIG GOL ===
const GOAL_BASE = 66;  // primo gol a 66
const GOAL_STEP = 6;   // +1 gol ogni 6 punti

// util numeriche robuste (gestisce "72,0")
const toNum = x => +String(x).replace(',', '.');
const pfToGoals = pf => {
  const v = toNum(pf);
  if (!Number.isFinite(v)) return 0;
  return v < GOAL_BASE ? 0 : 1 + Math.floor((v - GOAL_BASE) / GOAL_STEP);
};

function computeHall(clean){
  // normalizzo e calcolo esito a GOL
  const rows = clean.map(r => {
    const PF = toNum(r.PointsFor);
    const PA = toNum(r.PointsAgainst);
    const gf = pfToGoals(PF);
    const ga = pfToGoals(PA);
    const isDraw = gf === ga;
    const isWin  = gf > ga;
    const isLoss = gf < ga;
    return { ...r, PF, PA, gf, ga, isDraw, isWin, isLoss, marginPF: PF - PA, totalPF: PF + PA };
  });

  // 10 punteggi peggiori in assoluto (PF)
  const worst = rows.slice().sort((a,b)=> a.PF - b.PF || a.PA - b.PA || (a.GW - b.GW)).slice(0,10);

  // 10 vittorie col PF più basso — ora basate su gf>ga (esclude i pareggi tipo 70 vs 68.5 = 1-1)
  const lowWins = rows
    .filter(r => r.isWin)
    .sort((a,b) => a.PF - b.PF || a.PA - b.PA || (a.GW - b.GW))
    .slice(0,10);

  // 10 sconfitte col PF più alto — sconfitte a GOL, ordinate per PF desc
  const highLoss = rows
    .filter(r => r.isLoss)
    .sort((a,b) => b.PF - a.PF || a.PA - b.PA || (a.GW - b.GW))
    .slice(0,10);

  // per blowouts/closest considero solo vere vittorie (opzionale, non le stai renderizzando qui)
  const winners = rows.filter(r => r.isWin)
    .map(r => ({ ...r, margin: r.marginPF, total: r.totalPF }));
  const blowouts = winners.slice().sort((a,b)=> (b.gf-b.ga) - (a.gf-a.ga) || b.margin - a.margin).slice(0,5);
  const closest  = winners.slice().sort((a,b)=> (a.gf-a.ga) - (b.gf-b.ga) || Math.abs(a.margin) - Math.abs(b.margin)).slice(0,5);

  return { worst, lowWins, highLoss, blowouts, closest };
}

/* tabella con loghi quando il col has type:'team' */
function renderTable(containerId, title, rows, cols){
  const el = document.getElementById(containerId); if(!el) return;

  function cellHTML(c, r){
    const val = r[c.key] ?? '';
    if (c.type === 'team'){
      return logoHTML(val, true); // versione mini
    }
    return c.format ? c.format(val, r) : val;
  }

  const thead = `<thead><tr>${cols.map(c=>`<th>${c.label}</th>`).join('')}</tr></thead>`;
  const tbody = `<tbody>${rows.map(r=>`<tr>${cols.map(c=>`<td>${cellHTML(c,r)}</td>`).join('')}</tr>`).join('')}</tbody>`;
  el.innerHTML = `<div class="badge">${title}</div><table class="subtable">${thead}${tbody}</table>`;
}

function renderHall(h){
  // 1) SOLO GW, Team (con logo) e PF
  renderTable('shame-worst', 'Peggiori punteggi',
    h.worst.map(r => ({ gw: r.GW, team: r.Team, pf: r.PF })),
    [
      { key:'gw',   label:'GW' },
      { key:'team', label:'Team', type:'team' },      // mostra logo + nome
      { key:'pf',   label:'PF',   format:v => Number(v).toFixed(1) }
    ]
  );

  // 2) Vittorie col punteggio più basso (con avversario)
  renderTable('shame-lowwins', 'Vittorie col punteggio più basso',
    h.lowWins.map(r => ({ gw: r.GW, team: r.Team, pf: r.PF, opp: r.Opponent, pa: r.PA })),
    [
      { key:'gw',   label:'GW' },
      { key:'team', label:'Team', type:'team' },
      { key:'pf',   label:'PF',   format:v => Number(v).toFixed(1) },
      { key:'opp',  label:'vs',   type:'team' },
      { key:'pa',   label:'PA',   format:v => Number(v).toFixed(1) }
    ]
  );

  // 3) Sconfitte col punteggio più alto (con avversario)
  renderTable('shame-highloss', 'Sconfitte col punteggio più alto',
    h.highLoss.map(r => ({ gw: r.GW, team: r.Team, pf: r.PF, opp: r.Opponent, pa: r.PA })),
    [
      { key:'gw',   label:'GW' },
      { key:'team', label:'Team', type:'team' },
      { key:'pf',   label:'PF',   format:v => Number(v).toFixed(1) },
      { key:'opp',  label:'vs',   type:'team' },
      { key:'pa',   label:'PA',   format:v => Number(v).toFixed(1) }
    ]
  );
}



/********** SCULATI / SFIGATI (fix + pareggio sculato) **********/
function computeLuck(clean){
  // parse numerico (gestisce "75,5")
  const num = v => (typeof v === 'number') ? v : parseFloat(String(v).replace(',', '.')) || 0;

  // prendi i punti avversario con fallback nomi
  const oppPts = r => {
    const cands = ['OpponentPoints','PointsAgainst','OppPoints','Against','PtsAgainst'];
    for (const k of cands) if (k in r && r[k] != null) return num(r[k]);
    return null;
  };

  // mediane per GW (su PointsFor)
  const byGW = groupBy(clean, 'GW');
  const med = new Map();
  for (const [gw, rows] of byGW.entries()){
    med.set(+gw, median(rows.map(r => num(r.PointsFor))));
  }

  // init tally
  const allTeams = Array.from(new Set(clean.map(r => r.Team)));
  const tally = new Map(allTeams.map(t => [t, { team:t, sculati:0, sfigati:0, netto:0 }]));

  // gol fantacalcio e soglie (1 gol a 66, poi ogni +6)
  function goals(p){ p=num(p); return p < 66 ? 0 : 1 + Math.floor((p - 66) / 6); }
  function nextSoglia(p){ p=num(p); return p < 66 ? 66 : 66 + 6 * (Math.floor((p - 66) / 6) + 1); }
  function lastSoglia(p){ p=num(p); return p < 66 ? null : 66 + 6 * Math.floor((p - 66) / 6); }
  function isOnSoglia(p){
    const ls = lastSoglia(p);
    return ls != null && num(p) === ls; // 66.0, 72.0, 78.0...
  }

  // true se la partita è stata decisa da una soglia gol
  function isVittoriaDiSoglia(pWin, pLose){
    const nsLose = nextSoglia(pLose);
    const distLoser = nsLose - num(pLose);

    const lsWin = lastSoglia(pWin);
    const distWin = (lsWin == null) ? Infinity : (num(pWin) - lsWin);

    // caso 1: perdente a <1 punto dalla soglia successiva (65.5, 71.5, 77.5…)
    // caso 2: vincitore esattamente sulla soglia (66.0, 72.0, 78.0…)
    return (distLoser > 0 && distLoser < 1) || distWin === 0;
  }

  for (const r of clean){
    const pf = num(r.PointsFor);
    const pa = oppPts(r);
    const m  = med.get(r.GW) ?? 0;

    let sc = 0, sf = 0;

    // se non ho i punti avversario, posso fare solo la regola mediana su r.Result (fallback)
    // ma nel tuo CSV li hai, quindi normalmente entra sempre qui:
    if (pa != null){
      const gf = goals(pf);
      const go = goals(pa);

      const outcome = gf > go ? 'W' : gf < go ? 'L' : 'D'; // ✅ risultato corretto A GOL

      // (A) regola mediana (basata sull'outcome a gol)
      if (outcome === 'W' && pf < m) sc += 1;
      if (outcome === 'L' && pf > m) sf += 1;

      // (B) regola "vittoria di soglia" (solo se vittoria/sconfitta a gol di 1)
      const diffGol = gf - go;
      if (outcome === 'W' && diffGol === 1 && isVittoriaDiSoglia(pf, pa)) sc += 1;
      if (outcome === 'L' && diffGol === -1 && isVittoriaDiSoglia(pa, pf)) sf += 1;

      // (C) ✅ NUOVA: pareggio sculato / sfigato (pareggio a GOL)
      // - se tu sei ESATTAMENTE su soglia e l'altro no => SCULATO
      // - se l'altro è su soglia e tu no => SFIGATO
      if (outcome === 'D'){
        const meOn  = isOnSoglia(pf);
        const oppOn = isOnSoglia(pa);
        if (meOn && !oppOn) sc += 1;
        if (!meOn && oppOn) sf += 1;
      }

    } else {
      // fallback raro: se manca PA, uso il Result del CSV (come prima)
      if (r.Result === 'W' && pf < m) sc += 1;
      if (r.Result === 'L' && pf > m) sf += 1;
    }

    if (sc || sf){
      const rec = tally.get(r.Team);
      rec.sculati += sc;
      rec.sfigati += sf;
      rec.netto = rec.sculati - rec.sfigati;
    }
  }

  const table = Array.from(tally.values())
    .sort((a,b)=>(b.netto-a.netto)||(b.sculati-a.sculati)||a.team.localeCompare(b.team));

  return { table };
}





/********** CURIOSITÀ **********/
function renderFunFacts(h){
  renderTable('fun-facts','Curiosità (blowout & partita più tirata)',
    [
      ...h.blowouts.map(r=>({type:'Blowout', gw:r.GW, team:r.Team, pf:r.PointsFor, opp:r.Opponent, pa:r.PointsAgainst, m:(r.PointsFor-r.PointsAgainst)})),
      ...h.closest.map (r=>({type:'Più tirata', gw:r.GW, team:r.Team, pf:r.PointsFor, opp:r.Opponent, pa:r.PointsAgainst, m:(r.PointsFor-r.PointsAgainst)}))
    ],
    [
      {key:'type',label:'Tipo'},
      {key:'gw',label:'GW'},
      {key:'team',label:'Team', type:'team'},
      {key:'pf',label:'PF',format:v=>v.toFixed(1)},
      {key:'opp',label:'vs', type:'team'},
      {key:'pa',label:'PA',format:v=>v.toFixed(1)},
      {key:'m',label:'Margine',format:v=>v.toFixed(1)}
    ]);
}

// Top N punteggi assoluti (tutta la lega, tutte le fasi del CSV caricato)
function computeTopScores(clean, n = 5){
  return clean
    .slice()
    .sort((a,b) => b.PointsFor - a.PointsFor)
    .slice(0, n)
    .map(r => ({ gw: r.GW, team: r.Team, pf: r.PointsFor }));
}

function renderTopScores(list){
  renderTable('fun-top', 'Migliori punteggi di sempre (Top 5)',
    list,
    [
      { key:'gw',   label:'GW' },
      { key:'team', label:'Team', type:'team' },        // logo + nome
      { key:'pf',   label:'PF',   format:v => Number(v).toFixed(1) }
    ]
  );
}

/* ================= ANDAMENTO SQUADRE (fix) ================= */
let trendChart = null; // istanza Chart.js

function buildTrendStructures(clean){
  const allGW = Array.from(new Set(clean.map(r=>r.GW))).sort((a,b)=>a-b);

  // mediana per GW
  const medByGW = new Map();
  const byGW = groupBy(clean, 'GW');
  for (const [gw, rows] of byGW.entries()){
    medByGW.set(+gw, median(rows.map(r=> r.PointsFor)));
  }

  // PF per squadra per GW
  const byTeam = groupBy(clean, 'Team');
  const teamMap = new Map();
  for (const [team, rows] of byTeam.entries()){
    const m = new Map();
    rows.forEach(r => m.set(r.GW, r.PointsFor));
    teamMap.set(team, m);
  }

  const teams = Array.from(teamMap.keys()).sort((a,b)=> a.localeCompare(b));
  return { allGW, medByGW, teamMap, teams };
}

function seriesForTeam(team, structs){
  const m = structs.teamMap.get(team);
  if (!m) return [];
  return structs.allGW.map(gw => (m.has(gw) ? m.get(gw) : null));
}

function renderTrend(structs, team1, team2, showMedian){
  const canvas = document.getElementById('trendChart');
  if (!canvas || !window.Chart) { console.warn('Canvas/Chart mancante'); return; }
  const ctx = canvas.getContext('2d');
  const labels = structs.allGW.map(gw => `GW ${gw}`);

  const mkDataset = (label, data, dashed=false)=>({
    label, data,
    spanGaps:true, tension:0.25, borderWidth:2, pointRadius:3, pointHoverRadius:5,
    ...(dashed ? { borderDash:[6,4] } : {})
  });

  const ds = [];
  if (team1) ds.push(mkDataset(team1, seriesForTeam(team1, structs)));
  if (team2 && team2 !== team1) ds.push(mkDataset(team2, seriesForTeam(team2, structs)));
  if (showMedian) ds.push(mkDataset('Mediana GW', structs.allGW.map(gw => structs.medByGW.get(gw) ?? null), true));

  const config = {
    type: 'line',
    data: { labels, datasets: ds },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'top' }, tooltip: { mode: 'index', intersect:false } },
      interaction: { mode:'nearest', intersect:false },
      scales: {
        x: { title: { display:true, text:'Giornata' } },
        y: { title: { display:true, text:'Punti Fantacalcio' }, beginAtZero:false }
      }
    }
  };

  // distruggi il vecchio grafico per evitare leak/resizing infinito
  if (trendChart) {
    trendChart.destroy();
    trendChart = null;
  }
  trendChart = new Chart(ctx, config);
}

function initTrend(clean, defaultTeam){
  // se il canvas non c'è su questa pagina, esci
  if (!document.getElementById('trendChart')) return;

  const structs = buildTrendStructures(clean);
  const sel1 = document.getElementById('trendTeam1');
  const sel2 = document.getElementById('trendTeam2');
  const chk  = document.getElementById('trendMedian');
  const btn  = document.getElementById('trendBtn');

  // popola select
  const opts = ['<option value="">— scegli —</option>']
    .concat(structs.teams.map(t => `<option value="${t}">${t}</option>`))
    .join('');
  sel1.innerHTML = opts;
  sel2.innerHTML = opts;

  // default: #1 del Power Ranking o il primo disponibile
  if (defaultTeam) sel1.value = defaultTeam;
  else if (structs.teams.length) sel1.value = structs.teams[0];
  sel2.value = '';

  function draw(){ renderTrend(structs, sel1.value, sel2.value, chk.checked); }
  btn.addEventListener('click', draw);
  // prima render automatica
  draw();
}



/********** BOOT (auto-load) **********/
(async function(){
  const url = DEFAULT_CSV_URL;
  const data = await fetchCSV(url);
  const clean = sanitizeRows(data.rows, PHASE_FILTER);

  // Power Ranking
  const pr = computePower(clean);
  renderPR(pr);
  initTrend(clean, pr?.ranked?.[0]?.team);
  renderPRMobile(pr);

  // Extra
  const hall = computeHall(clean);
  renderHall(hall);
  renderFunFacts(hall);
  
  const topScores = computeTopScores(clean, 5);
  renderTopScores(topScores);

  const luck = computeLuck(clean);
  renderLuckBox(luck);
})();
