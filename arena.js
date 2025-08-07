
const squadre = [
  { nome: "Rubinkebab", logo: "img/Rubinkebab.png", eliminata: false, ultimaEliminata: false },
  { nome: "Bayern Christiansen", logo: "img/Bayern Christiansen.png", eliminata: false, ultimaEliminata: false },
  { nome: "Team Bartowski", logo: "img/Team Bartowski.png", eliminata: false, ultimaEliminata: false },
  { nome: "Golden Knights", logo: "img/Golden Knights.png", eliminata: false, ultimaEliminata: false },
  { nome: "Ibla", logo: "img/Ibla.png", eliminata: false, ultimaEliminata: false },
  { nome: "Lokomotiv Lipsia", logo: "img/Lokomotiv Lipsia.png", eliminata: false, ultimaEliminata: false },
  { nome: "Riverfilo", logo: "img/Riverfilo.png", eliminata: false, ultimaEliminata: false },
  { nome: "Desperados", logo: "img/Desperados.png", eliminata: false, ultimaEliminata: false },
  { nome: "Wildboys 78", logo: "img/wildboys78.png", eliminata: false, ultimaEliminata: false },
  { nome: "Pandinicoccolosini", logo: "img/Pandinicoccolosini.png", eliminata: false, ultimaEliminata: false },
  { nome: "Pokermantra", logo: "img/PokerMantra.png", eliminata: false, ultimaEliminata: false },
  { nome: "Minnesode Timberland", logo: "img/Minnesode Timberland.png", eliminata: false, ultimaEliminata: false },
  { nome: "Minnesota Snakes", logo: "img/MinneSota Snakes.png", eliminata: false, ultimaEliminata: false },
  { nome: "Eintracht Franco 126", logo: "img/Eintracht Franco 126.png", eliminata: false, ultimaEliminata: false },
  { nome: "FC Disoneste", logo: "img/FC Disoneste.png", eliminata: false, ultimaEliminata: false },
 { nome: "Athletic Pongao", logo: "img/Athletic Pongao.png", eliminata: false, ultimaEliminata: false }
];

const center = document.getElementById("arena-center");

const ultimaEliminata = squadre.find(s => s.ultimaEliminata);
const inGioco = squadre.filter(s => !s.eliminata);

if (inGioco.length === 1) {
  const vincitore = inGioco[0];
  center.innerHTML = `
    <div class="eliminata-wrapper">
      <img src="${vincitore.logo}" class="eliminata-logo" />
      <div class="eliminata-testo" style="color: gold; text-shadow: 1px 1px 5px #000;">🏆 Vincitore<br>${vincitore.nome}</div>
    </div>
  `;
} else if (ultimaEliminata) {
  center.innerHTML = `
    <div class="eliminata-wrapper">
      <img src="${ultimaEliminata.logo}" class="eliminata-logo" />
      <div class="eliminata-testo">❌ Eliminata<br>${ultimaEliminata.nome}</div>
    </div>
  `;
} else {
  center.innerHTML = "Sfida in corso";
}

const arena = document.querySelector(".arena");
const r = 260, cx = 300, cy = 300;

squadre.forEach((s, i) => {
  const angle = (2 * Math.PI / squadre.length) * i;
  const x = cx + r * Math.cos(angle);
  const y = cy + r * Math.sin(angle);
  const div = document.createElement("div");
  div.className = "squadra" + (s.eliminata ? " eliminata" : "");
  div.style.left = `${x}px`;
  div.style.top = `${y}px`;
  const img = document.createElement("img");
  img.src = s.logo;
  img.alt = s.nome;
  div.appendChild(img);
  arena.appendChild(div);
});
