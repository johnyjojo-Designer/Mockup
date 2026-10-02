// Application context: store + engine + persistence + the actions the UI calls.
import { Store } from './store.js';
import { Engine } from './engine.js';
import { assets } from './assets.js';
import { db, lastProjectKey } from './db.js';
import { newProject, makeDevice, TEMPLATES, DEVICE_TYPES, autoFrame, clone, uid, dimsFor, defaultCamera } from './model.js';
import { toast } from './ui/dom.js';

export const app = {
  store: new Store(),
  engine: null,
  saveState: 'saved', // saved | saving | dirty | error
  presets: [],
  listeners: new Set(),
};
export const onApp = (fn) => { app.listeners.add(fn); return () => app.listeners.delete(fn); };
const ping = (what) => { for (const f of app.listeners) f(what); };

// ---- boot --------------------------------------------------------------------------------------------
export async function boot() {
  app.engine = new Engine(app.store);
  app.store.on((kind) => {
    app.engine.invalidate(kind !== 'select');
    if (kind === 'change' || kind === 'history' || kind === 'load') { if (kind !== 'load') scheduleSave(); }
    ping(kind);
  });
  app.presets = await db.listPresets().catch(() => []);
  let project = null;
  try {
    const last = localStorage.getItem(lastProjectKey);
    if (last) project = (await db.getProject(last))?.data || null;
  } catch { /* storage unavailable */ }
  if (project) await openData(project); else await createProject('three-phones');
}

async function openData(data) {
  const p = clone(data);
  const ids = [...p.assets, ...p.devices.map((d) => d.screen.assetId), p.style.bg.image?.assetId].filter(Boolean);
  await assets.ensure(ids);
  for (const d of p.devices) if (d.screen.assetId && !assets.get(d.screen.assetId)) d.screen.assetId = null;
  if (p.style.bg.image?.assetId && !assets.get(p.style.bg.image.assetId)) p.style.bg.image.assetId = null;
  p.assets = p.assets.filter((i) => assets.get(i));
  app.engine.t = 0; app.engine.playing = false;
  app.store.load(p);
  app.engine.invalidate(true);
  try { localStorage.setItem(lastProjectKey, p.id); } catch { /* ignore */ }
  setSave('saved');
  ping('project');
}

export async function createProject(templateId = 'three-phones', name) {
  const p = newProject(templateId, name || 'Untitled project');
  await db.putProject({ id: p.id, name: p.name, updated: Date.now(), thumb: '', data: p });
  await openData(p);
}
export async function openProject(id) {
  await saveNow();
  const rec = await db.getProject(id);
  if (rec) await openData(rec.data);
}
export async function duplicateProject(id, { swap = false } = {}) {
  await saveNow();
  const rec = await db.getProject(id);
  if (!rec) return;
  const p = clone(rec.data);
  p.id = uid('p'); p.name = `${p.name} copy`; p.created = Date.now();
  if (swap) { p.name = `${rec.name} (new screens)`; p.assets = []; for (const d of p.devices) d.screen.assetId = null; }
  await db.putProject({ id: p.id, name: p.name, updated: Date.now(), thumb: rec.thumb, data: p });
  return p.id;
}
export async function renameProject(id, name) {
  const rec = await db.getProject(id);
  if (!rec) return;
  rec.name = name; rec.data.name = name; rec.updated = Date.now();
  await db.putProject(rec);
  if (app.store.state.id === id) { app.store.state.name = name; ping('change'); }
}
export async function deleteProject(id) {
  await db.deleteProject(id);
  const keep = new Set();
  for (const r of await db.listProjects()) { const rec = await db.getProject(r.id); for (const a of rec.data.assets) keep.add(a); const bi = rec.data.style.bg.image?.assetId; if (bi) keep.add(bi); for (const d of rec.data.devices) if (d.screen.assetId) keep.add(d.screen.assetId); }
  for (const a of await db.allAssetIds()) if (!keep.has(a)) await db.deleteAsset(a);
}

// ---- persistence ------------------------------------------------------------------------------------
let saveTimer = 0;
function setSave(s) { app.saveState = s; ping('save'); }
function scheduleSave() {
  setSave('dirty');
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, 700);
}
export async function saveNow() {
  clearTimeout(saveTimer);
  const p = app.store.state;
  if (!p) return;
  setSave('saving');
  try {
    const thumb = app.engine.dirty ? '' : app.engine.thumbnail();
    const prev = thumb ? null : await db.getProject(p.id);
    await db.putProject({ id: p.id, name: p.name, updated: Date.now(), thumb: thumb || prev?.thumb || '', data: p });
    setSave('saved');
  } catch (e) { console.error(e); setSave('error'); toast('Autosave failed: storage is full or blocked.', 'err'); }
}
window.addEventListener('beforeunload', () => { if (app.saveState === 'dirty') saveNow(); });

// ---- editing actions --------------------------------------------------------------------------------
export const set = (fn, opts) => app.store.set(fn, opts);

export async function addFiles(files, targetDeviceId = null) {
  const list = [...files].filter((f) => f.type.startsWith('image/') || f.type.startsWith('video/'));
  if (!list.length) { toast('Drop PNG, JPG, WebP, SVG images or MP4 / WebM videos.', 'err'); return []; }
  const added = [];
  for (const f of list) {
    try { added.push(await assets.add(f)); } catch (e) { toast(e.message || `Could not read ${f.name}`, 'err'); }
  }
  if (!added.length) return [];
  set((p) => {
    for (const a of added) p.assets.push(a.id);
    const free = p.devices.filter((d) => !d.screen.assetId && d.id !== targetDeviceId);
    let q = 0;
    if (targetDeviceId) { const t = p.devices.find((d) => d.id === targetDeviceId); if (t) t.screen.assetId = added[q++].id; }
    for (const d of free) { if (q >= added.length) break; d.screen.assetId = added[q++].id; }
  });
  toast(`${added.length} screen${added.length > 1 ? 's' : ''} added`);
  return added;
}

export function assignScreen(deviceId, assetId) {
  set((p) => { const d = p.devices.find((x) => x.id === deviceId); if (d) d.screen.assetId = assetId; });
  app.store.select(deviceId);
}

export async function replaceAsset(oldId, file) {
  let a;
  try { a = await assets.add(file); } catch (e) { toast(e.message, 'err'); return; }
  set((p) => {
    p.assets = p.assets.map((i) => (i === oldId ? a.id : i));
    for (const d of p.devices) if (d.screen.assetId === oldId) d.screen.assetId = a.id;
  });
  toast('Screen replaced; scene and motion settings kept');
}

export function removeAsset(id) {
  set((p) => { p.assets = p.assets.filter((i) => i !== id); for (const d of p.devices) if (d.screen.assetId === id) d.screen.assetId = null; });
}

export function applyTemplate(id) {
  const t = TEMPLATES.find((x) => x.id === id);
  if (!t) return;
  set((p) => {
    const prev = p.devices.map((d) => d.screen);
    p.template = id;
    p.devices = t.devices.map(makeDevice);
    // keep the user's screens: reassign in order, extras stay in the library
    p.devices.forEach((d, i) => { if (prev[i]) d.screen = { ...prev[i] }; });
    const used = new Set(p.devices.map((d) => d.screen.assetId).filter(Boolean));
    const spare = p.assets.filter((a) => !used.has(a));
    for (const d of p.devices) if (!d.screen.assetId && spare.length) d.screen.assetId = spare.shift();
    p.camera = { ...defaultCamera(), az: p.camera.az, el: p.camera.el, fov: p.camera.fov };
    autoFrame(p);
    p.motion.startPose = p.motion.endPose = null; p.motion.usePoses = false;
  });
  const sel = app.store.state.devices[0]?.id ?? null;
  app.store.ui.selected = sel;
  app.store.emit('select');
}

export function addDevice(type) {
  const d = makeDevice({ type, pos: [0, 0, 0.2], rot: [0, 0, 0], scale: type === 'laptop' || type === 'desktop' ? 0.8 : 1 });
  set((p) => {
    d.pos = [((p.devices.length % 5) - 2) * 0.35, ((p.devices.length % 3) - 1) * 0.3, 0.3 + p.devices.length * 0.1];
    const free = p.assets.find((a) => !p.devices.some((x) => x.screen.assetId === a));
    if (free) d.screen.assetId = free;
    p.devices.push(d);
    p.name = p.name;
  });
  app.store.ui.selected = d.id;
  app.store.emit('select');
}

export function removeDevice(id) {
  set((p) => { p.devices = p.devices.filter((d) => d.id !== id); });
  app.store.fixSelection();
  app.store.emit('select');
}
export function duplicateDevice(id) {
  let nid = null;
  set((p) => {
    const d = p.devices.find((x) => x.id === id);
    if (!d) return;
    const c = clone(d); c.id = uid('d'); c.pos = [d.pos[0] + 0.25, d.pos[1] - 0.15, d.pos[2] + 0.2]; nid = c.id;
    p.devices.push(c);
  });
  if (nid) { app.store.ui.selected = nid; app.store.emit('select'); }
}

export function setAspect(id) {
  set((p) => {
    if (id === 'custom') { p.canvas.aspect = 'custom'; return; }
    const long = p.export.long;
    const d = dimsFor(id, long);
    p.canvas = { aspect: id, long, w: d.w, h: d.h };
  });
}
export function exportDims(p, long = p.export.long) {
  if (p.canvas.aspect === 'custom') return { w: p.canvas.w, h: p.canvas.h };
  return dimsFor(p.canvas.aspect, long);
}

// ---- presets ----------------------------------------------------------------------------------------
export async function savePreset(name) {
  const p = app.store.state;
  const rec = { id: uid('s'), name: name || `Style ${app.presets.length + 1}`, created: Date.now(), style: clone(p.style), camera: { az: p.camera.az, el: p.camera.el, fov: p.camera.fov, zoom: p.camera.zoom }, motion: { ...clone(p.motion), startPose: null, endPose: null, usePoses: false } };
  // Image backgrounds depend on a per-project asset; keep the preset portable by dropping it.
  if (rec.style.bg.type === 'image') { rec.style.bg.type = 'gradient'; rec.style.bg.image.assetId = null; }
  await db.putPreset(rec);
  app.presets.push(rec);
  ping('presets');
  toast(`Preset "${rec.name}" saved`);
}
export function applyPreset(id) {
  const r = app.presets.find((x) => x.id === id);
  if (!r) return;
  set((p) => {
    p.style = clone(r.style);
    Object.assign(p.camera, r.camera);
    p.motion = { ...p.motion, ...clone(r.motion), startPose: p.motion.startPose, endPose: p.motion.endPose, usePoses: p.motion.usePoses };
  });
}
export async function deletePreset(id) {
  await db.deletePreset(id);
  app.presets = app.presets.filter((x) => x.id !== id);
  ping('presets');
}

export const deviceTypes = DEVICE_TYPES;

// ---- start / end poses ------------------------------------------------------------------------------
import { snapshotPose } from './motion.js';

function applyPoseTo(p, pose) {
  for (const d of p.devices) { const s = pose.devices[d.id]; if (s) { d.pos = [...s.pos]; d.rot = [...s.rot]; d.scale = s.scale; } }
  for (const k of ['az', 'el', 'zoom', 'fov', 'panX', 'panY']) p.camera[k] = pose.camera[k];
}
export function setPoses(on) {
  endPoseEdit(false);
  set((p) => {
    p.motion.usePoses = on;
    if (on && (!p.motion.startPose || !p.motion.endPose)) { const s = snapshotPose(p); p.motion.startPose = clone(s); p.motion.endPose = clone(s); }
  });
}
/** Show a pose in the editor: arrange the scene by hand, then save it back to the pose. */
export function beginPoseEdit(slot) {
  const ui = app.store.ui;
  if (ui.editingPose) endPoseEdit(false);
  const backup = snapshotPose(app.store.state);
  ui.editingPose = { slot, backup };
  app.engine.forceBase = true; app.engine.pause();
  const pose = app.store.state.motion[`${slot}Pose`];
  if (pose) set((p) => applyPoseTo(p, pose), { history: false });
  ping('pose');
}
export function endPoseEdit(save) {
  const ui = app.store.ui;
  if (!ui.editingPose) return;
  const { slot, backup } = ui.editingPose;
  ui.editingPose = null;
  app.engine.forceBase = false;
  set((p) => {
    if (save) p.motion[`${slot}Pose`] = clone(snapshotPose(p));
    applyPoseTo(p, backup);
  }, { history: false });
  if (save) toast(`${slot === 'start' ? 'Start' : 'End'} pose saved`);
  ping('pose');
}
