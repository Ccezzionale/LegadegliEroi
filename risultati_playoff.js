const URL_PLAYOFF = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSwFDMVkq09-yRzsLwFqehbAntqMpTPtyMwUsTJkRtUREmmP6vJcTROPchoYq1rc0h1ynqkcGJvEOsD/pub?gid=0&single=true&output=csv";

// Struttura: [{ partita: "WC1", squadraA: "...", squadraB: "...", golA: x, golB: y, vincente: "..." }, ...]
fetch(URL_PLAYOFF)
  .then(res => res.text())
  .then(csv => {
    const righe = csv.trim().split("\n").slice(1); // Ignora intestazioni

    const risultati = righe.map(riga => {
      const colonne = riga.split(",").map(c => c.trim().replace(/"/g, ""));
      const [fase, codicePartita, squadra1, squadra2, gol1, gol2, vincente] = colonne;
      return {
        partita: codicePartita,
        squadraA: squadra1,
        squadraB: squadra2,
        golA: gol1 ? parseInt(gol1) : null,
        golB: gol2 ? parseInt(gol2) : null,
        vincente: vincente || ""
      };
    });

    console.log("✅ Risultati Playoff:", risultati);
    window.risultati = risultati;

    if (typeof aggiornaPlayoff === "function" && window.squadre) {
      aggiornaPlayoff();
    }
  })
  .catch(err => {
    console.error("❌ Errore nel caricamento dei risultati playoff:", err);
  });
