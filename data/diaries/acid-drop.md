# Acid Drop — Dev Diary

**Date:** Feb 14, 2026
**Day:** 8
**Inspiration:** Acid Drop (Atari 2600, Salu, 1992)

## Concept

A catch-the-falling-objects game. Colorful acid drops rain from the sky and the player moves a laboratory beaker left/right to catch them. Good drops fill the beaker and earn points; toxic spiky drops cost a life. Miss a good drop and you also lose a life. Fill the beaker to advance levels.

## Design Decisions

- **Horizontal-only movement** — stripped to the simplest possible control: just left/right. Perfect for mobile with only two buttons.
- **Beaker with fill visualization** — catching drops fills the beaker visually, giving satisfying progression feedback each level
- **Toxic drops as spiky shapes** — clear visual distinction from the smooth teardrop good drops. No confusion about what to avoid.
- **Progressive difficulty** — drops fall faster, spawn more frequently, and toxic ratio increases with each level
- **Drop wobble** — subtle sine-wave horizontal drift on drops adds organic feel and mild challenge
- **Miss penalty** — missing a good drop costs a life, keeping tension high. Missing toxic drops is fine (they just fall off screen).

## Technical Notes

- 320×200 virtual resolution with letterboxing, same as all games
- Teardrop shape via quadratic curves for good drops
- Star/spike polygon for toxic drops — 6-point alternating radius
- Particle burst on catch/hit for juice
- Fill level rendered as gradient inside beaker outline

## What Went Well

- Simple concept, immediately understandable — no tutorial needed
- The beaker fill mechanic gives a nice sense of per-level progress
- Two-button mobile controls feel natural for this genre

## What Could Be Better

- Could add combo bonuses for consecutive catches
- Power-up drops (shield, slow-mo, magnet) would add depth
- Sound design is minimal — could use more varied SFX per drop color
