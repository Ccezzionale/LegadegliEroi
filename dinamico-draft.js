const conferencePerSquadra = {
  "Team Bartowski": "Conference League",
  "Desperados": "Conference League",
  "riverfilo": "Conference Championship",
  "Golden Knights": "Conference Championship",
  "Fantaugusta": "Conference Championship",
  "Rubinkebab": "Conference Championship",
  "Eintracht Franco 126": "Conference Championship",
  "Fc Disoneste": "Conference Championship",
  "POKERMANTRA": "Conference Championship",
  "wildboys78": "Conference Championship",
  "Bayern Christiansen": "Conference League",
  "Minnesode Timberland": "Conference League",
  "MinneSota Snakes": "Conference League",
  "Ibla": "Conference League",
  "Pandinicoccolosini": "Conference League",
  "Athletic Pongao": "Conference League"
};

// Serpentina base
function generaSnakeDraftBase(teams, rounds) {
  let pickCounter = 1;
  return Array.from({ length: rounds }, (_, roundIndex) => {
    const order = (roundIndex + 1) % 2 === 1 ? teams : [...teams].reverse();
    return order.map(team => ({ team, pickNumber: pickCounter++ }));
  });
}

// Applica gli scambi
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

    [pick1.pickNumber, pick2.pickNumber] = [pick2.pickNumber, pick1.pickNumber];
    pick1.scambioId = scambioIdCounter;
    pick2.scambioId = scambioIdCounter;

    scambioIdCounter++;
  });

  return draft;
}

// Trasforma in formato finale
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

// Usa classifica totale + scambi
function generaDraftDaCSV(classificaCSV, scambiCSV) {
  const squadreTotali = classificaCSV.trim().split("\n").slice(1)
    .map(r => r.split(",")[1]?.trim())  // colonna 2 = squadra
    .filter(Boolean)
    .reverse(); // ultimo in classifica → prima pick

  const leagueTeams = squadreTotali.filter(s => conferencePerSquadra[s] === "Conference League");
  const champTeams  = squadreTotali.filter(s => conferencePerSquadra[s] === "Conference Championship");

  const scambi = scambiCSV.trim().split("\n").slice(1).map(r => {
    const [conf, round1, squadra1, round2, squadra2] = r.split(",").map(s => s.trim());
    return [conf, parseInt(round1), squadra1, parseInt(round2), squadra2];
  });

  return {
    league: formattaDraft(applicaScambi(generaSnakeDraftBase(leagueTeams, 21), scambi, "Conference League")),
    championship: formattaDraft(applicaScambi(generaSnakeDraftBase(champTeams, 21), scambi, "Conference Championship"))
  };
}

// Stampa il draft
function generaTabellaVerticale(containerId, draftData) {
  const container = document.getElementById(containerId);
  if (!draftData || draftData.length === 0) {
    container.innerHTML = "<p>⚠️ Nessun dato disponibile</p>";
    return;
  }

  const squadre = draftData[0].Picks.map(p => p.team);
  const draftPerSquadra = {};
  squadre.forEach(s => draftPerSquadra[s] = []);

  draftData.forEach(round => {
    round.Picks.forEach(p => {
      draftPerSquadra[p.team]?.push({
        pickNumber: p.pickNumber,
        scambioId: p.scambioId
      });
    });
  });

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

    html += `</div></div>`;
  });

  html += '</div></div>';
  container.innerHTML = html;
}

// Fetch classifica totale + scambi
Promise.all([
  fetch("https://docs.google.com/spreadsheets/d/1kPDuSW9IKwJArUS4oOv0iIVRHU7F4zPASPXT8Qf86Fo/export?format=csv&gid=691152130").then(r => r.text()), // classifica totale
  fetch("https://docs.google.com/spreadsheets/d/1kPDuSW9IKwJArUS4oOv0iIVRHU7F4zPASPXT8Qf86Fo/export?format=csv&gid=940716301").then(r => r.text())  // scambi
])
.then(([classificaCSV, scambiCSV]) => {
  const draft = generaDraftDaCSV(classificaCSV, scambiCSV);
  generaTabellaVerticale("draft-league", draft.league);
  generaTabellaVerticale("draft-championship", draft.championship);
})
.catch(err => {
  console.error("Errore nel caricamento del draft:", err);
});

