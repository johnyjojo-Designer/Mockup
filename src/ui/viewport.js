// Centre column: live preview (direct manipulation, drag-and-drop), format strip and timeline.
import { h, ICON, toast } from './dom.js';
import { key, seg, toggle, readout, mod } from './controls.js';
import { app, set, addFiles, assignScreen, setAspect } from '../app.js';
import { ASPECTS, clamp } from '../model.js';
import { DRAG_ASSET } from './left.js';
import { runImageExport } from './exportdlg.js';

const fmtTime = (t) => { const m = Math.floor(t / 60), s = t - m * 60; return `${String(m).padStart(2, '0')}:${s.toFixed(1).padStart(4, '0')}`; };

export function buildViewport() {
  const { store, engine } = app;
  const well = h('div', { class: 'mb-well an-screen', tabindex: '0', role: 'application', 'aria-label': 'Scene preview. Drag a device to move it, scroll to scale, drag empty space to orbit the camera.' });
  const canvas = engine.view;
  canvas.className = 'mb-canvas';
  const checker = h('div', { class: 'mb-checker' });
  const overlay = h('div', { class: 'mb-sel', hidden: true }, h('span', { class: 'mb-sel-tag', text: '' }));
  const dropHi = h('div', { class: 'mb-drophi', hidden: true });
  const banner = h('div', { class: 'mb-banner', hidden: true });
  const emptyHint = h('div', { class: 'mb-empty-hint', hidden: true }, h('span', { class: 'an-tag', text: 'Drop screens here' }), h('span', { class: 'an-readout', text: 'or press Upload on Ch 1' }));
  const frame = h('div', { class: 'mb-frame' }, checker, canvas, overlay, dropHi);
  well.append(frame, banner, emptyHint);

  // ---- fit the canvas aspect inside the well
  function layout() {
    const p = store.state;
    if (!p) return;
    const r = well.getBoundingClientRect();
    const aw = p.canvas.aspect === 'custom' ? p.canvas.w / p.canvas.h : (() => { const a = ASPECTS.find((x) => x.id === p.canvas.aspect) || ASPECTS[0]; return a.w / a.h; })();
    const pad = 28;
    let w = r.width - pad, hh = r.height - pad;
    if (w / hh > aw) w = hh * aw; else hh = w / aw;
    w = Math.max(80, Math.floor(w)); hh = Math.max(60, Math.floor(hh));
    frame.style.width = `${w}px`; frame.style.height = `${hh}px`;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const k = Math.min(1, 2400 / (Math.max(w, hh) * dpr));
    engine.resize(w * k, hh * k, dpr);
    canvas.style.width = `${w}px`; canvas.style.height = `${hh}px`;
  }
  new ResizeObserver(layout).observe(well);

  // ---- selection overlay follows the render
  function updateOverlay() {
    const id = store.ui.selected, p = store.state;
    const b = id ? engine.stage.screenBox(id) : null;
    const dev = store.selected;
    if (!b || !dev || !engine.stage.devices.get(id)?.root.visible) { overlay.hidden = true; return; }
    overlay.hidden = false;
    overlay.style.left = `${b.x0 * 100}%`; overlay.style.top = `${b.y0 * 100}%`;
    overlay.style.width = `${(b.x1 - b.x0) * 100}%`; overlay.style.height = `${(b.y1 - b.y0) * 100}%`;
    overlay.firstChild.textContent = `${p.devices.indexOf(dev) + 1} · ${dev.name || dev.type}`;
    checker.hidden = p.style.bg.type !== 'transparent';
    emptyHint.hidden = !(p.devices.length === 0);
  }
  engine.onFrame(updateOverlay);
  store.on((k) => { if (k === 'select') { updateOverlay(); } });

  const norm = (e) => { const r = frame.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height, w: r.width, h: r.height }; };

  // ---- pointer interaction
  let drag = null;
  frame.addEventListener('contextmenu', (e) => e.preventDefault());
  frame.addEventListener('pointerdown', (e) => {
    if (e.button === 1) e.preventDefault();
    const n = norm(e);
    const hit = engine.stage.pick(n.x, n.y);
    frame.setPointerCapture(e.pointerId);
    well.focus({ preventScroll: true });
    const p = store.state;
    if (hit) {
      store.select(hit);
      const d = p.devices.find((x) => x.id === hit);
      const rotate = e.altKey || e.button === 2 || e.metaKey;
      const start = engine.stage.planePoint(n.x, n.y, d.pos);
      drag = { mode: rotate ? 'rotate' : 'move', id: hit, sx: e.clientX, sy: e.clientY, pos: [...d.pos], rot: [...d.rot], start };
    } else {
      const c = p.camera;
      drag = { mode: e.shiftKey || e.button === 1 || e.button === 2 ? 'pan' : 'orbit', sx: e.clientX, sy: e.clientY, az: c.az, el: c.el, panX: c.panX, panY: c.panY };
    }
    frame.classList.add('is-drag');
    store.holding = true;
  });
  frame.addEventListener('pointermove', (e) => {
    if (!drag) { const n = norm(e); frame.style.cursor = engine.stage.pick(n.x, n.y) ? 'grab' : 'crosshair'; return; }
    const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
    const n = norm(e);
    if (drag.mode === 'move') {
      const cur = engine.stage.planePoint(n.x, n.y, drag.pos);
      if (!cur || !drag.start) return;
      const dv = cur.clone().sub(drag.start);
      set((p) => { const d = p.devices.find((x) => x.id === drag.id); if (d) d.pos = [drag.pos[0] + dv.x, drag.pos[1] + dv.y, drag.pos[2] + dv.z]; }, { key: `drag:${drag.id}` });
    } else if (drag.mode === 'rotate') {
      set((p) => { const d = p.devices.find((x) => x.id === drag.id); if (d) { d.rot[1] = drag.rot[1] + dx * 0.45; d.rot[0] = clamp(drag.rot[0] + dy * 0.35, -90, 90); } }, { key: `rot:${drag.id}` });
    } else if (drag.mode === 'orbit') {
      set((p) => { p.camera.az = clamp(drag.az - dx * 0.25, -85, 85); p.camera.el = clamp(drag.el + dy * 0.2, -40, 85); }, { key: 'orbit' });
    } else {
      const per = (p) => (Math.max(p.camera.frameH, p.camera.frameW / (n.w / n.h)) / p.camera.zoom) / n.h;
      set((p) => { p.camera.panX = drag.panX - dx * per(p); p.camera.panY = drag.panY + dy * per(p); }, { key: 'pan' });
    }
  });
  const end = () => { drag = null; store.holding = false; frame.classList.remove('is-drag'); };
  frame.addEventListener('pointerup', end);
  frame.addEventListener('pointercancel', end);
  frame.addEventListener('wheel', (e) => {
    e.preventDefault();
    const n = norm(e);
    const hit = engine.stage.pick(n.x, n.y);
    const f = Math.exp(-e.deltaY * 0.0016);
    if (hit && hit === store.ui.selected) set((p) => { const d = p.devices.find((x) => x.id === hit); if (d) d.scale = clamp(d.scale * f, 0.2, 3); }, { key: `scale:${hit}` });
    else set((p) => { p.camera.zoom = clamp(p.camera.zoom * f, 0.4, 3); }, { key: 'zoom' });
  }, { passive: false });

  // ---- drag & drop of files and library screens
  const deviceAt = (e) => { const n = norm(e); return engine.stage.pick(n.x, n.y); };
  const hasPayload = (e) => [...(e.dataTransfer?.types || [])].some((t) => t === 'Files' || t === DRAG_ASSET);
  frame.addEventListener('dragover', (e) => {
    if (!hasPayload(e)) return;
    e.preventDefault(); e.dataTransfer.dropEffect = 'copy';
    const id = deviceAt(e);
    const b = id ? engine.stage.screenBox(id) : null;
    dropHi.hidden = !b;
    if (b) { dropHi.style.left = `${b.x0 * 100}%`; dropHi.style.top = `${b.y0 * 100}%`; dropHi.style.width = `${(b.x1 - b.x0) * 100}%`; dropHi.style.height = `${(b.y1 - b.y0) * 100}%`; }
  });
  frame.addEventListener('dragleave', (e) => { if (!frame.contains(e.relatedTarget)) dropHi.hidden = true; });
  frame.addEventListener('drop', async (e) => {
    e.preventDefault(); dropHi.hidden = true;
    const id = deviceAt(e);
    const assetId = e.dataTransfer.getData(DRAG_ASSET);
    if (assetId) { if (id) assignScreen(id, assetId); else toast('Drop the screen onto a device'); return; }
    const files = [...e.dataTransfer.files];
    if (files.length) await addFiles(files, id);
  });

  // ---- keyboard
  well.addEventListener('keydown', (e) => {
    const d = store.selected;
    if (!d) return;
    const step = e.shiftKey ? 0.1 : 0.02;
    const mv = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] }[e.key];
    if (mv) { e.preventDefault(); set((p) => { const x = p.devices.find((q) => q.id === d.id); x.pos[0] += mv[0]; x.pos[1] += mv[1]; }, { key: `nudge:${d.id}` }); }
  });

  // ---- format strip
  const aspectSeg = seg({ aria: 'Canvas aspect ratio', options: [...ASPECTS.map((a) => ({ id: a.id, name: a.label })), { id: 'custom', name: 'Custom' }], get: () => store.state.canvas.aspect, set: setAspect });
  const sizeRead = readout('');
  const format = mod('Format', { family: 'bone', ch: 'CANVAS' }, aspectSeg, sizeRead);

  // ---- timeline
  const playBtn = key('', { icon: ICON.play, className: 'mb-play', title: 'Play / pause (Space)', onClick: () => engine.toggle() });
  const scrub = h('input', { type: 'range', class: 'mb-range mb-scrub', min: 0, max: 1000, step: 1, value: 0, 'aria-label': 'Timeline' });
  scrub.addEventListener('input', () => { engine.pause(); engine.setTime((scrub.value / 1000) * store.state.motion.duration); engine.dirty = true; paintTime(); });
  const time = h('output', { class: 'mb-lcd mb-time' });
  const frameBtn = key('Save frame', { icon: ICON.img, title: 'Export the frame at the playhead as an image', onClick: () => runImageExport() });
  const modeSeg = seg({ aria: 'Output type', options: [{ id: 'static', name: 'Still' }, { id: 'animated', name: 'Animate' }], get: () => store.state.motion.mode, set: (v) => { engine.pause(); set((p) => { p.motion.mode = v; }); if (v === 'animated') store.ui.tab = 'motion'; store.emit('select'); } });
  const loopTog = null;
  const tl = mod('Output', { family: 'red', ch: 'TIMELINE', className: 'mb-timeline' }, modeSeg, h('div', { class: 'mb-tl-row' }, playBtn, scrub, time, frameBtn));
  function paintTime() {
    const m = store.state.motion;
    const t = m.loop === 'once' ? Math.min(engine.t, m.duration) : engine.t % m.duration;
    time.textContent = `${fmtTime(t)} / ${fmtTime(m.duration)}`;
    if (document.activeElement !== scrub) scrub.value = Math.round((((engine.t % (m.loop === 'once' ? m.duration + 1 : m.duration)) / m.duration)) * 1000);
  }
  engine.onFrame(() => { if (store.state.motion.mode === 'animated') paintTime(); });

  const root = h('div', { class: 'mb-center' }, well, h('div', { class: 'mb-controls' }, format, tl));
  return {
    el: root,
    layout,
    sync() {
      const p = store.state;
      aspectSeg.sync(); modeSeg.sync();
      const anim = p.motion.mode === 'animated';
      tl.classList.toggle('is-still', !anim);
      tl.setLed(anim ? 'ok' : '');
      scrub.disabled = !anim || !!store.ui.editingPose; playBtn.disabled = !anim || !!store.ui.editingPose;
      playBtn.querySelector('.mb-ic').innerHTML = engine.playing ? ICON.pause : ICON.play;
      frameBtn.querySelector('span:last-child').textContent = anim ? 'Save frame' : 'Save image';
      const ed = store.ui.editingPose;
      banner.hidden = !ed; banner.textContent = ed ? `EDITING ${ed.slot.toUpperCase()} POSE · arrange the scene, then save in Motion › Poses` : '';
      sizeRead.textContent = p.canvas.aspect === 'custom' ? `${p.canvas.w} × ${p.canvas.h}` : '';
      layout();
      paintTime();
      emptyHint.hidden = p.devices.length > 0;
    },
  };
}
