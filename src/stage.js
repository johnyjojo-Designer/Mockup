// Three.js scene: devices, lights, shadow-catching backdrop, platforms and decorative objects.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { buildDevice, panelRatioOf, applyFinish, slabGeo } from './devices.js';
import { Screens } from './screens.js';
import { assets } from './assets.js';
import { DECOR_PALETTES } from './model.js';

const D2R = Math.PI / 180;

function rng(seed) {
  let a = (seed * 2654435761) >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export class Stage {
  constructor() {
    const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, premultipliedAlpha: true, preserveDrawingBuffer: true });
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.VSMShadowMap;
    r.setClearColor(0x000000, 0);
    r.setPixelRatio(1);
    this.renderer = r;
    this.canvas = r.domElement;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(28, 1.6, 0.1, 100);
    this.screens = new Screens(r);
    this.devices = new Map(); // id -> { root, screen, aspect, mats, sig }
    this.decor = new THREE.Group();
    this.platform = null;
    this.platformSig = '';
    this.decorSig = '';
    this.decorItems = [];

    const pm = new THREE.PMREMGenerator(r);
    this.scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    pm.dispose();

    this.hemi = new THREE.HemisphereLight(0xffffff, 0x8a90a0, 0.9);
    this.key = new THREE.DirectionalLight(0xffffff, 1.6);
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(2048, 2048);
    this.key.shadow.bias = -0.0004;
    this.key.shadow.normalBias = 0.02;
    this.fill = new THREE.DirectionalLight(0xdfe8ff, 0.5);
    this.scene.add(this.hemi, this.key, this.key.target, this.fill, this.fill.target);

    this.wall = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), new THREE.ShadowMaterial({ opacity: 0.35 }));
    this.wall.receiveShadow = true;
    this.scene.add(this.wall);
    this.scene.add(this.decor);
    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.project = null;
  }

  // ---- structure ----------------------------------------------------------------------------------
  sync(project) {
    this.project = project;
    const ids = new Set(project.devices.map((d) => d.id));
    for (const [id, e] of this.devices) {
      if (!ids.has(id)) { this.group.remove(e.root); disposeTree(e.root); this.screens.dispose(id); this.devices.delete(id); }
    }
    project.devices.forEach((d, i) => {
      const a = d.screen.assetId ? assets.get(d.screen.assetId) : null;
      const ratio = d.type === 'panel' ? panelRatioOf(d, a ? a.w / a.h : 0) : 0;
      const sig = [d.type, d.landscape, d.type === 'laptop' ? d.hinge : '', ratio.toFixed(3)].join('|');
      let e = this.devices.get(d.id);
      if (!e || e.sig !== sig) {
        if (e) { this.group.remove(e.root); disposeTree(e.root); }
        const built = buildDevice(d, ratio || 1.6);
        built.root.traverse((o) => { o.userData.deviceId = d.id; });
        e = { ...built, sig };
        this.devices.set(d.id, e);
        this.group.add(e.root);
      }
      for (const m of e.mats) applyFinish(m, d.color, d.finish);
      const tex = this.screens.update(d, e.aspect, i);
      if (e.screen.material.map !== tex) { e.screen.material.map = tex; e.screen.material.needsUpdate = true; }
    });
    this.syncExtras(project);
  }

  /** Cheap per-frame refresh of textures (videos) without rebuilding anything. */
  refreshScreens(project) {
    project.devices.forEach((d, i) => {
      const e = this.devices.get(d.id);
      if (!e) return;
      const tex = this.screens.update(d, e.aspect, i);
      if (e.screen.material.map !== tex) { e.screen.material.map = tex; e.screen.material.needsUpdate = true; }
    });
  }

  syncExtras(project) {
    const s = project.style, c = project.camera;
    // platform
    const psig = [s.platform.type, s.platform.color, s.platform.finish, s.platform.size, Math.round(c.frameW * 10)].join('|');
    if (psig !== this.platformSig) {
      this.platformSig = psig;
      if (this.platform) { this.scene.remove(this.platform); disposeTree(this.platform); this.platform = null; }
      if (s.platform.type !== 'none') this.platform = buildPlatform(s.platform, c.frameW);
      if (this.platform) this.scene.add(this.platform);
    }
    // decor
    const dsig = [s.decor.set, s.decor.palette, s.decor.seed, s.decor.amount, Math.round(c.frameW * 10), Math.round(c.frameH * 10)].join('|');
    if (dsig !== this.decorSig) {
      this.decorSig = dsig;
      for (const ch of [...this.decor.children]) { this.decor.remove(ch); disposeTree(ch); }
      this.decorItems = s.decor.set === 'none' ? [] : buildDecor(s.decor, c);
      for (const it of this.decorItems) this.decor.add(it.mesh);
    }
  }

  // ---- per-frame pose -----------------------------------------------------------------------------
  pose(frame, aspect) {
    const p = this.project, s = p.style, L = s.light;
    for (const d of p.devices) {
      const e = this.devices.get(d.id), t = frame.devices[d.id];
      if (!e || !t) continue;
      e.root.visible = t.visible;
      e.root.position.set(t.pos[0], t.pos[1], t.pos[2]);
      e.root.rotation.set(t.rot[0] * D2R, t.rot[1] * D2R, t.rot[2] * D2R, 'YXZ');
      e.root.scale.setScalar(Math.max(0.0001, t.scale));
    }
    // camera: keep the template framing for any output aspect (dolly zoom keeps size when fov changes)
    const c = frame.camera;
    const H = Math.max(c.frameH, c.frameW / aspect) / Math.max(0.05, c.zoom);
    const dist = H / (2 * Math.tan((c.fov * D2R) / 2));
    const az = c.az * D2R, el = c.el * D2R;
    const target = new THREE.Vector3(c.panX, c.panY, 0);
    this.camera.fov = c.fov; this.camera.aspect = aspect; this.camera.near = Math.max(0.05, dist * 0.05); this.camera.far = dist + 80;
    this.camera.position.copy(target).add(new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).multiplyScalar(dist));
    this.camera.lookAt(target);
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld(true);

    // device bounds -> floor + backdrop distance
    this.group.updateMatrixWorld(true);
    const box = new THREE.Box3(), tmp = new THREE.Box3();
    let any = false;
    for (const e of this.devices.values()) { if (!e.root.visible) continue; tmp.setFromObject(e.root); if (!tmp.isEmpty()) { box.union(tmp); any = true; } }
    if (!any) box.set(new THREE.Vector3(-1, -1, -1), new THREE.Vector3(1, 1, 1));
    const fwd = new THREE.Vector3(); this.camera.getWorldDirection(fwd);
    let far = -1e9;
    for (let i = 0; i < 8; i++) {
      const v = new THREE.Vector3(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z);
      far = Math.max(far, v.sub(target).dot(fwd));
    }
    this.wall.position.copy(target).addScaledVector(fwd, far + 0.05 + L.shadowDist * 1.2);
    this.wall.quaternion.copy(this.camera.quaternion);
    this.wall.material.opacity = L.shadow;

    if (this.platform) {
      this.platform.position.set((box.min.x + box.max.x) / 2, box.min.y - 0.06, (box.min.z + box.max.z) / 2);
      this.platform.rotation.y = 0;
    }
    const phase = frame.phase || 0;
    this.decorItems.forEach((it, i) => {
      const k = frame.bob ? Math.sin(phase + i * 1.7) : 0;
      it.mesh.position.set(it.pos[0], it.pos[1] + k * frame.bob * (1 + (i % 3) * 0.5), it.pos[2]);
      it.mesh.rotation.set(it.rot[0] + (frame.bob ? k * 0.4 : 0), it.rot[1] + (frame.bob ? phase * 0.0 : 0), it.rot[2]);
    });

    // lights follow the camera so shading and shadow direction stay consistent while orbiting
    const right = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 0);
    const up = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 1);
    const back = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 2);
    const la = L.azimuth * D2R, le = L.elevation * D2R;
    const vx = Math.sin(la) * Math.cos(le), vy = Math.sin(le), vz = Math.cos(la) * Math.cos(le);
    const dir = right.clone().multiplyScalar(vx).addScaledVector(up, vy).addScaledVector(back, vz).normalize();
    this.key.position.copy(target).addScaledVector(dir, 18);
    this.key.target.position.copy(target);
    this.key.intensity = L.key;
    const R = Math.max(c.frameW, c.frameH) * 1.25 + 3;
    const sc = this.key.shadow.camera;
    sc.left = -R; sc.right = R; sc.top = R; sc.bottom = -R; sc.near = 1; sc.far = 50; sc.updateProjectionMatrix();
    this.key.shadow.radius = 1 + L.softness * 16;
    this.key.shadow.blurSamples = 24;
    this.fill.position.copy(target).addScaledVector(right, 10).addScaledVector(up, 3).addScaledVector(back, 6);
    this.fill.target.position.copy(target);
    this.fill.intensity = L.key * 0.28;
    this.hemi.intensity = L.ambient * 0.8;
    this.scene.environmentIntensity = L.reflections;
    this.key.castShadow = L.shadow > 0.001;
  }

  render(w, h) {
    const r = this.renderer;
    if (r.domElement.width !== w || r.domElement.height !== h) r.setSize(w, h, false);
    r.render(this.scene, this.camera);
    return r.domElement;
  }

  // ---- interaction helpers ------------------------------------------------------------------------
  pick(nx, ny) {
    const rc = new THREE.Raycaster();
    rc.setFromCamera(new THREE.Vector2(nx * 2 - 1, -(ny * 2 - 1)), this.camera);
    const roots = [];
    for (const e of this.devices.values()) if (e.root.visible) roots.push(e.root);
    const hit = rc.intersectObjects(roots, true)[0];
    return hit ? hit.object.userData.deviceId || null : null;
  }

  /** World-space bounds of the visible devices (after pose()). */
  bounds() {
    const box = new THREE.Box3(), tmp = new THREE.Box3();
    this.group.updateMatrixWorld(true);
    for (const e of this.devices.values()) { if (!e.root.visible) continue; tmp.setFromObject(e.root, true); if (!tmp.isEmpty()) box.union(tmp); }
    return box.isEmpty() ? null : box;
  }

  /** Screen-space box (0..1, y down) of a device. */
  screenBox(id) {
    const e = this.devices.get(id);
    if (!e) return null;
    e.root.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(e.root, true);
    let x0 = 1, y0 = 1, x1 = 0, y1 = 0;
    for (let i = 0; i < 8; i++) {
      const v = new THREE.Vector3(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z).project(this.camera);
      const x = (v.x + 1) / 2, y = (1 - v.y) / 2;
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    }
    return { x0, y0, x1, y1 };
  }

  /** World point under a normalised screen position on the camera-facing plane through `through`. */
  planePoint(nx, ny, through) {
    const rc = new THREE.Raycaster();
    rc.setFromCamera(new THREE.Vector2(nx * 2 - 1, -(ny * 2 - 1)), this.camera);
    const n = new THREE.Vector3(); this.camera.getWorldDirection(n);
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(n.negate(), new THREE.Vector3(...through));
    const out = new THREE.Vector3();
    return rc.ray.intersectPlane(plane, out) ? out : null;
  }

  /** World units per normalised screen unit at a given depth (for pan/orbit feel). */
  get maxTexture() { return this.renderer.capabilities.maxTextureSize; }
}

function disposeTree(o) {
  o.traverse((n) => {
    if (n.geometry) n.geometry.dispose();
    if (n.material) { const ms = Array.isArray(n.material) ? n.material : [n.material]; for (const m of ms) { if (m.map && !m.userData?.keepMap && !n.userData?.isScreen) { /* shared textures stay */ } m.dispose(); } }
  });
}

function buildPlatform(pf, frameW) {
  const g = new THREE.Group();
  const mat = new THREE.MeshPhysicalMaterial({ color: pf.color });
  applyFinish(mat, pf.color, pf.finish);
  const R = Math.max(1.1, frameW * 0.42 * pf.size);
  const add = (geo, y) => { const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; m.position.y = y; g.add(m); return m; };
  const flat = (w, d, t, r) => { const geo = slabGeo(w, d, t, r, Math.min(0.03, t / 3)); geo.rotateX(-Math.PI / 2); return geo; };
  switch (pf.type) {
    case 'disc': add(new THREE.CylinderGeometry(R, R, 0.14, 96), -0.07); break;
    case 'block': add(flat(R * 2, R * 1.1, 0.3, 0.18), -0.15); break;
    case 'steps':
      add(new THREE.CylinderGeometry(R, R, 0.1, 96), -0.05);
      add(new THREE.CylinderGeometry(R * 1.3, R * 1.3, 0.1, 96), -0.15);
      break;
    case 'slab': add(flat(R * 3.4, R * 2.6, 0.06, 0.3), -0.03); break;
    default: break;
  }
  return g;
}

function buildDecor(dc, cam) {
  const rand = rng(dc.seed * 7919 + 13);
  const pal = DECOR_PALETTES[dc.palette] || DECOR_PALETTES.brand;
  const N = Math.round(7 * dc.amount);
  const items = [];
  for (let i = 0; i < N; i++) {
    let x = 0, y = 0;
    for (let k = 0; k < 24; k++) {
      x = (rand() * 2 - 1) * cam.frameW * 0.62; y = (rand() * 2 - 1) * cam.frameH * 0.56;
      if (Math.abs(x) > cam.frameW * 0.3 || Math.abs(y) > cam.frameH * 0.38) break;
    }
    const z = -1.5 + rand() * 1.2;
    const s = 0.14 + rand() * 0.26;
    const col = pal[Math.floor(rand() * pal.length)];
    let geo;
    const kinds = dc.set === 'orbs' ? ['sphere'] : dc.set === 'blocks' ? ['box'] : ['sphere', 'torus', 'cone', 'capsule', 'box'];
    const kind = kinds[Math.floor(rand() * kinds.length)];
    if (kind === 'sphere') geo = new THREE.SphereGeometry(s, 48, 32);
    else if (kind === 'torus') geo = new THREE.TorusGeometry(s * 0.9, s * 0.38, 24, 56);
    else if (kind === 'cone') geo = new THREE.ConeGeometry(s * 0.8, s * 1.7, 40);
    else if (kind === 'capsule') geo = new THREE.CapsuleGeometry(s * 0.5, s * 1.1, 8, 24);
    else geo = slabGeo(s * 1.5, s * 1.5, s * 1.5, s * 0.35, s * 0.2);
    const mat = new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.28, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.08 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true; mesh.receiveShadow = true;
    items.push({ mesh, pos: [x, y, z], rot: [rand() * 3, rand() * 3, rand() * 3] });
  }
  return items;
}
