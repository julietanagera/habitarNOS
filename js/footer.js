fetch('/habitarnos/partials/footer.html')
  .then(response => response.text())
  .then(html => {
    const slot = document.getElementById('footer');
    if (slot) slot.innerHTML = html;
  });