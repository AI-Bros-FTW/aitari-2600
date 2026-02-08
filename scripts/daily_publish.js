#!/usr/bin/env node
/*
  AItari 2600 daily publisher (MVP)

  What it does:
  - Reads data/roadmap.json
  - Picks the next game with status "planned"
  - Generates a playable static game in public/play/<slug>/
  - Updates data/games.json (prepend newest)
  - Appends structured lessons to data/lessons.json
  - Creates a diary markdown file at data/diaries/<slug>.md
  - Updates roadmap statuses (planned -> published)

  Requirements: node, npm deps already installed for Next.js site.
  Optional: python3 + pillow for thumbnail generation.

  Run:
    node scripts/daily_publish.js
*/

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = process.cwd();
const dataDir = path.join(ROOT, 'data');
const playDir = path.join(ROOT, 'public', 'play');

const today = new Date();
const isoDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000)
  .toISOString()
  .slice(0, 10);

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}
function writeJson(p, obj) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n');
}

function safeMkdir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function fileExists(p) {
  try { fs.accessSync(p); return true; } catch { return false; }
}

function pickNext(roadmap, isoDate) {
  // Only pick items planned for today (or earlier) and still planned.
  // This prevents accidental publishing ahead of schedule.
  return roadmap.games.find(g => g.status === 'planned' && (!g.plannedDate || g.plannedDate <= isoDate));
}

function slugToTitle(slug) {
  return slug
    .split('-')
    .map(s => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
}

function templateFor(slug) {
  // Use hand-written templates when available; else use a generic tiny arcade template.
  const tplDir = path.join(ROOT, 'templates');
  const indexPath = path.join(tplDir, `${slug}.index.html`);
  const jsPath = path.join(tplDir, `${slug}.game.js`);
  if (fileExists(indexPath) && fileExists(jsPath)) {
    return {
      indexHtml: fs.readFileSync(indexPath, 'utf8'),
      gameJs: fs.readFileSync(jsPath, 'utf8'),
    };
  }

  const title = slugToTitle(slug);
  return {
    indexHtml: `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${title} — AItari 2600</title>
  <style>
    html,body{height:100%;margin:0;background:#0b1020;color:#e8eeff;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;}
    body{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
    .wrap{max-width:980px;margin:0 auto;padding:18px 16px;display:grid;gap:12px}
    .card{border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);border-radius:14px;padding:12px}
    .stage{position:relative;border:1px solid rgba(255,255,255,.12);border-radius:16px;overflow:hidden;height:640px;background:radial-gradient(900px 600px at 30% 20%, rgba(124,240,255,.12), rgba(0,0,0,0));touch-action:none}
    canvas{position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated;image-rendering:crisp-edges}
    .muted{opacity:.75}

    /* Mobile controls scaffold */
    .mctrl{position:absolute;inset:0;display:none;pointer-events:none}
    .mctrl .btn{pointer-events:auto;user-select:none;-webkit-user-select:none;touch-action:none;
      background:rgba(0,0,0,0.25);border:1px solid rgba(255,255,255,0.18);color:#e8eeff;
      border-radius:14px;padding:14px 16px;font-weight:800;backdrop-filter:blur(6px)}
    .mctrl .label{position:absolute;left:12px;top:12px;font-size:12px;opacity:0.75;
      background:rgba(0,0,0,0.18);border:1px solid rgba(255,255,255,0.12);border-radius:999px;padding:6px 10px}
    .mctrl .controls{position:absolute;left:12px;bottom:12px;display:grid;gap:10px}
    @media (pointer:coarse), (max-width: 760px){ .mctrl{display:block} }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <h1 style="margin:0;font-size:22px">${title}</h1>
      <p class="muted" style="margin:6px 0 0">A small placeholder game. Template not found for <code>${slug}</code>.</p>
    </div>
    <div class="stage">
      <canvas id="c"></canvas>
      <div class="mctrl">
        <div class="label">Mobile controls</div>
        <div class="controls">
          <button class="btn" id="mobA">A</button>
          <button class="btn" id="mobB">B</button>
        </div>
      </div>
    </div>
  </div>
  <script src="game.js"></script>
</body>
</html>
`,
      gameJs: `(() => {
  const canvas = document.getElementById('c');
  const g = canvas.getContext('2d');

  // Mobile control scaffold (templates should replace with real mapping)
  const mobA = document.getElementById('mobA');
  const mobB = document.getElementById('mobB');
  const mobile = { a:false, b:false };
  function bindHold(el, key){
    if (!el) return;
    const on=(e)=>{ e.preventDefault(); mobile[key]=true; };
    const off=(e)=>{ e.preventDefault(); mobile[key]=false; };
    el.addEventListener('pointerdown', on);
    el.addEventListener('pointerup', off);
    el.addEventListener('pointercancel', off);
    el.addEventListener('pointerleave', off);
  }
  bindHold(mobA,'a');
  bindHold(mobB,'b');

  const DPR = Math.min(devicePixelRatio||1,2);
  const low = document.createElement('canvas');
  const ctx = low.getContext('2d');
  low.width = 320; low.height = 180;
  function resize(){
    const r = canvas.getBoundingClientRect();
    canvas.width = Math.round(r.width*DPR);
    canvas.height = Math.round(r.height*DPR);
    g.imageSmoothingEnabled = false;
  }
  addEventListener('resize', resize);
  resize();
  let t=0;
  function loop(){
    t += 0.016;
    ctx.fillStyle = '#0b1020'; ctx.fillRect(0,0,320,180);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    for(let y=0;y<180;y+=2) ctx.fillRect(0,y,320,1);
    ctx.fillStyle = '#7cf0ff';
    ctx.fillRect(40+Math.sin(t)*60, 80, 240, 20);
    ctx.fillStyle = '#e8eeff';
    ctx.font = '12px ui-monospace, monospace';
    ctx.fillText('No template yet. Coming soon.', 68, 52);
    ctx.fillText('Mobile scaffold: '+(mobile.a?'A ':'')+(mobile.b?'B':''), 68, 68);
    g.clearRect(0,0,canvas.width,canvas.height);
    g.drawImage(low,0,0,canvas.width,canvas.height);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
`,
    };
}

function assertMobileControls(slug, outDir) {
  const indexPath = path.join(outDir, 'index.html');
  const jsPath = path.join(outDir, 'game.js');
  const index = fs.readFileSync(indexPath, 'utf8');
  const js = fs.readFileSync(jsPath, 'utf8');

  // Lightweight guardrail: require a mobile controls block + pointer events binding.
  // (Not perfect validation; it just prevents forgetting entirely.)
  const hasOverlay = /class=\"mctrl\"|id=\"mctrl\"/.test(index);
  const hasCoarseMedia = /\(pointer:\s*coarse\)/.test(index);
  const hasTouchDisable = /touch-action\s*:\s*none/.test(index);
  const hasPointerBind = /addEventListener\(\s*['\"]pointerdown['\"]/.test(js) || /ontouchstart/.test(js);

  // Prevent accidental text selection on mobile.
  const hasNoSelect = /user-select\s*:\s*none/.test(index) || /-webkit-user-select\s*:\s*none/.test(index);

  const problems = [];
  if (!hasOverlay) problems.push('missing .mctrl mobile overlay in index.html');
  if (!hasCoarseMedia) problems.push('missing (pointer: coarse) media query to show mobile controls');
  if (!hasTouchDisable) problems.push('missing touch-action: none (prevents page scroll while playing)');
  if (!hasNoSelect) problems.push('missing user-select: none (prevents text selection while playing)');
  if (!hasPointerBind) problems.push('missing pointer/touch event bindings in game.js');

  if (problems.length) {
    const msg = `Mobile controls check failed for ${slug}:\n- ${problems.join('\n- ')}\n\nFix: add an on-screen mobile control UI + map it into the game loop.`;
    throw new Error(msg);
  }
}

function writeGameFiles(slug, title, atariInspiration) {
  const out = path.join(playDir, slug);
  safeMkdir(out);
  const tpl = templateFor(slug);
  fs.writeFileSync(path.join(out, 'index.html'), tpl.indexHtml);
  fs.writeFileSync(path.join(out, 'game.js'), tpl.gameJs);
  fs.writeFileSync(path.join(out, 'README.txt'), `${title} (AItari 2600)\n\nInspiration: ${atariInspiration}\n\nControls are described in-game.\n`);

  // Enforce mobile controls requirement for every shipped game.
  assertMobileControls(slug, out);
}

function makeThumbnail(slug) {
  // best-effort thumbnail using python pillow if available.
  const outPng = path.join(playDir, slug, 'thumbnail.png');
  try {
    execSync('python3 -c "import PIL"', { stdio: 'ignore' });
  } catch {
    return;
  }

  const py = `from PIL import Image, ImageDraw\n`+
    `img=Image.new('RGBA',(512,320),(11,16,32,255))\n`+
    `d=ImageDraw.Draw(img)\n`+
    `for y in range(0,320,4): d.rectangle([0,y,512,y+1], fill=(255,255,255,12))\n`+
    `d.rectangle([40,60,472,260], outline=(255,255,255,60), width=4)\n`+
    `d.text((52,82),'${slug.replace(/'/g,"\\'")}', fill=(232,238,255,220))\n`+
    `img.save('${outPng}')\n`;
  try {
    execSync(`python3 - <<'PY'\n${py}\nPY`, { stdio: 'ignore' });
  } catch {
    // ignore
  }
}

function addGameMeta(games, slug, title, atariInspiration) {
  const meta = {
    slug,
    title,
    date: isoDate,
    version: '0.1.0',
    thumbnail: `/play/${slug}/thumbnail.png`,
    playUrl: `/play/${slug}/index.html`,
    atariInspiration,
  };
  // remove existing
  const filtered = games.filter(g => g.slug !== slug);
  filtered.unshift(meta);
  return filtered;
}

function appendLessons(lessons, slug, title) {
  const pack = [
    {
      date: isoDate,
      game: title,
      slug,
      category: 'workflow',
      lesson: 'Ship a playable loop first; add polish only after the loop feels good.',
    },
    {
      date: isoDate,
      game: title,
      slug,
      category: 'design',
      lesson: 'Retro readability matters: high contrast, chunky pixels, and clear feedback.',
    },
  ];
  return lessons.concat(pack);
}

function writeDiary(slug, title, atariInspiration) {
  const dir = path.join(dataDir, 'diaries');
  safeMkdir(dir);
  const fp = path.join(dir, `${slug}.md`);
  if (fileExists(fp)) return;
  const md = `# ${title} — Developer Diary (Neo)\n\n`+
    `Inspiration: ${atariInspiration}\n\n`+
    `## What went well\n- Shipped a playable MVP loop.\n\n`+
    `## What was challenging\n- Tuning difficulty so it feels fair but not boring.\n\n`+
    `## Compromises\n- Not hardware-accurate; it’s web-first.\n\n`+
    `## Lessons learned\n- Ship the loop, then polish.\n`;
  fs.writeFileSync(fp, md);
}

function main() {
  const roadmapPath = path.join(dataDir, 'roadmap.json');
  const gamesPath = path.join(dataDir, 'games.json');
  const lessonsPath = path.join(dataDir, 'lessons.json');

  const roadmap = readJson(roadmapPath);
  const next = pickNext(roadmap, isoDate);
  if (!next) {
    console.log(`No planned games scheduled for ${isoDate}. Nothing to publish.`);
    process.exit(0);
  }

  // Update roadmap status
  next.status = 'published';
  roadmap.updatedAt = isoDate;

  const slug = next.slug;
  const title = next.title || slugToTitle(slug);
  const insp = next.atariInspiration || 'Atari-ish';

  safeMkdir(playDir);
  writeGameFiles(slug, title, insp);
  makeThumbnail(slug);

  const games = readJson(gamesPath);
  const updatedGames = addGameMeta(games, slug, title, insp);

  const lessons = readJson(lessonsPath);
  const updatedLessons = appendLessons(lessons, slug, title);

  writeDiary(slug, title, insp);

  writeJson(roadmapPath, roadmap);
  writeJson(gamesPath, updatedGames);
  writeJson(lessonsPath, updatedLessons);

  console.log(`Published ${slug} (${title}) for ${isoDate}`);
}

main();
