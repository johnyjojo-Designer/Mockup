export function h(tag, props = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') { for (const [sk, sv] of Object.entries(v)) { if (sk.startsWith('--')) el.style.setProperty(sk, sv); else el.style[sk] = sv; } }
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'text') el.textContent = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return el;
}

const P = (d, extra = '') => `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${d}</svg>`;
export const ICON = {
  play: P('<path d="M7 4.5v15l12-7.5z" fill="currentColor"/>'),
  pause: P('<path d="M8 5v14M16 5v14"/>'),
  undo: P('<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>'),
  redo: P('<path d="m15 14 5-5-5-5"/><path d="M20 9H10a6 6 0 0 0 0 12h3"/>'),
  up: P('<path d="M12 19V5M5 12l7-7 7 7"/>'),
  plus: P('<path d="M12 5v14M5 12h14"/>'),
  x: P('<path d="M6 6l12 12M18 6 6 18"/>'),
  copy: P('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M4 16V6a2 2 0 0 1 2-2h10"/>'),
  swap: P('<path d="M4 8h13l-3-3M20 16H7l3 3"/>'),
  download: P('<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>'),
  arrow: P('<path d="M5 12h14M13 6l6 6-6 6"/>', 'width="40" height="40"'),
  img: P('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.5"/><path d="m21 16-5-5-8 8"/>'),
  film: P('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 4v16M16 4v16M3 9h5M3 15h5M16 9h5M16 15h5"/>'),
  folder: P('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'),
  moon: P('<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/>'),
  bolt: P('<path d="M13 3 5 14h6l-1 7 8-11h-6z"/>'),
  trash: P('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),
  target: P('<circle cx="12" cy="12" r="8"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>'),
};

export function toast(msg, kind = 'ok') {
  let box = document.getElementById('toasts');
  if (!box) { box = h('div', { id: 'toasts', class: 'mb-toasts', 'aria-live': 'polite' }); document.body.append(box); }
  const t = h('div', { class: `mb-toast an-slab an-smoke ${kind === 'err' ? 'is-err' : ''}` }, h('span', { class: 'an-led', 'data-s': kind === 'err' ? 'err' : 'ok' }), h('span', { class: 'an-readout', text: msg }));
  box.append(t);
  setTimeout(() => t.remove(), kind === 'err' ? 6500 : 3200);
}

export function pickFiles(accept, multiple = true) {
  return new Promise((resolve) => {
    const i = h('input', { type: 'file', accept, multiple: multiple ? true : undefined, style: { display: 'none' } });
    i.addEventListener('change', () => { resolve([...i.files]); i.remove(); });
    i.addEventListener('cancel', () => { resolve([]); i.remove(); });
    document.body.append(i);
    i.click();
  });
}
