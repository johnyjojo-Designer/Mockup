// Project store with undo/redo. History entries are JSON snapshots; rapid changes with the same
// key (slider drags, pointer drags) coalesce into one undo step.

export class Store {
  constructor() {
    this.state = null;
    this.undoStack = [];
    this.redoStack = [];
    this.subs = new Set();
    this.lastKey = null;
    this.lastT = 0;
    this.holding = false; // true while a pointer gesture (drag, slider) is in progress
    this.ui = { selected: null, tab: 'device', advanced: false, editingPose: null };
  }

  on(fn) { this.subs.add(fn); return () => this.subs.delete(fn); }
  emit(kind, info) { for (const fn of this.subs) fn(kind, info); }

  load(project) {
    this.state = project;
    this.undoStack = [];
    this.redoStack = [];
    this.lastKey = null;
    this.ui.selected = project.devices[0]?.id ?? null;
    this.emit('load');
  }

  set(mutator, { key = null, history = true } = {}) {
    const before = JSON.stringify(this.state);
    mutator(this.state);
    const after = JSON.stringify(this.state);
    if (before === after) return false;
    const now = performance.now();
    if (history && !(key && key === this.lastKey && (this.holding || now - this.lastT < 900))) {
      this.undoStack.push(before);
      if (this.undoStack.length > 100) this.undoStack.shift();
      this.redoStack = [];
    }
    this.lastKey = key;
    this.lastT = now;
    this.emit('change', { key });
    return true;
  }

  get canUndo() { return this.undoStack.length > 0; }
  get canRedo() { return this.redoStack.length > 0; }

  undo() {
    if (!this.canUndo) return;
    this.redoStack.push(JSON.stringify(this.state));
    this.state = JSON.parse(this.undoStack.pop());
    this.lastKey = null;
    this.fixSelection();
    this.emit('history');
  }

  redo() {
    if (!this.canRedo) return;
    this.undoStack.push(JSON.stringify(this.state));
    this.state = JSON.parse(this.redoStack.pop());
    this.lastKey = null;
    this.fixSelection();
    this.emit('history');
  }

  fixSelection() {
    if (!this.state.devices.some((d) => d.id === this.ui.selected)) this.ui.selected = this.state.devices[0]?.id ?? null;
  }

  select(id) {
    if (this.ui.selected === id) return;
    this.ui.selected = id;
    this.emit('select');
  }

  get selected() { return this.state.devices.find((d) => d.id === this.ui.selected) || null; }
}
