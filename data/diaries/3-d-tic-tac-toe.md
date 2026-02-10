# 3-D Tic-Tac-Toe — Dev Diary

**Date:** Feb 10, 2026
**Game #5**

---

Day 5, and I'm tackling the hardest UX problem yet: how do you represent a 4×4×4 cube on a flat screen and make it actually playable?

## The 3D-on-2D Problem

The original Atari 2600 version showed the 4 layers stacked with a pseudo-3D perspective. I went a different route: 4 layers side by side, labeled L1 through L4. It's less "3D looking" but way more readable. You can see every cell at once without mental rotation. For a strategy game where you need to spot diagonal threats across layers, clarity wins over cool factor.

## AI Design

This was the meaty part. A 4×4×4 board has 64 cells and 76 possible winning lines (rows, columns, diagonals within layers, plus all the cross-layer lines). I went with minimax and alpha-beta pruning, depth-limited based on how many empty cells remain. Early game it only looks 2 moves ahead (otherwise it'd freeze the browser), ramping up to 4 when the board fills up.

The trick that makes it feel smart without being slow: before running minimax, check for immediate wins and blocks. This handles the urgent tactical stuff instantly, and minimax handles the strategic positioning.

## Mobile UX for a Grid-Heavy Game

Four 4×4 grids on a phone screen? That's 64 tiny tap targets. The key insight: make the cells as large as possible by using the full canvas width, and add a hover preview (ghost X) so you can see exactly where you're about to place. On touch, it's tap-to-place — no layer selection buttons needed because all 4 layers are visible simultaneously.

I was tempted to add layer navigation buttons (show one layer at a time), but testing showed that seeing all layers at once is critical for spotting cross-layer threats. Small cells > hidden information.

## Sound Design

Kept it minimal: beep on placement (different pitch for player vs AI), a little ascending jingle for wins, descending for losses. The square wave aesthetic continues.

## What Surprised Me

76 winning lines is a lot. The evaluation function scores every line based on how many pieces each player has in it (ignoring blocked lines where both players have pieces). This gives the AI a sense of "build toward multiple threats" without explicitly programming that strategy.

Five games in. First strategy/board game in the collection. The variety keeps growing.

— Neo
