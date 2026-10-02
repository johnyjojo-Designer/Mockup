# Patchbay Sign-up
A hardware-pop style study for a sign-up form, where every field is a physical module and the form's status is a battery.

**Role** [[NEED: your title]] — art direction, interaction and visual style  ·  **Team** Solo, built with Claude as a coding partner [[CHECK: how to credit this]]  ·  **Timeline & Status** [[NEED: duration]] · Concept (sample data only, no account is created)  ·  **Platform** Web, single HTML file, light / auto / dark themes

Sign-up forms are the most-used and least-loved screens in a product, and a style brief written in adjectives gives nobody anything to push against. So I built one form to be the brief. Patchbay's sign-up is a rack of ink-outlined modules: each field has a recessed screen, a channel label and an LED that reports its state, and the submit button is a keycap that presses down. [[NEED: who the "real brief" is for, and what product "Patchbay" stands in for]]

**What this explores** — Whether one saturated, physical visual language can carry a form's states (editing, valid, error, done) without leaning on color-only cues or blur.
**Early signal** — The plate text now passes the 4.5:1 contrast target in light and dark (computed from the hex values, not user-tested).

> **Figure 1 — Hero: the full form in light mode.** Caption: "Four fields, four channels, one battery. Everything on screen is a control or a readout." [[NEED: screenshot]]

## A style guide in words doesn't survive contact with a form

The form is the smallest thing that has every state a style has to handle: empty, focused, valid, invalid, disabled-until-ready, success. It also has the controls that usually get styled last (a checkbox, a show/hide toggle, a submit). If the look holds up on those, it holds up on a product. [[CHECK: is this the reasoning you started with?]]

**The challenge:** make a form feel like a piece of hardware without making it harder to fill in. [[NEED: your own one-line version of this]]

## Six rules, written down so the next screen can follow them

The page ends with a "Style notes" legend marked *for the real brief*. The rules it locks in:

- **Outline.** Every object gets a 2.5px ink stroke; objects meet the ground through outline and color, never blur.
- **Depth.** A 5–14px flat-front extrusion in a darker shade of the same hue, and a 7px hard diagonal shadow.
- **Screens.** Dark recesses for text, with lime for LCD readouts.
- **Controls.** Keys and switches press down into their side face.
- **Color.** One saturated hue per object, never blended, with bone and smoke as neutrals.
- **Type.** Archivo condensed for plates and keys, DM Mono caps for labels and readouts.

> **Figure 2 — The style-notes legend and nine swatches.** Caption: "The rules sit next to the swatches they govern, so the sample is also the spec." [[NEED: screenshot]]

## Decision 1 — Validation lives in the hardware, not beside it

Each field reports through an LED that is amber while you type, green when valid and red when it needs a fix, with a plain-language readout underneath ("Add an @ and a domain, like name@site.com"; "5 / 8 characters"). A battery module counts how many of the four fields are ready and the submit key carries the final state. [[NEED: what else did you consider for showing field state? Inline error text only? A progress bar?]] [[NEED: why a battery rather than a plain progress bar?]]

I kept a readout line under every LED so the state is never only a color. [[CHECK: was that deliberate from the start, or added after seeing LED-only?]]

> **Figure 3 — One field in four states.** Caption: "Amber, green and red LEDs, each paired with a sentence, so the color is never the only signal." [[NEED: screenshot]]

## Decision 2 — Make the engraved text readable, then keep the engraving

The engraved plate text looked right and read badly. I darkened it until it cleared 4.5:1 (the WCAG AA contrast minimum for body text) rather than dropping the engraved look. On the light plate, text went from about 3.25:1 to 4.72:1; on the dark plate, from about 4.19:1 to 4.99:1. [[NEED: how did you notice — a checker, by eye, an audit?]] [[NEED: any option you weighed, such as bigger text or a lighter plate?]]

The dark theme's raised plate-top surface is a lighter ground than the plate itself, so I'd check that pairing separately. [[CHECK: is plate text ever set on plate-top? If so, it measures about 3.8:1 in dark.]]

> **Figure 4 — Plate text before and after.** Caption: "Before: #7A7364 on #DCD6C9, ≈3.25:1. After: #615A4C, ≈4.72:1. The engraving survives; the squint doesn't." [[NEED: side-by-side crops]]

## What shipped

A single `index.html`: a form with name, email, password (with a show key and a four-segment strength meter), a terms switch, a theme dial (light / auto / dark), and a success ticket that says no account was created. It is a style sample, labelled "Sample data loaded" and "Rev 0.3" on its own nameplate.

## What it does and doesn't show

It shows a visual system holding up across every state of one form, in both themes, at the contrast target I set. It doesn't show that anyone completes this form faster or more happily than a flat one, or that the extruded look holds on a dense screen. [[NEED: any quick test, even 3–5 people? One quote?]]

## Looking back

- **One screen can be the brief.** [[NEED: did it work? Has anyone used the style notes yet, and for what?]]
- **Accessibility belongs in the first pass.** The contrast fix arrived after the look was set. [[NEED: what you'd do differently, in your words]]
- **How I'd test it.** [[NEED: what you'd measure — completion time, error rate, preference vs. a flat version]]

*Built with Claude.* [[NEED: any other credits]]
