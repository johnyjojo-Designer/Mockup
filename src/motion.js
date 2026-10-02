// Deterministic animation: evaluate(project, p) -> the pose of every device and the camera at progress p (0..1).
// Preview, scrubbing, still-frame export and MP4 export all go through this one function.
import { clamp, lerp } from './model.js';

const TAU = Math.PI * 2;
const EASE = {
  linear: (t) => t,
  smooth: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  out: (t) => 1 - Math.pow(1 - t, 3),
  in: (t) => t * t * t,
  back: (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
};
export const ease = (id, t) => (EASE[id] || EASE.smooth)(clamp(t, 0, 1));
const tri = (p) => 1 - Math.abs(2 * p - 1);

export function baseFrame(project) {
  const devices = {};
  for (const d of project.devices) devices[d.id] = { pos: [...d.pos], rot: [...d.rot], scale: d.scale, visible: true };
  const c = project.camera;
  return { camera: { az: c.az, el: c.el, zoom: c.zoom, fov: c.fov, panX: c.panX, panY: c.panY, frameW: c.frameW, frameH: c.frameH }, devices, bob: 0, sway: 0 };
}

export function snapshotPose(project) {
  const f = baseFrame(project);
  return { camera: f.camera, devices: f.devices };
}

/** Progress shaped by the loop mode. Returns the 0..1 value the motion should use. */
export function shapeProgress(motion, p) {
  return motion.loop === 'pingpong' ? tri(p) : p;
}

export function evaluate(project, p, { animate = true } = {}) {
  const f = baseFrame(project);
  const m = project.motion;
  if (!animate || m.mode !== 'animated' || p == null) return f;

  const pc = clamp(p, 0, 1);
  const ps = shapeProgress(m, pc);
  const I = m.intensity ?? 1;
  const cycles = Math.max(1, Math.round(m.speed || 1));
  const rate = m.speed || 1;
  const pe = ease(m.easing, ps);

  // 1) start/end poses
  if (m.usePoses && m.startPose && m.endPose) {
    const a = m.startPose, b = m.endPose;
    const q = pe;
    for (const k of ['az', 'el', 'zoom', 'fov', 'panX', 'panY']) f.camera[k] = lerp(a.camera[k], b.camera[k], q);
    for (const d of project.devices) {
      const sa = a.devices[d.id], sb = b.devices[d.id];
      if (!sa || !sb) continue;
      const t = f.devices[d.id];
      for (let i = 0; i < 3; i++) { t.pos[i] = lerp(sa.pos[i], sb.pos[i], q); t.rot[i] = lerp(sa.rot[i], sb.rot[i], q); }
      t.scale = lerp(sa.scale, sb.scale, q);
    }
  }

  // 2) preset
  const n = project.devices.length;
  const wave = (phase = 0) => Math.sin(TAU * cycles * pe + phase);
  switch (m.preset) {
    case 'float':
      project.devices.forEach((d, i) => {
        const t = f.devices[d.id], ph = i * 1.4;
        t.pos[1] += 0.07 * I * wave(ph);
        t.rot[0] += 2.2 * I * wave(ph + 0.7);
        t.rot[2] += 1.6 * I * wave(ph + 1.9);
      });
      f.bob = 0.05 * I;
      f.phase = TAU * cycles * pe;
      break;
    case 'rotate':
      project.devices.forEach((d, i) => { f.devices[d.id].rot[1] += 24 * I * wave(i * 0.35); });
      break;
    case 'orbit':
      f.camera.az += 30 * I * wave(0);
      f.camera.el += 5 * I * Math.sin(TAU * cycles * pe + 1.2);
      break;
    case 'zoom': {
      const s = m.loop === 'loop' ? (1 - Math.cos(TAU * cycles * pc)) / 2 : pe;
      f.camera.zoom *= 1 + 0.35 * I * s;
      break;
    }
    case 'slide':
    case 'stagger': {
      const stagger = m.preset === 'stagger' ? 0.12 : 0.05;
      project.devices.forEach((d, i) => {
        const a = reveal(m, pc, i, stagger, rate);
        const t = f.devices[d.id];
        if (m.preset === 'slide') {
          const dir = d.pos[0] < -0.3 ? -1 : d.pos[0] > 0.3 ? 1 : 0;
          const inv = 1 - a;
          t.pos[0] += dir * inv * 4.2 * I;
          t.pos[1] += (dir === 0 ? -1 : 0) * inv * 3.2 * I;
          t.rot[1] += dir * inv * 38 * I;
          t.visible = a > 0.002;
        } else {
          t.scale *= lerp(0.15, 1, a);
          t.pos[1] -= (1 - a) * 1.1 * I;
          t.rot[1] += (1 - a) * 40 * I * (i % 2 ? -1 : 1);
          t.visible = a > 0.01;
        }
      });
      break;
    }
    default: break;
  }
  return f;
}

// 0 = hidden, 1 = in place. Devices enter one after another; in loop mode they all leave at the end.
function reveal(m, p, i, stagger, rate) {
  const enterDur = 0.34;
  const base = m.loop === 'pingpong' ? tri(p) : clamp(p * rate, 0, 1);
  const raw = clamp((base - i * stagger) / enterDur, 0, 1);
  let a = ease(m.easing === 'linear' ? 'linear' : m.easing === 'back' ? 'back' : 'out', raw);
  if (m.loop === 'loop') a *= 1 - ease('in', clamp((p - 0.86) / 0.14, 0, 1));
  return clamp(a, 0, 1.06);
}

/** Map wall-clock seconds to progress for the chosen loop mode. */
export function progressAt(motion, t) {
  const d = Math.max(0.1, motion.duration);
  if (motion.loop === 'once') return clamp(t / d, 0, 1);
  return ((t % d) + d) % d / d;
}
