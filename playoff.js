// ===== CONFIG =====
const URL_CLASSIFICA_TOTALE =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTduESMbJiPuCDLaAFdOHjep9GW-notjraILSyyjo6SA0xKSR0H0fgMLPNNYSwXgnGGJUyv14kjFRqv/pub?gid=691152130&single=true&output=csv";

// Wildcard dal seeding (12 squadre)
const SEED_WC = {
  WC1: [7, 8],   // 8 vs 9
  WC2: [4, 11],  // 5 vs 12
  WC3: [5, 10],  // 6 vs 11
  WC4: [6, 9],   // 7 vs 10
};

// ===== NAVBAR (solo desktop: click per aprire sottomenù anche senza hover) =====
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".toggle-submenu").forEach(a => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      const li = a.closest(".dropdown");
      li.classList.toggle("show");
    });
  });
});

// ===== Helper =====
function clean(s){ return (s || "").replace(/[°]/g,"").trim(); }
function logoPath(nome){ return `img/${clean(nome)}.png`; }

function seedOf(nome){
  const idx = Array.isArray(window.squadre)
    ? window.squadre.findIndex(t => t.nome === nome)
    : -1;
  return idx >= 0 ? idx + 1 : "";
}

function getRis(id){
  // compatibile con vecchi ID "Q1-A"/"Q1-B"
  return window.risultati?.find(r =>
    r.partita === id || r.partita === `${id}-A` || r.partita === `${id}-B`
  );
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

function renderBracket(){
  document.querySelectorAll(".match.pair").forEach(box => {
    const id = box.dataset.match; // WC1..WC4, Q1..Q4, S1..S2, F
    const r = getRis(id);

    let nomeA, nomeB, golA, golB;

    if (r) {
      nomeA = r.squadraA; nomeB = r.squadraB;
      golA  = r.golA;     golB  = r.golB;
    } else if (id.startsWith("WC") && Array.isArray(window.squadre) && window.squadre.length >= 12) {
      // fallback da seeding
      const [iA, iB] = SEED_WC[id] || [];
      nomeA = window.squadre[iA]?.nome || "TBD";
      nomeB = window.squadre[iB]?.nome || "TBD";
      golA = golB = "";
    } else {
      nomeA = "TBD"; nomeB = "TBD"; golA = golB = "";
    }

    const seedA = seedOf(nomeA);
    const seedB = seedOf(nomeB);

    box.innerHTML = creaMatchBox({
      nomeA, seedA, golA, logoA: logoPath(nomeA),
      nomeB, seedB, golB, logoB: logoPath(nomeB),
      vincente: r?.vincente
    });

    if (r?.vincente) box.classList.add("decided");
    else box.classList.remove("decided");
  });

  // Campione (da Finale)
  const finale = getRis("F");
  if (finale?.vincente) {
    const nome = finale.vincente;
    document.getElementById("vincitore-assoluto").innerHTML = `
      <img class="logo-vincitore" src="${logoPath(nome)}" onerror="this.style.display='none'">
      <div class="nome-vincitore">${nome}</div>`;
  }
}

// ===== Carica classifica (per seed) e poi render =====
fetch(URL_CLASSIFICA_TOTALE)
  .then(r => r.text())
  .then(csv => {
    const righe = csv.trim().split("\n");
    const squadre = [];
    for (let i = 1; i < righe.length; i++){
      const c = righe[i].split(",").map(x => x.replace(/"/g,"").trim());
      const nome = c[1];
      const punti = parseInt(c[10]);
      const mp = parseFloat((c[11]||"").replace(",", ".")) || 0;
      if (!nome || isNaN(punti)) continue;
      squadre.push({ nome, punti, mp });
      if (squadre.length === 12) break;
    }
    squadre.sort((a,b) => (b.punti - a.punti) || (b.mp - a.mp));
    window.squadre = squadre;

    // Se non esiste, evita errori (puoi definirlo in risultati_playoff.js)
    window.risultati = window.risultati || [];

    renderBracket();
  })
  .catch(err => console.error("Errore classifica:", err));

