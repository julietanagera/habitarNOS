(function () {
  const script = document.currentScript;
  const base = (script && script.getAttribute('data-base')) || '';

  fetch(base + 'partials/footer.html')
    .then(response => response.text())
    .then(html => {
      const slot = document.getElementById('footer');
      if (slot) slot.innerHTML = html;
    });
})();