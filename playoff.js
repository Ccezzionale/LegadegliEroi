// ========= CONFIG =========
const URL_CLASSIFICA_TOTALE =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTduESMbJiPuCDLaAFdOHjep9GW-notjraILSyyjo6SA0xKSR0H0fgMLPNNYSwXgnGGJUyv14kjFRqv/pub?gid=691152130&single=true&output=csv";

/* Mappature: niente "destra/sinistra". Avanzamento verticale dentro la stessa colonna. */
const FLOW = {
  // Wildcard -> Quarti
  WC1_to: "Q1", WC2_to: "Q3", WC3_to: "Q4", WC4_to: "Q2",
  // Quarti -> Semifinali
  Q1_to: "S1", Q2_to: "S2", Q3_to: "S1", Q4_to: "S2",
  // Semifinali -> Finale
  S1_to: "F",  S2_to: "F",
};

// Top seed che entrano ai Quarti: #1, #2, #3, #4
// Accoppiamento default ai Quarti (puoi cambiarlo qui facilmente)
const Q_SEED_VS_WC = {
  Q1: 0,  // seed #1 vs vincente WC1
  Q2: 1,  // seed #2 vs vincente WC4
  Q3: 2,  // seed #3 vs vincente WC2
  Q4: 3,  // seed #4 vs vincente WC3
};

// Wildcard seed fallback (0-based sugli ordinati per classifica totale)
const SEED_WC = {
  WC1: [7, 8],   // 8 vs 9
  WC2: [4, 11],  // 5 vs 12
  WC3: [5, 10],  // 6 vs 11
  WC4: [6, 9],   // 7 vs 10
};

// ========= NAVBAR (click apre submenu) =========
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".toggle-submenu").forEach(a => {
    a.addEventListener("click", e => {
      e.preventDefault();
      a.closest(".dropdown").classList.toggle("show");
    });
  });
});

// ========= Helper =========
const clean = s => (s || "").replace(/[°]/g,"").trim();
const logoPath = n => `img/${clean(n)}.png`;
function seedOf(nome){
  const i = Array.isArray(window.squadre) ? window.squadre.findIndex(t => t.nome === nome) : -1;
  return i >= 0 ? i + 1 : "";
}
function getRis(id){
  return window.risultati?.find(r =>
    r.partita === id || r.partita === `${id}-A` || r.partita === `${id}-B`
  );
}
function winnerName(id){
  const r = getRis(id);
  return r?.vincente || `Vincente ${id}`;
}
function creaMatchBox({ nomeA, seedA, golA, logoA, nomeB, seedB, golB, logoB, vincente }) {
  const isV1 = vincente === nomeA;
  const isV2 = vincente === nomeB;
  return `
    <div class="pair-box">
      <div class="team-line ${isV1 ? 'winner' : ''}">
        <img src="${logoA}" onerror="this.style.display='none'">
        <span class="seed">${seedA ? '#' + seedA : ''}</span>
        <span class="nome">${nomeA ?? ''}</span>
        <span class="gol">${golA ?? ''}</span>
      </div>
      <div class="team-line ${isV2 ? 'winner' : ''}">
        <img src="${logoB}" onerror="this.style.display='none'">
        <span class="seed">${seedB ? '#' + seedB : ''}</span>
        <span class="nome">${nomeB ?? ''}</span>
        <span class="gol">${golB ?? ''}</span>
      </div>
    </div>`;
}

// ========= Render =========
function renderBracket(){
  // 1) Wildcard
  document.querySelectorAll("[data-match^='WC']").forEach(box => {
    const id = box.dataset.match;
    const r  = getRis(id);

    let A, B, gA="", gB="";
    if (r){
      A = r.squadraA; B = r.squadraB; gA = r.golA; gB = r.golB;
    } else if (window.squadre?.length >= 12){
      const [iA, iB] = SEED_WC[id] || [];
      A = window.squadre[iA]?.nome || "TBD";
      B = window.squadre[iB]?.nome || "TBD";
    } else { A="TBD"; B="TBD"; }

    box.innerHTML = creaMatchBox({
      nomeA:A, seedA:seedOf(A), golA:gA, logoA:logoPath(A),
      nomeB:B, seedB:seedOf(B), golB:gB, logoB:logoPath(B),
      vincente:r?.vincente
    });
    box.classList.toggle("decided", !!r?.vincente);
  });

  // 2) Quarti (se non ci sono risultati, costruisco da top4 + vincenti WC*)
  const top4 = window.squadre?.slice(0,4) || [];
  document.querySelectorAll("[data-match^='Q']").forEach(box => {
    const id = box.dataset.match;
    const r  = getRis(id);

    let A, B, gA="", gB="";
    if (r){
      A = r.squadraA; B = r.squadraB; gA = r.golA; gB = r.golB;
    } else {
      const seedTeam = top4[ Q_SEED_VS_WC[id] ]?.nome || `Seed ${Q_SEED_VS_WC[id]+1}`;
      // vincente della WC corrispondente in FLOW inverso
      const fromWC = Object.entries(FLOW).find(([k,v]) => v === id && k.startsWith("WC"))?.[0]?.replace("_to","");
      const wcName = winnerName(fromWC);
      A = seedTeam; B = wcName;
    }

    box.innerHTML = creaMatchBox({
      nomeA:A, seedA:seedOf(A), golA:gA, logoA:logoPath(A),
      nomeB:B, seedB:seedOf(B), golB:gB, logoB:logoPath(B),
      vincente:r?.vincente
    });
    box.classList.toggle("decided", !!r?.vincente);
  });

  // 3) Semifinali
  document.querySelectorAll("[data-match^='S']").forEach(box => {
    const id = box.dataset.match;
    const r  = getRis(id);

    let A,B,gA="",gB="";
    if (r){
      A=r.squadraA; B=r.squadraB; gA=r.golA; gB=r.golB;
    } else {
      // vincente dei due Quarti legati
      const fromQ = Object.entries(FLOW).filter(([k,v]) => v === id && k.startsWith("Q")).map(([k])=>k.replace("_to",""));
      A = winnerName(fromQ[0]); B = winnerName(fromQ[1]);
    }

    box.innerHTML = creaMatchBox({
      nomeA:A, seedA:seedOf(A), golA:gA, logoA:logoPath(A),
      nomeB:B, seedB:seedOf(B), golB:gB, logoB:logoPath(B),
      vincente:r?.vincente
    });
    box.classList.toggle("decided", !!r?.vincente);
  });

  // 4) Finale
  const fBox = document.querySelector("[data-match='F']");
  if (fBox){
    const r = getRis("F");
    let A,B,gA="",gB="";
    if (r){ A=r.squadraA; B=r.squadraB; gA=r.golA; gB=r.golB; }
    else { A=winnerName("S1"); B=winnerName("S2"); }

    fBox.innerHTML = creaMatchBox({
      nomeA:A, seedA:seedOf(A), golA:gA, logoA:logoPath(A),
      nomeB:B, seedB:seedOf(B), golB:gB, logoB:logoPath(B),
      vincente:r?.vincente
    });
    fBox.classList.toggle("decided", !!r?.vincente);

    const v = document.getElementById("vincitore");
    if (v && r?.vincente){
      v.innerHTML = `<img src="${logoPath(r.vincente)}"><div class="name">${r.vincente}</div>`;
    }
  }

  // 5) Connettori
  drawWires();
}

function drawWires(){
  const svg = document.getElementById("wires");
  if (!svg) return;
  svg.innerHTML = "";

  const links = [
    ["WC1","Q1"], ["WC4","Q2"], ["WC2","Q3"], ["WC3","Q4"],
    ["Q1","S1"], ["Q3","S1"], ["Q2","S2"], ["Q4","S2"],
    ["S1","F"],  ["S2","F"]
  ];

  const pad = 10; // rientro dal bordo del box
  links.forEach(([fromId,toId])=>{
    const from = document.querySelector(`[data-match='${fromId}']`);
    const to   = document.querySelector(`[data-match='${toId}']`);
    if (!from || !to) return;

    const a = from.getBoundingClientRect();
    const b = to.getBoundingClientRect();
    const s = svg.getBoundingClientRect();

    const x1 = a.right - s.left - pad;
    const y1 = a.top + a.height/2 - s.top;
    const x2 = b.left - s.left + pad;
    const y2 = b.top + b.height/2 - s.top;

    // curva morbida tipo UEFA
    const dx = (x2 - x1) * 0.6;
    const path = document.createElementNS("http://www.w3.org/2000/svg","path");
    path.setAttribute("d", `M ${x1} ${y1} C ${x1+dx} ${y1}, ${x2-dx} ${y2}, ${x2} ${y2}`);
    path.setAttribute("fill","none");
    path.setAttribute("stroke","#1f3a64");
    path.setAttribute("stroke-width","4");
    path.setAttribute("opacity","0.35");
    svg.appendChild(path);
  });
}

// ========= Carica classifica (per seed) poi render =========
fetch(URL_CLASSIFICA_TOTALE)
  .then(r => r.text())
  .then(csv => {
    const rows = csv.trim().split("\n");
    const arr = [];
    for (let i=1;i<rows.length;i++){
      const c = rows[i].split(",").map(x=>x.replace(/"/g,"").trim());
      const nome = c[1];
      const punti = parseInt(c[10]);
      const mp = parseFloat((c[11]||"").replace(",", ".")) || 0;
      if (!nome || isNaN(punti)) continue;
      arr.push({ nome, punti, mp });
      if (arr.length === 12) break;
    }
    arr.sort((a,b)=>(b.punti-a.punti)||(b.mp-a.mp));
    window.squadre = arr;
    window.risultati = window.risultati || [];
    renderBracket();
  });

window.addEventListener("resize", drawWires);
