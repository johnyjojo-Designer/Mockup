> **DUMMY VERSION — FOR TESTING THE SKILL.** Every number, date, quote, name and outcome below is made up. Don't publish.

# Mockbay
From screenshot to animated 3D mockup in about six minutes, in a browser tool built like a rack of hardware.

**Role** Product designer — product, interaction and visual design, plus the front-end build  ·  **Team** Solo (me), with Dana Ortiz (motion designer) and five designers who tested it  ·  **Timeline & Status** 10 weeks · Live since March 2026  ·  **Platform** Web, desktop-first

My case-study screens sat in a folder for weeks because every mockup set cost me an afternoon. I timed it: 38 minutes of fiddling per set, and I had to do it again every time a screen changed. I built Mockbay to get that down, and the first version I built failed in testing, so most of what's below is about the second one.

**Impact**
- **Impact:** median time from upload to export fell from 38 to 6 minutes, timed on the same five case-study sets, my old workflow vs. Mockbay (measured by me, one person's workflow).
- **Early signal:** 4 of 5 designers exported a finished mockup in under 10 minutes without help, against 1 of 5 on the first version (5 testers, same task, moderated).
- **Status:** live since March 2026; 1,200 exports in the first six weeks (client-side counter, not unique users).

**What I did** — Defined the product and its four-step flow · Designed the hardware-style interface system · Led the pivot after the first test · Built and shipped the front end

> **Figure 1 — Hero: the full workspace.** Caption: "Controls on both rails, the live render in the middle, timeline and export below. See Results for the timings."

## Making one mockup meant leaving the screen I was designing

Each case-study set took me 38 minutes, timed over five sets, and most of it was repetition: place the same screens in the same device, match the same light, re-export in three sizes. Two things made it worse. Changing one screen meant redoing the set, and the tools I had treated the render as a small preview next to a wall of panels.

The challenge: give people a 3D scene with real control over devices, light and motion, without burying the render under the controls.

## The first version gave people a camera and nothing to say with it

V1 was a free-form scene editor: an empty stage, a device library and a camera you could move anywhere. It felt powerful to me. In the first test, five designers got the same task: turn three screens into one hero image. One of five finished. The other four spent the session orbiting the camera, and none of them reached export.

**The turn:** I'd designed for what the tool could do, and the task was a finished image. I stopped adding controls and started from the end: what does someone want to walk away with?

> **Figure 2 — V1 vs V2 on first open.** Caption: "Before: an empty stage and a camera. After: a composition already in place, with your screens dropped in."

## Decision 1 — Open on a composition, not a stage

I weighed two replacements for the empty stage. A step-by-step wizard would have guaranteed an export, but testers in the same session said they wanted to see the result change as they went. A template gallery in a separate screen would have kept the editor clean, but it split the choice from the result. I went with starting compositions inside the workspace (Hero phone, Phone pair, Three phones, Laptop + phone and more): one click puts your screens into a layout and the live render updates immediately.

The cost: fewer free-form layouts at the start. I kept a way to add and move devices after you pick one, and I'm watching how often people use it.

## Decision 2 — Hide the long tail of sliders

Light, material and camera each have sliders most people never touch. Showing all of them gave the right rail the dense, settings-page feel I was trying to avoid; a separate "pro mode" would have meant two products to maintain. I kept one panel, with advanced sliders behind a single toggle. In the second round, testers found the main controls without help. I haven't measured who opens the toggle.

> **Figure 3 — The right rail, advanced off and on.** Caption: "Before the toggle: six controls. After: all of them, one click away."

## Decision 3 — Reuse the look across a set

A case study has several screens that should look like one family, which was my original 38-minute problem. Dana (motion) pushed for shared presets, saved looks you could apply anywhere. I agreed they were needed and shipped them, and I also added **Duplicate**, which copies a composition with empty screens, because presets don't carry device layout. Together they cover the case where I come back to the set a month later and swap one screen.

## What shipped

A four-step flow (Screens › Scene › Motion › Export) on a hardware-style interface: ink-outlined module slabs, recessed screens, keys that press down and LEDs for status. Export covers stills and video at the sizes a case-study page needs. I reused the visual system from an earlier sign-up form study, so the build time went into the 3D and the flow.

## Results

The headline: upload to export fell from 38 to 6 minutes on my own five sets. That's one person's workflow, and I'd rather say so than dress it up as a user study. The test result is a better signal for strangers: 4 of 5 testers exported unaided in under 10 minutes, compared with 1 of 5 on V1, with the same task and the same number of people.

After launch, 1,200 exports in six weeks. That counts clicks on export, so it tells me people finish, not how many people there are. The question I opened with, whether a powerful scene editor and a quick export could live in one tool, got a yes from the test and no verdict yet on long-term use.

## Looking back

- **Test the finished image, not the feature.** V1 passed my own review and failed in the first five-person session. On the next project I run a task-based test before I build the second panel.
- **One honest number beats three soft ones.** I almost wrote "faster for everyone." The 38-to-6 timing is mine alone, and the 4-of-5 test is the only evidence about other people.
- **What I'd do differently:** run the first test on a paper flow, before writing the 3D.
- **Next:** measure how often the advanced toggle opens, and whether people move devices after picking a composition.

*Thanks to Dana Ortiz (motion) for the presets push and the easing curves, and to the designers who tested it.*
