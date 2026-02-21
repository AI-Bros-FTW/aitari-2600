(() => {
  const canvas = document.getElementById('c');
  const roomNameEl = document.getElementById('roomName');
  const itemNameEl = document.getElementById('itemName');
  const startBtn = document.getElementById('start');
  const mobStart = document.getElementById('mobStart');
  const muteBtn = document.getElementById('mute');
  const mobMute = document.getElementById('mobMute');
  const fsBtn = document.getElementById('fsBtn');
  const mobUp = document.getElementById('mobUp');
  const mobDown = document.getElementById('mobDown');
  const mobLeft = document.getElementById('mobLeft');
  const mobRight = document.getElementById('mobRight');
  const mobDrop = document.getElementById('mobDrop');

  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  const g = canvas.getContext('2d');

  const VW = 320;
  const VH = 210;

  // Retro colors matching Atari 2600 Adventure palette
  const C = {
    bg: '#000000',
    gold: '#c8a000', goldWall: '#e8c800',
    black: '#282828', blackWall: '#505050',
    white: '#c0c0c0', whiteWall: '#f0f0f0',
    player: '#ffff00',
    chalice: '#ffd700',
    key_gold: '#c8a000',
    key_black: '#505050',
    key_white: '#f0f0f0',
    dragon_green: '#00c800', // Yorgle
    dragon_red: '#c80000',   // Grundle
    dragon_yellow: '#c8c800', // Rhindle
    bat: '#808080',
    magnet: '#404040',
    bridge: '#c87800',
    sword: '#e0e0e0',
    text: '#00f5d4',
    hud: '#ffcc00',
  };

  // Game state
  let state = 'title'; // title | playing | won | dead
  let audioOn = true;
  let ac;

  // Player
  const PW = 6;
  const PH = 8;
  let px, py, pRoom;
  let carriedItem = null;
  const SPEED = 1.4;

  // Room definitions
  // Each room: { name, bg, wallColor, walls[], exits:{up,down,left,right} }
  const ROOMS = {};

  function defRoom(id, name, bg, wallColor, walls, exits) {
    ROOMS[id] = { id, name, bg, wallColor, walls: walls || [], exits: exits || {} };
  }

  // Walls are arrays of [x, y, w, h] in VW/VH coords
  // Standard room border walls with openings for exits
  function stdWalls(openUp, openDown, openLeft, openRight) {
    const w = [];
    const T = 6; // wall thickness
    const gapW = 40; // opening width
    const gapH = 30;
    const cx = VW / 2;
    const cy = VH / 2;

    // Top wall
    if (!openUp) {
      w.push([0, 0, VW, T]);
    } else {
      w.push([0, 0, cx - gapW / 2, T]);
      w.push([cx + gapW / 2, 0, VW - (cx + gapW / 2), T]);
    }
    // Bottom wall
    if (!openDown) {
      w.push([0, VH - T, VW, T]);
    } else {
      w.push([0, VH - T, cx - gapW / 2, T]);
      w.push([cx + gapW / 2, VH - T, VW - (cx + gapW / 2), T]);
    }
    // Left wall
    if (!openLeft) {
      w.push([0, 0, T, VH]);
    } else {
      w.push([0, 0, T, cy - gapH / 2]);
      w.push([0, cy + gapH / 2, T, VH - (cy + gapH / 2)]);
    }
    // Right wall
    if (!openRight) {
      w.push([VW - T, 0, T, VH]);
    } else {
      w.push([VW - T, 0, T, cy - gapH / 2]);
      w.push([VW - T, cy + gapH / 2, T, VH - (cy + gapH / 2)]);
    }
    return w;
  }

  // Room definitions — 12 rooms connected as a maze
  // Gold castle (start and goal)
  defRoom('gold_castle', 'Gold Castle', '#1a1400', C.goldWall,
    [...stdWalls(false, true, false, false),
     // Inner castle walls
     [60, 50, 200, 8], [60, 50, 8, 80], [252, 50, 8, 80], [60, 130, 80, 8], [180, 130, 80, 8]],
    { down: 'gold_foyer' });

  defRoom('gold_foyer', 'Castle Grounds', '#0a0800', C.gold,
    stdWalls(true, true, true, false),
    { up: 'gold_castle', down: 'open_field', left: 'maze_1' });

  defRoom('open_field', 'Open Field', '#001400', '#00a000',
    stdWalls(true, false, true, true),
    { up: 'gold_foyer', left: 'forest', right: 'dark_passage' });

  defRoom('forest', 'Forest', '#002800', '#008000',
    [...stdWalls(true, true, false, true),
     // Trees as wall blocks
     [80, 40, 20, 50], [180, 80, 25, 40], [120, 140, 20, 30], [220, 30, 18, 55]],
    { up: 'maze_2', down: 'swamp', right: 'open_field' });

  defRoom('swamp', 'Swamp', '#0a0a00', '#506030',
    [...stdWalls(false, true, true, false),
     // Swamp obstacles
     [40, 60, 60, 12], [160, 100, 70, 12], [80, 150, 50, 12]],
    { down: 'dragon_lair', left: 'black_castle' });

  defRoom('dragon_lair', 'Dragon\'s Lair', '#140000', '#800000',
    [...stdWalls(true, false, false, true),
     [100, 80, 120, 8], [100, 80, 8, 60], [212, 80, 8, 60]],
    { up: 'swamp', right: 'catacombs' });

  defRoom('catacombs', 'Catacombs', '#0a0a0a', '#404040',
    [...stdWalls(true, false, true, false),
     // Maze-like interior
     [60, 0, 8, 80], [140, 60, 8, 80], [220, 0, 8, 100], [60, 130, 100, 8], [200, 140, 8, 70]],
    { up: 'dark_passage', left: 'dragon_lair' });

  defRoom('dark_passage', 'Dark Passage', '#080808', '#303030',
    stdWalls(true, true, true, false),
    { up: 'white_castle', down: 'catacombs', left: 'open_field' });

  defRoom('white_castle', 'White Castle', '#141414', C.whiteWall,
    [...stdWalls(false, true, false, true),
     [60, 50, 200, 8], [60, 50, 8, 80], [252, 50, 8, 80], [60, 130, 80, 8], [180, 130, 80, 8]],
    { down: 'dark_passage', right: 'treasure_room' });

  defRoom('treasure_room', 'Treasure Room', '#1a1000', '#c0a000',
    stdWalls(false, false, true, false),
    { left: 'white_castle' });

  defRoom('maze_1', 'Maze (West)', '#0a0a00', '#606000',
    [...stdWalls(true, false, false, true),
     [60, 0, 8, 80], [120, 50, 8, 100], [180, 0, 8, 80], [60, 130, 70, 8], [180, 140, 8, 70]],
    { up: 'maze_2', right: 'gold_foyer' });

  defRoom('maze_2', 'Maze (North)', '#0a0a00', '#606000',
    [...stdWalls(false, true, true, true),
     [80, 40, 8, 60], [160, 80, 8, 60], [80, 130, 100, 8]],
    { down: 'maze_1', left: 'forest', right: 'black_castle' });

  defRoom('black_castle', 'Black Castle', '#0a0a0a', C.blackWall,
    [...stdWalls(false, false, true, true),
     [60, 50, 200, 8], [60, 50, 8, 80], [252, 50, 8, 80], [60, 130, 80, 8], [180, 130, 80, 8]],
    { left: 'maze_2', right: 'swamp' });

  // Items
  let items = []; // { id, name, room, x, y, w, h, color, type }
  // Dragons
  let dragons = []; // { id, name, room, x, y, color, alive, speed, guardItem }
  // Bat
  let bat = null;

  // Castle gates
  let gates = {
    gold_castle: { locked: false, keyId: 'key_gold' },
    black_castle: { locked: true, keyId: 'key_black' },
    white_castle: { locked: true, keyId: 'key_white' },
  };

  function initGame() {
    px = 160; py = 170; pRoom = 'gold_castle';
    carriedItem = null;

    items = [
      { id: 'chalice', name: 'Chalice', room: 'treasure_room', x: 160, y: 100, w: 8, h: 12, color: C.chalice, type: 'chalice' },
      { id: 'key_gold', name: 'Gold Key', room: 'forest', x: 150, y: 100, w: 8, h: 10, color: C.key_gold, type: 'key' },
      { id: 'key_black', name: 'Black Key', room: 'catacombs', x: 170, y: 50, w: 8, h: 10, color: C.key_black, type: 'key' },
      { id: 'key_white', name: 'White Key', room: 'dragon_lair', x: 160, y: 130, w: 8, h: 10, color: C.key_white, type: 'key' },
      { id: 'sword', name: 'Sword', room: 'gold_foyer', x: 80, y: 100, w: 4, h: 16, color: C.sword, type: 'sword' },
      { id: 'bridge', name: 'Bridge', room: 'maze_1', x: 100, y: 80, w: 30, h: 6, color: C.bridge, type: 'bridge' },
    ];

    dragons = [
      { id: 'yorgle', name: 'Yorgle', room: 'forest', x: 200, y: 60, color: C.dragon_green, alive: true, speed: 0.5, guardItem: 'chalice' },
      { id: 'grundle', name: 'Grundle', room: 'dragon_lair', x: 150, y: 110, color: C.dragon_red, alive: true, speed: 0.7, guardItem: null },
      { id: 'rhindle', name: 'Rhindle', room: 'catacombs', x: 100, y: 100, color: C.dragon_yellow, alive: true, speed: 0.9, guardItem: null },
    ];

    bat = { room: 'maze_2', x: 80, y: 60, dx: 0.8, dy: 0.4, swapTimer: 0, carriedItem: null };

    // Reset gates
    gates.gold_castle.locked = false;
    gates.black_castle.locked = true;
    gates.white_castle.locked = true;
  }

  // Input
  const keys = {};
  window.addEventListener('keydown', e => {
    keys[e.key] = true;
    if (e.key === ' ' && state === 'playing') { dropItem(); e.preventDefault(); }
    if (e.key === 'm' || e.key === 'M') toggleMute();
    if ((e.key === ' ' || e.key === 'Enter') && (state === 'title' || state === 'won' || state === 'dead')) startGame();
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();
  });
  window.addEventListener('keyup', e => { keys[e.key] = false; });

  // Touch input state
  const touch = { up: false, down: false, left: false, right: false };

  function bindTouch(el, dir) {
    if (!el) return;
    const on = () => { touch[dir] = true; };
    const off = () => { touch[dir] = false; };
    el.addEventListener('pointerdown', on);
    el.addEventListener('pointerup', off);
    el.addEventListener('pointerleave', off);
    el.addEventListener('pointercancel', off);
  }
  bindTouch(mobUp, 'up');
  bindTouch(mobDown, 'down');
  bindTouch(mobLeft, 'left');
  bindTouch(mobRight, 'right');

  if (mobDrop) {
    mobDrop.addEventListener('pointerdown', () => { if (state === 'playing') dropItem(); });
  }

  function startGame() {
    if (state === 'playing') return;
    state = 'playing';
    initGame();
    beep(440, 0.1); beep(660, 0.1);
  }

  if (startBtn) startBtn.addEventListener('click', startGame);
  if (mobStart) mobStart.addEventListener('click', startGame);

  function toggleMute() {
    audioOn = !audioOn;
    const label = audioOn ? '🔊 Sound' : '🔇 Muted';
    const icon = audioOn ? '🔊' : '🔇';
    if (muteBtn) muteBtn.textContent = label;
    if (mobMute) mobMute.textContent = icon;
  }
  if (muteBtn) muteBtn.addEventListener('click', toggleMute);
  if (mobMute) mobMute.addEventListener('click', toggleMute);

  // Fullscreen
  if (fsBtn) {
    fsBtn.addEventListener('click', () => {
      const isFs = document.body.classList.toggle('fullscreen');
      fsBtn.textContent = isFs ? '✕' : '⛶';
      fsBtn.setAttribute('aria-label', isFs ? 'Exit fullscreen' : 'Fullscreen');
      try {
        if (isFs && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
        else if (!isFs && document.fullscreenElement) document.exitFullscreen().catch(() => {});
      } catch {}
    });
  }

  // Audio
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

  // Collision
  function rectOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  function wallCollision(x, y, w, h, room) {
    const r = ROOMS[room];
    if (!r) return false;
    for (const wall of r.walls) {
      if (rectOverlap(x, y, w, h, wall[0], wall[1], wall[2], wall[3])) return true;
    }
    // Check if gate is locked (castle rooms have entry through their exit)
    return false;
  }

  // Check if entering a locked castle
  function isGateLocked(roomId) {
    const gate = gates[roomId];
    if (!gate) return false;
    if (!gate.locked) return false;
    // Check if player carries the matching key
    if (carriedItem && carriedItem.id === gate.keyId) {
      gate.locked = false;
      beep(880, 0.15); beep(1100, 0.15);
      return false;
    }
    return true;
  }

  function dropItem() {
    if (carriedItem) {
      carriedItem.room = pRoom;
      carriedItem.x = px;
      carriedItem.y = py + PH + 2;
      beep(200, 0.05);
      carriedItem = null;
    }
  }

  function pickUpItem(item) {
    if (carriedItem) {
      // Drop current item first
      carriedItem.room = pRoom;
      carriedItem.x = px;
      carriedItem.y = py + PH + 2;
    }
    carriedItem = item;
    item.room = '__carried__';
    beep(660, 0.08);
  }

  // Draw functions
  function drawPlayer(x, y) {
    // Simple square player like original Adventure
    g.fillStyle = C.player;
    g.fillRect(x, y, PW, PH);
    // Arrow showing direction
    g.fillRect(x + 2, y - 2, 2, 2);
  }

  function drawItem(item) {
    if (item.room !== pRoom && item.room !== '__carried__') return;
    const ix = item.room === '__carried__' ? px : item.x;
    const iy = item.room === '__carried__' ? py - item.h - 2 : item.y;
    g.fillStyle = item.color;

    if (item.type === 'chalice') {
      // Chalice shape - cup
      g.fillRect(ix, iy + 2, item.w, item.h - 4);
      g.fillRect(ix - 2, iy, item.w + 4, 3);
      g.fillRect(ix + 1, iy + item.h - 3, item.w - 2, 3);
      // Sparkle
      if (Math.random() > 0.7) {
        g.fillStyle = '#ffffff';
        g.fillRect(ix + Math.random() * item.w, iy + Math.random() * item.h, 2, 2);
      }
    } else if (item.type === 'key') {
      // Key shape
      g.fillRect(ix, iy, 3, item.h);
      g.fillRect(ix, iy, item.w, 3);
      g.fillRect(ix + 4, iy + 4, 4, 2);
      g.fillRect(ix + 4, iy + 7, 4, 2);
    } else if (item.type === 'sword') {
      // Sword
      g.fillRect(ix + 1, iy, 2, item.h);
      g.fillRect(ix - 2, iy + 4, 8, 2);
      g.fillStyle = '#a07020';
      g.fillRect(ix, iy + item.h - 3, 4, 3);
    } else if (item.type === 'bridge') {
      g.fillRect(ix, iy, item.w, item.h);
      // Bridge pattern
      g.fillStyle = '#000000';
      for (let bx = ix + 4; bx < ix + item.w; bx += 8) {
        g.fillRect(bx, iy + 1, 2, item.h - 2);
      }
    } else {
      g.fillRect(ix, iy, item.w, item.h);
    }
  }

  function drawDragon(d) {
    if (d.room !== pRoom || !d.alive) return;
    g.fillStyle = d.color;
    // Dragon body (blocky like original)
    const dx = d.x;
    const dy = d.y;
    // Body
    g.fillRect(dx, dy, 16, 10);
    // Head
    g.fillRect(dx + 12, dy - 6, 8, 8);
    // Mouth (open when near player)
    const dist = Math.abs(px - dx) + Math.abs(py - dy);
    if (dist < 40) {
      g.fillRect(dx + 18, dy - 4, 6, 2);
      g.fillRect(dx + 18, dy - 1, 6, 2);
    }
    // Legs
    g.fillRect(dx + 2, dy + 10, 3, 4);
    g.fillRect(dx + 10, dy + 10, 3, 4);
    // Tail
    g.fillRect(dx - 6, dy + 4, 8, 3);
    g.fillRect(dx - 10, dy + 2, 6, 3);
    // Eye
    g.fillStyle = '#ffffff';
    g.fillRect(dx + 16, dy - 4, 2, 2);
  }

  function drawBat() {
    if (!bat || bat.room !== pRoom) return;
    g.fillStyle = C.bat;
    const bx = bat.x;
    const by = bat.y;
    // Body
    g.fillRect(bx, by, 6, 6);
    // Wings (flap)
    const wingOff = Math.sin(Date.now() / 80) * 3;
    g.fillRect(bx - 8, by - 2 + wingOff, 8, 4);
    g.fillRect(bx + 6, by - 2 - wingOff, 8, 4);
    // Eyes
    g.fillStyle = '#ff0000';
    g.fillRect(bx + 1, by + 1, 2, 2);
    g.fillRect(bx + 3, by + 1, 2, 2);
  }

  function drawRoom() {
    const room = ROOMS[pRoom];
    if (!room) return;

    // Background
    g.fillStyle = room.bg;
    g.fillRect(0, 0, VW, VH);

    // Walls
    g.fillStyle = room.wallColor;
    for (const w of room.walls) {
      g.fillRect(w[0], w[1], w[2], w[3]);
    }

    // Gate indicator if castle is locked
    if (gates[pRoom] && gates[pRoom].locked) {
      g.fillStyle = room.wallColor;
      // Draw gate bars across entrance
      const exits = room.exits;
      if (exits.down) {
        const cx = VW / 2;
        for (let gx = cx - 18; gx < cx + 20; gx += 6) {
          g.fillRect(gx, VH - 8, 3, 8);
        }
      }
    }
  }

  // HUD drawn on canvas (for embed mode)
  function drawHUD() {
    const isEmbed = document.body.classList.contains('embed') || document.body.classList.contains('fullscreen');
    if (!isEmbed) return;
    g.fillStyle = 'rgba(0,0,0,0.5)';
    g.fillRect(0, 0, VW, 14);
    g.fillStyle = C.hud;
    g.font = '8px monospace';
    g.textAlign = 'left';
    const room = ROOMS[pRoom];
    g.fillText(room ? room.name : '', 4, 10);
    g.textAlign = 'right';
    g.fillText(carriedItem ? carriedItem.name : '', VW - 4, 10);
    g.textAlign = 'left';
  }

  // Update dragon AI
  function updateDragons() {
    for (const d of dragons) {
      if (!d.alive) continue;

      // Move toward player if in same room
      if (d.room === pRoom) {
        const ddx = px - d.x;
        const ddy = py - d.y;
        const dist = Math.sqrt(ddx * ddx + ddy * ddy);
        if (dist > 2) {
          d.x += (ddx / dist) * d.speed;
          d.y += (ddy / dist) * d.speed;
        }

        // Check if dragon catches player
        if (rectOverlap(px, py, PW, PH, d.x - 2, d.y - 6, 24, 20)) {
          // Check if player has sword
          if (carriedItem && carriedItem.id === 'sword') {
            d.alive = false;
            beep(100, 0.3); beep(80, 0.2);
          } else {
            // Player dies
            state = 'dead';
            beep(200, 0.2); beep(100, 0.3); beep(60, 0.4);
          }
        }
      } else if (d.guardItem) {
        // Chase guarded item if it's been moved
        const item = items.find(i => i.id === d.guardItem);
        if (item && item.room !== '__carried__' && item.room !== d.room) {
          // Slowly migrate toward item's room (simplified: just teleport occasionally)
          if (Math.random() < 0.002) d.room = item.room;
        }
        if (item && item.room === '__carried__' && pRoom !== d.room) {
          if (Math.random() < 0.005) d.room = pRoom;
        }
      }

      // Wander if not in player's room
      if (d.room !== pRoom) {
        d.x += (Math.random() - 0.5) * 0.5;
        d.y += (Math.random() - 0.5) * 0.5;
        d.x = Math.max(10, Math.min(VW - 20, d.x));
        d.y = Math.max(10, Math.min(VH - 20, d.y));
      }
    }
  }

  // Update bat
  function updateBat() {
    if (!bat) return;
    bat.x += bat.dx;
    bat.y += bat.dy;
    if (bat.x < 10 || bat.x > VW - 16) bat.dx = -bat.dx;
    if (bat.y < 10 || bat.y > VH - 16) bat.dy = -bat.dy;

    bat.swapTimer++;
    // Bat steals/swaps items
    if (bat.room === pRoom && bat.swapTimer > 180) {
      // Try to swap with a nearby item
      for (const item of items) {
        if (item.room === pRoom && rectOverlap(bat.x, bat.y, 6, 6, item.x, item.y, item.w, item.h)) {
          if (bat.carriedItem) {
            const old = bat.carriedItem;
            old.room = pRoom;
            old.x = bat.x;
            old.y = bat.y;
          }
          bat.carriedItem = item;
          item.room = '__bat__';
          bat.swapTimer = 0;
          beep(1200, 0.05); beep(800, 0.05);
          break;
        }
      }
    }

    // Bat carries its item
    if (bat.carriedItem) {
      bat.carriedItem.x = bat.x;
      bat.carriedItem.y = bat.y + 8;
    }

    // Random room change
    if (Math.random() < 0.001) {
      const roomIds = Object.keys(ROOMS);
      bat.room = roomIds[Math.floor(Math.random() * roomIds.length)];
      if (bat.carriedItem) bat.carriedItem.room = '__bat__';
    }
  }

  // Player movement
  function movePlayer() {
    let dx = 0, dy = 0;

    if (keys['ArrowLeft'] || keys['a'] || keys['A'] || touch.left) dx = -SPEED;
    if (keys['ArrowRight'] || keys['d'] || keys['D'] || touch.right) dx = SPEED;
    if (keys['ArrowUp'] || keys['w'] || keys['W'] || touch.up) dy = -SPEED;
    if (keys['ArrowDown'] || keys['s'] || keys['S'] || touch.down) dy = SPEED;

    let nx = px + dx;
    let ny = py + dy;

    // Wall collision
    if (!wallCollision(nx, py, PW, PH, pRoom)) px = nx;
    if (!wallCollision(px, ny, PW, PH, pRoom)) py = ny;

    // Bridge item: if carrying bridge, can pass through certain walls
    // (simplified: bridge creates a passthrough zone)

    // Room transitions
    const room = ROOMS[pRoom];
    if (room) {
      if (py < -2 && room.exits.up) {
        if (!isGateLocked(room.exits.up)) {
          pRoom = room.exits.up; py = VH - PH - 8;
        } else { py = 0; }
      }
      if (py > VH - PH + 2 && room.exits.down) {
        if (!isGateLocked(room.exits.down)) {
          pRoom = room.exits.down; py = 8;
        } else { py = VH - PH; }
      }
      if (px < -2 && room.exits.left) {
        if (!isGateLocked(room.exits.left)) {
          pRoom = room.exits.left; px = VW - PW - 8;
        } else { px = 0; }
      }
      if (px > VW - PW + 2 && room.exits.right) {
        if (!isGateLocked(room.exits.right)) {
          pRoom = room.exits.right; px = 8;
        } else { px = VW - PW; }
      }

      // Clamp to room bounds
      px = Math.max(0, Math.min(VW - PW, px));
      py = Math.max(0, Math.min(VH - PH, py));
    }

    // Item pickup
    for (const item of items) {
      if (item.room === pRoom && rectOverlap(px, py, PW, PH, item.x, item.y, item.w, item.h)) {
        pickUpItem(item);
        break;
      }
    }

    // Win condition: chalice in gold castle
    if (pRoom === 'gold_castle' && carriedItem && carriedItem.id === 'chalice') {
      state = 'won';
      beep(440, 0.15); beep(660, 0.15); beep(880, 0.2); beep(1100, 0.3);
    }
  }

  // Resize
  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width * DPR;
    canvas.height = rect.height * DPR;
    g.setTransform(DPR * rect.width / VW, 0, 0, DPR * rect.height / VH, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();

  // Draw title screen
  function drawTitle() {
    g.fillStyle = '#000000';
    g.fillRect(0, 0, VW, VH);

    g.fillStyle = C.chalice;
    g.font = 'bold 16px "Press Start 2P", monospace';
    g.textAlign = 'center';
    g.fillText('ADVENTURE', VW / 2, 60);

    g.fillStyle = C.text;
    g.font = '8px monospace';
    g.fillText('Find the enchanted chalice', VW / 2, 90);
    g.fillText('Return it to the gold castle', VW / 2, 104);

    g.fillStyle = '#808080';
    g.fillText('3 dragons guard the realm', VW / 2, 130);
    g.fillText('Use the sword to slay them', VW / 2, 144);

    // Flashing start text
    if (Math.floor(Date.now() / 500) % 2) {
      g.fillStyle = C.hud;
      g.fillText('Press SPACE or START', VW / 2, 180);
    }
    g.textAlign = 'left';
  }

  function drawWin() {
    g.fillStyle = '#000000';
    g.fillRect(0, 0, VW, VH);
    g.fillStyle = C.chalice;
    g.font = 'bold 14px "Press Start 2P", monospace';
    g.textAlign = 'center';
    g.fillText('YOU WON!', VW / 2, 80);
    g.fillStyle = C.text;
    g.font = '8px monospace';
    g.fillText('The chalice is returned!', VW / 2, 110);
    g.fillText('The kingdom is saved!', VW / 2, 126);
    if (Math.floor(Date.now() / 500) % 2) {
      g.fillStyle = C.hud;
      g.fillText('Press SPACE to play again', VW / 2, 170);
    }
    g.textAlign = 'left';
  }

  function drawDead() {
    g.fillStyle = '#000000';
    g.fillRect(0, 0, VW, VH);
    g.fillStyle = '#c80000';
    g.font = 'bold 14px "Press Start 2P", monospace';
    g.textAlign = 'center';
    g.fillText('GAME OVER', VW / 2, 80);
    g.fillStyle = '#808080';
    g.font = '8px monospace';
    g.fillText('A dragon caught you!', VW / 2, 110);
    if (Math.floor(Date.now() / 500) % 2) {
      g.fillStyle = C.hud;
      g.fillText('Press SPACE to try again', VW / 2, 160);
    }
    g.textAlign = 'left';
  }

  // Update external HUD
  function updateExternalHUD() {
    const room = ROOMS[pRoom];
    if (roomNameEl) roomNameEl.textContent = room ? room.name : '???';
    if (itemNameEl) itemNameEl.textContent = carriedItem ? carriedItem.name : 'None';
  }

  // Main loop
  function loop() {
    resize();

    if (state === 'title') {
      drawTitle();
    } else if (state === 'won') {
      drawWin();
    } else if (state === 'dead') {
      drawDead();
    } else {
      movePlayer();
      updateDragons();
      updateBat();

      drawRoom();

      // Draw items in room
      for (const item of items) {
        if (item.room === pRoom) drawItem(item);
      }
      // Draw carried item
      if (carriedItem) drawItem(carriedItem);

      // Draw bat's carried item if bat is in room
      if (bat && bat.carriedItem && bat.room === pRoom) {
        const bi = bat.carriedItem;
        g.fillStyle = bi.color;
        g.fillRect(bat.x, bat.y + 8, bi.w, bi.h);
      }

      // Draw dragons
      for (const d of dragons) drawDragon(d);

      // Draw bat
      drawBat();

      // Draw player
      drawPlayer(px, py);

      drawHUD();
      updateExternalHUD();
    }

    requestAnimationFrame(loop);
  }

  loop();
})();
