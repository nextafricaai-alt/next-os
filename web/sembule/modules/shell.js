import { CONFIG } from '../config.js';
import { ROLES, routesFor } from '../roles.js';
import { escapeHTML, dateLabel, initials } from '../utils.js';
import { icon } from './icons.js';
export function shellView(identity, route, content) {
  const routes = routesFor(identity.role);
  const groups = [...new Set(routes.map(item => item.group))];
  return `<a class="skip-link" href="#main-content">Skip to content</a><div class="workspace">
    <aside id="sidebar" class="sidebar" aria-label="Workspace navigation"><a href="#dashboard" class="brand"><img src="${CONFIG.logo}" alt="Sembule Media"><span>OPERATING SYSTEM</span></a><button id="close-menu" class="icon-button mobile-close" aria-label="Close menu">${icon('close')}</button>
      <nav>${groups.map(group => `<div class="nav-group"><p>${group}</p>${routes.filter(item => item.group === group).map(item => `<a href="#${item.id}" ${route.id === item.id ? 'aria-current="page"' : ''}>${icon(item.icon)}<span>${item.label}</span>${route.id === item.id ? '<i></i>' : ''}</a>`).join('')}</div>`).join('')}</nav>
      <div class="sidebar-bottom"><button class="install-button" data-install>${icon('download')}<span>Install on your phone</span></button><p>Sembule Media Ltd <span>v${CONFIG.version}</span></p></div>
    </aside><button id="menu-backdrop" class="menu-backdrop" tabindex="-1" aria-label="Close menu"></button>
    <div class="workspace-main"><header class="topbar"><div class="topbar-left"><button id="open-menu" class="icon-button mobile-menu" aria-label="Open menu" aria-controls="sidebar" aria-expanded="false">${icon('menu')}</button><span class="breadcrumb">Workspace <span>/</span> <strong>${escapeHTML(route.label)}</strong></span></div><div class="account"><span class="avatar">${escapeHTML(initials(identity.name))}</span><span class="account-name"><strong>${escapeHTML(identity.name)}</strong><small>${ROLES[identity.role]}</small></span><button id="sign-out" class="icon-button" aria-label="${identity.preview ? 'Exit preview' : 'Sign out'}" title="${identity.preview ? 'Exit preview' : 'Sign out'}">${icon('logout')}</button></div></header>
      ${identity.preview ? `<div class="preview-banner"><span>Local preview <span class="banner-detail">• ${ROLES[identity.role]} • No live data</span></span><button id="exit-preview">Change role / exit</button></div>` : ''}
      <div id="connection-banner" class="connection-banner" role="status" hidden>You are offline. Reconnect to sign in and continue.</div>
      <main id="main-content" tabindex="-1"><div class="page-heading"><div><p class="eyebrow">${escapeHTML(dateLabel())}</p><h1>${escapeHTML(route.label)}</h1></div><span class="workspace-badge"><span></span>${identity.preview ? 'Preview workspace' : 'Sembule workspace'}</span></div><div id="route-content">${content}</div><footer class="workspace-footer"><span>Sembule Media</span><span>Plan with clarity. Create with confidence.</span></footer></main>
    </div></div>`;
}
