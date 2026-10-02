// Exports: PNG / JPG stills and MP4 video (WebCodecs H.264 -> mp4-muxer, falling back to VP9/AV1 in MP4).
import { Muxer, ArrayBufferTarget } from 'mp4-muxer';
import { progressAt } from './motion.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function videoSupported() { return typeof VideoEncoder !== 'undefined' && typeof VideoFrame !== 'undefined'; }

export async function exportImage(engine, { format, quality, w, h }) {
  engine.locked = true;
  try {
    const out = document.createElement('canvas');
    const p = engine.progress;
    await engine.renderExport(out, w, h, { p, t: engine.t, flatten: format === 'jpg' });
    const type = format === 'jpg' ? 'image/jpeg' : 'image/png';
    const blob = await new Promise((res) => out.toBlob(res, type, quality));
    if (!blob) throw new Error('The browser could not encode this image size. Try a smaller resolution.');
    out.width = out.height = 1;
    return blob;
  } finally { engine.locked = false; engine.invalidate(true); }
}

async function pickCodec(w, h, fps, bitrate) {
  const big = w * h > 1920 * 1088;
  const list = [
    { codec: big ? 'avc1.640033' : 'avc1.64002A', mux: 'avc', label: 'H.264' },
    { codec: 'avc1.640034', mux: 'avc', label: 'H.264' },
    { codec: 'avc1.4D0033', mux: 'avc', label: 'H.264' },
    { codec: 'vp09.00.51.08', mux: 'vp9', label: 'VP9' },
    { codec: 'av01.0.12M.08', mux: 'av1', label: 'AV1' },
  ];
  for (const c of list) {
    try {
      const s = await VideoEncoder.isConfigSupported({ codec: c.codec, width: w, height: h, bitrate, framerate: fps });
      if (s.supported) return c;
    } catch { /* try next */ }
  }
  return null;
}

export async function exportVideo(engine, { w, h, fps, bitrate: level, onProgress, signal }) {
  if (!videoSupported()) throw new Error('Video export needs a browser with WebCodecs (Chrome, Edge, Safari 16.4+).');
  const proj = engine.project, m = proj.motion;
  w &= ~1; h &= ~1;
  const bpp = { standard: 0.07, high: 0.12, max: 0.2 }[level] || 0.12;
  const bitrate = Math.round(Math.min(100e6, Math.max(2e6, w * h * fps * bpp)));
  const cfg = await pickCodec(w, h, fps, bitrate);
  if (!cfg) throw new Error('This browser cannot encode video at that size. Try 1920 px or lower.');

  const frames = Math.max(2, Math.round(m.duration * fps));
  const muxer = new Muxer({ target: new ArrayBufferTarget(), video: { codec: cfg.mux, width: w, height: h, frameRate: fps }, fastStart: 'in-memory' });
  let encErr = null;
  const enc = new VideoEncoder({ output: (chunk, meta) => muxer.addVideoChunk(chunk, meta), error: (e) => { encErr = e; } });
  enc.configure({ codec: cfg.codec, width: w, height: h, bitrate, framerate: fps });

  engine.pause();
  engine.locked = true;
  const out = document.createElement('canvas');
  try {
    for (let i = 0; i < frames; i++) {
      if (signal?.aborted) throw new DOMException('Export cancelled', 'AbortError');
      if (encErr) throw encErr;
      const t = i / fps;
      const p = m.loop === 'once' ? i / (frames - 1) : i / frames;
      await engine.renderExport(out, w, h, { p, t, flatten: true });
      const vf = new VideoFrame(out, { timestamp: Math.round((i * 1e6) / fps), duration: Math.round(1e6 / fps) });
      enc.encode(vf, { keyFrame: i % (fps * 2) === 0 });
      vf.close();
      while (enc.encodeQueueSize > 6) await sleep(2);
      onProgress?.((i + 1) / frames, i + 1, frames);
      if (i % 4 === 3) await sleep(0); // let the UI paint progress
    }
    await enc.flush();
    muxer.finalize();
    return { blob: new Blob([muxer.target.buffer], { type: 'video/mp4' }), codec: cfg.label, frames, w, h, bitrate };
  } finally {
    try { enc.close(); } catch { /* already closed */ }
    out.width = out.height = 1;
    engine.locked = false;
    engine.invalidate(true);
  }
}

export function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
}
