import './styles/tokens.css';
import './styles/anime.css';
import './styles/app.css';
import { h, ICON, toast } from './ui/dom.js';
import { key, toggle, textField, mod } from './ui/controls.js';
import * as actions from './app.js';
import { boot, app, onApp, set, saveNow, removeDevice } from './app.js';
import { buildLeft } from './ui/left.js';
import { buildRight } from './ui/right.js';
import { buildViewport } from './ui/viewport.js';
import { openProjectsDialog } from './ui/projects.js';

const root = document.getElementById('app');

function theme(t) {
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem('mockbay:theme', t); } catch { /* ignore */ }
}
try { theme(localStorage.getItem('mockbay:theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')); } catch { theme('light'); }

async function start() {
  await boot();
  const { store, engine } = app;

  // ---- top bar
  const nameField = textField({ label: '', get: () => store.state.name, set: (v) => set((p) => { p.name = v || 'Untitled project'; }), placeholder: 'Project name' });
  nameField.classList.add('mb-projectname');
  nameField.input.setAttribute('aria-label', 'Project name');
  const led = h('span', { class: 'an-led', 'data-s': 'ok' });
  const saveText = h('span', { class: 'an-readout mb-save', text: 'Saved' });
  const undo = key('', { icon: ICON.undo, title: 'Undo (Ctrl/⌘ Z)', onClick: () => store.undo() });
  const redo = key('', { icon: ICON.redo, title: 'Redo (Ctrl/⌘ Shift Z)', onClick: () => store.redo() });
  const night = toggle({ label: 'Night', get: () => document.documentElement.dataset.theme === 'dark', set: (v) => { theme(v ? 'dark' : 'light'); night.sync(); } });
  const exportKey = h('button', { type: 'button', class: 'an-key mb-hot mb-exportkey', onclick: () => { store.ui.tab = 'export'; store.emit('select'); document.querySelector('.rail-right')?.scrollIntoView?.({ block: 'nearest' }); } },
    h('span', { class: 'an-key-cap' }, h('strong', { class: 'an-display', text: 'Export' }), h('span', { html: ICON.arrow, class: 'mb-arrow' })));
  const top = h('header', { class: 'an-slab an-blue mb-top' },
    h('div', { class: 'mb-brand' }, h('span', { class: 'an-display mb-logo', text: 'Mockbay' }), h('span', { class: 'an-eyebrow', text: 'Screens › Scene › Motion › Export' })),
    h('div', { class: 'mb-top-mid' }, nameField, h('div', { class: 'mb-savebox' }, led, saveText)),
    h('div', { class: 'mb-top-right' }, undo, redo, key('Projects', { icon: ICON.folder, onClick: openProjectsDialog }), night, exportKey));

  const left = buildLeft(), right = buildRight(), vp = buildViewport();

  const rail = (cls, kids) => h('aside', { class: `mb-rail ${cls}` }, kids);
  const centre = h('main', { class: 'mb-centre' }, vp.el);
  root.replaceChildren(top, h('div', { class: 'mb-work' }, centre, rail('rail-left', left.el), rail('rail-right', h('div', { class: 'mb-stack' }, vp.controls, right.el))));

  const engSize = { textContent: '' };
  let queued = false;
  function syncAll() {
    queued = false;
    nameField.sync(); night.sync();
    left.sync(); right.sync(); vp.sync();
    undo.disabled = !store.canUndo; redo.disabled = !store.canRedo;
    const s = app.saveState;
    led.dataset.s = s === 'saved' ? 'ok' : s === 'error' ? 'err' : 'warn';
    saveText.textContent = s === 'saved' ? 'Saved' : s === 'error' ? 'Save failed' : 'Saving…';
    const c = store.state.canvas;
    engSize.textContent = c.aspect === 'custom' ? `${c.w}×${c.h}` : c.aspect;
    document.title = `${store.state.name} · Mockbay`;
  }
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(syncAll); } };
  onApp(queue);
  syncAll();

  // keep the play icon honest
  setInterval(() => { const b = document.querySelector('.mb-play .mb-ic'); if (b) { const want = engine.playing ? ICON.pause : ICON.play; if (b.dataset.s !== String(engine.playing)) { b.innerHTML = want; b.dataset.s = String(engine.playing); } } }, 120);

  // a slider drag is one undo step, however slowly it renders
  window.addEventListener('pointerdown', (e) => { if (e.target instanceof HTMLInputElement && e.target.type === 'range') store.holding = true; }, true);
  window.addEventListener('pointerup', () => { store.holding = false; }, true);

  // ---- global shortcuts
  window.addEventListener('keydown', (e) => {
    const t = e.target;
    const typing = t instanceof HTMLElement && (t.tagName === 'INPUT' && !['range', 'checkbox', 'color'].includes(t.type) || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT');
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key.toLowerCase() === 'z' && !typing) { e.preventDefault(); e.shiftKey ? store.redo() : store.undo(); }
    else if (mod && e.key.toLowerCase() === 'y' && !typing) { e.preventDefault(); store.redo(); }
    else if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); saveNow().then(() => toast('Saved')); }
    else if (!typing && !mod && e.key === ' ' && !(t instanceof HTMLButtonElement)) { e.preventDefault(); engine.toggle(); queue(); }
    else if (!typing && (e.key === 'Delete' || e.key === 'Backspace') && t?.classList?.contains('mb-well')) { const d = store.selected; if (d) { e.preventDefault(); removeDevice(d.id); } }
  });

  window.__mockbay = { app, engine, actions };
  document.body.classList.add('is-ready');
}

start().catch((e) => {
  console.error(e);
  root.replaceChildren(h('div', { class: 'an-slab an-red', style: { margin: '40px auto', maxWidth: '520px' } }, h('strong', { class: 'an-display', text: 'Something broke' }), h('p', { text: String(e.message || e) })));
});
