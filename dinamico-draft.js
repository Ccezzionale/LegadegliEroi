const conferencePerSquadra = {
  "Team Bartowski": "Conference League",
  "Desperados": "Conference League",
  "Riverfilo": "Conference Championship",
  "Golden Knights": "Conference Championship",
  "Fantaugusta": "Conference Championship",
  "Rubinkebab": "Conference Championship",
  "Eintracht Franco 126": "Conference Championship",
  "Fc Disoneste": "Conference Championship",
  "PokerMantra": "Conference Championship",
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

// 🔹 BONUS KEBA B: sposta la sua ultima pick al numero 73
function applicaBonusRubinkebab(draftChampionship) {
  const squadra = "Rubinkebab";
  const targetNumber = 73;   // prima pick del round 10

  // 1) trova l'ultima pick di Rubinkebab (pickNumber massimo tra le sue)
  let lastPick = null;
  draftChampionship.forEach(round => {
    round.forEach(p => {
      if (p.team === squadra) {
        if (!lastPick || p.pickNumber > lastPick.pickNumber) {
          lastPick = p;
        }
      }
    });
  });
  if (!lastPick) return draftChampionship;

  const oldNumber = lastPick.pickNumber; // es. 179
  if (oldNumber === targetNumber) return draftChampionship; // già a posto

  // 2) rinumera:
  // - le pick tra 73 e oldNumber-1 vanno su di 1
  // - la vecchia oldNumber di Kebab diventa 73
  draftChampionship.forEach(round => {
    round.forEach(p => {
      if (p === lastPick) return;
      if (p.pickNumber >= targetNumber && p.pickNumber < oldNumber) {
        p.pickNumber++;
      }
    });
  });

lastPick.pickNumber = targetNumber;
lastPick.bonusCoppa = true;   // 👈 evidenzia questa pick

return draftChampionship;

}

// Trasforma in formato finale
function formattaDraft(draft) {
  return draft.map((round, i) => ({
    Round: i + 1,
   Picks: round.map(p => ({
  team: p.team,
  pickNumber: p.pickNumber,
  scambioId: p.scambioId || null,
  bonusCoppa: !!p.bonusCoppa
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

  // --- Conference League (immutata) ---
  const leagueDraftBase = generaSnakeDraftBase(leagueTeams, 23);
  applicaScambi(leagueDraftBase, scambi, "Conference League");
  const league = formattaDraft(leagueDraftBase);

  // --- Conference Championship + bonus Kebab ---
  const champDraftBase = generaSnakeDraftBase(champTeams, 23);
  applicaScambi(champDraftBase, scambi, "Conference Championship");
  applicaBonusRubinkebab(champDraftBase);
  const championship = formattaDraft(champDraftBase);

  return {
    league,
    championship
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
        scambioId: p.scambioId,
        bonusCoppa: p.bonusCoppa
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
      const bonusClass = pick.bonusCoppa ? "bonus-coppa" : "";
html += `<div class="pick ${scambioClass} ${bonusClass}">Pick #${pick.pickNumber}</div>`;
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
