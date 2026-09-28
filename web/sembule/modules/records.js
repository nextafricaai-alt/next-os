import { escapeHTML } from '../utils.js';

export const e = escapeHTML;
export const value = input => input == null ? '' : escapeHTML(input);
export const dateValue = input => input ? String(input).slice(0, 10) : '';
export const dateTimeValue = input => input ? new Date(input).toISOString().slice(0, 16) : '';
export function readableDate(input, time = false) {
  if (!input) return 'Not set';
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', ...(time ? { timeStyle: 'short' } : {}), timeZone: 'Africa/Kampala' }).format(new Date(input));
}
export function empty(message) { return `<div class="record-empty"><p>${e(message)}</p></div>`; }
export function field(name, label, current = '', options = {}) {
  const required = options.required ? ' required' : '';
  const type = options.type || 'text';
  const extra = options.extra || '';
  return `<label>${e(label)}<input name="${e(name)}" type="${e(type)}" value="${value(current)}"${required} ${extra}></label>`;
}
export function selectField(name, label, current, choices) {
  return `<label>${e(label)}<select name="${e(name)}">${choices.map(([key, text]) => `<option value="${e(key)}"${key === current ? ' selected' : ''}>${e(text)}</option>`).join('')}</select></label>`;
}
export function textArea(name, label, current = '', hint = '') {
  return `<label class="span-2">${e(label)}${hint ? `<small>${e(hint)}</small>` : ''}<textarea name="${e(name)}" rows="4">${value(current)}</textarea></label>`;
}
export function formActions(id, owner) {
  return `<div class="form-actions span-2"><button class="button primary" type="submit">Save</button><button class="button secondary" type="button" data-cancel>Cancel</button>${id && owner ? '<button class="button danger" type="button" data-delete>Delete</button>' : ''}</div>`;
}
export function setBusy(form, busy) {
  [...form.elements].forEach(control => control.disabled = busy);
  const save = form.querySelector('[type=submit]');
  if (save) save.textContent = busy ? 'Saving…' : 'Save';
}
