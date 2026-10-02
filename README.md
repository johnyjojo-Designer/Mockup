# Mockbay

Device mockups and motion for portfolios: upload UI screens or screen recordings, drop them into realistic devices,
style the scene, optionally animate it, and export PNG / JPG / MP4. Runs entirely in the browser (no backend).

UI follows the **Anime Design System** (toy-hardware slabs, keycaps, LCD readouts): tokens in `src/styles/tokens.css`,
components in `src/styles/anime.css`, app styling in `src/styles/app.css`.

## Run
```
npm install
npm run dev      # http://localhost:5173
npm run build
```

## How it works
- `src/devices.js`: procedural phone, tablet, laptop, desktop and frameless panel models. Screens use unlit materials, so uploaded designs keep exact colours and are never redrawn.
- `src/screens.js`: draws the image / video frame into a canvas with the display's aspect (fill, fit, zoom, pan) and uses it as the screen texture.
- `src/motion.js`: one deterministic `evaluate(project, progress)` drives preview, scrubbing, still export and video export. Presets: float, slow rotation, orbit, zoom, slide-in, staggered reveal, plus start/end poses.
- `src/compose.js`: background (gradient / solid / image / transparent) + 3D render, shared by preview and export.
- `src/exporter.js`: PNG/JPG stills; MP4 via WebCodecs + mp4-muxer (H.264, falling back to VP9/AV1 in MP4 when the browser has no H.264 encoder). Videos are seeked frame by frame so screen recordings play correctly.
- Projects, uploaded assets and style presets are stored in IndexedDB with autosave; undo/redo is snapshot based.

## Notes
- Video export needs a WebCodecs browser (Chrome, Edge, Safari 16.4+). Screen-recording audio is not exported.
- `studies/patchbay-signup.html` is the earlier design-system study that used to live at the repo root.
