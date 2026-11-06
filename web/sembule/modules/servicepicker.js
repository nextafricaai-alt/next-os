// Service picker: every Sembule package, grouped and searchable. Tap one to fill the item; price and words can still be changed.
import { e } from './records.js';
import { money } from '../refs.js';

export const SERVICE_CATEGORIES = [['livestream', 'Livestream'], ['screens', 'Screens and LED'], ['sound', 'Sound and DJ'], ['weddings', 'Weddings and introductions'], ['photo_video', 'Photo and video'], ['production', 'Music videos, films and podcasts'], ['extras', 'Extras']];
const catOf = s => s.category || 'extras';
const priceOf = s => s.pricing_method === 'cost_plus' ? `cost + ${Number(s.suggested_markup_percent || 0)}%` : money(s.starting_price_ugx);

// name: hidden input that carries the chosen service id ('' = custom item).
export function pickerHTML(services, name = 'service') {
  const list = services.filter(s => s.active).sort((a, b) => (a.sort ?? 999) - (b.sort ?? 999) || a.name.localeCompare(b.name));
  const cats = SERVICE_CATEGORIES.filter(([k]) => list.some(s => catOf(s) === k));
  return `<div class="span-2 svc-pick" data-picker><input type="hidden" name="${e(name)}" value="">
    <div class="svc-pick-top"><input type="search" class="svc-search" placeholder="Search: livestream, wedding, LED, burial, zoom…" data-psearch><button type="button" class="text-button" data-pcustom>+ Item not in the list</button></div>
    <div class="chip-row svc-cats"><button type="button" class="chip on" data-pcat="all">All</button>${cats.map(([k, l]) => `<button type="button" class="chip" data-pcat="${k}">${e(l)}</button>`).join('')}</div>
    <div class="svc-list" data-plist>${list.map(s => `<button type="button" class="svc-item" data-pid="${s.id}" data-pcatof="${e(catOf(s))}" data-ptext="${e((s.name + ' ' + (s.scope_notes || '') + ' ' + (s.category || '')).toLowerCase())}">
      <span><b>${e(s.name)}</b><small>${e(s.scope_notes || '')}</small></span><span class="svc-price">${priceOf(s)}<em>per ${e(s.unit)}${s.price_status === 'suggested' ? ' · suggested' : ''}</em></span></button>`).join('')}</div>
    <p class="svc-chosen muted small-note" data-pchosen>Tap a package above, or add an item that is not in the list.</p></div>`;
}

// onPick(service|null): null means a custom item.
export function bindPicker(root, services, onPick) {
  const box = root.querySelector('[data-picker]'); if (!box) return;
  const hidden = box.querySelector('input[type=hidden]'), items = [...box.querySelectorAll('[data-pid]')], chosen = box.querySelector('[data-pchosen]');
  let cat = 'all';
  const filter = () => { const t = box.querySelector('[data-psearch]').value.trim().toLowerCase(); items.forEach(b => { b.hidden = !((cat === 'all' || b.dataset.pcatof === cat) && (!t || t.split(/\s+/).every(w => b.dataset.ptext.includes(w)))); }); };
  box.querySelector('[data-psearch]').addEventListener('input', filter);
  box.querySelectorAll('[data-pcat]').forEach(c => c.addEventListener('click', () => { cat = c.dataset.pcat; box.querySelectorAll('[data-pcat]').forEach(x => x.classList.toggle('on', x === c)); filter(); }));
  items.forEach(b => b.addEventListener('click', () => {
    const s = services.find(x => x.id === b.dataset.pid); if (!s) return;
    items.forEach(x => x.classList.toggle('on', x === b)); hidden.value = s.id;
    chosen.innerHTML = `Selected: <b>${e(s.name)}</b> · ${priceOf(s)} per ${e(s.unit)}. You can change the words or the price below before adding.`;
    onPick(s);
  }));
  box.querySelector('[data-pcustom]').addEventListener('click', () => { items.forEach(x => x.classList.remove('on')); hidden.value = '__custom'; chosen.innerHTML = '<b>Custom item.</b> Type the description and the price below.'; onPick(null); });
}
