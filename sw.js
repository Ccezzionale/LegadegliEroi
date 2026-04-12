self.addEventListener("install", (event) => {
  console.log("Service Worker installato");
});

self.addEventListener("fetch", (event) => {
  // per ora semplice, poi lo miglioriamo
});
