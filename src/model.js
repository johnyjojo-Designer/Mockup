// Project model: defaults, catalogs (aspects, gradients, templates, colours) and small helpers.

export const uid = (p = 'id') => p + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
export const clone = (o) => JSON.parse(JSON.stringify(o));
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;

export const ASPECTS = [
  { id: '16:9', w: 16, h: 9, label: '16:9' },
  { id: '3:2', w: 3, h: 2, label: '3:2' },
  { id: '4:3', w: 4, h: 3, label: '4:3' },
  { id: '1:1', w: 1, h: 1, label: '1:1' },
  { id: '4:5', w: 4, h: 5, label: '4:5' },
  { id: '9:16', w: 9, h: 16, label: '9:16' },
  { id: '2:1', w: 2, h: 1, label: '2:1' },
];
export const LONG_SIDES = [1280, 1920, 2560, 3840, 5120, 7680];

export function dimsFor(aspectId, longSide) {
  const a = ASPECTS.find((x) => x.id === aspectId) || ASPECTS[0];
  const r = a.w / a.h;
  let w, h;
  if (r >= 1) { w = longSide; h = Math.round(longSide / r); } else { h = longSide; w = Math.round(longSide * r); }
  return { w: w & ~1, h: h & ~1 };
}

export const GRADIENTS = [
  { id: 'peach', name: 'Peach Fizz', type: 'linear', angle: 145, stops: ['#ffd6c0', '#ff9a8b', '#ff6f91'] },
  { id: 'dusk', name: 'Dusk', type: 'linear', angle: 160, stops: ['#2b1055', '#7597de'] },
  { id: 'mint', name: 'Mint Air', type: 'linear', angle: 135, stops: ['#d4fc79', '#96e6a1'] },
  { id: 'ocean', name: 'Deep Ocean', type: 'linear', angle: 150, stops: ['#0f2027', '#203a43', '#2c5364'] },
  { id: 'sand', name: 'Warm Sand', type: 'linear', angle: 120, stops: ['#fdfbfb', '#ebedee'] },
  { id: 'sunrise', name: 'Sunrise', type: 'linear', angle: 135, stops: ['#fceabb', '#f8b500'] },
  { id: 'slate', name: 'Slate', type: 'linear', angle: 180, stops: ['#232526', '#414345'] },
  { id: 'lilac', name: 'Lilac Haze', type: 'radial', angle: 0, stops: ['#fbe3ff', '#c9b6ff', '#8e9eff'] },
  { id: 'aurora', name: 'Aurora', type: 'aurora', angle: 0, stops: ['#0b132b', '#1c7c7d', '#e0fbfc', '#f4a259'] },
  { id: 'candy', name: 'Candy', type: 'aurora', angle: 0, stops: ['#ffe6f0', '#ffb3c7', '#c8f0ff', '#fff3b0'] },
  { id: 'forest', name: 'Forest', type: 'linear', angle: 165, stops: ['#134e5e', '#71b280'] },
  { id: 'ember', name: 'Ember', type: 'radial', angle: 0, stops: ['#ffcf70', '#ff6a3d', '#4a1030'] },
  { id: 'paper', name: 'Paper', type: 'linear', angle: 180, stops: ['#f6f1e6', '#e8dfcc'] },
  { id: 'ink', name: 'Ink', type: 'radial', angle: 0, stops: ['#3a3d4a', '#15161c'] },
];

export const SOLIDS = ['#f6f1e6', '#ffffff', '#e9ecf1', '#ffd23f', '#ff6b6b', '#4d96ff', '#6bcb77', '#1b1d24'];

export const DEVICE_TYPES = {
  phone: { name: 'Phone', colors: ['#2a2c33', '#d9dbe0', '#e8d5b0', '#41609b', '#5f8570', '#b9403a', '#f3f1ec'] },
  tablet: { name: 'Tablet', colors: ['#2a2c33', '#d9dbe0', '#e8d5b0', '#41609b', '#5f8570'] },
  laptop: { name: 'Laptop', colors: ['#c9ccd2', '#2a2c33', '#e8d5b0', '#41609b'] },
  desktop: { name: 'Desktop', colors: ['#d9dbe0', '#2a2c33', '#f3f1ec', '#e8d5b0'] },
  panel: { name: 'Panel', colors: ['#15161c', '#ffffff', '#f5c531', '#2659c9'] },
};
export const FINISHES = [
  { id: 'matte', name: 'Matte' },
  { id: 'satin', name: 'Metal' },
  { id: 'gloss', name: 'Gloss' },
];
export const PANEL_ASPECTS = [
  { id: 'auto', name: 'Auto', r: 0 },
  { id: '16:10', name: '16:10', r: 1.6 },
  { id: '16:9', name: '16:9', r: 16 / 9 },
  { id: '4:3', name: '4:3', r: 4 / 3 },
  { id: '1:1', name: '1:1', r: 1 },
  { id: '9:16', name: '9:16', r: 9 / 16 },
];

export const PLATFORMS = [
  { id: 'none', name: 'None' },
  { id: 'disc', name: 'Disc' },
  { id: 'block', name: 'Block' },
  { id: 'steps', name: 'Steps' },
  { id: 'slab', name: 'Floor' },
];
export const DECOR_SETS = [
  { id: 'none', name: 'None' },
  { id: 'orbs', name: 'Orbs' },
  { id: 'shapes', name: 'Shapes' },
  { id: 'blocks', name: 'Blocks' },
];
export const DECOR_PALETTES = {
  brand: ['#2659c9', '#cc2e27', '#45b141', '#f08a1c', '#f5c531'],
  pastel: ['#ffb3c7', '#b8e0ff', '#fff3b0', '#c9f2d4', '#e1c8ff'],
  mono: ['#15161c', '#2b2d35', '#8e939e', '#eee9de', '#ffffff'],
};

export const MOTIONS = [
  { id: 'none', name: 'None', hint: 'Only start/end poses move.' },
  { id: 'float', name: 'Float', hint: 'Devices bob gently and sway.' },
  { id: 'rotate', name: 'Slow rotation', hint: 'Devices sweep left and right.' },
  { id: 'orbit', name: 'Camera orbit', hint: 'Camera arcs around the scene.' },
  { id: 'zoom', name: 'Zoom', hint: 'Slow push-in on the scene.' },
  { id: 'slide', name: 'Slide in', hint: 'Devices glide in from the edges.' },
  { id: 'stagger', name: 'Staggered reveal', hint: 'Devices pop in one after another.' },
];
export const EASINGS = [
  { id: 'linear', name: 'Linear' },
  { id: 'smooth', name: 'Smooth' },
  { id: 'out', name: 'Ease out' },
  { id: 'in', name: 'Ease in' },
  { id: 'back', name: 'Overshoot' },
];

// ---- Templates (compositions). Positions are world units; a phone is ~1.6 tall.
const D = (type, pos, rot, scale = 1, extra = {}) => ({ type, pos, rot, scale, ...extra });
export const TEMPLATES = [
  { id: 'hero-phone', name: 'Hero phone', devices: [D('phone', [0, 0, 0], [6, -22, 3], 1.5)] },
  { id: 'phone-pair', name: 'Phone pair', devices: [D('phone', [-0.55, -0.05, 0], [4, 24, -2], 1.3), D('phone', [0.6, 0.12, -0.25], [4, -24, 2], 1.3)] },
  { id: 'three-phones', name: 'Three phones', devices: [
    D('phone', [-1.15, -0.1, -0.5], [4, 26, 0], 1.2), D('phone', [0, 0.1, 0.1], [4, 0, 0], 1.3), D('phone', [1.15, -0.1, -0.5], [4, -26, 0], 1.2)] },
  { id: 'phone-row', name: 'Staggered row', devices: [
    D('phone', [-1.5, 0.25, 0], [0, -14, 0], 1.1), D('phone', [-0.5, -0.1, 0], [0, -14, 0], 1.1), D('phone', [0.5, 0.25, 0], [0, -14, 0], 1.1), D('phone', [1.5, -0.1, 0], [0, -14, 0], 1.1)] },
  { id: 'screen-stack', name: 'Screen stack', devices: [
    D('panel', [-0.55, -0.3, -0.5], [10, 28, -4], 1, { aspect: '16:10' }), D('panel', [0, 0, 0], [10, 28, -4], 1, { aspect: '16:10' }), D('panel', [0.55, 0.3, 0.5], [10, 28, -4], 1, { aspect: '16:10' })] },
  { id: 'floating', name: 'Floating screens', devices: [
    D('panel', [-1.5, 0.45, -0.4], [8, 22, 3], 0.8, { aspect: '9:16' }), D('panel', [-0.2, -0.25, 0.3], [-6, -16, -3], 1.1, { aspect: '16:10' }),
    D('panel', [1.5, 0.35, -0.2], [6, -24, 4], 0.85, { aspect: '9:16' }), D('panel', [1.0, -0.8, 0.5], [-8, -12, 5], 0.6, { aspect: '1:1' })] },
  { id: 'laptop', name: 'Laptop hero', devices: [D('laptop', [0, 0, 0], [8, -18, 0], 1)] },
  { id: 'desktop', name: 'Desktop hero', devices: [D('desktop', [0, 0.1, 0], [3, -14, 0], 0.95)] },
  { id: 'desktop-phone', name: 'Desktop + phone', devices: [
    D('desktop', [-0.5, 0.25, -0.5], [3, 14, 0], 0.95), D('phone', [1.55, -0.35, 0.5], [4, -20, 0], 1.2)] },
  { id: 'laptop-phone', name: 'Laptop + phone', devices: [
    D('laptop', [-0.3, 0.1, -0.2], [6, 16, 0], 0.95), D('phone', [1.55, -0.2, 0.55], [4, -18, 0], 1.15)] },
  { id: 'tablet-phone', name: 'Tablet + phone', devices: [
    D('tablet', [-0.45, 0.05, -0.2], [4, 18, 0], 1.1, { landscape: true }), D('phone', [1.3, -0.25, 0.4], [4, -16, 0], 1.15)] },
  { id: 'flat-panel', name: 'Flat panel', devices: [D('panel', [0, 0, 0], [0, 0, 0], 1.2, { aspect: '16:10' })] },
];

export function makeDevice(spec) {
  const type = spec.type;
  return {
    id: uid('d'),
    type,
    name: DEVICE_TYPES[type].name,
    pos: [...(spec.pos || [0, 0, 0])],
    rot: [...(spec.rot || [0, 0, 0])],
    scale: spec.scale ?? 1,
    color: spec.color || DEVICE_TYPES[type].colors[0],
    finish: spec.finish || (type === 'panel' ? 'matte' : 'satin'),
    landscape: !!spec.landscape,
    hinge: spec.hinge ?? 104,
    aspect: spec.aspect || (type === 'panel' ? '16:10' : 'auto'),
    screen: { assetId: null, fit: 'fill', zoom: 1, ox: 0, oy: 0, bg: '#000000' },
  };
}

export function defaultStyle() {
  return {
    bg: {
      type: 'gradient',
      color: '#f6f1e6',
      gradient: { id: 'peach', type: 'linear', angle: 145, stops: ['#ffd6c0', '#ff9a8b', '#ff6f91'] },
      image: { assetId: null, fit: 'cover' },
      intensity: 100,
      vignette: 0,
    },
    light: { key: 1.6, azimuth: -22, elevation: 30, ambient: 0.9, reflections: 0.7, shadow: 0.28, softness: 0.6, shadowDist: 0.12 },
    platform: { type: 'none', color: '#eee9de', finish: 'matte', size: 1 },
    decor: { set: 'none', palette: 'brand', seed: 3, amount: 1 },
  };
}

export function defaultMotion() {
  return {
    mode: 'static', preset: 'float', duration: 6, speed: 1, easing: 'smooth', loop: 'loop', intensity: 1,
    usePoses: false, startPose: null, endPose: null,
  };
}

export function defaultCamera() {
  return { az: 0, el: 5, zoom: 1, fov: 28, panX: 0, panY: 0, frameW: 3.4, frameH: 2.4 };
}

export function newProject(templateId = 'three-phones', name = 'Untitled project') {
  const t = TEMPLATES.find((x) => x.id === templateId) || TEMPLATES[0];
  const p = {
    v: 1,
    id: uid('p'),
    name,
    created: Date.now(),
    template: t.id,
    canvas: { aspect: '16:9', long: 1920, w: 1920, h: 1080 },
    devices: t.devices.map(makeDevice),
    assets: [],
    style: defaultStyle(),
    camera: defaultCamera(),
    motion: defaultMotion(),
    export: { image: 'png', quality: 0.92, fps: 30, long: 1920, bitrate: 'high' },
  };
  autoFrame(p);
  return p;
}

// Rough frame size from device footprint so a template fills the canvas nicely.
export function autoFrame(p) {
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (const d of p.devices) {
    const s = deviceExtent(d);
    const rx = Math.abs(Math.cos((d.rot[2] * Math.PI) / 180)), ry = Math.abs(Math.sin((d.rot[2] * Math.PI) / 180));
    const w = (s.w * rx + s.h * ry) * d.scale * (0.5 + 0.5 * Math.abs(Math.cos((d.rot[1] * Math.PI) / 180)));
    const h = (s.h * rx + s.w * ry) * d.scale;
    x0 = Math.min(x0, d.pos[0] - w / 2); x1 = Math.max(x1, d.pos[0] + w / 2);
    y0 = Math.min(y0, d.pos[1] - h / 2); y1 = Math.max(y1, d.pos[1] + h / 2);
  }
  p.camera.needsFrame = true; // the engine refines this from the real 3D bounds on the next render
  if (!p.devices.length) { p.camera.frameW = 3.4; p.camera.frameH = 2.4; p.camera.panX = 0; p.camera.panY = 0; return; }
  const m = 1.5;
  p.camera.frameW = Math.max(1, (x1 - x0) * m);
  p.camera.frameH = Math.max(1, (y1 - y0) * m);
  p.camera.panX = (x0 + x1) / 2;
  p.camera.panY = (y0 + y1) / 2;
}

export function deviceExtent(d) {
  switch (d.type) {
    case 'phone': return d.landscape ? { w: 1.62, h: 0.78 } : { w: 0.78, h: 1.62 };
    case 'tablet': return d.landscape ? { w: 2.0, h: 1.5 } : { w: 1.5, h: 2.0 };
    case 'laptop': return { w: 2.7, h: 1.9 };
    case 'desktop': return { w: 3.1, h: 2.45 };
    default: {
      const r = (PANEL_ASPECTS.find((a) => a.id === d.aspect) || PANEL_ASPECTS[1]).r || 1.6;
      return panelSize(r);
    }
  }
}
export function panelSize(r) {
  // fixed visual area so portrait and landscape panels feel similar in weight
  const area = 2.4;
  const h = Math.sqrt(area / r);
  return { w: h * r, h };
}
