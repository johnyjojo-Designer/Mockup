// Procedural device models. Each builder returns a group centred on its bounding box plus the screen mesh.
// Screen planes use unlit materials so uploaded designs keep their exact colours under any lighting.
import * as THREE from 'three';
import { PANEL_ASPECTS, panelSize } from './model.js';

export function roundedRectShape(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  r = Math.max(0.0001, Math.min(r, w / 2, h / 2));
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x + w, y + h - r);
  s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
  s.lineTo(x + r, y + h);
  s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x, y + r);
  s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  return s;
}

export function slabGeo(w, h, d, r, bevel = 0.012) {
  const b = Math.min(bevel, d / 2 - 0.0005, r - 0.0005);
  const g = new THREE.ExtrudeGeometry(roundedRectShape(w - 2 * b, h - 2 * b, r - b), {
    depth: Math.max(0.0005, d - 2 * b), bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 3, curveSegments: 16,
  });
  g.translate(0, 0, -(d - 2 * b) / 2);
  return g;
}

// landscape: the plane is built portrait and rotated by the device, so its UVs are turned a quarter-turn
// to keep the content upright in the final (landscape) orientation.
function planeGeo(w, h, r, landscape = false) {
  const g = new THREE.ShapeGeometry(roundedRectShape(w, h, r), 16);
  const uv = g.attributes.uv, pos = g.attributes.position;
  for (let i = 0; i < uv.count; i++) {
    const x = pos.getX(i) / w + 0.5, y = pos.getY(i) / h + 0.5;
    if (landscape) uv.setXY(i, 1 - y, x); else uv.setXY(i, x, y);
  }
  return g;
}

const FINISH = {
  matte: { metalness: 0.15, roughness: 0.62, clearcoat: 0, clearcoatRoughness: 0.4 },
  satin: { metalness: 0.9, roughness: 0.32, clearcoat: 0.15, clearcoatRoughness: 0.35 },
  gloss: { metalness: 0.25, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.06 },
};

function bodyMat(color, finish) {
  const m = new THREE.MeshPhysicalMaterial({ color });
  applyFinish(m, color, finish);
  return m;
}
export function applyFinish(m, color, finish) {
  const f = FINISH[finish] || FINISH.matte;
  const recompile = (m.clearcoat > 0) !== (f.clearcoat > 0);
  m.color.set(color);
  m.metalness = f.metalness; m.roughness = f.roughness; m.clearcoat = f.clearcoat; m.clearcoatRoughness = f.clearcoatRoughness;
  if (recompile) m.needsUpdate = true;
}
const glassMat = () => new THREE.MeshPhysicalMaterial({ color: '#050507', metalness: 0, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.05 });
const darkMat = () => new THREE.MeshStandardMaterial({ color: '#17181c', metalness: 0.3, roughness: 0.55 });

function mesh(geo, mat, { cast = true, receive = true } = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = cast; m.receiveShadow = receive;
  return m;
}

function makeScreen(w, h, r, landscape = false) {
  const mat = new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false });
  const m = new THREE.Mesh(planeGeo(w, h, r, landscape), mat);
  m.castShadow = false; m.receiveShadow = false;
  m.userData.isScreen = true;
  return m;
}

/** Shared layered "slab with a glass front" used by phone, tablet and the lid of laptop/desktop. */
function glassSlab({ w, h, d, r, frame, screenRect, color, finish, mats, landscape = false }) {
  const g = new THREE.Group();
  const bm = bodyMat(color, finish); mats.push(bm);
  g.add(mesh(slabGeo(w, h, d, r), bm));
  const zf = d / 2 + 0.0006;
  const gl = new THREE.Mesh(planeGeo(w - frame * 0.5, h - frame * 0.5, Math.max(0.01, r - frame * 0.25)), glassMat());
  gl.position.z = zf; gl.receiveShadow = false;
  g.add(gl);
  const sr = screenRect;
  const sc = makeScreen(sr.w, sr.h, sr.r, landscape);
  sc.position.set(sr.x || 0, sr.y || 0, zf + 0.0012);
  g.add(sc);
  return { group: g, screen: sc };
}

export function buildDevice(dev, panelRatio = 1.6) {
  const mats = [];
  let inner = new THREE.Group();
  let screen = null;
  let aspect = 1;

  if (dev.type === 'phone') {
    let W = 0.78, H = 1.62, D = 0.09;
    const f = 0.03;
    let sw = W - 2 * f, sh = H - 2 * f;
    const { group, screen: sc } = glassSlab({ w: W, h: H, d: D, r: 0.13, frame: f, screenRect: { w: sw, h: sh, r: 0.1 }, color: dev.color, finish: dev.finish, mats, landscape: dev.landscape });
    inner.add(group); screen = sc; aspect = sw / sh;
    // side buttons
    const bm = bodyMat(dev.color, dev.finish); mats.push(bm);
    for (const [y, hh] of [[0.42, 0.2], [0.14, 0.1], [-0.02, 0.1]]) { const b = mesh(slabGeo(0.02, hh, 0.04, 0.008, 0.004), bm); b.position.set(-W / 2 - 0.006, y, 0); inner.add(b); }
    const pb = mesh(slabGeo(0.02, 0.26, 0.04, 0.008, 0.004), bm); pb.position.set(W / 2 + 0.006, 0.3, 0); inner.add(pb);
    // back camera plateau
    const cam = mesh(slabGeo(0.3, 0.3, 0.02, 0.07, 0.006), darkMat()); cam.position.set(-W / 2 + 0.22, H / 2 - 0.22, -D / 2 - 0.008); inner.add(cam);
    for (const [cx, cy] of [[-0.05, 0.05], [0.05, -0.05]]) { const l = mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.02, 24), glassMat()); l.rotation.x = Math.PI / 2; l.position.set(-W / 2 + 0.22 + cx, H / 2 - 0.22 + cy, -D / 2 - 0.02); inner.add(l); }
    if (dev.landscape) { const wrap = new THREE.Group(); wrap.add(inner); inner.rotation.z = Math.PI / 2; inner = wrap; aspect = 1 / aspect; }
  } else if (dev.type === 'tablet') {
    const W = 1.5, H = 2.0, D = 0.07, f = 0.075;
    const sw = W - 2 * f, sh = H - 2 * f;
    const { group, screen: sc } = glassSlab({ w: W, h: H, d: D, r: 0.1, frame: f * 1.8, screenRect: { w: sw, h: sh, r: 0.03 }, color: dev.color, finish: dev.finish, mats, landscape: dev.landscape });
    inner.add(group); screen = sc; aspect = sw / sh;
    if (dev.landscape) { const wrap = new THREE.Group(); wrap.add(inner); inner.rotation.z = Math.PI / 2; inner = wrap; aspect = 1 / aspect; }
  } else if (dev.type === 'laptop') {
    const W = 2.7, D = 1.75, T = 0.07;
    const sw = 2.56, sh = sw / 1.6, f = 0.07, chin = 0.1;
    const LH = sh + f + chin;
    const bm = bodyMat(dev.color, dev.finish); mats.push(bm);
    // base
    const base = new THREE.Group();
    // slabGeo is XY-oriented (thin in Z), so build it as w x depth x thickness and lay it flat
    const baseGeo = slabGeo(W, D, T, 0.07, 0.014);
    const bmesh = mesh(baseGeo, bm); bmesh.rotation.x = -Math.PI / 2; base.add(bmesh);
    const deck = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.86, D * 0.34), new THREE.MeshStandardMaterial({ map: keyboardTexture(), roughness: 0.8, metalness: 0 }));
    deck.rotation.x = -Math.PI / 2; deck.position.set(0, T / 2 + 0.0008, -D * 0.2); deck.receiveShadow = true; base.add(deck);
    const tp = new THREE.Mesh(planeGeo(W * 0.3, D * 0.2, 0.03), new THREE.MeshStandardMaterial({ color: new THREE.Color(dev.color).multiplyScalar(0.88), metalness: 0.4, roughness: 0.4 }));
    tp.rotation.x = -Math.PI / 2; tp.position.set(0, T / 2 + 0.0008, D * 0.25); base.add(tp);
    base.position.y = T / 2;
    inner.add(base);
    // lid hinged at back edge
    const lid = new THREE.Group();
    const { group, screen: sc } = glassSlab({ w: W, h: LH, d: 0.05, r: 0.06, frame: f * 1.2, screenRect: { w: sw, h: sh, r: 0.012, y: (chin - f) / 2 }, color: dev.color, finish: dev.finish, mats });
    group.position.y = LH / 2;
    lid.add(group);
    lid.position.set(0, T + 0.012, -D / 2 + 0.03);
    lid.rotation.x = -((dev.hinge - 90) * Math.PI) / 180;
    inner.add(lid);
    screen = sc; aspect = sw / sh;
  } else if (dev.type === 'desktop') {
    const sw = 3.0, sh = sw * 9 / 16, f = 0.06, chin = 0.26;
    const W = sw + 2 * f, H = sh + f + chin;
    const { group, screen: sc } = glassSlab({ w: W, h: H, d: 0.09, r: 0.07, frame: f * 1.4, screenRect: { w: sw, h: sh, r: 0.015, y: (chin - f) / 2 }, color: dev.color, finish: dev.finish, mats });
    inner.add(group);
    const bm = bodyMat(dev.color, dev.finish); mats.push(bm);
    const neck = mesh(new THREE.BoxGeometry(0.28, 0.62, 0.05), bm); neck.position.set(0, -H / 2 - 0.27, -0.05); inner.add(neck);
    const foot = mesh(new THREE.CylinderGeometry(0.55, 0.62, 0.04, 48), bm); foot.scale.z = 0.62; foot.position.set(0, -H / 2 - 0.58, -0.02); inner.add(foot);
    screen = sc; aspect = sw / sh;
  } else {
    // frameless panel
    const r = panelRatio;
    const { w, h } = panelSize(r);
    const bm = bodyMat(dev.color, dev.finish); mats.push(bm);
    inner.add(mesh(slabGeo(w, h, 0.035, 0.05, 0.01), bm));
    screen = makeScreen(w - 0.004, h - 0.004, 0.047);
    screen.position.z = 0.035 / 2 + 0.0008;
    inner.add(screen);
    aspect = w / h;
  }

  // centre on bounding box so rotation/scale pivot is the visual centre
  const root = new THREE.Group();
  root.add(inner);
  const box = new THREE.Box3().setFromObject(inner);
  const c = box.getCenter(new THREE.Vector3());
  inner.position.sub(c);
  root.userData = { aspect, mats, screen };
  return { root, screen, aspect, mats };
}

let kbTex = null;
function keyboardTexture() {
  if (kbTex) return kbTex;
  const c = document.createElement('canvas'); c.width = 1024; c.height = 400;
  const x = c.getContext('2d');
  x.fillStyle = '#1a1b20'; x.fillRect(0, 0, 1024, 400);
  x.fillStyle = '#2b2d35';
  const rows = 5, cols = 14, pad = 18, gw = (1024 - pad * 2) / cols, gh = (400 - pad * 2) / rows;
  for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) {
    x.beginPath(); x.roundRect(pad + q * gw + 3, pad + r * gh + 3, gw - 6, gh - 6, 6); x.fill();
  }
  kbTex = new THREE.CanvasTexture(c); kbTex.colorSpace = THREE.SRGBColorSpace; kbTex.anisotropy = 8;
  return kbTex;
}

export function panelRatioOf(dev, assetAspect) {
  const a = PANEL_ASPECTS.find((p) => p.id === dev.aspect) || PANEL_ASPECTS[1];
  if (a.id === 'auto') return assetAspect ? Math.min(2.4, Math.max(0.4, assetAspect)) : 1.6;
  return a.r;
}
