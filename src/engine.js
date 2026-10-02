// Engine: owns the stage + compositor, runs the preview loop (playback, scrubbing) and renders export frames.
import { Stage } from './stage.js';
import { composite } from './compose.js';
import { evaluate, progressAt, baseFrame } from './motion.js';
import { assets } from './assets.js';

export class Engine {
  constructor(store) {
    this.store = store;
    this.stage = new Stage();
    this.view = document.createElement('canvas');
    this.vw = 960; this.vh = 540;
    this.t = 0;
    this.playing = false;
    this.dirty = true;
    this.needSync = true;
    this.locked = false;
    this.forceBase = false;
    this.last = 0;
    this.listeners = new Set();
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  onFrame(fn) { this.listeners.add(fn); }
  invalidate(structural = false) { this.dirty = true; if (structural) this.needSync = true; }

  get project() { return this.store.state; }
  get animated() { return this.project.motion.mode === 'animated'; }
  get progress() { return this.animated ? progressAt(this.project.motion, this.t) : 0; }

  setTime(t) { this.t = Math.max(0, t); this.dirty = true; this.syncVideos(true); }
  play() { if (!this.animated || this.forceBase) return; const m = this.project.motion; if (m.loop === 'once' && this.t >= m.duration) this.t = 0; this.playing = true; this.last = 0; this.syncVideos(); }
  pause() { this.playing = false; this.syncVideos(true); this.dirty = true; }
  toggle() { this.playing ? this.pause() : this.play(); }

  resize(cssW, cssH, dpr) {
    const w = Math.max(64, Math.round(cssW * dpr)), h = Math.max(64, Math.round(cssH * dpr));
    if (w !== this.vw || h !== this.vh) { this.vw = w; this.vh = h; this.dirty = true; }
  }

  loop(ts) {
    requestAnimationFrame(this.loop);
    if (this.locked || !this.project) return;
    if (this.playing) {
      const dt = this.last ? (ts - this.last) / 1000 : 0;
      this.last = ts;
      const m = this.project.motion;
      this.t += dt;
      if (m.loop === 'once' && this.t >= m.duration) { this.t = m.duration; this.playing = false; this.syncVideos(true); }
      this.dirty = true;
      this.syncVideos();
    }
    if (this.hasVideo() && !this.playing) { /* paused video frames only change on seek */ }
    if (!this.dirty) return;
    this.dirty = false;
    this.draw();
  }

  hasVideo() { return this.project.devices.some((d) => assets.get(d.screen.assetId)?.kind === 'video'); }

  syncVideos(force = false) {
    const seen = new Set();
    for (const d of this.project.devices) {
      const a = d.screen.assetId ? assets.get(d.screen.assetId) : null;
      if (!a || a.kind !== 'video' || seen.has(a.id)) continue;
      seen.add(a.id);
      const v = a.source, dur = a.duration || 1;
      const want = this.animated ? this.t % dur : 0;
      if (this.playing && this.animated) {
        v.loop = true;
        if (Math.abs(v.currentTime - want) > 0.3 && !v.seeking) v.currentTime = want;
        if (v.paused) v.play().catch(() => {});
      } else {
        if (!v.paused) v.pause();
        if (force || Math.abs(v.currentTime - want) > 0.02) v.currentTime = want;
      }
    }
  }

  draw() {
    const p = this.project;
    if (this.needSync) { this.stage.sync(p); this.needSync = false; }
    else this.stage.refreshScreens(p);
    const aspect = this.vw / this.vh;
    if (p.camera.needsFrame) this.autoFrame(p, aspect);
    const frame = evaluate(p, this.progress, { animate: !this.forceBase });
    this.stage.pose(frame, aspect);
    const gl = this.stage.render(this.vw, this.vh);
    composite(this.view, gl, p.style.bg, this.vw, this.vh);
    for (const fn of this.listeners) fn();
    // keep decoding videos fresh while playing: texture updates run each frame via refreshScreens
  }

  /** Fit the camera frame to the real 3D bounds of the devices (not an estimate). */
  autoFrame(p, aspect) {
    this.stage.pose(baseFrame(p), aspect);
    const b = this.stage.bounds();
    p.camera.needsFrame = false;
    if (b) {
      const m = 1.22, c = p.camera;
      c.frameW = Math.max(1, (b.max.x - b.min.x) * m);
      c.frameH = Math.max(1, (b.max.y - b.min.y) * m);
      c.panX = (b.max.x + b.min.x) / 2;
      c.panY = (b.max.y + b.min.y) / 2;
    }
    queueMicrotask(() => this.store.emit('change', { key: 'autoframe' }));
  }

  /** Render one frame at export size into `out` (a canvas). Honest to the preview: same evaluate/pose/compose path. */
  async renderExport(out, w, h, { p, t, flatten = false, seekVideos = true }) {
    const proj = this.project;
    this.stage.screens.videoLong = 2880;
    if (seekVideos) await this.stage.screens.seekAll(proj, t);
    this.stage.sync(proj);
    const frame = evaluate(proj, p, { animate: true });
    this.stage.pose(frame, w / h);
    const gl = this.stage.render(w, h);
    composite(out, gl, proj.style.bg, w, h, { flatten });
    this.stage.screens.videoLong = 1920;
  }

  thumbnail(size = 320) {
    const c = document.createElement('canvas');
    const r = this.vw / this.vh;
    c.width = r >= 1 ? size : Math.round(size * r); c.height = r >= 1 ? Math.round(size / r) : size;
    c.getContext('2d').drawImage(this.view, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.8);
  }
}
