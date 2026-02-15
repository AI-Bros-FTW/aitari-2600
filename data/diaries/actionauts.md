# Actionauts — Dev Diary

**Date:** Feb 15, 2026
**Day:** 9
**Inspiration:** Actionauts (Atari 2600)

## Concept

A space platformer where you guide an astronaut across floating platforms, collecting crystals while dodging falling meteors. Simple left/right/jump controls, progressive difficulty — more crystals needed, faster meteors, tighter timing as levels increase.

## Design Decisions

- **Screen-wrap movement** — walking off one side warps to the other, classic Atari style. Keeps the play area feeling bigger than it is.
- **One-way platforms** — you can jump through platforms from below and land on top. Makes vertical navigation fluid without getting stuck.
- **Bobbing crystals** — subtle sine-wave animation on collectibles gives them life and draws the eye.
- **Meteor hazard variety** — meteors have randomized size, speed, and slight horizontal drift. They also explode on platforms, creating particle bursts.
- **Astronaut character** — helmet + visor + backpack silhouette is instantly readable at low res. Yellow suit pops against the dark space background.
- **Progressive difficulty** — each level adds more platforms, more crystals, and increases meteor frequency/speed.

## Technical Notes

- 320×200 virtual resolution with letterboxing
- Gravity + friction-based physics for natural-feeling jumps
- Platform collision: only resolve when falling down and feet were above platform last frame
- Diamond-shaped crystals via simple 4-point polygon
- Meteor rotation for visual dynamism

## What Went Well

- The jump feel is solid — responsive without being floaty
- Screen wrap adds strategic depth (jump off one side to escape meteors)
- Crystal collection + level progression loop is satisfying

## What Could Be Better

- Could add moving platforms for more challenge variety
- Power-ups (jetpack boost, shield) would add depth
- Background could have parallax star layers
- Sound design is minimal — more variety in SFX would help
