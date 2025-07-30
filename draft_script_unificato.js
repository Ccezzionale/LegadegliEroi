
const tabella = document.querySelector("#tabella-pick tbody");
const listaGiocatori = document.getElementById("lista-giocatori");
const giocatoriScelti = new Set();
const filtroRuolo = document.getElementById("filtroRuolo");
const filtroSerieA = document.getElementById("filtroSerieA");
const searchInput = document.getElementById("searchGiocatore");
const cercaRuolo = document.getElementById("cercaRuolo");

const mappaGiocatori = {};
let ruoli = new Set();
let squadre = new Set();

function normalize(nome) {
  return nome.trim().toLowerCase();
}

function inviaPickAlFoglio(pick, fantaTeam, nome, ruolo, squadra, quotazione) {
  const dati = new URLSearchParams();
  dati.append("pick", pick);
  dati.append("squadra", squadra);
  dati.append("fantaTeam", fantaTeam);
  dati.append("giocatore", nome);
  dati.append("ruolo", ruolo);
  dati.append("quotazione", quotazione);

console.log("🌐 Chiamata a endpoint:", endpoint);
fetch(endpoint, {
  method: "POST",
  body: dati
})
.then(res => res.text())
.then(txt => {
  console.log("✅ Risposta dal foglio:", txt);
  alert("✅ Pick inviata al foglio: " + txt);
})
.catch(err => {
  console.error("❌ Errore invio pick:", err);
  alert("❌ ERRORE invio pick: " + err);
});
  }

function caricaGiocatori() {
  return fetch("giocatori_completo_finale.csv")
    .then(res => res.text())
    .then(csv => {
      const righe = csv.trim().split(/\r?\n/).slice(1);
      righe.forEach(r => {
        const [nome, ruolo, squadra, quotazione] = r.split(",");
        const key = normalize(nome);
        mappaGiocatori[key] = { nome, ruolo, squadra, quotazione };
        if (ruolo) ruoli.add(ruolo);
        if (squadra) squadre.add(squadra);
      });
    });
}

// 📦 Estrae il parametro "tab" dall'URL o decide quale usare in base al nome del file
const urlParams = new URLSearchParams(window.location.search);
const tab = urlParams.get("tab") || (
  window.location.href.includes("conference")
    ? "Draft Conference"
    : "Draft Championship"
);

// 🌐 Imposta l'endpoint corretto con il tab scelto
const endpoint = `https://script.google.com/macros/s/AKfycbwGlBiarvPyDSGBIQfOp-nUXzwF9gIdP1K6TKY-jy_VGKyCGtji5pe46BCED5prESvytg/exec?tab=${encodeURIComponent(tab)}`;

// 🧪 Debug
console.log("🧪 Tab scelto:", tab);
console.log("📡 Endpoint:", endpoint);


function caricaPick() {
  return fetch(endpoint)
    .then(res => res.text())
    .then(txt => {
      try {
        const dati = JSON.parse(txt);
        const corpoTabella = document.querySelector("#tabella-pick tbody");
        corpoTabella.innerHTML = "";

        let prossima = null;
        let prossimaIndex = -1;

        // Identifica la prossima pick
        dati.forEach((riga, index) => {
          const nome = riga["Giocatore"]?.trim() || "";
          if (!nome && prossimaIndex === -1) {
            prossimaIndex = index;
            prossima = {
              fantaTeam: riga["Fanta Team"],
              pick: riga["Pick"]
            };
          }
        });

        dati.forEach((riga, i) => {
          const tr = document.createElement("tr");
          const nome = riga["Giocatore"]?.trim() || "";
          const fantaTeam = riga["Fanta Team"];
          const ruolo = riga["Ruolo"];
          const pick = riga["Pick"];

          giocatoriScelti.add(normalize(nome));

        tr.innerHTML = `
  <td>${pick}</td>
  <td>${fantaTeam}</td>
  <td>${nome}</td>`;

          if (i === prossimaIndex) {
            tr.classList.add("next-pick");
            tr.style.backgroundColor = "#ffcc00";
            setTimeout(() => {
              tr.scrollIntoView({ behavior: "smooth", block: "center" });
            }, 300);
          } else if (nome) {
            tr.style.backgroundColor = "white";
            tr.style.fontWeight = "bold";
          }

          corpoTabella.appendChild(tr);
        });

        applicaColoriPickSpeciali();

        // 🎯 Ricolora la pick attuale in giallo
if (prossimaIndex >= 0) {
  const righe = document.querySelectorAll("#tabella-pick tbody tr");
  const rigaCorrente = righe[prossimaIndex];
  if (rigaCorrente) {
    rigaCorrente.style.backgroundColor = "#ffcc00";
    rigaCorrente.classList.add("next-pick");
  }
}

        // Su mobile, mostra solo le 5 righe attorno alla pick corrente
        if (window.innerWidth <= 768 && prossimaIndex >= 0) {
          const start = Math.max(0, prossimaIndex - 2);
          const end = prossimaIndex + 3;
          document.querySelectorAll("#tabella-pick tbody tr").forEach((riga, i) => {
            if (i >= start && i < end) {
              riga.classList.add("show-mobile");
            }
          });
        }

        document.getElementById("turno-attuale").textContent = prossima
  ? `🎯 È il turno di: ${prossima.fantaTeam} (Pick ${prossima.pick})`
  : "✅ Draft completato!";
      } catch (err) {
        console.error("❌ Errore parsing JSON:", err);
        console.error("❌ Risposta ricevuta:", txt);
      }
    })
    .catch(err => {
      console.error("❌ Errore nella richiesta fetch:", err);
    });
}

function popolaListaDisponibili() {
  listaGiocatori.innerHTML = "";

  Object.values(mappaGiocatori).forEach(({ nome, ruolo, squadra, quotazione }) => {
    const key = normalize(nome);
    if (giocatoriScelti.has(key)) return;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${nome}</td>
      <td>${ruolo}</td>
      <td>${squadra}</td>
      <td>${parseInt(quotazione)}</td>`;

    tr.addEventListener("click", () => {
      const conferma = confirm(`Vuoi selezionare ${nome} per la squadra al turno?`);
      if (conferma) {
        const righe = document.querySelectorAll("#tabella-pick tbody tr");
        for (let r of righe) {
          const celle = r.querySelectorAll("td");
          if (celle.length >= 3 && !celle[2].textContent.trim()) {
            const pick = celle[0]?.textContent || "";
            const fantaTeam = celle[1]?.textContent || "";

            // 🔥 Elimina eventuali celle in eccesso oltre la 3
            while (r.children.length > 3) {
              r.removeChild(r.lastChild);
            }

            // ✅ Inserisci il nome nella terza colonna
            r.children[2].textContent = nome;

            // 🔄 Aggiorna stile della pick
            r.style.fontWeight = "bold";
            r.classList.remove("next-pick");

            // ✅ Aggiorna messaggio turno
            document.getElementById("turno-attuale").textContent = `✅ ${nome} selezionato!`;

            // 📤 Invia la pick al foglio
            inviaPickAlFoglio(pick, fantaTeam, nome, ruolo, squadra, quotazione);

            // 🎨 Riapplica i colori speciali FP / U21
            applicaColoriPickSpeciali();

            break;
          }
        }

        // 🔄 Rimuovi il giocatore dalla lista
        tr.remove();
        listaGiocatori.appendChild(tr);
      }
    });

    listaGiocatori.appendChild(tr);
  });

  // 🎯 Aggiunta dei filtri Ruolo
  Array.from(ruoli).forEach(r => {
    const opt = document.createElement("option");
    opt.value = r;
    opt.textContent = r;
    filtroRuolo.appendChild(opt);
  });

  // 🎯 Aggiunta dei filtri Squadra Serie A
  Array.from(squadre).sort((a, b) => a.localeCompare(b)).forEach(s => {
    const opt = document.createElement("option");
    opt.value = s;
    opt.textContent = s;
    filtroSerieA.appendChild(opt);
  });
}
function applicaColoriPickSpeciali() {
  const righe = document.querySelectorAll("#tabella-pick tbody tr");

  righe.forEach(r => {
    const celle = r.querySelectorAll("td");
    const pickNum = parseInt(celle[0]?.textContent);

    if (isNaN(pickNum)) return;

    // Reset base
    r.style.backgroundColor = "";
    r.style.borderLeft = "";

    if (tab === "Draft Championship") {
      if (pickNum >= 49 && pickNum <= 55) {
        r.style.backgroundColor = "#cce5ff";
        r.style.borderLeft = "4px solid #004085";
      }
      if (pickNum >= 98 && pickNum <= 104) {
        r.style.backgroundColor = "#d4edda";
        r.style.borderLeft = "4px solid #155724";
      }
    }

    if (tab === "Draft Conference") {
      const pickFP = [44, 46, 51, 52, 53, 54, 56];
      if (pickFP.includes(pickNum)) {
        r.style.backgroundColor = "#cce5ff";
        r.style.borderLeft = "4px solid #004085";
      }
      if (pickNum >= 99 && pickNum <= 105) {
        r.style.backgroundColor = "#d4edda";
        r.style.borderLeft = "4px solid #155724";
      }
    }
  });
}
function filtraLista() {
  const ruoloTesto = cercaRuolo.value.toLowerCase();
  const ruoloSelect = filtroRuolo.value.toLowerCase().split(/[,;\s]+/).filter(Boolean);
  const squadra = filtroSerieA.value.toLowerCase();
  const cerca = searchInput.value.toLowerCase();

  Array.from(listaGiocatori.children).forEach(row => {
    const nome = row.children[0].textContent.toLowerCase();
    const r = row.children[1].textContent.toLowerCase();
    const s = row.children[2].textContent.toLowerCase();
    const ruoliGiocatore = r.split(/[,;\s]+/).map(part => part.trim());

    const matchInput = !ruoloTesto || ruoliGiocatore.some(part => part.includes(ruoloTesto));
    const matchSelect = !ruoloSelect.length || ruoloSelect.some(rs => ruoliGiocatore.includes(rs));
    const matchSquadra = !squadra || s === squadra;
    const matchNome = !cerca || nome.includes(cerca);

    row.style.display = (matchInput && matchSelect && matchSquadra && matchNome) ? "" : "none";
  });
}

[filtroRuolo, filtroSerieA, searchInput, cercaRuolo].forEach(el => {
  if (el) el.addEventListener("input", filtraLista);
});

window.addEventListener("DOMContentLoaded", function () {
  caricaGiocatori().then(() =>
    caricaPick().then(() => {
      popolaListaDisponibili();
      aggiornaChiamatePerSquadra();
    })
  );
});

function aggiornaChiamatePerSquadra() {
  const righe = document.querySelectorAll("#tabella-pick tbody tr");
  const riepilogo = {};
  righe.forEach(r => {
    const celle = r.querySelectorAll("td");
    const team = celle[1]?.textContent?.trim();
    const nome = celle[2]?.textContent?.trim();
    const ruolo = mappaGiocatori[normalize(nome)]?.ruolo || "";
    if (!team || !nome) return;
    if (!riepilogo[team]) riepilogo[team] = [];
    riepilogo[team].push(`${riepilogo[team].length + 1}. ${nome} (${ruolo})`);
  });

  const container = document.getElementById("riepilogo-squadre");
  container.innerHTML = "";

  for (const [team, picks] of Object.entries(riepilogo)) {
const div = document.createElement("div");
div.className = "card-pick";
    const logoPath = `img/${team}.png`;
    const img = document.createElement("img");
    img.src = logoPath;
    img.alt = team;
    img.style.maxWidth = "60px";
    img.style.margin = "0 auto 8px";
    img.style.display = "block";
    div.appendChild(img);

    const h4 = document.createElement("h4");
    h4.textContent = team;
    h4.style.textAlign = "center";
    div.appendChild(h4);

picks.forEach((txt, index) => {
  const riga = document.createElement("div");
  riga.textContent = txt;
  riga.style.textAlign = "center";
  if (index < 6) {
    riga.classList.add("highlight-pick");
  }
  div.appendChild(riga);
});

    container.appendChild(div);
  }
}
window.aggiornaChiamatePerSquadra = aggiornaChiamatePerSquadra;

let ordineAscendente = {};

function ordinaPick(colonnaIndex, numerico = false) {
  const tbody = document.querySelector("#tabella-pick tbody");
  const righe = Array.from(tbody.querySelectorAll("tr"));

  const asc = !ordineAscendente[colonnaIndex];
  ordineAscendente[colonnaIndex] = asc;

  document.querySelectorAll("#tabella-pick thead th").forEach((th, idx) => {
    th.textContent = th.textContent.replace(/[\u2191\u2193]/g, "");
    if (idx === colonnaIndex) {
      th.textContent += asc ? " \u2191" : " \u2193";
    }
  });

  righe.sort((a, b) => {
    const aText = a.children[colonnaIndex]?.textContent.trim();
    const bText = b.children[colonnaIndex]?.textContent.trim();

    if (numerico) {
      const aNum = parseFloat(aText) || 0;
      const bNum = parseFloat(bText) || 0;
      return asc ? aNum - bNum : bNum - aNum;
    } else {
      return asc ? aText.localeCompare(bText) : bText.localeCompare(aText);
    }
  });

  tbody.innerHTML = "";
  righe.forEach(r => tbody.appendChild(r));
}
window.ordinaPick = ordinaPick;

let ordineListaAscendente = {};

function ordinaLista(colonnaIndex, numerico = false) {
  const tbody = document.getElementById("lista-giocatori");
  const righe = Array.from(tbody.querySelectorAll("tr"));

  const asc = !ordineListaAscendente[colonnaIndex];
  ordineListaAscendente[colonnaIndex] = asc;

  document.querySelectorAll("#lista-giocatori-table thead th").forEach((th, idx) => {
    th.textContent = th.textContent.replace(/[\u2191\u2193]/g, "");
    if (idx === colonnaIndex) {
      th.textContent += asc ? " \u2191" : " \u2193";
    }
  });

  righe.sort((a, b) => {
    const aText = a.children[colonnaIndex]?.textContent.trim();
    const bText = b.children[colonnaIndex]?.textContent.trim();

    if (numerico) {
      const aNum = parseFloat(aText) || 0;
      const bNum = parseFloat(bText) || 0;
      return asc ? aNum - bNum : bNum - aNum;
    } else {
      return asc ? aText.localeCompare(bText) : bText.localeCompare(aText);
    }
  });

  tbody.innerHTML = "";
  righe.forEach(r => tbody.appendChild(r));
}
window.ordinaLista = ordinaLista;
