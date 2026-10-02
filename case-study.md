# Mockbay
A browser tool that turns flat screenshots into animated 3D device mockups, built as a rack of hardware modules.

**Role** [[NEED: your title]] — product, interaction and visual design  ·  **Team** Solo, built with Claude as a coding partner [[CHECK: how to credit this]]  ·  **Timeline & Status** [[NEED: duration]] · [[NEED: live / prototype / personal tool?]]  ·  **Platform** Web (desktop-first, responsive down to phone width)

[[NEED: the tension, in your words. Why did you build this? A guess for you to confirm or kill: showing screens in a portfolio case study means flat screenshots or a slow trip through a mockup tool.]] Mockbay is my answer: drop in screens, pick a starting composition, set a light and a motion, export a still or a video. The whole interface looks like equipment, with no panel chrome or floating toolbars.

**What this explores** — Whether a creative tool with a dozen sliders can feel like a tidy piece of hardware instead of a settings page, and whether four steps (Screens › Scene › Motion › Export) are enough to get from upload to export.
**Status** — [[NEED: shipped / shared / used by anyone? Any real usage or feedback?]]

> **Figure 1 — Hero: the full workspace.** Caption: "Screens and mockup controls on the left, model and scene on the right, the live render in the middle, timeline and export along the bottom." [[NEED: screenshot]]

## Mockup tools make you leave the thing you were making

[[NEED: what was wrong with the tools you tried, in your own units? Which tools, how many steps, how long did a mockup take?]] The brief I set myself: a tool whose controls are as legible as its output, so the stage stays the biggest thing on screen.

**The challenge:** give a 3D scene controls for devices, camera, light and motion without burying the render. [[NEED: confirm or rewrite]]

## The interface is one idea: modules on a rack

The workspace runs on the visual system from an earlier sign-up form study (Patchbay): ink-outlined slabs with a flat-front extrusion, recessed dark screens, keys that press down, LED status lights. Mockbay reuses its tokens and components directly, and swaps the form fields for a stage, sliders, swatches and a timeline. [[CHECK: was the sign-up study the design system you meant to build Mockbay from?]]

- **Controls are grouped by job and colour-coded.** The module tags use one colour per group (Screens yellow, Mockups orange, Output green, Devices red, Model blue; Scene groups follow the same rule).
- **Advanced controls are hidden until asked for.** Extra sliders stay out of the way behind a toggle. [[NEED: why — what did the full panel feel like?]]
- **State is visible, not implied.** The top bar shows AUTOSAVED / Saved, the export shows "Rendering W × H px" before you commit, and a status line spells out the four steps.

> **Figure 2 — A rail module.** Caption: "Tag, channel label, LED, then controls. The same anatomy as the sign-up form's fields, now holding sliders and swatches." [[NEED: screenshot]]

## Decision 1 — Start from a composition, not an empty stage

Instead of an empty scene, Mockbay opens on starting compositions: Hero phone, Phone pair, Three phones, Laptop hero, Laptop + phone, Desktop + phone, Tablet + phone, Floating screens, Screen stack, and more. Each is one click, and the screens you upload drop straight into it. [[NEED: what else did you weigh — an empty canvas, a single default scene, a wizard?]] [[NEED: why compositions? A hunch, a failed first version, something you saw?]]

> **Figure 3 — The composition picker.** Caption: "Each thumbnail is a layout, not a device, so the choice is about the story you're telling." [[NEED: screenshot]]

## Decision 2 — Reuse a look, don't rebuild it

A case study has several screens that should look like one family. So there's a **Duplicate** action that copies a composition with empty screens, ready for new uploads, and saved presets (the sample name in the project field is "Case study look"). Swapping one image can also replace that screen everywhere it appears. [[NEED: was this the original reason for the tool, or something you added after using it?]] [[NEED: any alternative you rejected, such as templates only?]]

## Decision 3 — Output that matches where it will live

Export covers PNG, JPG, WebP, MP4 and WebM, a transparent PNG option, aspect ratios from 9:16 to 16:9, resolutions from 720p to 4K, and frame rates of 24, 30 and 60. Motion has presets (slow rotation, float, camera orbit, staggered reveal, slide in) with easing and loop choices. [[NEED: why this set? What was cut?]]

> **Figure 4 — Export module.** Caption: "Format, ratio, size and frame rate on one panel, with the output pixel size confirmed before rendering." [[NEED: screenshot]]

## What it does and doesn't show

It shows a 3D editing tool whose whole control surface follows one physical metaphor and carries real tool states: undo and redo, autosave, multiple projects, light and dark themes. It doesn't show that anyone makes better mockups faster with it, or how the dense rails read on a small screen. [[NEED: any test, even you timing yourself, or 3–5 people trying it?]]

## Looking back

- [[NEED: what worked? One lesson from using it for a real case study]]
- [[NEED: what you'd do differently, in your words]]
- [[NEED: next steps]]

*Built with Claude.* [[NEED: other credits]]
