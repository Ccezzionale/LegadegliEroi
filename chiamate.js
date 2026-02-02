// =====================
// CSV SOURCES
// =====================

// ✅ Round Robin: ORA legge dal tab "chiamate" (quello popolato dal tuo Apps Script)
const ROUND_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT3JULXWpbLRYmW9h08EWuzzGFjoEBwdnHipEk0UtilxTW0cse54k5Qa62tMnPmEX_e8OscCtkS6oxe/pub?gid=1279168385&single=true&output=csv";

// 🟨 / 🟦 Per ora teniamo i vecchi CSV (li userai o li migri l'anno prossimo)
const chiamateCSV = {
  round: ROUND_CSV_URL,

  // Conference League (legacy)
  league: "https://docs.google.com/spreadsheets/d/1gvQlVxms2Sok4Inu9cWro3lZB9bI2LlrpkjbJlaaSGQ/export?format=csv&gid=492764886",

  // Conference Championship (legacy)
  champ: "https://docs.google.com/spreadsheets/d/11BF_R13ZfF3kttSb6mVNhmpDPYbrEA3xKNkHFadp6kE/export?format=csv&gid=1279168385"
};


// =====================
// LOAD + RENDER
// =====================
function caricaChiamate(tipo) {
  const container = document.getElementById("chiamate-container");
  container.innerHTML = "<p>⏳ Caricamento in corso...</p>";

  const url = chiamateCSV[tipo];
  if (!url || url.includes("INCOLLA_QUI")) {
    container.innerHTML = '<p style="color:red;">⚠️ URL CSV non configurato per: ' + tipo + '</p>';
    return;
  }

  fetch(url + (url.includes("?") ? "&" : "?") + "_cb=" + Date.now(), { cache: "no-store" })
    .then(r => r.text())
    .then(csv => {
      // parsing semplice (va bene se nel CSV non hai virgole nei campi)
      const righe = csv.trim().split("\n").map(r => r.split(","));
      if (!righe.length) {
        container.innerHTML = "<p>Nessun dato.</p>";
        return;
      }

      // se il foglio è in lock mode
      // (es: prima cella contiene 🔒 ...)
      if (righe.length === 1 && (righe[0][0] || "").startsWith("🔒")) {
        container.innerHTML = '<div class="avviso">' + righe[0][0] + '</div>';
        return;
      }

      const intestazioni = righe[0];
      const dati = righe.slice(1);

      let html = '<table><thead><tr>';
      intestazioni.forEach(t => html += '<th>' + esc(t) + '</th>');
      html += '</tr></thead><tbody>';

      dati.forEach(r => {
        // evita righe vuote
        if (r.length > 1 && (r[1] || "").trim() !== "") {
          html += '<tr>' + r.map(v => '<td>' + esc(v) + '</td>').join('') + '</tr>';
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

// helper anti HTML injection
function esc(s){
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

