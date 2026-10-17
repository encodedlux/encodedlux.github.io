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

// ─── LIVE STATS MONITOR ───
function formatCount(num) {
  if (num >= 10000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000000) {
    const formatted = (num / 1000000).toFixed(2);
    return formatted.endsWith('0') ? (num / 1000000).toFixed(1) + 'M' : formatted + 'M';
  }
  if (num >= 1000) {
    const formatted = (num / 1000).toFixed(1);
    return formatted.endsWith('.0') ? (num / 1000).toFixed(0) + 'K' : formatted + 'K';
  }
  return num.toString();
}

function animateValue(stat, start, end, duration = 800, isSuffix = true) {
  const valEl = stat.querySelector('.live-val');
  const prefixEl = stat.querySelector('.stat-prefix');
  if (!valEl) return;

  if (prefixEl) {
    prefixEl.textContent = end >= 1000 ? '+' : '';
  }

  let startTimestamp = null;
  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    const current = Math.floor(ease * (end - start) + start);
    valEl.textContent = isSuffix ? formatCount(current) : current.toLocaleString();
    if (progress < 1) {
      window.requestAnimationFrame(step);
    } else {
      valEl.textContent = isSuffix ? formatCount(end) : end.toLocaleString();
    }
  };
  window.requestAnimationFrame(step);
}

async function updateLiveStats() {
  const stats = document.querySelectorAll('.pc-stat[data-type]');
  
  // 1. Initial animated counter on page load
  stats.forEach(stat => {
    const targetVal = parseInt(stat.dataset.value, 10);
    if (isNaN(targetVal)) return;
    animateValue(stat, 0, targetVal, 950, stat.dataset.type === 'roblox');
  });

  // 2. Fetch live GitHub stars directly
  const ghStats = document.querySelectorAll('.pc-stat[data-type="github"]');
  ghStats.forEach(async (stat) => {
    const repo = stat.dataset.repo;
    if (!repo) return;
    try {
      const res = await fetch(`https://api.github.com/repos/${repo}`);
      if (res.ok) {
        const data = await res.json();
        const stars = data.stargazers_count;
        const valEl = stat.querySelector('.live-val');
        const prefixEl = stat.querySelector('.stat-prefix');
        if (valEl && stars !== undefined) {
          stat.dataset.value = stars;
          if (prefixEl) prefixEl.textContent = stars >= 1000 ? '+' : '';
          valEl.textContent = stars >= 1000 ? formatCount(stars) : stars.toLocaleString();
          stat.setAttribute('title', `${stars} stars on GitHub • Live sync`);
        }
      }
    } catch (e) {
      // Verified baseline remains active
    }
  });

  // 3. Fetch live Roblox visits (via CORS proxy)
  const robloxStats = document.querySelectorAll('.pc-stat[data-type="roblox"]');
  const universeIds = Array.from(robloxStats).map(b => b.dataset.universe).filter(Boolean);
  
  if (universeIds.length > 0) {
    try {
      const apiUrl = `https://games.roblox.com/v1/games?universeIds=${universeIds.join(',')}`;
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(apiUrl)}`;
      const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(4000) });
      if (res.ok) {
        const json = await res.json();
        if (json && Array.isArray(json.data)) {
          json.data.forEach(game => {
            const stat = document.querySelector(`.pc-stat[data-universe="${game.id}"]`);
            if (stat && game.visits !== undefined) {
              stat.dataset.value = game.visits;
              const valEl = stat.querySelector('.live-val');
              const prefixEl = stat.querySelector('.stat-prefix');
              if (prefixEl) prefixEl.textContent = game.visits >= 1000 ? '+' : '';
              if (valEl) valEl.textContent = formatCount(game.visits);
              stat.setAttribute('title', `${game.visits.toLocaleString()} total visits • Live sync`);
            }
          });
        }
      }
    } catch (e) {
      // Verified real numbers remain active
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', updateLiveStats);
} else {
  updateLiveStats();
}
