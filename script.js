// ─── FILTER TABS ───
const tabs = document.querySelectorAll('.tab');
const entries = document.querySelectorAll('.entry');
const grid = document.getElementById('worksGrid');

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => t.setAttribute('aria-pressed','false'));
    tab.setAttribute('aria-pressed','true');
    const filter = tab.dataset.filter;
    grid.classList.add('is-switching');
    setTimeout(() => {
      entries.forEach(entry => {
        entry.hidden = !(filter === 'all' || entry.dataset.category === filter);
      });
      grid.classList.remove('is-switching');
    }, 220);
  });
});

// ─── COPY ───
function copyText(text) {
  navigator.clipboard.writeText(text).then(() => showToast('Copied: ' + text));
}
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('is-on');
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove('is-on'), 2400);
}
document.querySelectorAll('[data-copy]').forEach(el => {
  el.addEventListener('click', () => copyText(el.dataset.copy));
});

// ─── SCROLL ANIMATIONS ───
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      setTimeout(() => entry.target.classList.add('is-in'), i * 80);
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
document.querySelectorAll('.entry, .citem').forEach(el => observer.observe(el));

// ─── HEADER on scroll ───
const header = document.querySelector('.site-header');
window.addEventListener('scroll', () => {
  header.style.boxShadow = window.scrollY > 10 ? '0 1px 32px rgba(0,0,0,.5)' : '';
}, { passive: true });

// ─── IMAGE FALLBACK ───
document.querySelectorAll('.pc-media img').forEach(img => {
  const show = () => {
    img.style.display = 'none';
    const ph = img.closest('.pc-media').querySelector('.pc-placeholder');
    if (ph) ph.style.display = 'flex';
  };
  img.addEventListener('error', show);
  if (!img.getAttribute('src') || img.getAttribute('src') === '') show();
});
