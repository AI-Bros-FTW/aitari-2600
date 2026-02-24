(() => {
  const canvas = document.getElementById('c');
  const scoreEl = document.getElementById('scoreVal');
  const waveEl = document.getElementById('waveVal');
  const startBtn = document.getElementById('start');
  const mobStart = document.getElementById('mobStart');
  const muteBtn = document.getElementById('mute');
  const mobMute = document.getElementById('mobMute');
  const fsBtn = document.getElementById('fsBtn');
  const mobLeft = document.getElementById('mobLeft');
  const mobRight = document.getElementById('mobRight');
  const mobFire = document.getElementById('mobFire');

  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  const g = canvas.getContext('2d');

  const VW = 320;
  const VH = 240;

  // Neon palette
  const C = {
    bg: '#0a0a1a',
    sky: '#060612',
    ground: '#1a1a3a',
    building: '#00ccff',
    buildingDark: '#004466',
    buildingDmg: '#ff3333',
    player: '#00f5d4',
    playerGlow: '#00ffea',
    bullet: '#ffcc00',
    bulletGlow: '#ffe066',
    enemy: '#ff6600',
    enemyGlow: '#ff9944',
    bomb: '#ff3333',
    bombGlow: '#ff6666',
    explosion: '#ffaa00',
    text: '#00f5d4',
    hud: '#00f5d4',
    star: 'rgba(255,255,255,0.4)',
  };

  // Layout
  const GROUND_Y = VH - 30;
  const BUILDING_H = 50;
  const PLAYER_Y = GROUND_Y - 14;
  const PW = 16;
  const PH = 10;
  const PLAYER_SPEED = 2.5;
  const BULLET_SPEED = 4;
  const MAX_BULLETS = 3;
  const SHOOT_COOLDOWN = 10;

  // Buildings: two buildings
  const buildings = [
    { x: 60, w: 60, hp: 5, maxHp: 5 },
    { x: 200, w: 60, hp: 5, maxHp: 5 },
  ];

  // Stars
  const stars = [];
  for (let i = 0; i < 40; i++) {
    stars.push({ x: Math.random() * VW, y: Math.random() * (GROUND_Y - 20), s: 0.5 + Math.random() * 1.5, twinkle: Math.random() * Math.PI * 2 });
  }

  // State
  let state = 'title'; // title | playing | gameover
  let audioOn = true;
  let ac;

  let player, bullets, enemies, bombs, explosions, score, wave, frameCount, shootCooldown;
  let enemySpawnTimer, enemySpawnInterval, enemySpeed, bombInterval;

  function initGame() {
    player = { x: VW / 2 - PW / 2 };
    bullets = [];
    enemies = [];
    bombs = [];
    explosions = [];
    score = 0;
    wave = 1;
    frameCount = 0;
    shootCooldown = 0;
    buildings[0].hp = buildings[0].maxHp;
    buildings[1].hp = buildings[1].maxHp;
    setupWave();
  }

  function setupWave() {
    enemySpawnTimer = 0;
    enemySpawnInterval = Math.max(30, 90 - wave * 8);
    enemySpeed = 0.8 + wave * 0.2;
    bombInterval = Math.max(40, 120 - wave * 10);
  }

  // Audio
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

  function sfxShoot() { playTone(600, 0.08, 'square', 0.05); }
  function sfxHitEnemy() { playTone(800, 0.1, 'square', 0.07); playTone(1200, 0.08, 'square', 0.05); }
  function sfxHitBomb() { playTone(500, 0.06, 'square', 0.05); }
  function sfxBuildingHit() { playTone(120, 0.3, 'sawtooth', 0.1); playTone(80, 0.4, 'sawtooth', 0.08); }
  function sfxGameOver() {
    playTone(200, 0.3, 'sawtooth', 0.1);
    setTimeout(() => playTone(150, 0.3, 'sawtooth', 0.1), 200);
    setTimeout(() => playTone(100, 0.5, 'sawtooth', 0.1), 400);
  }
  function sfxWave() {
    for (let i = 0; i < 4; i++) setTimeout(() => playTone(400 + i * 200, 0.12, 'square', 0.06), i * 80);
  }

  // Input
  const keys = {};
  window.addEventListener('keydown', e => {
    keys[e.key] = true;
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();
    if (state === 'title' || state === 'gameover') { ensureAudio(); startGame(); }
    if (state === 'playing' && (e.key === ' ' || e.key === 'ArrowUp')) shoot();
  });
  window.addEventListener('keyup', e => { keys[e.key] = false; });

  const touch = { left: false, right: false, fire: false };
  function bindTouch(el, dir) {
    if (!el) return;
    const on = e => { e.preventDefault(); touch[dir] = true; if (dir === 'fire' && state === 'playing') shoot(); };
    const off = e => { e.preventDefault(); touch[dir] = false; };
    el.addEventListener('touchstart', on, { passive: false });
    el.addEventListener('touchend', off, { passive: false });
    el.addEventListener('touchcancel', off, { passive: false });
    el.addEventListener('mousedown', on);
    el.addEventListener('mouseup', off);
    el.addEventListener('mouseleave', off);
  }
  bindTouch(mobLeft, 'left');
  bindTouch(mobRight, 'right');
  bindTouch(mobFire, 'fire');

  function mLeft() { return keys['ArrowLeft'] || keys['a'] || keys['A'] || touch.left; }
  function mRight() { return keys['ArrowRight'] || keys['d'] || keys['D'] || touch.right; }

  function shoot() {
    if (shootCooldown > 0 || bullets.length >= MAX_BULLETS) return;
    bullets.push({ x: player.x + PW / 2 - 1, y: PLAYER_Y - 2 });
    shootCooldown = SHOOT_COOLDOWN;
    sfxShoot();
  }

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
    if (muteBtn) muteBtn.textContent = audioOn ? '🔊 Sound' : '🔇 Muted';
    if (mobMute) mobMute.textContent = audioOn ? '🔊' : '🔇';
  }
  if (muteBtn) muteBtn.onclick = toggleMute;
  if (mobMute) mobMute.addEventListener('touchstart', e => { e.preventDefault(); toggleMute(); }, { passive: false });
  if (mobMute) mobMute.onclick = toggleMute;

  if (fsBtn) fsBtn.onclick = () => { document.body.classList.toggle('fullscreen'); resize(); };

  // Resize
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

  // Spawn enemy
  function spawnEnemy() {
    const dir = Math.random() < 0.5 ? 1 : -1;
    const x = dir === 1 ? -20 : VW + 20;
    const y = 20 + Math.random() * 40;
    enemies.push({ x, y, vx: dir * enemySpeed, bombTimer: 30 + Math.floor(Math.random() * bombInterval) });
  }

  // Update
  function update() {
    if (state !== 'playing') return;
    frameCount++;
    if (shootCooldown > 0) shootCooldown--;

    // Player movement
    if (mLeft()) player.x -= PLAYER_SPEED;
    if (mRight()) player.x += PLAYER_SPEED;
    player.x = Math.max(0, Math.min(VW - PW, player.x));

    // Bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
      bullets[i].y -= BULLET_SPEED;
      if (bullets[i].y < -5) { bullets.splice(i, 1); continue; }
    }

    // Spawn enemies
    enemySpawnTimer++;
    if (enemySpawnTimer >= enemySpawnInterval) {
      enemySpawnTimer = 0;
      spawnEnemy();
    }

    // Update enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      e.x += e.vx;
      e.bombTimer--;

      // Drop bomb
      if (e.bombTimer <= 0 && e.x > 20 && e.x < VW - 20) {
        bombs.push({ x: e.x + 8, y: e.y + 10, vy: 1.2 + wave * 0.15 });
        e.bombTimer = bombInterval + Math.floor(Math.random() * 40);
      }

      // Remove if off screen
      if (e.x < -40 || e.x > VW + 40) { enemies.splice(i, 1); continue; }

      // Bullet-enemy collision
      for (let j = bullets.length - 1; j >= 0; j--) {
        const b = bullets[j];
        if (b.x > e.x && b.x < e.x + 18 && b.y > e.y && b.y < e.y + 10) {
          explosions.push({ x: e.x + 9, y: e.y + 5, t: 15 });
          enemies.splice(i, 1);
          bullets.splice(j, 1);
          score += 100;
          sfxHitEnemy();
          break;
        }
      }
    }

    // Update bombs
    for (let i = bombs.length - 1; i >= 0; i--) {
      const bm = bombs[i];
      bm.vy += 0.02; // slight acceleration
      bm.y += bm.vy;

      // Bullet-bomb collision
      let hit = false;
      for (let j = bullets.length - 1; j >= 0; j--) {
        const b = bullets[j];
        if (Math.abs(b.x - bm.x) < 6 && Math.abs(b.y - bm.y) < 6) {
          explosions.push({ x: bm.x, y: bm.y, t: 10 });
          bombs.splice(i, 1);
          bullets.splice(j, 1);
          score += 50;
          sfxHitBomb();
          hit = true;
          break;
        }
      }
      if (hit) continue;

      // Bomb hits building
      if (bm.y >= GROUND_Y - BUILDING_H) {
        for (const bld of buildings) {
          if (bm.x >= bld.x && bm.x <= bld.x + bld.w && bld.hp > 0) {
            bld.hp--;
            explosions.push({ x: bm.x, y: GROUND_Y - BUILDING_H, t: 12 });
            bombs.splice(i, 1);
            sfxBuildingHit();
            hit = true;
            break;
          }
        }
        if (!hit && bm.y >= GROUND_Y) {
          // Missed — hits ground
          explosions.push({ x: bm.x, y: GROUND_Y - 2, t: 8 });
          bombs.splice(i, 1);
        }
      }
    }

    // Update explosions
    for (let i = explosions.length - 1; i >= 0; i--) {
      explosions[i].t--;
      if (explosions[i].t <= 0) explosions.splice(i, 1);
    }

    // Check game over
    if (buildings[0].hp <= 0 && buildings[1].hp <= 0) {
      state = 'gameover';
      sfxGameOver();
      return;
    }

    // Wave progression — every 600 frames (~10s at 60fps)
    if (frameCount % 600 === 0) {
      wave++;
      setupWave();
      sfxWave();
    }
  }

  // Draw
  function draw() {
    g.fillStyle = C.bg;
    g.fillRect(0, 0, VW, VH);

    // Stars
    for (const s of stars) {
      s.twinkle += 0.03;
      const a = 0.3 + Math.sin(s.twinkle) * 0.2;
      g.fillStyle = `rgba(255,255,255,${a})`;
      g.fillRect(s.x, s.y, s.s, s.s);
    }

    // Ground
    g.fillStyle = C.ground;
    g.fillRect(0, GROUND_Y, VW, VH - GROUND_Y);
    g.fillStyle = '#00f5d4';
    g.fillRect(0, GROUND_Y, VW, 1);

    // Buildings
    for (const bld of buildings) {
      const hpRatio = bld.hp / bld.maxHp;
      if (bld.hp <= 0) {
        // Rubble
        g.fillStyle = '#333';
        g.fillRect(bld.x, GROUND_Y - 8, bld.w, 8);
        continue;
      }
      const h = BUILDING_H * hpRatio;
      const by = GROUND_Y - h;

      // Building body
      g.shadowColor = hpRatio > 0.4 ? C.building : C.buildingDmg;
      g.shadowBlur = 6;
      g.fillStyle = C.buildingDark;
      g.fillRect(bld.x, by, bld.w, h);
      g.shadowBlur = 0;

      // Windows
      const winColor = hpRatio > 0.4 ? C.building : C.buildingDmg;
      g.fillStyle = winColor;
      for (let wy = by + 6; wy < GROUND_Y - 8; wy += 12) {
        for (let wx = bld.x + 6; wx < bld.x + bld.w - 6; wx += 14) {
          if (Math.random() > 0.15 || frameCount % 60 < 50) {
            g.fillRect(wx, wy, 6, 6);
          }
        }
      }

      // Outline
      g.strokeStyle = winColor;
      g.lineWidth = 1;
      g.strokeRect(bld.x, by, bld.w, h);

      // HP bar
      g.fillStyle = 'rgba(0,0,0,0.5)';
      g.fillRect(bld.x, by - 6, bld.w, 4);
      g.fillStyle = hpRatio > 0.4 ? '#00f5d4' : '#ff3333';
      g.fillRect(bld.x, by - 6, bld.w * hpRatio, 4);
    }

    // Player ship
    drawPlayer();

    // Bullets
    g.shadowColor = C.bulletGlow;
    g.shadowBlur = 4;
    g.fillStyle = C.bullet;
    for (const b of bullets) {
      g.fillRect(b.x, b.y, 2, 6);
    }
    g.shadowBlur = 0;

    // Enemies
    for (const e of enemies) {
      drawEnemy(e);
    }

    // Bombs
    g.shadowColor = C.bombGlow;
    g.shadowBlur = 4;
    for (const bm of bombs) {
      g.fillStyle = C.bomb;
      g.fillRect(bm.x - 2, bm.y - 2, 4, 5);
      // Trail
      g.fillStyle = 'rgba(255,51,51,0.3)';
      g.fillRect(bm.x - 1, bm.y - 6, 2, 4);
    }
    g.shadowBlur = 0;

    // Explosions
    for (const ex of explosions) {
      const r = (15 - ex.t) * 1.5;
      const a = ex.t / 15;
      g.shadowColor = C.explosion;
      g.shadowBlur = 8;
      g.fillStyle = `rgba(255,170,0,${a})`;
      g.beginPath();
      g.arc(ex.x, ex.y, r, 0, Math.PI * 2);
      g.fill();
      g.shadowBlur = 0;
    }

    // HUD on canvas
    drawHUD();

    if (state === 'title') drawTitle();
    if (state === 'gameover') drawGameOver();
  }

  function drawPlayer() {
    const px = player.x;
    const py = PLAYER_Y;
    g.shadowColor = C.playerGlow;
    g.shadowBlur = 6;
    g.fillStyle = C.player;
    // Ship body — triangle-ish
    g.beginPath();
    g.moveTo(px + PW / 2, py - 4);
    g.lineTo(px + PW, py + PH);
    g.lineTo(px, py + PH);
    g.closePath();
    g.fill();
    // Cockpit
    g.fillStyle = '#003344';
    g.fillRect(px + PW / 2 - 2, py + 1, 4, 3);
    // Wings
    g.fillStyle = C.player;
    g.fillRect(px - 3, py + PH - 3, 4, 3);
    g.fillRect(px + PW - 1, py + PH - 3, 4, 3);
    g.shadowBlur = 0;
  }

  function drawEnemy(e) {
    g.shadowColor = C.enemyGlow;
    g.shadowBlur = 6;
    g.fillStyle = C.enemy;
    // Inverted triangle ship
    g.beginPath();
    g.moveTo(e.x, e.y);
    g.lineTo(e.x + 18, e.y);
    g.lineTo(e.x + 9, e.y + 10);
    g.closePath();
    g.fill();
    // Detail
    g.fillStyle = '#882200';
    g.fillRect(e.x + 7, e.y + 2, 4, 4);
    g.shadowBlur = 0;
  }

  function drawHUD() {
    g.font = '8px monospace';
    g.textAlign = 'left';
    g.fillStyle = C.hud;
    g.fillText('SCORE: ' + score, 4, 10);
    g.textAlign = 'right';
    g.fillText('WAVE ' + wave, VW - 4, 10);
    // Building HP icons
    g.textAlign = 'left';
    g.fillStyle = buildings[0].hp > 0 ? C.building : '#333';
    g.fillText('B1:' + Math.max(0, buildings[0].hp), 4, 20);
    g.fillStyle = buildings[1].hp > 0 ? C.building : '#333';
    g.fillText('B2:' + Math.max(0, buildings[1].hp), 50, 20);

    if (scoreEl) scoreEl.textContent = score;
    if (waveEl) waveEl.textContent = wave;
  }

  function drawTitle() {
    g.fillStyle = 'rgba(0,0,0,0.75)';
    g.fillRect(0, 0, VW, VH);
    g.shadowColor = '#ff6600';
    g.shadowBlur = 12;
    g.fillStyle = C.enemy;
    g.font = '16px "Press Start 2P", monospace';
    g.textAlign = 'center';
    g.fillText('AIR RAID', VW / 2, VH / 2 - 25);
    g.shadowBlur = 0;
    g.font = '7px monospace';
    g.fillStyle = '#9AA0B4';
    g.fillText('Press any key or Start', VW / 2, VH / 2 + 10);
    g.fillText('← → to move, Space/↑ to shoot', VW / 2, VH / 2 + 25);
    g.fillText('Protect the buildings!', VW / 2, VH / 2 + 37);
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
    g.fillText('Score: ' + score + '  Wave: ' + wave, VW / 2, VH / 2 + 10);
    g.font = '7px monospace';
    g.fillStyle = '#9AA0B4';
    g.fillText('Press any key to restart', VW / 2, VH / 2 + 30);
  }

  // Main loop
  function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
  }
  loop();
})();
