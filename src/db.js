// IndexedDB persistence: projects, uploaded assets (blobs) and style presets.

const NAME = 'mockbay';
let dbp = null;

function open() {
  if (dbp) return dbp;
  dbp = new Promise((resolve, reject) => {
    const req = indexedDB.open(NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const s of ['projects', 'assets', 'presets']) if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbp;
}

async function tx(store, mode, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const s = t.objectStore(store);
    let out;
    Promise.resolve(fn(s)).then((r) => { out = r; });
    t.oncomplete = () => resolve(out);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}
const wrap = (req) => new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); });

export const db = {
  putProject: (rec) => tx('projects', 'readwrite', (s) => wrap(s.put(rec))),
  getProject: (id) => tx('projects', 'readonly', (s) => wrap(s.get(id))),
  deleteProject: (id) => tx('projects', 'readwrite', (s) => wrap(s.delete(id))),
  listProjects: async () => {
    const all = await tx('projects', 'readonly', (s) => wrap(s.getAll()));
    return all.map(({ id, name, updated, thumb, data }) => ({ id, name, updated, thumb, devices: data?.devices?.length ?? 0 })).sort((a, b) => b.updated - a.updated);
  },
  putAsset: (rec) => tx('assets', 'readwrite', (s) => wrap(s.put(rec))),
  getAsset: (id) => tx('assets', 'readonly', (s) => wrap(s.get(id))),
  deleteAsset: (id) => tx('assets', 'readwrite', (s) => wrap(s.delete(id))),
  allAssetIds: () => tx('assets', 'readonly', (s) => wrap(s.getAllKeys())),
  putPreset: (rec) => tx('presets', 'readwrite', (s) => wrap(s.put(rec))),
  deletePreset: (id) => tx('presets', 'readwrite', (s) => wrap(s.delete(id))),
  listPresets: async () => (await tx('presets', 'readonly', (s) => wrap(s.getAll()))).sort((a, b) => a.created - b.created),
};

export const lastProjectKey = 'mockbay:last';
