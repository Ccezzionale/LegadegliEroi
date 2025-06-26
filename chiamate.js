
const chiamateCSV = {
  league15: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRK5ADcukTU83udU_Z9Zd9w66-2LGi8TlWJP_F5WfcaHQePIUpRBynnpbnxbkEGnrh44jMvvBo7Wzo3/pub?gid=492764886&single=true&output=csv",
  league16: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRVk3BAULnfGd_CcqlPTwHRLCERbwAkhKJRSd_bNCgH9E9lCoaNfiafroJcRa_m9zs1eGoioU9YOy34/pub?gid=0&single=true&output=csv",
  champ15:  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSGbT5qMBn_PHnAyGfR1IayL3BgrfBYENXZ1tMoBXjvoZxQAFVI5wRk7kY0M9sAXuJg0wVImKh0g_bB/pub?gid=1279168385&single=true&output=csv",
  champ16:  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRVk3BAULnfGd_CcqlPTwHRLCERbwAkhKJRSd_bNCgH9E9lCoaNfiafroJcRa_m9zs1eGoioU9YOy34/pub?gid=0&single=true&output=csv"
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

      if (dati.length === 1 && dati[0][0].startsWith("🔒")) {
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
