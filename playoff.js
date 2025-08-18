const URL_CLASSIFICA_TOTALE = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTduESMbJiPuCDLaAFdOHjep9GW-notjraILSyyjo6SA0xKSR0H0fgMLPNNYSwXgnGGJUyv14kjFRqv/pub?gid=691152130&single=true&output=csv";

function creaHTMLSquadra(nome, posizione = "", punteggio = "", isVincente = false) {
  const nomePulito = nome.replace(/[°]/g, "").trim();
  const usaLogo = !nome.toLowerCase().includes("vincente") && !nome.toLowerCase().includes("classificata");
  const fileLogo = `img/${nomePulito}.png`;
  const classe = isVincente ? "vincente" : "perdente";

  // normalizzo il seed anche se arriva come "8°"
  const seed = String(posizione ?? "")
    .replace(/[^\d]/g, ""); // solo numero

  const logoHTML = usaLogo ? `<img src="${fileLogo}" alt="${nome}" onerror="this.style.display='none'">` : "";

  return `
    <div class="squadra orizzontale ${classe}">
      ${logoHTML}
      ${seed ? `<span class="seed">#${seed}</span>` : `<span class="seed seed-empty"></span>`}
      <span class="nome">${nome}</span>
      ${punteggio !== "" && punteggio !== null && punteggio !== undefined
        ? `<span class="score">${punteggio}</span>` : `<span class="score"></span>`}
    </div>`;
}


function creaMatchCardMobile(nomeA, nomeB, logoA, logoB, vincenteNome) {
  const isV1 = vincenteNome === nomeA;
  const isV2 = vincenteNome === nomeB;

  return `
    <div class="match-card ${isV1 || isV2 ? 'vincente' : ''}">
      <div class="team"><img src="${logoA}" onerror="this.style.display='none'"><span>${nomeA}</span></div>
      <span class="vs">vs</span>
      <div class="team"><img src="${logoB}" onerror="this.style.display='none'"><span>${nomeB}</span></div>
    </div>`;
}

const SEED_WC = {
  WC1: [7, 8],
  WC2: [4, 11],
  WC3: [5, 10],
  WC4: [6, 9],
};

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

function pulisci(str){ return (str || '').replace(/[°]/g,'').trim(); }
function logoPath(nome){ return `img/${pulisci(nome)}.png`; }
function seedOf(nome){
  const idx = Array.isArray(window.squadre) ? window.squadre.findIndex(s => s.nome === nome) : -1;
  return idx >= 0 ? idx + 1 : "";
}

function getRis(id){
  return window.risultati?.find(x =>
    x.partita === id || x.partita === `${id}-A` || x.partita === `${id}-B`
  );
}

function aggiornaPlayoff() {
  document.querySelectorAll(".match.pair").forEach(box => {
    const id = box.dataset.match;           // es. WC1, Q1, S1, F
    const r = getRis(id);

    let nomeA, nomeB, golA, golB;

    if (r) {
      // c'è già l'abbinamento nel file risultati
      nomeA = r.squadraA; nomeB = r.squadraB;
      golA  = r.golA;     golB  = r.golB;
    } else if (id.startsWith('WC') && window.squadre?.length) {
      // fallback wildcard da seed
      const [iA, iB] = SEED_WC[id];
      nomeA = window.squadre[iA]?.nome || "?";
      nomeB = window.squadre[iB]?.nome || "?";
      golA = golB = "";
    } else {
      // placeholder
      nomeA = "TBD"; nomeB = "TBD"; golA = golB = "";
    }

    const seedA = seedOf(nomeA);
    const seedB = seedOf(nomeB);

    box.innerHTML = creaMatchBox({
      nomeA, seedA, golA, logoA: logoPath(nomeA),
      nomeB, seedB, golB, logoB: logoPath(nomeB),
      vincente: r?.vincente
    });

    // Highlight box se deciso
    if (r?.vincente) box.classList.add("decided");
    else box.classList.remove("decided");
  });

  // Trofeo / vincitore
  const finale = window.risultati?.find(x => x.partita === "F");
  if (finale?.vincente) {
    const nome = finale.vincente;
    const container = document.getElementById("vincitore-assoluto");
    if (container) {
      container.innerHTML = `
        <img class="logo-vincitore" src="${logoPath(nome)}" onerror="this.style.display='none'">
        <div class="nome-vincitore">${nome}</div>`;
    }
  }
}

fetch(URL_CLASSIFICA_TOTALE)
  .then(res => res.text())
  .then(csv => {
    const righe = csv.trim().split("\n");
    const startRow = 1;
    const squadre = [];

    for (let i = startRow; i < righe.length; i++) {
      const colonne = righe[i].split(",").map(c => c.replace(/"/g, "").trim());
      const nome = colonne[1];
      const punti = parseInt(colonne[10]);
      const mp = parseFloat(colonne[11].replace(",", ".")) || 0;
      if (!nome || isNaN(punti)) continue;
      squadre.push({ nome, punti, mp });
      if (squadre.length === 12) break;
    }

    squadre.sort((a, b) => b.punti - a.punti || b.mp - a.mp);
    window.squadre = squadre;

    if (typeof aggiornaPlayoff === "function") aggiornaPlayoff();
    if (typeof aggiornaPlayoffMobile === "function") aggiornaPlayoffMobile();
  })
  .catch(err => console.error("Errore nel caricamento classifica:", err));


