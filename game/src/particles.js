// Sparks, shockwave rings and floating score text. One job: every transient visual effect.
export function spawnBurst(state, x, y, color, count, speed) {
  for (let i = 0; i < count; i += 1) {
    const a = state.rng() * Math.PI * 2;
    const v = speed * (0.3 + state.rng() * 0.7);
    state.particles.push({
      x, y,
      vx: Math.cos(a) * v, vy: Math.sin(a) * v,
      life: 0.45 + state.rng() * 0.35, maxLife: 0.8,
      size: 2 + state.rng() * 3, color, kind: 'spark',
    });
  }
}

export function spawnRing(state, x, y, color, maxR, life) {
  state.particles.push({
    x, y, vx: 0, vy: 0, life, maxLife: life,
    size: maxR, color, kind: 'ring',
  });
}

export function spawnText(state, x, y, text, color, big) {
  state.texts.push({
    x, y, vy: -34, life: 0.9, maxLife: 0.9, text, color, big: !!big,
  });
}

export function updateEffects(state, dt) {
  for (let i = state.particles.length - 1; i >= 0; i -= 1) {
    const p = state.particles[i];
    p.life -= dt;
    if (p.life <= 0) {
      state.particles.splice(i, 1);
      continue;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.96;
    p.vy *= 0.96;
  }
  for (let i = state.texts.length - 1; i >= 0; i -= 1) {
    const t = state.texts[i];
    t.life -= dt;
    t.y += t.vy * dt;
    if (t.life <= 0) state.texts.splice(i, 1);
  }
  for (let i = state.beams.length - 1; i >= 0; i -= 1) {
    const b = state.beams[i];
    b.life -= dt;
    if (b.life <= 0) state.beams.splice(i, 1);
  }
}

export function drawEffects(ctx, state) {
  for (const p of state.particles) {
    const a = Math.max(0, p.life / p.maxLife);
    if (p.kind === 'ring') {
      const prog = 1 - a;
      ctx.globalAlpha = a * 0.8;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 3 * a + 1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * prog + 6, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * a + 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  for (const b of state.beams) {
    const a = Math.max(0, b.life / b.maxLife);
    ctx.globalAlpha = a;
    ctx.strokeStyle = b.color;
    ctx.lineWidth = b.width * a + 1;
    ctx.beginPath();
    ctx.moveTo(b.x1, b.y1);
    ctx.lineTo(b.x2, b.y2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'center';
  for (const t of state.texts) {
    const a = Math.max(0, t.life / t.maxLife);
    ctx.globalAlpha = a;
    ctx.fillStyle = t.color;
    ctx.font = t.big ? 'bold 20px system-ui, sans-serif' : 'bold 14px system-ui, sans-serif';
    ctx.fillText(t.text, t.x, t.y);
  }
  ctx.globalAlpha = 1;
}
