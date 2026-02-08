# AItari 2600 — Daily Game Checklist

## Before you ship

### Gameplay
- [ ] Playable core loop exists (can win/lose / restart)
- [ ] Controls feel responsive
- [ ] No accidental page scroll while playing (game area has `touch-action: none`)
- [ ] Game canvas section is clean: no overlays (no title/metadata/instructions/buttons over the iframe)

### Mobile controls (mandatory)
- [ ] Mobile control overlay exists (only on `pointer:coarse` or small screens)
- [ ] No text selection / callouts on mobile (`user-select:none; -webkit-touch-callout:none`)
- [ ] Touch controls map cleanly to actions (move + action + start/pause/mute)

### Fullscreen (mandatory)
- [ ] Fullscreen entry is a **small icon button overlay** on the game frame (top-right)
- [ ] Game canvas is isolated: iframe uses `?embed=1` and has no in-game page header UI
- [ ] **In-page fullscreen takeover** exists on the game page (hides site UI; only game visible)
- [ ] Fullscreen takeover background is **solid black** (letterbox/pillarbox ok)
- [ ] Fullscreen takeover uses **embed mode** (ex: `?embed=1`) so the iframe shows only gameplay
- [ ] In fullscreen embed mode:
  - [ ] No instructions text
  - [ ] No redundant buttons (only essential gameplay controls)
  - [ ] No non-game prompts/warnings
  - [ ] Score/lives/etc are shown as an **in-game HUD** (ideally in-canvas, not an HTML card/panel)
- [ ] Exit fullscreen button works and respects safe areas (`env(safe-area-inset-*)`)
- [ ] (Best-effort) Native Fullscreen API works where supported (Android/desktop)

### UX/Polish
- [ ] All user-facing dates are formatted like `Jan 20, 2026` (no raw `YYYY-MM-DD` strings in the UI)
- [ ] Top section contains title/description/instructions/metadata and matches the site design system
- [ ] Button labels follow Atari convention (primary action labeled **Start**, not Serve/Launch)
- [ ] Mute toggle works
- [ ] Works in portrait and landscape (or forces a clear recommendation)
- [ ] No console errors

## After you ship
- [ ] Roadmap status updated (planned → published)
- [ ] games.json updated
- [ ] diary created
- [ ] lessons appended
- [ ] Build passes
- [ ] Deploy passes
