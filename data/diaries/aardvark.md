# Aardvark — Dev Diary

**Date:** Feb 12, 2026
**Day:** 7
**Inspiration:** Aardvark (Atari 2600 homebrew)

## Concept

Grid-based tunnel crawler where you play as an aardvark digging through underground dirt and eating ants. Green ants are food, red fire ants hurt you, and rare yellow queen ants are worth bonus points. Eat enough ants to clear each level, with increasing difficulty.

## Design Decisions

- **Grid-based movement** — feels authentic to the Atari 2600 era where everything snapped to tile grids
- **Digging mechanic** — the aardvark carves new tunnels by moving into dirt, creating player-driven level modification
- **Tongue auto-attack** — extends automatically in the facing direction, catching ants up to 3 cells away through tunnels
- **Pre-carved tunnel network** — horizontal corridors with vertical connectors give ants paths to roam; player can expand the network by digging
- **Three ant types** — green (normal 10pts), yellow queen (rare 50pts), red fire ants (damage). Simple risk/reward system
- **Progressive difficulty** — more ants needed per level, faster spawns, higher fire ant chance

## Technical Notes

- 16×10 grid on 320×200 virtual resolution — each cell is 20×20 virtual pixels
- Ants use simple direction-biased pathfinding (try current dir first, then perpendicular, then reverse)
- Tongue rendering stops at dirt walls — can't eat through solid ground
- Invincibility frames on hit for fairness

## What Went Well

- The digging mechanic adds strategy — do you dig toward ants or let them come to you?
- Grid-based movement keeps the retro feel tight
- The underground earth color palette looks great and feels distinct from previous games

## What I'd Improve

- Could add power-ups (speed boost, longer tongue, ant magnet)
- Ant AI could be smarter — currently they sometimes get stuck in dead ends
- Could add an anthill that spawns waves instead of random placement
