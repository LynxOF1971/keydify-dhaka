'use strict';
const config = window.KEYDIFY;
const $ = selector => document.querySelector(selector);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let selectedProduct = null;
let activeCategory = 'all';
let slideIndex = 0;
let paused = reducedMotion;
const dialog = $('#order-dialog');
const textElement = (tag, text, className) => { const el = document.createElement(tag); el.textContent = text; if (className) el.className = className; return el; };
$('#year').textContent = new Date().getFullYear();
$('#preview-notice').hidden = !config.previewMode;
function sortProducts(products, order) {
  const key = order === 'popular' ? 'popularity' : 'priceAmount';
  const valid = value => typeof value === 'number' && Number.isFinite(value) && value >= 0;
  if (order === 'featured') return [...products];
  return [...products].sort((a, b) => {
    const av = a[key], bv = b[key];
    if (!valid(av)) return valid(bv) ? 1 : 0;
    if (!valid(bv)) return -1;
    return order === 'price-asc' ? av - bv : bv - av;
  });
}
function renderProducts(category = activeCategory) {
  activeCategory = category;
  $('#product-grid').replaceChildren();
  document.querySelectorAll('.category-card').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.category === category)));
  const order = $('#product-sort').value;
  const products = sortProducts(config.products.filter(p => category === 'all' || (p.category === category || p.categories?.includes(category))), order);
  $('#results-title').textContent = config.categories.find(c => c.id === category)?.name || 'All designs';
  $('#result-count').textContent = `${products.length} ${products.length === 1 ? 'design' : 'designs'}`;
  $('#show-all').hidden = category === 'all';
  const key = order === 'popular' ? 'popularity' : 'priceAmount';
  const missing = products.some(p => typeof p[key] !== 'number' || !Number.isFinite(p[key]) || p[key] < 0);
  $('#sort-note').hidden = order === 'featured' || !missing;
  $('#sort-note').textContent = order === 'popular' ? 'Designs without popularity data appear last.' : 'Designs with prices available on request appear last.';
  $('#empty-state').hidden = products.length > 0;
  products.forEach(product => {
    const card = textElement('article', '', 'product-card');
    const visual = textElement('div', '', 'product-image');
    const img = document.createElement('img'); img.src = product.image; img.alt = config.previewMode ? 'Brand artwork — product photo pending' : product.name; img.loading = 'lazy';
    const button = textElement('button', '↗'); button.setAttribute('aria-label', `Choose ${product.name}`); button.addEventListener('click', () => openOrder(product));
    visual.append(img, textElement('span', config.previewMode ? 'SAMPLE CONCEPT' : 'KEYDIFY DHAKA', 'badge'), button);
    const meta = textElement('div', '', 'product-meta'); const info = document.createElement('div');
    const nameButton = textElement('button', product.name); nameButton.style.cssText = 'border:0;background:none;padding:0;text-align:left;font-weight:600'; nameButton.addEventListener('click', () => openOrder(product));
    const heading = document.createElement('h3'); heading.append(nameButton);
    info.append(heading, textElement('p', config.categories.find(c => c.id === product.category)?.name || 'Collection'));
    meta.append(info, textElement('span', product.price)); card.append(visual, meta); $('#product-grid').append(card);
  });
}
config.categories.forEach(category => {
  const button = textElement('button', '', 'category-card');
  button.type = 'button'; button.dataset.category = category.id;
  button.setAttribute('aria-pressed', 'false');
  button.setAttribute('aria-controls', 'product-grid');
  const visual = textElement('span', '', 'category-card-image');
  const img = document.createElement('img');
  img.src = category.image || 'assets/keydify-brand.jpeg'; img.alt = ''; img.loading = 'lazy';
  const arrow = textElement('span', '↗', 'category-card-arrow'); arrow.setAttribute('aria-hidden', 'true');
  visual.append(img, textElement('span', 'EXPLORE COLLECTION', 'category-card-badge'), arrow);
  const details = textElement('span', '', 'category-card-details');
  details.append(textElement('strong', category.name), textElement('span', category.description));
  button.append(visual, details);
  button.addEventListener('click', () => {
    renderProducts(category.id);
    $('#collection-results').scrollIntoView({ behavior: reducedMotion ? 'instant' : 'smooth' });
  });
  $('#filters').append(button);
});
$('#product-sort').addEventListener('change', () => renderProducts());
$('#show-all').addEventListener('click', () => renderProducts('all'));
function openOrder(product) {
  selectedProduct = product; $('#order-title').textContent = product.name; $('#order-description').textContent = product.description; $('#order-price').textContent = product.price; $('#order-form').reset(); $('#order-status').textContent = ''; dialog.showModal(); document.body.classList.add('modal-open');
}
$('.close-dialog').addEventListener('click', () => dialog.close());
dialog.addEventListener('close', () => document.body.classList.remove('modal-open'));
dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });
function orderMessage() {
  return `Hi KeyDify Dhaka! I’m interested in ${selectedProduct.name} (${selectedProduct.id}).\nCustomer name: ${$('#customer-name').value.trim()}\nQuantity: ${$('#quantity').value}\n${$('#customisation').value.trim() ? `Personalisation: ${$('#customisation').value.trim()}\n` : ''}Please confirm the available options, total price and delivery.${config.previewMode ? '\nI saw this sample concept on your website.' : ''}`;
}
async function copyMessage(message, status) {
  try { await navigator.clipboard.writeText(message); status.textContent = 'Order details copied. Paste them into your chat.'; return true; }
  catch { status.textContent = `Copy these details into your chat: ${message}`; return false; }
}
function channelUrl(channel, message) {
  if (channel === 'whatsapp') { const number = config.whatsapp.replace(/\D/g, ''); return /^\d{7,15}$/.test(number) ? `https://wa.me/${number}?text=${encodeURIComponent(message)}` : null; }
  const page = config.messenger.trim(); return /^[a-zA-Z0-9.\-_]+$/.test(page) ? `https://m.me/${encodeURIComponent(page)}` : null;
}
function handoff(channel, message, status) {
  const url = channelUrl(channel, message);
  if (!url) { status.textContent = `KeyDify’s ${channel === 'whatsapp' ? 'WhatsApp number' : 'Messenger page'} hasn’t been added yet. Please check back when the store opens.${selectedProduct ? ' You can copy your order details below.' : ''}`; return; }
  if (channel === 'messenger' && selectedProduct) {
    copyMessage(message, status); status.textContent = 'Messenger opens in a new tab. Copy your order details and paste them into the chat.';
  }
  const opened = window.open(url, '_blank', 'noopener,noreferrer');
  if (channel === 'whatsapp') status.textContent = 'WhatsApp opens with your order details ready. Review and send the message to continue.';
}
$('#order-form').addEventListener('submit', event => { event.preventDefault(); if (!selectedProduct || !event.target.reportValidity()) return; handoff(event.submitter?.dataset.channel || 'whatsapp', orderMessage(), $('#order-status')); });
$('#copy-order').addEventListener('click', () => { if ($('#order-form').reportValidity()) copyMessage(orderMessage(), $('#order-status')); });
document.querySelectorAll('[data-contact]').forEach(button => button.addEventListener('click', () => { selectedProduct = null; handoff(button.dataset.contact, 'Hi KeyDify Dhaka! I’d like to ask about your products.', $('#contact-status')); }));
function showSlide(index) {
  const slides = config.slides; if (!slides.length) return;
  slideIndex = (index + slides.length) % slides.length; const slide = slides[slideIndex];
  const old = $('.showcase-media>img, .showcase-media>video');
  const media = document.createElement(slide.type === 'video' ? 'video' : 'img'); media.src = slide.src;
  if (slide.type === 'video') { media.muted = true; media.loop = true; media.playsInline = true; media.controls = false; media.autoplay = !paused; if (slide.poster) media.poster = slide.poster; }
  else media.alt = slide.alt || slide.label;
  media.style.objectPosition = slide.position || 'center';
  if (slide.scale) media.style.objectFit = 'cover';
  old.replaceWith(media);
  const product = config.products.find(p => p.id === slide.productId);
  $('#showcase-name').textContent = product?.name || slide.label;
  $('#showcase-price').textContent = product?.price || '';
  $('#showcase-product').setAttribute('aria-label', product ? `View details and order ${product.name}` : 'Explore the collection'); $('#slide-label').textContent = slide.label; $('.slide-progress span').style.width = `${((slideIndex + 1) / slides.length) * 100}%`;
}
function updatePause() { $('#pause-slide').textContent = paused ? '▶' : 'Ⅱ'; $('#pause-slide').setAttribute('aria-label', paused ? 'Play slideshow' : 'Pause slideshow'); const video = $('.showcase-media>video'); if (video) { if (paused) video.pause(); else video.play().catch(() => {}); } }
$('#prev-slide').addEventListener('click', () => showSlide(slideIndex - 1)); $('#next-slide').addEventListener('click', () => showSlide(slideIndex + 1)); $('#pause-slide').addEventListener('click', () => { paused = !paused; updatePause(); });
let hoverPause = false; $('.hero-art').addEventListener('mouseenter', () => hoverPause = true); $('.hero-art').addEventListener('mouseleave', () => hoverPause = false);
setInterval(() => { if (!paused && !hoverPause && !document.hidden && !dialog.open && !$('.hero-art').contains(document.activeElement)) showSlide(slideIndex + 1); }, 1500);
$('#showcase-product').addEventListener('click', () => {
  const product = config.products.find(p => p.id === config.slides[slideIndex]?.productId);
  if (product) openOrder(product);
  else $('#collection').scrollIntoView({ behavior: reducedMotion ? 'instant' : 'smooth' });
});
renderProducts(); showSlide(0); updatePause();
