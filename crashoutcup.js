// Crash Out Cup – JS
// Desktop table + mobile premium accordion

// ====== CONFIG ======
const CSV_URL = "https://docs.google.com/spreadsheets/d/1xPual_RkDPsnAW1Gy_ZCcVlAUATtquTbbym3NPk8UfI/export?format=csv&gid=1127607135";
const LOGO_DIR = "img/";
const COLONNA_NOME_SQUADRA = "Squadra";

// ====== ELEMENTI DOM ======
const elThead = document.querySelector("#tabCoppa thead");
const elTbody = document.querySelector("#tabCoppa tbody");
const elAcc = document.getElementById("accCoppa");

// ====== UTILS ======
async function fetchCSV(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Errore nel caricamento CSV");
  return await res.text();
}

// Parser CSV semplice con gestione virgolette
function parseCSV(text) {
  const rows = [];
  let cur = "";
  let cell = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      cell.push(cur);
      cur = "";
    } else if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (cur !== "" || cell.length) {
        cell.push(cur);
        rows.push(cell);
        cell = [];
        cur = "";
      }
    } else {
      cur += ch;
    }
  }

  if (cur !== "" || cell.length) {
    cell.push(cur);
    rows.push(cell);
  }

  return rows.filter((r) => r.some((x) => String(x).trim() !== ""));
}

function safeTrim(value) {
  return String(value ?? "").trim();
}

function normalizeHeader(value) {
  return safeTrim(value).toLowerCase();
}

function findHeaderIndex(headers, possibleNames) {
  return headers.findIndex((h) => possibleNames.includes(normalizeHeader(h)));
}

function getBadgeClass(pos) {
  const n = Number(pos);
  if (n === 1) return "badge gold";
  if (n === 2) return "badge silver";
  if (n === 3) return "badge bronze";
  return "badge normal";
}

function createLogo(teamName) {
  const img = document.createElement("img");
  img.className = "logo";
  img.alt = teamName;
  img.loading = "lazy";
  img.src = `${LOGO_DIR}${teamName}.png`;

  img.onerror = function () {
    this.style.display = "none";
  };

  return img;
}

// ====== DESKTOP ======
function buildTable(headers, rows) {
  if (!elThead || !elTbody) return;

  elThead.innerHTML = "";
  elTbody.innerHTML = "";

  const trh = document.createElement("tr");

  headers.forEach((h) => {
    const th = document.createElement("th");
    th.textContent = h || "";
    trh.appendChild(th);
  });

  elThead.appendChild(trh);

  const teamIdx = headers.indexOf(COLONNA_NOME_SQUADRA);

  rows.forEach((row) => {
    const tr = document.createElement("tr");

    row.forEach((val, i) => {
      const td = document.createElement("td");

      if (i === teamIdx && LOGO_DIR) {
        const wrap = document.createElement("div");
        wrap.className = "team";

        const img = createLogo(val);
        wrap.appendChild(img);

        const span = document.createElement("span");
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

// ====== MOBILE ======
function buildAccordion(headers, rows) {
  if (!elAcc) return;

  elAcc.innerHTML = "";

  const teamIdx = headers.indexOf(COLONNA_NOME_SQUADRA);
  const posIdx = findHeaderIndex(headers, ["pos"]);
  const gIdx = findHeaderIndex(headers, ["g"]);
  const vIdx = findHeaderIndex(headers, ["v"]);
  const nIdx = findHeaderIndex(headers, ["n"]);
  const pIdx = findHeaderIndex(headers, ["p"]);
  const ptIdx = headers.findIndex((h) => {
    const hh = normalizeHeader(h);
    return hh === "pt." || hh === "pt";
  });
  const ptTotIdx = headers.findIndex((h) => {
    const hh = normalizeHeader(h);
    return hh.includes("tot");
  });

  rows.forEach((row, idx) => {
    const teamName = teamIdx >= 0 ? safeTrim(row[teamIdx]) : `Squadra ${idx + 1}`;
    const posValue = posIdx >= 0 ? safeTrim(row[posIdx]) : String(idx + 1);
    const puntiValue = ptIdx >= 0 ? safeTrim(row[ptIdx]) : "";
    const gValue = gIdx >= 0 ? safeTrim(row[gIdx]) : "";
    const vValue = vIdx >= 0 ? safeTrim(row[vIdx]) : "";
    const nValue = nIdx >= 0 ? safeTrim(row[nIdx]) : "";
    const pValue = pIdx >= 0 ? safeTrim(row[pIdx]) : "";
    const ptTotValue = ptTotIdx >= 0 ? safeTrim(row[ptTotIdx]) : "";

    const details = document.createElement("details");

    const summary = document.createElement("summary");

    const shell = document.createElement("div");
    shell.className = "summary-shell";

    const left = document.createElement("div");
    left.className = "summary-left";

    const badge = document.createElement("span");
    badge.className = getBadgeClass(posValue);
    badge.textContent = `#${posValue}`;
    left.appendChild(badge);

    if (LOGO_DIR) {
      left.appendChild(createLogo(teamName));
    }

    const title = document.createElement("div");
    title.className = "summary-title";

    const name = document.createElement("div");
    name.className = "team-name";
    name.textContent = teamName;
    title.appendChild(name);

    const sub = document.createElement("div");
    sub.className = "sub";

    const recordParts = [];
    if (vValue) recordParts.push(`${vValue}V`);
    if (nValue) recordParts.push(`${nValue}N`);
    if (pValue) recordParts.push(`${pValue}P`);

    sub.textContent = recordParts.join(" • ");
    title.appendChild(sub);

    left.appendChild(title);

    const right = document.createElement("div");
    right.className = "summary-right";

    const pointsBox = document.createElement("div");
    pointsBox.className = "points-box";

    const pointsValue = document.createElement("span");
    pointsValue.className = "points-value";
    pointsValue.textContent = puntiValue;
    pointsBox.appendChild(pointsValue);

    const pointsLabel = document.createElement("span");
    pointsLabel.className = "points-label";
    pointsLabel.textContent = "Pt.";
    pointsBox.appendChild(pointsLabel);

    right.appendChild(pointsBox);

    const chevron = document.createElement("span");
    chevron.className = "chevron";
    chevron.textContent = "▾";
    right.appendChild(chevron);

    shell.appendChild(left);
    shell.appendChild(right);
    summary.appendChild(shell);
    details.appendChild(summary);

    const body = document.createElement("div");
    body.className = "accordion-body";

    const kv = document.createElement("div");
    kv.className = "kv";

    const detailItems = [
      { label: "G", value: gValue },
      { label: "V", value: vValue },
      { label: "N", value: nValue },
      { label: "P", value: pValue },
      { label: "Pt.", value: puntiValue },
      { label: "Pt. Totali", value: ptTotValue }
    ];

    detailItems.forEach((item) => {
      const card = document.createElement("div");
      card.className = "kv-item";

      const label = document.createElement("span");
      label.className = "kv-label";
      label.textContent = item.label;

      const value = document.createElement("span");
      value.className = "kv-value";
      value.textContent = item.value;

      card.appendChild(label);
      card.appendChild(value);
      kv.appendChild(card);
    });

    body.appendChild(kv);
    details.appendChild(body);

    elAcc.appendChild(details);
  });
}

// ====== LOAD ======
async function loadAndRender() {
  try {
    const text = await fetchCSV(CSV_URL);
    const parsed = parseCSV(text);

    if (!parsed.length) {
      throw new Error("CSV vuoto");
    }

    const headerIdx = parsed.findIndex((row) => {
      const cells = row.map((c) => safeTrim(c).toLowerCase());
      return cells.includes("pos") && cells.includes("squadra");
    });

    if (headerIdx === -1) {
      throw new Error("Intestazione non trovata. Servono 'Pos' e 'Squadra'.");
    }

    const headers = parsed[headerIdx].slice(0, 9).map((h) => safeTrim(h));

    const start = headerIdx + 1;
    const end = start + 16;
    const rows = parsed
      .slice(start, end)
      .map((r) => r.slice(0, 9));

    buildTable(headers, rows);
    buildAccordion(headers, rows);
  } catch (error) {
    console.error(error);
    alert("Impossibile caricare la classifica della Crash Out Cup. Controlla l'URL CSV.");
  }
}

// ====== AVVIO ======
window.addEventListener("DOMContentLoaded", loadAndRender);
