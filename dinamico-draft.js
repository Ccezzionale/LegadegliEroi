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

// Vincitore Coppa → bonus sul 10° round
const vincitoreCoppaPerConference = {
  "Conference League": null,
  "Conference Championship": "Rubinkebab"
};

const ROUND_BONUS_COPPA = 10;

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

// Bonus Coppa: l'ULTIMA pick di "squadra" diventa la PRIMA del round indicato
function applicaBonusCoppa(draft, roundBonus, squadra) {
  if (!squadra) return draft;

  const roundIndex = roundBonus - 1;
  const round = draft[roundIndex];
  if (!round) return draft;

  // 1) prima pick del round (min pickNumber nel roundBonus)
  let firstPick = round[0];
  round.forEach(p => {
    if (p.pickNumber < firstPick.pickNumber) {
      firstPick = p;
    }
  });

  // 2) ultima pick della squadra in tutto il draft
  let lastPick = null;
  draft.forEach(r => {
    r.forEach(p => {
      if (p.team === squadra) {
        if (!lastPick || p.pickNumber > lastPick.pickNumber) {
          lastPick = p;
        }
      }
    });
  });

  if (!lastPick) return draft;

  // 3) swap dei pickNumber
  const temp = firstPick.pickNumber;
  firstPick.pickNumber = lastPick.pickNumber;
  lastPick.pickNumber = temp;

  // Flag per lo stile (facoltativo)
  firstPick.bonusCoppa = true;
  lastPick.bonusCoppa = true;

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
  applicaBonusCoppa(
    leagueDraftBase,
    ROUND_BONUS_COPPA,
    vincitoreCoppaPerConference["Conference League"]
  );
  const league = formattaDraft(leagueDraftBase);

  // --- Conference Championship ---
  const champDraftBase = generaSnakeDraftBase(champTeams, 23);
  applicaScambi(champDraftBase, scambi, "Conference Championship");
  applicaBonusCoppa(
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

  // Prendo l'elenco delle squadre dal primo round
  const squadre = draftData[0].Picks.map(p => p.team);

  // Mappa squadra → lista delle sue pick
  const draftPerSquadra = {};
  squadre.forEach(s => { draftPerSquadra[s] = []; });

  // Riempio le pick per squadra
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

  // Costruisco l'HTML
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
