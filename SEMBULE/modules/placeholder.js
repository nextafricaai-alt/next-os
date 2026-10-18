import { escapeHTML } from '../utils.js';
import { icon } from './icons.js';
export function placeholderView(route) {
  return `<section class="panel placeholder"><span class="empty-icon">${icon(route.icon)}</span><p class="eyebrow">YOUR WORKSPACE IS TAKING SHAPE</p><h2>${escapeHTML(route.label)}</h2><p>${escapeHTML(route.note)}</p><p class="muted">This area is being prepared. No records or changes can be saved here yet.</p><a class="button primary" href="#dashboard">Back to overview ${icon('arrow')}</a></section>`;
}
