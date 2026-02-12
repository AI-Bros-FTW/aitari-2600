(() => {
  const canvas = document.getElementById('c');
  const scoreEl = document.getElementById('score');
  const livesEl = document.getElementById('lives');
  const levelEl = document.getElementById('level');
  const startBtn = document.getElementById('start');
  const mobStart = document.getElementById('mobStart');
  const muteBtn = document.getElementById('mute');
  const mobMute = document.getElementById('mobMute');
  const fsBtn = document.getElementById('fsBtn');
  const mobUp = document.getElementById('mobUp');
  const mobDown = document.getElementById('mobDown');
  const mobLeft = document.getElementById('mobLeft');
  const mobRight = document.getElementById('mobRight');

  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  const g = canvas.getContext('2d');

  const VW = 320;
  const VH = 200;

  // Atari-ish palette
  const COL_BG = '#1a0a00';
  const COL_DIRT = '#3a2010';
  const COL_DIRT2 = '#2a1508';
  const COL_TUNNEL = '#0a0500';
  const COL_PLAYER = '#c8a040';
  const COL_SNOUT = '#e8c060';
  const COL_ANT = '#40ff40';
  const COL_FIRE_ANT = '#ff3030';
  const COL_QUEEN = '#ffff40';
  const COL_TEXT = '#00f5d4';
  const COL_HUD = '#ffcc00';

  // Grid-based tunnels
  const COLS = 16;
  const ROWS = 10;
  const CW = VW / COLS;   // 20
  const CH = VH / ROWS;   // 20

  let state = 'title';
  let score = 0;
  let lives = 3;
  let level = 1;
  let invincible = 0;

  // Player position (grid)
  let px, py;
  let moveCD = 0;
  const MOVE_DELAY = 6;

  // Tongue animation
  let tongueDir = null;
  let tongueLen = 0;
  const TONGUE_MAX = 3;
  let tongueTimer = 0;

  // Tunnels: 2D array, 1 = dug, 0 = dirt
  let grid;
  let ants = [];
  let antSpawnTimer = 0;
  let antsEaten = 0;
  let antsNeeded = 15;

  // Audio
  let audioOn = true;
  let ac;
  function beep(freq, dur = 0.04, gain = 0.03) {
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

  function toggleMute() {
    audioOn = !audioOn;
    const txt = audioOn ? '🔊 Sound' : '🔇 Muted';
    if (muteBtn) muteBtn.textContent = txt;
    if (mobMute) mobMute.textContent = audioOn ? '🔊' : '🔇';
  }
  if (muteBtn) muteBtn.addEventListener('click', toggleMute);
  if (mobMute) mobMute.addEventListener('click', (e) => { e.preventDefault(); toggleMute(); });

  function updateUI() {
    if (scoreEl) scoreEl.textContent = score;
    if (livesEl) livesEl.textContent = lives;
    if (levelEl) levelEl.textContent = level;
  }

  // Input
  const keys = {};
  document.addEventListener('keydown', (e) => {
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space',' '].includes(e.key)) e.preventDefault();
    keys[e.key] = true;
    if ((e.key === ' ' || e.key === 'Enter') && (state === 'title' || state === 'gameover' || state === 'levelclear')) {
      doStart();
    }
  });
  document.addEventListener('keyup', (e) => { keys[e.key] = false; });

  function bindTouch(el, key) {
    if (!el) return;
    el.addEventListener('touchstart', (e) => { e.preventDefault(); keys[key] = true; }, { passive: false });
    el.addEventListener('touchend', (e) => { e.preventDefault(); keys[key] = false; }, { passive: false });
    el.addEventListener('touchcancel', () => { keys[key] = false; });
  }
  bindTouch(mobUp, 'ArrowUp');
  bindTouch(mobDown, 'ArrowDown');
  bindTouch(mobLeft, 'ArrowLeft');
  bindTouch(mobRight, 'ArrowRight');

  if (mobStart) mobStart.addEventListener('click', (e) => { e.preventDefault(); doStart(); });
  if (startBtn) startBtn.addEventListener('click', doStart);

  function doStart() {
    if (state === 'title' || state === 'gameover') {
      score = 0; lives = 3; level = 1;
      initLevel();
      state = 'playing';
      beep(660, 0.05);
    } else if (state === 'levelclear') {
      level++;
      initLevel();
      state = 'playing';
      beep(660, 0.05);
    }
    updateUI();
  }

  function initLevel() {
    // Create grid — start with all dirt
    grid = [];
    for (let r = 0; r < ROWS; r++) {
      grid[r] = [];
      for (let c = 0; c < COLS; c++) {
        grid[r][c] = 0;
      }
    }
    // Carve initial tunnels
    // Horizontal tunnels
    const tunnelRows = [2, 5, 8];
    for (const tr of tunnelRows) {
      if (tr < ROWS) {
        for (let c = 1; c < COLS - 1; c++) grid[tr][c] = 1;
      }
    }
    // Vertical connectors
    const connCols = [4, 8, 12];
    for (const cc of connCols) {
      if (cc < COLS) {
        for (let r = 2; r <= 8 && r < ROWS; r++) grid[r][cc] = 1;
      }
    }
    // Player starts at center-ish
    px = 8;
    py = 5;
    grid[py][px] = 1;
    moveCD = 0;
    tongueDir = null;
    tongueLen = 0;
    tongueTimer = 0;
    invincible = 0;

    // Ants
    ants = [];
    antSpawnTimer = 0;
    antsEaten = 0;
    antsNeeded = 10 + level * 5;
    // Spawn initial ants
    for (let i = 0; i < 4 + level; i++) spawnAnt(false);
    if (level >= 2) spawnAnt(true); // fire ant
  }

  function spawnAnt(fire) {
    // Find a random tunnel cell away from player
    const tunnels = [];
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        if (grid[r][c] === 1 && (Math.abs(r - py) + Math.abs(c - px)) > 4)
          tunnels.push([c, r]);
    if (tunnels.length === 0) return;
    const [ax, ay] = tunnels[Math.floor(Math.random() * tunnels.length)];
    ants.push({
      x: ax, y: ay,
      fire: fire,
      queen: !fire && Math.random() < 0.08,
      moveCD: 0,
      dir: Math.floor(Math.random() * 4) // 0=up,1=right,2=down,3=left
    });
  }

  function playerHit() {
    if (invincible > 0) return;
    lives--;
    beep(150, 0.15, 0.05);
    setTimeout(() => beep(100, 0.2, 0.04), 150);
    invincible = 120;
    if (lives <= 0) state = 'gameover';
    updateUI();
  }

  const dirs = [[0,-1],[1,0],[0,1],[-1,0]]; // up,right,down,left

  function update() {
    if (state !== 'playing') return;
    if (invincible > 0) invincible--;

    // Player movement
    moveCD--;
    if (moveCD <= 0) {
      let dx = 0, dy = 0;
      if (keys['ArrowUp'] || keys['w'] || keys['W']) dy = -1;
      else if (keys['ArrowDown'] || keys['s'] || keys['S']) dy = 1;
      else if (keys['ArrowLeft'] || keys['a'] || keys['A']) dx = -1;
      else if (keys['ArrowRight'] || keys['d'] || keys['D']) dx = 1;

      if (dx !== 0 || dy !== 0) {
        const nx = px + dx;
        const ny = py + dy;
        if (nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS) {
          // Aardvark digs through dirt!
          if (grid[ny][nx] === 0) {
            grid[ny][nx] = 1; // dig
            beep(220, 0.02, 0.02);
          }
          px = nx;
          py = ny;
          moveCD = MOVE_DELAY;

          // Set tongue direction
          if (dx === 1) tongueDir = 1;
          else if (dx === -1) tongueDir = 3;
          else if (dy === -1) tongueDir = 0;
          else if (dy === 1) tongueDir = 2;
        }
      }
    }

    // Tongue animation — extends automatically when facing ants
    tongueTimer++;
    if (tongueTimer % 3 === 0) {
      if (tongueLen < TONGUE_MAX) tongueLen++;
      else tongueLen = 0;
    }

    // Check tongue eating ants
    if (tongueDir !== null) {
      const [tdx, tdy] = dirs[tongueDir];
      for (let t = 1; t <= tongueLen; t++) {
        const tx = px + tdx * t;
        const ty = py + tdy * t;
        if (tx < 0 || tx >= COLS || ty < 0 || ty >= ROWS) break;
        if (grid[ty][tx] === 0) break; // tongue stops at dirt

        for (let i = ants.length - 1; i >= 0; i--) {
          if (ants[i].x === tx && ants[i].y === ty) {
            const ant = ants[i];
            if (ant.fire) {
              playerHit();
            } else {
              const pts = ant.queen ? 50 : 10;
              score += pts;
              antsEaten++;
              beep(880, 0.03, 0.04);
              ants.splice(i, 1);
            }
          }
        }
      }
    }

    // Direct collision with ants on player cell
    for (let i = ants.length - 1; i >= 0; i--) {
      if (ants[i].x === px && ants[i].y === py) {
        if (ants[i].fire) {
          playerHit();
          ants.splice(i, 1);
        } else {
          score += ants[i].queen ? 50 : 10;
          antsEaten++;
          beep(880, 0.03, 0.04);
          ants.splice(i, 1);
        }
      }
    }

    // Move ants
    for (const ant of ants) {
      ant.moveCD--;
      if (ant.moveCD <= 0) {
        ant.moveCD = ant.fire ? 8 : 12;
        // Try current direction, else pick random
        const tryDirs = [ant.dir];
        // Add perpendicular directions
        tryDirs.push((ant.dir + 1) % 4, (ant.dir + 3) % 4, (ant.dir + 2) % 4);
        let moved = false;
        for (const d of tryDirs) {
          const [ddx, ddy] = dirs[d];
          const nx = ant.x + ddx;
          const ny = ant.y + ddy;
          if (nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS && grid[ny][nx] === 1) {
            ant.x = nx;
            ant.y = ny;
            ant.dir = d;
            moved = true;
            break;
          }
        }
      }
    }

    // Spawn more ants
    antSpawnTimer++;
    const spawnRate = Math.max(40, 90 - level * 10);
    if (antSpawnTimer >= spawnRate) {
      antSpawnTimer = 0;
      const fireChance = 0.1 + level * 0.05;
      spawnAnt(Math.random() < fireChance);
    }

    // Level clear check
    if (antsEaten >= antsNeeded) {
      state = 'levelclear';
      score += level * 100;
      beep(523, 0.1, 0.04);
      setTimeout(() => beep(659, 0.1, 0.04), 120);
      setTimeout(() => beep(784, 0.2, 0.05), 240);
      updateUI();
    }

    updateUI();
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

  function sx(v) { return v * W / VW; }
  function sy(v) { return v * H / VH; }

  function draw(now) {
    g.clearRect(0, 0, W, H);

    if (state === 'title') {
      drawTitle(now);
    } else {
      drawGame(now);
    }

    drawHUD(now);

    if (state === 'gameover') drawOverlay('GAME OVER', 'PRESS START', now);
    if (state === 'levelclear') drawOverlay('LEVEL CLEAR!', `${antsEaten} ANTS EATEN - PRESS START`, now);
  }

  function drawTitle(now) {
    g.fillStyle = COL_BG;
    g.fillRect(0, 0, W, H);

    // Dirt texture
    for (let i = 0; i < 50; i++) {
      const rx = (Math.sin(i * 73.1) * 0.5 + 0.5) * VW;
      const ry = (Math.sin(i * 41.3) * 0.5 + 0.5) * VH;
      g.fillStyle = COL_DIRT;
      g.fillRect(sx(rx), sy(ry), sx(4), sy(4));
    }

    // Aardvark silhouette
    const bob = Math.sin(now / 300) * 3;
    g.fillStyle = COL_PLAYER;
    // Body
    g.fillRect(sx(120), sy(80 + bob), sx(60), sy(25));
    // Head/snout
    g.fillStyle = COL_SNOUT;
    g.fillRect(sx(180), sy(82 + bob), sx(35), sy(12));
    g.fillRect(sx(210), sy(85 + bob), sx(15), sy(6));
    // Ears
    g.fillStyle = COL_PLAYER;
    g.fillRect(sx(170), sy(72 + bob), sx(8), sy(12));
    // Tail
    g.fillRect(sx(100), sy(85 + bob), sx(24), sy(8));
    g.fillRect(sx(90), sy(80 + bob), sx(14), sy(10));
    // Eye
    g.fillStyle = '#000';
    g.fillRect(sx(195), sy(84 + bob), sx(4), sy(4));
    // Legs
    g.fillStyle = COL_PLAYER;
    const legA = Math.sin(now / 150) * 2;
    g.fillRect(sx(130), sy(105 + bob), sx(8), sy(10 + legA));
    g.fillRect(sx(160), sy(105 + bob), sx(8), sy(10 - legA));

    // Small ants running around
    for (let i = 0; i < 6; i++) {
      const ax = ((now / 10 + i * 55) % 320);
      const ay = 130 + Math.sin(i * 2.1 + now / 200) * 15;
      g.fillStyle = COL_ANT;
      g.fillRect(sx(ax), sy(ay), sx(4), sy(3));
      // legs
      g.fillRect(sx(ax - 1), sy(ay + 3), sx(2), sy(2));
      g.fillRect(sx(ax + 3), sy(ay + 3), sx(2), sy(2));
    }

    // Title
    const pulse = Math.sin(now / 400) * 0.2 + 0.8;
    g.globalAlpha = pulse;
    g.fillStyle = COL_TEXT;
    g.font = `bold ${sx(16)}px 'Press Start 2P', monospace`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('AARDVARK', sx(160), sy(40));
    g.globalAlpha = 1;

    g.font = `${sx(6)}px 'Press Start 2P', monospace`;
    g.fillStyle = '#9AA0B4';
    g.fillText('EAT ANTS. AVOID RED ANTS.', sx(160), sy(160));
    g.fillText('PRESS START', sx(160), sy(178));
  }

  function drawGame(now) {
    // Draw grid
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x = c * CW;
        const y = r * CH;
        if (grid[r][c] === 1) {
          // Tunnel
          g.fillStyle = COL_TUNNEL;
        } else {
          // Dirt with texture
          g.fillStyle = (r + c) % 2 === 0 ? COL_DIRT : COL_DIRT2;
        }
        g.fillRect(sx(x), sy(y), sx(CW) + 1, sy(CH) + 1);

        // Tunnel borders for visual clarity
        if (grid[r][c] === 1) {
          g.strokeStyle = 'rgba(60,30,10,0.5)';
          g.lineWidth = sx(0.5);
          // Draw border only where adjacent to dirt
          if (r > 0 && grid[r-1][c] === 0) { g.beginPath(); g.moveTo(sx(x), sy(y)); g.lineTo(sx(x + CW), sy(y)); g.stroke(); }
          if (r < ROWS-1 && grid[r+1][c] === 0) { g.beginPath(); g.moveTo(sx(x), sy(y + CH)); g.lineTo(sx(x + CW), sy(y + CH)); g.stroke(); }
          if (c > 0 && grid[r][c-1] === 0) { g.beginPath(); g.moveTo(sx(x), sy(y)); g.lineTo(sx(x), sy(y + CH)); g.stroke(); }
          if (c < COLS-1 && grid[r][c+1] === 0) { g.beginPath(); g.moveTo(sx(x + CW), sy(y)); g.lineTo(sx(x + CW), sy(y + CH)); g.stroke(); }
        }
      }
    }

    // Draw ants
    for (const ant of ants) {
      const ax = ant.x * CW + CW / 2;
      const ay = ant.y * CH + CH / 2;
      const wiggle = Math.sin(now / 80 + ant.x * 3 + ant.y * 7) * 1.5;

      g.fillStyle = ant.fire ? COL_FIRE_ANT : (ant.queen ? COL_QUEEN : COL_ANT);
      // Body
      g.fillRect(sx(ax - 3), sy(ay - 2 + wiggle), sx(6), sy(4));
      // Head
      g.fillRect(sx(ax + (ant.dir === 1 ? 3 : ant.dir === 3 ? -5 : -1)), sy(ay - 3 + wiggle), sx(3), sy(3));
      // Legs
      const legW = Math.sin(now / 60 + ant.x) * 1;
      g.fillRect(sx(ax - 4 - legW), sy(ay + 1 + wiggle), sx(2), sy(2));
      g.fillRect(sx(ax + 3 + legW), sy(ay + 1 + wiggle), sx(2), sy(2));
      g.fillRect(sx(ax - 3), sy(ay + 2 + wiggle), sx(2), sy(2));
      g.fillRect(sx(ax + 2), sy(ay + 2 + wiggle), sx(2), sy(2));
    }

    // Draw tongue
    if (tongueDir !== null && tongueLen > 0) {
      const [tdx, tdy] = dirs[tongueDir];
      g.fillStyle = '#ff6090';
      for (let t = 1; t <= tongueLen; t++) {
        const tx = px + tdx * t;
        const ty = py + tdy * t;
        if (tx < 0 || tx >= COLS || ty < 0 || ty >= ROWS) break;
        if (grid[ty][tx] === 0) break;
        const ttx = tx * CW + CW / 2;
        const tty = ty * CH + CH / 2;
        g.fillRect(sx(ttx - 1), sy(tty - 1), sx(2), sy(2));
      }
    }

    // Draw player (aardvark)
    if (invincible > 0 && Math.floor(invincible / 4) % 2 === 0) {
      // blink
    } else {
      drawAardvark(now);
    }

    // Progress bar (ants eaten)
    const prog = Math.min(antsEaten / antsNeeded, 1);
    g.fillStyle = 'rgba(0,0,0,0.5)';
    g.fillRect(sx(5), sy(VH - 10), sx(100), sy(5));
    g.fillStyle = COL_ANT;
    g.fillRect(sx(5), sy(VH - 10), sx(100 * prog), sy(5));
  }

  function drawAardvark(now) {
    const cx = px * CW + CW / 2;
    const cy = py * CH + CH / 2;

    // Body (fills most of cell)
    g.fillStyle = COL_PLAYER;
    g.fillRect(sx(cx - 7), sy(cy - 5), sx(14), sy(10));

    // Snout direction
    const facing = tongueDir ?? 1;
    const [fdx, fdy] = dirs[facing];
    g.fillStyle = COL_SNOUT;
    g.fillRect(sx(cx + fdx * 7 - 3), sy(cy + fdy * 7 - 2), sx(6), sy(4));

    // Eye
    g.fillStyle = '#000';
    const ex = cx + fdx * 3;
    const ey = cy + fdy * 3;
    // Offset eye perpendicular to facing
    const epx = facing === 0 || facing === 2 ? 2 : 0;
    const epy = facing === 1 || facing === 3 ? -2 : 0;
    g.fillRect(sx(ex + epx - 1), sy(ey + epy - 1), sx(2), sy(2));

    // Ears (on top of head area)
    g.fillStyle = COL_PLAYER;
    if (facing === 1 || facing === 3) {
      g.fillRect(sx(cx - 2), sy(cy - 7), sx(4), sy(3));
    } else {
      g.fillRect(sx(cx - 7), sy(cy - 2), sx(3), sy(4));
    }
  }

  function drawHUD(now) {
    g.font = `${sx(7)}px 'Press Start 2P', monospace`;
    g.textBaseline = 'top';

    if (state !== 'title') {
      g.textAlign = 'left';
      g.fillStyle = COL_HUD;
      g.fillText(`SCORE: ${score}`, sx(5), sy(3));

      g.textAlign = 'right';
      g.fillText(`LIVES: ${lives}`, sx(VW - 5), sy(3));

      g.textAlign = 'center';
      g.fillText(`LVL ${level}`, sx(VW / 2), sy(3));

      // Ants remaining
      g.textAlign = 'right';
      g.font = `${sx(5)}px 'Press Start 2P', monospace`;
      g.fillStyle = COL_ANT;
      g.fillText(`${antsEaten}/${antsNeeded}`, sx(108), sy(VH - 12));
    }
  }

  function drawOverlay(line1, line2, now) {
    g.fillStyle = 'rgba(11,14,20,0.75)';
    g.fillRect(0, 0, W, H);

    const pulse = Math.sin(now / 300) * 0.2 + 0.8;
    g.globalAlpha = pulse;
    g.fillStyle = COL_TEXT;
    g.font = `bold ${sx(14)}px 'Press Start 2P', monospace`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(line1, sx(160), sy(85));
    g.globalAlpha = 1;

    g.font = `${sx(6)}px 'Press Start 2P', monospace`;
    g.fillStyle = '#9AA0B4';
    g.fillText(line2, sx(160), sy(115));

    g.font = `${sx(7)}px 'Press Start 2P', monospace`;
    g.fillStyle = COL_HUD;
    g.fillText(`SCORE: ${score}`, sx(160), sy(140));
  }

  // Fullscreen
  let isFullscreen = false;
  if (fsBtn) {
    fsBtn.addEventListener('click', () => {
      isFullscreen = !isFullscreen;
      document.body.classList.toggle('fullscreen', isFullscreen);
      document.body.classList.toggle('embed', isFullscreen);
      fsBtn.textContent = isFullscreen ? '✕' : '⛶';
      setTimeout(resize, 50);
      if (isFullscreen) {
        try { document.documentElement.requestFullscreen?.(); } catch {}
      } else {
        try { document.exitFullscreen?.(); } catch {}
      }
    });
  }

  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && isFullscreen) {
      isFullscreen = false;
      document.body.classList.remove('fullscreen', 'embed');
      if (fsBtn) fsBtn.textContent = '⛶';
      setTimeout(resize, 50);
    }
  });

  // Game loop
  function loop(now) {
    update();
    draw(now);
    requestAnimationFrame(loop);
  }

  updateUI();
  requestAnimationFrame(loop);
})();
