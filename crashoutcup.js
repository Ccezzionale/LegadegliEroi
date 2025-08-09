// Crash Out Cup – JS
// Tabella desktop + fisarmonica mobile
// - Carica CSV pubblicato da Google Sheets
// - Salta le prime 2 righe (titolo/sottotitolo)
// - Usa la 3ª riga come header (Pos, Squadra, G, V, N, P, Pt., Pt. Totali)
// - Desktop: tabella completa
// - Mobile: summary con Pos / Squadra / Pt. e dettagli con le altre colonne

// ====== CONFIG ======
const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS1pXJCNLgchygyLnGbDEsnIV3QAdPUiLcmgzMAhlzYRivXV4fnoSBW5VwiopwXEMfwk32mvdF3gWZC/pub?output=csv";
const LOGO_DIR = "img/"; // lascia "" per disabilitare
const COLONNA_NOME_SQUADRA = "Squadra"; // deve corrispondere all'intestazione nel CSV

// ====== ELEMENTI DOM ======
const elThead = document.querySelector('#tabCoppa thead');
const elTbody = document.querySelector('#tabCoppa tbody');
const elAcc = document.getElementById('accCoppa');

// ====== UTILS ======
async function fetchCSV(url) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error('Errore nel caricamento CSV');
  return await res.text();
}

// Parser CSV semplice con gestione virgolette
function parseCSV(text) {
  const rows = [];
  let cur = '', cell = [], inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') { cur += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === ',' && !inQuotes) {
      cell.push(cur); cur = '';
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (cur !== '' || cell.length) { cell.push(cur); rows.push(cell); cell = []; cur = ''; }
    } else {
      cur += ch;
    }
  }
  if (cur !== '' || cell.length) { cell.push(cur); rows.push(cell); }
  return rows.filter(r => r.some(x => String(x).trim() !== ''));
}

function buildTable(headers, rows) {
  // HEAD
  elThead.innerHTML = '';
  const trh = document.createElement('tr');
  headers.forEach(h => {
    const th = document.createElement('th');
    th.textContent = h || '';
    trh.appendChild(th);
  });
  elThead.appendChild(trh);

  // BODY
  elTbody.innerHTML = '';
  const teamIdx = headers.indexOf(COLONNA_NOME_SQUADRA);
  rows.forEach(r => {
    const tr = document.createElement('tr');
    r.forEach((val, i) => {
      const td = document.createElement('td');
      if (i === teamIdx && LOGO_DIR) {
        const wrap = document.createElement('div');
        wrap.className = 'team';
        const img = document.createElement('img');
        img.className = 'logo';
        img.alt = val;
        img.loading = 'lazy';
        img.src = `${LOGO_DIR}${val}.png`;
        wrap.appendChild(img);
        const span = document.createElement('span');
        span.textContent = val;
        wrap.appendChild(span);
        td.appendChild(wrap);
      } else {
        td.textContent = val;
      }
      tr.appendChild(td);
    });
    elTbody.appendChild(tr);
  });
}

function buildAccordion(headers, rows) {
  if (!elAcc) return;
  elAcc.innerHTML = '';
  const teamIdx = headers.indexOf(COLONNA_NOME_SQUADRA);
  const posIdx = headers.findIndex(h => h.trim().toLowerCase() === 'pos');
  // Preferisci "Pt." (o "Pt") per il summary
  let ptIdx = headers.findIndex(h => h.trim().toLowerCase() === 'pt.' || h.trim().toLowerCase() === 'pt');
  if (ptIdx < 0) {
    ptIdx = headers.findIndex(h => /pt/i.test(h) && !/totali/i.test(h));
  }

  rows.forEach((r, idx) => {
    const teamName = teamIdx >= 0 ? r[teamIdx] : `Squadra ${idx + 1}`;
    const posValue = posIdx >= 0 ? r[posIdx] : String(idx + 1);
    const puntiValue = ptIdx >= 0 ? r[ptIdx] : '';

    const details = document.createElement('details');
    const summary = document.createElement('summary');

    const left = document.createElement('div');
    left.className = 'summary-left';

    const pos = document.createElement('span');
    pos.className = 'badge';
    pos.textContent = `#${posValue}`;
    left.appendChild(pos);

    if (LOGO_DIR) {
      const img = document.createElement('img');
      img.className = 'logo';
      img.alt = teamName;
      img.src = `${LOGO_DIR}${teamName}.png`;
      left.appendChild(img);
    }

    const title = document.createElement('div');
    title.className = 'summary-title';

    const name = document.createElement('div');
    name.className = 'team-name';
    name.textContent = teamName;
    title.appendChild(name);

    const sub = document.createElement('div');
    sub.className = 'sub';
    sub.textContent = (puntiValue !== '' ? `Pt.: ${puntiValue}` : '');
    title.appendChild(sub);

    left.appendChild(title);
    summary.appendChild(left);

    const caret = document.createElement('span');
    caret.textContent = '▾';
    summary.appendChild(caret);

    details.appendChild(summary);

    // Body con tutte le chiavi/valori tranne Pos e Squadra
    const body = document.createElement('div');
    body.className = 'accordion-body';
    const kv = document.createElement('div');
    kv.className = 'kv';

    headers.forEach((h, i) => {
      if (!h) return;
      if (i === teamIdx || i === posIdx) return; // evita duplicati
      const k = document.createElement('div');
      k.textContent = h;
      const v = document.createElement('div');
      v.textContent = r[i];
      kv.appendChild(k);
      kv.appendChild(v);
    });

    body.appendChild(kv);
    details.appendChild(body);

    elAcc.appendChild(details);
  });
}

async function loadAndRender() {
  try {
    const text = await fetchCSV(CSV_URL);
    const parsed = parseCSV(text);
    if (!parsed.length) throw new Error('CSV vuoto');

    // Salta le prime 2 righe, usa la terza come intestazione
    const data = parsed.slice();
    if (data.length > 2) data.splice(0, 2);

    const headers = data[0].map(h => String(h).trim());
    const rows = data.slice(1);

    buildTable(headers, rows);
    buildAccordion(headers, rows);
  } catch (e) {
    console.error(e);
    alert('Impossibile caricare la classifica della Crash Out Cup. Controlla l\'URL CSV.');
  }
}

// Avvio
window.addEventListener('DOMContentLoaded', loadAndRender);

document.addEventListener("DOMContentLoaded", function () {
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
});

