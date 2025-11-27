// supercoppa.js

// ====== Trova la vincente di una semifinale leggendo i punteggi ======
function getWinner(matchKey) {
  var selector = '.match-card[data-match="' + matchKey + '"]';
  var match = document.querySelector(selector);
  if (!match) {
    console.log('Match non trovato per', matchKey);
    return null;
  }

  var rows = match.querySelectorAll('.team-row');
  if (!rows || rows.length < 2) {
    console.log('Righe squadra insufficienti per', matchKey);
    return null;
  }

  var rowA = rows[0];
  var rowB = rows[1];

  var scoreAEl = rowA.querySelector('.score-box');
  var scoreBEl = rowB.querySelector('.score-box');

  // 1) testo scritto nel box
  var scoreAText = scoreAEl ? scoreAEl.textContent.trim() : '';
  var scoreBText = scoreBEl ? scoreBEl.textContent.trim() : '';

  // 2) se è vuoto, usa il data-placeholder
  if (!scoreAText && scoreAEl) {
    scoreAText = (scoreAEl.getAttribute('data-placeholder') || '').trim();
  }
  if (!scoreBText && scoreBEl) {
    scoreBText = (scoreBEl.getAttribute('data-placeholder') || '').trim();
  }

  var scoreA = parseInt(scoreAText, 10);
  var scoreB = parseInt(scoreBText, 10);

  console.log('Punteggi', matchKey, ':', scoreA, scoreB);

  if (isNaN(scoreA) || isNaN(scoreB)) return null;
  if (scoreA === scoreB) return 'tie';

  var winnerRow = scoreA > scoreB ? rowA : rowB;

  var nameEl = winnerRow.querySelector('.team-name');
  var seedEl = winnerRow.querySelector('.team-seed');
  var logoEl = winnerRow.querySelector('.team-logo');

  return {
    name: nameEl ? nameEl.textContent.trim() : '',
    seed: seedEl ? seedEl.textContent.trim() : '',
    logoSrc: logoEl ? logoEl.getAttribute('src') : '',
    logoAlt: logoEl ? (logoEl.getAttribute('alt') || '') : ''
  };
}

document.addEventListener("DOMContentLoaded", function () {
  console.log('supercoppa.js caricato');

  // ===== NAVBAR =====
  var hamburger = document.getElementById("hamburger");
  var mainMenu = document.getElementById("mainMenu");
  var submenuToggles = document.querySelectorAll(".toggle-submenu");

  if (hamburger && mainMenu) {
    hamburger.addEventListener("click", function () {
      mainMenu.classList.toggle("show");
    });
  }

  for (var i = 0; i < submenuToggles.length; i++) {
    submenuToggles[i].addEventListener("click", function (e) {
      e.preventDefault();
      var dropdown = this.closest(".dropdown");
      if (dropdown) dropdown.classList.toggle("show");
    });
  }

  // ===== Funzione che aggiorna la finale =====
  function updateFinal() {
    var w1 = getWinner('sf1');
    var w2 = getWinner('sf2');

    // se non ci sono ancora vincitori validi, non facciamo nulla
    if (!w1 || !w2 || w1 === 'tie' || w2 === 'tie') {
      return;
    }

    // Slot SF1 in finale
    var name1 = document.getElementById('final-name-sf1');
    var seed1 = document.getElementById('final-seed-sf1');
    var logo1 = document.getElementById('final-logo-sf1');

    if (name1) name1.textContent = w1.name;
    if (seed1) seed1.textContent = w1.seed || 'Finalista';
    if (logo1) {
      if (w1.logoSrc) logo1.src = w1.logoSrc;
      logo1.alt = w1.logoAlt || w1.name;
    }

    // Slot SF2 in finale
    var name2 = document.getElementById('final-name-sf2');
    var seed2 = document.getElementById('final-seed-sf2');
    var logo2 = document.getElementById('final-logo-sf2');

    if (name2) name2.textContent = w2.name;
    if (seed2) seed2.textContent = w2.seed || 'Finalista';
    if (logo2) {
      if (w2.logoSrc) logo2.src = w2.logoSrc;
      logo2.alt = w2.logoAlt || w2.name;
    }

    console.log('Finale aggiornata:', w1.name, 'vs', w2.name);
  }

  // ascolta i cambi nei punteggi delle semifinali
  var scoreBoxes = document.querySelectorAll(
    '.match-card[data-match="sf1"] .score-box, ' +
    '.match-card[data-match="sf2"] .score-box'
  );

  for (var j = 0; j < scoreBoxes.length; j++) {
    scoreBoxes[j].addEventListener('input', updateFinal);
    scoreBoxes[j].addEventListener('blur', updateFinal);
  }

  // primo update (nel caso tu abbia già messo data-placeholder con i risultati)
  updateFinal();
});

