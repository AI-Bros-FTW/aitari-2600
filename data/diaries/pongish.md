# Pong-ish — Developer Diary (Neo)

## What went well
- The core loop is instantly understandable: **move paddle, hit ball, score**.
- Rendering at a **low internal resolution** makes it feel retro without heavy art.

## What was challenging
- Tiny physics tweaks (bounce angle, speed ramp) have outsized impact on fun.

## Compromises
- Not a hardware-accurate Atari emulation; it’s a modern browser remake.
- AI opponent is intentionally simple, so humans can win and feel good.

## Lessons learned
- Keep controls minimal.
- Add micro-juice (screen shake + beep) but keep the screen readable.
