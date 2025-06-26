const rose = {};

const conferencePerSquadra = {
  "Team Bartowski": "Conference League",
  "Desperados": "Conference League",
  "Sharknado 04": "Conference Championship",
  "Real Mimmo": "Conference Championship",
  "Giody": "Conference Championship",
  "Union Librino": "Conference Championship",
  "Rubinkebab": "Conference Championship",
  "Rafa Casablanca": "Conference Championship",
  "PokerMantra": "Conference Championship",
  "wildboys78": "Conference Championship",
  "Bayern Christiansen": "Conference League",
  "Minnesode Timberland": "Conference League",
  "Giulay": "Conference League",
  "MinneSota Snakes": "Conference League",
  "Ibla": "Conference League",
  "Pandinicoccolosini": "Conference League"
};

const giocatoriFP = new Set();

const giocatoriU21PerSquadra = {
  "Team Bartowski": ["baldanzi"],
  "Desperados": ["fazzini"],
  "Sharknado 04": [],
  "Real Mimmo": ["bonny"],
  "Giody": ["goglichidze"],
  "Union Librino": [],
  "Rubinkebab": [],
  "Rafa Casablanca": [],
  "PokerMantra": ["yildiz"],
  "wildboys78": ["tchaouna"],
  "Bayern Christiansen": ["castro s."],
  "Minnesode Timberland": ["scalvini"],
  "Giulay": ["goglichidze"],
  "MinneSota Snakes": ["fabbian"],
  "Ibla": ["soule'"],
  "Pandinicoccolosini": ["yildiz"]
};

const URL_ROSE = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSE8Q0l1pnU8NCtId51qCk8Pstat27g6JBQaU-3UKIY0ZCZicUJ1u1T-ElvuR9NK9pc2WYpunW-a4ld/pub?output=csv";
const URL_QUOTAZIONI = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSE8Q0l1pnU8NCtId51qCk8Pstat27g6JBQaU-3UKIY0ZCZicUJ1u1T-ElvuR9NK9pc2WYpunW-a4ld/pub?gid=2087990274&single=true&output=csv";

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
  { col: 0, start: 187, end: 215, headerRow: 186 },
  { col: 5, start: 187, end: 215, headerRow: 186 },
  { col: 0, start: 218, end: 246, headerRow: 217 },
  { col: 5, start: 218, end: 246, headerRow: 217 },
];

function trovaLogo(nomeSquadra) {
  const estensioni = [".png", ".jpg"];
  const varianti = [
    nomeSquadra,
    nomeSquadra.toLowerCase(),
    nomeSquadra.replaceAll(" ", "_").toLowerCase()
  ];
  for (const base of varianti) {
    for (const ext of estensioni) {
      return `img/${base}${ext}`;
    }
  }
  return "img/default.png";
}

async function caricaGiocatoriFP() {
  try {
    const response = await fetch(URL_QUOTAZIONI);
    const text = await response.text();
    const rows = text.split("\n").map(r => r.split(","));
    const portieriPerSquadra = {};

    for (let i = 1; i < rows.length; i++) {
      const ruolo = rows[i][0]?.trim().toUpperCase();
      const nome = rows[i][2]?.trim();
      const squadra = rows[i][3]?.trim();
      const quotazione = parseFloat(rows[i][4]?.replace(",", "."));

      if (!nome || isNaN(quotazione)) continue;
      const nomeLower = nome.toLowerCase();

      if (ruolo === "P") {
        if (!portieriPerSquadra[squadra]) portieriPerSquadra[squadra] = [];
        portieriPerSquadra[squadra].push({ nome: nomeLower, quotazione });
      } else if (
        (ruolo === "D" && quotazione <= 9) ||
        (ruolo === "C" && quotazione <= 14) ||
        (ruolo === "A" && quotazione <= 19)
      ) {
        giocatoriFP.add(nomeLower);
      }
    }

    for (const squadra in portieriPerSquadra) {
      const blocco = portieriPerSquadra[squadra];
      const maxQuota = Math.max(...blocco.map(p => p.quotazione));
      if (maxQuota <= 12) {
        blocco.forEach(p => giocatoriFP.add(p.nome));
      }
    }
  } catch (e) {
    console.error("Errore nel caricamento FP:", e);
  }
}

async function caricaRose() {
  await caricaGiocatoriFP();
  const response = await fetch(URL_ROSE);
  const text = await response.text();
  const rows = text.split("\n").map(r => r.split(","));

  for (const s of squadre) {
    let nomeSquadra = rows[s.headerRow]?.[s.col]?.trim();
    if (!nomeSquadra || nomeSquadra.toLowerCase() === "ruolo") continue;

    const giocatori = [];
    for (let i = s.start; i <= s.end; i++) {
      const ruolo = rows[i]?.[s.col]?.trim() || "";
      const nome = rows[i]?.[s.col + 1]?.trim() || "";
      const squadra = rows[i]?.[s.col + 2]?.trim() || "";
      const quotazione = rows[i]?.[s.col + 3]?.trim() || "";
      const nomeClean = nome.toLowerCase();

      if (nome && nome.toLowerCase() !== "nome") {
        giocatori.push({
          nome,
          ruolo,
          squadra,
          quotazione,
          fp: giocatoriFP.has(nomeClean),
          u21: giocatoriU21PerSquadra[nomeSquadra]?.includes(nomeClean) || false
        });
      }
    }

    if (giocatori.length > 0) {
      rose[nomeSquadra] = {
        logo: trovaLogo(nomeSquadra),
        giocatori
      };
    }
  }

  mostraRose();
  popolaFiltri();
}

function mostraRose() {
  const container = document.getElementById("contenitore-rose");
  if (!container) return;
  container.innerHTML = "";

  for (const [nome, data] of Object.entries(rose)) {
    const div = document.createElement("div");
    div.className = "box-rosa giocatore";
    div.setAttribute("data-squadra", nome);
    div.setAttribute("data-conference", conferencePerSquadra[nome] || "N/A");

    const header = document.createElement("div");
    header.className = "logo-nome";

    const img = document.createElement("img");
    img.src = data.logo;
    img.alt = nome;
    img.onerror = () => { img.style.display = "none"; };

    const name = document.createElement("span");
    name.textContent = nome;

    header.appendChild(img);
    header.appendChild(name);
    div.appendChild(header);

    const table = document.createElement("table");
    table.innerHTML = `
  <thead><tr><th>Ruolo</th><th>Nome</th><th>Squadra</th></tr></thead>
  <tbody>
    ${data.giocatori.map(g => `
      <tr>
        <td>${g.ruolo}</td>
        <td class="nome">${g.nome} ${g.fp ? '🅕' : ''} ${g.u21 ? '🅤21' : ''}</td>
        <td>${g.squadra}</td>
      </tr>`).join("")}
  </tbody>
    `;
    div.appendChild(table);
    container.appendChild(div);
  }
}

function popolaFiltri() {
  const selectSquadra = document.getElementById("filtro-squadra");
  const selectConference = document.getElementById("filtro-conference");

  selectSquadra.innerHTML = '<option value="Tutte">Tutte le squadre</option>';
  selectConference.innerHTML = '<option value="Tutte">Tutte le Conference</option>';

  const squadreSet = new Set();
  const conferenceSet = new Set();

  for (const squadra in rose) {
    squadreSet.add(squadra);
    const conf = conferencePerSquadra[squadra] || "N/A";
    conferenceSet.add(conf);
  }

  Array.from(squadreSet).sort().forEach(sq => {
    const option = document.createElement("option");
    option.value = sq;
    option.textContent = sq;
    selectSquadra.appendChild(option);
  });

  Array.from(conferenceSet).sort().forEach(conf => {
    const option = document.createElement("option");
    option.value = conf;
    option.textContent = conf;
    selectConference.appendChild(option);
  });
}

function filtraGiocatori() {
  const nome = document.getElementById('filtro-nome').value.toLowerCase();
  const conference = document.getElementById('filtro-conference').value;
  const squadra = document.getElementById('filtro-squadra').value;

  document.querySelectorAll('.giocatore').forEach(row => {
    const nomiGiocatori = [...row.querySelectorAll('.nome')].map(e => e.textContent.toLowerCase());
    const conf = row.getAttribute('data-conference');
    const team = row.getAttribute('data-squadra');

    const matchNome = nomiGiocatori.some(n => n.includes(nome));
    const matchConf = (conference === 'Tutte' || conf === conference);
    const matchTeam = (squadra === 'Tutte' || team === squadra);

    if (matchNome && matchConf && matchTeam) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  });
}

document.getElementById('filtro-nome').addEventListener('input', filtraGiocatori);
document.getElementById('filtro-conference').addEventListener('change', filtraGiocatori);
document.getElementById('filtro-squadra').addEventListener('change', filtraGiocatori);

function resetFiltri() {
  document.getElementById('filtro-nome').value = '';
  document.getElementById('filtro-conference').value = 'Tutte';
  document.getElementById('filtro-squadra').value = 'Tutte';
  filtraGiocatori();
}

window.addEventListener("DOMContentLoaded", caricaRose);
