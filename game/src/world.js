// The simulation step: rings, waves, combat, surge, win and loss. One job: advance
// the world by dt seconds, whatever the screen shows.
import { CORE, SURGE_COOLDOWN, SURGE_DAMAGE, SURGE_RADIUS, TOTAL_WAVES } from './config.js';
import { clamp, dist2 } from './random.js';
import { applyProtocol, chooseProtocols, startWave, updateSpawns } from './waves.js';
import { damageEnemy, hitCore, updateEnemy } from './enemies.js';
import { updateTowers } from './towers.js';
import { updateProjectiles } from './projectiles.js';
import { spawnBurst, spawnRing, spawnText, updateEffects } from './particles.js';
import { saveBest } from './state.js';

export { applyProtocol, startWave };

export function step(state, dt) {
  state.time += dt;
  // Combo decay.
  if (state.comboTimer > 0) {
    state.comboTimer -= dt;
    if (state.comboTimer <= 0) state.combo = 0;
  }
  if (state.messageTimer > 0) state.messageTimer -= dt;
  state.shake = Math.max(0, state.shake - dt * 22);
  state.flash = Math.max(0, state.flash - dt * 1.4);
  if (state.surgeCd > 0) state.surgeCd -= dt;

  // Ring physics: velocity decays, angle follows.
  for (const ring of state.rings) {
    ring.angle += ring.vel * dt;
    ring.vel *= Math.pow(0.12, dt);
    if (Math.abs(ring.vel) < 0.02) ring.vel = 0;
  }

  // Surge shockwave expands and hurts once at its front.
  if (state.surgeActive) {
    const s = state.surgeActive;
    s.r += 620 * dt;
    for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
      const e = state.enemies[i];
      const d = Math.hypot(e.x - CORE.x, e.y - CORE.y);
      if (!s.hit.has(e) && Math.abs(d - s.r) < 26) {
        s.hit.add(e);
        e.slow = Math.max(e.slow, 0.5);
        e.slowTimer = Math.max(e.slowTimer, 3);
        damageEnemy(state, e, SURGE_DAMAGE, true);
      }
    }
    if (s.r > SURGE_RADIUS + 40) state.surgeActive = null;
  }

  if (state.screen !== 'play') {
    updateEffects(state, dt);
    return;
  }

  if (state.phase === 'wave') {
    updateSpawns(state, dt);
    for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
      const e = state.enemies[i];
      if (updateEnemy(state, e, dt) === 'core') {
        hitCore(state, e);
        if (state.screen !== 'play') return;
      }
    }
    updateTowers(state, dt);
    updateProjectiles(state, dt);
    if (state.spawnQueue.length === 0 && state.enemies.length === 0) {
      waveCleared(state);
    }
  }
  updateEffects(state, dt);
}

function waveCleared(state) {
  const bonus = 100 * state.wave + state.coreHp * 5;
  state.score += bonus;
  state.stardust += 25 + state.wave * 5;
  if (state.wave < TOTAL_WAVES) {
    spawnText(state, CORE.x, CORE.y - 70, `WAVE CLEAR  +${bonus}`, '#7ee787', true);
  }
  state.sound.win();
  if (state.wave >= TOTAL_WAVES) {
    state.screen = 'win';
    state.phase = 'build';
    saveBest(state);
    state.sound.win();
    return;
  }
  state.phase = 'build';
  chooseProtocols(state);
  state.message = `Wave ${state.wave} cleared. Choose a protocol, build, then start Wave ${state.wave + 1}.`;
  state.messageTimer = 8;
}

export function fireSurge(state) {
  if (state.screen !== 'play' || state.surgeCd > 0) return false;
  state.surgeCd = SURGE_COOLDOWN * state.mods.surgeCd;
  state.surgeActive = { r: CORE.r, hit: new Set() };
  spawnRing(state, CORE.x, CORE.y, '#7df9ff', SURGE_RADIUS, 0.55);
  state.shake = Math.max(state.shake, 5);
  state.sound.surge();
  return true;
}

// Rotate the selected ring toward the angle of the nearest threat to that ring's band.
export function autoRotate(state, ringIndex, dt) {
  const ring = state.rings[ringIndex];
  const band = [96, 152, 208][ringIndex];
  let best = null;
  let bestD = Infinity;
  for (const e of state.enemies) {
    const d = Math.abs(e.radius - band);
    if (d < bestD) {
      bestD = d;
      best = e;
    }
  }
  if (!best) return;
  // Aim the nearest empty-or-filled slot at the threat.
  const target = Math.atan2(best.y - CORE.y, best.x - CORE.x);
  const cur = ring.angle % (Math.PI * 2);
  let diff = target - cur;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  // Slots repeat every 45 degrees, so only the remainder matters.
  const slotStep = Math.PI / 4;
  let rem = diff % slotStep;
  if (rem > slotStep / 2) rem -= slotStep;
  if (rem < -slotStep / 2) rem += slotStep;
  ring.vel = clamp(rem * 6, -1.8, 1.8);
  void dt;
}
