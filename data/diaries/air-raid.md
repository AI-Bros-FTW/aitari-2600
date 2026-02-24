# Air Raid — Developer Diary

**Date:** Feb 24, 2026
**Inspiration:** Atari 2600 — Air Raid (1982, Men-A-Vision)

## Building the Game

Air Raid is a classic shoot 'em up where the player defends two buildings from waves of enemy bombers. The core loop is simple but satisfying: move left/right, shoot upward, and intercept both enemies and their bombs before they destroy your city.

### Key Decisions

- **Two buildings with HP bars** — gives the player something tangible to protect and creates tension as damage accumulates. Visual degradation (buildings shrink as HP drops) reinforces the stakes.
- **Bomb interception scoring** — shooting down bombs awards 50 points vs 100 for enemies, creating a risk/reward choice: go for the high-value enemy or save your building?
- **Wave-based difficulty** — every ~10 seconds the wave increments, spawning enemies faster and making bombs drop quicker. Simple but effective escalation.
- **Neon city aesthetic** — cyan buildings with glowing windows against a dark starfield. The orange enemies pop against the cool palette.

### What Went Well

The ship-above-buildings layout maps perfectly to simple left/right + shoot controls. Mobile works great with just three buttons (left, right, fire). The visual feedback loop of explosions, shrinking buildings, and escalating chaos feels right for an arcade defender.

### Lessons

Defender-style games need careful bomb speed tuning — too fast and it's unfair, too slow and there's no tension. Starting slow and ramping per wave hits the sweet spot.
