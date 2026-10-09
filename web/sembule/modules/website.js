import { WEBSITE_DEFAULTS, WEBSITE_URL } from '../website-content.js';
import { renderWebsitePreview } from '../website-renderer.js';
import { escapeHTML, withTimeout } from '../utils.js';

const e = escapeHTML;
const PAGE_NAMES = { home: 'Home page', services: 'Services', portfolio: 'Selected work', about: 'About', contact: 'Contact' };
const WEBSITE_BRIDGE_URL = new URL('../website-bridge.js', import.meta.url).href;
const clone = value => JSON.parse(JSON.stringify(value));
let activePage = 'home';
let content = null;
let savedContent = null;
let publishedContent = null;
let publishedAt = null;
let savedAt = null;
let previewMode = 'draft';
let previewSize = 'desktop';
let hostNode = null;
let bridgeConnected = false;
let bridgeListener = null;
let previewTimer = null;

function readPath(source, path) {
  return path.split('.').reduce((value, key) => value?.[key], source) ?? '';
}
function writePath(source, path, value) {
  const keys = path.split('.');
  const leaf = keys.pop();
  const parent = keys.reduce((node, key) => node[key], source);
  parent[leaf] = value;
}
function isDirty() {
  return !savedContent || JSON.stringify(content) !== JSON.stringify(savedContent);
}
function field(path, label, multiline = false, help = '') {
  const value = e(readPath(content, path));
  const control = multiline
    ? `<textarea data-path="${e(path)}" rows="3" maxlength="1200">${value}</textarea>`
    : `<input data-path="${e(path)}" value="${value}" maxlength="180">`;
  return `<label class="website-field"><span>${e(label)}</span>${control}${help ? `<small>${e(help)}</small>` : ''}</label>`;
}
function fieldGroup(title, description, fields) {
  return `<section class="website-fields-group"><div class="website-fields-heading"><h3>${e(title)}</h3><p>${e(description)}</p></div><div class="website-fields-grid">${fields.join('')}</div></section>`;
}
function itemGroup(title, description, prefix, items, fields, open = false) {
  const cards = items.map((item, index) => {
    const children = fields.map(([key, label, multiline]) => field(`${prefix}.${index}.${key}`, label, multiline)).join('');
    return `<details class="website-item" ${open && index === 0 ? 'open' : ''}><summary><span class="website-item-index">${String(index + 1).padStart(2, '0')}</span><span>${e(item.title || item.label || ('Item ' + (index + 1)))}</span></summary><div class="website-fields-grid">${children}</div></details>`;
  }).join('');
  return `<section class="website-fields-group"><div class="website-fields-heading"><h3>${e(title)}</h3><p>${e(description)}</p></div><div class="website-items">${cards}</div></section>`;
}
function seoFields(page) {
  return fieldGroup('Search preview', 'Control the browser title and search description for this page.', [
    field(`seo.${page}.title`, 'Page title'),
    field(`seo.${page}.description`, 'Search description', true)
  ]);
}
function editorSections() {
  if (activePage === 'home') {
    const hero = fieldGroup('First impression', 'The opening story, just as it appears on the current homepage.', [
      field('home.hero.eyebrow', 'Small label'),
      field('home.hero.headline', 'Main headline', true),
      field('home.hero.summary', 'Supporting copy', true)
    ]);
    const featured = itemGroup('Featured services', 'These are the three services shown near the top of the homepage.', 'home.services.featured', content.home.services.featured, [['title', 'Service title'], ['summary', 'Short description', true]]);
    const projects = itemGroup('Homepage work carousel', 'Edit the ten example project labels shown on the homepage.', 'home.work.projects', content.home.work.projects, [['title', 'Project title'], ['category', 'Service labels']]);
    return hero
      + fieldGroup('Services introduction', 'The first services section on the homepage.', [
        field('home.services.heading', 'Section headline', true),
        field('home.services.intro', 'Supporting copy', true),
        field('home.services.otherServices', 'Additional services line', true)
      ])
      + featured
      + fieldGroup('Selected work introduction', 'The short introduction above the homepage carousel.', [
        field('home.work.heading', 'Section headline', true),
        field('home.work.intro', 'Supporting copy', true)
      ])
      + projects
      + fieldGroup('About preview', 'The short introduction that leads to the About page.', [
        field('home.about.eyebrow', 'Location label'),
        field('home.about.heading', 'Section headline', true),
        field('home.about.summary', 'Supporting copy', true)
      ])
      + fieldGroup('Partners and final prompt', 'The home page trust section and enquiry prompt.', [
        field('home.trusted.heading', 'Partners heading'),
        field('home.trusted.intro', 'Partners supporting copy', true),
        field('home.callToAction.heading', 'Final headline', true),
        field('home.callToAction.summary', 'Final supporting copy', true)
      ])
      + seoFields('home');
  }
  if (activePage === 'services') {
    return fieldGroup('Services page introduction', 'The heading and short description above the service list.', [
      field('services.heading', 'Page headline', true),
      field('services.intro', 'Supporting copy', true)
    ])
      + itemGroup('Service list', 'Update the eight services already shown on the public page.', 'services.items', content.services.items, [['title', 'Service title'], ['summary', 'Description', true]], true)
      + seoFields('services');
  }
  if (activePage === 'portfolio') {
    return fieldGroup('Portfolio introduction', 'The heading and supporting text above the current project cards.', [
      field('portfolio.heading', 'Page headline', true),
      field('portfolio.intro', 'Supporting copy', true),
      field('portfolio.permissionsNote', 'Portfolio note', true)
    ])
      + itemGroup('Selected projects', 'Edit the four project titles and captions on the portfolio page.', 'portfolio.projects', content.portfolio.projects, [['title', 'Project title'], ['category', 'Service labels'], ['link', 'Project link']])
      + seoFields('portfolio');
  }
  if (activePage === 'about') {
    return fieldGroup('About page introduction', 'The opening copy on the About page.', [
      field('about.heading', 'Page headline', true),
      field('about.intro', 'Supporting copy', true)
    ])
      + fieldGroup('Our story', 'Company story and the coverage area shown on the page.', [
        field('about.storyHeading', 'Story headline', true),
        field('about.story', 'Story copy', true),
        field('about.coverageHeading', 'Coverage headline', true),
        field('about.coverage', 'Coverage copy', true)
      ])
      + seoFields('about');
  }
  return fieldGroup('Contact page introduction', 'The heading and supporting text shown above the enquiry details.', [
    field('contact.heading', 'Page headline', true),
    field('contact.intro', 'Supporting copy', true),
    field('contact.conversationHeading', 'Conversation section title'),
    field('contact.conversation', 'Conversation copy', true),
    field('contact.enquiryHeading', 'Enquiry form title'),
    field('contact.emailHeading', 'Email section title')
  ])
    + fieldGroup('Contact details', 'These details appear in the public site footer and contact page.', [
      field('brand.whatsapp', 'WhatsApp phone number'),
      field('brand.email', 'Public email'),
      field('brand.location', 'Location line', true),
      field('brand.tagline', 'Footer description', true)
    ])
    + fieldGroup('Social links', 'Paste full https links for public social profiles.', [
      field('brand.socials.youtube', 'YouTube'),
      field('brand.socials.instagram', 'Instagram'),
      field('brand.socials.tiktok', 'TikTok'),
      field('brand.socials.facebook', 'Facebook')
    ])
    + seoFields('contact');
}
function saveState() {
  const status = hostNode?.querySelector('[data-save-state]');
  const save = hostNode?.querySelector('[data-save-draft]');
  if (!status || !save) return;
  status.textContent = isDirty() ? 'Unsaved changes' : savedAt ? 'Draft saved' : 'Ready to edit';
  status.classList.toggle('is-dirty', isDirty());
  save.disabled = !isDirty();
  const publish = hostNode.querySelector('[data-publish]');
  if (publish) publish.disabled = isDirty() || !savedContent;
  const live = hostNode.querySelector('[data-live-state]');
  if (live) {
    live.textContent = bridgeConnected ? 'Live site connected' : 'One-time site setup needed';
    live.classList.toggle('is-connected', bridgeConnected);
  }
  const lastSaved = hostNode.querySelector('[data-last-saved]');
  if (lastSaved) lastSaved.textContent = savedAt ? 'Draft saved ' + new Date(savedAt).toLocaleString() : 'No draft saved yet';
  const lastPublished = hostNode.querySelector('[data-last-published]');
  if (lastPublished) lastPublished.textContent = publishedAt ? 'Last published ' + new Date(publishedAt).toLocaleString() : 'No editor changes published yet';
}
function previewDocument() {
  const frame = hostNode?.querySelector('[data-website-preview]');
  if (!frame) return;
  frame.classList.toggle('is-mobile', previewSize === 'mobile');
  if (previewMode === 'live') {
    frame.removeAttribute('srcdoc');
    frame.setAttribute('sandbox', 'allow-scripts allow-same-origin');
    const file = activePage === 'home' ? 'index.html' : activePage + '.html';
    frame.src = new URL(file, WEBSITE_URL).href;
    return;
  }
  frame.setAttribute('sandbox', 'allow-same-origin');
  frame.removeAttribute('src');
  const currentScroll = frame.contentWindow?.scrollY || 0;
  frame.addEventListener('load', () => frame.contentWindow?.scrollTo(0, currentScroll), { once: true });
  frame.srcdoc = renderWebsitePreview(content, activePage);
}
function queueDraftPreview() {
  clearTimeout(previewTimer);
  previewTimer = setTimeout(previewDocument, 180);
}
function editorMarkup() {
  const pageLinks = Object.entries(PAGE_NAMES).map(([key, label]) =>
    `<button type="button" class="website-tab ${activePage === key ? 'is-active' : ''}" data-page="${key}" aria-current="${activePage === key ? 'page' : 'false'}">${e(label)}</button>`
  ).join('');
  return `<section class="website-editor">
    <div class="website-editor-intro">
      <div><p class="eyebrow">SEMBULE MEDIA · PUBLIC WEBSITE</p><h2>Make the site sound like you.</h2><p>Update the words visitors see across the separate Hostinger website. Your draft and the public version stay separate until you publish.</p></div>
      <a class="button secondary" href="${WEBSITE_URL}" target="_blank" rel="noreferrer">Open live website <span aria-hidden="true">↗</span></a>
    </div>
    <div class="website-editor-status">
      <span class="website-status-dot"></span>
      <div><strong data-live-state>One-time site setup needed</strong><small data-last-published>No editor changes published yet</small></div>
      <a href="${WEBSITE_URL}" target="_blank" rel="noreferrer">Hostinger site ↗</a>
    </div>
    <div class="website-toolbar">
      <nav class="website-tabs" aria-label="Website page sections">${pageLinks}</nav>
      <div class="website-actions"><span class="website-save-state" data-save-state>Loading website…</span><button class="button secondary" type="button" data-save-draft disabled>Save draft</button><button class="button primary" type="button" data-publish disabled>Publish</button></div>
    </div>
    <div class="website-layout">
      <div class="website-editor-panel">
        <p class="website-last-saved" data-last-saved></p>
        <div class="website-field-content" data-fields></div>
      </div>
      <aside class="website-preview-panel">
        <div class="website-preview-heading"><div><p class="eyebrow">LIVE SITE PREVIEW</p><h3 data-preview-heading>Home page</h3></div><div class="website-preview-controls"><button type="button" data-mode="draft" class="is-active">Draft</button><button type="button" data-mode="live">Live</button><span></span><button type="button" data-size="desktop" class="is-active" aria-label="Desktop preview">Desktop</button><button type="button" data-size="mobile" aria-label="Mobile preview">Mobile</button></div></div>
        <div class="website-frame-shell"><iframe title="Website content preview" data-website-preview loading="lazy" sandbox="allow-same-origin"></iframe></div>
        <div class="website-preview-footer"><span data-preview-note>Draft preview · Changes here are not public until published.</span><a href="${WEBSITE_URL}" target="_blank" rel="noreferrer">Open in new tab ↗</a></div>
        <details class="website-setup"><summary>Connect the public site once</summary><p>Run the website content SQL in the Sembule Supabase project, deploy this Sembule OS update, then add the bridge script to the five public HTML pages. Full steps are in website-integration.md.</p><code>&lt;script type="module" src="${e(WEBSITE_BRIDGE_URL)}"&gt;&lt;/script&gt;</code></details>
      </aside>
    </div>
    <dialog class="website-publish-confirm" data-publish-confirm aria-labelledby="website-confirm-title" aria-describedby="website-confirm-copy"><div><p class="eyebrow">MAKE IT PUBLIC</p><h3 id="website-confirm-title">Publish these website changes?</h3><p id="website-confirm-copy">The published copy can be read by anyone who visits the Hostinger website after its one-time bridge setup.</p><p class="website-publish-error" data-publish-error role="alert" hidden></p><div><button class="button secondary" type="button" data-cancel-publish>Keep editing</button><button class="button primary" type="button" data-confirm-publish>Publish changes</button></div></div></dialog>
  </section>`;
}
function setFields() {
  const fieldHost = hostNode.querySelector('[data-fields]');
  fieldHost.innerHTML = editorSections();
  hostNode.querySelector('[data-preview-heading]').textContent = PAGE_NAMES[activePage];
  previewDocument();
  hostNode.querySelectorAll('[data-page]').forEach(button => {
    button.classList.toggle('is-active', button.dataset.page === activePage);
    button.setAttribute('aria-current', button.dataset.page === activePage ? 'page' : 'false');
  });
}
function validateContent() {
  const required = [
    ['home.hero.headline', 'Home headline'],
    ['services.heading', 'Services headline'],
    ['portfolio.heading', 'Selected work headline'],
    ['about.heading', 'About headline'],
    ['contact.heading', 'Contact headline']
  ];
  const missing = required.find(([path]) => !String(readPath(content, path)).trim());
  if (missing) throw new Error(missing[1] + ' cannot be empty.');
  for (const project of content.portfolio.projects || []) {
    if (project.link && !/^https:\/\//i.test(project.link)) throw new Error('Portfolio links must start with https://.');
  }
  for (const [name, url] of Object.entries(content.brand.socials || {})) {
    if (url && !/^https:\/\//i.test(url)) throw new Error(name + ' links must start with https://.');
  }
}
async function persist(client, identity, publish = false) {
  validateContent();
  const now = new Date().toISOString();
  const payload = { id: 'main', draft_content: content, updated_at: now, updated_by: identity.id };
  if (publish) Object.assign(payload, { published_content: content, published_at: now, published_by: identity.id });
  const { error } = await withTimeout(client.from('sembule_website_content').upsert(payload, { onConflict: 'id' }));
  if (error) throw new Error(error.message);
  savedContent = clone(content);
  savedAt = now;
  if (publish) {
    publishedContent = clone(content);
    publishedAt = now;
  }
  saveState();
}
async function loadWebsite(client) {
  const { data, error } = await withTimeout(client.from('sembule_website_content')
    .select('draft_content,published_content,updated_at,published_at')
    .eq('id', 'main').maybeSingle());
  if (error) throw new Error(error.message);
  if (!data) {
    content = clone(WEBSITE_DEFAULTS);
    savedContent = null;
    publishedContent = null;
    publishedAt = null;
    savedAt = null;
    return;
  }
  content = clone(data.draft_content || WEBSITE_DEFAULTS);
  savedContent = clone(data.draft_content || WEBSITE_DEFAULTS);
  publishedContent = data.published_content ? clone(data.published_content) : null;
  publishedAt = data.published_at || null;
  savedAt = data.updated_at || null;
}
export async function mountWebsite(context) {
  const { client, host, notify, identity } = context;
  clearTimeout(previewTimer);
  previewTimer = null;
  if (bridgeListener) window.removeEventListener('message', bridgeListener);
  bridgeConnected = false;
  if (identity.role !== 'owner') {
    host.innerHTML = '<section class="error-panel"><strong>Owner access required</strong><p>Website changes can only be managed by an owner account.</p></section>';
    return;
  }
  activePage = 'home';
  previewMode = 'draft';
  previewSize = 'desktop';
  hostNode = host;
  host.innerHTML = '<div class="module-loading">Loading website content…</div>';
  bridgeListener = event => {
    if (event.origin === new URL(WEBSITE_URL).origin && event.data?.type === 'SEMBULE_SITE_BRIDGE_READY') {
      bridgeConnected = true;
      saveState();
    }
  };
  window.addEventListener('message', bridgeListener);
  try {
    await loadWebsite(client);
    host.innerHTML = editorMarkup();
    setFields();
    saveState();
  } catch (error) {
    host.innerHTML = `<section class="error-panel"><strong>The website editor could not load.</strong><p>${e(error.message)}</p><p>Confirm that the website-content SQL migration has been run in the Sembule Supabase project and that this account has the owner role.</p><a href="${WEBSITE_URL}" target="_blank" rel="noreferrer">Open the Hostinger site ↗</a></section>`;
    return;
  }

  host.addEventListener('input', event => {
    const control = event.target.closest('[data-path]');
    if (!control) return;
    writePath(content, control.dataset.path, control.value);
    if (control.dataset.path.endsWith('.title')) {
      const summary = control.closest('details')?.querySelector('summary span:nth-child(2)');
      if (summary) summary.textContent = control.value || 'Untitled';
    }
    if (previewMode === 'draft') queueDraftPreview();
    saveState();
  });
  host.addEventListener('click', async event => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.dataset.page && button.dataset.page !== activePage) {
      activePage = button.dataset.page;
      setFields();
      saveState();
      return;
    }
    if (button.dataset.mode) {
      previewMode = button.dataset.mode;
      host.querySelectorAll('[data-mode]').forEach(item => item.classList.toggle('is-active', item.dataset.mode === previewMode));
      host.querySelector('[data-preview-note]').textContent = previewMode === 'draft'
        ? 'Draft preview · Changes here are not public until published.'
        : 'Live website · Showing what visitors can currently see.';
      previewDocument();
      return;
    }
    if (button.dataset.size) {
      previewSize = button.dataset.size;
      host.querySelectorAll('[data-size]').forEach(item => item.classList.toggle('is-active', item.dataset.size === previewSize));
      const frame = host.querySelector('[data-website-preview]');
      frame.classList.toggle('is-mobile', previewSize === 'mobile');
      return;
    }
    if (button.hasAttribute('data-save-draft')) {
      button.disabled = true;
      button.textContent = 'Saving…';
      try {
        await persist(client, identity);
        notify('Website draft saved. The public website is unchanged.');
      } catch (error) { notify('Draft could not be saved: ' + error.message); }
      finally { button.textContent = 'Save draft'; saveState(); }
      return;
    }
    if (button.hasAttribute('data-publish')) {
      host.querySelector('[data-publish-confirm]').showModal();
      return;
    }
    if (button.hasAttribute('data-cancel-publish')) {
      host.querySelector('[data-publish-confirm]').close();
      return;
    }
    if (button.hasAttribute('data-confirm-publish')) {
      const confirm = host.querySelector('[data-confirm-publish]');
      const errorMessage = host.querySelector('[data-publish-error]');
      confirm.disabled = true;
      confirm.textContent = 'Publishing…';
      if (errorMessage) { errorMessage.hidden = true; errorMessage.textContent = ''; }
      try {
        await persist(client, identity, true);
        host.querySelector('[data-publish-confirm]').close();
        previewMode = 'live';
        host.querySelectorAll('[data-mode]').forEach(item => item.classList.toggle('is-active', item.dataset.mode === 'live'));
        host.querySelector('[data-preview-note]').textContent = 'Published copy · the live site reads this after the bridge is installed.';
        previewDocument();
        notify('Website changes published. They will appear on the Hostinger site after its one-time bridge setup.');
      } catch (error) {
        if (errorMessage) {
          errorMessage.textContent = 'Could not publish: ' + (error.message || 'Please check your connection and try again.');
          errorMessage.hidden = false;
        } else notify('Changes could not be published: ' + error.message);
      } finally {
        confirm.disabled = false;
        confirm.textContent = 'Publish changes';
      }
      saveState();
    }
  });
}
