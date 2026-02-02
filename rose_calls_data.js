// rose_calls_data.js
// Carica SOLO i dati rose dal tuo Google Sheet e li rende disponibili per svincolati.html
// Output: window.ROSE_CALLS = { "Nome Squadra": { giocatori:[{nome,ruolo,squadra,quotazione}] } }

(function () {
  const URL_ROSE =
    "https://docs.google.com/spreadsheets/d/1weMP9ajaScUSQhExCe7D7jtC7SjC9udw5ISg8f6Bezg/export?format=csv&gid=0";

  // stessa mappa “a blocchi” che usi in rose.js
  const squadre = [
    { col: 0, start: 2, end: 29, headerRow: 0 },
    { col: 5, start: 2, end: 29, headerRow: 0 },
    { col: 0, start: 33, end: 60, headerRow: 31 },
    { col: 5, start: 33, end: 60, headerRow: 31 },
    { col: 0, start: 64, end: 91, headerRow: 62 },
    { col: 5, start: 64, end: 91, headerRow: 62 },
    { col: 0, start: 95, end: 122, headerRow: 93 },
    { col: 5, start: 95, end: 122, headerRow: 93 },
    { col: 0, start: 126, end: 153, headerRow: 124 },
    { col: 5, start: 126, end: 153, headerRow: 124 },
    { col: 0, start: 157, end: 184, headerRow: 155 },
    { col: 5, start: 157, end: 184, headerRow: 155 },
    { col: 0, start: 188, end: 215, headerRow: 186 },
    { col: 5, start: 188, end: 215, headerRow: 186 },
    { col: 0, start: 219, end: 246, headerRow: 217 },
    { col: 5, start: 219, end: 246, headerRow: 217 },
  ];

  // parser semplice (coerente col tuo resto, niente virgole nei nomi)
  function parseCSV(text) {
    return text
      .trim()
      .split(/\r?\n/)
      .map((r) => r.split(",").map((c) => (c || "").trim()));
  }

  async function loadRoseCalls() {
    const res = await fetch(URL_ROSE, { cache: "no-store" });
    const text = await res.text();
    const rows = parseCSV(text);

    const out = {};

    for (const s of squadre) {
      const nomeSquadra = (rows[s.headerRow] && rows[s.headerRow][s.col]) ? rows[s.headerRow][s.col].trim() : "";
      if (!nomeSquadra || nomeSquadra.toLowerCase() === "ruolo") continue;

      const giocatori = [];

      for (let i = s.start; i <= s.end; i++) {
        const ruolo = (rows[i] && rows[i][s.col]) ? rows[i][s.col].trim() : "";
        const nome  = (rows[i] && rows[i][s.col + 1]) ? rows[i][s.col + 1].trim() : "";
        const teamA = (rows[i] && rows[i][s.col + 2]) ? rows[i][s.col + 2].trim() : "";
        const quota = (rows[i] && rows[i][s.col + 3]) ? rows[i][s.col + 3].trim() : "";

        if (!nome || nome.toLowerCase() === "nome") continue;

        giocatori.push({
          nome,
          ruolo,
          squadra: teamA,
          quotazione: quota
        });
      }

      if (giocatori.length) out[nomeSquadra] = { giocatori };
    }

    window.ROSE_CALLS = out;
    return out;
  }

  window.loadRoseCalls = loadRoseCalls;
})();
