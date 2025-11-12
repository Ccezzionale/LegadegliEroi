const fetch = global.fetch || require("node-fetch");

module.exports = async (req, res) => {
  try {
    const url = process.env.SHEETS_URL_TOTALE;
    if (!url) return res.status(500).json({ error: "Missing env var SHEETS_URL_TOTALE" });

    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) return res.status(502).json({ error: `Upstream error ${r.status}` });

    const text = await r.text();
    const isCSV = url.includes("output=csv") || url.endsWith(".csv");
    let data;

    if (isCSV) {
      const rows = text.trim().split(/\r?\n/).map(line => line.split(","));
      const [header, ...lines] = rows;
      data = lines.map(r => Object.fromEntries(header.map((h, i) => [h, r[i] || ""])));
    } else {
      data = JSON.parse(text);
    }

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=86400");
    return res.status(200).json({ ok: true, count: Array.isArray(data) ? data.length : 1, data });
  } catch (e) {
    return res.status(500).json({ error: e.message || String(e) });
  }
};
