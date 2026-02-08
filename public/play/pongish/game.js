(() => {
  const canvas = document.getElementById('c');
  const btn = document.getElementById('start');
  const pEl = document.getElementById('p');
  const aEl = document.getElementById('a');
  const sEl = document.getElementById('s');

  const DPR = Math.min(window.devicePixelRatio || 1, 2);

  // pixel buffer
  const low = document.createElement('canvas');
  const ctx = low.getContext('2d');
  const g = canvas.getContext('2d');

  const keys = new Set();
  window.addEventListener('keydown', (e) => {
    keys.add(e.key.toLowerCase());
    if (['arrowup','arrowdown',' '].includes(e.key.toLowerCase())) e.preventDefault();
  }, { passive: false });
  window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));

  // Mobile (coarse pointer) controls: hold Up/Down buttons + tap Start/Mute.
  const mobile = {
    up: false,
    down: false,
  };
  const mobUp = document.getElementById('mobUp');
  const mobDown = document.getElementById('mobDown');
  const mobStart = document.getElementById('mobStart');
  const mobMute = document.getElementById('mobMute');

  function bindHold(el, key) {
    if (!el) return;
    const on = (e) => { e.preventDefault(); mobile[key] = true; };
    const off = (e) => { e.preventDefault(); mobile[key] = false; };
    el.addEventListener('pointerdown', on);
    el.addEventListener('pointerup', off);
    el.addEventListener('pointercancel', off);
    el.addEventListener('pointerleave', off);
  }
  bindHold(mobUp, 'up');
  bindHold(mobDown, 'down');

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

  const W = 320;
  const H = 180;
  low.width = W;
  low.height = H;

  const state = {
    running: false,
    pScore: 0,
    aScore: 0,
    pY: H/2,
    aY: H/2,
    ballX: W/2,
    ballY: H/2,
    vX: 0,
    vY: 0,
    serveDir: 1,
    shake: 0,
    uiStatus: 'PRESS START',
  };

  function resetBall(servingToRight=true) {
    state.ballX = W/2;
    state.ballY = H/2;
    state.vX = 0;
    state.vY = 0;
    state.running = false;
    state.serveDir = servingToRight ? 1 : -1;
    state.uiStatus = 'PRESS START';
    if (sEl) sEl.textContent = 'Press Start';
  }

  function startServe() {
    if (state.running) return;
    state.running = true;
    const base = 120;
    state.vX = state.serveDir * base;
    state.vY = (Math.random() - 0.5) * 90;
    state.uiStatus = 'RALLY!';
    if (sEl) sEl.textContent = 'Rally!';
    beep(660);
  }

  if (btn) btn.addEventListener('click', startServe);

  function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }

  function step(dt) {
    // input
    const sp = (keys.has('shift') ? 150 : 120);
    if (keys.has('w') || keys.has('arrowup') || mobile.up) state.pY -= sp*dt;
    if (keys.has('s') || keys.has('arrowdown') || mobile.down) state.pY += sp*dt;
    state.pY = clamp(state.pY, 18, H-18);

    if (keys.has('m')) { keys.delete('m'); audioOn = !audioOn; beep(audioOn?880:220,0.04,0.05); }

    if (keys.has('f')) { keys.delete('f'); toggleFullscreen(); }

    if (keys.has(' ') && !state.running) startServe();

    // AI tracks ball with lag
    const aiSp = 95;
    const target = state.ballY + state.vY*0.04;
    if (target < state.aY-2) state.aY -= aiSp*dt;
    if (target > state.aY+2) state.aY += aiSp*dt;
    state.aY = clamp(state.aY, 18, H-18);

    if (!state.running) return;

    // move ball
    state.ballX += state.vX * dt;
    state.ballY += state.vY * dt;

    // top/bottom bounce
    if (state.ballY < 6) { state.ballY = 6; state.vY *= -1; beep(420,0.03,0.03); }
    if (state.ballY > H-6) { state.ballY = H-6; state.vY *= -1; beep(420,0.03,0.03); }

    const paddleH = 28;
    const paddleW = 4;

    // player paddle
    const px = 14;
    if (state.ballX < px + paddleW && state.ballX > px - 2) {
      if (Math.abs(state.ballY - state.pY) < paddleH/2) {
        state.ballX = px + paddleW;
        state.vX = Math.abs(state.vX) * 1.04;
        state.vY += (state.ballY - state.pY) * 4.2;
        state.shake = 6;
        beep(880,0.04,0.05);
      }
    }

    // ai paddle
    const ax = W - 14;
    if (state.ballX > ax - paddleW && state.ballX < ax + 2) {
      if (Math.abs(state.ballY - state.aY) < paddleH/2) {
        state.ballX = ax - paddleW;
        state.vX = -Math.abs(state.vX) * 1.04;
        state.vY += (state.ballY - state.aY) * 4.0;
        state.shake = 6;
        beep(520,0.04,0.05);
      }
    }

    // score
    if (state.ballX < -10) {
      state.aScore += 1;
      if (aEl) aEl.textContent = state.aScore;
      beep(180,0.08,0.06);
      resetBall(true);
    }
    if (state.ballX > W+10) {
      state.pScore += 1;
      if (pEl) pEl.textContent = state.pScore;
      beep(980,0.08,0.06);
      resetBall(false);
    }

    if (state.pScore >= 7 || state.aScore >= 7) {
      state.running = false;
      state.uiStatus = state.pScore >= 7 ? 'YOU WIN!' : 'AI WINS!';
      if (sEl) sEl.textContent = state.pScore >= 7 ? 'You win!' : 'AI wins!';
      // reset match on next serve
      if (keys.has(' ')) {
        state.pScore = 0; state.aScore = 0;
        if (pEl) pEl.textContent = '0'; if (aEl) aEl.textContent = '0';
        resetBall(true);
      }
    }
  }

  function draw() {
    ctx.clearRect(0,0,W,H);

    // background
    ctx.fillStyle = '#0b1020';
    ctx.fillRect(0,0,W,H);

    // scanlines
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    for (let y=0; y<H; y+=2) ctx.fillRect(0,y,W,1);

    // center dashed
    ctx.fillStyle = 'rgba(232,238,255,0.35)';
    for (let y=6; y<H; y+=10) ctx.fillRect(W/2-1,y,2,6);

    // paddles
    const paddleH = 28;
    ctx.fillStyle = '#e8eeff';
    ctx.fillRect(12, state.pY - paddleH/2, 4, paddleH);
    ctx.fillRect(W-16, state.aY - paddleH/2, 4, paddleH);

    // HUD (in-canvas)
    ctx.fillStyle = 'rgba(232,238,255,0.85)';
    ctx.font = '12px ui-monospace, Menlo, Monaco, Consolas, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(String(state.pScore) + '  ' + String(state.aScore), W/2, 8);

    if (!state.running) {
      ctx.fillStyle = 'rgba(232,238,255,0.70)';
      ctx.font = '10px ui-monospace, Menlo, Monaco, Consolas, monospace';
      ctx.textBaseline = 'bottom';
      ctx.fillText(state.uiStatus || 'PRESS START', W/2, H - 10);
    }

    // ball + glow
    ctx.fillStyle = 'rgba(124,240,255,0.25)';
    ctx.fillRect(state.ballX-3, state.ballY-3, 6, 6);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(state.ballX-1, state.ballY-1, 2, 2);

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

  function resize() {
    // handled in draw for simplicity
  }
  window.addEventListener('resize', resize);

  let last = performance.now();
  function loop(now) {
    const dt = Math.min((now-last)/1000, 0.033);
    last = now;
    step(dt);
    draw();
    requestAnimationFrame(loop);
  }

  resetBall(true);
  requestAnimationFrame(loop);
})();
