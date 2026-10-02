// Projects dialog: open, create, duplicate, duplicate-and-swap-screens, rename, delete.
import { h, ICON, toast } from './dom.js';
import { key } from './controls.js';
import { app, createProject, openProject, duplicateProject, renameProject, deleteProject, saveNow } from '../app.js';
import { db } from '../db.js';
import { TEMPLATES } from '../model.js';

export async function openProjectsDialog() {
  await saveNow();
  const prev = document.activeElement;
  const listEl = h('div', { class: 'mb-projects' });
  const tpl = h('select', { class: 'mb-select', 'aria-label': 'Starting composition' }, TEMPLATES.map((t) => h('option', { value: t.id, text: t.name, selected: t.id === 'three-phones' })));
  const close = () => { back.remove(); document.removeEventListener('keydown', onKey); prev?.focus?.(); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  const box = h('div', { class: 'an-slab an-bone mb-modal mb-modal-wide', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Projects' },
    h('div', { class: 'an-mod-head' }, h('span', { class: 'an-tag', text: 'Projects' }), h('span', { class: 'an-ch', text: 'AUTOSAVED' })),
    h('div', { class: 'mb-row mb-newrow' }, h('div', { class: 'an-screen mb-selwrap' }, tpl),
      key('New project', { hot: true, icon: ICON.plus, onClick: async () => { await createProject(tpl.value); close(); } })),
    listEl,
    h('div', { class: 'mb-row' }, key('Close', { onClick: close })));
  const back = h('div', { class: 'mb-backdrop', onclick: (e) => { if (e.target === back) close(); } }, box);
  document.body.append(back);
  document.addEventListener('keydown', onKey);

  async function render() {
    const items = await db.listProjects();
    listEl.replaceChildren(...items.map((it) => {
      const current = it.id === app.store.state.id;
      const name = h('input', { class: 'mb-text mb-projname', value: it.name, 'aria-label': 'Project name', maxlength: 60 });
      name.addEventListener('change', async () => { await renameProject(it.id, name.value.trim() || 'Untitled project'); render(); });
      let armed = false;
      const del = key('', { icon: ICON.trash, className: 'mb-mini', title: 'Delete project (click twice)', onClick: async () => {
        if (!armed) { armed = true; del.classList.add('is-armed'); setTimeout(() => { armed = false; del.classList.remove('is-armed'); }, 2500); toast('Click delete again to confirm'); return; }
        if (current) { toast('Open another project before deleting this one', 'err'); return; }
        await deleteProject(it.id); render();
      } });
      return h('div', { class: `mb-proj${current ? ' is-current' : ''}` },
        h('div', { class: 'mb-proj-thumb' }, it.thumb ? h('img', { src: it.thumb, alt: '' }) : h('span', { text: 'NO PREVIEW' })),
        h('div', { class: 'mb-proj-info' }, h('div', { class: 'an-screen' }, name), h('span', { class: 'an-readout', text: `${new Date(it.updated).toLocaleString()} · ${it.devices} device${it.devices === 1 ? '' : 's'}${current ? ' · open' : ''}` }),
          h('div', { class: 'mb-row' },
            current ? null : key('Open', { onClick: async () => { await openProject(it.id); close(); } }),
            key('Duplicate', { icon: ICON.copy, onClick: async () => { await duplicateProject(it.id); render(); toast('Project duplicated'); } }),
            key('Swap screens', { icon: ICON.swap, title: 'Duplicate this composition with empty screens, ready for new uploads', onClick: async () => { const id = await duplicateProject(it.id, { swap: true }); await openProject(id); close(); toast('Composition duplicated; upload the new screens'); } }),
            del)));
    }));
  }
  render();
  box.querySelector('select').focus();
}
