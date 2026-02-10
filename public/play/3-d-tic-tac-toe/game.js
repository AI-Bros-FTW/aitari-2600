(() => {
  const canvas = document.getElementById('c');
  const winsEl = document.getElementById('wins');
  const lossesEl = document.getElementById('losses');
  const statusEl = document.getElementById('status');
  const startBtn = document.getElementById('start');
  const mobStart = document.getElementById('mobStart');
  const muteBtn = document.getElementById('mute');
  const mobMute = document.getElementById('mobMute');
  const fsBtn = document.getElementById('fsBtn');

  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  const g = canvas.getContext('2d');

  // Constants
  const SIZE = 4; // 4x4x4
  const PLAYER = 1; // X - cyan
  const AI = 2;     // O - magenta
  const CYAN = '#00f5d4';
  const MAGENTA = '#ff77bb';
  const DIM_CYAN = 'rgba(0,245,212,0.3)';
  const DIM_MAGENTA = 'rgba(255,119,187,0.3)';

  // State
  let board = []; // board[layer][row][col]
  let running = false;
  let gameOver = false;
  let winner = 0; // 0=none, 1=player, 2=ai, 3=draw
  let winLine = null; // [{l,r,c}, ...]
  let playerTurn = true;
  let wins = parseInt(localStorage.getItem('3dttt-wins') || '0', 10);
  let losses = parseInt(localStorage.getItem('3dttt-losses') || '0', 10);
  let hoverCell = null; // {l,r,c}
  let aiThinking = false;

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

  function playWin() { beep(523, 0.1, 0.04); setTimeout(() => beep(659, 0.1, 0.04), 120); setTimeout(() => beep(784, 0.2, 0.05), 240); }
  function playLose() { beep(200, 0.15, 0.04); setTimeout(() => beep(150, 0.2, 0.04), 180); }

  function setStatus(t) { if (statusEl) statusEl.textContent = t; }
  function updateUI() {
    if (winsEl) winsEl.textContent = wins;
    if (lossesEl) lossesEl.textContent = losses;
  }

  function toggleMute() {
    audioOn = !audioOn;
    const txt = audioOn ? '🔊 Sound' : '🔇 Muted';
    if (muteBtn) muteBtn.textContent = txt;
    if (mobMute) mobMute.textContent = audioOn ? '🔊' : '🔇';
  }
  if (muteBtn) muteBtn.addEventListener('click', toggleMute);
  if (mobMute) mobMute.addEventListener('click', (e) => { e.preventDefault(); toggleMute(); });

  // Board helpers
  function initBoard() {
    board = [];
    for (let l = 0; l < SIZE; l++) {
      board[l] = [];
      for (let r = 0; r < SIZE; r++) {
        board[l][r] = new Array(SIZE).fill(0);
      }
    }
  }

  function getCell(l, r, c) { return board[l]?.[r]?.[c] ?? -1; }

  // All winning lines (4 in a row) — precomputed
  const ALL_LINES = [];
  function precomputeLines() {
    const dirs = [];
    for (let dl = -1; dl <= 1; dl++)
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++)
          if (dl !== 0 || dr !== 0 || dc !== 0) dirs.push([dl, dr, dc]);

    const seen = new Set();
    for (let l = 0; l < SIZE; l++)
      for (let r = 0; r < SIZE; r++)
        for (let c = 0; c < SIZE; c++)
          for (const [dl, dr, dc] of dirs) {
            const line = [];
            let valid = true;
            for (let i = 0; i < SIZE; i++) {
              const nl = l + dl * i, nr = r + dr * i, nc = c + dc * i;
              if (nl < 0 || nl >= SIZE || nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE) { valid = false; break; }
              line.push({ l: nl, r: nr, c: nc });
            }
            if (!valid) continue;
            const key = line.map(p => `${p.l},${p.r},${p.c}`).sort().join('|');
            if (!seen.has(key)) { seen.add(key); ALL_LINES.push(line); }
          }
  }
  precomputeLines();

  function checkWin(who) {
    for (const line of ALL_LINES) {
      if (line.every(p => board[p.l][p.r][p.c] === who)) return line;
    }
    return null;
  }

  function isFull() {
    for (let l = 0; l < SIZE; l++)
      for (let r = 0; r < SIZE; r++)
        for (let c = 0; c < SIZE; c++)
          if (board[l][r][c] === 0) return false;
    return true;
  }

  // AI — minimax with alpha-beta, depth-limited
  function evaluate() {
    // Score lines based on how many of each player
    let score = 0;
    for (const line of ALL_LINES) {
      let ai = 0, pl = 0;
      for (const p of line) {
        const v = board[p.l][p.r][p.c];
        if (v === AI) ai++;
        else if (v === PLAYER) pl++;
      }
      if (ai > 0 && pl > 0) continue; // blocked
      if (ai === 4) return 100000;
      if (pl === 4) return -100000;
      if (ai > 0) score += ai === 3 ? 100 : ai === 2 ? 10 : 1;
      if (pl > 0) score -= pl === 3 ? 100 : pl === 2 ? 10 : 1;
    }
    return score;
  }

  function getEmptyCells() {
    const cells = [];
    for (let l = 0; l < SIZE; l++)
      for (let r = 0; r < SIZE; r++)
        for (let c = 0; c < SIZE; c++)
          if (board[l][r][c] === 0) cells.push({ l, r, c });
    return cells;
  }

  function minimax(depth, isMax, alpha, beta) {
    const wAI = checkWin(AI);
    if (wAI) return 100000 + depth;
    const wPL = checkWin(PLAYER);
    if (wPL) return -100000 - depth;
    if (isFull() || depth === 0) return evaluate();

    const empty = getEmptyCells();
    if (isMax) {
      let best = -Infinity;
      for (const { l, r, c } of empty) {
        board[l][r][c] = AI;
        best = Math.max(best, minimax(depth - 1, false, alpha, beta));
        board[l][r][c] = 0;
        alpha = Math.max(alpha, best);
        if (beta <= alpha) break;
      }
      return best;
    } else {
      let best = Infinity;
      for (const { l, r, c } of empty) {
        board[l][r][c] = PLAYER;
        best = Math.min(best, minimax(depth - 1, true, alpha, beta));
        board[l][r][c] = 0;
        beta = Math.min(beta, best);
        if (beta <= alpha) break;
      }
      return best;
    }
  }

  function aiMove() {
    const empty = getEmptyCells();
    if (empty.length === 0) return;

    // Adaptive depth based on empty cells
    let depth = 2;
    if (empty.length <= 20) depth = 3;
    if (empty.length <= 10) depth = 4;

    // Check immediate wins/blocks first
    for (const { l, r, c } of empty) {
      board[l][r][c] = AI;
      if (checkWin(AI)) { board[l][r][c] = 0; return { l, r, c }; }
      board[l][r][c] = 0;
    }
    for (const { l, r, c } of empty) {
      board[l][r][c] = PLAYER;
      if (checkWin(PLAYER)) { board[l][r][c] = 0; return { l, r, c }; }
      board[l][r][c] = 0;
    }

    let bestScore = -Infinity;
    let bestMove = empty[0];
    for (const { l, r, c } of empty) {
      board[l][r][c] = AI;
      const s = minimax(depth - 1, false, -Infinity, Infinity);
      board[l][r][c] = 0;
      if (s > bestScore) { bestScore = s; bestMove = { l, r, c }; }
    }
    return bestMove;
  }

  // Game flow
  function startGame() {
    initBoard();
    running = true;
    gameOver = false;
    winner = 0;
    winLine = null;
    playerTurn = true;
    aiThinking = false;
    setStatus('Your turn');
    beep(660, 0.05);
  }

  function placeMove(l, r, c) {
    if (!running || gameOver || !playerTurn || aiThinking) return;
    if (board[l][r][c] !== 0) return;

    board[l][r][c] = PLAYER;
    beep(440, 0.03);

    const w = checkWin(PLAYER);
    if (w) {
      winLine = w;
      winner = PLAYER;
      gameOver = true;
      wins++;
      localStorage.setItem('3dttt-wins', wins.toString());
      updateUI();
      setStatus('You Win!');
      playWin();
      return;
    }
    if (isFull()) {
      winner = 3;
      gameOver = true;
      setStatus('Draw!');
      return;
    }

    playerTurn = false;
    aiThinking = true;
    setStatus('AI thinking...');

    setTimeout(() => {
      const move = aiMove();
      if (move) {
        board[move.l][move.r][move.c] = AI;
        beep(330, 0.03);
      }

      const wa = checkWin(AI);
      if (wa) {
        winLine = wa;
        winner = AI;
        gameOver = true;
        losses++;
        localStorage.setItem('3dttt-losses', losses.toString());
        updateUI();
        setStatus('AI Wins!');
        playLose();
      } else if (isFull()) {
        winner = 3;
        gameOver = true;
        setStatus('Draw!');
      } else {
        playerTurn = true;
        aiThinking = false;
        setStatus('Your turn');
      }
    }, 80);
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

  function getGridGeometry() {
    // 4 layers side by side
    const totalPad = 20 * DPR;
    const gapBetween = 12 * DPR;
    const availW = W - totalPad * 2 - gapBetween * 3;
    const availH = H - 80 * DPR; // top/bottom margins for HUD
    const layerSize = Math.min(availW / 4, availH);
    const cellSize = (layerSize - 6 * DPR) / SIZE;
    const totalW = layerSize * 4 + gapBetween * 3;
    const ox = (W - totalW) / 2;
    const oy = (H - layerSize) / 2 + 10 * DPR;
    return { layerSize, cellSize, gapBetween, ox, oy };
  }

  function cellRect(l, r, c, geo) {
    const lx = geo.ox + l * (geo.layerSize + geo.gapBetween);
    const pad = 3 * DPR;
    const x = lx + pad + c * geo.cellSize;
    const y = geo.oy + pad + r * geo.cellSize;
    return { x, y, w: geo.cellSize, h: geo.cellSize };
  }

  function hitTest(px, py) {
    const geo = getGridGeometry();
    for (let l = 0; l < SIZE; l++)
      for (let r = 0; r < SIZE; r++)
        for (let c = 0; c < SIZE; c++) {
          const rc = cellRect(l, r, c, geo);
          if (px >= rc.x && px < rc.x + rc.w && py >= rc.y && py < rc.y + rc.h)
            return { l, r, c };
        }
    return null;
  }

  function isWinCell(l, r, c) {
    if (!winLine) return false;
    return winLine.some(p => p.l === l && p.r === r && p.c === c);
  }

  function draw(now) {
    g.clearRect(0, 0, W, H);
    const geo = getGridGeometry();
    const pulse = Math.sin(now / 300) * 0.3 + 0.7;

    // Draw layer labels
    g.font = `bold ${9 * DPR}px 'Press Start 2P', monospace`;
    g.textAlign = 'center';
    g.textBaseline = 'bottom';

    for (let l = 0; l < SIZE; l++) {
      const lx = geo.ox + l * (geo.layerSize + geo.gapBetween);

      // Layer label
      g.fillStyle = '#9AA0B4';
      g.fillText(`L${l + 1}`, lx + geo.layerSize / 2, geo.oy - 4 * DPR);

      // Layer background
      g.fillStyle = '#0d1117';
      g.fillRect(lx, geo.oy, geo.layerSize, geo.layerSize);
      g.strokeStyle = 'rgba(0,245,212,0.15)';
      g.lineWidth = 1.5 * DPR;
      g.strokeRect(lx, geo.oy, geo.layerSize, geo.layerSize);

      // Cells
      for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
          const rc = cellRect(l, r, c, geo);
          const val = board[l]?.[r]?.[c] ?? 0;
          const isHover = hoverCell && hoverCell.l === l && hoverCell.r === r && hoverCell.c === c;
          const isWin = isWinCell(l, r, c);

          // Cell bg
          g.fillStyle = isHover && val === 0 && playerTurn ? 'rgba(0,245,212,0.08)' : '#151b28';
          g.fillRect(rc.x, rc.y, rc.w, rc.h);

          // Cell border
          g.strokeStyle = isWin ? (winner === PLAYER ? CYAN : MAGENTA) : 'rgba(0,245,212,0.08)';
          g.lineWidth = isWin ? 2 * DPR : 1;
          if (isWin) g.globalAlpha = pulse;
          g.strokeRect(rc.x, rc.y, rc.w, rc.h);
          g.globalAlpha = 1;

          // Draw X or O
          if (val === PLAYER) {
            drawX(rc.x, rc.y, rc.w, rc.h, isWin ? pulse : 1);
          } else if (val === AI) {
            drawO(rc.x, rc.y, rc.w, rc.h, isWin ? pulse : 1);
          } else if (isHover && playerTurn && running && !gameOver) {
            // Ghost preview
            g.globalAlpha = 0.3;
            drawX(rc.x, rc.y, rc.w, rc.h, 1);
            g.globalAlpha = 1;
          }
        }
      }
    }

    // HUD on canvas
    const hudY = geo.oy - 20 * DPR;
    if (hudY > 16 * DPR) {
      g.font = `${8 * DPR}px 'Press Start 2P', monospace`;
      g.textBaseline = 'bottom';

      g.textAlign = 'left';
      g.fillStyle = CYAN;
      g.fillText(`YOU(X): ${wins}`, geo.ox, hudY);

      g.textAlign = 'center';
      g.fillStyle = '#9AA0B4';
      const statusText = gameOver ? (winner === PLAYER ? 'YOU WIN!' : winner === AI ? 'AI WINS!' : 'DRAW!') :
                          (playerTurn ? 'YOUR TURN' : 'AI THINKING...');
      g.fillText(statusText, W / 2, hudY);

      g.textAlign = 'right';
      g.fillStyle = MAGENTA;
      const rightEdge = geo.ox + geo.layerSize * 4 + geo.gapBetween * 3;
      g.fillText(`AI(O): ${losses}`, rightEdge, hudY);
    }

    // Title screen
    if (!running) {
      g.fillStyle = 'rgba(11,14,20,0.75)';
      g.fillRect(0, 0, W, H);
      g.fillStyle = CYAN;
      g.font = `bold ${20 * DPR}px 'Press Start 2P', monospace`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('3-D', W / 2, H / 2 - 30 * DPR);
      g.fillText('TIC-TAC-TOE', W / 2, H / 2);
      g.font = `${10 * DPR}px 'Press Start 2P', monospace`;
      g.fillStyle = '#9AA0B4';
      g.fillText('PRESS START', W / 2, H / 2 + 30 * DPR);
    }

    // Game over overlay
    if (gameOver) {
      g.fillStyle = 'rgba(11,14,20,0.5)';
      // Don't cover the whole screen, just put text at bottom
      const msgY = geo.oy + geo.layerSize + 20 * DPR;
      g.font = `${10 * DPR}px 'Press Start 2P', monospace`;
      g.textAlign = 'center';
      g.textBaseline = 'top';
      g.fillStyle = '#9AA0B4';
      g.fillText('PRESS START FOR NEW GAME', W / 2, msgY);
    }
  }

  function drawX(x, y, w, h, alpha) {
    const pad = w * 0.22;
    g.save();
    g.globalAlpha = (g.globalAlpha || 1) * alpha;
    g.strokeStyle = CYAN;
    g.lineWidth = 2.5 * DPR;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(x + pad, y + pad);
    g.lineTo(x + w - pad, y + h - pad);
    g.moveTo(x + w - pad, y + pad);
    g.lineTo(x + pad, y + h - pad);
    g.stroke();
    g.restore();
  }

  function drawO(x, y, w, h, alpha) {
    const cx = x + w / 2;
    const cy = y + h / 2;
    const r = Math.min(w, h) * 0.3;
    g.save();
    g.globalAlpha = (g.globalAlpha || 1) * alpha;
    g.strokeStyle = MAGENTA;
    g.lineWidth = 2.5 * DPR;
    g.beginPath();
    g.arc(cx, cy, r, 0, Math.PI * 2);
    g.stroke();
    g.restore();
  }

  // Input — mouse
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const px = (e.clientX - rect.left) * DPR;
    const py = (e.clientY - rect.top) * DPR;
    hoverCell = hitTest(px, py);
  });

  canvas.addEventListener('mouseleave', () => { hoverCell = null; });

  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const px = (e.clientX - rect.left) * DPR;
    const py = (e.clientY - rect.top) * DPR;
    const cell = hitTest(px, py);
    if (cell) placeMove(cell.l, cell.r, cell.c);
  });

  // Touch
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const t = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const px = (t.clientX - rect.left) * DPR;
    const py = (t.clientY - rect.top) * DPR;
    const cell = hitTest(px, py);
    if (cell) {
      hoverCell = cell;
      placeMove(cell.l, cell.r, cell.c);
    }
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => { e.preventDefault(); }, { passive: false });

  // Start
  function doStart() {
    startGame();
  }
  if (startBtn) startBtn.addEventListener('click', doStart);
  if (mobStart) mobStart.addEventListener('click', (e) => { e.preventDefault(); doStart(); });

  // Fullscreen
  let isFullscreen = false;
  if (fsBtn) {
    fsBtn.addEventListener('click', () => {
      isFullscreen = !isFullscreen;
      document.body.classList.toggle('fullscreen', isFullscreen);
      document.body.classList.toggle('embed', isFullscreen);
      fsBtn.textContent = isFullscreen ? '✕' : '⛶';
      setTimeout(resize, 50);
      // Try native fullscreen
      if (isFullscreen) {
        try { document.documentElement.requestFullscreen?.(); } catch {}
      } else {
        try { document.exitFullscreen?.(); } catch {}
      }
    });
  }

  // Listen for native fullscreen exit
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
    draw(now);
    requestAnimationFrame(loop);
  }

  updateUI();
  requestAnimationFrame(loop);
})();
