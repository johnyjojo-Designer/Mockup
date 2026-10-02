// Uploaded screens (images and screen recordings). Blobs live in IndexedDB; decoded sources are cached here.
import { db } from './db.js';
import { uid } from './model.js';

export const ACCEPT = 'image/png,image/jpeg,image/webp,image/gif,image/svg+xml,image/avif,video/mp4,video/webm,video/quicktime';

class AssetLib {
  constructor() { this.map = new Map(); }

  get(id) { return this.map.get(id) || null; }

  async add(file) {
    const kind = file.type.startsWith('video/') ? 'video' : 'image';
    if (!file.type.startsWith('video/') && !file.type.startsWith('image/')) throw new Error(`${file.name}: unsupported file type`);
    const id = uid('a');
    const rec = { id, name: file.name, kind, type: file.type, blob: file };
    const a = await this.decode(rec);
    rec.w = a.w; rec.h = a.h; rec.duration = a.duration || 0; rec.thumb = a.thumb;
    await db.putAsset(rec);
    this.map.set(id, a);
    return a;
  }

  async load(id) {
    if (this.map.has(id)) return this.map.get(id);
    const rec = await db.getAsset(id);
    if (!rec) return null;
    try { return await this.decode(rec, true); } catch { return null; }
  }

  async decode(rec, register = false) {
    const url = URL.createObjectURL(rec.blob);
    const a = { id: rec.id, name: rec.name, kind: rec.kind, blob: rec.blob, url, w: 0, h: 0, duration: 0, source: null, thumb: rec.thumb || '' };
    if (rec.kind === 'image') {
      const img = new Image();
      img.decoding = 'async';
      img.src = url;
      await img.decode();
      a.source = img;
      a.w = img.naturalWidth || 1024; a.h = img.naturalHeight || 1024;
      if (!a.thumb) a.thumb = thumbOf(img, a.w, a.h);
    } else {
      const v = document.createElement('video');
      v.muted = true; v.defaultMuted = true; v.playsInline = true; v.preload = 'auto'; v.loop = false;
      v.src = url;
      await new Promise((res, rej) => {
        v.onloadeddata = res;
        v.onerror = () => rej(new Error(`${rec.name}: this browser can't decode the video`));
      });
      v.currentTime = 0.001;
      await new Promise((res) => { v.onseeked = res; setTimeout(res, 800); });
      a.source = v;
      a.w = v.videoWidth; a.h = v.videoHeight; a.duration = v.duration;
      if (!a.thumb) a.thumb = thumbOf(v, a.w, a.h);
    }
    if (register) this.map.set(a.id, a);
    return a;
  }

  async ensure(ids) { await Promise.all(ids.filter(Boolean).map((i) => this.load(i))); }
}

function thumbOf(src, w, h) {
  const s = 160 / Math.max(w, h);
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w * s)); c.height = Math.max(1, Math.round(h * s));
  c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.8);
}

export const assets = new AssetLib();

/** Seek a video element and resolve once the frame is ready. */
export function seekVideo(v, t) {
  return new Promise((resolve) => {
    const target = Math.min(Math.max(0, t), Math.max(0, (v.duration || 0) - 0.001));
    if (Math.abs(v.currentTime - target) < 0.0005 && v.readyState >= 2) return resolve();
    const done = () => { v.removeEventListener('seeked', done); clearTimeout(to); resolve(); };
    const to = setTimeout(done, 1500);
    v.addEventListener('seeked', done);
    v.currentTime = target;
  });
}
