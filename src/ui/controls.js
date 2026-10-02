// Reusable controls styled with the Anime design system: slider (screen well + keycap thumb + LCD value),
// segmented keys, switch, swatches, and module slabs.
import { h } from './dom.js';

let seq = 0;

/** Module slab with tag, channel and LED. */
export function mod(title, { family = 'bone', ch = '', led = null, className = '' } = {}, ...kids) {
  const ledEl = led ? h('span', { class: 'an-led', 'data-s': led }) : null;
  const head = h('div', { class: 'an-mod-head' }, h('span', { class: 'an-tag', text: title }), ch ? h('span', { class: 'an-ch', text: ch }) : null, ledEl);
  const el = h('section', { class: `an-slab an-mod an-${family} ${className}`, 'aria-label': title }, head, ...kids);
  el.setLed = (s) => { if (ledEl) ledEl.dataset.s = s || ''; };
  return el;
}

export function row(...kids) { return h('div', { class: 'mb-row' }, ...kids); }
export function label(text) { return h('span', { class: 'mb-lbl', text }); }

export function slider({ label: lab, min, max, step = 0.01, get, set, fmt = (v) => v.toFixed(2), key, adv = false, onCommit }) {
  const id = `sl${++seq}`;
  const input = h('input', { type: 'range', id, min, max, step, class: 'mb-range' });
  const out = h('output', { class: 'mb-lcd', for: id });
  const wrap = h('div', { class: `mb-slider${adv ? ' is-adv' : ''}` },
    h('label', { class: 'mb-lbl', for: id, text: lab }), out, input);
  const paint = () => {
    const v = get();
    input.value = v; out.textContent = fmt(v);
    const pct = ((v - min) / (max - min)) * 100;
    input.style.setProperty('--pct', `${Math.max(0, Math.min(100, pct))}%`);
  };
  input.addEventListener('input', () => { set(parseFloat(input.value)); paint(); });
  input.addEventListener('change', () => onCommit?.());
  input.addEventListener('dblclick', () => { /* double-click resets handled by caller via reset keys */ });
  wrap.sync = paint;
  wrap.input = input;
  paint();
  return wrap;
}

/** Row of keycaps; the active one is pressed. */
export function seg({ options, get, set, className = '', aria = '' }) {
  const wrap = h('div', { class: `mb-seg ${className}`, role: 'group', 'aria-label': aria });
  const btns = options.map((o) => {
    const b = h('button', { class: 'an-key an-key--sm mb-segkey', type: 'button', 'aria-pressed': 'false', title: o.title || '', onclick: () => set(o.id) },
      h('span', { class: 'an-key-cap', html: o.html }, o.html ? null : o.name));
    if (!o.html) b.firstChild.textContent = o.name;
    b.dataset.id = o.id;
    return b;
  });
  wrap.append(...btns);
  const paint = () => { const v = get(); for (const b of btns) { const on = b.dataset.id === String(v); b.classList.toggle('is-down', on); b.setAttribute('aria-pressed', on); } };
  wrap.sync = paint;
  paint();
  return wrap;
}

export function toggle({ label: lab, get, set, onText = 'ON', offText = 'OFF' }) {
  const id = `sw${++seq}`;
  const sw = h('button', { class: 'an-switch', type: 'button', role: 'switch', 'aria-checked': 'false', 'aria-labelledby': id },
    h('span', { class: 'an-lbl an-l-on', text: onText }), h('span', { class: 'an-lbl an-l-off', text: offText }), h('span', { class: 'an-thumb' }));
  sw.addEventListener('click', () => set(sw.getAttribute('aria-checked') !== 'true'));
  const wrap = h('div', { class: 'mb-toggle' }, h('span', { class: 'mb-lbl', id, text: lab }), sw);
  const paint = () => sw.setAttribute('aria-checked', !!get());
  wrap.sync = paint;
  paint();
  return wrap;
}

export function key(text, { onClick, icon, className = '', title = '', hot = false } = {}) {
  const b = h('button', { class: `an-key an-key--sm ${hot ? 'mb-hot' : ''} ${className}`, type: 'button', title, onclick: onClick },
    h('span', { class: 'an-key-cap' }, icon ? h('span', { html: icon, class: 'mb-ic' }) : null, text ? h('span', { text }) : null));
  if (!text && title) b.setAttribute('aria-label', title);
  return b;
}

export function swatches({ colors, get, set, custom = true, className = '' }) {
  const wrap = h('div', { class: `mb-swatches ${className}`, role: 'group' });
  const btns = colors.map((c) => h('button', { type: 'button', class: 'mb-sw', style: { '--c': c }, title: c, 'aria-label': `Colour ${c}`, 'aria-pressed': 'false', 'data-c': c.toLowerCase(), onclick: () => set(c) }));
  wrap.append(...btns);
  let ci = null;
  if (custom) {
    ci = h('input', { type: 'color', class: 'mb-sw mb-sw-custom', title: 'Custom colour', 'aria-label': 'Custom colour' });
    ci.addEventListener('input', () => set(ci.value));
    wrap.append(ci);
  }
  wrap.sync = () => {
    const v = String(get()).toLowerCase();
    for (const b of btns) b.setAttribute('aria-pressed', b.dataset.c === v);
    if (ci && /^#[0-9a-f]{6}$/.test(v)) ci.value = v;
  };
  wrap.sync();
  return wrap;
}

export function numberField({ label: lab, get, set, min, max, step = 1 }) {
  const id = `nf${++seq}`;
  const input = h('input', { type: 'number', id, min, max, step, class: 'mb-num' });
  input.addEventListener('change', () => { let v = parseFloat(input.value); if (Number.isNaN(v)) v = get(); v = Math.min(max, Math.max(min, v)); set(v); input.value = get(); });
  const wrap = h('div', { class: 'mb-numwrap' }, h('label', { class: 'mb-lbl', for: id, text: lab }), h('div', { class: 'an-screen mb-numscreen' }, input));
  wrap.sync = () => { if (document.activeElement !== input) input.value = get(); };
  wrap.sync();
  return wrap;
}

export function textField({ label: lab, get, set, placeholder = '', maxlength = 60 }) {
  const id = `tf${++seq}`;
  const input = h('input', { type: 'text', id, placeholder, maxlength, class: 'mb-text', autocomplete: 'off' });
  input.addEventListener('change', () => set(input.value.trim()));
  const wrap = h('div', { class: 'mb-textwrap' }, lab ? h('label', { class: 'mb-lbl', for: id, text: lab }) : null, h('div', { class: 'an-screen' }, input));
  wrap.sync = () => { if (document.activeElement !== input) input.value = get(); };
  wrap.input = input;
  wrap.sync();
  return wrap;
}

export function readout(text = '') { return h('p', { class: 'an-readout', text }); }

/** Hold a set of controls and refresh them together. */
export class Group {
  constructor() { this.items = []; }
  add(c) { this.items.push(c); return c; }
  sync() { for (const c of this.items) c.sync?.(); }
}
