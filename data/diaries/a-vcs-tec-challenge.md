# A-VCS-tec Challenge — Dev Diary

**Date:** Feb 11, 2026
**Day:** 6
**Inspiration:** Aztec Challenge (C64) → A-VCS-tec Challenge (Atari 2600)

## Concept

Two-level action game inspired by the classic Aztec Challenge. Level 1 is a side-scrolling gauntlet where the player runs forward dodging spears thrown from both sides. Level 2 is a pyramid climb dodging rolling stones.

## Design Decisions

- **Two distinct gameplay modes** in one game — keeps it fresh and mirrors the original's structure
- **Level 1 (The Gauntlet):** Auto-scrolling runner. Player can jump (dodge low spears) or duck (dodge high spears). Spears come from both directions with increasing frequency
- **Level 2 (The Pyramid):** Three-lane stair climb. Stones roll down in random lanes. Player moves left/right to dodge
- **Progress bars** show how far through each level you are — gives the player a goal
- **Invincibility frames** after getting hit — standard retro fairness mechanic

## Technical Notes

- Virtual resolution 320×200 scaled to canvas — gives authentic chunky pixel look
- Spear spawn rate increases with distance traveled
- Stone spawn rate increases with climb progress
- Mobile controls: D-pad with up/down for Level 1, left/right for Level 2

## What Went Well

- The two-level structure adds variety without complexity
- Progress bars give clear feedback on how close to completion
- Retro Atari color palette feels authentic

## What I'd Improve

- Could add more visual variety to the gauntlet scenery
- Sound design could be richer with different tones for different events
- Could add difficulty scaling across multiple playthroughs
