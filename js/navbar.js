fetch('/habitarnos/partials/navbar.html')
  .then(response => response.text())
  .then(html => {
    const slot = document.getElementById('navbar');
    if (slot) slot.innerHTML = html;
  });