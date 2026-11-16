// Husks: the enemies that spiral in from the dark toward the core. One job: their
// definitions, spawning, spiral movement and drawing.
import { CORE, ENEMY_DEFS, SPAWN_R, TOTAL_WAVES } from './config.js';
import { angleDiff, clamp, range } from './random.js';
import { spawnBurst, spawnRing, spawnText } from './particles.js';

export function hpMult(wave) {
  return 1 + 0.16 * (wave - 1);
}

export function speedMult(wave) {
  return Math.min(1.35, 1 + 0.03 * (wave - 1));
}

export function spawnEnemy(state, type, angle) {
  const def = ENEMY_DEFS[type];
  const a = angle === undefined ? state.rng() * Math.PI * 2 : angle;
  const enemy = {
    type,
    def,
    angle: a,
    radius: SPAWN_R + range(state.rng, 0, 24),
    hp: Math.round(def.hp * hpMult(state.wave)),
    maxHp: Math.round(def.hp * hpMult(state.wave)),
    radial: def.radial * speedMult(state.wave) * range(state.rng, 0.92, 1.08),
    angular: def.angular * range(state.rng, 0.85, 1.15),
    r: def.r,
    slow: 0,
    slowTimer: 0,
    flash: 0,
    wobble: state.rng() * Math.PI * 2,
    x: 0,
    y: 0,
  };
  enemy.x = CORE.x + Math.cos(a) * enemy.radius;
  enemy.y = CORE.y + Math.sin(a) * enemy.radius;
  state.enemies.push(enemy);
  return enemy;
}

// Returns 'core' when the husk reaches the core, else null.
export function updateEnemy(state, e, dt) {
  const slowFactor = e.slowTimer > 0 ? 1 - e.slow : 1;
  e.slowTimer = Math.max(0, e.slowTimer - dt);
  e.flash = Math.max(0, e.flash - dt);
  e.radius -= e.radial * slowFactor * dt;
  let ang = e.angular * slowFactor;
  if (e.def.zigzag) ang += Math.sin(state.time * 3 + e.wobble) * 0.5;
  e.angle += ang * dt;
  e.x = CORE.x + Math.cos(e.angle) * e.radius;
  e.y = CORE.y + Math.sin(e.angle) * e.radius;
  if (e.radius <= CORE.r + e.r * 0.4) return 'core';
  return null;
}

export function damageEnemy(state, e, dmg, silent) {
  e.hp -= dmg;
  e.flash = 0.09;
  state.stats.damage += dmg;
  if (e.hp <= 0) {
    killEnemy(state, e);
    return true;
  }
  if (!silent && state.rng() < 0.25) state.sound.hit();
  return false;
}

export function killEnemy(state, e) {
  const idx = state.enemies.indexOf(e);
  if (idx === -1) return;
  state.enemies.splice(idx, 1);
  const comboMult = 1 + 0.25 * Math.min(8, state.combo);
  const dust = Math.round(e.def.dust * state.mods.dust * comboMult);
  state.stardust += dust;
  state.stats.earned += dust;
  state.score += Math.round(e.def.score * (1 + 0.1 * Math.min(10, state.combo)));
  state.kills += 1;
  state.combo += 1;
  state.comboTimer = 3;
  spawnBurst(state, e.x, e.y, e.def.color, e.type === 'boss' ? 40 : 12, e.type === 'boss' ? 260 : 160);
  spawnRing(state, e.x, e.y, e.def.color, e.r * 3, 0.35);
  spawnText(state, e.x, e.y - e.r - 6, `+${dust}`, '#ffd166', e.type === 'boss');
  state.sound.coin();
  if (e.type === 'boss') {
    state.shake = Math.max(state.shake, 10);
    spawnText(state, CORE.x, CORE.y - 70, 'TITAN DOWN  +500', '#ff5d8f', true);
  }
}

export function hitCore(state, e) {
  const idx = state.enemies.indexOf(e);
  if (idx !== -1) state.enemies.splice(idx, 1);
  state.coreHp -= e.def.coreDmg;
  state.combo = 0;
  state.comboTimer = 0;
  state.shake = Math.max(state.shake, 7);
  state.flash = 0.25;
  spawnBurst(state, e.x, e.y, '#ff5470', 18, 200);
  spawnText(state, e.x, e.y - 14, `-${e.def.coreDmg} CORE`, '#ff5470', true);
  state.sound.coreHit();
  if (state.coreHp <= 0) {
    state.coreHp = 0;
    state.screen = 'over';
    state.sound.lose();
  }
}

function poly(ctx, x, y, r, sides, rot) {
  ctx.beginPath();
  for (let i = 0; i < sides; i += 1) {
    const a = rot + (i / sides) * Math.PI * 2;
    const px = x + Math.cos(a) * r;
    const py = y + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

export function drawEnemy(ctx, state, e) {
  const c = e.def.color;
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.rotate(e.angle + Math.PI / 2);
  const pulse = 1 + 0.08 * Math.sin(state.time * 6 + e.wobble);
  const r = e.r * pulse;
  ctx.shadowColor = c;
  ctx.shadowBlur = 12;
  ctx.fillStyle = e.flash > 0 ? '#ffffff' : c;
  ctx.globalAlpha = 0.95;
  if (e.type === 'mite') {
    poly(ctx, 0, 0, r, 3, 0);
    ctx.fill();
  } else if (e.type === 'skitter') {
    ctx.beginPath();
    ctx.moveTo(r * 1.3, 0);
    ctx.lineTo(-r, r * 0.7);
    ctx.lineTo(-r * 0.4, 0);
    ctx.lineTo(-r, -r * 0.7);
    ctx.closePath();
    ctx.fill();
  } else if (e.type === 'crawler') {
    poly(ctx, 0, 0, r, 6, state.time * 0.4);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(10,10,30,0.7)';
    poly(ctx, 0, 0, r * 0.45, 6, -state.time * 0.4);
    ctx.fill();
  } else if (e.type === 'brute') {
    poly(ctx, 0, 0, r, 8, state.time * 0.2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.6;
    poly(ctx, 0, 0, r * 0.6, 8, -state.time * 0.2);
    ctx.stroke();
  } else if (e.type === 'boss') {
    poly(ctx, 0, 0, r, 10, state.time * 0.3);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#2a0a18';
    poly(ctx, 0, 0, r * 0.55, 10, -state.time * 0.3);
    ctx.fill();
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // HP bar for hurt enemies and the boss.
  if (e.hp < e.maxHp) {
    const w = Math.max(26, e.r * 2);
    const frac = clamp(e.hp / e.maxHp, 0, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(e.x - w / 2, e.y - e.r - 12, w, 5);
    ctx.fillStyle = frac > 0.5 ? '#7ee787' : frac > 0.25 ? '#ffd166' : '#ff5470';
    ctx.fillRect(e.x - w / 2, e.y - e.r - 12, w * frac, 5);
  }
  void angleDiff;
}
