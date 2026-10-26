(function () {
  const script = document.currentScript;
  const base = (script && script.getAttribute('data-base')) || '';

  fetch(base + 'partials/navbar.html')
    .then(response => response.text())
    .then(html => {
      const slot = document.getElementById('navbar');
      if (!slot) return;
      slot.innerHTML = html;
      slot.querySelectorAll('a').forEach(a => {
        const href = a.getAttribute('href');
        if (href) a.href = base + href;
      });

      const toggle = slot.querySelector('.navbar-toggle');
      const menu = slot.querySelector('.menu');
      if (toggle && menu) {
        toggle.addEventListener('click', () => {
          const abierto = menu.classList.toggle('abierto');
          toggle.setAttribute('aria-expanded', String(abierto));
          toggle.innerHTML = abierto
            ? '<i class="fa-solid fa-xmark"></i>'
            : '<i class="fa-solid fa-bars"></i>';
        });
        menu.querySelectorAll('.menu-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            btn.parentElement.classList.toggle('abierto');
          });
        });
      }
    });
})();