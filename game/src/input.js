// Mouse and keyboard. One job: turn pointer and key events into game actions.
// Hit regions come from render.js (state.ui.hot, rebuilt every frame); ring drags and
// slot clicks are resolved here from the playfield geometry.
import { CORE, RING_RADII, TOWER_DEFS, TOWER_ORDER } from './config.js';
import { placeTower, sellTower, slotPos, towerAt, upgradeTower } from './towers.js';
import { applyProtocol, startWave } from './waves.js';
import { fireSurge } from './world.js';
import { resetState } from './state.js';

function canvasPos(canvas, ev) {
  const rect = canvas.getBoundingClientRect();
  const x = ((ev.clientX - rect.left) / rect.width) * 1280;
  const y = ((ev.clientY - rect.top) / rect.height) * 720;
  return { x, y };
}

function hitHot(state, x, y) {
  for (let i = state.ui.hot.length - 1; i >= 0; i -= 1) {
    const h = state.ui.hot[i];
    if (x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) return h;
  }
  return null;
}

function nearestRing(x, y) {
  const d = Math.hypot(x - CORE.x, y - CORE.y);
  for (let i = 0; i < RING_RADII.length; i += 1) {
    if (Math.abs(d - RING_RADII[i]) <= 16) return i;
  }
  return -1;
}

function nearestSlot(state, x, y) {
  for (let r = 0; r < RING_RADII.length; r += 1) {
    for (let s = 0; s < 8; s += 1) {
      const p = slotPos(state, r, s);
      if (Math.hypot(x - p.x, y - p.y) <= 20) return { ring: r, slot: s };
    }
  }
  return null;
}

function startGame(state) {
  resetState(state, (Date.now() % 2147483647) || 1);
  state.screen = 'play';
  state.phase = 'build';
  state.message = 'Build on the rings, then start Wave 1. Drag a ring to turn it.';
  state.messageTimer = 8;
  state.sound.unlock();
}

export function attachInput(canvas, state) {
  canvas.addEventListener('pointerdown', (ev) => {
    state.sound.unlock();
    const { x, y } = canvasPos(canvas, ev);
    if (state.screen === 'title') {
      const h = hitHot(state, x, y);
      if (h && h.action === 'start') startGame(state);
      return;
    }
    if (state.screen === 'over' || state.screen === 'win') {
      const h = hitHot(state, x, y);
      if (h && h.action === 'restart') startGame(state);
      return;
    }
    if (state.screen === 'pause') {
      const h = hitHot(state, x, y);
      if (h) doAction(state, h);
      return;
    }
    if (state.screen !== 'play') return;
    const h = hitHot(state, x, y);
    if (h) {
      doAction(state, h);
      return;
    }
    // Playfield: a slot click places/selects a tower; a ring-band drag turns the ring.
    // Slots sit ON the rings, so slots must win the hit test or no tower could
    // ever be placed by clicking.
    const slot = nearestSlot(state, x, y);
    if (slot) {
      clickSlot(state, slot.ring, slot.slot);
      return;
    }
    const ring = nearestRing(x, y);
    if (ring >= 0) {
      state.selectedRing = ring;
      state.drag = { ring, lastAngle: Math.atan2(y - CORE.y, x - CORE.x) };
      return;
    }
    state.selectedTower = null;
    state.selectedBuild = null;
  });

  canvas.addEventListener('pointermove', (ev) => {
    if (!state.drag) return;
    const { x, y } = canvasPos(canvas, ev);
    const a = Math.atan2(y - CORE.y, x - CORE.x);
    let d = a - state.drag.lastAngle;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    state.rings[state.drag.ring].angle += d;
    state.rings[state.drag.ring].vel = 0;
    state.drag.lastAngle = a;
  });

  const endDrag = () => {
    state.drag = null;
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('pointerleave', endDrag);

  window.addEventListener('keydown', (ev) => {
    if (ev.repeat && ev.key !== 'q' && ev.key !== 'Q' && ev.key !== 'e' && ev.key !== 'E') return;
    const k = ev.key.toLowerCase();
    state.sound.unlock();
    if (state.screen === 'title' && (k === ' ' || k === 'enter')) {
      ev.preventDefault();
      startGame(state);
      return;
    }
    if ((state.screen === 'over' || state.screen === 'win') && (k === 'r' || k === ' ' || k === 'enter')) {
      ev.preventDefault();
      startGame(state);
      return;
    }
    if (state.screen !== 'play' && state.screen !== 'pause') return;
    if (k === 'p' || k === 'escape') {
      if (state.screen === 'play') {
        state.screen = 'pause';
      } else if (state.screen === 'pause') {
        state.screen = 'play';
      }
      state.sound.click();
      return;
    }
    if (state.screen === 'pause') return;
    if (k >= '1' && k <= '5') {
      state.selectedBuild = TOWER_ORDER[Number(k) - 1];
      state.selectedTower = null;
      state.sound.click();
      return;
    }
    if (k === 'q') {
      state.rings[state.selectedRing].vel = -1.8;
      return;
    }
    if (k === 'e') {
      state.rings[state.selectedRing].vel = 1.8;
      return;
    }
    if (k === 'tab') {
      ev.preventDefault();
      state.selectedRing = (state.selectedRing + 1) % 3;
      state.sound.click();
      return;
    }
    if (k === ' ') {
      ev.preventDefault();
      if (state.phase === 'build') startWave(state);
      else fireSurge(state);
      return;
    }
    if (k === 'f') {
      state.speed = state.speed === 1 ? 2 : 1;
      state.sound.click();
      return;
    }
    if (k === 'm') {
      const muted = state.sound.toggleMute();
      state.message = muted ? 'Sound off.' : 'Sound on.';
      state.messageTimer = 2;
      return;
    }
    if (k === 'u' && state.selectedTower) upgradeTower(state, state.selectedTower);
    if (k === 'x' && state.selectedTower) sellTower(state, state.selectedTower);
  });

  window.addEventListener('keyup', (ev) => {
    const k = ev.key.toLowerCase();
    if ((k === 'q' || k === 'e') && state.screen === 'play') {
      state.rings[state.selectedRing].vel = 0;
    }
  });
}

function clickSlot(state, ring, slot) {
  state.selectedRing = ring;
  const existing = towerAt(state, ring, slot);
  if (existing) {
    state.selectedTower = existing;
    state.selectedBuild = null;
    state.sound.click();
    return;
  }
  if (state.selectedBuild) {
    const placed = placeTower(state, ring, slot, state.selectedBuild);
    if (placed) {
      state.selectedTower = placed;
      state.selectedBuild = null;
    } else {
      state.message = 'Not enough stardust for that tower.';
      state.messageTimer = 2.5;
      state.sound.click();
    }
    return;
  }
  state.selectedTower = null;
}

function doAction(state, h) {
  switch (h.action) {
    case 'start':
    case 'restart':
      startGame(state);
      break;
    case 'resume':
      state.screen = 'play';
      break;
    case 'build':
      state.selectedBuild = h.arg;
      state.selectedTower = null;
      state.sound.click();
      break;
    case 'ring':
      state.selectedRing = h.arg;
      state.sound.click();
      break;
    case 'ring-rot-left':
      state.rings[state.selectedRing].vel = -1.8;
      break;
    case 'ring-rot-right':
      state.rings[state.selectedRing].vel = 1.8;
      break;
    case 'surge':
      fireSurge(state);
      break;
    case 'pause':
      state.screen = 'pause';
      state.sound.click();
      break;
    case 'speed':
      state.speed = state.speed === 1 ? 2 : 1;
      state.sound.click();
      break;
    case 'mute':
      state.sound.toggleMute();
      break;
    case 'start-wave':
      startWave(state);
      break;
    case 'protocol':
      applyProtocol(state, state.protocolChoices[h.arg]);
      break;
    case 'upgrade':
      if (state.selectedTower) upgradeTower(state, state.selectedTower);
      break;
    case 'sell':
      if (state.selectedTower) sellTower(state, state.selectedTower);
      break;
    default:
      break;
  }
  void TOWER_DEFS;
}
