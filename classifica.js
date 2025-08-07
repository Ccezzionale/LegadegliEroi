const URL_MAP = {
  "Conference": "https://docs.google.com/spreadsheets/d/e/2PACX-1vTduESMbJiPuCDLaAFdOHjep9GW-notjraILSyyjo6SA0xKSR0H0fgMLPNNYSwXgnGGJUyv14kjFRqv/pub?gid=0&single=true&output=csv",
  "Championship": "https://docs.google.com/spreadsheets/d/e/2PACX-1vTduESMbJiPuCDLaAFdOHjep9GW-notjraILSyyjo6SA0xKSR0H0fgMLPNNYSwXgnGGJUyv14kjFRqv/pub?gid=547378102&single=true&output=csv",
  "Totale": "https://docs.google.com/spreadsheets/d/e/2PACX-1vTduESMbJiPuCDLaAFdOHjep9GW-notjraILSyyjo6SA0xKSR0H0fgMLPNNYSwXgnGGJUyv14kjFRqv/pub?gid=691152130&single=true&output=csv"
};

function formattaNumero(val) {
  if (!isNaN(val) && val.toString().includes(".")) {
    const num = parseFloat(val).toFixed(2); // Limita a 2 decimali
    return num.replace(".", ",");
  }
  return val;
}

function caricaClassifica(nomeFoglio = "Conference") {
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
        span.innerHTML = `<strong>${colonne[0]}\u00B0 ${colonne[1]}</strong><br><span style='font-weight:normal'>PT. ${colonne.at(-2)} / MP. ${colonne.at(-1)}</span>`;
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
