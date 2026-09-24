/* Shared public counters and client showcase. No customer form data is collected. */
(() => {
  const endpoint = 'https://keydify.com/api/stats';
  const preview = new URLSearchParams(location.search).has('preview');
  const production = ['keydify.com', 'www.keydify.com', 'lynxof1971.github.io'].includes(location.hostname);
  const labels = { visits: 'Website visits', ordered: 'Total ordered' };
  function paint(root, stats) {
    root.querySelectorAll('[data-counter]').forEach(node => {
      const value = node.dataset.counter === 'ordered' ? stats.whatsapp + stats.messenger : stats[node.dataset.counter];
      node.textContent = Number.isSafeInteger(value) && value >= 0 ? value.toLocaleString() : '—';
    });
  }
  async function read() {
    const response = await fetch(endpoint, { cache: 'no-store', credentials: 'omit' });
    if (!response.ok) throw new Error('Counters are temporarily unavailable.');
    return response.json();
  }
  function panel(root) {
    const grid = document.createElement('div'); grid.className = 'counter-grid';
    Object.entries(labels).forEach(([key, label]) => {
      const item = document.createElement('div'), value = document.createElement('strong'), caption = document.createElement('span');
      value.dataset.counter = key; value.textContent = '—'; caption.textContent = label;
      item.append(value, caption); grid.append(item);
    }); root.append(grid); return grid;
  }
  async function track(kind) {
    if (preview || !production) return;
    const body = JSON.stringify({ id: crypto.randomUUID(), kind });
    try {
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true, credentials: 'omit' });
      if (response.ok) { paint(document, await response.json()); return true; }
    } catch { /* Ordering always works even when counters are unavailable. */ }
  }
  window.KeydifyStats = { read, panel, paint, track };
  const section = document.querySelector('#community');
  if (!section) return; // Studio only reads totals; opening Studio is not a visit.
  const counterPanel = section.querySelector('.community-counters');
  panel(counterPanel);
  if (preview || !production) section.querySelector('.counter-note').textContent = 'Preview — no visits or enquiries are counted.';
  else { track('visits').then(recorded => { if (!recorded) return read().then(stats => paint(section, stats)); }).catch(() => { counterPanel.hidden = true; section.querySelector('.counter-note').textContent = 'Activity counters are not available yet.'; }); }
  const clients = window.KEYDIFY.clients || [];
  const showcase = document.querySelector('#trusted-clients');
  const visible = clients.filter(client => client.name?.trim() && client.logo && client.visible !== false);
  showcase.hidden = !visible.length;
  visible.forEach(client => {
    const card = document.createElement('figure'), image = document.createElement('img'), name = document.createElement('figcaption');
    image.src = client.logo; image.alt = `${client.name} logo`; image.loading = 'lazy';
    name.textContent = client.name; card.append(image, name); showcase.querySelector('.client-grid').append(card);
  });
})();
