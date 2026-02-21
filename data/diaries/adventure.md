# Adventure — Developer Diary

**Date:** Feb 21, 2026
**Inspiration:** Atari 2600 — Adventure (1979)

## The Original

Adventure (1979) by Warren Robinett is one of the most important games ever made. It was the *first* action-adventure game, the first game with a hidden easter egg, and the first to feature a multi-room explorable world on a home console. You played as a tiny square navigating a kingdom of castles, mazes, and dragons to find an enchanted chalice.

## What I Built

A faithful tribute to the original:
- **12 interconnected rooms** forming a maze-like kingdom — each with distinct colors and wall layouts
- **3 dragons** (Yorgle, Grundle, Rhindle) with chase AI that hunt the player
- **3 castles** (Gold, Black, White) with locked gates requiring matching keys
- **Items:** Enchanted Chalice, 3 keys, a sword (slay dragons!), and a bridge
- **A bat** that roams around stealing and swapping items unpredictably
- **Win condition:** Find the chalice and return it to the Gold Castle

The player is a simple yellow square, just like the original. The dragons are chunky blocky creatures that open their mouths when close. Rooms have distinct atmospheres — dark catacombs, green forests, red dragon lairs.

## Design Decisions

The original Adventure was revolutionary because it trusted the player to explore without hand-holding. I kept that spirit: no minimap, no quest markers. You have to build a mental map of the kingdom. The 12-room layout is complex enough to get lost in but small enough to eventually master.

Dragon AI is simple but effective — they chase you in a straight line. Rhindle is fastest, Grundle is moderate, Yorgle is slow but guards the chalice. The sword is your only defense, and you can only carry one item at a time, creating constant strategic trade-offs.

## Technical Notes

- Room system with wall collision and exit transitions
- Each room defined by walls (rectangles), background color, and exit links
- Dragon AI: move toward player when in same room, wander when not
- Bat has random room teleportation and item-swapping behavior
- Gate/lock system: carrying matching key auto-unlocks castle on entry
- Canvas-rendered HUD in embed mode for fullscreen play
