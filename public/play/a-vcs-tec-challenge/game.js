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

  // Virtual resolution
  const VW = 320;
  const VH = 200;

  // Colors (Atari palette)
  const COL_BG = '#1a0a2e';
  const COL_GROUND = '#4a2800';
  const COL_PLAYER = '#00f5d4';
  const COL_SPEAR = '#ff4444';
  const COL_STONE = '#888888';
  const COL_PYRAMID = '#c8a030';
  const COL_SKY = '#2020a0';
  const COL_TEXT = '#00f5d4';
  const COL_HUD = '#ffcc00';

  // State
  let state = 'title'; // title, playing, dead, gameover, win, transition
  let currentLevel = 1;
  let score = 0;
  let lives = 3;
  let scrollX = 0;
  let playerX, playerY, playerState; // 'run','jump','duck'
  let jumpT = 0;
  let spears = [];
  let spearTimer = 0;
  let gauntletDist = 0;
  const GAUNTLET_LENGTH = 2000;
  let invincible = 0;

  // Level 2
  let stairX, stairLane; // 0,1,2 lanes
  let stones = [];
  let stoneTimer = 0;
  let climbProgress = 0;
  const CLIMB_LENGTH = 1500;

  // Transition
  let transTimer = 0;

  // Sound
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
    if (levelEl) levelEl.textContent = state === 'title' ? '—' : currentLevel;
  }

  // Input
  const keys = {};
  const pressed = {}; // for single-press detection
  document.addEventListener('keydown', (e) => {
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space',' '].includes(e.key)) e.preventDefault();
    keys[e.key] = true;
    if (!pressed[e.key]) pressed[e.key] = true;

    if ((e.key === ' ' || e.key === 'Enter') && (state === 'title' || state === 'gameover' || state === 'win')) {
      doStart();
    }
  });
  document.addEventListener('keyup', (e) => { keys[e.key] = false; });

  // Mobile touch controls
  function bindTouch(el, key) {
    if (!el) return;
    el.addEventListener('touchstart', (e) => { e.preventDefault(); keys[key] = true; pressed[key] = true; }, { passive: false });
    el.addEventListener('touchend', (e) => { e.preventDefault(); keys[key] = false; }, { passive: false });
    el.addEventListener('touchcancel', (e) => { keys[key] = false; }, { passive: false });
  }
  bindTouch(mobUp, 'ArrowUp');
  bindTouch(mobDown, 'ArrowDown');
  bindTouch(mobLeft, 'ArrowLeft');
  bindTouch(mobRight, 'ArrowRight');

  if (mobStart) mobStart.addEventListener('click', (e) => { e.preventDefault(); doStart(); });
  if (startBtn) startBtn.addEventListener('click', doStart);

  function doStart() {
    if (state === 'title' || state === 'gameover' || state === 'win') {
      startGame();
    }
  }

  function startGame() {
    score = 0;
    lives = 3;
    currentLevel = 1;
    initLevel1();
    state = 'playing';
    beep(660, 0.05);
    updateUI();
  }

  function initLevel1() {
    playerX = 40;
    playerY = 0; // ground-relative
    playerState = 'run';
    jumpT = 0;
    scrollX = 0;
    gauntletDist = 0;
    spears = [];
    spearTimer = 0;
    invincible = 0;
  }

  function initLevel2() {
    stairLane = 1; // middle
    stones = [];
    stoneTimer = 0;
    climbProgress = 0;
    invincible = 0;
  }

  // Spear spawning (Level 1)
  function spawnSpear() {
    const fromTop = Math.random() < 0.5;
    const yTarget = fromTop ? 0 : 1; // 0=high (need duck), 1=low (need jump)
    const fromRight = Math.random() < 0.7;
    spears.push({
      x: fromRight ? VW + 10 : -10,
      y: yTarget === 0 ? 100 : 148, // actual y positions
      vx: fromRight ? -(3 + Math.random() * 2) : (3 + Math.random() * 2),
      high: yTarget === 0
    });
  }

  // Stone spawning (Level 2)
  function spawnStone() {
    const lane = Math.floor(Math.random() * 3);
    stones.push({
      lane,
      y: -20,
      speed: 2 + Math.random() * 1.5
    });
  }

  function playerHit() {
    if (invincible > 0) return;
    lives--;
    beep(150, 0.15, 0.05);
    setTimeout(() => beep(100, 0.2, 0.04), 150);
    invincible = 120; // 2 seconds of invincibility
    if (lives <= 0) {
      state = 'gameover';
    }
    updateUI();
  }

  // Update
  let lastTime = 0;
  function update(dt) {
    if (state !== 'playing' && state !== 'transition') return;

    if (state === 'transition') {
      transTimer -= dt;
      if (transTimer <= 0) {
        state = 'playing';
      }
      return;
    }

    if (invincible > 0) invincible--;

    if (currentLevel === 1) updateLevel1(dt);
    else updateLevel2(dt);
  }

  function updateLevel1(dt) {
    // Auto-scroll
    const speed = 2;
    scrollX += speed;
    gauntletDist += speed;

    // Check level complete
    if (gauntletDist >= GAUNTLET_LENGTH) {
      score += 500;
      beep(523, 0.1, 0.04);
      setTimeout(() => beep(659, 0.1, 0.04), 120);
      setTimeout(() => beep(784, 0.2, 0.05), 240);
      currentLevel = 2;
      initLevel2();
      state = 'transition';
      transTimer = 90;
      updateUI();
      return;
    }

    // Player input
    if ((keys['ArrowUp'] || keys['w'] || keys['W']) && playerState === 'run') {
      playerState = 'jump';
      jumpT = 0;
      beep(440, 0.03);
    }
    if ((keys['ArrowDown'] || keys['s'] || keys['S']) && playerState === 'run') {
      playerState = 'duck';
    }
    if (playerState === 'duck' && !keys['ArrowDown'] && !keys['s'] && !keys['S']) {
      playerState = 'run';
    }

    // Jump arc
    if (playerState === 'jump') {
      jumpT++;
      playerY = Math.sin(jumpT * Math.PI / 30) * 50;
      if (jumpT >= 30) {
        playerY = 0;
        playerState = 'run';
      }
    }

    // Spawn spears
    spearTimer++;
    const spawnRate = Math.max(15, 40 - gauntletDist / 80);
    if (spearTimer >= spawnRate) {
      spawnSpear();
      spearTimer = 0;
    }

    // Update spears
    for (let i = spears.length - 1; i >= 0; i--) {
      const s = spears[i];
      s.x += s.vx;
      if (s.x < -30 || s.x > VW + 30) {
        spears.splice(i, 1);
        score += 10;
        continue;
      }

      // Collision with player
      const px = 50;
      const groundY = 160;
      let py, ph;
      if (playerState === 'duck') {
        py = groundY - 12;
        ph = 12;
      } else if (playerState === 'jump') {
        py = groundY - 30 - playerY;
        ph = 30;
      } else {
        py = groundY - 30;
        ph = 30;
      }

      if (Math.abs(s.x - px) < 12 && s.y > py && s.y < py + ph) {
        spears.splice(i, 1);
        playerHit();
      }
    }
  }

  function updateLevel2(dt) {
    // Auto climb
    const speed = 1.5;
    climbProgress += speed;

    // Check level complete
    if (climbProgress >= CLIMB_LENGTH) {
      score += 1000;
      state = 'win';
      beep(523, 0.1, 0.04);
      setTimeout(() => beep(659, 0.1, 0.04), 120);
      setTimeout(() => beep(784, 0.15, 0.05), 240);
      setTimeout(() => beep(1047, 0.3, 0.06), 400);
      updateUI();
      return;
    }

    // Player input - lane change
    if (pressed['ArrowLeft'] || pressed['a'] || pressed['A']) {
      if (stairLane > 0) { stairLane--; beep(330, 0.02); }
    }
    if (pressed['ArrowRight'] || pressed['d'] || pressed['D']) {
      if (stairLane < 2) { stairLane++; beep(330, 0.02); }
    }

    // Spawn stones
    stoneTimer++;
    const spawnRate = Math.max(20, 50 - climbProgress / 50);
    if (stoneTimer >= spawnRate) {
      spawnStone();
      stoneTimer = 0;
    }

    // Update stones
    for (let i = stones.length - 1; i >= 0; i--) {
      const s = stones[i];
      s.y += s.speed;
      if (s.y > VH + 20) {
        stones.splice(i, 1);
        score += 15;
        continue;
      }

      // Collision
      const playerDrawY = 140;
      if (s.lane === stairLane && s.y > playerDrawY - 15 && s.y < playerDrawY + 15) {
        stones.splice(i, 1);
        playerHit();
      }
    }
  }

  // Clear pressed keys each frame
  function clearPressed() {
    for (const k in pressed) pressed[k] = false;
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

  // Scale helper
  function sx(v) { return v * W / VW; }
  function sy(v) { return v * H / VH; }

  function draw(now) {
    g.clearRect(0, 0, W, H);

    if (state === 'title') {
      drawTitle(now);
    } else if (currentLevel === 1) {
      drawLevel1(now);
    } else {
      drawLevel2(now);
    }

    // HUD on canvas
    drawHUD(now);

    // Overlays
    if (state === 'gameover') drawOverlay('GAME OVER', 'PRESS START', now);
    if (state === 'win') drawOverlay('VICTORY!', 'PRESS START', now);
    if (state === 'transition') drawOverlay('LEVEL 2', 'THE PYRAMID', now);
  }

  function drawTitle(now) {
    // Background
    g.fillStyle = COL_BG;
    g.fillRect(0, 0, W, H);

    // Pyramid silhouette
    g.fillStyle = COL_PYRAMID;
    g.beginPath();
    g.moveTo(sx(160), sy(60));
    g.lineTo(sx(60), sy(170));
    g.lineTo(sx(260), sy(170));
    g.closePath();
    g.fill();

    // Title
    const pulse = Math.sin(now / 400) * 0.2 + 0.8;
    g.globalAlpha = pulse;
    g.fillStyle = COL_TEXT;
    g.font = `bold ${sx(14)}px 'Press Start 2P', monospace`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('A-VCS-TEC', sx(160), sy(80));
    g.fillText('CHALLENGE', sx(160), sy(100));
    g.globalAlpha = 1;

    g.font = `${sx(7)}px 'Press Start 2P', monospace`;
    g.fillStyle = '#9AA0B4';
    g.fillText('PRESS START', sx(160), sy(140));

    // Spear decorations
    const spearBob = Math.sin(now / 300) * 5;
    drawSpearShape(sx(40), sy(120 + spearBob), 1);
    drawSpearShape(sx(280), sy(130 - spearBob), -1);
  }

  function drawSpearShape(x, y, dir) {
    g.fillStyle = COL_SPEAR;
    g.fillRect(x, y, sx(25) * dir, sy(2));
    // Tip
    g.beginPath();
    g.moveTo(x + sx(25) * dir, y - sy(4));
    g.lineTo(x + sx(32) * dir, y + sy(1));
    g.lineTo(x + sx(25) * dir, y + sy(6));
    g.closePath();
    g.fill();
  }

  function drawLevel1(now) {
    // Sky
    g.fillStyle = COL_SKY;
    g.fillRect(0, 0, W, sy(130));

    // Ground
    g.fillStyle = COL_GROUND;
    g.fillRect(0, sy(160), W, sy(40));

    // Ground line
    g.fillStyle = '#6a4800';
    g.fillRect(0, sy(158), W, sy(4));

    // Scenery - pillars/columns scrolling
    g.fillStyle = '#3a3a6a';
    for (let i = 0; i < 8; i++) {
      const px = ((i * 80 - scrollX * 0.3) % (VW + 80) + VW + 80) % (VW + 80) - 40;
      g.fillRect(sx(px), sy(80), sx(8), sy(80));
      g.fillRect(sx(px - 4), sy(78), sx(16), sy(6));
    }

    // Warriors on sides throwing spears (decorative)
    const bob = Math.sin(now / 200) * 2;
    g.fillStyle = '#aa4400';
    // Left warriors
    g.fillRect(sx(5), sy(130 + bob), sx(10), sy(28));
    g.fillRect(sx(8), sy(125 + bob), sx(4), sy(8));
    // Right warriors
    g.fillRect(sx(305), sy(135 - bob), sx(10), sy(23));
    g.fillRect(sx(308), sy(130 - bob), sx(4), sy(8));

    // Spears
    for (const s of spears) {
      g.fillStyle = COL_SPEAR;
      const dir = s.vx > 0 ? 1 : -1;
      g.fillRect(sx(s.x), sy(s.y), sx(20) * dir / Math.abs(dir), sy(2));
      // Tip
      g.beginPath();
      const tipX = s.x + (s.vx > 0 ? 20 : 0);
      g.moveTo(sx(tipX), sy(s.y - 3));
      g.lineTo(sx(tipX + 6 * dir), sy(s.y + 1));
      g.lineTo(sx(tipX), sy(s.y + 5));
      g.closePath();
      g.fill();
    }

    // Player
    if (invincible > 0 && Math.floor(invincible / 4) % 2 === 0) {
      // Blink during invincibility
    } else {
      drawPlayer1(now);
    }

    // Progress bar
    const prog = gauntletDist / GAUNTLET_LENGTH;
    g.fillStyle = 'rgba(0,0,0,0.5)';
    g.fillRect(sx(20), sy(8), sx(280), sy(6));
    g.fillStyle = COL_TEXT;
    g.fillRect(sx(20), sy(8), sx(280 * prog), sy(6));
  }

  function drawPlayer1(now) {
    const px = 50;
    const groundY = 160;
    let py, h;

    if (playerState === 'duck') {
      py = groundY - 12;
      h = 12;
    } else if (playerState === 'jump') {
      py = groundY - 30 - playerY;
      h = 30;
    } else {
      py = groundY - 30;
      h = 30;
    }

    // Body
    g.fillStyle = COL_PLAYER;
    g.fillRect(sx(px - 5), sy(py), sx(10), sy(h));

    // Head
    g.fillRect(sx(px - 4), sy(py - 8), sx(8), sy(8));

    // Legs animation
    const legAnim = Math.sin(now / 80) * 3;
    if (playerState !== 'duck' && playerState !== 'jump') {
      g.fillRect(sx(px - 5), sy(py + h), sx(4), sy(6 + legAnim));
      g.fillRect(sx(px + 1), sy(py + h), sx(4), sy(6 - legAnim));
    }
  }

  function drawLevel2(now) {
    // Sky gradient
    g.fillStyle = '#100828';
    g.fillRect(0, 0, W, H);

    // Pyramid background
    g.fillStyle = COL_PYRAMID;
    g.beginPath();
    g.moveTo(sx(160), sy(10));
    g.lineTo(sx(20), sy(190));
    g.lineTo(sx(300), sy(190));
    g.closePath();
    g.fill();

    // Stairs lines
    g.strokeStyle = '#8a6020';
    g.lineWidth = sx(1);
    for (let i = 0; i < 20; i++) {
      const yy = 20 + i * 9;
      const spread = i * 7 + 20;
      g.beginPath();
      g.moveTo(sx(160 - spread), sy(yy));
      g.lineTo(sx(160 + spread), sy(yy));
      g.stroke();
    }

    // Lanes
    const laneW = 40;
    const laneStart = 160 - laneW * 1.5;
    for (let i = 0; i < 3; i++) {
      const lx = laneStart + i * laneW;
      g.fillStyle = i === stairLane ? 'rgba(0,245,212,0.08)' : 'rgba(0,0,0,0.1)';
      g.fillRect(sx(lx), sy(20), sx(laneW), sy(170));
    }

    // Stones
    for (const s of stones) {
      const stoneX = laneStart + s.lane * laneW + laneW / 2;
      g.fillStyle = COL_STONE;
      g.beginPath();
      g.arc(sx(stoneX), sy(s.y), sx(10), 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#666';
      g.beginPath();
      g.arc(sx(stoneX - 2), sy(s.y - 2), sx(3), 0, Math.PI * 2);
      g.fill();
    }

    // Player
    const playerDrawY = 140;
    const playerDrawX = laneStart + stairLane * laneW + laneW / 2;
    if (!(invincible > 0 && Math.floor(invincible / 4) % 2 === 0)) {
      g.fillStyle = COL_PLAYER;
      // Body
      g.fillRect(sx(playerDrawX - 5), sy(playerDrawY - 10), sx(10), sy(20));
      // Head
      g.fillRect(sx(playerDrawX - 4), sy(playerDrawY - 18), sx(8), sy(8));
      // Legs
      const legA = Math.sin(now / 100) * 2;
      g.fillRect(sx(playerDrawX - 4), sy(playerDrawY + 10), sx(4), sy(5 + legA));
      g.fillRect(sx(playerDrawX), sy(playerDrawY + 10), sx(4), sy(5 - legA));
    }

    // Progress bar
    const prog = climbProgress / CLIMB_LENGTH;
    g.fillStyle = 'rgba(0,0,0,0.5)';
    g.fillRect(sx(20), sy(8), sx(280), sy(6));
    g.fillStyle = COL_TEXT;
    g.fillRect(sx(20), sy(8), sx(280 * prog), sy(6));
  }

  function drawHUD(now) {
    g.font = `${sx(7)}px 'Press Start 2P', monospace`;
    g.textBaseline = 'top';

    if (state !== 'title') {
      // Score
      g.textAlign = 'left';
      g.fillStyle = COL_HUD;
      g.fillText(`SCORE: ${score}`, sx(5), sy(VH - 14));

      // Lives
      g.textAlign = 'right';
      g.fillText(`LIVES: ${lives}`, sx(VW - 5), sy(VH - 14));

      // Level
      g.textAlign = 'center';
      g.fillText(`LVL ${currentLevel}`, sx(VW / 2), sy(VH - 14));
    }
  }

  function drawOverlay(line1, line2, now) {
    g.fillStyle = 'rgba(11,14,20,0.7)';
    g.fillRect(0, 0, W, H);

    const pulse = Math.sin(now / 300) * 0.2 + 0.8;
    g.globalAlpha = pulse;
    g.fillStyle = COL_TEXT;
    g.font = `bold ${sx(14)}px 'Press Start 2P', monospace`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(line1, sx(160), sy(85));
    g.globalAlpha = 1;

    g.font = `${sx(8)}px 'Press Start 2P', monospace`;
    g.fillStyle = '#9AA0B4';
    g.fillText(line2, sx(160), sy(115));

    if (state !== 'transition') {
      g.font = `${sx(7)}px 'Press Start 2P', monospace`;
      g.fillStyle = COL_HUD;
      g.fillText(`SCORE: ${score}`, sx(160), sy(140));
    }
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
    const dt = 1; // fixed step
    update(dt);
    draw(now);
    clearPressed();
    requestAnimationFrame(loop);
  }

  updateUI();
  requestAnimationFrame(loop);
})();
