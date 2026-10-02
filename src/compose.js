// 2D compositor: paints the background, then the transparent 3D render on top. Preview, still export and
// video export all use this, so what you see is what you download.
import { assets } from './assets.js';

function hexToRgb(h) {
  const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})/i.exec(h) || [0, 0, 0, 0];
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}
function tint(hex, k) {
  // intensity: <1 washes the colour toward grey of the same lightness, >1 pushes saturation
  const [r, g, b] = hexToRgb(hex);
  const l = 0.299 * r + 0.587 * g + 0.114 * b;
  const f = (c) => Math.max(0, Math.min(255, Math.round(l + (c - l) * k)));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}

export function drawBackground(ctx, w, h, bg) {
  ctx.clearRect(0, 0, w, h);
  if (bg.type === 'transparent') return;
  const k = bg.intensity / 100;
  if (bg.type === 'solid') {
    ctx.fillStyle = tint(bg.color, k); ctx.fillRect(0, 0, w, h);
  } else if (bg.type === 'image') {
    const a = bg.image.assetId ? assets.get(bg.image.assetId) : null;
    ctx.fillStyle = '#1b1d24'; ctx.fillRect(0, 0, w, h);
    if (a && a.kind === 'image') {
      const s = bg.image.fit === 'contain' ? Math.min(w / a.w, h / a.h) : Math.max(w / a.w, h / a.h);
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(a.source, (w - a.w * s) / 2, (h - a.h * s) / 2, a.w * s, a.h * s);
      if (k < 1) { ctx.fillStyle = `rgba(128,128,128,${(1 - k) * 0.7})`; ctx.fillRect(0, 0, w, h); }
    }
  } else {
    const g = bg.gradient, st = g.stops.map((c) => tint(c, k));
    if (g.type === 'radial') {
      const r = Math.hypot(w, h) * 0.62;
      const gr = ctx.createRadialGradient(w * 0.5, h * 0.42, 0, w * 0.5, h * 0.42, r);
      st.forEach((c, i) => gr.addColorStop(i / Math.max(1, st.length - 1), c));
      ctx.fillStyle = gr; ctx.fillRect(0, 0, w, h);
    } else if (g.type === 'aurora') {
      ctx.fillStyle = st[0]; ctx.fillRect(0, 0, w, h);
      const spots = [[0.18, 0.2], [0.85, 0.25], [0.7, 0.9], [0.1, 0.85]];
      st.slice(1).concat(st[1] ? [st[st.length - 1]] : []).forEach((c, i) => {
        const [x, y] = spots[i % spots.length];
        const r = Math.max(w, h) * 0.7;
        const gr = ctx.createRadialGradient(w * x, h * y, 0, w * x, h * y, r);
        gr.addColorStop(0, c); gr.addColorStop(1, c.replace('rgb(', 'rgba(').replace(')', ',0)'));
        ctx.fillStyle = gr; ctx.fillRect(0, 0, w, h);
      });
    } else {
      const a = (g.angle * Math.PI) / 180;
      const dx = Math.sin(a), dy = -Math.cos(a);
      const len = Math.abs(w * dx) + Math.abs(h * dy);
      const cx = w / 2, cy = h / 2;
      const gr = ctx.createLinearGradient(cx - (dx * len) / 2, cy - (dy * len) / 2, cx + (dx * len) / 2, cy + (dy * len) / 2);
      st.forEach((c, i) => gr.addColorStop(i / Math.max(1, st.length - 1), c));
      ctx.fillStyle = gr; ctx.fillRect(0, 0, w, h);
    }
  }
  if (bg.vignette > 0) {
    const gr = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.hypot(w, h) * 0.58);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, `rgba(0,0,0,${bg.vignette / 100 * 0.6})`);
    ctx.fillStyle = gr; ctx.fillRect(0, 0, w, h);
  }
}

/** Composite into `target` (a canvas) at w x h. */
export function composite(target, glCanvas, bg, w, h, { flatten = false } = {}) {
  if (target.width !== w) target.width = w;
  if (target.height !== h) target.height = h;
  const ctx = target.getContext('2d');
  drawBackground(ctx, w, h, flatten && bg.type === 'transparent' ? { ...bg, type: 'solid', color: '#ffffff', intensity: 100, vignette: 0 } : bg);
  ctx.drawImage(glCanvas, 0, 0, w, h);
}
