const URL_MAP = {
  "Conference": "https://docs.google.com/spreadsheets/d/1kPDuSW9IKwJArUS4oOv0iIVRHU7F4zPASPXT8Qf86Fo/export?format=csv&gid=0",
  "Championship": "https://docs.google.com/spreadsheets/d/1kPDuSW9IKwJArUS4oOv0iIVRHU7F4zPASPXT8Qf86Fo/export?format=csv&gid=547378102",
  "Totale": "https://docs.google.com/spreadsheets/d/1kPDuSW9IKwJArUS4oOv0iIVRHU7F4zPASPXT8Qf86Fo/export?format=csv&gid=691152130"
};

function formattaNumero(val) {
  if (!isNaN(val) && val.toString().includes(".")) {
    const num = parseFloat(val).toFixed(2); // Limita a 2 decimali
    return num.replace(".", ",");
  }
  return val;
}
function normTeamName(val){
  return String(val || "").replace(/[👑🎖️💀]/g, "").trim();
}

function teamKey(val){
  return normTeamName(val)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function parseCSVbasic(csv){
  // NB: è il tuo stesso approccio (split su virgola). Va bene se il CSV non ha virgole dentro celle.
  return csv.trim().split(/\r?\n/).map(r => r.split(",").map(c => c.replace(/"/g, "").trim()));
}

function toNumberSmart(x){
  // accetta "12.5" o "12,5"
  const s = String(x ?? "").replace(",", ".");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

async function teamPointsFromSheet(sheetName){
  // sheetName: "Conference" o "Championship"
  const url = URL_MAP[sheetName];
  const text = await fetch(url).then(r => r.text());
  const rows = parseCSVbasic(text);

  const startRow = 4; // come il tuo
  const header = rows[startRow - 1];
  // rimuovi la colonna vuota (C) come fai tu
  const headerFixed = [...header];
  headerFixed.splice(2, 1);

  // prova a trovare la colonna punti: prima "PT", altrimenti "Punti", altrimenti penultima (come il tuo accordion)
  let idxPT = headerFixed.findIndex(h => h.toUpperCase() === "PT");
  if (idxPT === -1) idxPT = headerFixed.findIndex(h => h.toLowerCase().includes("punt"));
  
  const map = new Map();

  for (let i = startRow; i < rows.length; i++){
    let cols = rows[i];

    // merge del ".5" (copiato dal tuo)
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

    const pt = (idxPT !== -1) ? toNumberSmart(fixed[idxPT]) : toNumberSmart(fixed.at(-2));
    map.set(team, pt);
  }
  return map;
}

  async function caricaClassifica(nomeFoglio = "Conference") {

  // ✅ ROUND ROBIN = Totale - (Conference o Championship)
  if (nomeFoglio === "Round Robin") {
    try {
      const [confMap, champMap] = await Promise.all([
        teamPointsFromSheet("Conference"),
        teamPointsFromSheet("Championship")
      ]);

      const csvTot = await fetch(URL_MAP["Totale"]).then(r => r.text());
      const rowsTot = parseCSVbasic(csvTot);

      const startRow = 1; // Totale
      const header = rowsTot[startRow - 1];

      // indici: pos = 0, squadra = 1 (come nel tuo codice)
      const idxTeam = 1;

      // colonna PT in Totale: prova a beccarla, altrimenti penultima
      let idxPT = header.findIndex(h => String(h).replace(/"/g,"").trim().toUpperCase() === "PT");
      if (idxPT === -1) idxPT = header.findIndex(h => String(h).toLowerCase().includes("punt"));
      if (idxPT === -1) idxPT = header.length - 2;

      // DOM reset
      const tbody = document.querySelector("#tabella-classifica tbody");
      const thead = document.querySelector("#tabella-classifica thead");
      const mobile = document.getElementById("classifica-mobile");
      tbody.innerHTML = "";
      thead.innerHTML = "";
      mobile.innerHTML = "";

      // header "Round Robin"
      const intestazione = ["Pos", "Squadra", "RR PT"];
      const headerRow = document.createElement("tr");
      intestazione.forEach(col => {
        const th = document.createElement("th");
        th.textContent = col;
        headerRow.appendChild(th);
      });
      thead.appendChild(headerRow);

      // build RR array
      const rr = [];
      for (let i = startRow; i < rowsTot.length; i++) {
        const cols = rowsTot[i];
        const teamRaw = cols[idxTeam];
        const team = teamKey(teamRaw);
        if (!team) continue;

        const ptTot = toNumberSmart(cols[idxPT]);
        const ptConf = confMap.has(team) ? confMap.get(team) : (champMap.get(team) || 0);
        const rrPt = ptTot - ptConf;

        rr.push({ teamRaw, team, rrPt });
      }

      rr.sort((a,b) => b.rrPt - a.rrPt);

      // render
      rr.forEach((r, k) => {
        const pos = k + 1;

        // TAB
       const tr = document.createElement("tr");
tr.classList.add("riga-classifica");
if (pos === 1) tr.classList.add("top1");

        // Pos
        const tdPos = document.createElement("td");
        tdPos.textContent = pos;
        tr.appendChild(tdPos);

        // Squadra + logo
        const tdTeam = document.createElement("td");
        const div = document.createElement("div");
        div.className = "logo-nome";
        const img = document.createElement("img");
        const name = normTeamName(r.teamRaw);
        img.src = `img/${name}.png`;
        img.onerror = () => (img.style.display = "none");
        const span = document.createElement("span");
        span.textContent = r.teamRaw;
        div.appendChild(img);
        div.appendChild(span);
        tdTeam.appendChild(div);
        tr.appendChild(tdTeam);

        // RR PT
        const tdPt = document.createElement("td");
        tdPt.textContent = Math.round(r.rrPt);
        tr.appendChild(tdPt);

        tbody.appendChild(tr);

        // MOBILE accordion
       const item = document.createElement("div");
item.className = "accordion-item";
if (pos === 1) item.classList.add("top1");

        const header = document.createElement("div");
        header.className = "accordion-header";

        const img2 = document.createElement("img");
        img2.src = `img/${name}.png`;
        img2.onerror = () => (img2.style.display = "none");

        const span2 = document.createElement("span");
        span2.innerHTML = `<strong>${pos}\u00B0 ${r.teamRaw}</strong><br><span style='font-weight:normal'>RR PT. ${Math.round(r.rrPt)}</span>`;

        header.appendChild(img2);
        header.appendChild(span2);

        const body = document.createElement("div");
        body.className = "accordion-body";
        const p = document.createElement("span");
        p.innerHTML = `<strong>RR PT:</strong> ${formattaNumero(r.rrPt.toFixed(2))}`;
        body.appendChild(p);

        header.addEventListener("click", () => item.classList.toggle("active"));
        item.appendChild(header);
        item.appendChild(body);
        mobile.appendChild(item);
      });

      return; // ⛔ importantissimo: non andare avanti col fetch standard
    } catch (e) {
      console.error("Errore Round Robin:", e);
      return;
    }
  }

  const url = URL_MAP[nomeFoglio];
  if (!url) return;

  fetch(url)
    .then(response => response.text())
    .then(csv => {
      const righe = csv.trim().split("\n");
      const startRow = nomeFoglio === "Totale" ? 1 : 4;
      const intestazione = righe[startRow - 1].split(",").map(cell => cell.replace(/"/g, "").trim());
      if (nomeFoglio !== "Totale") intestazione.splice(2, 1);

      const tbody = document.querySelector("#tabella-classifica tbody");
      const thead = document.querySelector("#tabella-classifica thead");
      const mobile = document.getElementById("classifica-mobile");
      tbody.innerHTML = "";
      thead.innerHTML = "";
      mobile.innerHTML = "";

      const headerRow = document.createElement("tr");
      intestazione.forEach(col => {
        const th = document.createElement("th");
        th.textContent = col;
        headerRow.appendChild(th);
      });
      thead.appendChild(headerRow);

     for (let i = startRow; i < righe.length; i++) {
  const colonneGrezze = righe[i].split(",").map(c => c.replace(/"/g, "").trim());

  // 🔍 DEBUG: stampa la riga originale e le colonne
  if (colonneGrezze.includes("5")) {
  }

  // MERGE punto bonus se "5" è colonna extra
  if (colonneGrezze.length > intestazione.length) {
    const ultimo = colonneGrezze[colonneGrezze.length - 1];
    const penultimo = colonneGrezze[colonneGrezze.length - 2];

    if (/^\d+$/.test(penultimo) && ultimo === "5") {
      colonneGrezze.splice(-2, 2, `${penultimo}.5`);
    }
  }

  const colonne = [...colonneGrezze];

  if (nomeFoglio !== "Totale") colonne.splice(2, 1);

        const tr = document.createElement("tr");
        tr.classList.add("riga-classifica");
        if (nomeFoglio === "Totale" && i <= 4) tr.classList.add("top4");
        if (nomeFoglio === "Totale" && i >= righe.length - 4) tr.classList.add("ultime4");
        if ((nomeFoglio === "Conference" || nomeFoglio === "Championship") && i === startRow) tr.classList.add("top1");

        colonne.forEach((val, idx) => {
          const td = document.createElement("td");
          if (idx === 1) {
            const div = document.createElement("div");
            div.className = "logo-nome";
            const img = document.createElement("img");
            const name = val.replace(/[👑🎖️💀]/g, "").trim();
            img.src = `img/${name}.png`;
            img.onerror = () => (img.style.display = "none");
            const span = document.createElement("span");
            span.textContent = val;
            div.appendChild(img);
            div.appendChild(span);
            td.appendChild(div);
          } else {
            td.textContent = formattaNumero(val);
          }
          tr.appendChild(td);
        });
        tbody.appendChild(tr);

        const item = document.createElement("div");
        item.className = "accordion-item";
        if (tr.classList.contains("top4")) item.classList.add("top4");
        if (tr.classList.contains("ultime4")) item.classList.add("ultime4");
        if (tr.classList.contains("top1")) item.classList.add("top1");

        const header = document.createElement("div");
        header.className = "accordion-header";
        const img = document.createElement("img");
        const team = colonne[1].replace(/[👑🎖️💀]/g, "").trim();
        img.src = `img/${team}.png`;
        img.onerror = () => (img.style.display = "none");
        const span = document.createElement("span");
        const posClean = String(colonne[0]).replace(/[^\d]/g, "").trim();
        span.innerHTML = `<strong>${posClean}\u00B0 ${colonne[1]}</strong><br><span style='font-weight:normal'>PT. ${colonne.at(-2)} / MP. ${colonne.at(-1)}</span>`;
        header.appendChild(img);
        header.appendChild(span);

        const body = document.createElement("div");
        body.className = "accordion-body";
        for (let j = 2; j < colonne.length; j++) {
          const label = intestazione[j];
          const val = formattaNumero(colonne[j]);
          const p = document.createElement("span");
          p.innerHTML = `<strong>${label}:</strong> ${val}`;
          body.appendChild(p);
        }

        header.addEventListener("click", () => item.classList.toggle("active"));
        item.appendChild(header);
        item.appendChild(body);
        mobile.appendChild(item);
      }
    })
    .catch(e => console.error("Errore caricamento classifica:", e));
}

const NOMI_ESTESI = {
  "Conference": "Conference League",
  "Championship": "Conference Championship",
  "Round Robin": "Round Robin",
  "Totale": "Totale"
};

window.onload = () => caricaClassifica("Conference");

document.querySelectorAll(".switcher button").forEach(btn => {
  btn.addEventListener("click", () => {
    const nomeFoglio = btn.textContent;
    document.querySelector("h1").textContent = "Classifica " + NOMI_ESTESI[nomeFoglio];
    caricaClassifica(nomeFoglio);
  });
});
