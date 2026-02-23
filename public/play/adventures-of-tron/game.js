(() => {
  const canvas = document.getElementById('c');
  const scoreEl = document.getElementById('scoreVal');
  const livesEl = document.getElementById('livesVal');
  const levelEl = document.getElementById('levelVal');
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
  const VH = 240;

  // Colors — Tron neon palette
  const C = {
    bg: '#0a0a1a',
    platform: '#004466',
    platformGlow: '#00ccff',
    player: '#00f5d4',
    playerGlow: '#00ffea',
    bit: '#ffcc00',
    bitGlow: '#ffe066',
    elevator: '#0066aa',
    elevatorGlow: '#00aaff',
    ioBeam: '#ff00ff',
    ioBeamGlow: '#ff66ff',
    recognizer: '#ff6600',
    gridBug: '#ff3333',
    tank: '#cc6600',
    text: '#00f5d4',
    hud: '#00f5d4',
    lives: '#00f5d4',
    gridLine: 'rgba(0,100,180,0.08)',
  };

  // Platform Y positions (from bottom to top): ground, plat1, plat2, plat3, plat4(top)
  const GROUND_Y = VH - 20;
  const PLAT_GAP = 44;
  const PLAT_Y = [GROUND_Y, GROUND_Y - PLAT_GAP, GROUND_Y - PLAT_GAP * 2, GROUND_Y - PLAT_GAP * 3, GROUND_Y - PLAT_GAP * 4];
  const PLAT_THICKNESS = 3;
  const PLAT_LEFT = 30;
  const PLAT_RIGHT = VW - 30;

  // Elevator
  const ELEV_W = 10;
  const ELEV_LEFT_X = 8;
  const ELEV_RIGHT_X = VW - 18;

  // I/O beam
  const IO_X = VW / 2 - 15;
  const IO_W = 30;
  const IO_Y = PLAT_Y[4] - 18;

  // Player
  const PW = 10;
  const PH = 14;
  const SPEED = 1.8;
  const JUMP_VEL = -4.5;
  const GRAVITY = 0.22;

  // Game state
  let state = 'title'; // title | playing | dead | gameover
  let audioOn = true;
  let ac;

  let player, bits, enemies, score, lives, level, bitsCollected, bitsNeeded;
  let frameCount = 0;
  let flashTimer = 0;
  let deathTimer = 0;
  let invincible = 0;

  function initPlayer() {
    return {
      x: VW / 2 - PW / 2,
      y: GROUND_Y - PH,
      vx: 0, vy: 0,
      onGround: false,
      onElevator: false,
      elevSide: null, // 'left' | 'right'
      platIndex: 0,
      carrying: 0, // bits carried
      facing: 1, // 1=right, -1=left
    };
  }

  function initGame() {
    player = initPlayer();
    bits = [];
    enemies = [];
    score = 0;
    lives = 3;
    level = 1;
    bitsCollected = 0;
    bitsNeeded = 3;
    frameCount = 0;
    invincible = 0;
    spawnBits();
    spawnEnemies();
  }

  function spawnBits() {
    bits = [];
    const count = bitsNeeded;
    for (let i = 0; i < count; i++) {
      const platIdx = 1 + Math.floor(Math.random() * 3); // platforms 1-3
      bits.push({
        x: PLAT_LEFT + 20 + Math.random() * (PLAT_RIGHT - PLAT_LEFT - 40),
        y: PLAT_Y[platIdx] - 8,
        platIdx,
        pulse: Math.random() * Math.PI * 2,
        alive: true,
      });
    }
  }

  function spawnEnemies() {
    enemies = [];
    const diff = Math.min(level, 10);
    // Recognizers (fly across top area)
    const numRec = 1 + Math.floor(diff / 2);
    for (let i = 0; i < numRec; i++) {
      enemies.push({
        type: 'recognizer',
        x: Math.random() * VW,
        y: PLAT_Y[4] + 4 + Math.random() * 12,
        vx: (1 + Math.random() * 0.8 + diff * 0.15) * (Math.random() < 0.5 ? 1 : -1),
        w: 16, h: 10,
      });
    }
    // Grid Bugs (crawl on platforms 1-3)
    const numBugs = 1 + Math.floor(diff / 3);
    for (let i = 0; i < numBugs; i++) {
      const platIdx = 1 + Math.floor(Math.random() * 3);
      enemies.push({
        type: 'gridBug',
        x: PLAT_LEFT + Math.random() * (PLAT_RIGHT - PLAT_LEFT - 20),
        y: PLAT_Y[platIdx] - 8,
        vx: (0.6 + Math.random() * 0.5 + diff * 0.1) * (Math.random() < 0.5 ? 1 : -1),
        platIdx,
        w: 8, h: 8,
      });
    }
    // Tanks (move on ground)
    const numTanks = Math.max(1, Math.floor(diff / 2));
    for (let i = 0; i < numTanks; i++) {
      enemies.push({
        type: 'tank',
        x: PLAT_LEFT + Math.random() * (PLAT_RIGHT - PLAT_LEFT - 20),
        y: GROUND_Y - 10,
        vx: (0.5 + Math.random() * 0.4 + diff * 0.1) * (Math.random() < 0.5 ? 1 : -1),
        w: 14, h: 10,
      });
    }
  }

  // --- Audio ---
  function ensureAudio() {
    if (!ac) {
      try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch {}
    }
    if (ac && ac.state === 'suspended') ac.resume();
  }

  function playTone(freq, dur, type, vol) {
    if (!audioOn || !ac) return;
    try {
      const o = ac.createOscillator();
      const gn = ac.createGain();
      o.type = type || 'square';
      o.frequency.value = freq;
      gn.gain.value = vol || 0.08;
      gn.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
      o.connect(gn); gn.connect(ac.destination);
      o.start(); o.stop(ac.currentTime + dur);
    } catch {}
  }

  function sfxJump() { playTone(400, 0.12, 'square', 0.06); playTone(600, 0.1, 'square', 0.04); }
  function sfxCollect() { playTone(800, 0.08, 'square', 0.07); playTone(1200, 0.12, 'square', 0.06); }
  function sfxDie() { playTone(200, 0.3, 'sawtooth', 0.1); playTone(100, 0.4, 'sawtooth', 0.08); }
  function sfxScore() {
    playTone(600, 0.1, 'square', 0.07);
    setTimeout(() => playTone(800, 0.1, 'square', 0.07), 100);
    setTimeout(() => playTone(1000, 0.15, 'square', 0.07), 200);
    setTimeout(() => playTone(1200, 0.2, 'square', 0.07), 300);
  }
  function sfxLevelUp() {
    for (let i = 0; i < 5; i++) {
      setTimeout(() => playTone(400 + i * 200, 0.12, 'square', 0.06), i * 80);
    }
  }

  // --- Input ---
  const keys = {};
  window.addEventListener('keydown', e => {
    keys[e.key] = true;
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();
    if (state === 'title' || state === 'gameover') { ensureAudio(); startGame(); }
  });
  window.addEventListener('keyup', e => { keys[e.key] = false; });

  function isLeft() { return keys['ArrowLeft'] || keys['a'] || keys['A']; }
  function isRight() { return keys['ArrowRight'] || keys['d'] || keys['D']; }
  function isUp() { return keys['ArrowUp'] || keys['w'] || keys['W'] || keys[' ']; }
  function isDown() { return keys['ArrowDown'] || keys['s'] || keys['S']; }

  // Mobile touch
  const touch = { left: false, right: false, up: false, down: false };
  function bindTouch(el, dir) {
    if (!el) return;
    const on = e => { e.preventDefault(); touch[dir] = true; };
    const off = e => { e.preventDefault(); touch[dir] = false; };
    el.addEventListener('touchstart', on, { passive: false });
    el.addEventListener('touchend', off, { passive: false });
    el.addEventListener('touchcancel', off, { passive: false });
    el.addEventListener('mousedown', on);
    el.addEventListener('mouseup', off);
    el.addEventListener('mouseleave', off);
  }
  bindTouch(mobUp, 'up');
  bindTouch(mobDown, 'down');
  bindTouch(mobLeft, 'left');
  bindTouch(mobRight, 'right');

  function mLeft() { return isLeft() || touch.left; }
  function mRight() { return isRight() || touch.right; }
  function mUp() { return isUp() || touch.up; }
  function mDown() { return isDown() || touch.down; }

  // Start / mute / fullscreen
  function startGame() {
    ensureAudio();
    if (state === 'title' || state === 'gameover') {
      initGame();
      state = 'playing';
    }
  }
  if (startBtn) startBtn.onclick = startGame;
  if (mobStart) mobStart.addEventListener('touchstart', e => { e.preventDefault(); startGame(); }, { passive: false });
  if (mobStart) mobStart.onclick = startGame;

  function toggleMute() {
    audioOn = !audioOn;
    const label = audioOn ? '🔊 Sound' : '🔇 Muted';
    const icon = audioOn ? '🔊' : '🔇';
    if (muteBtn) muteBtn.textContent = label;
    if (mobMute) mobMute.textContent = icon;
  }
  if (muteBtn) muteBtn.onclick = toggleMute;
  if (mobMute) mobMute.addEventListener('touchstart', e => { e.preventDefault(); toggleMute(); }, { passive: false });
  if (mobMute) mobMute.onclick = toggleMute;

  if (fsBtn) fsBtn.onclick = () => {
    document.body.classList.toggle('fullscreen');
    resize();
  };

  // --- Resize ---
  function resize() {
    const r = canvas.parentElement.getBoundingClientRect();
    canvas.width = Math.round(r.width * DPR);
    canvas.height = Math.round(r.height * DPR);
    g.setTransform(DPR, 0, 0, DPR, 0, 0);
    const scaleX = r.width / VW;
    const scaleY = r.height / VH;
    const scale = Math.min(scaleX, scaleY);
    const offX = (r.width - VW * scale) / 2;
    const offY = (r.height - VH * scale) / 2;
    g.setTransform(scale * DPR, 0, 0, scale * DPR, offX * DPR, offY * DPR);
  }
  window.addEventListener('resize', resize);
  resize();

  // --- Physics / Update ---
  function findPlatBelow(x, y, w) {
    // Find the platform the entity is on or just above
    for (let i = 0; i < PLAT_Y.length; i++) {
      const py = PLAT_Y[i];
      if (y + PH >= py - 2 && y + PH <= py + 6) {
        if (x + w > PLAT_LEFT && x < PLAT_RIGHT) return i;
      }
    }
    return -1;
  }

  function isOnElevator(px, py) {
    // Check if player is on left or right elevator column
    if (px < ELEV_LEFT_X + ELEV_W + 4 && px + PW > ELEV_LEFT_X) return 'left';
    if (px < ELEV_RIGHT_X + ELEV_W + 4 && px + PW > ELEV_RIGHT_X) return 'right';
    return null;
  }

  function update() {
    if (state !== 'playing') return;
    frameCount++;

    const p = player;

    // Horizontal movement
    let moveX = 0;
    if (mLeft()) { moveX = -SPEED; p.facing = -1; }
    if (mRight()) { moveX = SPEED; p.facing = 1; }

    // Check elevator
    const elev = isOnElevator(p.x, p.y);
    if (elev) {
      p.onElevator = true;
      p.elevSide = elev;
      // Vertical movement on elevator
      if (mUp()) { p.vy = -2.0; }
      else if (mDown()) { p.vy = 2.0; }
      else { p.vy = p.vy * 0.7; } // slow to stop
      p.y += p.vy;
      // Clamp to screen
      if (p.y < PLAT_Y[4] - PH) p.y = PLAT_Y[4] - PH;
      if (p.y > GROUND_Y - PH) p.y = GROUND_Y - PH;
      p.x += moveX;
    } else {
      p.onElevator = false;
      // Normal physics
      p.vy += GRAVITY;
      p.x += moveX;
      p.y += p.vy;

      // Jump
      if (mUp() && p.onGround) {
        p.vy = JUMP_VEL;
        p.onGround = false;
        sfxJump();
      }

      // Platform collision
      p.onGround = false;
      for (let i = 0; i < PLAT_Y.length; i++) {
        const py = PLAT_Y[i];
        if (p.vy >= 0 && p.y + PH >= py && p.y + PH <= py + 8) {
          if (p.x + PW > PLAT_LEFT && p.x < PLAT_RIGHT) {
            p.y = py - PH;
            p.vy = 0;
            p.onGround = true;
            p.platIndex = i;
            break;
          }
        }
      }

      // Fall off bottom
      if (p.y > VH + 20) {
        die();
        return;
      }
    }

    // Clamp horizontal
    if (p.x < 0) p.x = 0;
    if (p.x > VW - PW) p.x = VW - PW;

    // Collect bits
    for (const bit of bits) {
      if (!bit.alive) continue;
      const dx = (p.x + PW / 2) - bit.x;
      const dy = (p.y + PH / 2) - bit.y;
      if (Math.abs(dx) < 12 && Math.abs(dy) < 12) {
        bit.alive = false;
        p.carrying++;
        sfxCollect();
      }
    }

    // I/O beam delivery
    if (p.carrying > 0 && p.y <= PLAT_Y[4] && p.x + PW > IO_X && p.x < IO_X + IO_W) {
      score += p.carrying * 100 * level;
      bitsCollected += p.carrying;
      p.carrying = 0;
      sfxScore();
      flashTimer = 20;

      // Check level complete
      const remaining = bits.filter(b => b.alive).length;
      if (remaining === 0) {
        level++;
        bitsNeeded = Math.min(3 + level, 8);
        sfxLevelUp();
        spawnBits();
        spawnEnemies();
      }
    }

    // Update enemies
    for (const e of enemies) {
      e.x += e.vx;
      // Wrap or bounce
      if (e.type === 'recognizer') {
        if (e.x > VW + 20) e.x = -20;
        if (e.x < -20) e.x = VW + 20;
      } else {
        // Bounce on platform edges
        if (e.x < PLAT_LEFT) { e.x = PLAT_LEFT; e.vx = -e.vx; }
        if (e.x + e.w > PLAT_RIGHT) { e.x = PLAT_RIGHT - e.w; e.vx = -e.vx; }
      }

      // Collision with player
      if (invincible <= 0) {
        if (p.x < e.x + e.w && p.x + PW > e.x && p.y < e.y + e.h && p.y + PH > e.y) {
          die();
          return;
        }
      }
    }

    if (invincible > 0) invincible--;
    if (flashTimer > 0) flashTimer--;
  }

  function die() {
    lives--;
    sfxDie();
    if (lives <= 0) {
      state = 'gameover';
    } else {
      // Reset player position, keep score
      player = initPlayer();
      invincible = 90; // 1.5s invincibility
    }
  }

  // --- Rendering ---
  function draw() {
    // Clear
    g.fillStyle = C.bg;
    g.fillRect(0, 0, VW, VH);

    // Grid lines for Tron effect
    g.strokeStyle = C.gridLine;
    g.lineWidth = 0.5;
    for (let x = 0; x < VW; x += 20) {
      g.beginPath(); g.moveTo(x, 0); g.lineTo(x, VH); g.stroke();
    }
    for (let y = 0; y < VH; y += 20) {
      g.beginPath(); g.moveTo(0, y); g.lineTo(VW, y); g.stroke();
    }

    // Platforms
    for (let i = 0; i < PLAT_Y.length; i++) {
      const py = PLAT_Y[i];
      // Glow
      g.shadowColor = C.platformGlow;
      g.shadowBlur = 6;
      g.fillStyle = C.platform;
      g.fillRect(PLAT_LEFT, py, PLAT_RIGHT - PLAT_LEFT, PLAT_THICKNESS);
      g.shadowBlur = 0;
      // Bright edge
      g.fillStyle = C.platformGlow;
      g.fillRect(PLAT_LEFT, py, PLAT_RIGHT - PLAT_LEFT, 1);
    }

    // Elevators
    drawElevator(ELEV_LEFT_X);
    drawElevator(ELEV_RIGHT_X);

    // I/O Beam
    drawIOBeam();

    // Bits
    for (const bit of bits) {
      if (!bit.alive) continue;
      bit.pulse += 0.08;
      const s = 3 + Math.sin(bit.pulse) * 1.5;
      g.shadowColor = C.bitGlow;
      g.shadowBlur = 8;
      g.fillStyle = C.bit;
      g.fillRect(bit.x - s, bit.y - s, s * 2, s * 2);
      g.shadowBlur = 0;
    }

    // Enemies
    for (const e of enemies) {
      drawEnemy(e);
    }

    // Player
    if (state === 'playing' || state === 'title') {
      if (invincible <= 0 || (frameCount % 4 < 2)) {
        drawPlayer();
      }
    }

    // I/O beam flash
    if (flashTimer > 0) {
      g.fillStyle = `rgba(255,0,255,${flashTimer / 40})`;
      g.fillRect(0, 0, VW, VH);
    }

    // HUD on canvas
    drawHUD();

    // Title / Game Over overlay
    if (state === 'title') drawTitle();
    if (state === 'gameover') drawGameOver();
  }

  function drawElevator(x) {
    g.shadowColor = C.elevatorGlow;
    g.shadowBlur = 4;
    g.fillStyle = C.elevator;
    g.fillRect(x, PLAT_Y[4], ELEV_W, GROUND_Y - PLAT_Y[4]);
    g.shadowBlur = 0;
    // Moving indicator lines
    const t = frameCount * 0.5;
    g.fillStyle = C.elevatorGlow;
    for (let y = PLAT_Y[4]; y < GROUND_Y; y += 12) {
      const oy = (y + t) % (GROUND_Y - PLAT_Y[4]) + PLAT_Y[4];
      if (oy >= PLAT_Y[4] && oy < GROUND_Y) {
        g.fillRect(x + 2, oy, ELEV_W - 4, 2);
      }
    }
  }

  function drawIOBeam() {
    const t = frameCount * 0.05;
    const alpha = 0.5 + Math.sin(t) * 0.3;
    g.shadowColor = C.ioBeamGlow;
    g.shadowBlur = 12;
    g.fillStyle = `rgba(255,0,255,${alpha})`;
    g.fillRect(IO_X, IO_Y, IO_W, 16);
    g.shadowBlur = 0;
    // Arrow/beam indicator
    g.fillStyle = C.ioBeam;
    g.font = '8px monospace';
    g.textAlign = 'center';
    g.fillText('I/O', IO_X + IO_W / 2, IO_Y - 2);
  }

  function drawEnemy(e) {
    if (e.type === 'recognizer') {
      // Recognizer: T-shaped
      g.shadowColor = C.recognizer;
      g.shadowBlur = 6;
      g.fillStyle = C.recognizer;
      g.fillRect(e.x, e.y, e.w, 4); // top bar
      g.fillRect(e.x + 5, e.y + 4, 6, e.h - 4); // legs
      g.shadowBlur = 0;
    } else if (e.type === 'gridBug') {
      g.shadowColor = C.gridBug;
      g.shadowBlur = 4;
      g.fillStyle = C.gridBug;
      // X-shaped bug
      const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
      g.fillRect(cx - 4, cy - 1, 8, 2);
      g.fillRect(cx - 1, cy - 4, 2, 8);
      g.fillRect(cx - 3, cy - 3, 2, 2);
      g.fillRect(cx + 1, cy - 3, 2, 2);
      g.fillRect(cx - 3, cy + 1, 2, 2);
      g.fillRect(cx + 1, cy + 1, 2, 2);
      g.shadowBlur = 0;
    } else if (e.type === 'tank') {
      g.shadowColor = C.tank;
      g.shadowBlur = 4;
      g.fillStyle = C.tank;
      g.fillRect(e.x, e.y + 4, e.w, 6); // body
      g.fillRect(e.x + 4, e.y, 6, 4); // turret
      // barrel
      const dir = e.vx > 0 ? 1 : -1;
      g.fillRect(dir > 0 ? e.x + 10 : e.x - 2, e.y + 1, 6, 2);
      g.shadowBlur = 0;
    }
  }

  function drawPlayer() {
    const p = player;
    g.shadowColor = C.playerGlow;
    g.shadowBlur = 8;
    g.fillStyle = C.player;
    // Body
    g.fillRect(p.x + 2, p.y, PW - 4, PH);
    // Head
    g.fillRect(p.x + 3, p.y - 2, PW - 6, 3);
    // Helmet visor
    g.fillStyle = '#003344';
    g.fillRect(p.x + (p.facing > 0 ? 5 : 2), p.y - 1, 3, 2);
    // Arms
    g.fillStyle = C.player;
    g.fillRect(p.x, p.y + 3, 2, 5);
    g.fillRect(p.x + PW - 2, p.y + 3, 2, 5);
    // Legs
    g.fillRect(p.x + 2, p.y + PH, 2, 3);
    g.fillRect(p.x + PW - 4, p.y + PH, 2, 3);
    g.shadowBlur = 0;

    // Carrying indicator
    if (p.carrying > 0) {
      g.fillStyle = C.bit;
      g.shadowColor = C.bitGlow;
      g.shadowBlur = 4;
      for (let i = 0; i < p.carrying; i++) {
        g.fillRect(p.x + PW / 2 - 1 + i * 4 - (p.carrying - 1) * 2, p.y - 6, 3, 3);
      }
      g.shadowBlur = 0;
    }
  }

  function drawHUD() {
    g.font = '8px monospace';
    g.textAlign = 'left';
    g.fillStyle = C.hud;
    g.fillText('SCORE: ' + score, 4, 10);
    g.textAlign = 'right';
    g.fillText('LVL ' + level, VW - 4, 10);
    // Lives as small icons
    g.textAlign = 'left';
    for (let i = 0; i < lives; i++) {
      g.fillStyle = C.lives;
      g.fillRect(4 + i * 10, 14, 6, 8);
    }
    // Update DOM HUD too
    if (scoreEl) scoreEl.textContent = score;
    if (livesEl) livesEl.textContent = lives;
    if (levelEl) levelEl.textContent = level;
  }

  function drawTitle() {
    g.fillStyle = 'rgba(0,0,0,0.75)';
    g.fillRect(0, 0, VW, VH);
    g.shadowColor = C.ioBeamGlow;
    g.shadowBlur = 12;
    g.fillStyle = C.text;
    g.font = '14px "Press Start 2P", monospace';
    g.textAlign = 'center';
    g.fillText('ADVENTURES', VW / 2, VH / 2 - 30);
    g.fillText('OF TRON', VW / 2, VH / 2 - 10);
    g.shadowBlur = 0;
    g.font = '7px monospace';
    g.fillStyle = '#9AA0B4';
    g.fillText('Press any key or Start', VW / 2, VH / 2 + 20);
    g.fillText('Collect bits → Deliver to I/O beam', VW / 2, VH / 2 + 35);
    g.fillText('Avoid enemies! Use elevators!', VW / 2, VH / 2 + 47);
  }

  function drawGameOver() {
    g.fillStyle = 'rgba(0,0,0,0.8)';
    g.fillRect(0, 0, VW, VH);
    g.shadowColor = '#ff3333';
    g.shadowBlur = 10;
    g.fillStyle = '#ff3333';
    g.font = '14px "Press Start 2P", monospace';
    g.textAlign = 'center';
    g.fillText('GAME OVER', VW / 2, VH / 2 - 15);
    g.shadowBlur = 0;
    g.fillStyle = C.text;
    g.font = '9px monospace';
    g.fillText('Score: ' + score, VW / 2, VH / 2 + 10);
    g.font = '7px monospace';
    g.fillStyle = '#9AA0B4';
    g.fillText('Press any key to restart', VW / 2, VH / 2 + 30);
  }

  // --- Main Loop ---
  function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
  }
  loop();
})();
