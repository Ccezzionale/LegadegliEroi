/********** CONFIG **********/
const DEFAULT_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRhEJKfZhVb7V08KI29T_aPTR0hfx7ayIOlFjQn_v-fqgktImjXFg-QAEA6z7w5eyEh2B3w5KLpaRYz/pub?gid=595956835&single=true&output=csv";

// "" = tutte le fasi, altrimenti "Regular" o "Playoff"
const PHASE_FILTER = "";

/* Loghi opzionali: mappature manuali (se diverse da img/<slug>.png) */
const TEAM_LOGOS = {
  // "Team Bartowski": "img/team-bartowski.jpg",
};

/********** UTILS **********/
function slug(s){
  return String(s||'')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
}
function logoFor(team){
  return TEAM_LOGOS[team] || `img/${slug(team)}.png`;
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
    o.GW=+o.GW||null; o.PointsFor=parseNumber(o.PointsFor); o.PointsAgainst=parseNumber(o.PointsAgainst);
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
function sanitizeRows(rows, phaseFilter){
  const filtered = rows.filter(r => !phaseFilter || r.Phase === phaseFilter)
    .map(r => {
      const GW = +r.GW || null;
      const Team = (r.Team || '').trim();
      const Opponent = (r.Opponent || '').trim();
      const PF = parseNumber(r.PointsFor);
      const PA = parseNumber(r.PointsAgainst);
      let Result = (r.Result || '').trim();
      if (!Result && Number.isFinite(PF) && Number.isFinite(PA)) {
        Result = PF>PA ? 'W' : PF<PA ? 'L' : 'D';
      }
      return { GW, Team, Opponent, Result, PointsFor: PF, PointsAgainst: PA };
    })
    .filter(r =>
      r.GW &&
      Number.isFinite(r.PointsFor) &&
      Number.isFinite(r.PointsAgainst) &&
      !(r.PointsFor===0 && r.PointsAgainst===0)
    );

  // dedupe Team×GW
  const seen = new Set(), out=[];
  for(const r of filtered){
    const key = r.Team + '|' + r.GW;
    if(!seen.has(key)){ seen.add(key); out.push(r); }
  }
  return out;
}

/********** POWER RANKING **********/
function computePower(clean){
  const byTeam = groupBy(clean, 'Team');
  const teams = Array.from(byTeam.keys()).filter(Boolean);
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
  const ranked = now.map((it,idx)=>({ rank:idx+1, team:it.team, score:it.score, forma:it.forma, media:it.media, cons:it.cons, delta:(prevPos.get(it.team)||idx+1)-(idx+1) }));
  return { ranked, maxGW };
}

function renderPR(res){
  const tbody = document.getElementById('tbody-pr');
  const rows = res.ranked.map(r=>{
    const arrow = r.delta>0?'▲':(r.delta<0?'▼':'•');
    const cls = r.delta>0?'trend up':(r.delta<0?'trend down':'');
    return `<tr class="riga-classifica">
      <td class="mono"><strong>${r.rank}</strong></td>
      <td>
        <div class="logo-nome">
          <img src="${logoFor(r.team)}" alt="${r.team}"
               onerror="this.onerror=null; this.src='img/_placeholder.png'">
          <span>${r.team}</span>
        </div>
      </td>
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

/********** HALL OF SHAME / CURIOSITA' **********/
function median(a){ const v=a.filter(Number.isFinite).slice().sort((x,y)=>x-y); const n=v.length; return n? (n%2?v[(n-1)/2]:(v[n/2-1]+v[n/2])/2):0; }

function computeHall(clean){
  const worst = clean.slice().sort((a,b)=>a.PointsFor-b.PointsFor).slice(0,10);
  const lowWins = clean.filter(r=>r.Result==='W').slice().sort((a,b)=>a.PointsFor-b.PointsFor).slice(0,10);
  const highLoss = clean.filter(r=>r.Result==='L').slice().sort((a,b)=>b.PointsFor-a.PointsFor).slice(0,10);

  const winners = clean.filter(r=>r.PointsFor>r.PointsAgainst)
    .map(r=>({...r, margin:r.PointsFor-r.PointsAgainst, total:r.PointsFor+r.PointsAgainst}));
  const blowouts = winners.slice().sort((a,b)=>b.margin-a.margin).slice(0,5);
  const closest  = winners.slice().sort((a,b)=>a.margin-b.margin).slice(0,5);

  return { worst, lowWins, highLoss, blowouts, closest };
}

/* tabella con loghi quando il col has type:'team' */
function renderTable(containerId, title, rows, cols){
  const el=document.getElementById(containerId); if(!el) return;

  function cellHTML(c, r){
    const val = r[c.key] ?? '';
    if (c.type === 'team'){
      const src = logoFor(val);
      return `<div class="logo-nome mini">
                <img src="${src}" alt="${val}"
                     onerror="this.onerror=null; this.src='img/_placeholder.png'">
                <span>${val}</span>
              </div>`;
    }
    return c.format ? c.format(val, r) : val;
  }

  const thead=`<thead><tr>${cols.map(c=>`<th>${c.label}</th>`).join('')}</tr></thead>`;
  const tbody=`<tbody>${rows.map(r=>`<tr>${cols.map(c=>`<td>${cellHTML(c, r)}</td>`).join('')}</tr>`).join('')}</tbody>`;
  el.innerHTML = `<div class="badge">${title}</div><table class="subtable">${thead}${tbody}</table>`;
}

function renderHall(h){
  // 1) SOLO GW, Team (con logo) e PF
  renderTable('shame-worst', 'Peggiori punteggi',
    h.worst.map(r => ({ gw: r.GW, team: r.Team, pf: r.PointsFor })),
    [
      { key:'gw',   label:'GW' },
      { key:'team', label:'Team', type:'team' },      // mostra logo + nome
      { key:'pf',   label:'PF',   format:v => Number(v).toFixed(1) }
    ]
  );

  // 2) Vittorie col punteggio più basso (con avversario)
  renderTable('shame-lowwins', 'Vittorie col punteggio più basso',
    h.lowWins.map(r => ({ gw: r.GW, team: r.Team, pf: r.PointsFor, opp: r.Opponent, pa: r.PointsAgainst })),
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
    h.highLoss.map(r => ({ gw: r.GW, team: r.Team, pf: r.PointsFor, opp: r.Opponent, pa: r.PointsAgainst })),
    [
      { key:'gw',   label:'GW' },
      { key:'team', label:'Team', type:'team' },
      { key:'pf',   label:'PF',   format:v => Number(v).toFixed(1) },
      { key:'opp',  label:'vs',   type:'team' },
      { key:'pa',   label:'PA',   format:v => Number(v).toFixed(1) }
    ]
  );
}



/********** SCULATI / SFIGATI **********/
function computeLuck(clean){
  // mediana per GW su tutta la lega
  const byGW=groupBy(clean,'GW'); const med=new Map();
  for(const [gw,rows] of byGW.entries()) med.set(+gw, median(rows.map(r=>r.PointsFor)));

  // inizializza tutti i team
  const allTeams=Array.from(new Set(clean.map(r=>r.Team)));
  const tally=new Map(allTeams.map(t=>[t,{team:t,sculati:0,sfigati:0,netto:0}]));

  for(const r of clean){
    const m=med.get(r.GW)??0;
    const sc=(r.Result==='W' && r.PointsFor<m)?1:0; // vinci sotto mediana
    const sf=(r.Result==='L' && r.PointsFor>m)?1:0; // perdi sopra mediana
    if(!sc && !sf) continue;
    const rec=tally.get(r.Team); rec.sculati+=sc; rec.sfigati+=sf; rec.netto=rec.sculati-rec.sfigati;
  }
  const table=Array.from(tally.values()).sort((a,b)=>(b.netto-a.netto)||(b.sculati-a.sculati)||a.team.localeCompare(b.team));
  return { table };
}
function renderLuckBox(l){
  renderTable('luck-most','Sculati / Sfigati (cumulato)',
    l.table,
    [
      {key:'team',label:'Team', type:'team'},
      {key:'sculati',label:'Sculati'},
      {key:'sfigati',label:'Sfigati'},
      {key:'netto',label:'Netto'}
    ]);
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

  // Extra
  const hall = computeHall(clean);
  renderHall(hall);
  renderFunFacts(hall);
  
  const topScores = computeTopScores(clean, 5);
  renderTopScores(topScores);

  const luck = computeLuck(clean);
  renderLuckBox(luck);
})();
