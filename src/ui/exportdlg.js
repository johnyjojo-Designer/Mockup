// Export dialogs with progress, a verification preview and a working download.
import { h, ICON, toast } from './dom.js';
import { key } from './controls.js';
import { app, exportDims } from '../app.js';
import { exportImage, exportVideo, download } from '../exporter.js';
import { clampToGpu } from './right.js';

function safeName(p) { return (p.name || 'mockup').replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '') || 'mockup'; }

function modal(title) {
  const prev = document.activeElement;
  const body = h('div', { class: 'mb-modal-body' });
  const close = () => { back.remove(); prev?.focus?.(); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape' && !back.dataset.busy) close(); };
  const box = h('div', { class: 'an-slab an-bone mb-modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
    h('div', { class: 'an-mod-head' }, h('span', { class: 'an-tag', text: title })), body);
  const back = h('div', { class: 'mb-backdrop' }, box);
  document.body.append(back);
  document.addEventListener('keydown', onKey);
  return { body, close, back };
}

function progressBar() {
  const segs = Array.from({ length: 20 }, () => h('i'));
  const text = h('b', { text: '0%' });
  const el = h('div', { class: 'an-strength mb-progress', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': 0 }, h('div', { class: 'mb-segs' }, segs), text);
  return { el, set(f, label) { const n = Math.round(f * 20); segs.forEach((s, i) => s.classList.toggle('on', i < n)); text.textContent = label || `${Math.round(f * 100)}%`; el.setAttribute('aria-valuenow', Math.round(f * 100)); } };
}

export async function runImageExport() {
  const p = app.store.state;
  const raw = exportDims(p);
  const { w, h: hh } = clampToGpu(raw.w, raw.h);
  const format = p.export.image;
  const m = modal('Exporting image');
  m.back.dataset.busy = '1';
  const pb = progressBar();
  m.body.append(h('p', { class: 'an-readout', text: `Rendering ${w} × ${hh} px` }), pb.el);
  pb.set(0.4, 'RENDER');
  await new Promise((r) => setTimeout(r, 30));
  try {
    const blob = await exportImage(app.engine, { format, quality: p.export.quality, w, h: hh });
    delete m.back.dataset.busy;
    pb.set(1, 'DONE');
    const url = URL.createObjectURL(blob);
    const name = `${safeName(p)}.${format}`;
    m.body.replaceChildren(
      h('div', { class: `mb-result${p.style.bg.type === 'transparent' && format === 'png' ? ' is-checker' : ''}` }, h('img', { src: url, alt: 'Exported image preview' })),
      h('p', { class: 'an-readout', text: `${name} · ${w} × ${hh} px · ${(blob.size / 1024 / 1024).toFixed(2)} MB` }),
      h('div', { class: 'mb-row' }, key('Download', { hot: true, icon: ICON.download, onClick: () => download(blob, name) }), key('Close', { onClick: () => { m.close(); URL.revokeObjectURL(url); } })));
    download(blob, name);
  } catch (e) {
    delete m.back.dataset.busy;
    console.error(e);
    m.body.replaceChildren(h('p', { class: 'an-readout', text: e.message || 'Export failed' }), h('div', { class: 'mb-row' }, key('Close', { onClick: m.close })));
  }
}

export async function runVideoExport() {
  const p = app.store.state;
  if (p.motion.mode !== 'animated') { toast('Turn on ANIMATE first, then export video.', 'err'); return; }
  const d = exportDims(p, p.export.vlong ?? 1920);
  const { w, h: hh } = clampToGpu(Math.min(d.w, 3840), Math.min(d.h, 3840));
  const fps = p.export.fps;
  const m = modal('Exporting MP4');
  m.back.dataset.busy = '1';
  const ctl = new AbortController();
  const pb = progressBar();
  const info = h('p', { class: 'an-readout', text: `${w} × ${hh} · ${fps} fps · ${p.motion.duration.toFixed(1)} s` });
  m.body.append(info, pb.el, h('div', { class: 'mb-row' }, key('Cancel', { onClick: () => ctl.abort() })));
  const t0 = performance.now();
  try {
    const res = await exportVideo(app.engine, {
      w, h: hh, fps, bitrate: p.export.bitrate, signal: ctl.signal,
      onProgress: (f, i, n) => { const el = (performance.now() - t0) / 1000; pb.set(f, `${Math.round(f * 100)}%`); info.textContent = `Frame ${i} / ${n} · ${el.toFixed(0)} s elapsed`; },
    });
    delete m.back.dataset.busy;
    const url = URL.createObjectURL(res.blob);
    const name = `${safeName(p)}.mp4`;
    const video = h('video', { src: url, controls: true, loop: true, muted: true, autoplay: true, playsinline: true });
    m.body.replaceChildren(
      h('div', { class: 'mb-result' }, video),
      h('p', { class: 'an-readout', text: `${name} · ${res.w} × ${res.h} · ${fps} fps · ${res.codec} · ${(res.blob.size / 1024 / 1024).toFixed(2)} MB` }),
      h('div', { class: 'mb-row' }, key('Download MP4', { hot: true, icon: ICON.download, onClick: () => download(res.blob, name) }), key('Close', { onClick: () => { m.close(); URL.revokeObjectURL(url); } })));
    download(res.blob, name);
  } catch (e) {
    delete m.back.dataset.busy;
    if (e.name === 'AbortError') { m.close(); toast('Export cancelled'); return; }
    console.error(e);
    m.body.replaceChildren(h('p', { class: 'an-readout', text: e.message || 'Export failed' }), h('div', { class: 'mb-row' }, key('Close', { onClick: m.close })));
  }
}
