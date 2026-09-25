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
  const dialog = document.createElement('dialog');
  dialog.className = 'client-dialog';
  dialog.setAttribute('aria-labelledby', 'client-dialog-title');
  const close = document.createElement('button'); close.className = 'client-close'; close.textContent = '×'; close.setAttribute('aria-label', 'Close client gallery');
  const body = document.createElement('div');
  dialog.append(close, body); document.body.append(dialog);
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });
  function openClient(client) {
    body.replaceChildren();
    const logo = document.createElement('img'); logo.className = 'client-dialog-logo'; logo.src = client.logo; logo.alt = `${client.name} logo`;
    const title = document.createElement('h2'); title.id = 'client-dialog-title'; title.textContent = client.name;
    const description = document.createElement('p'); description.className = 'client-description'; description.textContent = client.description || '';
    const heading = document.createElement('h3'); heading.textContent = 'Made by KeyDify for ' + client.name;
    const gallery = document.createElement('div'); gallery.className = 'client-purchase-gallery';
    (client.images || []).filter(Boolean).forEach((src, index) => {
      const image = document.createElement('img'); image.src = src; image.alt = `${client.name} purchased products — photo ${index + 1}`; image.loading = 'lazy'; gallery.append(image);
    });
    body.append(logo, title, description);
    if (gallery.children.length) body.append(heading, gallery);
    else { const empty = document.createElement('p'); empty.textContent = 'Product photos coming soon.'; body.append(empty); }
    dialog.showModal();
  }
  const pageSize = 30;
  let currentPage = 0;
  const pageCount = Math.ceil(visible.length / pageSize);
  const grid = showcase.querySelector('.client-grid');
  grid.id = 'trusted-client-page';
  const navigation = document.createElement('nav'); navigation.className = 'client-pagination'; navigation.setAttribute('aria-label', 'Trusted company pages');
  const previous = document.createElement('button'), next = document.createElement('button'), status = document.createElement('span');
  previous.type = next.type = 'button'; previous.textContent = '←'; next.textContent = '→';
  previous.setAttribute('aria-label', 'Previous companies'); next.setAttribute('aria-label', 'Next companies');
  previous.setAttribute('aria-controls', grid.id); next.setAttribute('aria-controls', grid.id);
  status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
  navigation.append(previous, status, next); showcase.append(navigation);
  function renderClientPage() {
    grid.replaceChildren();
    navigation.hidden = pageCount <= 1;
    previous.disabled = currentPage === 0; next.disabled = currentPage >= pageCount - 1;
    status.textContent = `Page ${currentPage + 1} of ${pageCount}`;
    visible.slice(currentPage * pageSize, (currentPage + 1) * pageSize).forEach(client => {
    const card = document.createElement('button'), image = document.createElement('img'), name = document.createElement('span');
    card.type = 'button'; card.className = 'client-card'; card.setAttribute('aria-haspopup', 'dialog'); card.setAttribute('aria-label', `View ${client.name} and their purchased products`);
    image.src = client.logo; image.alt = `${client.name} logo`; image.loading = 'lazy';
    name.textContent = client.name; card.append(image, name); card.addEventListener('click', () => openClient(client)); grid.append(card);
    });
  }
  function changePage(delta) {
    currentPage = Math.max(0, Math.min(pageCount - 1, currentPage + delta));
    renderClientPage();
    grid.querySelector('button')?.focus({ preventScroll: true });
    showcase.scrollIntoView({ behavior: 'instant', block: 'start' });
  }
  previous.addEventListener('click', () => changePage(-1));
  next.addEventListener('click', () => changePage(1));
  renderClientPage();
})();
