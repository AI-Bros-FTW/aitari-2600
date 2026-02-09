(() => {
  const canvas = document.getElementById('c');
  const scoreEl = document.getElementById('score');
  const bestEl = document.getElementById('best');
  const statusEl = document.getElementById('status');
  const startBtn = document.getElementById('start');
  const mobStart = document.getElementById('mobStart');
  const fsBtn = document.getElementById('fsBtn');

  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  const g = canvas.getContext('2d');

  // Grid constants
  const GRID = 4;
  const PAD = 6;
  const ANIM_DUR = 120; // ms

  // Colors per tile value - retro Atari palette
  const TILE_COLORS = {
    2:    { bg: '#1a2a3a', fg: '#00f5d4' },
    4:    { bg: '#1a3a2a', fg: '#00f5d4' },
    8:    { bg: '#2a1a3a', fg: '#e8bbff' },
    16:   { bg: '#3a2a1a', fg: '#ffbb77' },
    32:   { bg: '#3a1a1a', fg: '#ff7777' },
    64:   { bg: '#3a1a2a', fg: '#ff77bb' },
    128:  { bg: '#2a3a1a', fg: '#bbff77' },
    256:  { bg: '#1a3a3a', fg: '#77ffdd' },
    512:  { bg: '#3a3a1a', fg: '#ffff77' },
    1024: { bg: '#3a2a2a', fg: '#ffaaaa' },
    2048: { bg: '#00f5d4', fg: '#0B0E14' },
  };

  // State
  let grid = [];
  let score = 0;
  let bestScore = parseInt(localStorage.getItem('2048-2600-best') || '0', 10);
  let running = false;
  let gameOver = false;
  let won = false;
  let keepPlaying = false;
  let animating = false;
  let animStart = 0;
  let animations = []; // {fromR,fromC,toR,toC,val}
  let newTiles = []; // {r,c,val}
  let mergedTiles = []; // {r,c,val}

  // Sound
  let audioOn = true;
  let ac;
  function beep(freq, dur=0.04, gain=0.03) {
    if (!audioOn) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      const o = ac.createOscillator();
      const gg = ac.createGain();
      o.type = 'square';
      o.frequency.value = freq;
      gg.gain.value = gain;
      o.connect(gg).connect(ac.destination);
      o.start();
      o.stop(ac.currentTime + dur);
    } catch {}
  }

  function setStatus(txt) { if (statusEl) statusEl.textContent = txt; }

  function initGrid() {
    grid = Array.from({ length: GRID }, () => Array(GRID).fill(0));
    score = 0;
    gameOver = false;
    won = false;
    keepPlaying = false;
    animations = [];
    newTiles = [];
    mergedTiles = [];
    animating = false;
    addRandom();
    addRandom();
    updateUI();
    setStatus('Playing');
    running = true;
  }

  function addRandom() {
    const empty = [];
    for (let r = 0; r < GRID; r++)
      for (let c = 0; c < GRID; c++)
        if (grid[r][c] === 0) empty.push({ r, c });
    if (empty.length === 0) return false;
    const cell = empty[Math.floor(Math.random() * empty.length)];
    const val = Math.random() < 0.9 ? 2 : 4;
    grid[cell.r][cell.c] = val;
    newTiles.push({ r: cell.r, c: cell.c, val });
    return true;
  }

  function updateUI() {
    if (scoreEl) scoreEl.textContent = score;
    if (bestEl) bestEl.textContent = bestScore;
  }

  function saveBest() {
    if (score > bestScore) {
      bestScore = score;
      localStorage.setItem('2048-2600-best', bestScore.toString());
    }
  }

  // Move logic - returns true if board changed
  function move(dir) {
    if (animating || gameOver) return false;
    // dir: 0=up, 1=right, 2=down, 3=left
    const old = grid.map(r => [...r]);
    animations = [];
    mergedTiles = [];
    newTiles = [];
    let moved = false;

    function getLine(i) {
      const line = [];
      for (let j = 0; j < GRID; j++) {
        const r = dir === 0 ? j : dir === 2 ? GRID-1-j : i;
        const c = dir === 1 ? GRID-1-j : dir === 3 ? j : i;
        line.push({ r, c, val: grid[r][c] });
      }
      return line;
    }

    for (let i = 0; i < GRID; i++) {
      const line = getLine(i);
      const vals = line.filter(t => t.val !== 0);
      const merged = [];
      const sources = [];
      let j = 0;
      while (j < vals.length) {
        if (j + 1 < vals.length && vals[j].val === vals[j+1].val) {
          const mergedVal = vals[j].val * 2;
          merged.push(mergedVal);
          sources.push([vals[j], vals[j+1]]);
          score += mergedVal;
          j += 2;
        } else {
          merged.push(vals[j].val);
          sources.push([vals[j]]);
          j++;
        }
      }

      // Place back
      for (let k = 0; k < GRID; k++) {
        const destR = line[k].r;
        const destC = line[k].c;
        const newVal = k < merged.length ? merged[k] : 0;
        grid[destR][destC] = newVal;

        if (k < merged.length) {
          for (const src of sources[k]) {
            if (src.r !== destR || src.c !== destC) moved = true;
            animations.push({ fromR: src.r, fromC: src.c, toR: destR, toC: destC, val: src.val });
          }
          if (sources[k].length === 2) {
            mergedTiles.push({ r: destR, c: destC, val: merged[k] });
          }
        }
      }
    }

    // Check if anything actually moved
    let changed = false;
    for (let r = 0; r < GRID; r++)
      for (let c = 0; c < GRID; c++)
        if (old[r][c] !== grid[r][c]) changed = true;

    if (!changed) return false;

    beep(440, 0.03);

    // Animate then add new tile
    animating = true;
    animStart = performance.now();
    setTimeout(() => {
      animating = false;
      addRandom();
      saveBest();
      updateUI();

      // Check win
      if (!won && !keepPlaying) {
        for (let r = 0; r < GRID; r++)
          for (let c = 0; c < GRID; c++)
            if (grid[r][c] === 2048) { won = true; setStatus('You Win!'); beep(880, 0.2, 0.05); }
      }

      // Check game over
      if (!canMove()) {
        gameOver = true;
        setStatus('Game Over');
        saveBest();
        beep(110, 0.3, 0.04);
      }
    }, ANIM_DUR);

    return true;
  }

  function canMove() {
    for (let r = 0; r < GRID; r++)
      for (let c = 0; c < GRID; c++) {
        if (grid[r][c] === 0) return true;
        if (c < GRID-1 && grid[r][c] === grid[r][c+1]) return true;
        if (r < GRID-1 && grid[r][c] === grid[r+1][c]) return true;
      }
    return false;
  }

  // Rendering
  let W, H;
  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    W = Math.round(rect.width * DPR);
    H = Math.round(rect.height * DPR);
    canvas.width = W;
    canvas.height = H;
  }
  resize();
  window.addEventListener('resize', resize);

  function getTileGeometry() {
    const gridSize = Math.min(W, H) * 0.85;
    const tileSize = (gridSize - PAD * (GRID + 1)) / GRID;
    const ox = (W - gridSize) / 2;
    const oy = (H - gridSize) / 2;
    return { gridSize, tileSize, ox, oy };
  }

  function tilePos(r, c, geo) {
    const x = geo.ox + PAD + c * (geo.tileSize + PAD);
    const y = geo.oy + PAD + r * (geo.tileSize + PAD);
    return { x, y };
  }

  function getColor(val) {
    return TILE_COLORS[val] || { bg: '#4a3a1a', fg: '#ffffff' };
  }

  function drawTile(x, y, size, val, scale) {
    if (val === 0) return;
    const col = getColor(val);
    const s = size * scale;
    const dx = x + (size - s) / 2;
    const dy = y + (size - s) / 2;

    // Tile background
    g.fillStyle = col.bg;
    g.fillRect(dx, dy, s, s);

    // Border
    g.strokeStyle = col.fg;
    g.lineWidth = 2 * DPR;
    g.strokeRect(dx, dy, s, s);

    // Number
    g.fillStyle = col.fg;
    const fontSize = val >= 1024 ? size * 0.22 : val >= 128 ? size * 0.28 : size * 0.35;
    g.font = `bold ${fontSize}px 'Press Start 2P', monospace`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(val.toString(), dx + s/2, dy + s/2);
  }

  function draw(now) {
    g.clearRect(0, 0, W, H);
    const geo = getTileGeometry();

    // Draw grid background
    g.fillStyle = '#0d1117';
    g.fillRect(geo.ox, geo.oy, geo.gridSize, geo.gridSize);

    // Draw empty cells
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        const pos = tilePos(r, c, geo);
        g.fillStyle = '#151b28';
        g.fillRect(pos.x, pos.y, geo.tileSize, geo.tileSize);
        g.strokeStyle = 'rgba(0,245,212,0.08)';
        g.lineWidth = 1;
        g.strokeRect(pos.x, pos.y, geo.tileSize, geo.tileSize);
      }
    }

    if (!running) {
      // Title screen
      g.fillStyle = '#00f5d4';
      g.font = `bold ${28 * DPR}px 'Press Start 2P', monospace`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('2048', W/2, H/2 - 20*DPR);
      g.font = `${12 * DPR}px 'Press Start 2P', monospace`;
      g.fillStyle = '#9AA0B4';
      g.fillText('PRESS START', W/2, H/2 + 20*DPR);
      return;
    }

    const animT = animating ? Math.min(1, (now - animStart) / ANIM_DUR) : 1;

    if (animating && animT < 1) {
      // Draw static tiles (those not involved in animation)
      const movingTo = new Set();
      const movingFrom = new Set();
      for (const a of animations) {
        movingTo.add(`${a.toR},${a.toC}`);
        movingFrom.add(`${a.fromR},${a.fromC}`);
      }

      // Draw non-animated tiles
      for (let r = 0; r < GRID; r++) {
        for (let c = 0; c < GRID; c++) {
          if (movingTo.has(`${r},${c}`) || movingFrom.has(`${r},${c}`)) continue;
          if (grid[r][c] === 0) continue;
          const pos = tilePos(r, c, geo);
          drawTile(pos.x, pos.y, geo.tileSize, grid[r][c], 1);
        }
      }

      // Draw animating tiles
      for (const a of animations) {
        const from = tilePos(a.fromR, a.fromC, geo);
        const to = tilePos(a.toR, a.toC, geo);
        const x = from.x + (to.x - from.x) * animT;
        const y = from.y + (to.y - from.y) * animT;
        drawTile(x, y, geo.tileSize, a.val, 1);
      }
    } else {
      // Draw all tiles
      for (let r = 0; r < GRID; r++) {
        for (let c = 0; c < GRID; c++) {
          if (grid[r][c] === 0) continue;
          const pos = tilePos(r, c, geo);
          // Pop animation for new/merged tiles
          let scale = 1;
          const isNew = newTiles.some(t => t.r === r && t.c === c);
          const isMerged = mergedTiles.some(t => t.r === r && t.c === c);
          if (isNew || isMerged) {
            const age = now - (animStart + ANIM_DUR);
            const popT = Math.min(1, age / 150);
            if (popT < 1) {
              scale = isMerged ? 0.8 + 0.4 * Math.sin(popT * Math.PI) : 0.5 + 0.5 * popT;
            }
          }
          drawTile(pos.x, pos.y, geo.tileSize, grid[r][c], scale);
        }
      }
    }

    // In-game HUD (always visible, including embed)
    const hudY = geo.oy - 8 * DPR;
    if (hudY > 20 * DPR) {
      g.font = `${9 * DPR}px 'Press Start 2P', monospace`;
      g.textBaseline = 'bottom';

      g.textAlign = 'left';
      g.fillStyle = '#9AA0B4';
      g.fillText('SCORE', geo.ox, hudY);
      g.fillStyle = '#00f5d4';
      g.fillText(score.toString(), geo.ox + 70 * DPR, hudY);

      g.textAlign = 'right';
      g.fillStyle = '#9AA0B4';
      g.fillText('BEST', geo.ox + geo.gridSize - 70 * DPR, hudY);
      g.fillStyle = '#00f5d4';
      g.fillText(bestScore.toString(), geo.ox + geo.gridSize, hudY);
    }

    // Game over / win overlay
    if (gameOver) {
      g.fillStyle = 'rgba(11,14,20,0.75)';
      g.fillRect(geo.ox, geo.oy, geo.gridSize, geo.gridSize);
      g.fillStyle = '#ff4444';
      g.font = `bold ${18 * DPR}px 'Press Start 2P', monospace`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('GAME OVER', W/2, H/2 - 10*DPR);
      g.font = `${10 * DPR}px 'Press Start 2P', monospace`;
      g.fillStyle = '#9AA0B4';
      g.fillText('PRESS START', W/2, H/2 + 20*DPR);
    } else if (won && !keepPlaying) {
      g.fillStyle = 'rgba(11,14,20,0.75)';
      g.fillRect(geo.ox, geo.oy, geo.gridSize, geo.gridSize);
      g.fillStyle = '#00f5d4';
      g.font = `bold ${18 * DPR}px 'Press Start 2P', monospace`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('YOU WIN!', W/2, H/2 - 10*DPR);
      g.font = `${10 * DPR}px 'Press Start 2P', monospace`;
      g.fillStyle = '#9AA0B4';
      g.fillText('PRESS START', W/2, H/2 + 20*DPR);
    }
  }

  // Input
  window.addEventListener('keydown', (e) => {
    const k = e.key;
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(k)) {
      e.preventDefault();
      if (!running) return;
      if (won && !keepPlaying) { keepPlaying = true; setStatus('Playing'); }
      const dirs = { ArrowUp: 0, ArrowRight: 1, ArrowDown: 2, ArrowLeft: 3 };
      move(dirs[k]);
    }
  }, { passive: false });

  // Start button
  function doStart() {
    initGrid();
    beep(660, 0.05);
  }
  if (startBtn) startBtn.addEventListener('click', doStart);
  if (mobStart) mobStart.addEventListener('click', (e) => { e.preventDefault(); doStart(); });

  // Swipe detection on stage
  const stage = canvas.parentElement;
  let touchId = null;
  let touchStartX = 0, touchStartY = 0;

  stage.addEventListener('touchstart', (e) => {
    if (touchId !== null) return;
    const t = e.touches[0];
    touchId = t.identifier;
    touchStartX = t.clientX;
    touchStartY = t.clientY;
  }, { passive: true });

  stage.addEventListener('touchmove', (e) => {
    e.preventDefault();
  }, { passive: false });

  stage.addEventListener('touchend', (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier !== touchId) continue;
      touchId = null;
      const dx = t.clientX - touchStartX;
      const dy = t.clientY - touchStartY;
      const dist = Math.hypot(dx, dy);
      if (dist < 20) return;
      if (!running) return;
      if (won && !keepPlaying) { keepPlaying = true; setStatus('Playing'); }
      if (Math.abs(dx) > Math.abs(dy)) {
        move(dx > 0 ? 1 : 3);
      } else {
        move(dy > 0 ? 2 : 0);
      }
    }
  }, { passive: true });

  stage.addEventListener('touchcancel', () => { touchId = null; }, { passive: true });

  // Fullscreen
  let isFullscreen = false;
  if (fsBtn) {
    fsBtn.addEventListener('click', () => {
      isFullscreen = !isFullscreen;
      document.body.classList.toggle('fullscreen', isFullscreen);
      document.body.classList.toggle('embed', isFullscreen);
      fsBtn.textContent = isFullscreen ? '✕' : '⛶';
      setTimeout(resize, 50);
    });
  }

  // Game loop
  function loop(now) {
    draw(now);
    requestAnimationFrame(loop);
  }

  updateUI();
  requestAnimationFrame(loop);
})();
