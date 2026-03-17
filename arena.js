const squadre = [
  { nome: "Rubinkebab", logo: "img/Rubinkebab.png", eliminata: true, ultimaEliminata: false },
  { nome: "Bayern Christiansen", logo: "img/Bayern Christiansen.png", eliminata: true, ultimaEliminata: false },
  { nome: "Team Bartowski", logo: "img/Team Bartowski.png", eliminata: true, ultimaEliminata: false },
  { nome: "Golden Knights", logo: "img/Golden Knights.png", eliminata: false, ultimaEliminata: true },
  { nome: "Ibla", logo: "img/Ibla.png", eliminata: true, ultimaEliminata: false },
  { nome: "Fantaugusta", logo: "img/Fantaugusta.png", eliminata: true, ultimaEliminata: false },
  { nome: "Riverfilo", logo: "img/Riverfilo.png", eliminata: true, ultimaEliminata: false },
  { nome: "Desperados", logo: "img/Desperados.png", eliminata: true, ultimaEliminata: false },
  { nome: "Wildboys 78", logo: "img/wildboys78.png", eliminata: true, ultimaEliminata: false },
  { nome: "Pandinicoccolosini", logo: "img/Pandinicoccolosini.png", eliminata: true, ultimaEliminata: false },
  { nome: "Pokermantra", logo: "img/PokerMantra.png", eliminata: true, ultimaEliminata: false },
  { nome: "Minnesode Timberland", logo: "img/Minnesode Timberland.png", eliminata: true, ultimaEliminata: false },
  { nome: "Minnesota Snakes", logo: "img/MinneSota Snakes.png", eliminata: true, ultimaEliminata: false },
  { nome: "Eintracht Franco 126", logo: "img/Eintracht Franco 126.png", eliminata: true, ultimaEliminata: false },
  { nome: "FC Disoneste", logo: "img/FC Disoneste.png", eliminata: true, ultimaEliminata: false },
  { nome: "Athletic Pongao", logo: "img/Athletic Pongao.png", eliminata: true, ultimaEliminata: false }
];

const center = document.getElementById("arena-center");
const arena = document.querySelector(".arena");

const ultimaEliminata = squadre.find(s => s.ultimaEliminata);
const inGioco = squadre.filter(s => !s.eliminata);
const eliminate = squadre.filter(s => s.eliminata);

const turnoAttualeEl = document.getElementById("turno-attuale");
const viveAttualiEl = document.getElementById("vive-attuali");
const eliminateAttualiEl = document.getElementById("eliminate-attuali");

const totaleSquadre = squadre.length;
const sopravvissute = inGioco.length;
const eliminateCount = eliminate.length;
const turnoAttuale = eliminateCount > 0 ? eliminateCount : 1;

if (turnoAttualeEl) turnoAttualeEl.textContent = turnoAttuale;
if (viveAttualiEl) viveAttualiEl.textContent = sopravvissute;
if (eliminateAttualiEl) eliminateAttualiEl.textContent = eliminateCount;

function renderCenter() {
  if (inGioco.length === 1) {
    const vincitore = inGioco[0];
    center.innerHTML = `
      <div class="eliminata-wrapper">
        <div class="center-ring"></div>
        <img src="${vincitore.logo}" class="eliminata-logo" alt="${vincitore.nome}" />
        <div class="eliminata-testo vincitore-box">
          <span class="label-top">🏆 Ultimo sopravvissuto</span>
          <span class="main-name">${vincitore.nome}</span>
        </div>
        <div class="centro-caption">L’arena ha emesso il suo verdetto finale</div>
      </div>
    `;
    return;
  }

  if (ultimaEliminata) {
    center.innerHTML = `
      <div class="eliminata-wrapper">
        <div class="center-ring"></div>
        <img src="${ultimaEliminata.logo}" class="eliminata-logo" alt="${ultimaEliminata.nome}" />
        <div class="eliminata-testo">
          <span class="label-top">❌ Ultima eliminata</span>
          <span class="main-name">${ultimaEliminata.nome}</span>
        </div>
        <div class="centro-caption">Il cerchio si stringe. La sopravvivenza no.</div>
      </div>
    `;
    return;
  }

  center.innerHTML = `
    <div class="eliminata-wrapper">
      <div class="center-ring"></div>
      <div class="eliminata-testo">
        <span class="label-top">⚔️ Sfida in corso</span>
        <span class="main-name">Nessun verdetto ancora</span>
      </div>
    </div>
  `;
}

function renderArenaTeams() {
  const cx = 350;
  const cy = 350;
  const r = 255;

  squadre.forEach((s, i) => {
    const angle = (-Math.PI / 2) + (2 * Math.PI / squadre.length) * i;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);

    const div = document.createElement("div");
    div.className = "squadra";

    if (s.eliminata) {
      div.classList.add("eliminata");
    } else {
      div.classList.add("in-gioco");
    }

    if (s.ultimaEliminata) {
      div.classList.add("recente");
    }

    div.style.left = `${x}px`;
    div.style.top = `${y}px`;
    div.title = s.nome;

    const img = document.createElement("img");
    img.src = s.logo;
    img.alt = s.nome;

    div.appendChild(img);
    arena.appendChild(div);
  });
}

renderCenter();
renderArenaTeams();
