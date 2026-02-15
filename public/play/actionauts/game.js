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
  const mobLeft = document.getElementById('mobLeft');
  const mobRight = document.getElementById('mobRight');
  const mobJump = document.getElementById('mobJump');

  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  const g = canvas.getContext('2d');

  const VW = 320;
  const VH = 200;

  // Colors
  const COL_BG = '#060612';
  const COL_PLAT = '#00f5d4';
  const COL_PLAT_DARK = '#00886e';
  const COL_PLAYER = '#ffcc00';
  const COL_HELMET = '#aaddff';
  const COL_CRYSTAL = '#ff44aa';
  const COL_METEOR = '#ff4444';
  const COL_TEXT = '#00f5d4';
  const COL_HUD = '#ffcc00';
  const COL_STAR = '#ffffff';

  let state = 'title'; // title | playing | gameover | levelup
  let score = 0;
  let lives = 3;
  let level = 1;
  let levelUpTimer = 0;

  // Player
  const PW = 10;
  const PH = 14;
  let px, py, pvx, pvy;
  let onGround = false;
  let facingRight = true;
  const GRAVITY = 0.22;
  const JUMP_VEL = -4.2;
  const MOVE_SPEED = 1.8;
  const FRICTION = 0.82;

  // Platforms
  let platforms = [];
  // Crystals
  let crystals = [];
  // Meteors
  let meteors = [];
  let meteorTimer = 0;
  let meteorInterval = 120;
  // Stars (background)
  let stars = [];
  // Particles
  let particles = [];

  // Audio
  let audioOn = true;
  let ac;
  function beep(freq, dur = 0.05, gain = 0.03, type = 'square') {
    if (!audioOn) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      const o = ac.createOscillator();
      const gg = ac.createGain();
      o.type = type;
      o.frequency.value = freq;
      gg.gain.value = gain;
      gg.gain.linearRampToValueAtTime(0, ac.currentTime + dur);
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
    keys[e.key] = true;
    if (['ArrowLeft','ArrowRight','ArrowUp','a','d','w',' '].includes(e.key)) e.preventDefault();
    if (state === 'title' && (e.key === 'Enter' || e.key === ' ')) startGame();
    if (state === 'gameover' && (e.key === 'Enter' || e.key === ' ')) startGame();
  });
  document.addEventListener('keyup', (e) => { keys[e.key] = false; });

  // Mobile input state
  let mobL = false, mobR = false, mobJ = false;
  function pdown(flag) { return (e) => { e.preventDefault(); if (flag === 'L') mobL = true; if (flag === 'R') mobR = true; if (flag === 'J') mobJ = true; }; }
  function pup(flag) { return (e) => { e.preventDefault(); if (flag === 'L') mobL = false; if (flag === 'R') mobR = false; if (flag === 'J') mobJ = false; }; }

  if (mobLeft) { mobLeft.addEventListener('pointerdown', pdown('L')); mobLeft.addEventListener('pointerup', pup('L')); mobLeft.addEventListener('pointerleave', pup('L')); mobLeft.addEventListener('pointercancel', pup('L')); }
  if (mobRight) { mobRight.addEventListener('pointerdown', pdown('R')); mobRight.addEventListener('pointerup', pup('R')); mobRight.addEventListener('pointerleave', pup('R')); mobRight.addEventListener('pointercancel', pup('R')); }
  if (mobJump) { mobJump.addEventListener('pointerdown', pdown('J')); mobJump.addEventListener('pointerup', pup('J')); mobJump.addEventListener('pointerleave', pup('J')); mobJump.addEventListener('pointercancel', pup('J')); }

  if (mobStart) mobStart.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (state === 'title' || state === 'gameover') startGame();
  });

  // Fullscreen
  if (fsBtn) fsBtn.addEventListener('click', () => {
    if (document.body.classList.contains('fullscreen')) {
      document.body.classList.remove('fullscreen');
      try { document.exitFullscreen?.() || document.webkitExitFullscreen?.(); } catch {}
    } else {
      document.body.classList.add('fullscreen');
      try {
        const el = document.documentElement;
        (el.requestFullscreen || el.webkitRequestFullscreen)?.call(el);
      } catch {}
    }
    resize();
  });
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      document.body.classList.remove('fullscreen');
    }
    resize();
  });

  // Generate stars
  function genStars() {
    stars = [];
    for (let i = 0; i < 60; i++) {
      stars.push({ x: Math.random() * VW, y: Math.random() * VH, s: Math.random() * 1.5 + 0.5, b: Math.random() });
    }
  }
  genStars();

  // Generate level
  function genLevel(lvl) {
    platforms = [];
    crystals = [];
    meteors = [];
    meteorTimer = 0;
    meteorInterval = Math.max(40, 120 - lvl * 10);

    // Ground platform
    platforms.push({ x: 0, y: VH - 10, w: VW, h: 10 });

    // Generate random platforms
    const numPlats = 5 + lvl * 2;
    const numCrystals = 3 + lvl;

    for (let i = 0; i < numPlats; i++) {
      const w = 30 + Math.random() * 40;
      const x = Math.random() * (VW - w);
      const y = 30 + Math.random() * (VH - 60);
      platforms.push({ x, y, w, h: 6 });
    }

    // Sort platforms by y for better crystal placement
    const nonGround = platforms.slice(1).sort((a, b) => a.y - b.y);

    // Place crystals on platforms
    const crystalPlats = [];
    for (let i = 0; i < numCrystals; i++) {
      const pi = i % nonGround.length;
      const plat = nonGround[pi];
      crystals.push({
        x: plat.x + Math.random() * (plat.w - 8) + 4,
        y: plat.y - 10,
        collected: false,
        bob: Math.random() * Math.PI * 2
      });
    }

    // Player starts on ground
    px = VW / 2 - PW / 2;
    py = VH - 10 - PH;
    pvx = 0;
    pvy = 0;
    onGround = true;
  }

  function startGame() {
    if (state === 'title' || state === 'gameover') {
      score = 0;
      lives = 3;
      level = 1;
    }
    state = 'playing';
    genLevel(level);
    updateUI();
    beep(660, 0.08);
    beep(880, 0.08);
  }

  function loseLife() {
    lives--;
    beep(120, 0.2, 0.04);
    if (lives <= 0) {
      state = 'gameover';
      beep(80, 0.4, 0.05);
    } else {
      // Reset player position
      px = VW / 2 - PW / 2;
      py = VH - 10 - PH;
      pvx = 0;
      pvy = 0;
    }
    updateUI();
  }

  function spawnParticles(x, y, color, count = 6) {
    for (let i = 0; i < count; i++) {
      particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 3,
        vy: (Math.random() - 0.5) * 3,
        life: 20 + Math.random() * 15,
        maxLife: 35,
        color,
        size: Math.random() * 3 + 1
      });
    }
  }

  // Collision helpers
  function rectRect(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = Math.round(rect.width * DPR);
    canvas.height = Math.round(rect.height * DPR);
  }
  window.addEventListener('resize', resize);
  resize();

  // Main loop
  let frame = 0;
  function loop() {
    requestAnimationFrame(loop);
    frame++;

    const cw = canvas.width, ch = canvas.height;
    const sx = cw / VW, sy = ch / VH;
    const sc = Math.min(sx, sy);
    const ox = (cw - VW * sc) / 2;
    const oy = (ch - VH * sc) / 2;

    g.fillStyle = COL_BG;
    g.fillRect(0, 0, cw, ch);

    g.save();
    g.translate(ox, oy);
    g.scale(sc, sc);

    // Stars
    stars.forEach(s => {
      const b = 0.5 + 0.5 * Math.sin(frame * 0.03 + s.b * 10);
      g.globalAlpha = b * 0.8;
      g.fillStyle = COL_STAR;
      g.fillRect(s.x, s.y, s.s, s.s);
    });
    g.globalAlpha = 1;

    if (state === 'title') {
      drawTitle();
    } else if (state === 'playing') {
      update();
      draw();
    } else if (state === 'levelup') {
      draw();
      drawLevelUp();
      levelUpTimer--;
      if (levelUpTimer <= 0) {
        state = 'playing';
        genLevel(level);
      }
    } else if (state === 'gameover') {
      draw();
      drawGameOver();
    }

    // Particles (always)
    updateParticles();
    drawParticles();

    g.restore();
  }

  function update() {
    // Input
    let moveL = keys['ArrowLeft'] || keys['a'] || mobL;
    let moveR = keys['ArrowRight'] || keys['d'] || mobR;
    let jump = keys['ArrowUp'] || keys['w'] || keys[' '] || mobJ;

    if (moveL) { pvx -= MOVE_SPEED * 0.3; facingRight = false; }
    if (moveR) { pvx += MOVE_SPEED * 0.3; facingRight = true; }
    pvx *= FRICTION;
    if (Math.abs(pvx) < 0.1) pvx = 0;

    // Clamp horizontal speed
    if (pvx > MOVE_SPEED) pvx = MOVE_SPEED;
    if (pvx < -MOVE_SPEED) pvx = -MOVE_SPEED;

    // Jump
    if (jump && onGround) {
      pvy = JUMP_VEL;
      onGround = false;
      beep(440, 0.06, 0.02);
    }

    // Gravity
    pvy += GRAVITY;
    if (pvy > 5) pvy = 5;

    // Move X
    px += pvx;
    // Wrap around screen
    if (px + PW < 0) px = VW;
    if (px > VW) px = -PW;

    // Move Y and check platform collision
    py += pvy;
    onGround = false;

    for (const pl of platforms) {
      // Only land if falling down
      if (pvy >= 0 && rectRect(px, py, PW, PH, pl.x, pl.y, pl.w, pl.h)) {
        // Check if player was above platform last frame
        if (py + PH - pvy <= pl.y + 2) {
          py = pl.y - PH;
          pvy = 0;
          onGround = true;
        }
      }
    }

    // Fall off bottom
    if (py > VH + 20) {
      loseLife();
      return;
    }

    // Collect crystals
    for (const cr of crystals) {
      if (cr.collected) continue;
      cr.bob += 0.05;
      const cy = cr.y + Math.sin(cr.bob) * 2;
      if (rectRect(px, py, PW, PH, cr.x - 4, cy - 4, 8, 8)) {
        cr.collected = true;
        score += 10 * level;
        beep(880, 0.06, 0.03);
        beep(1100, 0.06, 0.03);
        spawnParticles(cr.x, cy, COL_CRYSTAL, 8);
        updateUI();
      }
    }

    // Check level complete
    if (crystals.length > 0 && crystals.every(c => c.collected)) {
      level++;
      state = 'levelup';
      levelUpTimer = 90;
      beep(660, 0.1); beep(880, 0.1); beep(1100, 0.12);
      updateUI();
      return;
    }

    // Meteors
    meteorTimer++;
    if (meteorTimer >= meteorInterval) {
      meteorTimer = 0;
      meteors.push({
        x: Math.random() * VW,
        y: -10,
        vy: 1 + level * 0.2 + Math.random() * 0.5,
        vx: (Math.random() - 0.5) * 0.8,
        size: 4 + Math.random() * 3,
        rot: Math.random() * Math.PI * 2,
        rotV: (Math.random() - 0.5) * 0.1
      });
    }

    for (let i = meteors.length - 1; i >= 0; i--) {
      const m = meteors[i];
      m.x += m.vx;
      m.y += m.vy;
      m.rot += m.rotV;

      // Hit player
      if (rectRect(px + 1, py + 1, PW - 2, PH - 2, m.x - m.size / 2, m.y - m.size / 2, m.size, m.size)) {
        spawnParticles(px + PW / 2, py + PH / 2, COL_METEOR, 10);
        meteors.splice(i, 1);
        loseLife();
        return;
      }

      // Hit platform - explode
      let hitPlat = false;
      for (const pl of platforms) {
        if (rectRect(m.x - m.size / 2, m.y - m.size / 2, m.size, m.size, pl.x, pl.y, pl.w, pl.h)) {
          hitPlat = true;
          break;
        }
      }
      if (hitPlat || m.y > VH + 20) {
        if (hitPlat) {
          spawnParticles(m.x, m.y, '#ff8844', 4);
          beep(100, 0.05, 0.015);
        }
        meteors.splice(i, 1);
      }
    }
  }

  function draw() {
    // Platforms
    for (const pl of platforms) {
      g.fillStyle = COL_PLAT_DARK;
      g.fillRect(pl.x, pl.y + 2, pl.w, pl.h - 2);
      g.fillStyle = COL_PLAT;
      g.fillRect(pl.x, pl.y, pl.w, 2);
    }

    // Crystals
    for (const cr of crystals) {
      if (cr.collected) continue;
      const cy = cr.y + Math.sin(cr.bob) * 2;
      g.save();
      g.translate(cr.x, cy);
      // Diamond shape
      g.fillStyle = COL_CRYSTAL;
      g.beginPath();
      g.moveTo(0, -5);
      g.lineTo(4, 0);
      g.lineTo(0, 5);
      g.lineTo(-4, 0);
      g.closePath();
      g.fill();
      // Sparkle
      g.globalAlpha = 0.5 + 0.3 * Math.sin(frame * 0.1 + cr.bob);
      g.fillStyle = '#ffffff';
      g.fillRect(-1, -1, 2, 2);
      g.globalAlpha = 1;
      g.restore();
    }

    // Meteors
    for (const m of meteors) {
      g.save();
      g.translate(m.x, m.y);
      g.rotate(m.rot);
      g.fillStyle = COL_METEOR;
      // Jagged rock shape
      g.beginPath();
      const pts = 6;
      for (let i = 0; i < pts; i++) {
        const a = (i / pts) * Math.PI * 2;
        const r = m.size / 2 * (0.7 + Math.sin(i * 2.5) * 0.3);
        if (i === 0) g.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      g.closePath();
      g.fill();
      // Glow trail
      g.globalAlpha = 0.3;
      g.fillStyle = '#ff8800';
      g.fillRect(-1, -m.size, 2, m.size);
      g.globalAlpha = 1;
      g.restore();
    }

    // Player (astronaut)
    drawPlayer(px, py);

    // In-canvas HUD (for embed/fullscreen)
    if (document.body.classList.contains('embed') || document.body.classList.contains('fullscreen')) {
      g.font = '7px "Press Start 2P", monospace';
      g.fillStyle = COL_HUD;
      g.textAlign = 'left';
      g.fillText('SCORE ' + score, 4, 10);
      g.textAlign = 'center';
      g.fillText('LVL ' + level, VW / 2, 10);
      g.textAlign = 'right';
      g.fillText('LIVES ' + lives, VW - 4, 10);
      g.textAlign = 'left';
    }
  }

  function drawPlayer(x, y) {
    g.save();
    g.translate(x + PW / 2, y + PH / 2);
    if (!facingRight) g.scale(-1, 1);

    // Body (suit)
    g.fillStyle = COL_PLAYER;
    g.fillRect(-4, -2, 8, 9);

    // Helmet
    g.fillStyle = COL_HELMET;
    g.fillRect(-4, -7, 8, 6);
    g.fillStyle = '#225588';
    g.fillRect(-2, -6, 5, 4); // visor

    // Legs
    g.fillStyle = COL_PLAYER;
    g.fillRect(-4, 7, 3, 3);
    g.fillRect(1, 7, 3, 3);

    // Backpack
    g.fillStyle = '#887744';
    g.fillRect(-5, -2, 2, 6);

    g.restore();
  }

  function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      if (p.life <= 0) particles.splice(i, 1);
    }
  }

  function drawParticles() {
    for (const p of particles) {
      g.globalAlpha = p.life / p.maxLife;
      g.fillStyle = p.color;
      g.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    g.globalAlpha = 1;
  }

  function drawTitle() {
    g.font = '14px "Press Start 2P", monospace';
    g.fillStyle = COL_TEXT;
    g.textAlign = 'center';
    g.fillText('ACTIONAUTS', VW / 2, 70);

    g.font = '7px "Press Start 2P", monospace';
    g.fillStyle = COL_PLAYER;
    g.fillText('SPACE PLATFORM ADVENTURE', VW / 2, 90);

    // Draw a little astronaut
    drawPlayer(VW / 2 - 5, 105);

    g.fillStyle = '#9AA0B4';
    g.font = '6px "Press Start 2P", monospace';
    const blink = Math.sin(frame * 0.06) > 0;
    if (blink) g.fillText('PRESS START', VW / 2, 145);

    g.fillText('COLLECT CRYSTALS', VW / 2, 165);
    g.fillText('AVOID METEORS', VW / 2, 178);
    g.textAlign = 'left';
  }

  function drawGameOver() {
    g.fillStyle = 'rgba(0,0,0,0.6)';
    g.fillRect(0, 0, VW, VH);

    g.font = '12px "Press Start 2P", monospace';
    g.fillStyle = COL_METEOR;
    g.textAlign = 'center';
    g.fillText('GAME OVER', VW / 2, 80);

    g.font = '8px "Press Start 2P", monospace';
    g.fillStyle = COL_HUD;
    g.fillText('SCORE: ' + score, VW / 2, 105);

    g.fillStyle = '#9AA0B4';
    g.font = '6px "Press Start 2P", monospace';
    const blink = Math.sin(frame * 0.06) > 0;
    if (blink) g.fillText('PRESS START', VW / 2, 135);
    g.textAlign = 'left';
  }

  function drawLevelUp() {
    g.fillStyle = 'rgba(0,0,0,0.5)';
    g.fillRect(0, 0, VW, VH);

    g.font = '10px "Press Start 2P", monospace';
    g.fillStyle = COL_TEXT;
    g.textAlign = 'center';
    g.fillText('LEVEL ' + level, VW / 2, 95);

    g.font = '6px "Press Start 2P", monospace';
    g.fillStyle = COL_HUD;
    g.fillText('GET READY!', VW / 2, 115);
    g.textAlign = 'left';
  }

  if (startBtn) startBtn.addEventListener('click', () => {
    if (state === 'title' || state === 'gameover') startGame();
  });

  loop();
})();
