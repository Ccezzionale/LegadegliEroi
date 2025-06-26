// ✅ URL della classifica
const URL_CLASSIFICA_TOTALE = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTduESMbJiPuCDLaAFdOHjep9GW-notjraILSyyjo6SA0xKSR0H0fgMLPNNYSwXgnGGJUyv14kjFRqv/pub?gid=691152130&single=true&output=csv";

// ✅ Funzione HTML squadra
function creaHTMLSquadra(nome, posizione = "", punteggio = "", isVincente = false) {
  const nomePulito = nome.replace(/[°]/g, "").trim();
  const usaLogo = !nome.toLowerCase().includes("vincente") && !nome.toLowerCase().includes("classificata");
  const fileLogo = `img/${nomePulito}.png`;
  const classe = isVincente ? "vincente" : "perdente";

  const logoHTML = usaLogo
    ? `<img src="${fileLogo}" alt="${nome}" onerror="this.style.display='none'">`
    : "";

  return `
    <div class="squadra orizzontale ${classe}">
      ${logoHTML}
      <span>${posizione} ${nome}</span>
    </div>`;
}

// ✅ Aggiorna i match
function aggiornaPlayoff() {
  const mapping = {
    // 🔹 Wildcard
    "WC1-A": { idx: 0, pos: 7 },
    "WC1-B": { idx: 1, pos: 8 },
    "WC2-A": { idx: 3, pos: 4 },
    "WC2-B": { idx: 2, pos: 11 },
    "WC3-A": { idx: 4, pos: 5 },
    "WC3-B": { idx: 5, pos: 10 },
    "WC4-A": { idx: 6, pos: 6 },
    "WC4-B": { idx: 7, pos: 9 },

    // 🔸 Quarti
    "Q1-A": { id: "Q1", side: "A" },
    "Q1-B": { id: "Q1", side: "B" },
    "Q2-A": { id: "Q2", side: "A" },
    "Q2-B": { id: "Q2", side: "B" },
    "Q3-A": { id: "Q3", side: "A" },
    "Q3-B": { id: "Q3", side: "B" },
    "Q4-A": { id: "Q4", side: "A" },
    "Q4-B": { id: "Q4", side: "B" },

    // ⚔️ Semifinali
    "S1-A": { id: "S1", side: "A", from: ["Q1", "Q2"] },
    "S1-B": { id: "S1", side: "B", from: ["Q1", "Q2"] },
    "S2-A": { id: "S2", side: "A", from: ["Q3", "Q4"] },
    "S2-B": { id: "S2", side: "B", from: ["Q3", "Q4"] },

    // 🏆 Finale
    "F-A": { id: "F", side: "A", from: ["S1", "S2"] },
    "F-B": { id: "F", side: "B", from: ["S1", "S2"] },
  };

document.querySelectorAll(".match").forEach(div => {
    const id = div.dataset.match;
    const config = mapping[id];
    if (!config) return;

    const risultato = window.risultati?.find(r => r.partita === config.id || r.partita === id.replace(/-[AB]$/, ""));
    let nome = "?", posizione = "", punteggio = "";

    if (id.includes("WC")) {
      const squadra = window.squadre?.[config.pos]?.nome;
      nome = risultato?.[id.endsWith("A") ? "squadraA" : "squadraB"] || squadra || "?";
      posizione = `${config.pos + 1}°`;
      punteggio = risultato?.[id.endsWith("A") ? "golA" : "golB"] ?? "";

    } else if (id.startsWith("Q") || id.startsWith("S") || id.startsWith("F")) {
      const teamKey = id.endsWith("A") ? "squadraA" : "squadraB";
      nome = risultato?.[teamKey] || risultato?.vincente || `Vincente ${config.from?.join("/")}`;
      posizione = window.squadre?.findIndex(s => s.nome === nome);
      posizione = posizione !== -1 ? `${posizione + 1}°` : "";
      punteggio = risultato?.[id.endsWith("A") ? "golA" : "golB"] ?? "";
    }

    const isVincente = risultato?.vincente === nome;
    div.innerHTML = creaHTMLSquadra(nome, posizione, punteggio, isVincente);

    if (isVincente) {
      div.classList.add("vincente");
    }
  }); // 🔚 fine forEach

// 🏆 Inserimento vincitore sotto la coppa
  const finale = window.risultati?.find(r => r.partita === "F");
  if (finale?.vincente) {
    const nomeVincitore = finale.vincente;
    const posizione = window.squadre?.findIndex(s => s.nome === nomeVincitore);
    const posizioneText = posizione >= 0 ? `${posizione + 1}°` : "";
    const logoSrc = `img/${nomeVincitore.replace(/[°]/g, "").trim()}.png`;

    console.log("Logo vincitore URL:", logoSrc);

    const htmlVincitore = `
      <img src="${logoSrc}" alt="${nomeVincitore}" class="logo-vincitore" onerror="this.style.display='none'">
      <div class="nome-vincitore">${nomeVincitore}</div>
    `;
    const container = document.getElementById("vincitore-assoluto");
    if (container) container.innerHTML = htmlVincitore;
  } // <--- chiude if
} // <--- chiude aggiornaPlayoff
// ✅ Caricamento CSV
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
    aggiornaPlayoff();
  }) // chiude il secondo .then
  .catch(err => console.error("Errore nel caricamento classifica:", err));
