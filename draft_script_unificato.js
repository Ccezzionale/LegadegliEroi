
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

function inviaPickAlFoglio(pick, fantaTeam, nome, ruolo, squadra, quotazione, options = {}) {
  const dati = new URLSearchParams();
  dati.append("tab", tab); // <-- aggiungi questo, così prende il tab corretto
  dati.append("pick", pick || "");
  dati.append("fantaTeam", fantaTeam || "");
  dati.append("giocatore", nome || "");
  dati.append("ruolo", ruolo || "");
  dati.append("squadra", squadra || "");
  dati.append("quotazione", quotazione || "");

  if (options.targetPick) dati.append("targetPick", options.targetPick);
  if (typeof options.locked !== "undefined") {
    dati.append("locked", options.locked ? "TRUE" : "FALSE");
  }

  fetch(endpoint, { method: "POST", body: dati })
    .then(r => r.text())
    .then(txt => {
      console.log("✅ Risposta:", txt);
      return caricaPick().then(() => { popolaListaDisponibili(); aggiornaChiamatePerSquadra(); });
    })
    .catch(err => alert("❌ ERRORE invio pick: " + err));
}


function caricaGiocatori() {
  return fetch("giocatori_completo_finale.csv")
    .then(res => res.text())
    .then(csv => {
      const righe = csv.trim().split(/\r?\n/).slice(1);
      righe.forEach(r => {
        const [nome, ruolo, squadra, quotazione, u21] = r.split(",");
const key = normalize(nome);
mappaGiocatori[key] = { nome, ruolo, squadra, quotazione, u21 };
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
const endpoint = "https://script.google.com/macros/s/AKfycbyFSp-hdD7_r2pNoCJ_X1vjxAzVKXG4py42RUT5cFloUA9PG5zFGWh3sp-qg2MEg7H5OQ/exec";


// 🧪 Debug
console.log("🧪 Tab scelto:", tab);
console.log("📡 Endpoint:", endpoint);


function caricaPick() {
  return fetch(`${endpoint}?tab=${encodeURIComponent(tab)}`)
    .then(res => res.text())
    .then(txt => {
      try {
        if (!txt.trim().startsWith('[')) {
  console.error("❌ Risposta non JSON dal server:", txt);
  throw new Error("Risposta non JSON (doGet). Controlla il tab passato.");
}
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

  // 🧼 Pulizia dei filtri per evitare duplicati
  filtroRuolo.innerHTML = '<option value="">-- Tutti i Ruoli --</option>';
  filtroSerieA.innerHTML = '<option value="">-- Tutte --</option>';

  // 🧠 Set temporanei per ricostruire i filtri (senza duplicati)
  const ruoliTrovati = new Set();
  const squadreTrovate = new Set();

  Object.values(mappaGiocatori).forEach(({ nome, ruolo, squadra, quotazione }) => {
    const key = normalize(nome);
    if (giocatoriScelti.has(key)) return;

    const u21 = mappaGiocatori[key]?.u21?.toLowerCase() === "u21" ? "U21" : "";

    // 🧠 Accumula per i filtri
    if (ruolo) ruoliTrovati.add(ruolo);
    if (squadra) squadreTrovate.add(squadra);

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${nome}</td>
      <td>${ruolo}</td>
      <td>${squadra}</td>
      <td>${parseInt(quotazione)}</td>
      <td>${u21}</td>`;

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

            // 🔄 Ricostruisci la lista aggiornata
            popolaListaDisponibili();

            break;
          }
        }
      }
    });

    listaGiocatori.appendChild(tr);
  });

  // 🎯 Aggiunta dei filtri Ruolo
  Array.from(ruoliTrovati).forEach(r => {
    const opt = document.createElement("option");
    opt.value = r;
    opt.textContent = r;
    filtroRuolo.appendChild(opt);
  });

  // 🎯 Aggiunta dei filtri Squadra Serie A
  Array.from(squadreTrovate).sort((a, b) => a.localeCompare(b)).forEach(s => {
    const opt = document.createElement("option");
    opt.value = s;
    opt.textContent = s;
    filtroSerieA.appendChild(opt);
  });

  // 🧠 Applica filtri se ci sono già valori scritti
  filtraLista();
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
      if (pickNum >= 56 && pickNum <= 63) {
        r.style.backgroundColor = "#cce5ff";
        r.style.borderLeft = "4px solid #004085";
      }
      if (pickNum >= 112 && pickNum <= 119) {
        r.style.backgroundColor = "#d4edda";
        r.style.borderLeft = "4px solid #155724";
      }
    }

    if (tab === "Draft Conference") {
      const pickFP = [50, 52, 58, 59, 60, 61, 62, 64];
      if (pickFP.includes(pickNum)) {
        r.style.backgroundColor = "#cce5ff";
        r.style.borderLeft = "4px solid #004085";
      }
      if (pickNum >= 113 && pickNum <= 120) {
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
    const key = normalize(nome);


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

function mappaIndiceAssolutoPerTeam() {
  const righe = document.querySelectorAll("#tabella-pick tbody tr");
  const picksPerTeam = {};           // { team: [pick,...] }
  const indexMap = {};               // { "team|pick": posizioneAssoluta }

  righe.forEach(r => {
    const celle = r.querySelectorAll("td");
    const pick = parseInt(celle[0]?.textContent);
    const team = (celle[1]?.textContent || "").trim();
    if (!team || isNaN(pick)) return;
    if (!picksPerTeam[team]) picksPerTeam[team] = [];
    picksPerTeam[team].push(pick);
  });

  Object.keys(picksPerTeam).forEach(team => {
    picksPerTeam[team].sort((a, b) => a - b);
    picksPerTeam[team].forEach((p, i) => {
      indexMap[`${team}|${p}`] = i + 1; // 1-based
    });
  });

  return indexMap;
}

function aggiornaChiamatePerSquadra() {
  const righe = document.querySelectorAll("#tabella-pick tbody tr");
  const riepilogo = {};
  const indexMap = mappaIndiceAssolutoPerTeam(); // team|pick -> posizione assoluta

  righe.forEach(r => {
    const celle = r.querySelectorAll("td");
    const pickNum = parseInt(celle[0]?.textContent);
    const team = celle[1]?.textContent?.trim();
    const nome = celle[2]?.textContent?.trim();
    if (!team || !nome || isNaN(pickNum)) return;

    const key = normalize(nome);
    const ruolo = mappaGiocatori[key]?.ruolo || "";
    const isU21 = mappaGiocatori[key]?.u21?.toLowerCase() === "u21";
    const nAssoluto = indexMap[`${team}|${pickNum}`] || 1;

    if (!riepilogo[team]) riepilogo[team] = [];
    riepilogo[team].push({ n: nAssoluto, nome, ruolo, isU21 });
  });

  const container = document.getElementById("riepilogo-squadre");
  container.innerHTML = "";

  for (const [team, picks] of Object.entries(riepilogo)) {
    // Ordina per numero assoluto della chiamata
    picks.sort((a, b) => a.n - b.n);

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

    picks.forEach(p => {
      const riga = document.createElement("div");
      riga.textContent = `${p.n}. ${p.nome} (${p.ruolo})${p.isU21 ? " (U21)" : ""}`;
      riga.style.textAlign = "center";

      // 👉 giallo SOLO per le prime 6 chiamate assolute
      if (p.n <= 6) riga.classList.add("highlight-pick");
      if (p.isU21) riga.classList.add("under21");

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
