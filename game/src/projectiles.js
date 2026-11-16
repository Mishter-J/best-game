// Bolts, shells and their impacts. One job: move every projectile and resolve its hits.
import { CORE } from './config.js';
import { dist2 } from './random.js';
import { damageEnemy } from './enemies.js';
import { spawnBurst, spawnRing } from './particles.js';

export function updateProjectiles(state, dt) {
  for (let i = state.projectiles.length - 1; i >= 0; i -= 1) {
    const pr = state.projectiles[i];
    if (pr.kind === 'nova') {
      // Lobbed shell: steers gently toward its target point, then bursts.
      const dx = pr.tx - pr.x;
      const dy = pr.ty - pr.y;
      const d = Math.hypot(dx, dy);
      const step = pr.speed * dt;
      if (d <= step + 4) {
        burstNova(state, pr);
        state.projectiles.splice(i, 1);
        continue;
      }
      pr.x += (dx / d) * step;
      pr.y += (dy / d) * step;
      continue;
    }
    pr.x += pr.vx * dt;
    pr.y += pr.vy * dt;
    let dead = false;
    const dxC = pr.x - CORE.x;
    const dyC = pr.y - CORE.y;
    if (dxC * dxC + dyC * dyC > 340 * 340) dead = true;
    if (!dead) {
      for (let j = state.enemies.length - 1; j >= 0; j -= 1) {
        const e = state.enemies[j];
        const rr = e.r + pr.r + 2;
        if (dist2(pr.x, pr.y, e.x, e.y) <= rr * rr) {
          const killed = damageEnemy(state, e, pr.dmg, false);
          if (killed && pr.tower) pr.tower.kills += 1;
          state.stats.hits += 1;
          spawnBurst(state, pr.x, pr.y, pr.color, 4, 90);
          pr.pierce -= 1;
          if (pr.pierce <= 0) {
            dead = true;
            break;
          }
        }
      }
    }
    if (dead) state.projectiles.splice(i, 1);
  }
}

function burstNova(state, pr) {
  spawnRing(state, pr.x, pr.y, pr.color, pr.blast, 0.4);
  spawnBurst(state, pr.x, pr.y, pr.color, 16, 220);
  state.sound.explode();
  for (let j = state.enemies.length - 1; j >= 0; j -= 1) {
    const e = state.enemies[j];
    if (dist2(pr.x, pr.y, e.x, e.y) <= pr.blast * pr.blast) {
      const killed = damageEnemy(state, e, pr.dmg, false);
      if (killed && pr.tower) pr.tower.kills += 1;
      state.stats.hits += 1;
    }
  }
}

export function drawProjectiles(ctx, state) {
  for (const pr of state.projectiles) {
    ctx.save();
    ctx.shadowColor = pr.color;
    ctx.shadowBlur = 10;
    ctx.fillStyle = pr.color;
    if (pr.kind === 'nova') {
      ctx.beginPath();
      ctx.arc(pr.x, pr.y, pr.r + 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(pr.x, pr.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (pr.kind === 'rail') {
      const len = 16;
      const a = Math.atan2(pr.vy, pr.vx);
      ctx.translate(pr.x, pr.y);
      ctx.rotate(a);
      ctx.fillRect(-len, -2, len * 2, 4);
      ctx.fillStyle = '#fff';
      ctx.fillRect(-len, -1, len * 2, 2);
    } else {
      ctx.beginPath();
      ctx.arc(pr.x, pr.y, pr.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(pr.x, pr.y, pr.r * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}
