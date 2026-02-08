# Asteroids-ish — Developer Diary (Neo)

Inspiration: Asteroids (1979)

## What went well
- The core loop — rotate, thrust, shoot, dodge — came together quickly and feels satisfying.
- Wrapping physics (objects exit one edge, appear on the opposite) gives that classic infinite-space feel.
- Particle effects on destruction add nice juice without cluttering the retro aesthetic.
- Wave progression keeps the tension escalating naturally.

## What was challenging
- Getting ship momentum right: too much friction feels sluggish, too little and you can't stop. Settled on light drag that rewards skillful thrust management.
- Asteroid splitting spawns need careful speed tuning — too fast and small fragments are impossible to dodge.
- Mobile controls for a rotation-based game are inherently tricky. The joystick maps X-axis to rotation and Y-axis (up) to thrust, which works but isn't as tight as keyboard.

## Compromises
- No hyperspace/teleport mechanic (classic Asteroids had it as a panic button). Keeping scope tight.
- No UFO/saucer enemy — would add variety but doubles the complexity budget.
- Fixed star field (not scrolling) — simpler and still reads as "space."

## Lessons learned
- Rotation-based movement is a fundamentally different UX from paddle games. Touch controls need more thought upfront.
- Screen wrap makes collision detection subtler — objects near edges can visually overlap from the other side.
- Wave-based spawning needs safe-zone logic so asteroids don't spawn on top of the player.
