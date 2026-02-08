(() => {
  const canvas = document.getElementById('c');
  const scoreEl = document.getElementById('score');
  const livesEl = document.getElementById('lives');
  const statusEl = document.getElementById('status');
  const startBtn = document.getElementById('start');

  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  const low = document.createElement('canvas');
  const ctx = low.getContext('2d');
  const g = canvas.getContext('2d');

  const W = 320;
  const H = 180;
  low.width = W;
  low.height = H;

  const keys = new Set();
  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    keys.add(k);
    if (['arrowleft','arrowright','arrowup','arrowdown',' '].includes(k)) e.preventDefault();
  }, { passive: false });
  window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));

  // Mobile controls
  const mobile = { axisX: 0, axisY: 0, fire: false };
  const joy = document.getElementById('joy');
  const joyThumb = document.getElementById('joyThumb');
  const mobStart = document.getElementById('mobStart');
  const mobMute = document.getElementById('mobMute');
  const mobFire = document.getElementById('mobFire');

  (function bindJoystick(){
    if (!joy || !joyThumb) return;
    let active = false;
    let pid = null;
    const radius = 60;

    function setAxis(clientX, clientY){
      const r = joy.getBoundingClientRect();
      const cx = r.left + r.width/2;
      const cy = r.top + r.height/2;
      let dx = clientX - cx;
      let dy = clientY - cy;
      const dist = Math.hypot(dx, dy) || 1;
      const k = Math.min(dist, radius) / dist;
      dx *= k; dy *= k;
      joyThumb.style.transform = `translate(${dx}px, ${dy}px)`;
      mobile.axisX = Math.max(-1, Math.min(1, dx / radius));
      mobile.axisY = Math.max(-1, Math.min(1, dy / radius));
    }

    function reset(){
      mobile.axisX = 0;
      mobile.axisY = 0;
      joyThumb.style.transform = 'translate(0px, 0px)';
    }

    joy.addEventListener('pointerdown', (e) => { e.preventDefault(); active = true; pid = e.pointerId; joy.setPointerCapture(pid); setAxis(e.clientX, e.clientY); });
    joy.addEventListener('pointermove', (e) => { if (!active || e.pointerId !== pid) return; e.preventDefault(); setAxis(e.clientX, e.clientY); });
    const end = (e) => { if (e.pointerId !== pid) return; e.preventDefault(); active = false; pid = null; reset(); };
    joy.addEventListener('pointerup', end);
    joy.addEventListener('pointercancel', end);
  })();

  if (mobStart) { mobStart.addEventListener('pointerdown', (e) => { e.preventDefault(); keys.add('startbtn'); }); mobStart.addEventListener('pointerup', (e) => { e.preventDefault(); keys.delete('startbtn'); }); }
  if (mobMute) mobMute.addEventListener('click', (e) => { e.preventDefault(); keys.add('m'); });
  if (mobFire) { mobFire.addEventListener('pointerdown', (e) => { e.preventDefault(); mobile.fire = true; }); mobFire.addEventListener('pointerup', (e) => { e.preventDefault(); mobile.fire = false; }); mobFire.addEventListener('pointercancel', (e) => { mobile.fire = false; }); }

  // Sound
  let audioOn = true;
  let ac;
  function beep(freq, dur=0.05, gain=0.04) {
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

  function noise(dur=0.1, gain=0.06) {
    if (!audioOn) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      const buf = ac.createBuffer(1, ac.sampleRate * dur, ac.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * gain;
      const src = ac.createBufferSource();
      src.buffer = buf;
      src.connect(ac.destination);
      src.start();
    } catch {}
  }

  // State
  const TWO_PI = Math.PI * 2;
  const ship = { x: W/2, y: H/2, angle: -Math.PI/2, vx: 0, vy: 0, thrust: false, dead: false, respawnAt: 0, invincibleUntil: 0, flicker: 0 };
  const bullets = [];
  const asteroids = [];
  const particles = [];
  let score = 0;
  let lives = 3;
  let wave = 0;
  let running = false;
  let gameOver = false;
  let shake = 0;
  let fireCD = 0;

  function setStatus(txt) { if (statusEl) statusEl.textContent = txt; }
  function setStartVisible(v) { if (startBtn) startBtn.style.display = v ? '' : 'none'; if (mobStart) mobStart.style.display = v ? '' : 'none'; }

  function wrap(obj) {
    if (obj.x < -10) obj.x += W + 20;
    if (obj.x > W + 10) obj.x -= W + 20;
    if (obj.y < -10) obj.y += H + 20;
    if (obj.y > H + 10) obj.y -= H + 20;
  }

  function spawnAsteroid(x, y, size) {
    const angle = Math.random() * TWO_PI;
    const speed = 15 + Math.random() * 25 + (3 - size) * 10;
    // Generate random shape vertices
    const verts = [];
    const numVerts = 7 + Math.floor(Math.random() * 5);
    for (let i = 0; i < numVerts; i++) {
      const a = (i / numVerts) * TWO_PI;
      const r = 0.7 + Math.random() * 0.3;
      verts.push({ a, r });
    }
    asteroids.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size, // 3=large, 2=medium, 1=small
      radius: size === 3 ? 18 : size === 2 ? 10 : 5,
      spin: (Math.random() - 0.5) * 2,
      rot: Math.random() * TWO_PI,
      verts,
    });
  }

  function spawnWave() {
    wave++;
    const count = 2 + wave;
    for (let i = 0; i < count; i++) {
      // Spawn away from ship
      let x, y;
      do {
        x = Math.random() * W;
        y = Math.random() * H;
      } while (Math.hypot(x - ship.x, y - ship.y) < 60);
      spawnAsteroid(x, y, 3);
    }
  }

  function addParticles(x, y, count, color) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * TWO_PI;
      const sp = 20 + Math.random() * 60;
      particles.push({ x, y, vx: Math.cos(a)*sp, vy: Math.sin(a)*sp, life: 0.3 + Math.random()*0.4, maxLife: 0.5, color });
    }
  }

  function resetShip() {
    ship.x = W/2;
    ship.y = H/2;
    ship.vx = 0;
    ship.vy = 0;
    ship.angle = -Math.PI/2;
    ship.thrust = false;
    ship.dead = false;
    ship.invincibleUntil = performance.now() + 2000;
    ship.flicker = 0;
  }

  function newGame() {
    score = 0;
    lives = 3;
    wave = 0;
    gameOver = false;
    running = false;
    bullets.length = 0;
    asteroids.length = 0;
    particles.length = 0;
    if (scoreEl) scoreEl.textContent = '0';
    if (livesEl) livesEl.textContent = '3';
    resetShip();
    setStatus('Press Start');
    setStartVisible(true);
  }

  function startGame() {
    if (gameOver) { newGame(); return; }
    if (running) return;
    running = true;
    setStartVisible(false);
    setStatus('Go!');
    spawnWave();
    beep(720, 0.05, 0.05);
  }

  if (startBtn) startBtn.addEventListener('click', (e) => { e.preventDefault(); startGame(); });

  function step(dt) {
    // Mute toggle
    if (keys.has('m')) { keys.delete('m'); audioOn = !audioOn; beep(audioOn?880:220,0.04,0.05); }

    // Start
    if (keys.has(' ') && !running) { keys.delete(' '); startGame(); }
    if (keys.has('startbtn') && !running) { keys.delete('startbtn'); startGame(); }

    if (!running) return;

    const now = performance.now();

    // Ship respawn
    if (ship.dead) {
      if (now >= ship.respawnAt) {
        resetShip();
      }
      // Update particles while dead
      updateParticles(dt);
      // Update asteroids while dead
      for (const a of asteroids) { a.x += a.vx * dt; a.y += a.vy * dt; a.rot += a.spin * dt; wrap(a); }
      return;
    }

    // Rotation
    let rotDir = 0;
    if (keys.has('arrowleft') || keys.has('a')) rotDir -= 1;
    if (keys.has('arrowright') || keys.has('d')) rotDir += 1;
    if (Math.abs(mobile.axisX) > 0.15) rotDir += mobile.axisX;
    ship.angle += rotDir * 4.0 * dt;

    // Thrust
    ship.thrust = keys.has('arrowup') || keys.has('w') || mobile.axisY < -0.3;
    if (ship.thrust) {
      const thrust = 120;
      ship.vx += Math.cos(ship.angle) * thrust * dt;
      ship.vy += Math.sin(ship.angle) * thrust * dt;
      // Thrust particles
      if (Math.random() < 0.5) {
        const bx = ship.x - Math.cos(ship.angle) * 8;
        const by = ship.y - Math.sin(ship.angle) * 8;
        particles.push({ x: bx, y: by, vx: -Math.cos(ship.angle)*30 + (Math.random()-0.5)*20, vy: -Math.sin(ship.angle)*30 + (Math.random()-0.5)*20, life: 0.2+Math.random()*0.2, maxLife: 0.3, color: '#ff8844' });
      }
    }

    // Friction
    ship.vx *= (1 - 0.4 * dt);
    ship.vy *= (1 - 0.4 * dt);

    // Speed cap
    const spd = Math.hypot(ship.vx, ship.vy);
    if (spd > 150) { ship.vx *= 150/spd; ship.vy *= 150/spd; }

    ship.x += ship.vx * dt;
    ship.y += ship.vy * dt;
    wrap(ship);

    // Firing
    fireCD = Math.max(0, fireCD - dt);
    const wantFire = keys.has(' ') || mobile.fire;
    if (wantFire && fireCD <= 0 && bullets.length < 6) {
      const bspeed = 200;
      bullets.push({
        x: ship.x + Math.cos(ship.angle) * 8,
        y: ship.y + Math.sin(ship.angle) * 8,
        vx: Math.cos(ship.angle) * bspeed + ship.vx * 0.3,
        vy: Math.sin(ship.angle) * bspeed + ship.vy * 0.3,
        life: 1.2,
      });
      fireCD = 0.15;
      beep(1200, 0.03, 0.03);
    }

    // Update bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      wrap(b);
      if (b.life <= 0) { bullets.splice(i, 1); }
    }

    // Update asteroids
    for (const a of asteroids) {
      a.x += a.vx * dt;
      a.y += a.vy * dt;
      a.rot += a.spin * dt;
      wrap(a);
    }

    // Bullet-asteroid collisions
    for (let bi = bullets.length - 1; bi >= 0; bi--) {
      const b = bullets[bi];
      for (let ai = asteroids.length - 1; ai >= 0; ai--) {
        const a = asteroids[ai];
        if (Math.hypot(b.x - a.x, b.y - a.y) < a.radius + 2) {
          // Hit!
          bullets.splice(bi, 1);
          asteroids.splice(ai, 1);
          const pts = a.size === 3 ? 20 : a.size === 2 ? 50 : 100;
          score += pts;
          if (scoreEl) scoreEl.textContent = String(score);
          addParticles(a.x, a.y, a.size * 4, '#7cf0ff');
          shake = a.size * 2;
          noise(0.06, 0.04);

          // Split
          if (a.size > 1) {
            spawnAsteroid(a.x, a.y, a.size - 1);
            spawnAsteroid(a.x, a.y, a.size - 1);
          }
          break;
        }
      }
    }

    // Ship-asteroid collision
    if (now > ship.invincibleUntil) {
      for (let ai = asteroids.length - 1; ai >= 0; ai--) {
        const a = asteroids[ai];
        if (Math.hypot(ship.x - a.x, ship.y - a.y) < a.radius + 6) {
          // Ship destroyed
          lives--;
          if (livesEl) livesEl.textContent = String(lives);
          addParticles(ship.x, ship.y, 15, '#ff4d6d');
          shake = 8;
          noise(0.15, 0.08);
          ship.dead = true;

          if (lives <= 0) {
            running = false;
            gameOver = true;
            setStatus('Game over');
            setStartVisible(true);
          } else {
            ship.respawnAt = now + 1500;
            setStatus('Get ready');
          }
          break;
        }
      }
    }

    // Update particles
    updateParticles(dt);

    // Check wave clear
    if (asteroids.length === 0 && running && !ship.dead) {
      spawnWave();
      beep(440, 0.1, 0.04);
    }
  }

  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) particles.splice(i, 1);
    }
  }

  function drawShip() {
    if (ship.dead) return;
    const now = performance.now();
    if (now < ship.invincibleUntil) {
      ship.flicker++;
      if (ship.flicker % 6 < 3) return; // flicker effect
    }

    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.rotate(ship.angle);
    ctx.strokeStyle = '#e8eeff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(-6, -6);
    ctx.lineTo(-3, 0);
    ctx.lineTo(-6, 6);
    ctx.closePath();
    ctx.stroke();

    // Thrust flame
    if (ship.thrust) {
      ctx.strokeStyle = '#ff8844';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-3, -3);
      ctx.lineTo(-8 - Math.random()*4, 0);
      ctx.lineTo(-3, 3);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawAsteroid(a) {
    ctx.save();
    ctx.translate(a.x, a.y);
    ctx.rotate(a.rot);
    ctx.strokeStyle = '#7cf0ff';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let i = 0; i < a.verts.length; i++) {
      const v = a.verts[i];
      const px = Math.cos(v.a) * v.r * a.radius;
      const py = Math.sin(v.a) * v.r * a.radius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  function draw() {
    ctx.fillStyle = '#0b1020';
    ctx.fillRect(0, 0, W, H);

    // Scanlines
    ctx.fillStyle = 'rgba(255,255,255,0.02)';
    for (let y = 0; y < H; y += 2) ctx.fillRect(0, y, W, 1);

    // Stars (static seed)
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    for (let i = 0; i < 30; i++) {
      const sx = ((i * 137 + 51) % W);
      const sy = ((i * 97 + 23) % H);
      ctx.fillRect(sx, sy, 1, 1);
    }

    // Asteroids
    for (const a of asteroids) drawAsteroid(a);

    // Bullets
    ctx.fillStyle = '#ffffff';
    for (const b of bullets) ctx.fillRect(b.x - 1, b.y - 1, 2, 2);

    // Ship
    drawShip();

    // Particles
    for (const p of particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = alpha;
      ctx.fillRect(p.x - 1, p.y - 1, 2, 2);
    }
    ctx.globalAlpha = 1;

    // HUD in-canvas
    ctx.fillStyle = 'rgba(232,238,255,0.85)';
    ctx.font = '12px ui-monospace, Menlo, Monaco, Consolas, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('SCORE ' + String(score), 10, 8);
    ctx.textAlign = 'right';
    ctx.fillText('LIVES ' + String(lives), W - 10, 8);

    if (!running) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(232,238,255,0.75)';
      ctx.font = '10px ui-monospace, Menlo, Monaco, Consolas, monospace';
      const msg = gameOver ? 'GAME OVER — PRESS START' : 'PRESS START';
      ctx.fillText(msg, W/2, H/2);
    }

    // Blit
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.round(rect.width * DPR);
    canvas.height = Math.round(rect.height * DPR);
    g.imageSmoothingEnabled = false;

    const sx = (Math.random()-0.5) * shake;
    const sy = (Math.random()-0.5) * shake;
    shake = Math.max(0, shake - 0.8);

    g.clearRect(0, 0, canvas.width, canvas.height);
    g.drawImage(low, sx, sy, canvas.width, canvas.height);
  }

  let last = performance.now();
  function loop(now) {
    const dt = Math.min((now - last) / 1000, 0.033);
    last = now;
    step(dt);
    draw();
    requestAnimationFrame(loop);
  }

  newGame();
  requestAnimationFrame(loop);
})();
