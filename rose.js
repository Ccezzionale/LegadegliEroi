const rose = {};


const conferencePerSquadra = {
  "Team Bartowski": "Conference League",
  "Desperados": "Conference League",
  "Riverfilo": "Conference Championship",
  "Golden Knights": "Conference Championship",
  "Fantaugusta": "Conference Championship",
  "Rubinkebab": "Conference Championship",
  "Eintracht Franco 126": "Conference Championship",
  "Fc Disoneste": "Conference Championship",
  "PokerMantra": "Conference Championship",
  "wildboys78": "Conference Championship",
  "Bayern Christiansen": "Conference League",
  "Minnesode Timberland": "Conference League",
  "MinneSota Snakes": "Conference League",
  "Ibla": "Conference League",
  "Pandinicoccolosini": "Conference League",
  "Athletic Pongao": "Conference League"
};

const giocatoriFP = new Set();

const giocatoriU21PerSquadra = {
  "Team Bartowski": ["denoon", "gineitis", "athekame"],
  "Desperados": ["ordonez c.", "lipani", "ramon"],
  "Riverfilo": ["paz n.", "castro s.", "akinsanmiro"],
  "Golden Knights": ["palestra", "otoa", "esposito f.p."],
  "Fantaugusta": ["comuzzo", "pisilli", "ekhator"],
  "Fc Disoneste": ["gineitis", "norton-cuffy", "ziolkowski"],
  "Rubinkebab": ["diao", "pisilli", "ahanor"],
  "Eintracht Franco 126": ["marianucci", "valle", "ramon"],
  "PokerMantra": ["ziolkowski", "marianucci", "belahyane"],
  "wildboys78": ["rodriguez je.", "tiago gabriel", "ferguson e."],
  "Bayern Christiansen": ["adzic", "palestra", "rodriguez je."],
  "Minnesode Timberland": ["diao", "ferguson e.", "lipani"],
  "Athletic Pongao": ["valle", "tiago gabriel", "norton-cuffy"],
  "MinneSota Snakes": ["esposito f.p.", "comuzzo", "ndour"],
  "Ibla": ["camarda", "belahyane", "bartesaghi"],
  "Pandinicoccolosini": ["cham", "ahanor", "paz n."]
};

const giocatoriFPManualiPerSquadra = {
  "Rubinkebab": [],
  "wildboys78": [],
  "Desperados": [],
  "MinneSota Snakes": [],
  "PokerMantra": [],
  "Minnesode Timberland": [],
  "Bayern Christiansen": [],
  "Golden Knights": [],
  "Ibla": [],
  "Fc Disoneste": [],
  "Athletic Pongao": [],
  "Pandinicoccolosini": [],
};

const giocatoriFPSceltiPerSquadra = {
  "Rubinkebab": ["de ketelaere"]
};

const giocatoriU21SceltiPerSquadra = {
  "Pandinicoccolosini": ["yildiz"],
  "PokerMantra": ["yildiz"],
  "Fc Disoneste": ["soulè"],
  "Ibla": ["soulè"],
  "Bayern Christiansen": ["castro s."],
  "Minnesode Timberland": ["scalvini"]
  
};

const URL_ROSE =
  "https://docs.google.com/spreadsheets/d/1weMP9ajaScUSQhExCe7D7jtC7SjC9udw5ISg8f6Bezg/export?format=csv&gid=0";

const URL_QUOTAZIONI =
  "https://docs.google.com/spreadsheets/d/1weMP9ajaScUSQhExCe7D7jtC7SjC9udw5ISg8f6Bezg/export?format=csv&gid=2087990274";

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

function slug(s){
  return String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function variantiNomeSquadra(nomeSquadra) {
  const nome = String(nomeSquadra || "").trim();

  return [
    nome,
    nome.toLowerCase(),
    nome.replaceAll(" ", "_"),
    nome.replaceAll(" ", "_").toLowerCase(),
    nome.replaceAll(" ", "-"),
    nome.replaceAll(" ", "-").toLowerCase(),
    slug(nome)
  ];
}

function buildImageCandidates(dir, nomeSquadra) {
  const estensioni = [".png", ".jpg", ".jpeg", ".webp"];
  const varianti = variantiNomeSquadra(nomeSquadra);
  const paths = [];

  for (const base of varianti) {
    for (const ext of estensioni) {
      paths.push(`${dir}${base}${ext}`);
    }
  }

  return [...new Set(paths)];
}

function applyImageFallback(imgEl, candidates, fallback = "") {
  if (!imgEl || !candidates.length) {
    if (fallback) imgEl.src = fallback;
    return;
  }

  let idx = 0;
  imgEl.src = candidates[idx];

  imgEl.onerror = function () {
    idx++;
    if (idx < candidates.length) {
      this.src = candidates[idx];
    } else {
      if (fallback) {
        this.onerror = null;
        this.src = fallback;
      } else {
        this.style.display = "none";
      }
    }
  };
}

function trovaLogo(nomeSquadra) {
  return buildImageCandidates("img/", nomeSquadra);
}

function trovaMaglia(nomeSquadra) {
  return buildImageCandidates("img/maglie/", nomeSquadra);
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

    // 🔥 Aggiunta finale: FP manuali per squadra
    for (const [squadra, giocatori] of Object.entries(giocatoriFPManualiPerSquadra)) {
      giocatori.forEach(nome => {
        giocatoriFP.add(nome.toLowerCase());
      });
    }

  } catch (e) {
    console.error("Errore nel caricamento FP:", e);
  }
}

function isFP(nome, squadra) {
  const nomeClean = nome.toLowerCase();

  // Se è FP automatico, va bene ovunque
  if (giocatoriFP.has(nomeClean)) {
    // Se non è stato forzato in una squadra specifica, è valido ovunque
    const squadreManuali = Object.keys(giocatoriFPManualiPerSquadra);
    const èManuale = squadreManuali.some(s => giocatoriFPManualiPerSquadra[s].includes(nomeClean));
    if (!èManuale) return true;

    // Se è stato forzato manualmente, è FP solo nella squadra specifica
    return giocatoriFPManualiPerSquadra[squadra]?.includes(nomeClean) || false;
  }

  return false;
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
          fp: isFP(nome, nomeSquadra),
          u21: giocatoriU21PerSquadra[nomeSquadra]?.includes(nomeClean) || false
        });
      }
    }

    if (giocatori.length > 0) {
rose[nomeSquadra] = {
  logo: trovaLogo(nomeSquadra),
  maglia: trovaMaglia(nomeSquadra),
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

  const nomeCercato = document.getElementById("filtro-nome")?.value?.toLowerCase() || "";

  for (const [nome, data] of Object.entries(rose)) {
    const div = document.createElement("div");
    div.className = "box-rosa giocatore";
    div.setAttribute("data-squadra", nome);
    div.setAttribute("data-conference", conferencePerSquadra[nome] || "N/A");

const header = document.createElement("div");
header.className = "logo-nome";

const iconsWrap = document.createElement("div");
iconsWrap.className = "team-icons";

const imgLogo = document.createElement("img");
imgLogo.alt = nome;
imgLogo.className = "team-logo";
applyImageFallback(imgLogo, data.logo, "img/default.png");

const imgMaglia = document.createElement("img");
imgMaglia.alt = `Maglia ${nome}`;
imgMaglia.className = "team-shirt";
applyImageFallback(imgMaglia, data.maglia);

const name = document.createElement("span");
name.textContent = nome;

iconsWrap.appendChild(imgLogo);
iconsWrap.appendChild(imgMaglia);

header.appendChild(iconsWrap);
header.appendChild(name);
div.appendChild(header);

    const table = document.createElement("table");
    table.innerHTML = `
      <thead><tr><th>Ruolo</th><th>Nome</th><th>Squadra</th></tr></thead>
      <tbody>
        ${data.giocatori.map(g => {
          const nomeBasso = g.nome.toLowerCase();
          const evidenziato = nomeCercato && nomeBasso.includes(nomeCercato)
            ? g.nome.replace(new RegExp(`(${nomeCercato})`, 'i'), '<span class="evidenziato">$1</span>')
            : g.nome;

          return `
            <tr>
              <td>${g.ruolo}</td>
<td class="nome">
  ${g.fp ? `<strong>${evidenziato}</strong>` : evidenziato}
  ${g.u21 ? '<span class="badge-u21">U21</span>' : ''}
  ${giocatoriFPSceltiPerSquadra[nome]?.includes(g.nome.toLowerCase()) ? '<span class="badge-fp">⭐</span>' : ''}
  ${giocatoriU21SceltiPerSquadra[nome]?.includes(g.nome.toLowerCase()) ? '<span class="badge-u21-scelto">🐣</span>' : ''}
</td>
              <td>${g.squadra}</td>
            </tr>`;
        }).join("")}
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

  // Mostra di nuovo tutte le rose aggiornate con evidenziato
  mostraRose();

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
