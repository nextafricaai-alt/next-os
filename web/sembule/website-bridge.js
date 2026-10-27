// Public-site bridge for the Sembule OS website editor. This file uses only
// the publishable Supabase key and a view that exposes published website copy.
(() => {
  const SUPABASE_URL = 'https://stpawtberphnvhcxjmkj.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_RvlRBmtSxrtAXDsUKn91QQ_XwWZOpt_';
  const PAGE = location.pathname.toLowerCase().endsWith('/services.html') ? 'services'
    : location.pathname.toLowerCase().endsWith('/portfolio.html') ? 'portfolio'
    : location.pathname.toLowerCase().endsWith('/about.html') ? 'about'
    : location.pathname.toLowerCase().endsWith('/contact.html') ? 'contact' : 'home';
  const main = document.querySelector('main');
  const sendReady = () => {
    if (window.parent !== window) window.parent.postMessage({ type: 'SEMBULE_SITE_BRIDGE_READY' }, '*');
  };
  const safeHref = value => {
    try {
      const url = new URL(String(value || ''));
      return url.protocol === 'https:' ? url.href : '';
    } catch { return ''; }
  };
  const setText = (node, value) => {
    if (node && typeof value === 'string') node.textContent = value;
  };
  function scopeFor(heading) {
    let node = heading?.parentElement;
    while (node && node !== main) {
      if (node.matches('section, article, [role="region"]')) return node;
      node = node.parentElement;
    }
    return main;
  }
  function descriptionFor(heading, scope = scopeFor(heading)) {
    if (!heading || !scope) return null;
    return [...scope.querySelectorAll('p')].find(node =>
      heading.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING &&
      !node.classList.contains('eyebrow')
    ) || null;
  }
  function updateIntro(data) {
    const heading = main?.querySelector('h1');
    setText(heading, data.heading);
    setText(descriptionFor(heading), data.intro);
  }
  function updateCard(heading, item) {
    if (!heading || !item) return;
    setText(heading, item.title);
    setText(descriptionFor(heading), item.summary || item.category || '');
    const link = heading.closest('article, li, div')?.querySelector('a[href]');
    const href = safeHref(item.link);
    if (link && href && item.link) link.href = href;
  }
  function updateHeadingsByOrder(selector, items) {
    const headings = [...(main?.querySelectorAll(selector) || [])];
    (items || []).forEach((item, index) => updateCard(headings[index], item));
  }
  function updateCardsInSection(heading, items) {
    if (!heading) return;
    const section = heading.closest('section') || scopeFor(heading);
    const cards = [...(section?.querySelectorAll('h3') || [])];
    (items || []).forEach((item, index) => updateCard(cards[index], item));
  }
  function updateFooter(brand) {
    if (!brand) return;
    document.querySelectorAll('a[href*="wa.me"], a[href*="whatsapp.com"]').forEach(link => {
      const phone = String(brand.whatsapp || '').replace(/\D/g, '');
      if (phone) link.href = 'https://wa.me/' + phone;
      if (phone && /\d/.test(link.textContent)) link.textContent = brand.whatsapp;
      if (link.getAttribute('aria-label')) link.setAttribute('aria-label', 'WhatsApp the team');
    });
    document.querySelectorAll('a[href^="mailto:"]').forEach(link => {
      if (!brand.email) return;
      link.href = 'mailto:' + brand.email;
      link.textContent = link.closest('footer') ? 'Email Sembule' : brand.email;
    });
    for (const [name, url] of Object.entries(brand.socials || {})) {
      const safe = safeHref(url);
      if (!safe) continue;
      const selector = name === 'youtube' ? 'a[href*="youtube.com"],a[href*="youtu.be"]'
        : name === 'instagram' ? 'a[href*="instagram.com"]'
        : name === 'tiktok' ? 'a[href*="tiktok.com"]'
        : name === 'facebook' ? 'a[href*="facebook.com"]' : null;
      if (selector) document.querySelectorAll('footer ' + selector).forEach(link => { link.href = safe; });
    }
    const footerCopy = document.querySelector('footer p');
    setText(footerCopy, brand.tagline);
    const copyright = [...document.querySelectorAll('footer small, footer p, footer div')]
      .find(node => node.textContent.trim().startsWith('©'));
    setText(copyright, '© ' + new Date().getFullYear() + ' ' + brand.name + '. All rights reserved. ' + brand.location);
  }
  function updateImages(content) {
    const list = content.images?.[PAGE];
    if (!Array.isArray(list)) return;
    // Same order the editor uses: photos inside <main>, skipping the client-logo band and decorative copies.
    const photos = [...main.querySelectorAll('img')].filter(img => !img.closest('[data-partner-band]') && img.getAttribute('alt'));
    list.forEach((entry, index) => {
      const img = photos[index];
      const src = safeHref(entry?.url);
      if (!img || !src) return;
      const alt = String(entry.alt || '').trim();
      const apply = () => {
        if (img.getAttribute('srcset')) img.removeAttribute('srcset');
        if (img.getAttribute('sizes')) img.removeAttribute('sizes');
        if (img.getAttribute('src') !== src) img.setAttribute('src', src);
        if (alt && img.alt !== alt) img.alt = alt;
      };
      apply();
      // The page's own script may set bundled photos a moment later; keep the published photo in place.
      new MutationObserver(apply).observe(img, { attributes: true, attributeFilter: ['src', 'srcset'] });
    });
  }
  // The homepage hero is a rotating carousel whose own script rewrites the headline text on every slide change.
  // The editor's eyebrow/headline/summary belong to the FIRST slide: they show whenever that slide is on screen.
  const heroEdits = new WeakMap();
  function updateHeroCarousel(hero, heroTitle) {
    const root = heroTitle.closest('[data-hero-carousel]') || main;
    const first = root.querySelector('[data-hero-slide]');
    const norm = (v) => String(v || '').replace(/\s+/g, ' ').trim();
    const clean = (v) => (typeof v === 'string' && v.trim() ? v.trim() : '');
    [
      [root.querySelector('[data-hero-eyebrow]'), 'storyEyebrow', clean(hero.eyebrow)],
      [heroTitle, 'storyTitle', clean(hero.headline)],
      [root.querySelector('[data-hero-description]'), 'storyDescription', clean(hero.summary)]
    ].forEach(([el, key, value]) => {
      if (!el || !value) return;
      let state = heroEdits.get(el);
      if (!state) {
        // The carousel keeps its own copy of slide 1's text, so remember what it will write back.
        state = { original: norm(first ? first.dataset[key] : ''), value: '' };
        heroEdits.set(el, state);
        new MutationObserver(() => {
          const text = norm(el.textContent);
          if (state.value && text !== norm(state.value) && text === state.original) el.textContent = state.value;
        }).observe(el, { childList: true, characterData: true, subtree: true });
      }
      state.value = value;
      if (norm(el.textContent) === state.original || norm(el.textContent) === norm(value) || !el.dataset.sembuleHeroTouched) {
        el.textContent = value;
      }
      el.dataset.sembuleHeroTouched = '1';
    });
  }
  function updateWebsite(content) {
    if (!content || !main) return;
    const seo = content.seo?.[PAGE];
    if (seo?.title) document.title = seo.title;
    if (seo?.description) {
      let description = document.querySelector('meta[name="description"]');
      if (!description) {
        description = document.createElement('meta');
        description.name = 'description';
        document.head.appendChild(description);
      }
      description.content = seo.description;
    }

    if (PAGE === 'home') {
      const hero = content.home?.hero || {};
      const heroTitle = main.querySelector('h1');
      if (heroTitle && heroTitle.hasAttribute('data-hero-title')) {
        updateHeroCarousel(hero, heroTitle);
      } else {
        setText(scopeFor(heroTitle)?.querySelector('.eyebrow'), hero.eyebrow);
        setText(heroTitle, hero.headline);
        setText(descriptionFor(heroTitle), hero.summary);
      }
      const servicesTitle = main.querySelector('#services-title');
      setText(servicesTitle, content.home?.services?.heading);
      setText(descriptionFor(servicesTitle), content.home?.services?.intro);
      updateCardsInSection(servicesTitle, content.home?.services?.featured);
      const workTitle = main.querySelector('#work-title');
      setText(workTitle, content.home?.work?.heading);
      setText(descriptionFor(workTitle), content.home?.work?.intro);
      updateCardsInSection(workTitle, content.home?.work?.projects);
      const aboutTitle = main.querySelector('#about-intro-title');
      setText(scopeFor(aboutTitle)?.querySelector('.eyebrow'), content.home?.about?.eyebrow);
      setText(aboutTitle, content.home?.about?.heading);
      setText(descriptionFor(aboutTitle), content.home?.about?.summary);
      const trustedTitle = main.querySelector('#trusted-title');
      setText(trustedTitle, content.home?.trusted?.heading);
      setText(descriptionFor(trustedTitle), content.home?.trusted?.intro);
      const homeH2 = [...main.querySelectorAll('h2')];
      const ctaTitle = homeH2.at(-1);
      setText(ctaTitle, content.home?.callToAction?.heading);
      setText(descriptionFor(ctaTitle), content.home?.callToAction?.summary);
      const serviceStrip = [...main.querySelectorAll('p')].find(node => node.textContent.trim().startsWith('ALSO:'));
      setText(serviceStrip, content.home?.services?.otherServices);
    } else if (PAGE === 'services') {
      updateIntro(content.services || {});
      updateHeadingsByOrder('h2', content.services?.items);
    } else if (PAGE === 'portfolio') {
      updateIntro(content.portfolio || {});
      updateHeadingsByOrder('h2', content.portfolio?.projects);
      const note = [...main.querySelectorAll('p')].find(node => /Project names, client marks/i.test(node.textContent));
      setText(note, content.portfolio?.permissionsNote);
    } else if (PAGE === 'about') {
      updateIntro(content.about || {});
      const headings = [...main.querySelectorAll('h2')];
      setText(headings[0], content.about?.storyHeading);
      setText(descriptionFor(headings[0]), content.about?.story);
      setText(headings[1], content.about?.coverageHeading);
      setText(descriptionFor(headings[1]), content.about?.coverage);
    } else if (PAGE === 'contact') {
      updateIntro(content.contact || {});
      const headings = [...main.querySelectorAll('h2')];
      setText(headings[0], content.contact?.conversationHeading);
      setText(descriptionFor(headings[0]), content.contact?.conversation);
      setText(headings[1], content.contact?.enquiryHeading);
      setText(headings[2], content.contact?.emailHeading);
      const locationHeading = [...main.querySelectorAll('strong')].find(node => node.textContent.trim() === 'Based in');
      const locationCopy = [...(locationHeading?.parentElement?.childNodes || [])]
        .find(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
      if (locationCopy && content.brand?.location) locationCopy.textContent = '\n' + content.brand.location;
    }
    updateImages(content);
    updateFooter(content.brand);
  }

  sendReady();
  window.addEventListener('message', event => {
    if (event.data?.type === 'SEMBULE_SITE_BRIDGE_PING' && event.source === window.parent) sendReady();
  });
  fetch(SUPABASE_URL + '/rest/v1/sembule_website_public?id=eq.main&select=published_content,published_at', {
    headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY, Accept: 'application/json' },
    cache: 'no-store',
    credentials: 'omit'
  }).then(response => response.ok ? response.json() : [])
    .then(rows => { if (rows?.[0]?.published_content) updateWebsite(rows[0].published_content); })
    .catch(() => {});
})();
