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

// --- CONFIG BONUS COPPA ---
const ROUND_BONUS_COPPA = 10;
const vincitoreCoppaPerConference = {
  "Conference League": null,
  "Conference Championship": "Rubinkebab"
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

// BONUS COPPA: aggiunge una pick in testa al round indicato
// es: nuova Pick #73 a Rubinkebab, poi tutto da 73 in su scala di +1
function inserisciPickCoppa(draft, roundBonus, squadra) {
  if (!squadra) return draft;

  const roundIndex = roundBonus - 1;
  const round = draft[roundIndex];
  if (!round) return draft;

  // numero della prima pick di quel round (es. 73)
  const firstPickNumber = Math.min(...round.map(p => p.pickNumber));

  // shifto tutte le pick ≥ firstPickNumber di +1
  draft.forEach(r => {
    r.forEach(p => {
      if (p.pickNumber >= firstPickNumber) {
        p.pickNumber++;
      }
    });
  });

  // nuova pick bonus
  const bonusPick = {
    team: squadra,
    pickNumber: firstPickNumber,
    scambioId: null,
    bonusCoppa: true
  };

  // la metto in testa al round 10
  round.unshift(bonusPick);

  return draft;
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

  // --- Conference League ---
  const leagueDraftBase = generaSnakeDraftBase(leagueTeams, 23);
  applicaScambi(leagueDraftBase, scambi, "Conference League");
  inserisciPickCoppa(
    leagueDraftBase,
    ROUND_BONUS_COPPA,
    vincitoreCoppaPerConference["Conference League"]
  );
  const league = formattaDraft(leagueDraftBase);

  // --- Conference Championship ---
  const champDraftBase = generaSnakeDraftBase(champTeams, 23);
  applicaScambi(champDraftBase, scambi, "Conference Championship");
  inserisciPickCoppa(
    champDraftBase,
    ROUND_BONUS_COPPA,
    vincitoreCoppaPerConference["Conference Championship"]
  );
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
  squadre.forEach(s => { draftPerSquadra[s] = []; });

  draftData.forEach(round => {
    round.Picks.forEach(p => {
      if (!draftPerSquadra[p.team]) {
        draftPerSquadra[p.team] = [];
      }
      draftPerSquadra[p.team].push({
        pickNumber: p.pickNumber,
        scambioId: p.scambioId,
        bonusCoppa: p.bonusCoppa
      });
    });
  });

  // ordino le pick per numero
  Object.values(draftPerSquadra).forEach(lista => {
    lista.sort((a, b) => a.pickNumber - b.pickNumber);
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
      const bonusClass = pick.bonusCoppa ? " bonus-coppa" : "";
      html += `<div class="pick ${scambioClass}${bonusClass}">Pick #${pick.pickNumber}</div>`;
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

