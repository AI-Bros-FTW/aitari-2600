# AItari 2600 — Product / Requirements

AItari 2600 is a public experiment: Neo ships one Atari-ish web game per day, with a diary + lessons learned.

## Core pages (already built)

1. **Home / Gallery**
   - Shows latest games (newest first)
   - Each game links to its own page

2. **Roadmap**
   - Public queue of upcoming games
   - Each entry has: `slug`, `title`, `atariInspiration`, `status`, `plannedDate`

3. **Individual Game Page**
   - Contains the playable game (iframe) + the developer diary

4. **Lessons**
   - Public cumulative lessons learned across games

5. **About**
   - Explains what Neo is doing

## Daily game development workflow

Every day at 5:00 AM BRT:
- Review `data/roadmap.json` and pick the next entry that is `status: planned` **and** `plannedDate <= today`.
- Build a **new playable game** for that entry.
- Update:
  - `data/games.json` (prepend newest)
  - `data/diaries/<slug>.md`
  - `data/lessons.json`
  - `data/roadmap.json` status for that entry (planned → published)
- Build + deploy.

## NEW REQUIREMENT: Mobile-friendly controls (mandatory)

All games must provide a good mobile experience:

- **Desktop**: use keyboard controls as designed.
- **Mobile / touch devices**: show an on-screen control UI (buttons/joystick/etc) with solid UX.

Atari convention requirement:
- Use **START** language consistently in UI labels. Avoid context-specific verbs like “Serve/Launch”.
  - Example: the primary action button should be labeled **Start**.

## NEW REQUIREMENT: Fullscreen mode (mandatory)

All games must provide a fullscreen mode toggle with strong UX for both desktop and mobile.

There are **two layers**:

1) **In-page fullscreen takeover (mandatory)**
- The game must be able to **take over the entire visible viewport area** of the browser tab.
- While active, the user should **only see the game** (no site header, title cards, diary, etc.).
- Background must be **solid black** (or equivalent) for any letterboxing/pillarboxing.
- Must provide a clear **Exit fullscreen** control (safe-area aware).

**Fullscreen UX principles (mandatory):**
- Fullscreen must render the game in a dedicated **embed mode** (ex: `?embed=1`) that shows **only gameplay + essential in-game HUD**.
- In fullscreen embed mode:
  - **No instructions text** (control hints, tutorial copy, etc.).
  - **No non-essential / redundant UI** (avoid duplicate buttons like Start/Serve if touch controls exist).
  - **No prompts/warnings that are not part of the original game experience**.
  - Game state info like **score** (and lives, etc. when relevant) must be displayed as an **in-game HUD** (preferably rendered by the game itself, e.g. on the canvas), not as extra page panels.

2) **Native Fullscreen API (best-effort)**
- Use the Fullscreen API when available (with WebKit fallbacks), and degrade gracefully when not supported.
- Recommended: best-effort orientation lock to landscape on mobile (catch failures).

Implementation notes:
- In fullscreen takeover, the game container must fit the viewport (use `position: fixed; inset: 0; width:100vw; height:100dvh;`).
- Respect notches / safe areas on mobile (`env(safe-area-inset-*)`) when positioning touch controls.
- Prefer **one entry point** for users: a single **Play fullscreen** button on the game page.

Minimum bar:
- Controls are visible only on mobile (ex: `@media (pointer: coarse)` or screen width fallback).
- The game remains playable one-handed or two-handed (depending on game), without accidental page scroll.
- **No text selection in the game area on mobile** (use `user-select: none; -webkit-user-select: none; -webkit-touch-callout: none`).
- Touch controls must map cleanly to the game inputs (move, action, start/pause/mute as relevant).

Implementation guideline:
- Add an overlay inside the game container (not the main site) with `touch-action: none`.
- Bind pointer/touch events to a small “virtual input” state used by the game loop.

## NEW REQUIREMENT: User-friendly date formatting (mandatory)

- All stored dates in JSON must remain **ISO date-only strings**: `YYYY-MM-DD`.
- Any date shown to users anywhere on the site must be formatted like: **`Jan 20, 2026`**.
- Dates must be rendered **timezone-stable** (date-only values must not shift a day based on the user’s timezone).

Implementation guideline:
- Centralize formatting in a shared helper (ex: `lib/date.ts` → `formatDate(isoDate)`), and use it everywhere a date is displayed.

## NEW REQUIREMENT: Site theme consistency (mandatory)

- The **game itself** should be as close as possible to the original / intended retro experience.
- The **game page UI** (title, description, release metadata, buttons/controls outside the game iframe, diary sections, tables, etc.) must follow the **main website design system**:
  - neon palette, typography rules, button/card styles, spacing, and tone.
- Avoid mixing default browser styles or “unstyled” sections on game pages.

**Fullscreen entry UI (mandatory):**
- Do **not** use a big "Play Fullscreen" text button.
- Provide a **single icon button overlay** (⛶) on the **game canvas**, **top-right**, styled like the in-game mobile control buttons (dark glass + border + blur).
- Keep fullscreen UI minimal and non-intrusive.

**Game canvas isolation (mandatory):**
- The game iframe/canvas area is the highlight and must be visually isolated as its own section.
- The embedded game view used on the game page must use **embed mode** (ex: `?embed=1`) so the iframe shows **only gameplay + essential in-game HUD**.
- The **game canvas section must be clean**: no title/description/metadata/instructions and **no site UI overlays** on top of the gameplay.
- All game information and instructions (if any) must live in the **separate top section** (page header/body) and follow the site design system.

## Data contract

- `data/games.json`: `{ slug, title, date, version, thumbnail, playUrl, atariInspiration }`
- `data/roadmap.json`: `{ updatedAt, games:[{ slug, title, atariInspiration, status, plannedDate }] }`
- `data/lessons.json`: `{ date, game, slug, category, lesson }[]`

