(() => {
  const canvas = document.getElementById('c');
  const scoreEl = document.getElementById('score');
  const livesEl = document.getElementById('lives');
  const statusEl = document.getElementById('status');
  const startBtn = document.getElementById('start');

  const DPR = Math.min(window.devicePixelRatio || 1, 2);

  // Pixel buffer
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
    if (['arrowleft','arrowright',' '].includes(k)) e.preventDefault();
  }, { passive: false });
  window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));

  // Mobile (coarse pointer) controls: joystick + tap Start/Mute.
  const mobile = { axis: 0 };
  const joy = document.getElementById('joy');
  const joyThumb = document.getElementById('joyThumb');
  const mobStart = document.getElementById('mobStart');
  const mobMute = document.getElementById('mobMute');

  (function bindJoystick(){
    if (!joy || !joyThumb) return;
    let active = false;
    let pid = null;
    const radius = 60; // px travel limit

    function setAxisFromClient(clientX, clientY){
      const r = joy.getBoundingClientRect();
      const cx = r.left + r.width/2;
      const cy = r.top + r.height/2;
      let dx = clientX - cx;
      let dy = clientY - cy;
      const dist = Math.hypot(dx, dy) || 1;
      const k = Math.min(dist, radius) / dist;
      dx *= k; dy *= k;

      joyThumb.style.transform = `translate(${dx}px, ${dy}px)`;
      mobile.axis = Math.max(-1, Math.min(1, dx / radius));
    }

    function resetJoy(){
      mobile.axis = 0;
      joyThumb.style.transform = 'translate(0px, 0px)';
    }

    joy.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      active = true;
      pid = e.pointerId;
      joy.setPointerCapture(pid);
      setAxisFromClient(e.clientX, e.clientY);
    });
    joy.addEventListener('pointermove', (e) => {
      if (!active || e.pointerId !== pid) return;
      e.preventDefault();
      setAxisFromClient(e.clientX, e.clientY);
    });
    const end = (e) => {
      if (e.pointerId !== pid) return;
      e.preventDefault();
      active = false;
      pid = null;
      resetJoy();
    };
    joy.addEventListener('pointerup', end);
    joy.addEventListener('pointercancel', end);
  })();

  if (mobStart) mobStart.addEventListener('pointerdown', (e) => { e.preventDefault(); keys.add(' '); });
  if (mobStart) mobStart.addEventListener('pointerup', (e) => { e.preventDefault(); keys.delete(' '); });
  if (mobMute) mobMute.addEventListener('click', (e) => { e.preventDefault(); keys.add('m'); });

  // sound
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

  const state = {
    running: false,
    gameOver: false,
    win: false,
    autoServeAt: 0,
    score: 0,
    lives: 3,
    paddleX: W/2,
    paddleW: 44,
    ballX: W/2,
    ballY: H-42,
    ballVX: 0,
    ballVY: 0,
    stuck: true,
    shake: 0,
    uiStatus: 'PRESS START',
    bricks: [],
    bricksLeft: 0,
  };

  function setStatus(txt) {
    state.uiStatus = txt;
    if (statusEl) statusEl.textContent = txt
      .toLowerCase()
      .replace(/^\w/, c => c.toUpperCase());
  }

  function resetBricks() {
    const cols = 10;
    const rows = 5;
    const pad = 3;
    const bw = Math.floor((W - 2*pad - (cols-1)*pad) / cols);
    const bh = 10;
    const ox = Math.floor((W - (cols*bw + (cols-1)*pad)) / 2);
    const oy = 20;
    const colors = ['#7cf0ff','#00f5d4','#e8eeff','#ff7cf0','#ffd27c'];
    state.bricks = [];
    state.bricksLeft = 0;
    for (let r=0; r<rows; r++) {
      for (let c=0; c<cols; c++) {
        state.bricks.push({
          x: ox + c*(bw+pad),
          y: oy + r*(bh+pad),
          w: bw,
          h: bh,
          alive: true,
          col: colors[r % colors.length],
        });
        state.bricksLeft++;
      }
    }
  }

  function setStartVisible(visible) {
    if (startBtn) startBtn.style.display = visible ? '' : 'none';
    if (mobStart) mobStart.style.display = visible ? '' : 'none';
  }

  function resetBallAndPaddle() {
    state.paddleX = W/2;
    state.ballX = state.paddleX;
    state.ballY = H-34;
    state.ballVX = 0;
    state.ballVY = 0;
    state.stuck = true;
    state.running = false;
    state.gameOver = false;
    state.win = false;
    state.autoServeAt = 0;
    setStatus('Press Start');
    setStartVisible(true);
  }

  function newGame() {
    state.score = 0;
    state.lives = 3;
    if (scoreEl) scoreEl.textContent = String(state.score);
    if (livesEl) livesEl.textContent = String(state.lives);
    resetBricks();
    resetBallAndPaddle();
  }

  function serve() {
    if (state.gameOver || state.win) {
      newGame();
      return;
    }
    if (!state.stuck) return;

    // Hide Start while the run is in progress (it comes back on game over / win)
    setStartVisible(false);

    state.running = true;
    state.stuck = false;
    state.autoServeAt = 0;

    const angle = (Math.random()*0.7 + 0.15) * Math.PI; // 27°..153°
    const speed = 120;
    // launch upward
    state.ballVX = Math.cos(angle) * speed;
    state.ballVY = -Math.abs(Math.sin(angle) * speed);
    setStatus('Break!');
    beep(720, 0.05, 0.05);
  }

  if (startBtn) startBtn.addEventListener('click', (e) => { e.preventDefault(); serve(); });

  function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }

  function hitAABB(ax,ay,aw,ah, bx,by,bw,bh) {
    return ax < bx+bw && ax+aw > bx && ay < by+bh && ay+ah > by;
  }

  function step(dt) {
    // inputs
    const sp = 160;
    if (keys.has('m')) { keys.delete('m'); audioOn = !audioOn; beep(audioOn?880:220,0.04,0.05); }

    if (keys.has(' ') ) {
      // space triggers serve if stuck; else ignore
      if (state.stuck) serve();
      keys.delete(' ');
    }

    let dir = 0;
    if (keys.has('arrowleft') || keys.has('a')) dir -= 1;
    if (keys.has('arrowright') || keys.has('d')) dir += 1;

    // joystick axis overrides (smooth)
    const ax = mobile.axis || 0;
    if (Math.abs(ax) > 0.08) dir += ax;

    state.paddleX += dir * sp * dt;
    state.paddleX = clamp(state.paddleX, state.paddleW/2 + 8, W - state.paddleW/2 - 8);

    if (state.stuck) {
      state.ballX = state.paddleX;
      state.ballY = H-34;

      // Auto-serve after life loss so Start can stay hidden during the run.
      if (state.autoServeAt && performance.now() >= state.autoServeAt) {
        serve();
      }
      return;
    }

    if (!state.running) return;

    // move ball
    state.ballX += state.ballVX * dt;
    state.ballY += state.ballVY * dt;

    // wall bounce
    if (state.ballX < 6) { state.ballX = 6; state.ballVX *= -1; beep(420,0.03,0.03); }
    if (state.ballX > W-6) { state.ballX = W-6; state.ballVX *= -1; beep(420,0.03,0.03); }
    if (state.ballY < 8) { state.ballY = 8; state.ballVY *= -1; beep(420,0.03,0.03); }

    // paddle collision
    const pw = state.paddleW;
    const ph = 6;
    const px = state.paddleX - pw/2;
    const py = H-20;
    const bx = state.ballX - 2;
    const by = state.ballY - 2;

    if (state.ballVY > 0 && hitAABB(bx,by,4,4, px,py,pw,ph)) {
      state.ballY = py - 2;
      // reflect angle based on hit position
      const t = clamp((state.ballX - state.paddleX) / (pw/2), -1, 1);
      const speed = Math.max(120, Math.hypot(state.ballVX, state.ballVY) * 1.01);
      const ang = (-Math.PI/2) + t * (Math.PI * 0.33); // spread
      state.ballVX = Math.cos(ang) * speed;
      state.ballVY = Math.sin(ang) * speed;
      state.ballVY = -Math.abs(state.ballVY);
      state.shake = 5;
      beep(880,0.04,0.05);
    }

    // bricks
    let hit = false;
    for (const br of state.bricks) {
      if (!br.alive) continue;
      if (hitAABB(bx,by,4,4, br.x,br.y,br.w,br.h)) {
        br.alive = false;
        state.bricksLeft -= 1;
        state.score += 10;
        if (scoreEl) scoreEl.textContent = String(state.score);
        // crude bounce: flip Y; if coming from side, flip X
        const cx = br.x + br.w/2;
        const cy = br.y + br.h/2;
        const dx = state.ballX - cx;
        const dy = state.ballY - cy;
        if (Math.abs(dx) > Math.abs(dy)) state.ballVX *= -1;
        else state.ballVY *= -1;
        state.shake = 6;
        beep(660,0.03,0.05);
        hit = true;
        break;
      }
    }

    if (state.bricksLeft <= 0) {
      state.running = false;
      state.win = true;
      setStatus('You win!');
      beep(980,0.08,0.06);
      state.stuck = true;
      state.autoServeAt = 0;
      setStartVisible(true);
      return;
    }

    // drop
    if (state.ballY > H + 10) {
      state.lives -= 1;
      if (livesEl) livesEl.textContent = String(state.lives);
      beep(180,0.08,0.06);
      if (state.lives <= 0) {
        state.running = false;
        state.gameOver = true;
        setStatus('Game over');
        state.stuck = true;
        state.autoServeAt = 0;
        setStartVisible(true);
      } else {
        // Auto-serve after a short delay (keeps Start hidden during the run).
        state.stuck = true;
        state.running = false;
        setStatus('Get ready');
        state.autoServeAt = performance.now() + 700;
      }
    }
  }

  function draw() {
    // background
    ctx.fillStyle = '#0b1020';
    ctx.fillRect(0,0,W,H);

    // scanlines
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    for (let y=0; y<H; y+=2) ctx.fillRect(0,y,W,1);

    // bricks
    for (const br of state.bricks) {
      if (!br.alive) continue;
      ctx.fillStyle = br.col;
      ctx.fillRect(br.x, br.y, br.w, br.h);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(br.x, br.y + br.h-2, br.w, 2);
    }

    // paddle
    const pw = state.paddleW;
    const px = state.paddleX - pw/2;
    const py = H-20;
    ctx.fillStyle = '#e8eeff';
    ctx.fillRect(px, py, pw, 6);
    ctx.fillStyle = 'rgba(124,240,255,0.25)';
    ctx.fillRect(px+2, py+1, pw-4, 2);

    // ball
    ctx.fillStyle = 'rgba(124,240,255,0.25)';
    ctx.fillRect(state.ballX-4, state.ballY-4, 8, 8);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(state.ballX-2, state.ballY-2, 4, 4);

    // HUD in-canvas (score)
    ctx.fillStyle = 'rgba(232,238,255,0.85)';
    ctx.font = '12px ui-monospace, Menlo, Monaco, Consolas, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('SCORE ' + String(state.score), 10, 8);
    ctx.textAlign = 'right';
    ctx.fillText('LIVES ' + String(state.lives), W-10, 8);

    if (state.stuck) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillStyle = 'rgba(232,238,255,0.75)';
      ctx.font = '10px ui-monospace, Menlo, Monaco, Consolas, monospace';
      const msg = state.gameOver ? 'GAME OVER — PRESS START' : (state.win ? 'YOU WIN — PRESS START' : 'PRESS START');
      // Move this up so it doesn't sit behind the paddle on some aspect ratios.
      ctx.fillText(msg, W/2, H-30);
    }

    // blit
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.round(rect.width * DPR);
    canvas.height = Math.round(rect.height * DPR);
    g.imageSmoothingEnabled = false;

    const sx = (Math.random()-0.5) * state.shake;
    const sy = (Math.random()-0.5) * state.shake;
    state.shake = Math.max(0, state.shake - 0.8);

    g.clearRect(0,0,canvas.width,canvas.height);
    g.drawImage(low, sx, sy, canvas.width, canvas.height);
  }

  let last = performance.now();
  function loop(now) {
    const dt = Math.min((now-last)/1000, 0.033);
    last = now;
    step(dt);
    draw();
    requestAnimationFrame(loop);
  }

  newGame();
  requestAnimationFrame(loop);
})();
