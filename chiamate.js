const chiamateCSV = {
  // 🔴 LEGA UNICA - ROUND ROBIN
  round15: "https://docs.google.com/spreadsheets/d/e/2PACX-1vT3JULXWpbLRYmW9h08EWuzzGFjoEBwdnHipEk0UtilxTW0cse54k5Qa62tMnPmEX_e8OscCtkS6oxe/pub?gid=1279168385&single=true&output=csv",
  round16: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQljALg6cV6GAO7R9ORDub5Hb327wvHXdU626N43BKmT0_whIVOM_Y90p5RSE34ozkuaKWs1N4Mq5Yl/pub?gid=0&single=true&output=csv",

  // 🟨 Conference League
  league15: "https://docs.google.com/spreadsheets/d/1gvQlVxms2Sok4Inu9cWro3lZB9bI2LlrpkjbJlaaSGQ/export?format=csv&gid=492764886",
  league16: "https://docs.google.com/spreadsheets/d/1J2bIuRs9CIEzydLw-h1DHITs1IGFi7NrLTrxMj9dhDo/export?format=csv&gid=0",

  // 🟦 Conference Championship
  champ15:  "https://docs.google.com/spreadsheets/d/11BF_R13ZfF3kttSb6mVNhmpDPYbrEA3xKNkHFadp6kE/export?format=csv&gid=1279168385",
  champ16:  "https://docs.google.com/spreadsheets/d/1F_E2hP7nPr-IGdUTvUM2cPs8LYoMJ3KdHeRwsExl57k/export?format=csv&gid=0",

  // ⚖️ Compensative
  compensative: "https://docs.google.com/spreadsheets/d/1W-iDerMd9cKmJpaNKdrBIfjd280rfSK8_z9ru9WzDGA/export?format=csv&gid=1119982078"
};

function caricaChiamate(conference) {
  const container = document.getElementById("chiamate-container");
  container.innerHTML = "<p>⏳ Caricamento in corso...</p>";
  const url = chiamateCSV[conference];
  if (!url) return;

  fetch(url)
    .then(response => response.text())
    .then(csv => {
      const righe = csv.split("\n").map(r => r.split(","));
      const intestazioni = righe[0];
      const dati = righe.slice(1);

      if (dati.length === 1 && dati[0][0]?.startsWith("🔒")) {
        container.innerHTML = '<div class="avviso">' + dati[0][0] + '</div>';
        return;
      }

      let html = '<table><thead><tr>';
      intestazioni.forEach(t => html += '<th>' + t + '</th>');
      html += '</tr></thead><tbody>';
      dati.forEach(r => {
        if (r.length > 1 && r[1].trim() !== '') {
          html += '<tr>' + r.map(v => '<td>' + v + '</td>').join('') + '</tr>';
        }
      });
      html += '</tbody></table>';
      container.innerHTML = html;
    })
    .catch(err => {
      container.innerHTML = '<p style="color:red;">❌ Errore nel caricamento.</p>';
      console.error(err);
    });
}
