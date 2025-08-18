// Solo estetica: tile colorato dietro al logo in modo stabile per nome
(() => {
  const pastel = name => {
    let h = 0; for (let i=0;i<name.length;i++) h = (h*31 + name.charCodeAt(i)) >>> 0;
    h = h % 360;
    return `hsl(${h} 70% 85%)`;
  };

  document.querySelectorAll('.team').forEach(t => {
    const n = t.dataset.name || '';
    const emblem = t.querySelector('.emblem');
    if (emblem) emblem.style.background = pastel(n);
  });

  // Navbar toggle per touch
  document.querySelectorAll('.toggle').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      a.closest('.dropdown').classList.toggle('open');
      const sub = a.nextElementSibling;
      if (sub) sub.style.display = sub.style.display === 'block' ? 'none' : 'block';
    });
  });
})();

