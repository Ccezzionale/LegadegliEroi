const conferenceMap = {
  "Team Bartowski": "Conference League",
  "Desperados": "Conference League",
  "Riverfilo": "Conference Championship",
  "Golden Knights": "Conference Championship",
  "Lokomotiv Lipsia": "Conference Championship",
  "Union Librino": "Conference Championship",
  "Rubinkebab": "Conference Championship",
  "Eintracht Franco 126": "Conference Championship",
  "FC Disoneste": "Conference Championship",
  "PokerMantra": "Conference Championship",
  "wildboys78": "Conference Championship",
  "Bayern Christiansen": "Conference League",
  "Minnesode Timberland": "Conference League",
  "Giulay": "Conference League",
  "MinneSota Snakes": "Conference League",
  "Ibla": "Conference League",
  "Pandinicoccolosini": "Conference League",
  "Athletic Pongao": "Conference League"
};

// Crea draft a serpentina base
function generaSnakeDraftBase(teams, rounds) {
  let pickCounter = 1;
  return Array.from({ length: rounds }, (_, roundIndex) => {
    const order = (roundIndex + 1) % 2 === 1 ? teams : [...teams].reverse();
    return order.map(team => ({ team, pickNumber: pickCounter++ }));
  });
}

// Applica gli scambi sulle pick originali
function applicaScambi(draft, scambi, conference) {
  let scambioIdCounter = 1;

  scambi.forEach(([conf, round1, squadra1, round2, squadra2]) => {
    if (conf !== conference) return;

    const roundPicks1 = draft[round1 - 1];
    const roundPicks2 = draft[round2 - 1];
    if (!roundPicks1 || !roundPicks2) return;

    const pick1 = roundPicks1.find(p => p.team === squadra1);
    const pick2 = roundPicks2.find(p => p.team === squadra2);

    if (!pick1 || !pick2) return;

    console.log('✅ Scambio pickNumber:', { conf, round1, squadra1, round2, squadra2 });

    [pick1.pickNumber, pick2.pickNumber] = [pick2.pickNumber, pick1.pickNumber];

    // Assegna lo stesso ID a entrambe le pick scambiate
    pick1.scambioId = scambioIdCounter;
    pick2.scambioId = scambioIdCounter;

    scambioIdCounter++;
  });

  return draft;
}

// Trasforma il draft in formato finale
function formattaDraft(draft) {
  return draft.map((round, i) => ({
    Round: i + 1,
    Picks: round.map(p => ({
      team: p.team,
      pickNumber: p.pickNumber,
      scambioId: p.scambioId || null
    }))
  }));
}

// Gestisce classifica e scambi
function generaDraftDaCSV(classificaCSV, scambiCSV) {
  const squadre = classificaCSV.trim().split("\n").slice(1)
    .map(r => r.split(",")[1]?.trim())
    .filter(Boolean)
    .reverse();

  const leagueTeams = squadre.filter(s => conferenceMap[s] === "Conference League");
  const champTeams = squadre.filter(s => conferenceMap[s] === "Conference Championship");

const scambi = scambiCSV.trim().split("\n").slice(1).map(r => {
  const [conf, round1, squadra1, round2, squadra2] = r.split(",").map(s => s.trim());
  return [conf, parseInt(round1), squadra1, parseInt(round2), squadra2];
});


  return {
    league: formattaDraft(applicaScambi(generaSnakeDraftBase(leagueTeams, 21), scambi, "Conference League")),
    championship: formattaDraft(applicaScambi(generaSnakeDraftBase(champTeams, 21), scambi, "Conference Championship"))
  };
}

// Mostra il draft in colonne
function generaTabellaVerticale(containerId, draftData) {
  const container = document.getElementById(containerId);
  if (!draftData || draftData.length === 0) {
    container.innerHTML = "<p>⚠️ Nessun dato disponibile</p>";
    return;
  }

  // Prende l'elenco squadre dal primo round
  const squadre = draftData[0].Picks.map(p => p.team);
  const draftPerSquadra = {};
  squadre.forEach(s => draftPerSquadra[s] = []);

  // Costruisce la lista di pick per squadra
  draftData.forEach(round => {
    round.Picks.forEach(p => {
      draftPerSquadra[p.team]?.push({
        pickNumber: p.pickNumber,
        scambioId: p.scambioId
      });
    });
  });

  // Crea l'HTML
let html = '<div class="draft-scroll"><div class="draft-columns">';
squadre.forEach(squadra => {
  html += `<div class="draft-card">
              <div class="draft-header">
                <div class="draft-logo-wrapper">
                  <img src="img/${squadra}.png" alt="${squadra}" class="draft-logo">
                </div>
                <h3>${squadra}</h3>
              </div>
              <div class="draft-picks">`;

  draftPerSquadra[squadra].forEach(pick => {
    const scambioClass = pick.scambioId ? `scambio-${pick.scambioId}` : "";
    html += `<div class="pick ${scambioClass}">Pick #${pick.pickNumber}</div>`;
  });

  html += `</div></div>`;  // chiude draft-picks e draft-card
});

html += '</div></div>';  // chiude draft-columns e draft-scroll

container.innerHTML = html;
 } 
  
// Carica CSV e genera il draft
Promise.all([
  fetch("https://docs.google.com/spreadsheets/d/e/2PACX-1vTduESMbJiPuCDLaAFdOHjep9GW-notjraILSyyjo6SA0xKSR0H0fgMLPNNYSwXgnGGJUyv14kjFRqv/pub?gid=691152130&single=true&output=csv").then(r => r.text()),
  fetch("https://docs.google.com/spreadsheets/d/e/2PACX-1vTduESMbJiPuCDLaAFdOHjep9GW-notjraILSyyjo6SA0xKSR0H0fgMLPNNYSwXgnGGJUyv14kjFRqv/pub?gid=940716301&single=true&output=csv").then(r => r.text())
])
.then(([classificaCSV, scambiCSV]) => {
  const draft = generaDraftDaCSV(classificaCSV, scambiCSV);
  generaTabellaVerticale("draft-league", draft.league);
  generaTabellaVerticale("draft-championship", draft.championship);
})
.catch(err => {
  console.error("Errore nel caricamento del draft:", err);
});
