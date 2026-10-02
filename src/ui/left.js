// Left rail: SCREENS (uploads) and MOCKUPS (compositions + add device).
import { h, ICON, pickFiles } from './dom.js';
import { mod, key, readout } from './controls.js';
import { app, addFiles, replaceAsset, removeAsset, applyTemplate, addDevice, assignScreen } from '../app.js';
import { assets, ACCEPT } from '../assets.js';
import { TEMPLATES, DEVICE_TYPES, deviceExtent, makeDevice } from '../model.js';

export const DRAG_ASSET = 'application/x-mockbay-asset';

function templateSvg(t) {
  const devs = t.devices.map(makeDevice);
  let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
  const shapes = devs.map((d) => {
    const e = deviceExtent(d);
    const w = e.w * d.scale * Math.max(0.55, Math.cos((d.rot[1] * Math.PI) / 180));
    const hh = e.h * d.scale;
    minX = Math.min(minX, d.pos[0] - w / 2); maxX = Math.max(maxX, d.pos[0] + w / 2);
    minY = Math.min(minY, d.pos[1] - hh / 2); maxY = Math.max(maxY, d.pos[1] + hh / 2);
    return { d, w, h: hh };
  });
  const k = Math.min(78 / (maxX - minX || 1), 42 / (maxY - minY || 1));
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 100 56'); svg.setAttribute('aria-hidden', 'true');
  shapes.sort((a, b) => a.d.pos[2] - b.d.pos[2]).forEach(({ d, w, h: hh }) => {
    const r = document.createElementNS(NS, 'rect');
    const x = 50 + (d.pos[0] - cx) * k, y = 28 - (d.pos[1] - cy) * k;
    r.setAttribute('x', x - (w * k) / 2); r.setAttribute('y', y - (hh * k) / 2);
    r.setAttribute('width', w * k); r.setAttribute('height', hh * k);
    r.setAttribute('rx', d.type === 'phone' ? 3.5 : 2);
    r.setAttribute('fill', d.type === 'panel' ? '#eee9de' : d.color); r.setAttribute('stroke', '#15161c'); r.setAttribute('stroke-width', '2');
    if (d.rot[2]) r.setAttribute('transform', `rotate(${-d.rot[2]} ${x} ${y})`);
    svg.append(r);
    const s = document.createElementNS(NS, 'rect');
    s.setAttribute('x', x - (w * k) / 2 + 2); s.setAttribute('y', y - (hh * k) / 2 + 2);
    s.setAttribute('width', Math.max(1, w * k - 4)); s.setAttribute('height', Math.max(1, hh * k - 4)); s.setAttribute('rx', 1.5);
    s.setAttribute('fill', '#2659c9'); s.setAttribute('opacity', '.9');
    if (d.rot[2]) s.setAttribute('transform', `rotate(${-d.rot[2]} ${x} ${y})`);
    svg.append(s);
  });
  return svg;
}

export function buildLeft() {
  // ---- SCREENS
  const grid = h('div', { class: 'mb-assets' });
  const hint = readout('Drag a screen onto a device');
  const drop = h('button', { type: 'button', class: 'mb-drop', onclick: async () => { const f = await pickFiles(ACCEPT); if (f.length) addFiles(f); } },
    h('span', { class: 'mb-drop-ic', html: ICON.up }), h('strong', { class: 'an-display', text: 'Upload screens' }), h('span', { class: 'mb-drop-sub', text: 'PNG · JPG · WebP · MP4 · WebM' }));
  const screensMod = mod('Screens', { family: 'smoke', ch: 'CH 1', led: '' }, drop, grid, hint);

  let lastSig = '';
  function syncScreens() {
    const p = app.store.state;
    const used = new Set(p.devices.map((d) => d.screen.assetId).filter(Boolean));
    screensMod.setLed(used.size ? 'ok' : p.assets.length ? 'warn' : '');
    hint.textContent = p.assets.length ? 'Drag a screen onto a device, or pick one in Device › Screen' : 'Upload at least one screen to replace the placeholder';
    const sig = p.assets.join() + '|' + [...used].join();
    if (sig === lastSig) return;
    lastSig = sig;
    grid.replaceChildren(...p.assets.map((id) => {
      const a = assets.get(id);
      if (!a) return h('span');
      const inUse = used.has(id);
      const el = h('div', { class: `mb-asset${inUse ? ' is-used' : ''}`, draggable: 'true', title: `${a.name} — drag onto a device` },
        h('img', { src: a.thumb, alt: a.name, draggable: 'false' }),
        a.kind === 'video' ? h('span', { class: 'mb-badge', html: ICON.film }) : null,
        h('span', { class: 'mb-asset-name', text: a.name }),
        h('div', { class: 'mb-asset-acts' },
          key('', { icon: ICON.swap, title: 'Replace this screen everywhere it is used', className: 'mb-mini', onClick: async (e) => { e.stopPropagation(); const f = await pickFiles(ACCEPT, false); if (f[0]) replaceAsset(id, f[0]); } }),
          key('', { icon: ICON.x, title: 'Remove from library', className: 'mb-mini', onClick: (e) => { e.stopPropagation(); removeAsset(id); } })));
      el.addEventListener('dragstart', (e) => { e.dataTransfer.setData(DRAG_ASSET, id); e.dataTransfer.effectAllowed = 'copy'; });
      el.addEventListener('click', () => { const sel = app.store.selected; if (sel) assignScreen(sel.id, id); });
      return el;
    }));
  }

  // ---- MOCKUPS
  const tgrid = h('div', { class: 'mb-templates' }, TEMPLATES.map((t) => {
    const b = h('button', { type: 'button', class: 'mb-tpl', 'data-id': t.id, 'aria-pressed': 'false', onclick: () => applyTemplate(t.id) }, templateSvg(t), h('span', { text: t.name }));
    return b;
  }));
  const addRow = h('div', { class: 'mb-addrow' }, Object.entries(DEVICE_TYPES).map(([type, v]) => key(v.name, { icon: ICON.plus, className: 'mb-addkey', title: `Add a ${v.name.toLowerCase()}`, onClick: () => addDevice(type) })));
  const mockMod = mod('Mockups', { family: 'smoke', ch: 'CH 2' }, tgrid, h('span', { class: 'mb-lbl', text: 'Add a device' }), addRow);
  const syncMock = () => { for (const b of tgrid.children) b.setAttribute('aria-pressed', b.dataset.id === app.store.state.template); };

  const el = h('div', { class: 'mb-stack' }, screensMod, mockMod);
  return { el, sync() { syncScreens(); syncMock(); } };
}
