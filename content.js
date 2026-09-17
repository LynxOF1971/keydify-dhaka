/* Content overrides shared by the storefront and dashboard preview. */
(() => {
  if (new URLSearchParams(location.search).has('preview')) {
    try { const draft = sessionStorage.getItem('keydify-preview'); if (draft) window.KEYDIFY = JSON.parse(draft); } catch {}
  }
  const site = window.KEYDIFY.site || {};
  for (const [selector, value] of Object.entries(site.text || {})) {
    try { document.querySelectorAll(selector).forEach(el => { if (['SCRIPT','STYLE','IFRAME'].includes(el.tagName)) return; el.textContent = value; el.style.whiteSpace = 'pre-line'; }); } catch {}
  }
  for (const [selector, value] of Object.entries(site.media || {})) {
    try { document.querySelectorAll(selector).forEach(el => { if (['IMG','VIDEO'].includes(el.tagName)) el.src = value; }); } catch {}
  }
  if (site.title) document.title = site.title;
  if (site.description) document.querySelector('meta[name="description"]').content = site.description;
  const rows = [...document.querySelectorAll('.delivery-table tbody tr')].map(row => row.innerText.replace(/\s+/g, ' ').trim());
  const terms = document.querySelector('.delivery-terms p')?.textContent;
  document.querySelector('.order-info').textContent = `Delivery: ${rows.join(' · ')}. ${terms} We’ll confirm the final total in chat. This step doesn’t place or pay for an order.`;
})();
