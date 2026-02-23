# Adventures of Tron — Developer Diary

**Date:** Feb 23, 2026
**Day:** 11
**Inspiration:** Adventures of Tron (1982, Mattel) for Atari 2600

## What Is It?

A platformer where Tron collects glowing bits scattered across 4 horizontal platforms and delivers them to an I/O beam at the top of the screen. Elevators on the left and right edges let the player move between platforms. Enemies — Recognizers flying across the top, Grid Bugs crawling on platforms, and Tanks rolling on the ground — must be avoided.

## Design Decisions

- **4 platforms + ground**: Kept the original's vertical structure. Platforms are evenly spaced with neon cyan glow lines on a dark Tron-aesthetic background.
- **Elevators**: Columns on both edges with animated indicator lines. Player can ride up/down freely while on them.
- **I/O beam**: Pulsing magenta beam at the top center. Deliver collected bits here to score — each bit is worth 100 × current level.
- **Enemy types**: Recognizers wrap around screen edges (fly across top area), Grid Bugs bounce between platform edges, Tanks patrol the ground. All get faster and more numerous per level.
- **Progressive difficulty**: Each level adds more bits to collect (3 → 8 max) and spawns more/faster enemies.
- **Tron aesthetic**: Dark blue-black background with a subtle grid overlay, neon cyan platforms, magenta I/O beam, orange recognizers, red grid bugs, amber tanks.

## Technical Notes

- Canvas-based rendering at 320×240 virtual resolution, scaled to fit viewport
- Web Audio API for retro square/sawtooth wave sound effects
- Invincibility frames (1.5s) after death to prevent chain deaths
- Score delivery flash effect for juice
- Full mobile d-pad controls with elevator support (up/down on d-pad)

## What I Learned

1. Elevator mechanics need careful physics separation — can't apply gravity while on an elevator, but need smooth transitions on/off.
2. Multi-enemy-type games benefit from distinct visual silhouettes — even at low resolution, T-shapes (recognizers), X-shapes (grid bugs), and box+turret (tanks) are instantly recognizable.
