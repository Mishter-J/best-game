// Towers live on ring slots and fire in the direction their slot faces. One job:
// placement, upgrades, targeting and firing — the player's whole arsenal.
import {
  CORE, RING_RADII, RING_SLOTS, TOWER_DEFS,
} from './config.js';
import { angleDiff, clamp, dist2 } from './random.js';
import { spawnBurst, spawnRing } from './particles.js';
import { damageEnemy } from './enemies.js';

export function slotAngle(state, ringIndex, slot) {
  return state.rings[ringIndex].angle + (slot * Math.PI * 2) / RING_SLOTS;
}

export function slotPos(state, ringIndex, slot) {
  const a = slotAngle(state, ringIndex, slot);
  const r = RING_RADII[ringIndex];
  return { x: CORE.x + Math.cos(a) * r, y: CORE.y + Math.sin(a) * r, angle: a };
}

export function towerCost(state, key) {
  return Math.round(TOWER_DEFS[key].cost * state.mods.cost);
}

export function upgradeCost(state, tower) {
  return Math.round(TOWER_DEFS[tower.key].cost * 0.8 * tower.level * state.mods.cost);
}

export function sellValue(tower) {
  let spent = TOWER_DEFS[tower.key].cost;
  for (let l = 1; l < tower.level; l += 1) spent += Math.round(TOWER_DEFS[tower.key].cost * 0.8 * l);
  return Math.round(spent * 0.7);
}

export function towerAt(state, ringIndex, slot) {
  return state.towers.find((t) => t.ring === ringIndex && t.slot === slot) || null;
}

export function placeTower(state, ringIndex, slot, key) {
  if (towerAt(state, ringIndex, slot)) return null;
  const cost = towerCost(state, key);
  if (state.stardust < cost) return null;
  state.stardust -= cost;
  const tower = {
    key, ring: ringIndex, slot, level: 1, cooldown: 0, kills: 0, angle: 0,
  };
  state.towers.push(tower);
  state.stats.built += 1;
  const p = slotPos(state, ringIndex, slot);
  spawnRing(state, p.x, p.y, TOWER_DEFS[key].color, 30, 0.4);
  state.sound.build();
  return tower;
}

export function upgradeTower(state, tower) {
  if (tower.level >= 3) return false;
  const cost = upgradeCost(state, tower);
  if (state.stardust < cost) return false;
  state.stardust -= cost;
  tower.level += 1;
  const p = slotPos(state, tower.ring, tower.slot);
  spawnRing(state, p.x, p.y, '#ffd166', 40, 0.5);
  spawnBurst(state, p.x, p.y, '#ffd166', 10, 120);
  state.sound.build();
  return true;
}

export function sellTower(state, tower) {
  const idx = state.towers.indexOf(tower);
  if (idx === -1) return 0;
  const value = sellValue(tower);
  state.towers.splice(idx, 1);
  state.stardust += value;
  if (state.selectedTower === tower) state.selectedTower = null;
  state.sound.click();
  return value;
}

function towerStats(state, tower) {
  const def = TOWER_DEFS[tower.key];
  const lv = tower.level - 1;
  return {
    range: def.range * state.mods.range * (1 + 0.08 * lv),
    rate: def.rate * state.mods.rate * (1 + 0.08 * lv),
    dmg: (def.dmg || 0) * state.mods.dmg * Math.pow(1.35, lv),
    dps: (def.dps || 0) * state.mods.dmg * Math.pow(1.35, lv),
    arc: def.arc,
  };
}

function inArc(state, tower, e) {
  const def = TOWER_DEFS[tower.key];
  if (def.arc >= 360) return true;
  const p = slotPos(state, tower.ring, tower.slot);
  const toEnemy = Math.atan2(e.y - p.y, e.x - p.x);
  return Math.abs(angleDiff(toEnemy, p.angle)) <= (def.arc * Math.PI) / 360;
}

function findTarget(state, tower, stats) {
  const p = slotPos(state, tower.ring, tower.slot);
  let best = null;
  let bestScore = Infinity;
  for (const e of state.enemies) {
    const d2 = dist2(p.x, p.y, e.x, e.y);
    if (d2 > stats.range * stats.range) continue;
    if (!inArc(state, tower, e)) continue;
    // Prefer the husk closest to the core — the most dangerous one.
    const score = e.radius + (e.type === 'boss' ? -40 : 0);
    if (score < bestScore) {
      bestScore = score;
      best = e;
    }
  }
  return best;
}

export function updateTowers(state, dt) {
  for (const tower of state.towers) {
    tower.cooldown -= dt;
    const def = TOWER_DEFS[tower.key];
    const stats = towerStats(state, tower);
    const p = slotPos(state, tower.ring, tower.slot);
    tower.angle = p.angle;
    if (def.key === 'frost') {
      if (tower.cooldown <= 0) {
        tower.cooldown = 1 / stats.rate;
        for (const e of state.enemies) {
          if (dist2(p.x, p.y, e.x, e.y) <= stats.range * stats.range) {
            e.slow = def.slow;
            e.slowTimer = 1.2;
            if (stats.dmg > 0) damageEnemy(state, e, stats.dmg, true);
          }
        }
      }
      continue;
    }
    if (def.key === 'lance') {
      const target = findTarget(state, tower, stats);
      if (target) {
        damageEnemy(state, target, stats.dps * dt, true);
        // Count accuracy in half-second ticks, not per frame, so the beam
        // reads as one sustained hit rather than sixty hits a second.
        tower.beamAcc = (tower.beamAcc || 0) + dt;
        if (tower.beamAcc >= 0.5) {
          tower.beamAcc -= 0.5;
          state.stats.shots += 1;
          state.stats.hits += 1;
        }
        state.beams.push({
          x1: p.x, y1: p.y, x2: target.x, y2: target.y,
          life: 0.1, maxLife: 0.1, color: def.color, width: 3 + tower.level,
        });
      } else {
        tower.beamAcc = 0;
      }
      continue;
    }
    if (tower.cooldown > 0) continue;
    const target = findTarget(state, tower, stats);
    if (!target) continue;
    tower.cooldown = 1 / stats.rate;
    state.stats.shots += 1;
    if (def.key === 'nova') {
      state.projectiles.push({
        x: p.x, y: p.y, tx: target.x, ty: target.y,
        vx: 0, vy: 0, speed: 420, dmg: stats.dmg, pierce: 0,
        kind: 'nova', color: def.color, r: 6, blast: def.blast, tower,
      });
      state.sound.nova();
    } else {
      const a = Math.atan2(target.y - p.y, target.x - p.x);
      state.projectiles.push({
        x: p.x + Math.cos(a) * 14, y: p.y + Math.sin(a) * 14,
        tx: 0, ty: 0,
        vx: Math.cos(a) * def.projSpeed, vy: Math.sin(a) * def.projSpeed,
        speed: def.projSpeed, dmg: stats.dmg, pierce: def.pierce,
        kind: def.key, color: def.color, r: def.key === 'rail' ? 4 : 3.5, tower,
      });
      if (def.key === 'rail') state.sound.rail();
      else state.sound.shoot();
    }
  }
}

export function drawTowers(ctx, state) {
  for (const tower of state.towers) {
    const def = TOWER_DEFS[tower.key];
    const p = slotPos(state, tower.ring, tower.slot);
    const selected = state.selectedTower === tower;
    ctx.save();
    ctx.translate(p.x, p.y);
    // Range ring for the selected tower.
    if (selected) {
      const stats = towerStats(state, tower);
      ctx.globalAlpha = 0.14;
      ctx.fillStyle = def.color;
      ctx.beginPath();
      ctx.arc(0, 0, stats.range, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = def.color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, stats.range, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    // Base.
    ctx.shadowColor = def.color;
    ctx.shadowBlur = selected ? 18 : 10;
    ctx.fillStyle = '#1a2044';
    ctx.strokeStyle = def.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Barrel points along the slot's facing.
    ctx.rotate(p.angle);
    ctx.shadowBlur = 0;
    ctx.fillStyle = def.color;
    if (def.key === 'frost') {
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e0faff';
      ctx.beginPath();
      ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (def.key === 'nova') {
      ctx.fillRect(0, -5, 15, 10);
      ctx.beginPath();
      ctx.arc(15, 0, 5, 0, Math.PI * 2);
      ctx.fill();
    } else if (def.key === 'lance') {
      ctx.fillRect(0, -3, 18, 6);
      ctx.beginPath();
      ctx.moveTo(18, -4);
      ctx.lineTo(26, 0);
      ctx.lineTo(18, 4);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillRect(0, -3.5, 16, 7);
      ctx.fillRect(13, -2, 6, 4);
    }
    ctx.restore();
    // Level pips.
    ctx.fillStyle = '#ffd166';
    for (let i = 0; i < tower.level; i += 1) {
      ctx.beginPath();
      ctx.arc(p.x - 8 + i * 8, p.y + 17, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    void clamp;
  }
}
