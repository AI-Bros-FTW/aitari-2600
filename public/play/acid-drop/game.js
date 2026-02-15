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

  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  const g = canvas.getContext('2d');

  const VW = 320;
  const VH = 200;

  // Atari palette
  const COL_BG = '#0a0018';
  const COL_BEAKER = '#00f5d4';
  const COL_BEAKER_INNER = '#0a2a28';
  const COL_TEXT = '#00f5d4';
  const COL_HUD = '#ffcc00';

  // Drop colors (good drops)
  const DROP_COLORS = ['#ff4466', '#44ff66', '#4488ff', '#ffdd44', '#ff88ff', '#44ffff'];
  const COL_TOXIC = '#88ff00';

  let state = 'title'; // title | playing | gameover
  let score = 0;
  let lives = 3;
  let level = 1;
  let dropsCollected = 0;
  let dropsNeeded = 12;

  // Player beaker
  const BEAKER_W = 28;
  const BEAKER_H = 22;
  let bx = VW / 2 - BEAKER_W / 2;
  const BY = VH - 30;
  const BEAKER_SPEED = 2.5;

  // Fill level in beaker (visual)
  let fillLevel = 0;

  // Drops
  let drops = [];
  let dropTimer = 0;
  let dropInterval = 50; // frames between drops
  let dropSpeed = 1.2;

  // Particles
  let particles = [];

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
    keys[e.key] = true;
    if (['ArrowLeft','ArrowRight','a','d',' '].includes(e.key)) e.preventDefault();
    if (state === 'title' && (e.key === 'Enter' || e.key === ' ')) startGame();
    if (state === 'gameover' && (e.key === 'Enter' || e.key === ' ')) startGame();
  });
  document.addEventListener('keyup', (e) => { keys[e.key] = false; });

  // Mobile buttons
  const mobileKeys = {};
  function bindMob(el, key) {
    if (!el) return;
    el.addEventListener('pointerdown', (e) => { e.preventDefault(); mobileKeys[key] = true; });
    el.addEventListener('pointerup', (e) => { e.preventDefault(); mobileKeys[key] = false; });
    el.addEventListener('pointerleave', (e) => { mobileKeys[key] = false; });
    el.addEventListener('pointercancel', (e) => { mobileKeys[key] = false; });
  }
  bindMob(mobLeft, 'ArrowLeft');
  bindMob(mobRight, 'ArrowRight');

  function mobStartHandler(e) { e.preventDefault(); if (state !== 'playing') startGame(); }
  if (mobStart) mobStart.addEventListener('pointerdown', mobStartHandler);
  if (startBtn) startBtn.addEventListener('click', () => { if (state !== 'playing') startGame(); });

  // Fullscreen
  if (fsBtn) {
    fsBtn.addEventListener('click', () => {
      const isFS = document.body.classList.contains('fullscreen');
      if (isFS) {
        document.body.classList.remove('fullscreen');
        try { document.exitFullscreen?.(); } catch {}
      } else {
        document.body.classList.add('fullscreen');
        try {
          const el = document.documentElement;
          (el.requestFullscreen || el.webkitRequestFullscreen)?.call(el);
        } catch {}
      }
      resize();
    });
  }
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement) document.body.classList.remove('fullscreen');
    resize();
  });

  function pressed(k) { return keys[k] || mobileKeys[k]; }

  function startGame() {
    state = 'playing';
    score = 0;
    lives = 3;
    level = 1;
    dropsCollected = 0;
    dropsNeeded = 12;
    fillLevel = 0;
    bx = VW / 2 - BEAKER_W / 2;
    drops = [];
    particles = [];
    dropTimer = 0;
    dropInterval = 50;
    dropSpeed = 1.2;
    updateUI();
    beep(660, 0.06);
  }

  function nextLevel() {
    level++;
    dropsCollected = 0;
    dropsNeeded = 12 + level * 2;
    fillLevel = 0;
    dropInterval = Math.max(15, 50 - level * 4);
    dropSpeed = Math.min(3.0, 1.2 + level * 0.2);
    drops = [];
    updateUI();
    beep(880, 0.1);
    setTimeout(() => beep(1100, 0.1), 120);
  }

  function spawnDrop() {
    const isToxic = Math.random() < Math.min(0.25, 0.1 + level * 0.02);
    drops.push({
      x: 8 + Math.random() * (VW - 16),
      y: -8,
      color: isToxic ? COL_TOXIC : DROP_COLORS[Math.floor(Math.random() * DROP_COLORS.length)],
      toxic: isToxic,
      speed: dropSpeed * (0.8 + Math.random() * 0.4),
      size: isToxic ? 5 : 4,
      wobble: Math.random() * Math.PI * 2
    });
  }

  function spawnParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 3,
        vy: -Math.random() * 2 - 1,
        life: 15 + Math.random() * 10,
        color,
        size: 1 + Math.random() * 2
      });
    }
  }

  function update() {
    if (state !== 'playing') return;

    // Move beaker
    if (pressed('ArrowLeft') || pressed('a')) bx -= BEAKER_SPEED;
    if (pressed('ArrowRight') || pressed('d')) bx += BEAKER_SPEED;
    if (bx < 2) bx = 2;
    if (bx > VW - BEAKER_W - 2) bx = VW - BEAKER_W - 2;

    // Spawn drops
    dropTimer++;
    if (dropTimer >= dropInterval) {
      dropTimer = 0;
      spawnDrop();
    }

    // Update drops
    for (let i = drops.length - 1; i >= 0; i--) {
      const d = drops[i];
      d.y += d.speed;
      d.wobble += 0.08;
      d.x += Math.sin(d.wobble) * 0.3;

      // Check catch
      if (d.y + d.size >= BY && d.y <= BY + BEAKER_H &&
          d.x >= bx - 2 && d.x <= bx + BEAKER_W + 2) {
        if (d.toxic) {
          // Hit by toxic drop
          lives--;
          beep(120, 0.15, 0.05);
          spawnParticles(d.x, BY, COL_TOXIC, 8);
          fillLevel = Math.max(0, fillLevel - 0.1);
          drops.splice(i, 1);
          updateUI();
          if (lives <= 0) {
            state = 'gameover';
            beep(80, 0.3, 0.06);
          }
          continue;
        }
        // Caught good drop
        score += 10 * level;
        dropsCollected++;
        fillLevel = dropsCollected / dropsNeeded;
        beep(440 + dropsCollected * 20, 0.05);
        spawnParticles(d.x, BY, d.color, 5);
        drops.splice(i, 1);
        updateUI();
        if (dropsCollected >= dropsNeeded) {
          score += 50 * level; // level bonus
          nextLevel();
        }
        continue;
      }

      // Missed drop (off screen)
      if (d.y > VH + 10) {
        if (!d.toxic) {
          // Missed a good drop — lose a life
          lives--;
          beep(150, 0.1, 0.04);
          updateUI();
          if (lives <= 0) {
            state = 'gameover';
            beep(80, 0.3, 0.06);
          }
        }
        drops.splice(i, 1);
      }
    }

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.12;
      p.life--;
      if (p.life <= 0) particles.splice(i, 1);
    }
  }

  function draw() {
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, canvas.width, canvas.height);

    const sx = canvas.width / VW;
    const sy = canvas.height / VH;
    const s = Math.min(sx, sy);
    const ox = (canvas.width - VW * s) / 2;
    const oy = (canvas.height - VH * s) / 2;
    g.translate(ox, oy);
    g.scale(s, s);

    // Background
    g.fillStyle = COL_BG;
    g.fillRect(0, 0, VW, VH);

    // Subtle grid lines
    g.strokeStyle = 'rgba(0,245,212,0.03)';
    g.lineWidth = 0.5;
    for (let x = 0; x < VW; x += 20) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, VH); g.stroke(); }
    for (let y = 0; y < VH; y += 20) { g.beginPath(); g.moveTo(0, y); g.lineTo(VW, y); g.stroke(); }

    if (state === 'title') {
      g.fillStyle = COL_TEXT;
      g.font = '16px "Press Start 2P", monospace';
      g.textAlign = 'center';
      g.fillText('ACID DROP', VW / 2, 60);
      g.font = '8px "Press Start 2P", monospace';
      g.fillStyle = '#9AA0B4';
      g.fillText('Catch the drops!', VW / 2, 90);
      g.fillText('Avoid toxic drops!', VW / 2, 105);

      // Animated demo drops
      const t = Date.now() / 1000;
      for (let i = 0; i < 5; i++) {
        const dx = 60 + i * 50;
        const dy = 130 + Math.sin(t * 2 + i) * 12;
        g.fillStyle = DROP_COLORS[i % DROP_COLORS.length];
        drawDrop(dx, dy, 5);
      }

      g.fillStyle = COL_TEXT;
      g.font = '7px "Press Start 2P", monospace';
      const blink = Math.sin(t * 4) > 0;
      if (blink) g.fillText('PRESS START', VW / 2, 175);
      g.restore();
      return;
    }

    // Draw drops
    for (const d of drops) {
      g.fillStyle = d.color;
      if (d.toxic) {
        // Toxic drop: skull-ish shape
        drawToxicDrop(d.x, d.y, d.size);
      } else {
        drawDrop(d.x, d.y, d.size);
      }
    }

    // Draw beaker
    drawBeaker(bx, BY, BEAKER_W, BEAKER_H);

    // Draw particles
    for (const p of particles) {
      g.globalAlpha = p.life / 25;
      g.fillStyle = p.color;
      g.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    g.globalAlpha = 1;

    // In-canvas HUD (for embed/fullscreen)
    if (document.body.classList.contains('embed') || document.body.classList.contains('fullscreen')) {
      g.fillStyle = COL_HUD;
      g.font = '8px "Press Start 2P", monospace';
      g.textAlign = 'left';
      g.fillText('SCORE ' + score, 6, 12);
      g.textAlign = 'center';
      g.fillText('LV ' + level, VW / 2, 12);
      g.textAlign = 'right';
      // Lives as hearts
      let livesStr = '';
      for (let i = 0; i < lives; i++) livesStr += '♥';
      g.fillStyle = '#ff4466';
      g.fillText(livesStr, VW - 6, 12);

      // Progress bar
      g.fillStyle = 'rgba(255,255,255,0.12)';
      g.fillRect(6, 16, VW - 12, 3);
      g.fillStyle = COL_TEXT;
      g.fillRect(6, 16, (VW - 12) * Math.min(1, fillLevel), 3);
    }

    // Game over overlay
    if (state === 'gameover') {
      g.fillStyle = 'rgba(0,0,0,0.65)';
      g.fillRect(0, 0, VW, VH);
      g.fillStyle = '#ff4466';
      g.font = '14px "Press Start 2P", monospace';
      g.textAlign = 'center';
      g.fillText('GAME OVER', VW / 2, 80);
      g.fillStyle = COL_HUD;
      g.font = '9px "Press Start 2P", monospace';
      g.fillText('SCORE: ' + score, VW / 2, 105);
      g.fillStyle = COL_TEXT;
      g.font = '7px "Press Start 2P", monospace';
      const blink = Math.sin(Date.now() / 250) > 0;
      if (blink) g.fillText('PRESS START', VW / 2, 135);
    }

    g.restore();
  }

  function drawDrop(x, y, size) {
    // Teardrop shape
    g.beginPath();
    g.moveTo(x, y - size * 1.2);
    g.quadraticCurveTo(x + size, y, x, y + size);
    g.quadraticCurveTo(x - size, y, x, y - size * 1.2);
    g.fill();
  }

  function drawToxicDrop(x, y, size) {
    // Spiky toxic drop
    g.save();
    g.fillStyle = COL_TOXIC;
    g.beginPath();
    const spikes = 6;
    for (let i = 0; i < spikes * 2; i++) {
      const a = (i * Math.PI) / spikes - Math.PI / 2;
      const r = i % 2 === 0 ? size * 1.3 : size * 0.6;
      const px = x + Math.cos(a) * r;
      const py = y + Math.sin(a) * r;
      if (i === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    }
    g.closePath();
    g.fill();
    // Inner dot
    g.fillStyle = '#223300';
    g.fillRect(x - 1, y - 1, 2, 2);
    g.restore();
  }

  function drawBeaker(x, y, w, h) {
    // Beaker outline
    g.strokeStyle = COL_BEAKER;
    g.lineWidth = 2;
    g.beginPath();
    // U-shape: wider at top, slightly narrower at bottom
    const inset = 3;
    g.moveTo(x, y);
    g.lineTo(x, y + h);
    g.lineTo(x + w, y + h);
    g.lineTo(x + w, y);
    g.stroke();

    // Fill with liquid based on fillLevel
    if (fillLevel > 0) {
      const fh = h * Math.min(1, fillLevel);
      // Gradient of collected colors
      const grad = g.createLinearGradient(x, y + h - fh, x, y + h);
      grad.addColorStop(0, 'rgba(0,245,212,0.4)');
      grad.addColorStop(1, 'rgba(0,245,212,0.7)');
      g.fillStyle = grad;
      g.fillRect(x + 2, y + h - fh, w - 4, fh - 1);
    }

    // Beaker rim / lip
    g.fillStyle = COL_BEAKER;
    g.fillRect(x - 3, y, 3, 2);
    g.fillRect(x + w, y, 3, 2);

    // Measurement lines
    g.strokeStyle = 'rgba(0,245,212,0.25)';
    g.lineWidth = 0.5;
    for (let i = 1; i <= 3; i++) {
      const ly = y + h - (h * i) / 4;
      g.beginPath();
      g.moveTo(x + 2, ly);
      g.lineTo(x + 8, ly);
      g.stroke();
    }
  }

  function resize() {
    const stage = canvas.parentElement;
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    canvas.width = w * DPR;
    canvas.height = h * DPR;
  }

  function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
  }

  window.addEventListener('resize', resize);
  resize();
  loop();
})();
