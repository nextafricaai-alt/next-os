import { canViewMoney } from '../roles.js';
import { CONFIG } from '../config.js';
import { escapeHTML } from '../utils.js';
import { icon } from './icons.js';
export function dashboardView(identity) {
  const cards = [
    ['Enquiries needing action', 'inbox', 'leads', 'Follow up on new conversations'],
    ['Upcoming jobs', 'clapper', 'jobs', 'Prepare for what is ahead'],
    ['Late deliveries', 'clock', 'delivery', 'Keep every handover on track'],
    ['Equipment out', 'camera', 'equipment', 'Follow each item to its return']
  ];
  if (canViewMoney(identity.role)) cards.push(['Balances due', 'wallet', 'invoices', 'Keep client payments in view'], ['Profit per job', 'receipt', 'expenses', 'Understand production costs']);
  return `<section class="welcome-band"><div><p class="eyebrow">MADE FOR THE WAY YOU WORK</p><h2>Bring the day into focus.</h2><p>Your enquiries, productions and people. All in one place.</p></div><div class="welcome-mark">${icon('clapper')}</div></section>
    <section aria-labelledby="snapshot-title"><div class="section-heading"><h2 id="snapshot-title">At a glance</h2><span class="subtle-label">${identity.preview ? 'Preview • No live data' : 'Dashboard setup in progress'}</span></div>
    <div class="stat-grid">${cards.map(([title, symbol, route, description]) => `<a class="stat-card" href="#${route}"><div class="stat-top"><span>${escapeHTML(title)}</span>${icon(symbol)}</div><strong class="stat-value" aria-label="Not yet available">···</strong><div class="stat-bottom"><span>${description}</span>${icon('arrow')}</div></a>`).join('')}</div></section>
    <div class="dashboard-columns"><section class="panel"><div class="panel-heading"><h2>Upcoming productions</h2><a href="#calendar">View calendar ${icon('arrow')}</a></div><div class="empty-state"><span class="empty-icon">${icon('calendar')}</span><h3>A clear view of what is ahead.</h3><p>Your scheduled jobs will appear here when the workspace is ready.</p><a href="#jobs" class="button secondary">Explore jobs ${icon('arrow')}</a></div></section>
    <section class="panel"><div class="panel-heading"><h2>Quick access</h2><span class="subtle-label">YOUR WORKSPACE</span></div><div class="quick-links">${[['leads','inbox','Enquiries','Start with the conversation'],['crew','users','Crew directory','Bring your people together'],['equipment','camera','Equipment','Keep the kit accounted for']].map(([route,symbol,title,detail]) => `<a href="#${route}"><span class="quick-icon">${icon(symbol)}</span><span><strong>${title}</strong><small>${detail}</small></span>${icon('arrow')}</a>`).join('')}</div></section></div>
    <section class="panel pipeline"><div class="panel-heading"><h2>The production journey</h2><span class="subtle-label">FROM ENQUIRY TO DELIVERY</span></div><ol>${CONFIG.stages.map((stage,i) => `<li><span>${String(i+1).padStart(2,'0')}</span>${escapeHTML(stage)}</li>`).join('')}</ol></section>`;
}
