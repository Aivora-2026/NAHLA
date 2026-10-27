(function () {
  'use strict';

  /* ---------- Settings ----------
     FORM_ENDPOINT: paste a form-handling URL (for example a Formspree link)
     to send the contact form straight from the page. When it is empty the
     form opens the visitor's email app, addressed to MAIL_TO.            */
  const FORM_ENDPOINT = '';
  const MAIL_TO = 'alnakhla7171@gmail.com';

  const T = window.I18N || { ar: {}, en: {} };
  const root = document.documentElement;
  const page = document.body.dataset.page || 'home';
  let lang = 'ar';
  const t = k => (T[lang] && T[lang][k]) || k;

  /* ---------- Language ---------- */
  const langBtn = document.getElementById('langBtn');
  const langLabel = document.getElementById('langLabel');
  const metaDesc = document.querySelector('meta[name="description"]');
  const ogLocale = document.querySelector('meta[property="og:locale"]');
  const ogTitle = document.querySelector('meta[property="og:title"]');
  const ogDesc = document.querySelector('meta[property="og:description"]');
  const mapFrame = document.getElementById('mapFrame');

  const storageGet = () => { try { return localStorage.getItem('lang'); } catch (e) { return null; } };
  const storageSet = v => { try { localStorage.setItem('lang', v); } catch (e) { /* ignore */ } };

  function initialLang() {
    const q = new URLSearchParams(location.search).get('lang');
    if (q === 'ar' || q === 'en') return q;
    const saved = storageGet();
    if (saved === 'ar' || saved === 'en') return saved;
    return (navigator.language || 'ar').toLowerCase().startsWith('en') ? 'en' : 'ar';
  }

  function applyLang(l) {
    lang = l;
    root.lang = l;
    root.dir = l === 'ar' ? 'rtl' : 'ltr';

    document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-aria]').forEach(el => el.setAttribute('aria-label', t(el.dataset.i18nAria)));
    document.querySelectorAll('[data-i18n-alt]').forEach(el => el.setAttribute('alt', t(el.dataset.i18nAlt)));

    document.title = t('doc.title.' + page);
    const d = t('doc.desc.' + page);
    if (metaDesc) metaDesc.setAttribute('content', d);
    if (ogTitle) ogTitle.setAttribute('content', document.title);
    if (ogDesc) ogDesc.setAttribute('content', d);
    if (ogLocale) ogLocale.setAttribute('content', l === 'ar' ? 'ar_SA' : 'en_US');
    if (mapFrame) mapFrame.setAttribute('title', t('map.frame'));
    if (langLabel) langLabel.textContent = t('lang.label');

    refreshSegLabels();
    refreshLightboxLabels();
    if (typeof fitNav === 'function') fitNav();
    storageSet(l);
  }
  if (langBtn) langBtn.addEventListener('click', () => applyLang(lang === 'ar' ? 'en' : 'ar'));

  // Keep the chosen language when moving to another page (works even from file://)
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href]');
    if (!a || a.hasAttribute('data-group')) return;
    const href = a.getAttribute('href');
    if (/^(https?:|mailto:|tel:|#)/i.test(href)) return;
    try {
      const u = new URL(a.href);
      u.searchParams.set('lang', lang);
      a.href = u.toString();
    } catch (err) { /* ignore */ }
  });

  /* ---------- Menu ---------- */
  const toggle = document.getElementById('menuToggle');
  const nav = document.getElementById('nav');
  const closeMenu = () => { nav.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); };
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  nav.addEventListener('click', e => { if (e.target.closest('a')) closeMenu(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
  document.addEventListener('click', e => {
    if (!nav.contains(e.target) && !toggle.contains(e.target)) closeMenu();
  });
  window.matchMedia('(min-width:1121px)').addEventListener('change', closeMenu);

  /* Switch to the hamburger menu whenever the links do not fit in the header
     (depends on screen width, language and font), so nothing runs off the page. */
  const headerEl = document.getElementById('header');
  const headerInner = headerEl.querySelector('.header-inner');
  function fitNav() {
    headerEl.classList.remove('collapsed');
    const overflow = headerInner.scrollWidth > headerInner.clientWidth + 1;
    headerEl.classList.toggle('collapsed', overflow);
    if (!overflow) closeMenu();
  }
  let fitRaf = 0;
  window.addEventListener('resize', () => { cancelAnimationFrame(fitRaf); fitRaf = requestAnimationFrame(fitNav); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitNav);
  window.addEventListener('load', fitNav);

  /* ---------- Smart image fit ----------
     Pictures fill their frame (cover). When a picture's shape is very
     different from the frame's, the whole picture is shown instead
     (contain) over a blurred copy of itself, so nothing is cropped away. */
  const frames = Array.from(document.querySelectorAll('.frame'));

  function evalFrame(frame) {
    const im = frame.querySelector('img');
    if (!im || !im.naturalWidth) return;
    const fw = frame.clientWidth, fh = frame.clientHeight;
    if (!fw || !fh) return;
    const mismatch = Math.max((im.naturalWidth / im.naturalHeight) / (fw / fh), (fw / fh) / (im.naturalWidth / im.naturalHeight));
    frame.classList.toggle('contain', mismatch > 1.5);
  }

  frames.forEach(frame => {
    const im = frame.querySelector('img');
    if (!im) return;
    const prep = () => {
      frame.style.setProperty('--img', 'url("' + (im.currentSrc || im.src) + '")');
      evalFrame(frame);
    };
    if (im.complete && im.naturalWidth) prep();
    else {
      im.addEventListener('load', prep, { once: true });
      im.addEventListener('error', () => frame.classList.add('img-error'), { once: true });
    }
  });

  if ('ResizeObserver' in window) {
    const ro = new ResizeObserver(entries => entries.forEach(en => evalFrame(en.target)));
    frames.forEach(f => ro.observe(f));
  } else {
    window.addEventListener('resize', () => frames.forEach(evalFrame));
  }

  /* ---------- Home slider ---------- */
  const slider = document.getElementById('slider');
  let segs = [];
  function refreshSegLabels() {
    const n = segs.length;
    segs.forEach((b, i) => b.setAttribute('aria-label', t('slider.dot').replace('{n}', i + 1).replace('{t}', n)));
  }

  if (slider) {
    const slides = Array.from(slider.querySelectorAll('.slide'));
    const progress = document.getElementById('progress');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let current = 0;

    slides.forEach((_, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'seg';
      b.addEventListener('click', () => go(i));
      progress.appendChild(b);
    });
    segs = Array.from(progress.children);

    function go(n) {
      current = (n + slides.length) % slides.length;
      slides.forEach((s, i) => s.classList.toggle('active', i === current));
      segs.forEach(s => { s.classList.remove('active', 'done'); s.removeAttribute('aria-current'); });
      void progress.offsetWidth;                 // restart the CSS fill animation
      segs.forEach((s, i) => {
        if (i < current) s.classList.add('done');
        if (i === current) { s.classList.add('active'); s.setAttribute('aria-current', 'true'); }
      });
    }
    if (!reduceMotion) {
      progress.addEventListener('animationend', e => { if (e.animationName === 'segfill') go(current + 1); });
    }
    document.getElementById('nextBtn').addEventListener('click', () => go(current + 1));
    document.getElementById('prevBtn').addEventListener('click', () => go(current - 1));

    let sx = 0, sy = 0;
    slider.addEventListener('touchstart', e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; slider.classList.add('is-paused'); }, { passive: true });
    slider.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) go(current + ((lang === 'ar' ? dx > 0 : dx < 0) ? 1 : -1));
      slider.classList.remove('is-paused');
    });
    slider.setAttribute('tabindex', '0');
    slider.addEventListener('keydown', e => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      go(current + (((e.key === 'ArrowLeft') === (lang === 'ar')) ? 1 : -1));
    });
    document.addEventListener('visibilitychange', () => slider.classList.toggle('is-paused', document.hidden));
    go(0);
  }

  /* ---------- Lightbox (galleries, projects, products) ---------- */
  let lb = null, lbImg, lbCap, lbCount, lbItems = [], lbIdx = 0, lbLast = null;

  function buildLightbox() {
    lb = document.createElement('div');
    lb.className = 'lb';
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.innerHTML =
      '<div class="lb-top"><span class="lb-cap"></span>' +
      '<button type="button" class="lb-close"><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" d="M6 6l12 12M18 6L6 18"/></svg></button></div>' +
      '<div class="lb-stage"><button type="button" class="lb-nav lb-prev"><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" d="M15 5l-7 7 7 7"/></svg></button>' +
      '<img alt=""><button type="button" class="lb-nav lb-next"><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg></button></div>' +
      '<div class="lb-count"></div>';
    document.body.appendChild(lb);
    lbImg = lb.querySelector('.lb-stage img');
    lbCap = lb.querySelector('.lb-cap');
    lbCount = lb.querySelector('.lb-count');
    lb.querySelector('.lb-close').addEventListener('click', closeLb);
    lb.querySelector('.lb-prev').addEventListener('click', () => stepLb(-1));
    lb.querySelector('.lb-next').addEventListener('click', () => stepLb(1));
    // Click on the dark area around the picture closes the viewer; clicking the picture itself does not.
    lb.addEventListener('click', e => {
      if (e.target.closest('.lb-close, .lb-nav')) return;
      if (e.target === lbImg && lbImg.naturalWidth) {
        const r = lbImg.getBoundingClientRect(), cs = getComputedStyle(lbImg);
        const cw = r.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
        const ch = r.height - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
        const s = Math.min(cw / lbImg.naturalWidth, ch / lbImg.naturalHeight);
        const dw = lbImg.naturalWidth * s, dh = lbImg.naturalHeight * s;
        const cx = r.left + parseFloat(cs.paddingLeft) + cw / 2, cy = r.top + parseFloat(cs.paddingTop) + ch / 2;
        if (Math.abs(e.clientX - cx) <= dw / 2 && Math.abs(e.clientY - cy) <= dh / 2) return;
      }
      closeLb();
    });
    lbImg.addEventListener('load', () => lbImg.classList.remove('loading'));
    lbImg.addEventListener('error', () => lbImg.classList.remove('loading'));

    let sx = 0;
    lb.addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > 50) stepLb((lang === 'ar' ? dx > 0 : dx < 0) ? 1 : -1);
    });
    refreshLightboxLabels();
  }

  function refreshLightboxLabels() {
    if (!lb) return;
    lb.querySelector('.lb-close').setAttribute('aria-label', t('lb.close'));
    lb.querySelector('.lb-prev').setAttribute('aria-label', t('slider.prev'));
    lb.querySelector('.lb-next').setAttribute('aria-label', t('slider.next'));
    if (lb.classList.contains('open')) showLb(lbIdx);
  }

  function showLb(i) {
    lbIdx = (i + lbItems.length) % lbItems.length;
    const a = lbItems[lbIdx];
    lbImg.classList.add('loading');
    lbImg.src = a.href;
    const capKey = a.dataset.cap;
    const cap = capKey ? t(capKey) : '';
    lbImg.alt = cap;
    lbCap.textContent = cap;
    lbCount.textContent = (lbIdx + 1) + ' / ' + lbItems.length;
    lb.classList.toggle('single', lbItems.length < 2);
    if (lbItems.length > 1) { const n = new Image(); n.src = lbItems[(lbIdx + 1) % lbItems.length].href; }
  }
  const stepLb = d => showLb(lbIdx + d);

  function openLb(a) {
    if (!lb) buildLightbox();
    lbItems = Array.from(document.querySelectorAll('a[data-group="' + a.dataset.group + '"]'));
    lbLast = a;
    lb.classList.add('open');
    document.body.classList.add('lb-lock');
    showLb(Math.max(0, lbItems.indexOf(a)));
    lb.querySelector('.lb-close').focus();
  }
  function closeLb() {
    lb.classList.remove('open');
    document.body.classList.remove('lb-lock');
    lbImg.removeAttribute('src');
    if (lbLast) lbLast.focus({ preventScroll: true });
  }

  document.addEventListener('click', e => {
    const a = e.target.closest('a[data-group]');
    if (!a) return;
    e.preventDefault();
    openLb(a);
  });
  document.addEventListener('keydown', e => {
    if (!lb || !lb.classList.contains('open')) return;
    if (e.key === 'Escape') closeLb();
    else if (e.key === 'ArrowLeft') stepLb(lang === 'ar' ? 1 : -1);
    else if (e.key === 'ArrowRight') stepLb(lang === 'ar' ? -1 : 1);
  });

  /* ---------- Contact form ---------- */
  const form = document.getElementById('contactForm');
  if (form) {
    const msg = document.getElementById('formMsg');
    const show = (key, isError) => {
      msg.hidden = false;
      msg.classList.toggle('error', !!isError);
      msg.dataset.i18n = key;
      msg.textContent = t(key);
    };
    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); show('form.invalid', true); return; }
      const data = Object.fromEntries(new FormData(form).entries());

      if (FORM_ENDPOINT) {
        try {
          const res = await fetch(FORM_ENDPOINT, {
            method: 'POST', headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          });
          if (!res.ok) throw new Error('bad status');
          form.reset(); show('form.ok');
        } catch (err) { show('form.err', true); }
        return;
      }
      const body = data.message + '\n\n— ' + data.name + '\n' + data.phone + '\n' + data.email;
      location.href = 'mailto:' + MAIL_TO + '?subject=' + encodeURIComponent(data.name + ' | ' + document.title) + '&body=' + encodeURIComponent(body);
      show('form.mailto');
    });
  }

  /* ---------- Init ---------- */
  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
  applyLang(initialLang());
})();
