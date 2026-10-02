// Right rail: DEVICE / STYLE / CAMERA / MOTION / EXPORT tabs.
import { h, ICON, pickFiles, toast } from './dom.js';
import { mod, key, seg, slider, toggle, swatches, readout, Group, numberField, textField, label, row } from './controls.js';
import {
  app, set, assignScreen, removeDevice, duplicateDevice, addFiles, savePreset, applyPreset, deletePreset, setPoses, beginPoseEdit, endPoseEdit, exportDims,
} from '../app.js';
import { assets, ACCEPT } from '../assets.js';
import {
  DEVICE_TYPES, FINISHES, PANEL_ASPECTS, GRADIENTS, SOLIDS, PLATFORMS, DECOR_SETS, DECOR_PALETTES, MOTIONS, EASINGS, LONG_SIDES, autoFrame, defaultCamera, clone, makeDevice,
} from '../model.js';
import { runImageExport, runVideoExport } from './exportdlg.js';
import { videoSupported } from '../exporter.js';

const P = () => app.store.state;
const sel = () => app.store.selected;
const S = (fn, key) => set(fn, { key });
const devSet = (fn, key) => {
  const id = app.store.ui.selected;
  S((p) => { const d = p.devices.find((x) => x.id === id); if (d) fn(d); }, key && `${key}:${id}`);
};
const fmt1 = (v) => v.toFixed(1);
const fmtDeg = (v) => `${Math.round(v)}°`;
const fmtPct = (v) => `${Math.round(v)}%`;

// =========================================================================================================
function deviceTab() {
  const g = new Group();
  const list = h('div', { class: 'mb-devlist', role: 'listbox', 'aria-label': 'Devices in scene' });
  const listMod = mod('Devices', { family: 'blue', ch: 'CH 3' }, list, readout('Click a device here or in the preview'));
  const body = h('div', { class: 'mb-stack' });
  let lsig = '', bsig = '';

  function buildList() {
    const p = P();
    list.replaceChildren(...p.devices.map((d, i) => h('div', { class: `mb-dev${d.id === app.store.ui.selected ? ' is-sel' : ''}`, role: 'option', 'aria-selected': d.id === app.store.ui.selected },
      h('button', { type: 'button', class: 'mb-dev-main', onclick: () => app.store.select(d.id) },
        h('span', { class: 'mb-dot', style: { background: d.color } }), h('span', { class: 'mb-dev-name', text: `${i + 1}. ${DEVICE_TYPES[d.type].name}` }),
        d.screen.assetId ? h('span', { class: 'mb-tagmini', text: assets.get(d.screen.assetId)?.kind === 'video' ? 'VIDEO' : 'SCREEN' }) : h('span', { class: 'mb-tagmini is-empty', text: 'EMPTY' })),
      key('', { icon: ICON.copy, className: 'mb-mini', title: 'Duplicate device', onClick: () => duplicateDevice(d.id) }),
      key('', { icon: ICON.trash, className: 'mb-mini', title: 'Delete device', onClick: () => removeDevice(d.id) }))));
  }

  function buildBody() {
    const d = sel();
    body.replaceChildren();
    g.items = [];
    if (!d) { body.append(mod('Device', {}, readout('Select or add a device'))); return; }
    const gi = (c) => g.add(c);

    // MODEL
    const typeSeg = gi(seg({ aria: 'Device type', options: Object.entries(DEVICE_TYPES).map(([id, v]) => ({ id, name: v.name })), get: () => sel().type, set: (id) => devSet((x) => { x.type = id; x.color = DEVICE_TYPES[id].colors[0]; x.name = DEVICE_TYPES[id].name; if (id === 'laptop') x.scale = Math.min(x.scale, 1.2); }) }));
    const colors = DEVICE_TYPES[d.type].colors;
    const model = mod('Model', { family: 'blue', ch: 'CH 4' }, typeSeg,
      label('Colour'), gi(swatches({ colors, get: () => sel().color, set: (c) => devSet((x) => { x.color = c; }, 'color') })),
      label('Finish'), gi(seg({ aria: 'Finish', options: FINISHES, get: () => sel().finish, set: (v) => devSet((x) => { x.finish = v; }) })),
      d.type === 'phone' || d.type === 'tablet' ? gi(toggle({ label: 'Landscape', get: () => sel().landscape, set: (v) => devSet((x) => { x.landscape = v; }) })) : null,
      d.type === 'laptop' ? gi(slider({ label: 'Lid angle', min: 70, max: 135, step: 1, fmt: fmtDeg, get: () => sel().hinge, set: (v) => devSet((x) => { x.hinge = v; }, 'hinge') })) : null,
      d.type === 'panel' ? [label('Panel shape'), gi(seg({ aria: 'Panel aspect', options: PANEL_ASPECTS, get: () => sel().aspect, set: (v) => devSet((x) => { x.aspect = v; }) }))] : null);

    // SCREEN
    const picks = h('div', { class: 'mb-picks' },
      h('button', { type: 'button', class: 'mb-pick is-none', title: 'Use the placeholder screen', 'aria-pressed': !d.screen.assetId, onclick: () => assignScreen(d.id, null) }, h('span', { text: 'NONE' })),
      P().assets.map((id) => {
        const a = assets.get(id);
        return a ? h('button', { type: 'button', class: 'mb-pick', title: a.name, 'aria-pressed': d.screen.assetId === id, onclick: () => assignScreen(d.id, id) }, h('img', { src: a.thumb, alt: a.name }), a.kind === 'video' ? h('span', { class: 'mb-badge', html: ICON.film }) : null) : null;
      }));
    const screen = mod('Screen', { family: 'blue', ch: 'CH 5' },
      picks,
      row(key('Upload & place', { icon: ICON.up, onClick: async () => { const f = await pickFiles(ACCEPT); if (f.length) addFiles(f, app.store.ui.selected); } })),
      label('Fit'), gi(seg({ aria: 'Screen fit', options: [{ id: 'fill', name: 'Fill', title: 'Cover the display, crop overflow' }, { id: 'fit', name: 'Fit', title: 'Show the whole design, no crop' }], get: () => sel().screen.fit, set: (v) => devSet((x) => { x.screen.fit = v; if (v === 'fill') x.screen.zoom = Math.max(1, x.screen.zoom); }) })),
      gi(slider({ label: 'Zoom', min: 0.5, max: 4, step: 0.01, fmt: (v) => `${v.toFixed(2)}×`, get: () => sel().screen.zoom, set: (v) => devSet((x) => { x.screen.zoom = x.screen.fit === 'fill' ? Math.max(1, v) : v; }, 'zoom') })),
      gi(slider({ label: 'Move ↔', min: -1, max: 1, step: 0.01, fmt: (v) => v.toFixed(2), get: () => sel().screen.ox, set: (v) => devSet((x) => { x.screen.ox = v; }, 'ox') })),
      gi(slider({ label: 'Move ↕', min: -1, max: 1, step: 0.01, fmt: (v) => v.toFixed(2), get: () => sel().screen.oy, set: (v) => devSet((x) => { x.screen.oy = v; }, 'oy') })),
      row(key('Reset crop', { onClick: () => devSet((x) => { Object.assign(x.screen, { fit: 'fill', zoom: 1, ox: 0, oy: 0 }); }) })),
      readout('Designs are never stretched or redrawn'));

    // PLACE
    const place = mod('Place', { family: 'blue', ch: 'CH 6' },
      gi(slider({ label: 'Left / right', min: -4, max: 4, step: 0.01, get: () => sel().pos[0], set: (v) => devSet((x) => { x.pos[0] = v; }, 'px') })),
      gi(slider({ label: 'Up / down', min: -3, max: 3, step: 0.01, get: () => sel().pos[1], set: (v) => devSet((x) => { x.pos[1] = v; }, 'py') })),
      gi(slider({ label: 'Depth', min: -4, max: 3, step: 0.01, adv: true, get: () => sel().pos[2], set: (v) => devSet((x) => { x.pos[2] = v; }, 'pz') })),
      gi(slider({ label: 'Scale', min: 0.2, max: 3, step: 0.01, get: () => sel().scale, set: (v) => devSet((x) => { x.scale = v; }, 'sc') })),
      gi(slider({ label: 'Turn (Y)', min: -90, max: 90, step: 1, fmt: fmtDeg, get: () => sel().rot[1], set: (v) => devSet((x) => { x.rot[1] = v; }, 'ry') })),
      gi(slider({ label: 'Tilt (X)', min: -90, max: 90, step: 1, fmt: fmtDeg, get: () => sel().rot[0], set: (v) => devSet((x) => { x.rot[0] = v; }, 'rx') })),
      gi(slider({ label: 'Roll (Z)', min: -180, max: 180, step: 1, fmt: fmtDeg, adv: true, get: () => sel().rot[2], set: (v) => devSet((x) => { x.rot[2] = v; }, 'rz') })),
      row(key('Reset rotation', { onClick: () => devSet((x) => { x.rot = [0, 0, 0]; }) })),
      readout('Drag in the preview · scroll to scale · Alt-drag to rotate'));
    body.append(model, screen, place);
  }

  return {
    el: h('div', { class: 'mb-stack' }, listMod, body),
    sync() {
      const p = P(), d = sel();
      const l = p.devices.map((x) => [x.id, x.type, x.color, x.screen.assetId].join()).join('|') + app.store.ui.selected;
      if (l !== lsig) { lsig = l; buildList(); }
      const b = d ? [d.id, d.type, d.landscape, p.assets.join(), d.screen.assetId].join() : 'none';
      if (b !== bsig) { bsig = b; buildBody(); }
      g.sync();
    },
  };
}

// =========================================================================================================
function styleTab() {
  const g = new Group();
  const bg = () => P().style.bg;
  const gi = (c) => g.add(c);

  // ---- background
  const typeSeg = gi(seg({ aria: 'Background type', options: [{ id: 'gradient', name: 'Gradient' }, { id: 'solid', name: 'Solid' }, { id: 'image', name: 'Image' }, { id: 'transparent', name: 'None' }], get: () => bg().type, set: (v) => S((p) => { p.style.bg.type = v; }) }));
  const chips = h('div', { class: 'mb-grads' }, GRADIENTS.map((gr) => {
    const css = gr.type === 'radial' ? `radial-gradient(circle at 50% 40%, ${gr.stops.join(',')})` : gr.type === 'aurora' ? `radial-gradient(circle at 20% 20%, ${gr.stops[1]}, transparent 60%), radial-gradient(circle at 80% 80%, ${gr.stops[3] || gr.stops[2]}, transparent 60%), ${gr.stops[0]}` : `linear-gradient(${gr.angle}deg, ${gr.stops.join(',')})`;
    return h('button', { type: 'button', class: 'mb-grad', title: gr.name, 'aria-label': gr.name, 'aria-pressed': 'false', 'data-id': gr.id, style: { background: css }, onclick: () => S((p) => { p.style.bg.gradient = clone(gr); p.style.bg.type = 'gradient'; }) });
  }));
  const gradSeg = gi(seg({ aria: 'Gradient style', options: [{ id: 'linear', name: 'Linear' }, { id: 'radial', name: 'Radial' }, { id: 'aurora', name: 'Aurora' }], get: () => bg().gradient.type, set: (v) => S((p) => { p.style.bg.gradient.type = v; p.style.bg.gradient.id = 'custom'; }) }));
  const angle = gi(slider({ label: 'Angle', min: 0, max: 360, step: 1, fmt: fmtDeg, get: () => bg().gradient.angle, set: (v) => S((p) => { p.style.bg.gradient.angle = v; p.style.bg.gradient.id = 'custom'; }, 'gang') }));
  const stopsBox = h('div', { class: 'mb-stops' });
  let ssig = '';
  const buildStops = () => {
    const st = bg().gradient.stops;
    stopsBox.replaceChildren(...st.map((c, i) => {
      const inp = h('input', { type: 'color', class: 'mb-sw mb-sw-custom', value: c, 'aria-label': `Gradient colour ${i + 1}`, oninput: () => S((p) => { p.style.bg.gradient.stops[i] = inp.value; p.style.bg.gradient.id = 'custom'; }, `gst${i}`) });
      return inp;
    }), st.length < 4 ? key('', { icon: ICON.plus, className: 'mb-mini', title: 'Add colour stop', onClick: () => S((p) => { const s = p.style.bg.gradient.stops; s.push(s[s.length - 1]); p.style.bg.gradient.id = 'custom'; }) }) : null,
    st.length > 2 ? key('', { icon: ICON.x, className: 'mb-mini', title: 'Remove last colour stop', onClick: () => S((p) => { p.style.bg.gradient.stops.pop(); p.style.bg.gradient.id = 'custom'; }) }) : null);
  };
  const gradBox = h('div', { class: 'mb-stack-sm' }, label('Presets'), chips, label('Edit'), gradSeg, angle, stopsBox);
  const solidBox = h('div', { class: 'mb-stack-sm' }, gi(swatches({ colors: SOLIDS, get: () => bg().color, set: (c) => S((p) => { p.style.bg.color = c; p.style.bg.type = 'solid'; }, 'solid') })));
  const imgBox = h('div', { class: 'mb-stack-sm' },
    row(key('Upload background', { icon: ICON.up, onClick: async () => {
      const f = (await pickFiles('image/*', false))[0]; if (!f) return;
      try { const a = await assets.add(f); S((p) => { p.style.bg.image.assetId = a.id; p.style.bg.type = 'image'; }); } catch (e) { toast(e.message, 'err'); }
    } })),
    gi(seg({ aria: 'Background image fit', options: [{ id: 'cover', name: 'Cover' }, { id: 'contain', name: 'Contain' }], get: () => bg().image.fit, set: (v) => S((p) => { p.style.bg.image.fit = v; }) })));
  const transBox = h('div', { class: 'mb-stack-sm' }, readout('Transparent: export a PNG with no background'));
  const bgMod = mod('Background', { family: 'blue', ch: 'CH 7' }, typeSeg, gradBox, solidBox, imgBox, transBox,
    gi(slider({ label: 'Intensity', min: 0, max: 130, step: 1, fmt: fmtPct, get: () => bg().intensity, set: (v) => S((p) => { p.style.bg.intensity = v; }, 'bgi') })),
    gi(slider({ label: 'Vignette', min: 0, max: 100, step: 1, fmt: fmtPct, adv: true, get: () => bg().vignette, set: (v) => S((p) => { p.style.bg.vignette = v; }, 'vig') })));

  // ---- light
  const L = () => P().style.light;
  const lk = (k) => (v) => S((p) => { p.style.light[k] = v; }, `l${k}`);
  const lightMod = mod('Light & shadow', { family: 'blue', ch: 'CH 8' },
    gi(slider({ label: 'Key light', min: 0, max: 4, step: 0.05, get: () => L().key, set: lk('key') })),
    gi(slider({ label: 'Light direction', min: -80, max: 80, step: 1, fmt: fmtDeg, get: () => L().azimuth, set: lk('azimuth') })),
    gi(slider({ label: 'Light height', min: 5, max: 85, step: 1, fmt: fmtDeg, adv: true, get: () => L().elevation, set: lk('elevation') })),
    gi(slider({ label: 'Ambient', min: 0, max: 2, step: 0.05, adv: true, get: () => L().ambient, set: lk('ambient') })),
    gi(slider({ label: 'Shadow', min: 0, max: 1, step: 0.01, fmt: fmtPct2, get: () => L().shadow, set: lk('shadow') })),
    gi(slider({ label: 'Shadow softness', min: 0, max: 1, step: 0.01, fmt: fmtPct2, get: () => L().softness, set: lk('softness') })),
    gi(slider({ label: 'Shadow distance', min: 0, max: 3, step: 0.05, adv: true, get: () => L().shadowDist, set: lk('shadowDist') })),
    gi(slider({ label: 'Reflections', min: 0, max: 2, step: 0.05, get: () => L().reflections, set: lk('reflections') })));

  // ---- stage props
  const PF = () => P().style.platform, DC = () => P().style.decor;
  const stageMod = mod('Stage', { family: 'blue', ch: 'CH 9' },
    label('Platform'), gi(seg({ aria: 'Platform', options: PLATFORMS, get: () => PF().type, set: (v) => S((p) => { p.style.platform.type = v; }) })),
    gi(swatches({ colors: ['#eee9de', '#ffffff', '#2b2d35', '#f5c531', '#2659c9', '#cc2e27'], get: () => PF().color, set: (c) => S((p) => { p.style.platform.color = c; }, 'pfc') })),
    gi(seg({ aria: 'Platform finish', options: FINISHES, get: () => PF().finish, set: (v) => S((p) => { p.style.platform.finish = v; }) })),
    gi(slider({ label: 'Platform size', min: 0.5, max: 2, step: 0.01, adv: true, get: () => PF().size, set: (v) => S((p) => { p.style.platform.size = v; }, 'pfs') })),
    label('Decorative objects'), gi(seg({ aria: 'Decor set', options: DECOR_SETS, get: () => DC().set, set: (v) => S((p) => { p.style.decor.set = v; }) })),
    gi(seg({ aria: 'Decor palette', options: Object.keys(DECOR_PALETTES).map((id) => ({ id, name: id })), get: () => DC().palette, set: (v) => S((p) => { p.style.decor.palette = v; }) })),
    gi(slider({ label: 'Amount', min: 0.4, max: 2, step: 0.05, get: () => DC().amount, set: (v) => S((p) => { p.style.decor.amount = v; }, 'dca') })),
    row(key('Shuffle', { onClick: () => S((p) => { p.style.decor.seed = Math.floor(Math.random() * 9999); }) })));

  // ---- presets
  const plist = h('div', { class: 'mb-presets' });
  const pname = textField({ label: 'Preset name', get: () => '', set: () => {}, placeholder: 'Case study look' });
  let psig = '';
  const buildPresets = () => {
    plist.replaceChildren(...(app.presets.length ? app.presets.map((r) => h('div', { class: 'mb-preset' },
      h('button', { type: 'button', class: 'mb-preset-main', onclick: () => applyPreset(r.id) }, h('span', { class: 'mb-grad-mini', style: { background: r.style.bg.type === 'gradient' ? `linear-gradient(${r.style.bg.gradient.angle}deg, ${r.style.bg.gradient.stops.join(',')})` : r.style.bg.color } }), h('span', { text: r.name })),
      key('', { icon: ICON.trash, className: 'mb-mini', title: 'Delete preset', onClick: () => deletePreset(r.id) }))) : [readout('No presets yet')]));
  };
  const presetMod = mod('Presets', { family: 'blue', ch: 'CH 10' }, readout('Save background, light, stage, camera angle and motion as one look'), pname,
    row(key('Save current look', { icon: ICON.plus, onClick: async () => { await savePreset(pname.input.value.trim()); pname.input.value = ''; } })), plist);

  return {
    el: h('div', { class: 'mb-stack' }, bgMod, lightMod, stageMod, presetMod),
    sync() {
      const t = bg().type;
      gradBox.hidden = t !== 'gradient'; solidBox.hidden = t !== 'solid'; imgBox.hidden = t !== 'image'; transBox.hidden = t !== 'transparent';
      const gr = bg().gradient;
      angle.hidden = gr.type !== 'linear';
      for (const c of chips.children) c.setAttribute('aria-pressed', c.dataset.id === gr.id);
      const s = gr.stops.length + '|' + (gr.id === 'custom');
      if (s !== ssig) { ssig = s; buildStops(); }
      const stin = stopsBox.querySelectorAll('input[type=color]');
      gr.stops.forEach((c, i) => { if (stin[i] && document.activeElement !== stin[i]) stin[i].value = c; });
      const ps = app.presets.map((r) => r.id + r.name).join();
      if (ps !== psig) { psig = ps; buildPresets(); }
      g.sync();
    },
  };
}
const fmtPct2 = (v) => `${Math.round(v * 100)}%`;

// =========================================================================================================
function cameraTab() {
  const g = new Group();
  const C = () => P().camera;
  const ck = (k, key) => (v) => S((p) => { p.camera[k] = v; }, key || `c${k}`);
  const gi = (c) => g.add(c);
  const m = mod('Camera', { family: 'blue', ch: 'CH 11' },
    gi(slider({ label: 'Angle ↔', min: -80, max: 80, step: 0.5, fmt: fmtDeg, get: () => C().az, set: ck('az') })),
    gi(slider({ label: 'Angle ↕', min: -40, max: 80, step: 0.5, fmt: fmtDeg, get: () => C().el, set: ck('el') })),
    gi(slider({ label: 'Zoom', min: 0.4, max: 3, step: 0.01, fmt: (v) => `${v.toFixed(2)}×`, get: () => C().zoom, set: ck('zoom') })),
    gi(slider({ label: 'Perspective', min: 8, max: 70, step: 0.5, fmt: fmtDeg, get: () => C().fov, set: ck('fov') })),
    gi(slider({ label: 'Pan ↔', min: -4, max: 4, step: 0.01, adv: true, get: () => C().panX, set: ck('panX') })),
    gi(slider({ label: 'Pan ↕', min: -3, max: 3, step: 0.01, adv: true, get: () => C().panY, set: ck('panY') })),
    row(key('Auto-frame', { icon: ICON.target, onClick: () => S((p) => { autoFrame(p); p.camera.zoom = 1; }) }),
      key('Reset', { onClick: () => S((p) => { const d = defaultCamera(); Object.assign(p.camera, { az: d.az, el: d.el, zoom: 1, fov: d.fov }); autoFrame(p); }) })),
    readout('Drag empty space to orbit · scroll to zoom · Shift-drag to pan'));
  return { el: h('div', { class: 'mb-stack' }, m), sync() { g.sync(); } };
}

// =========================================================================================================
function motionTab() {
  const g = new Group();
  const M = () => P().motion;
  const mk = (k, key) => (v) => S((p) => { p.motion[k] = v; }, key || `m${k}`);
  const gi = (c) => g.add(c);
  const hint = readout('');
  const presets = gi(seg({ aria: 'Motion preset', className: 'mb-seg-wrap', options: MOTIONS.map((x) => ({ id: x.id, name: x.name, title: x.hint })), get: () => M().preset, set: (v) => S((p) => { p.motion.preset = v; }) }));
  const loopDial = gi(seg({ aria: 'Loop behaviour', options: [{ id: 'loop', name: 'Loop' }, { id: 'pingpong', name: 'Ping-pong' }, { id: 'once', name: 'Play once' }], get: () => M().loop, set: (v) => S((p) => { p.motion.loop = v; }) }));
  const dur = gi(slider({ label: 'Duration', min: 1, max: 30, step: 0.5, fmt: (v) => `${v.toFixed(1)} s`, get: () => M().duration, set: mk('duration') }));
  const spd = gi(slider({ label: 'Speed', min: 1, max: 4, step: 1, fmt: (v) => `${v}×`, get: () => M().speed, set: mk('speed') }));
  const inten = gi(slider({ label: 'Strength', min: 0.2, max: 2, step: 0.05, fmt: (v) => v.toFixed(2), get: () => M().intensity, set: mk('intensity') }));
  const ease = gi(seg({ aria: 'Easing', options: EASINGS, get: () => M().easing, set: mk('easing') }));
  const vidMatch = row(key('Match video length', { icon: ICON.film, onClick: () => {
    const lens = P().devices.map((d) => assets.get(d.screen.assetId)).filter((a) => a?.kind === 'video').map((a) => a.duration);
    if (lens.length) S((p) => { p.motion.duration = Math.min(60, Math.max(1, Math.round(Math.max(...lens) * 2) / 2)); });
  } }));
  const mot = mod('Motion', { family: 'blue', ch: 'CH 12' }, presets, hint,
    h('div', { class: 'mb-note-dark' }, 'Turn on ANIMATE under the preview to play and export video.'),
    dur, spd, inten, label('Easing'), ease, label('When it ends'), loopDial, vidMatch);

  // poses
  const poseToggle = gi(toggle({ label: 'Start & end poses', get: () => M().usePoses, set: (v) => setPoses(v) }));
  const poseBtns = h('div', { class: 'mb-stack-sm' });
  const poseHint = readout('');
  const buildPoseBtns = () => {
    const ed = app.store.ui.editingPose;
    poseBtns.replaceChildren(ed
      ? h('div', { class: 'mb-stack-sm' }, readout(`Editing ${ed.slot.toUpperCase()} pose: move devices and camera, then save`), row(key('Save pose', { hot: true, onClick: () => endPoseEdit(true) }), key('Cancel', { onClick: () => endPoseEdit(false) })))
      : row(key('Edit start', { onClick: () => beginPoseEdit('start') }), key('Edit end', { onClick: () => beginPoseEdit('end') })));
  };
  const poses = mod('Poses', { family: 'blue', ch: 'CH 13' }, readout('Place the scene at each end; the app animates between them'), poseToggle, poseBtns, poseHint);
  let psig = '';

  return {
    el: h('div', { class: 'mb-stack' }, mot, poses),
    sync() {
      const ed = app.store.ui.editingPose;
      const s = `${!!ed}${ed?.slot}${M().usePoses}`;
      if (s !== psig) { psig = s; buildPoseBtns(); }
      poseBtns.hidden = !M().usePoses;
      hint.textContent = MOTIONS.find((x) => x.id === M().preset)?.hint || '';
      poseHint.textContent = M().usePoses ? 'Presets add motion on top of the pose transition' : '';
      vidMatch.hidden = !P().devices.some((d) => assets.get(d.screen.assetId)?.kind === 'video');
      g.sync();
    },
  };
}

// =========================================================================================================
function exportTab() {
  const g = new Group();
  const E = () => P().export;
  const gi = (c) => g.add(c);
  const dims = readout('');
  const note = readout('');
  const transKey = row(key('Make background transparent', { onClick: () => S((p) => { p.style.bg.type = 'transparent'; }) }));
  const custom = h('div', { class: 'mb-two' },
    gi(numberField({ label: 'Width', min: 64, max: 8192, get: () => P().canvas.w, set: (v) => S((p) => { p.canvas.aspect = 'custom'; p.canvas.w = Math.round(v); }) })),
    gi(numberField({ label: 'Height', min: 64, max: 8192, get: () => P().canvas.h, set: (v) => S((p) => { p.canvas.aspect = 'custom'; p.canvas.h = Math.round(v); }) })));
  const imgMod = mod('Image', { family: 'blue', ch: 'OUT 1' },
    label('Format'), gi(seg({ aria: 'Image format', options: [{ id: 'png', name: 'PNG' }, { id: 'jpg', name: 'JPG' }], get: () => E().image, set: (v) => S((p) => { p.export.image = v; }) })),
    label('Size (long side)'), gi(seg({ aria: 'Long side', options: LONG_SIDES.map((v) => ({ id: v, name: v >= 3840 ? `${v / 1000 | 0}K` : String(v) })), get: () => E().long, set: (v) => S((p) => { p.export.long = Number(v); }) })),
    custom,
    gi(slider({ label: 'JPG quality', min: 0.5, max: 1, step: 0.01, fmt: fmtPct2, get: () => E().quality, set: (v) => S((p) => { p.export.quality = v; }, 'jq') })),
    dims, transKey, note,
    row(key('Download image', { hot: true, icon: ICON.download, onClick: () => runImageExport() })));

  const vdims = readout('');
  const vnote = readout('');
  const vidMod = mod('Video', { family: 'blue', ch: 'OUT 2' },
    label('Resolution (long side)'), gi(seg({ aria: 'Video size', options: [{ id: 1280, name: '720p' }, { id: 1920, name: '1080p' }, { id: 2560, name: '1440p' }, { id: 3840, name: '4K' }], get: () => E().vlong ?? 1920, set: (v) => S((p) => { p.export.vlong = Number(v); }) })),
    label('Frame rate'), gi(seg({ aria: 'Frame rate', options: [{ id: 24, name: '24' }, { id: 30, name: '30' }, { id: 60, name: '60' }], get: () => E().fps, set: (v) => S((p) => { p.export.fps = Number(v); }) })),
    label('Quality'), gi(seg({ aria: 'Bitrate', options: [{ id: 'standard', name: 'Standard' }, { id: 'high', name: 'High' }, { id: 'max', name: 'Max' }], get: () => E().bitrate, set: (v) => S((p) => { p.export.bitrate = v; }) })),
    vdims, vnote,
    row(key('Export MP4', { hot: true, icon: ICON.film, onClick: () => runVideoExport() })));

  return {
    el: h('div', { class: 'mb-stack' }, imgMod, vidMod),
    sync() {
      const p = P();
      const d = exportDims(p);
      const cl = clampToGpu(d.w, d.h);
      dims.textContent = `${cl.w} × ${cl.h} px${cl.w !== d.w ? ' (limited by this GPU)' : ''}${p.export.image === 'jpg' ? ' · JPG' : p.style.bg.type === 'transparent' ? ' · transparent PNG' : ' · PNG'}`;
      custom.hidden = p.canvas.aspect !== 'custom';
      transKey.hidden = !(p.export.image === 'png' && p.style.bg.type !== 'transparent');
      note.textContent = p.export.image === 'jpg' && p.style.bg.type === 'transparent' ? 'JPG has no transparency; white fills the background' : '';
      const vd = exportDims(p, p.export.vlong ?? 1920);
      const m = p.motion;
      const frames = Math.round(m.duration * p.export.fps);
      vdims.textContent = `${vd.w & ~1} × ${vd.h & ~1} · ${p.export.fps} fps · ${m.duration.toFixed(1)} s · ${frames} frames`;
      vnote.textContent = !videoSupported() ? 'This browser has no WebCodecs; use Chrome, Edge or Safari 16.4+' : m.mode !== 'animated' ? 'Turn on ANIMATE to export video' : p.style.bg.type === 'transparent' ? 'MP4 cannot be transparent; white fills the background' : '';
      g.sync();
    },
  };
}
export function clampToGpu(w, h) {
  const max = Math.min(app.engine.stage.maxTexture, 8192);
  const k = Math.min(1, max / Math.max(w, h));
  return { w: Math.round(w * k) & ~1, h: Math.round(h * k) & ~1 };
}

// =========================================================================================================
export function buildRight() {
  const tabs = { device: deviceTab(), style: styleTab(), camera: cameraTab(), motion: motionTab(), export: exportTab() };
  const names = { device: 'Device', style: 'Style', camera: 'Camera', motion: 'Motion', export: 'Export' };
  const bar = h('div', { class: 'mb-tabs', role: 'tablist' }, Object.keys(tabs).map((id) => h('button', { type: 'button', role: 'tab', class: 'an-key an-key--sm mb-tab', 'data-id': id, onclick: () => { app.store.ui.tab = id; app.store.emit('select'); } }, h('span', { class: 'an-key-cap', text: names[id] }))));
  const adv = toggle({ label: 'Advanced controls', get: () => app.store.ui.advanced, set: (v) => { app.store.ui.advanced = v; app.store.emit('select'); } });
  const panes = Object.fromEntries(Object.entries(tabs).map(([id, t]) => [id, h('div', { class: 'mb-pane', role: 'tabpanel', hidden: true }, t.el)]));
  const el = h('div', { class: 'mb-stack' }, h('section', { class: 'an-slab an-blue an-mod mb-tabmod', 'aria-label': 'Control tabs' }, bar, adv), ...Object.values(panes));
  return {
    el,
    sync() {
      const cur = app.store.ui.tab;
      for (const b of bar.children) { const on = b.dataset.id === cur; b.classList.toggle('is-down', on); b.setAttribute('aria-selected', on); }
      for (const [id, pane] of Object.entries(panes)) pane.hidden = id !== cur;
      el.classList.toggle('show-adv', app.store.ui.advanced);
      adv.sync();
      tabs[cur].sync();
    },
  };
}
