// Screen content: maps an uploaded image/video (or a placeholder) onto a device display.
// The source is drawn into a canvas that has exactly the display's aspect ratio (fill/fit, zoom, pan),
// so nothing is ever stretched, and the canvas is used as the screen texture.
import * as THREE from 'three';
import { assets, seekVideo } from './assets.js';

const ACCENTS = ['#2659c9', '#cc2e27', '#45b141', '#f08a1c', '#f5c531'];

export class Screens {
  constructor(renderer) {
    this.entries = new Map();
    this.maxTex = Math.min(renderer.capabilities.maxTextureSize, 8192);
    this.aniso = renderer.capabilities.getMaxAnisotropy();
    this.videoLong = 1920;
  }

  dispose(id) {
    const e = this.entries.get(id);
    if (e) { e.tex.dispose(); this.entries.delete(id); }
  }

  /** Returns the up-to-date texture for a device screen. */
  update(dev, aspect, index = 0) {
    const s = dev.screen;
    const a = s.assetId ? assets.get(s.assetId) : null;
    const isVideo = a?.kind === 'video';
    const src = a?.source;
    const sw = a ? a.w : 0, sh = a ? a.h : 0;

    let long;
    if (!a) long = 1400;
    else if (isVideo) long = Math.min(this.videoLong, Math.max(sw, sh));
    else long = Math.min(4096, Math.max(sw, sh) * Math.max(1, s.zoom));
    long = Math.max(256, Math.min(long, this.maxTex));
    const cw = aspect >= 1 ? Math.round(long) : Math.round(long * aspect);
    const ch = aspect >= 1 ? Math.round(long / aspect) : Math.round(long);

    let e = this.entries.get(dev.id);
    if (e && (e.cw !== cw || e.ch !== ch)) { e.tex.dispose(); e = null; }
    if (!e) {
      const canvas = document.createElement('canvas');
      canvas.width = cw; canvas.height = ch;
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = this.aniso;
      tex.generateMipmaps = true;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      e = { canvas, ctx: canvas.getContext('2d'), tex, cw, ch, key: '', vt: -1 };
      this.entries.set(dev.id, e);
    }

    const vready = isVideo ? src.readyState >= 2 : true;
    const key = [a?.id || 'ph', s.fit, s.zoom, s.ox, s.oy, s.bg, cw, ch, vready, a ? '' : index].join('|');
    const vt = isVideo ? src.currentTime : -1;
    if (key !== e.key || vt !== e.vt) {
      e.key = key; e.vt = vt;
      const ctx = e.ctx;
      if (!a) drawPlaceholder(ctx, cw, ch, index, dev.type);
      else if (vready) drawFit(ctx, cw, ch, src, sw, sh, s);
      e.tex.needsUpdate = true;
    }
    return e.tex;
  }

  /** Seek every video used by the project to time t (looping by each clip's own length), wait for the frames. */
  async seekAll(project, t) {
    const jobs = [];
    const seen = new Set();
    for (const d of project.devices) {
      const a = d.screen.assetId ? assets.get(d.screen.assetId) : null;
      if (a?.kind === 'video' && !seen.has(a.id)) {
        seen.add(a.id);
        const dur = a.duration || 1;
        jobs.push(seekVideo(a.source, ((t % dur) + dur) % dur));
      }
    }
    await Promise.all(jobs);
  }
}

export function drawFit(ctx, cw, ch, src, sw, sh, s) {
  ctx.clearRect(0, 0, cw, ch);
  ctx.fillStyle = s.bg || '#000';
  ctx.fillRect(0, 0, cw, ch);
  const zoom = Math.max(s.fit === 'fill' ? 1 : 0.2, s.zoom || 1);
  const base = s.fit === 'fit' ? Math.min(cw / sw, ch / sh) : Math.max(cw / sw, ch / sh);
  const k = base * zoom;
  const dw = sw * k, dh = sh * k;
  const x = (cw - dw) / 2 + (s.ox || 0) * Math.abs(cw - dw) / 2;
  const y = (ch - dh) / 2 + (s.oy || 0) * Math.abs(ch - dh) / 2;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, x, y, dw, dh);
}

function hash(i) { return ACCENTS[Math.abs(i) % ACCENTS.length]; }

/** Generic wireframe "app screen" shown until a real screen is dropped on the device. */
export function drawPlaceholder(ctx, w, h, i, type) {
  const accent = hash(i);
  const u = Math.min(w, h) / 100;
  ctx.fillStyle = '#f4f5f9'; ctx.fillRect(0, 0, w, h);
  const rr = (x, y, ww, hh, r, fill) => { ctx.beginPath(); ctx.roundRect(x, y, ww, hh, r); ctx.fillStyle = fill; ctx.fill(); };
  if (w / h < 0.8) {
    rr(0, 0, w, 24 * u, 0, accent);
    rr(8 * u, 12 * u, 38 * u, 5 * u, 2.5 * u, 'rgba(255,255,255,.9)');
    rr(8 * u, 19 * u, 22 * u, 3 * u, 1.5 * u, 'rgba(255,255,255,.55)');
    let y = 30 * u;
    while (y + 24 * u < h - 14 * u) {
      rr(6 * u, y, w - 12 * u, 22 * u, 4 * u, '#ffffff');
      rr(10 * u, y + 4 * u, 14 * u, 14 * u, 3 * u, i % 2 ? '#e7e9f0' : accent + '33');
      rr(28 * u, y + 5 * u, 36 * u, 4 * u, 2 * u, '#2b2d35');
      rr(28 * u, y + 12 * u, 24 * u, 3 * u, 1.5 * u, '#b9bdc9');
      y += 26 * u;
    }
    rr(6 * u, h - 11 * u, w - 12 * u, 8 * u, 4 * u, '#ffffff');
    for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.arc(w * (0.16 + k * 0.22), h - 7 * u, 2 * u, 0, 7); ctx.fillStyle = k === i % 4 ? accent : '#b9bdc9'; ctx.fill(); }
  } else {
    rr(0, 0, 18 * u * (w / h > 1 ? 1 : 1.4) * 1.0, h, 0, '#1b1d24');
    const sx = 18 * u * (w / h > 1 ? 1 : 1.4);
    for (let k = 0; k < 6; k++) rr(sx * 0.18, h * 0.12 + k * h * 0.09, sx * 0.64, h * 0.035, 3 * u, k === 1 ? accent : 'rgba(255,255,255,.22)');
    rr(sx + 4 * u, 4 * u, w - sx - 8 * u, 9 * u, 3 * u, '#ffffff');
    const cw3 = (w - sx - 8 * u - 8 * u) / 3;
    for (let k = 0; k < 3; k++) {
      rr(sx + 4 * u + k * (cw3 + 4 * u), 17 * u, cw3, 22 * u, 4 * u, '#ffffff');
      rr(sx + 7 * u + k * (cw3 + 4 * u), 20 * u, cw3 * 0.4, 3 * u, 1.5 * u, '#b9bdc9');
      rr(sx + 7 * u + k * (cw3 + 4 * u), 26 * u, cw3 * 0.6, 7 * u, 2 * u, k === 0 ? accent : '#2b2d35');
    }
    rr(sx + 4 * u, 43 * u, (w - sx - 8 * u) * 0.62, h - 47 * u, 4 * u, '#ffffff');
    ctx.beginPath(); ctx.moveTo(sx + 9 * u, h - 12 * u);
    const px = sx + 9 * u, pw = (w - sx - 8 * u) * 0.62 - 10 * u, py = 50 * u, ph = h - 50 * u - 18 * u;
    for (let k = 0; k <= 8; k++) ctx.lineTo(px + (pw * k) / 8, py + ph * (0.5 + 0.38 * Math.sin(k * 0.9 + i)) );
    ctx.strokeStyle = accent; ctx.lineWidth = 1.6 * u; ctx.lineJoin = 'round'; ctx.stroke();
    rr(sx + 8 * u + (w - sx - 8 * u) * 0.62, 43 * u, (w - sx - 8 * u) * 0.38 - 4 * u, h - 47 * u, 4 * u, '#ffffff');
    for (let k = 0; k < 5; k++) rr(sx + 11 * u + (w - sx - 8 * u) * 0.62, 48 * u + k * 8 * u, (w - sx - 8 * u) * 0.38 - 10 * u, 4 * u, 2 * u, k % 2 ? '#e7e9f0' : '#cfd3de');
  }
}
