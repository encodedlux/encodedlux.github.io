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

function animateValue(target, start, end, duration = 800, isSuffix = true) {
  const valEl = target.querySelector ? (target.querySelector('.live-val') || target) : target;
  const prefixEl = target.querySelector ? target.querySelector('.stat-prefix') : null;
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
  const globalVisitsEl = document.getElementById('statTotalVisits');
  const globalLikesEl = document.getElementById('statTotalLikes');
  const globalFavoritesEl = document.getElementById('statTotalFavorites');

  // 1. Initial animated counter on page load using stored baselines
  const globalStatValues = document.querySelectorAll('.stat-value[data-value]');
  globalStatValues.forEach(el => {
    const targetVal = parseInt(el.dataset.value, 10);
    if (!isNaN(targetVal)) animateValue(el, 0, targetVal, 950, true);
  });

  const stats = document.querySelectorAll('.pc-stat[data-type]');
  stats.forEach(stat => {
    const targetVal = parseInt(stat.dataset.value, 10);
    if (!isNaN(targetVal)) animateValue(stat, 0, targetVal, 950, stat.dataset.type === 'roblox');
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

  // 3. Fetch live Roblox metrics & compute live portfolio sums
  const robloxStats = document.querySelectorAll('.pc-stat[data-type="roblox"]');
  const universeIds = Array.from(robloxStats).map(b => b.dataset.universe).filter(Boolean);

  const fallbackLikes = {
    '7486575214': 10870,
    '6093319843': 6015,
    '8927119235': 1409,
    '9816039518': 530,
    '2247815522': 32870
  };

  if (universeIds.length > 0) {
    try {
      const gamesUrl = `https://games.roproxy.com/v1/games?universeIds=${universeIds.join(',')}`;
      const res = await fetch(gamesUrl, { signal: AbortSignal.timeout(5000) });
      
      let totalVisits = 0;
      let totalFavorites = 0;

      if (res.ok) {
        const json = await res.json();
        if (json && Array.isArray(json.data)) {
          json.data.forEach(game => {
            const stat = document.querySelector(`.pc-stat[data-universe="${game.id}"]`);
            if (game.visits !== undefined) {
              totalVisits += game.visits;
              if (stat) {
                const prev = parseInt(stat.dataset.value, 10);
                stat.dataset.value = game.visits;
                const valEl = stat.querySelector('.live-val');
                const prefixEl = stat.querySelector('.stat-prefix');
                if (prefixEl) prefixEl.textContent = game.visits >= 1000 ? '+' : '';
                if (valEl && prev !== game.visits) animateValue(stat, prev || 0, game.visits, 700, true);
                stat.setAttribute('title', `${game.visits.toLocaleString()} total visits • Live sync`);
              }
            }
            if (game.favoritedCount !== undefined) {
              totalFavorites += game.favoritedCount;
            }
          });

          // Update Global Visits (Sum of all games)
          if (globalVisitsEl && totalVisits > 0) {
            const prevVal = parseInt(globalVisitsEl.dataset.value, 10) || 0;
            globalVisitsEl.dataset.value = totalVisits;
            if (globalVisitsEl.parentElement) {
              globalVisitsEl.parentElement.setAttribute('title', `${totalVisits.toLocaleString()} total visits across all portfolio games • Live sync`);
            }
            if (prevVal !== totalVisits) {
              animateValue(globalVisitsEl, prevVal, totalVisits, 700, true);
            }
          }

          // Update Global Favorites (Sum of all games)
          if (globalFavoritesEl && totalFavorites > 0) {
            const prevVal = parseInt(globalFavoritesEl.dataset.value, 10) || 0;
            globalFavoritesEl.dataset.value = totalFavorites;
            if (globalFavoritesEl.parentElement) {
              globalFavoritesEl.parentElement.setAttribute('title', `${totalFavorites.toLocaleString()} total favorites across all portfolio games • Live sync`);
            }
            if (prevVal !== totalFavorites) {
              animateValue(globalFavoritesEl, prevVal, totalFavorites, 700, true);
            }
          }
        }
      }

      // 4. Fetch live game votes (likes) sequentially to avoid rate limits
      let totalLikes = 0;
      for (const id of universeIds) {
        try {
          const voteRes = await fetch(`https://games.roproxy.com/v1/games/${id}/votes`, { signal: AbortSignal.timeout(3000) });
          if (voteRes.ok) {
            const voteData = await voteRes.json();
            if (voteData && typeof voteData.upVotes === 'number') {
              totalLikes += voteData.upVotes;
              continue;
            }
          }
        } catch (e) {
          // Fall back to baseline if rate-limited
        }
        totalLikes += (fallbackLikes[id] || 0);
        await new Promise(r => setTimeout(r, 100));
      }

      // Update Global Likes (Sum of all games)
      if (globalLikesEl && totalLikes > 0) {
        const prevVal = parseInt(globalLikesEl.dataset.value, 10) || 0;
        globalLikesEl.dataset.value = totalLikes;
        if (globalLikesEl.parentElement) {
          globalLikesEl.parentElement.setAttribute('title', `${totalLikes.toLocaleString()} total likes across all portfolio games • Live sync`);
        }
        if (prevVal !== totalLikes) {
          animateValue(globalLikesEl, prevVal, totalLikes, 700, true);
        }
      }

    } catch (e) {
      // Offline fallback: verified portfolio baselines remain active
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', updateLiveStats);
} else {
  updateLiveStats();
}
