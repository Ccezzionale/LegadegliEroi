const URL_MAP = {
  "Conference": "https://docs.google.com/spreadsheets/d/1kPDuSW9IKwJArUS4oOv0iIVRHU7F4zPASPXT8Qf86Fo/export?format=csv&gid=0",
  "Championship": "https://docs.google.com/spreadsheets/d/1kPDuSW9IKwJArUS4oOv0iIVRHU7F4zPASPXT8Qf86Fo/export?format=csv&gid=547378102",
  "Totale": "https://docs.google.com/spreadsheets/d/1kPDuSW9IKwJArUS4oOv0iIVRHU7F4zPASPXT8Qf86Fo/export?format=csv&gid=691152130"
};

const NOMI_ESTESI = {
  "Conference": "Conference League",
  "Championship": "Conference Championship",
  "Round Robin": "Round Robin",
  "Totale": "Totale"
};

function formattaNumero(val) {
  if (!isNaN(val) && val.toString().includes(".")) {
    const num = parseFloat(val).toFixed(2);
    return num.replace(".", ",");
  }
  return val;
}

function normTeamName(val) {
  return String(val || "").replace(/[👑🎖️💀]/g, "").trim();
}

function teamKey(val) {
  return normTeamName(val).toLowerCase().replace(/\s+/g, " ").trim();
}

function parseCSVbasic(csv) {
  if (typeof csv !== "string") {
    console.warn("parseCSVbasic: csv non è una stringa:", csv);
    return [];
  }

  const clean = csv.trim();
  if (!clean) return [];

  return clean
    .split(/\r?\n/)
    .map(r => r.split(",").map(c => (c ?? "").replace(/"/g, "").trim()));
}

function toNumberSmart(x) {
  const s = String(x ?? "").replace(",", ".");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

async function fetchTextWithRetry(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const bust = (url.includes("?") ? "&" : "?") + "nocache=" + Date.now();
      const finalUrl = url + bust;

      const res = await fetch(finalUrl, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      return await res.text();
    } catch (e) {
      if (i === tries - 1) throw e;
      await new Promise(r => setTimeout(r, 400 * (i + 1)));
    }
  }
}

async function teamPointsFromSheet(sheetName) {
  const url = URL_MAP[sheetName];
  const text = await fetchTextWithRetry(url, 3);
  const rows = parseCSVbasic(text);

  const startRow = 4;
  const header = rows[startRow - 1];
  const headerFixed = [...header];

  headerFixed.splice(2, 1);

  let idxPT = headerFixed.findIndex(h => h.toUpperCase() === "PT");
  if (idxPT === -1) {
    idxPT = headerFixed.findIndex(h => h.toLowerCase().includes("punt"));
  }

  const map = new Map();

  for (let i = startRow; i < rows.length; i++) {
    let cols = rows[i];
    if (!cols || !cols.length) continue;

    if (cols.length > header.length) {
      const ultimo = cols[cols.length - 1];
      const penultimo = cols[cols.length - 2];

      if (/^\d+$/.test(penultimo) && ultimo === "5") {
        cols.splice(-2, 2, `${penultimo}.5`);
      }
    }

    const fixed = [...cols];
    fixed.splice(2, 1);

    const team = teamKey(fixed[1]);
    if (!team) continue;

    const pt = (idxPT !== -1)
      ? toNumberSmart(fixed[idxPT])
      : toNumberSmart(fixed.at(-2));

    map.set(team, pt);
  }

  return map;
}

function resetClassificaDOM() {
  const tbody = document.querySelector("#tabella-classifica tbody");
  const thead = document.querySelector("#tabella-classifica thead");
  const mobile = document.getElementById("classifica-mobile");

  if (tbody) tbody.innerHTML = "";
  if (thead) thead.innerHTML = "";
  if (mobile) mobile.innerHTML = "";
}

function renderDesktopHeader(intestazione) {
  const thead = document.querySelector("#tabella-classifica thead");
  if (!thead) return;

  thead.innerHTML = "";

  const headerRow = document.createElement("tr");

  intestazione.forEach(col => {
    const th = document.createElement("th");
    th.textContent = col;
    headerRow.appendChild(th);
  });

  thead.appendChild(headerRow);
}

function creaLogoNomeCell(val) {
  const td = document.createElement("td");
  const div = document.createElement("div");
  div.className = "logo-nome";

  const img = document.createElement("img");
  const name = normTeamName(val);
  img.src = `img/${name}.png`;
  img.onerror = () => {
    img.style.display = "none";
  };

  const span = document.createElement("span");
  span.textContent = val;

  div.appendChild(img);
  div.appendChild(span);
  td.appendChild(div);

  return td;
}

function creaAccordionItem(colonne, intestazione, extraClasses = []) {
  const mobile = document.getElementById("classifica-mobile");
  if (!mobile) return;

  const item = document.createElement("div");
  item.className = "accordion-item";

  extraClasses.forEach(cls => item.classList.add(cls));

  const header = document.createElement("div");
  header.className = "accordion-header";

  const img = document.createElement("img");
  const team = normTeamName(colonne[1]);
  img.src = `img/${team}.png`;
  img.onerror = () => {
    img.style.display = "none";
  };

  const span = document.createElement("span");
  const posClean = String(colonne[0]).replace(/[^\d]/g, "").trim();

  span.innerHTML = `
    <strong>${posClean}° ${colonne[1]}</strong><br>
    <span style="font-weight:normal">PT. ${colonne.at(-2)} / MP. ${colonne.at(-1)}</span>
  `;

  header.appendChild(img);
  header.appendChild(span);

  const body = document.createElement("div");
  body.className = "accordion-body";

  for (let j = 2; j < colonne.length; j++) {
    const label = intestazione[j];
    const v = formattaNumero(colonne[j]);
    const p = document.createElement("span");
    p.innerHTML = `<strong>${label}:</strong> ${v}`;
    body.appendChild(p);
  }

  header.addEventListener("click", () => {
    item.classList.toggle("active");
  });

  item.appendChild(header);
  item.appendChild(body);
  mobile.appendChild(item);
}

async function caricaRoundRobin() {
  try {
    const [confMap, champMap] = await Promise.all([
      teamPointsFromSheet("Conference"),
      teamPointsFromSheet("Championship")
    ]);

    const csvTot = await fetchTextWithRetry(URL_MAP["Totale"], 3);
    const rowsTot = parseCSVbasic(csvTot);

    const startRow = 1;
    const header = rowsTot[startRow - 1];
    const idxTeam = 1;

    let idxPT = header.findIndex(
      h => String(h).replace(/"/g, "").trim().toUpperCase() === "PT"
    );

    if (idxPT === -1) {
      idxPT = header.findIndex(h =>
        String(h).toLowerCase().includes("punt")
      );
    }

    if (idxPT === -1) {
      idxPT = header.length - 2;
    }

    resetClassificaDOM();

    const intestazione = ["Pos", "Squadra", "RR PT"];
    renderDesktopHeader(intestazione);

    const tbody = document.querySelector("#tabella-classifica tbody");
    const mobile = document.getElementById("classifica-mobile");

    const rr = [];

    for (let i = startRow; i < rowsTot.length; i++) {
      const cols = rowsTot[i];
      if (!cols || !cols.length) continue;

      const teamRaw = cols[idxTeam];
      const team = teamKey(teamRaw);
      if (!team) continue;

      const ptTot = toNumberSmart(cols[idxPT]);
      const ptConf = confMap.has(team) ? confMap.get(team) : (champMap.get(team) || 0);
      const rrPt = ptTot - ptConf;

      rr.push({ teamRaw, team, rrPt });
    }

    rr.sort((a, b) => b.rrPt - a.rrPt);

    rr.forEach((r, k) => {
      const pos = k + 1;

      const tr = document.createElement("tr");
      tr.classList.add("riga-classifica");

      const extraClasses = [];
      if (pos === 1) {
        tr.classList.add("top1");
        extraClasses.push("top1");
      }

      const tdPos = document.createElement("td");
      tdPos.textContent = `${pos}°`;
      tr.appendChild(tdPos);

      tr.appendChild(creaLogoNomeCell(r.teamRaw));

      const tdPt = document.createElement("td");
      tdPt.textContent = Math.round(r.rrPt);
      tr.appendChild(tdPt);

      if (tbody) tbody.appendChild(tr);

      if (mobile) {
        const item = document.createElement("div");
        item.className = "accordion-item";
        extraClasses.forEach(cls => item.classList.add(cls));

        const header = document.createElement("div");
        header.className = "accordion-header";

        const img = document.createElement("img");
        const name = normTeamName(r.teamRaw);
        img.src = `img/${name}.png`;
        img.onerror = () => {
          img.style.display = "none";
        };

        const span = document.createElement("span");
        span.innerHTML = `
          <strong>${pos}° ${r.teamRaw}</strong><br>
          <span style="font-weight:normal">RR PT. ${Math.round(r.rrPt)}</span>
        `;

        header.appendChild(img);
        header.appendChild(span);

        const body = document.createElement("div");
        body.className = "accordion-body";

        const p = document.createElement("span");
        p.innerHTML = `<strong>RR PT:</strong> ${formattaNumero(r.rrPt.toFixed(2))}`;
        body.appendChild(p);

        header.addEventListener("click", () => {
          item.classList.toggle("active");
        });

        item.appendChild(header);
        item.appendChild(body);
        mobile.appendChild(item);
      }
    });
  } catch (e) {
    console.error("Errore Round Robin:", e);
  }
}

async function caricaClassifica(nomeFoglio = "Conference") {
  if (nomeFoglio === "Round Robin") {
    await caricaRoundRobin();
    return;
  }

  const url = URL_MAP[nomeFoglio];
  if (!url) return;

  try {
    const csv = await fetchTextWithRetry(url, 3);
    const righe = csv.trim().split("\n");

    const startRow = nomeFoglio === "Totale" ? 1 : 4;
    const intestazione = righe[startRow - 1]
      .split(",")
      .map(cell => cell.replace(/"/g, "").trim());

    if (nomeFoglio !== "Totale") {
      intestazione.splice(2, 1);
    }

    resetClassificaDOM();
    renderDesktopHeader(intestazione);

    const tbody = document.querySelector("#tabella-classifica tbody");

    for (let i = startRow; i < righe.length; i++) {
      const rawRow = righe[i]?.trim();
      if (!rawRow) continue;

      const colonneGrezze = rawRow
        .split(",")
        .map(c => c.replace(/"/g, "").trim());

      if (colonneGrezze.length > intestazione.length) {
        const ultimo = colonneGrezze[colonneGrezze.length - 1];
        const penultimo = colonneGrezze[colonneGrezze.length - 2];

        if (/^\d+$/.test(penultimo) && ultimo === "5") {
          colonneGrezze.splice(-2, 2, `${penultimo}.5`);
        }
      }

      const colonne = [...colonneGrezze];
      if (nomeFoglio !== "Totale") {
        colonne.splice(2, 1);
      }

      const tr = document.createElement("tr");
      tr.classList.add("riga-classifica");

      const extraClasses = [];

      if (nomeFoglio === "Totale" && i <= 4) {
        tr.classList.add("top4");
        extraClasses.push("top4");
      }

      if (nomeFoglio === "Totale" && i >= righe.length - 4) {
        tr.classList.add("ultime4");
        extraClasses.push("ultime4");
      }

      if ((nomeFoglio === "Conference" || nomeFoglio === "Championship") && i === startRow) {
        tr.classList.add("top1");
        extraClasses.push("top1");
      }

      colonne.forEach((val, idx) => {
        if (idx === 1) {
          tr.appendChild(creaLogoNomeCell(val));
        } else {
          const td = document.createElement("td");
          td.textContent = formattaNumero(val);
          tr.appendChild(td);
        }
      });

      if (tbody) tbody.appendChild(tr);

      creaAccordionItem(colonne, intestazione, extraClasses);
    }
  } catch (e) {
    console.error("Errore caricamento classifica:", e);
  }
}

function aggiornaTitolo(nomeFoglio) {
  const h1 = document.querySelector("h1");
  if (!h1) return;

  h1.textContent = "Classifica " + (NOMI_ESTESI[nomeFoglio] || nomeFoglio);
}

function gestisciSwitcher() {
  const buttons = document.querySelectorAll(".switcher button");

  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      buttons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      const nomeFoglio = btn.textContent.trim();
      aggiornaTitolo(nomeFoglio);
      caricaClassifica(nomeFoglio);
    });
  });
}

window.onload = () => {
  aggiornaTitolo("Conference");
  caricaClassifica("Conference");
  gestisciSwitcher();
};
