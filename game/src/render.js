// Everything the player sees. One job: draw the board, the HUD, the menus, and rebuild
// the clickable regions (state.ui.hot) every frame so input.js can use them.
import {
  BOTTOM_BAR, COLORS, COMBO_MAX, CORE, FIELD, LEFT_PANEL, RIGHT_PANEL, RING_RADII, RING_SLOTS,
  TOP_BAR, TOTAL_WAVES, TOWER_DEFS, TOWER_ORDER,
} from './config.js';
import { clamp } from './random.js';
import { drawEnemy } from './enemies.js';
import { drawTowers, sellValue, slotPos, towerAt, towerCost, upgradeCost } from './towers.js';
import { drawProjectiles } from './projectiles.js';
import { drawEffects } from './particles.js';
import { waveSummary } from './waves.js';

function fmt(n) {
  return String(Math.floor(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = COLORS.panel;
  rr(ctx, x, y, w, h, 10);
  ctx.fill();
  ctx.strokeStyle = COLORS.panelEdge;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function sectionTitle(ctx, x, y, text) {
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(text, x, y);
}

function button(ctx, hot, x, y, w, h, label, opts) {
  const o = opts || {};
  ctx.fillStyle = o.active ? '#2a3560' : o.disabled ? '#1a1f38' : '#232a52';
  rr(ctx, x, y, w, h, 8);
  ctx.fill();
  ctx.strokeStyle = o.accent || COLORS.panelEdge;
  ctx.lineWidth = o.active ? 2 : 1.5;
  ctx.stroke();
  ctx.fillStyle = o.disabled ? COLORS.faint : (o.color || COLORS.text);
  ctx.font = o.font || 'bold 14px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, x + w / 2, y + h / 2 + 5);
  hot.push({ x, y, w, h, action: o.action, arg: o.arg });
}

export function render(state, ctx) {
  ctx.save();
  if (state.shake > 0) {
    ctx.translate((state.rng() - 0.5) * state.shake, (state.rng() - 0.5) * state.shake);
  }
  drawBackground(ctx, state);
  drawRings(ctx, state);
  drawCore(ctx, state);
  for (const e of state.enemies) drawEnemy(ctx, state, e);
  drawTowers(ctx, state);
  drawProjectiles(ctx, state);
  drawEffects(ctx, state);
  if (state.surgeActive) {
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#7df9ff';
    ctx.beginPath();
    ctx.arc(CORE.x, CORE.y, state.surgeActive.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  drawTopBar(ctx, state);
  drawLeftPanel(ctx, state);
  drawRightPanel(ctx, state);
  drawBottomBar(ctx, state);
  if (state.flash > 0) {
    ctx.fillStyle = `rgba(255, 60, 80, ${state.flash * 0.5})`;
    ctx.fillRect(0, 0, 1280, 720);
  }
  if (state.screen === 'title') drawTitle(ctx, state);
  else if (state.screen === 'pause') drawPause(ctx, state);
  else if (state.screen === 'over') drawEnd(ctx, state, false);
  else if (state.screen === 'win') drawEnd(ctx, state, true);
}

function drawBackground(ctx, state) {
  const g = ctx.createLinearGradient(0, 0, 0, 720);
  g.addColorStop(0, COLORS.bg1);
  g.addColorStop(1, COLORS.bg0);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1280, 720);
  // Nebula blobs.
  ctx.save();
  ctx.globalAlpha = 0.16;
  const neb = [
    [340, 180, 180, '#7c3aed'], [980, 520, 200, '#0e7490'], [620, 620, 160, '#be185d'],
  ];
  for (const [x, y, r, c] of neb) {
    const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, c);
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // Stars.
  for (const s of state.stars) {
    const a = 0.35 + 0.45 * (0.5 + 0.5 * Math.sin(state.time * s.sp + s.tw));
    ctx.globalAlpha = a;
    ctx.fillStyle = '#dbe4ff';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // Playfield frame.
  ctx.strokeStyle = 'rgba(46, 58, 110, 0.7)';
  ctx.lineWidth = 1.5;
  rr(ctx, FIELD.x0, FIELD.y0, FIELD.x1 - FIELD.x0, FIELD.y1 - FIELD.y0, 14);
  ctx.stroke();
}

function drawRings(ctx, state) {
  for (let i = 0; i < RING_RADII.length; i += 1) {
    const r = RING_RADII[i];
    const selected = state.selectedRing === i;
    ctx.save();
    ctx.strokeStyle = selected ? '#7df9ff' : 'rgba(125, 249, 255, 0.35)';
    ctx.lineWidth = selected ? 3 : 1.5;
    ctx.shadowColor = '#7df9ff';
    ctx.shadowBlur = selected ? 12 : 4;
    ctx.beginPath();
    ctx.arc(CORE.x, CORE.y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    // Slot notches.
    for (let s = 0; s < RING_SLOTS; s += 1) {
      const p = slotPos(state, i, s);
      const occupied = towerAt(state, i, s);
      ctx.fillStyle = occupied ? 'rgba(255,209,102,0.9)' : 'rgba(232,236,255,0.35)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, occupied ? 3 : 2, 0, Math.PI * 2);
      ctx.fill();
    }
    // Ring label.
    ctx.fillStyle = selected ? '#7df9ff' : COLORS.faint;
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`RING ${i + 1}`, CORE.x, CORE.y - r - 6);
  }
}

function drawCore(ctx, state) {
  const pulse = 1 + 0.06 * Math.sin(state.time * 2.4);
  const hpFrac = clamp(state.coreHp / state.coreMax, 0, 1);
  ctx.save();
  ctx.translate(CORE.x, CORE.y);
  // HP arc.
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(0, 0, CORE.r + 10, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = hpFrac > 0.5 ? '#7ee787' : hpFrac > 0.25 ? '#ffd166' : '#ff5470';
  ctx.beginPath();
  ctx.arc(0, 0, CORE.r + 10, -Math.PI / 2, -Math.PI / 2 + hpFrac * Math.PI * 2);
  ctx.stroke();
  // Rotating rune ring.
  ctx.rotate(state.time * 0.25);
  ctx.setLineDash([8, 10]);
  ctx.strokeStyle = 'rgba(125, 249, 255, 0.5)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, CORE.r + 20, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.rotate(-state.time * 0.25);
  // The orb itself.
  const g = ctx.createRadialGradient(-8, -10, 4, 0, 0, CORE.r * pulse);
  g.addColorStop(0, '#e0faff');
  g.addColorStop(0.45, '#2dd4bf');
  g.addColorStop(1, '#0e7490');
  ctx.shadowColor = '#2dd4bf';
  ctx.shadowBlur = 30;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, CORE.r * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#082f3a';
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('CORE', 0, 4);
  ctx.restore();
}

function drawTopBar(ctx, state) {
  ctx.fillStyle = 'rgba(10, 12, 32, 0.95)';
  ctx.fillRect(0, 0, TOP_BAR.w, TOP_BAR.h);
  ctx.strokeStyle = COLORS.panelEdge;
  ctx.beginPath();
  ctx.moveTo(0, 56);
  ctx.lineTo(1280, 56);
  ctx.stroke();
  ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.fillText('RINGWARDEN', 16, 37);
  ctx.fillStyle = COLORS.dim;
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText('defend the last core', 168, 36);

  const items = [
    { label: 'WAVE', value: `${state.wave} / ${TOTAL_WAVES}`, x: 330 },
    { label: 'SCORE', value: fmt(state.score), x: 470 },
    { label: 'BEST', value: fmt(Math.max(state.best, state.score)), x: 600 },
    { label: 'KILLS', value: fmt(state.kills), x: 700 },
  ];
  for (const it of items) {
    ctx.fillStyle = COLORS.dim;
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.fillText(it.label, it.x, 22);
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 19px system-ui, sans-serif';
    ctx.fillText(it.value, it.x, 44);
  }
  // Core HP bar.
  ctx.fillStyle = COLORS.dim;
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.fillText('CORE', 800, 22);
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  rr(ctx, 800, 28, 130, 14, 7);
  ctx.fill();
  const frac = clamp(state.coreHp / state.coreMax, 0, 1);
  ctx.fillStyle = frac > 0.5 ? '#7ee787' : frac > 0.25 ? '#ffd166' : '#ff5470';
  if (frac > 0) {
    rr(ctx, 800, 28, 130 * frac, 14, 7);
    ctx.fill();
  }
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillText(`${state.coreHp}/${state.coreMax}`, 936, 41);
  // Stardust.
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.fillText('STARDUST', 1020, 22);
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.fillText(`✦ ${fmt(state.stardust)}`, 1020, 45);
  // Combo.
  if (state.combo >= 3) {
    ctx.fillStyle = '#ff5d8f';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`COMBO ×${Math.min(COMBO_MAX, 1 + Math.floor(state.combo / 5))}`, 1264, 40);
    ctx.textAlign = 'left';
  }
}

function drawLeftPanel(ctx, state) {
  const p = LEFT_PANEL;
  panel(ctx, p.x, p.y, p.w, p.h);
  const hot = state.ui.hot;
  let y = p.y + 22;
  sectionTitle(ctx, p.x + 12, y, 'INCOMING');
  y += 22;
  ctx.fillStyle = COLORS.text;
  ctx.font = '13px system-ui, sans-serif';
  ctx.textAlign = 'left';
  if (state.phase === 'wave') {
    const left = state.spawnQueue.length + state.enemies.length;
    ctx.fillText(`Wave ${state.wave}: ${left} husks left`, p.x + 12, y);
    y += 20;
    ctx.fillStyle = COLORS.dim;
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText(waveSummary(state.wave), p.x + 12, y, p.w - 24);
  } else if (state.wave === 0) {
    ctx.fillText('No wave yet. Build first,', p.x + 12, y);
    y += 20;
    ctx.fillText('then press SPACE.', p.x + 12, y);
  } else if (state.wave >= TOTAL_WAVES) {
    ctx.fillText('All waves cleared —', p.x + 12, y);
    y += 20;
    ctx.fillText('the core endures!', p.x + 12, y);
  } else {
    ctx.fillText(`Next: Wave ${state.wave + 1} of ${TOTAL_WAVES}`, p.x + 12, y);
    y += 20;
    ctx.fillStyle = COLORS.dim;
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText(waveSummary(state.wave + 1), p.x + 12, y, p.w - 24);
  }
  y += 34;
  sectionTitle(ctx, p.x + 12, y, 'SELECTED');
  y += 20;
  if (state.selectedTower) {
    const t = state.selectedTower;
    const def = TOWER_DEFS[t.key];
    ctx.fillStyle = def.color;
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillText(`${def.name}  ·  Lv ${t.level}`, p.x + 12, y);
    y += 20;
    ctx.fillStyle = COLORS.dim;
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText(`Ring ${t.ring + 1} · Slot ${t.slot + 1} · ${t.kills} kills`, p.x + 12, y);
    y += 24;
    if (t.level < 3) {
      button(ctx, hot, p.x + 12, y, p.w - 24, 34,
        `UPGRADE [U] — ${fmt(upgradeCost(state, t))} ✦`, { action: 'upgrade' });
    } else {
      ctx.fillStyle = COLORS.gold;
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.fillText('MAX LEVEL', p.x + 12, y + 20);
    }
    y += 44;
    button(ctx, hot, p.x + 12, y, p.w - 24, 34,
      `SELL [X] — +${fmt(sellValue(t))} ✦`, { action: 'sell' });
    y += 44;
  } else {
    ctx.fillStyle = COLORS.dim;
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText('Click one of your towers to', p.x + 12, y);
    y += 18;
    ctx.fillText('upgrade or sell it.', p.x + 12, y);
    y += 40;
  }
  y += 10;
  if (state.protocolChoices) {
    sectionTitle(ctx, p.x + 12, y, 'CHOOSE A PROTOCOL');
    y += 6;
    state.protocolChoices.forEach((proto, i) => {
      y += 26;
      ctx.fillStyle = '#232a52';
      rr(ctx, p.x + 12, y, p.w - 24, 48, 8);
      ctx.fill();
      ctx.strokeStyle = COLORS.gold;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = COLORS.gold;
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.fillText(`${i + 1}. ${proto.name}`, p.x + 20, y + 19);
      ctx.fillStyle = COLORS.text;
      ctx.font = '12px system-ui, sans-serif';
      ctx.fillText(proto.desc, p.x + 20, y + 36);
      hot.push({
        x: p.x + 12, y, w: p.w - 24, h: 48, action: 'protocol', arg: i,
      });
    });
    y += 58;
  }
  // How to play, pinned near the bottom (hidden while protocols are up, for room).
  if (!state.protocolChoices) {
    const hy = p.y + p.h - 148;
    sectionTitle(ctx, p.x + 12, hy, 'HOW TO PLAY');
    const lines = [
      '1–5 pick a tower, click a slot',
      'Drag a ring · Q / E turns it',
      'Towers fire in their arc only',
      'TAB ring · SPACE surge / start',
      'F speed · P pause · M sound',
    ];
    ctx.fillStyle = COLORS.dim;
    ctx.font = '12px system-ui, sans-serif';
    lines.forEach((ln, i) => ctx.fillText(ln, p.x + 12, hy + 22 + i * 18));
  }
}

function drawRightPanel(ctx, state) {
  const p = RIGHT_PANEL;
  panel(ctx, p.x, p.y, p.w, p.h);
  const hot = state.ui.hot;
  let y = p.y + 22;
  sectionTitle(ctx, p.x + 12, y, 'BUILD — PICK A TOWER');
  y += 10;
  for (const key of TOWER_ORDER) {
    const def = TOWER_DEFS[key];
    const h = 50;
    const active = state.selectedBuild === key;
    const afford = state.stardust >= towerCost(state, key);
    ctx.fillStyle = active ? '#2a3560' : '#1d2447';
    rr(ctx, p.x + 12, y, p.w - 24, h, 8);
    ctx.fill();
    ctx.strokeStyle = active ? def.color : COLORS.panelEdge;
    ctx.lineWidth = active ? 2.5 : 1.5;
    ctx.stroke();
    ctx.fillStyle = def.color;
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`[${def.hotkey}] ${def.name}`, p.x + 22, y + 20);
    ctx.fillStyle = afford ? COLORS.gold : COLORS.red;
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${fmt(towerCost(state, key))} ✦`, p.x + p.w - 22, y + 20);
    ctx.fillStyle = COLORS.dim;
    ctx.font = '11px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(def.desc, p.x + 22, y + 37);
    hot.push({ x: p.x + 12, y, w: p.w - 24, h, action: 'build', arg: key });
    y += h + 6;
  }
  y += 8;
  sectionTitle(ctx, p.x + 12, y, 'RINGS — DRAG ONE, OR TURN IT');
  y += 8;
  for (let i = 0; i < 3; i += 1) {
    button(ctx, hot, p.x + 12 + i * 76, y, 70, 28, `RING ${i + 1}`,
      { action: 'ring', arg: i, active: state.selectedRing === i });
  }
  y += 36;
  button(ctx, hot, p.x + 12, y, 109, 28, '⟲  LEFT  [Q]', { action: 'ring-rot-left' });
  button(ctx, hot, p.x + 133, y, 109, 28, 'RIGHT  [E]  ⟳', { action: 'ring-rot-right' });
  y += 36;
  // Surge.
  const surgeReady = state.surgeCd <= 0;
  const surgeLabel = surgeReady
    ? 'SURGE [SPACE] — READY'
    : `SURGE — ${Math.ceil(state.surgeCd)}s`;
  button(ctx, hot, p.x + 12, y, p.w - 24, 34, surgeLabel,
    { action: 'surge', disabled: !surgeReady, accent: surgeReady ? '#7df9ff' : undefined });
  y += 42;
  // Start wave.
  if (state.phase === 'build' && state.screen === 'play') {
    const next = state.wave + 1;
    button(ctx, hot, p.x + 12, y, p.w - 24, 38,
      next <= TOTAL_WAVES ? `▶  START WAVE ${next}  [SPACE]` : '—',
      { action: 'start-wave', accent: '#ffd166', color: '#ffd166' });
    y += 46;
  }
  // Bottom row of small buttons.
  button(ctx, hot, p.x + 12, y, 70, 28, state.screen === 'pause' ? 'RESUME' : '❚❚  P',
    { action: state.screen === 'pause' ? 'resume' : 'pause' });
  button(ctx, hot, p.x + 90, y, 70, 28, state.speed === 1 ? 'SPEED 1×' : 'SPEED 2×',
    { action: 'speed', active: state.speed === 2 });
  button(ctx, hot, p.x + 168, y, 70, 28, state.sound.muted ? 'SOUND ✕' : 'SOUND ♪',
    { action: 'mute', active: !state.sound.muted });
}

function drawBottomBar(ctx, state) {
  ctx.fillStyle = 'rgba(10, 12, 32, 0.95)';
  ctx.fillRect(0, BOTTOM_BAR.y, BOTTOM_BAR.w, BOTTOM_BAR.h);
  ctx.strokeStyle = COLORS.panelEdge;
  ctx.beginPath();
  ctx.moveTo(0, BOTTOM_BAR.y);
  ctx.lineTo(1280, BOTTOM_BAR.y);
  ctx.stroke();
  ctx.fillStyle = COLORS.text;
  ctx.font = '14px system-ui, sans-serif';
  ctx.textAlign = 'left';
  const msg = state.messageTimer > 0 ? state.message : '';
  ctx.fillText(msg, 16, BOTTOM_BAR.y + 32);
  ctx.fillStyle = COLORS.faint;
  ctx.font = '12px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('RINGWARDEN · an original game · keyboard + mouse · no network', 1264, BOTTOM_BAR.y + 32);
  ctx.textAlign = 'left';
}

function overlay(ctx) {
  ctx.fillStyle = 'rgba(6, 8, 24, 0.82)';
  ctx.fillRect(0, 0, 1280, 720);
}

function drawTitle(ctx, state) {
  overlay(ctx);
  const hot = state.ui.hot;
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 76px system-ui, sans-serif';
  ctx.fillText('RINGWARDEN', 640, 190);
  ctx.fillStyle = COLORS.cyan;
  ctx.font = 'bold 24px system-ui, sans-serif';
  ctx.fillText('DEFEND THE LAST CORE', 640, 230);
  ctx.fillStyle = COLORS.text;
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillText('Husks spiral in from the dark. Your towers ride three turning rings —', 640, 282);
  ctx.fillText('turn the rings so their arcs meet the swarm. Survive all 12 waves.', 640, 306);
  const lines = [
    'BUILD  ·  1–5 pick a tower, click a glowing slot to place it',
    'TURN  ·  drag a ring, or Q / E to turn the selected ring',
    'FIGHT  ·  SPACE fires the Surge shockwave · F doubles speed · P pauses',
    'WIN  ·  clear Wave 12. Lose the core and the dark takes it all.',
  ];
  ctx.font = '15px system-ui, sans-serif';
  ctx.fillStyle = COLORS.dim;
  lines.forEach((ln, i) => ctx.fillText(ln, 640, 352 + i * 26));
  button(ctx, hot, 520, 480, 240, 56, '▶  START GAME', {
    action: 'start', accent: '#ffd166', color: '#ffd166', font: 'bold 20px system-ui, sans-serif',
  });
  ctx.fillStyle = COLORS.dim;
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillText(`Best score: ${fmt(state.best)}`, 640, 566);
  ctx.fillText('or press SPACE', 640, 590);
  ctx.textAlign = 'left';
}

function drawPause(ctx, state) {
  overlay(ctx);
  const hot = state.ui.hot;
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 52px system-ui, sans-serif';
  ctx.fillText('PAUSED', 640, 300);
  ctx.fillStyle = COLORS.dim;
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillText('The swarm waits. The core does not.', 640, 336);
  button(ctx, hot, 520, 380, 240, 52, 'RESUME  [P]', {
    action: 'resume', accent: '#7df9ff', color: '#7df9ff', font: 'bold 18px system-ui, sans-serif',
  });
  button(ctx, hot, 520, 444, 240, 52, 'RESTART  [R]', {
    action: 'restart', font: 'bold 18px system-ui, sans-serif',
  });
  ctx.textAlign = 'left';
}

function drawEnd(ctx, state, won) {
  overlay(ctx);
  const hot = state.ui.hot;
  ctx.textAlign = 'center';
  ctx.fillStyle = won ? '#7ee787' : '#ff5470';
  ctx.font = 'bold 64px system-ui, sans-serif';
  ctx.fillText(won ? 'THE CORE ENDURES' : 'THE CORE FALLS', 640, 180);
  ctx.fillStyle = COLORS.text;
  ctx.font = '20px system-ui, sans-serif';
  ctx.fillText(won
    ? 'Twelve waves broken on your rings. The Warden stands.'
    : `The husks reached the core on Wave ${state.wave}. The dark takes it all.`, 640, 222);
  const acc = state.stats.shots > 0
    ? Math.min(100, Math.round((100 * state.stats.hits) / state.stats.shots)) : 0;
  const rows = [
    ['FINAL SCORE', fmt(state.score)],
    ['BEST SCORE', fmt(Math.max(state.best, state.score))],
    ['WAVE REACHED', `${state.wave} / ${TOTAL_WAVES}`],
    ['HUSKS DESTROYED', fmt(state.kills)],
    ['TOWERS BUILT', fmt(state.stats.built)],
    ['STARDUST EARNED', fmt(state.stats.earned)],
    ['ACCURACY', `${acc}%`],
  ];
  ctx.font = 'bold 17px system-ui, sans-serif';
  rows.forEach((row, i) => {
    const y = 272 + i * 32;
    ctx.fillStyle = COLORS.dim;
    ctx.textAlign = 'right';
    ctx.fillText(row[0], 600, y);
    ctx.fillStyle = COLORS.text;
    ctx.textAlign = 'left';
    ctx.fillText(row[1], 660, y);
  });
  ctx.textAlign = 'center';
  button(ctx, hot, 500, 520, 280, 56, '↻  PLAY AGAIN  [R]', {
    action: 'restart', accent: '#ffd166', color: '#ffd166', font: 'bold 19px system-ui, sans-serif',
  });
  ctx.fillStyle = COLORS.dim;
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillText('or press R', 640, 606);
  ctx.textAlign = 'left';
}
