// supercoppa.js

// Funzione che trova la vincente di una semifinale leggendo i punteggi
function getWinner(matchKey) {
  const match = document.querySelector(`.match-card[data-match="${matchKey}"]`);
  if (!match) return null;

  const rows = match.querySelectorAll('.team-row');
  if (rows.length < 2) return null;

  const [rowA, rowB] = rows;

  const scoreAEl = rowA.querySelector('.score-box');
  const scoreBEl = rowB.querySelector('.score-box');

  const scoreA = parseInt((scoreAEl?.textContent || '').trim(), 10);
  const scoreB = parseInt((scoreBEl?.textContent || '').trim(), 10);

  // se non sono numeri → niente vincente
  if (Number.isNaN(scoreA) || Number.isNaN(scoreB)) return null;
  // pareggio → non so chi passa
  if (scoreA === scoreB) return 'tie';

  const winnerRow = scoreA > scoreB ? rowA : rowB;

  return {
    name: winnerRow.querySelector('.team-name')?.textContent.trim() || '',
    seed: winnerRow.querySelector('.team-seed')?.textContent.trim() || '',
    logoSrc: winnerRow.querySelector('.team-logo')?.getAttribute('src') || '',
    logoAlt: winnerRow.querySelector('.team-logo')?.getAttribute('alt') || ''
  };
}

document.addEventListener("DOMContentLoaded", function () {
  // ===== NAVBAR =====
  const hamburger = document.getElementById("hamburger");
  const mainMenu = document.getElementById("mainMenu");
  const submenuToggles = document.querySelectorAll(".toggle-submenu");

  hamburger?.addEventListener("click", () => {
    mainMenu.classList.toggle("show");
  });

  submenuToggles.forEach(toggle => {
    toggle.addEventListener("click", function (e) {
      e.preventDefault();
      this.closest(".dropdown")?.classList.toggle("show");
    });
  });

  // ===== LOGICA SUPERCOPPA: aggiorna la finale =====
  const btnUpdate = document.getElementById('btnUpdateFinal');
  if (!btnUpdate) return;

  btnUpdate.addEventListener('click', () => {
    const w1 = getWinner('sf1'); // semifinale 1
    const w2 = getWinner('sf2'); // semifinale 2

    if (!w1 || !w2 || w1 === 'tie' || w2 === 'tie') {
      alert('Controlla i punteggi delle due semifinali (devono essere numeri e non in pareggio).');
      return;
    }

    // Slot SF1 in finale
    const name1 = document.getElementById('final-name-sf1');
    const seed1 = document.getElementById('final-seed-sf1');
    const logo1 = document.getElementById('final-logo-sf1');

    if (name1) name1.textContent = w1.name;
    if (seed1) seed1.textContent = w1.seed || 'Finalista';
    if (logo1) {
      if (w1.logoSrc) logo1.src = w1.logoSrc;
      logo1.alt = w1.logoAlt || w1.name;
    }

    // Slot SF2 in finale
    const name2 = document.getElementById('final-name-sf2');
    const seed2 = document.getElementById('final-seed-sf2');
    const logo2 = document.getElementById('final-logo-sf2');

    if (name2) name2.textContent = w2.name;
    if (seed2) seed2.textContent = w2.seed || 'Finalista';
    if (logo2) {
      if (w2.logoSrc) logo2.src = w2.logoSrc;
      logo2.alt = w2.logoAlt || w2.name;
    }
  });
});
