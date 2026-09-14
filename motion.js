/* Scroll motion enhances the page without hiding content or intercepting scrolling. */
(() => {
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const root = document.documentElement;
  const hero = document.querySelector('.hero');
  const brand = document.querySelector('.brand-break');
  const contact = document.querySelector('.contact');
  const productGrid = document.querySelector('#product-grid');
  const progress = document.createElement('div');
  progress.className = 'scroll-progress'; progress.setAttribute('aria-hidden', 'true');
  document.body.append(progress);
  const seen = new WeakSet();
  const animations = new Set();
  let frame = 0;
  let observer;
  let photos = [];
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const phase = (rect, height) => clamp((height - rect.top) / (height + rect.height), 0, 1);
  function register() {
    photos = [...document.querySelectorAll('.category-card-image, .product-image')];
    if (!observer) return;
    document.querySelectorAll('.hero-copy > *, .section-heading, .category-heading, .category-card, .product-card, .how > .eyebrow, .how > h2, .steps article, .contact > div, footer').forEach(el => {
      if (seen.has(el)) return;
      const siblings = el.parentElement.children;
      const index = [...siblings].indexOf(el);
      el.dataset.revealDelay = String((index % (innerWidth < 600 ? 1 : 3)) * 85);
      observer.observe(el);
    });
  }
  function draw() {
    frame = 0;
    if (preference.matches) return;
    const height = innerHeight;
    const mobile = innerWidth < 700;
    const amount = mobile ? 0.45 : 1;
    // Read all layout before writing styles; use untransformed parent sections as anchors.
    const h = hero.getBoundingClientRect();
    const b = brand.getBoundingClientRect();
    const c = contact.getBoundingClientRect();
    const pictures = photos.map(el => ({el, rect: el.getBoundingClientRect()}));
    const distance = Math.max(1, root.scrollHeight - height);
    const heroScroll = clamp(-h.top / h.height, -0.2, 1.3);
    hero.style.setProperty('--hero-copy-y', `${heroScroll * -65 * amount}px`);
    hero.style.setProperty('--hero-art-y', `${heroScroll * 105 * amount}px`);
    hero.style.setProperty('--hero-turn', `${-3 + heroScroll * 9 * amount}deg`);
    hero.style.setProperty('--hero-zoom', String(1 + Math.max(0, heroScroll) * 0.05));
    const brandPhase = phase(b, height) - 0.5;
    brand.style.setProperty('--brand-y', `${brandPhase * -130 * amount}px`);
    brand.style.setProperty('--brand-turn', `${7 + brandPhase * 24 * amount}deg`);
    brand.style.setProperty('--brand-zoom', String(1 + (brandPhase + 0.5) * 0.13));
    brand.style.setProperty('--brand-copy-x', `${brandPhase * 55 * amount}px`);
    contact.style.setProperty('--contact-heading-x', `${(phase(c, height) - 0.5) * -40 * amount}px`);
    pictures.forEach(({el, rect}) => {
      if (rect.bottom < -100 || rect.top > height + 100) return;
      el.style.setProperty('--photo-y', `${(phase(rect, height) - 0.5) * -38 * amount}px`);
    });
    progress.style.transform = `scaleX(${clamp(scrollY / distance, 0, 1)})`;
  }
  function schedule() {
    if (!preference.matches && !frame) frame = requestAnimationFrame(draw);
  }
  function configure() {
    observer?.disconnect();
    animations.forEach(animation => animation.cancel()); animations.clear();
    if (frame) cancelAnimationFrame(frame); frame = 0;
    root.classList.toggle('scroll-motion', !preference.matches);
    if (preference.matches) return;
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(entries => {
        entries.forEach(({target, isIntersecting}) => {
          if (!isIntersecting || seen.has(target)) return;
          seen.add(target); observer.unobserve(target);
          if (!target.animate || target.contains(document.activeElement)) return;
          const card = target.matches('.category-card, .product-card');
          const animation = target.animate([
            { opacity: 0.18, transform: `translateY(${card ? 48 : 30}px)${card ? ' scale(.97)' : ''}` },
            { opacity: 1, transform: 'translateY(0) scale(1)' }
          ], { duration: 750, delay: Number(target.dataset.revealDelay || 0), easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' });
          animations.add(animation);
          animation.finished.then(() => animations.delete(animation), () => animations.delete(animation));
          target.addEventListener('focusin', () => animation.cancel(), { once: true });
        });
      }, { threshold: 0.08 });
    }
    register(); schedule();
  }
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule, { passive: true });
  addEventListener('load', schedule, { once: true });
  preference.addEventListener('change', configure);
  new MutationObserver(() => { register(); schedule(); }).observe(productGrid, { childList: true });
  configure();
})();
