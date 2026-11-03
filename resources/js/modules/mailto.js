export function initMailto() {
  document.querySelectorAll('a.mailto').forEach((a) => {
    const p1 = a.getAttribute('data-mailto-1');
    const p2 = a.getAttribute('data-mailto-2');
    if (!p1 || !p2) return;
    const address = `${p1}@${p2}`;
    a.setAttribute('href', `mailto:${address}`);
    if (!a.classList.contains('texty')) {
      a.innerHTML = `${p1}<span class="at">@</span>${p2}`;
    }
  });
}
