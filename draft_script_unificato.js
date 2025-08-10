
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


// CSV con cache locale (TTL 24h) + parser separato
async function caricaGiocatori() {
  const KEY = "giocatori_csv_cache_v2";           // chiave cache
  const TTL = 24 * 60 * 60 * 1000;                // 24 ore in ms
  const now = Date.now();

  try {
    // prova a usare la cache
    const cache = JSON.parse(localStorage.getItem(KEY) || "null");
    if (cache && (now - cache.time) < TTL && cache.csv) {
      parseGiocatoriCSV(cache.csv);
      return;
    }
    // niente cache valida → fetch
    await fetchAndParseGiocatori(KEY, now);
  } catch (err) {
    console.warn("Cache CSV non disponibile, fallback al fetch:", err);
    await fetchAndParseGiocatori(KEY, now);
  }
}

// helper per evitare duplicazione del fetch
async function fetchAndParseGiocatori(KEY, now) {
  const res = await fetch("giocatori_completo_finale.csv");
  const csv = await res.text();
  localStorage.setItem(KEY, JSON.stringify({ time: now, csv }));
  parseGiocatoriCSV(csv);
}

// parser CSV → popola mappaGiocatori + set ruoli/squadre
function parseGiocatoriCSV(csv) {
  ruoli = new Set();
  squadre = new Set();
  Object.keys(mappaGiocatori).forEach(k => delete mappaGiocatori[k]);

  const righe = csv.trim().split(/\r?\n/).slice(1);
  righe.forEach(r => {
    const [nome, ruolo, squadra, quotazione, u21] = r.split(",");
    const key = normalize(nome);
    mappaGiocatori[key] = { nome, ruolo, squadra, quotazione, u21 };
    if (ruolo) ruoli.add(ruolo);
    if (squadra) squadre.add(squadra);
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

function rangeToSet(a, b) {
  const s = new Set();
  for (let i = a; i <= b; i++) s.add(i);
  return s;
}

function getSpecialPickSets(tab) {
  if (tab === "Draft Championship") {
    return {
      fp: new Set([56, 59, 60]),
      u21: new Set([114, 115])
    };
  }
  return {
    fp: new Set([50, 52, 58, 59, 60, 61, 62, 64]),
    u21: rangeToSet(113, 120)
  };
}

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
  // svuota tabella una volta sola
  listaGiocatori.innerHTML = "";

  // ricostruisci i filtri da zero
  const ruoliTrovati = new Set();
  const squadreTrovate = new Set();

  // crea un buffer in memoria per evitare reflow continui
  const frag = document.createDocumentFragment();

  Object.values(mappaGiocatori).forEach(({ nome, ruolo, squadra, quotazione }) => {
    const key = normalize(nome);
    if (giocatoriScelti.has(key)) return;

    const u21 = mappaGiocatori[key]?.u21?.toLowerCase() === "u21" ? "U21" : "";

    if (ruolo) ruoliTrovati.add(ruolo);
    if (squadra) squadreTrovate.add(squadra);

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${nome}</td>
      <td>${ruolo || ""}</td>
      <td>${squadra || ""}</td>
      <td>${parseInt(quotazione) || 0}</td>
      <td>${u21}</td>
    `;
    frag.appendChild(tr);
  });

  // inserisci tutte le righe in un colpo solo
  listaGiocatori.appendChild(frag);

  // delega click sulla tabella (un solo listener, non per riga)
  if (!listaGiocatori.dataset.bound) {
    listaGiocatori.addEventListener("click", (e) => {
      const tr = e.target.closest("tr");
      if (!tr) return;

      const nome = tr.children[0].textContent;
      const ruolo = tr.children[1].textContent;
      const squadra = tr.children[2].textContent;
      const quotazione = tr.children[3].textContent;

      const conferma = confirm(`Vuoi selezionare ${nome} per la squadra al turno?`);
      if (!conferma) return;

      const righe = document.querySelectorAll("#tabella-pick tbody tr");
      for (let r of righe) {
        const celle = r.querySelectorAll("td");
        if (celle.length >= 3 && !celle[2].textContent.trim()) {
          const pick = celle[0]?.textContent || "";
          const fantaTeam = celle[1]?.textContent || "";

          while (r.children.length > 3) r.removeChild(r.lastChild);
          r.children[2].textContent = nome;

          r.style.fontWeight = "bold";
          r.classList.remove("next-pick");

          document.getElementById("turno-attuale").textContent = `✅ ${nome} selezionato!`;

          inviaPickAlFoglio(pick, fantaTeam, nome, ruolo, squadra, quotazione);

          alert(`✅ Pick confermata!\n${nome} assegnato a ${fantaTeam}`);

          applicaColoriPickSpeciali();
          popolaListaDisponibili(); // ricostruisci la lista aggiornata
          break;
        }
      }
    });
    listaGiocatori.dataset.bound = "1"; // evita di aggiungere più volte il listener
  }

  // ricostruisci le <option> una volta sola
  filtroRuolo.innerHTML = '<option value="">-- Tutti i Ruoli --</option>' +
    Array.from(ruoliTrovati).map(r => `<option value="${r}">${r}</option>`).join("");

  filtroSerieA.innerHTML = '<option value="">-- Tutte --</option>' +
    Array.from(squadreTrovate).sort((a, b) => a.localeCompare(b))
      .map(s => `<option value="${s}">${s}</option>`).join("");

  // applica i filtri esistenti (se l'utente aveva già scritto qualcosa)
  filtraLista();
}

function applicaColoriPickSpeciali() {
  const righe = document.querySelectorAll("#tabella-pick tbody tr");
  const sets = getSpecialPickSets(tab);

  righe.forEach(r => {
    const celle = r.querySelectorAll("td");
    const pickNum = parseInt(celle[0]?.textContent);
    if (isNaN(pickNum)) return;

    // reset
    r.style.backgroundColor = "";
    r.style.borderLeft = "";

    // FP
    if (sets.fp.has(pickNum)) {
      r.style.backgroundColor = "#cce5ff";
      r.style.borderLeft = "4px solid #004085";
    }

    // U21
    if (sets.u21.has(pickNum)) {
      r.style.backgroundColor = "#d4edda";
      r.style.borderLeft = "4px solid #155724";
    }
  });
}

function debounce(fn, delay = 150) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
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
  if (el) el.addEventListener("input", debounce(filtraLista, 150));
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
  const sets = getSpecialPickSets(tab);

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
    riepilogo[team].push({ n: nAssoluto, nome, ruolo, isU21, pickNum });
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
img.loading = "lazy";     // 👈 lazy-load
img.width = 60;           // 👈 dimensioni fisse utili al layout
img.height = 60;
img.style.margin = "0 auto 8px";
img.style.display = "block";
div.appendChild(img);

    const h4 = document.createElement("h4");
    h4.textContent = team;
    h4.style.textAlign = "center";
    div.appendChild(h4);

 picks.forEach(p => {
  const riga = document.createElement("div");
  riga.style.textAlign = "center";

  const parts = [];
  parts.push(`${p.n}. ${p.nome} (${p.ruolo})`);

  // Badge FP se la pick è in uno slot FP
if (sets.fp.has(p.pickNum || 0)) {
  parts.push('<span class="badge fp">⭐</span>');
}

// Badge U21 se la pick è in uno slot U21
if (sets.u21.has(p.pickNum || 0)) {
  parts.push('<span class="badge u21">🐣</span>');
}

  // (opzionale) badge u21 anagrafico dal CSV
  if (p.isU21) {
    parts.push('<span class="badge u21-flag">u21</span>');
  }

  riga.innerHTML = parts.join(" ");

  // giallo per prime 6 chiamate assolute del team
  if (p.n <= 6) riga.classList.add("highlight-pick");

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
