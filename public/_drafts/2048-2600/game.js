(() => {
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
