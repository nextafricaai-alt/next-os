const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const safe = value => value && /^https:\/\//i.test(value) ? value : '#';
const serviceCard = (item, index) => '<article class="sp-card"><span>0' + (index + 1) + '</span><h3>' + esc(item.title) + '</h3><p>' + esc(item.summary) + '</p></article>';
const workCard = (item, index) => '<article class="sp-work"><span>0' + (index + 1) + '</span><h3>' + esc(item.title) + '</h3><p>' + esc(item.category) + '</p></article>';
const cta = (label, href) => '<a class="sp-cta" href="' + safe(href) + '" tabindex="-1">' + esc(label) + ' <span aria-hidden="true">↗</span></a>';

export function renderWebsitePreview(content, page = 'home') {
  const data = content || {};
  const brand = data.brand || {};
  const home = data.home || {};
  const hero = home.hero || {};
  const services = data.services || {};
  const portfolio = data.portfolio || {};
  const about = data.about || {};
  const contact = data.contact || {};
  const previewPage = page === 'services' ? services : page === 'portfolio' ? portfolio : page === 'about' ? about : page === 'contact' ? contact : null;
  let body = '';

  if (page === 'services') {
    body = '<main><section class="sp-page-head"><p class="sp-kicker">SEMBULE MEDIA SERVICES</p><h1>' + esc(services.heading) + '</h1><p>' + esc(services.intro) + '</p></section><section class="sp-services">' + (services.items || []).map(serviceCard).join('') + '</section><section class="sp-closing"><h2>Let&rsquo;s shape the right setup for your event.</h2><p>Share the date, venue, audience and what you need covered. We&rsquo;ll follow up to confirm the scope.</p>' + cta('Plan a production', '#') + '</section></main>';
  } else if (page === 'portfolio') {
    body = '<main><section class="sp-page-head"><p class="sp-kicker">SELECTED WORK</p><h1>' + esc(portfolio.heading) + '</h1><p>' + esc(portfolio.intro) + '</p></section><section class="sp-services sp-projects">' + (portfolio.projects || []).map(workCard).join('') + '</section><p class="sp-note">' + esc(portfolio.permissionsNote) + '</p><section class="sp-closing"><p class="sp-kicker">HAVE A PRODUCTION IN MIND?</p><h2>Let&rsquo;s plan what you want people to see and hear.</h2>' + cta('Plan a production', '#') + '</section></main>';
  } else if (page === 'about') {
    body = '<main><section class="sp-page-head"><p class="sp-kicker">ABOUT SEMBULE MEDIA</p><h1>' + esc(about.heading) + '</h1><p>' + esc(about.intro) + '</p></section><section class="sp-story"><p class="sp-kicker">SINCE 2022</p><h2>' + esc(about.storyHeading) + '</h2><p>' + esc(about.story) + '</p><p class="sp-kicker">WHERE WE WORK</p><h2>' + esc(about.coverageHeading) + '</h2><p>' + esc(about.coverage) + '</p></section><section class="sp-closing"><p class="sp-kicker">START A CONVERSATION</p><h2>Tell us what you&rsquo;re planning.</h2>' + cta('Plan a production', '#') + '</section></main>';
  } else if (page === 'contact') {
    body = '<main><section class="sp-page-head"><p class="sp-kicker">BOOK / CONTACT</p><h1>' + esc(contact.heading) + '</h1><p>' + esc(contact.intro) + '</p></section><section class="sp-contact"><div><p class="sp-kicker">START WITH A CONVERSATION</p><h2>' + esc(contact.conversationHeading) + '</h2><p>' + esc(contact.conversation) + '</p><p><strong>WhatsApp</strong><br>' + esc(brand.whatsapp) + '</p><p><strong>Email</strong><br>' + esc(brand.email) + '</p><p><strong>Based in</strong><br>' + esc(brand.location) + '</p></div><div class="sp-contact-form"><p class="sp-kicker">PROJECT ENQUIRY</p><h2>' + esc(contact.enquiryHeading) + '</h2><div class="sp-fake-field">Your name</div><div class="sp-fake-field">Phone / WhatsApp</div><div class="sp-fake-field">Service</div><div class="sp-fake-field sp-fake-message">Tell us about the production</div><span class="sp-cta sp-disabled">Continue to WhatsApp</span><small>Your details are placed in a WhatsApp message for you to review and send.</small></div></section></main>';
  } else {
    const homeWork = home.work || {};
    const homeAbout = home.about || {};
    const featured = (home.services?.featured || []).map(serviceCard).join('');
    const projects = (homeWork.projects || []).slice(0, 4).map(workCard).join('');
    body = '<main><section class="sp-hero"><div class="sp-film" aria-hidden="true"><div class="sp-viewfinder"><span>● REC</span><b>+</b><small>SEMBULE MEDIA · PRODUCTION</small></div><div class="sp-film-caption">LIVESTREAM · SOUND · PA</div></div><div class="sp-hero-copy"><p class="sp-kicker">' + esc(hero.eyebrow) + '</p><h1>' + esc(hero.headline) + '</h1><p>' + esc(hero.summary) + '</p>' + cta('Plan your production', '#') + '<span class="sp-quiet-cta">See the work&nbsp; ↗</span></div></section><section class="sp-section"><p class="sp-kicker">WHAT WE PRODUCE</p><h2>' + esc(home.services?.heading) + '</h2><p>' + esc(home.services?.intro) + '</p><div class="sp-services sp-featured">' + featured + '</div><p class="sp-service-strip">' + esc(home.services?.otherServices) + '</p></section><section class="sp-section sp-work-section"><p class="sp-kicker">SELECTED WORK</p><h2>' + esc(homeWork.heading) + '</h2><p>' + esc(homeWork.intro) + '</p><div class="sp-services sp-projects">' + projects + '</div></section><section class="sp-story sp-home-about"><p class="sp-kicker">' + esc(homeAbout.eyebrow) + '</p><h2>' + esc(homeAbout.heading) + '</h2><p>' + esc(homeAbout.summary) + '</p>' + cta('Get to know Sembule', '#') + '</section><section class="sp-closing"><h2>' + esc(home.callToAction?.heading) + '</h2><p>' + esc(home.callToAction?.summary) + '</p>' + cta('Start an enquiry', '#') + '</section></main>';
  }

  const pageTitle = esc(data.seo?.[page]?.title || previewPage?.heading || 'Sembule Media');
  const pageDescription = esc(data.seo?.[page]?.description || '');
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>' + pageTitle + '</title><meta name="description" content="' + pageDescription + '"><link rel="stylesheet" href="./website-preview.css"></head><body><header class="sp-header"><a class="sp-brand" href="#" tabindex="-1"><img src="./assets/brand/logo.png" alt=""><span>' + esc(brand.name || 'Sembule Media') + '</span></a><nav><span>Home</span><span>Services</span><span>Portfolio</span><span>About</span><span class="sp-nav-cta">Plan your event</span></nav><button aria-hidden="true">Menu</button></header>' + body + '<footer class="sp-footer"><div><strong>' + esc(brand.name || 'Sembule Media') + '</strong><p>' + esc(brand.tagline) + '</p></div><div><span>CONNECT</span><p>' + esc(brand.whatsapp) + '<br>' + esc(brand.email) + '</p></div><small>© 2026 ' + esc(brand.name || 'Sembule Media') + ' · ' + esc(brand.location) + '</small></footer></body></html>';
}
