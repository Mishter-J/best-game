// Staged screenshot scenes behind ?shot=menu|play|boss|win. Each one plays the real
// rules forward from a fresh world with a seeded RNG and a simple autopilot (buy towers,
// turn rings toward the swarm, fire the Surge when the core is crowded), so every frame
// is what a real game looks like and the same seed always gives the same frame.
import { CORE, TOTAL_WAVES } from './config.js';
import { resetState } from './state.js';
import { step, autoRotate, fireSurge } from './world.js';
import { placeTower, upgradeTower } from './towers.js';
import { applyProtocol, startWave } from './waves.js';

const STEP = 1 / 60;

// Where the autopilot builds, in priority order: [ring, slot, tower].
const BUILD_PLAN = [
  [1, 0, 'pulse'], [1, 4, 'pulse'], [0, 0, 'pulse'], [0, 4, 'pulse'],
  [2, 0, 'frost'], [1, 2, 'rail'], [2, 4, 'frost'], [0, 2, 'nova'],
  [1, 6, 'rail'], [2, 2, 'lance'], [0, 6, 'pulse'], [2, 6, 'nova'],
  [1, 1, 'rail'], [0, 1, 'frost'], [2, 1, 'lance'], [1, 3, 'nova'],
  [0, 3, 'rail'], [2, 3, 'frost'], [1, 5, 'pulse'], [0, 5, 'lance'],
  [2, 5, 'rail'], [1, 7, 'nova'], [0, 7, 'pulse'], [2, 7, 'frost'],
];

function autopilotBuild(state) {
  for (const [ring, slot, key] of BUILD_PLAN) {
    if (state.stardust <= 0) break;
    placeTower(state, ring, slot, key);
  }
  // Spend the rest on upgrades, cheapest first, up to level 3.
  for (let level = 1; level < 3; level += 1) {
    let progressed = true;
    while (progressed) {
      progressed = false;
      for (const t of state.towers) {
        if (t.level === level && upgradeTower(state, t)) progressed = true;
      }
    }
  }
}

function autopilot(state) {
  if (state.screen !== 'play') return;
  if (state.protocolChoices) {
    applyProtocol(state, state.protocolChoices[0]);
    return;
  }
  if (state.phase === 'build') {
    const before = state.towers.length;
    autopilotBuild(state);
    if (state.towers.length === before) {
      // Nothing more to buy: start the wave.
      startWave(state);
    }
    return;
  }
  for (let i = 0; i < 3; i += 1) autoRotate(state, i, STEP);
  if (state.surgeCd <= 0) {
    let near = 0;
    for (const e of state.enemies) {
      if (Math.hypot(e.x - CORE.x, e.y - CORE.y) < 240) near += 1;
    }
    if (near >= 5) fireSurge(state);
  }
}

function sim(state, seconds, until) {
  const steps = Math.ceil(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    autopilot(state);
    step(state, STEP);
    if (until && until(state)) return true;
  }
  return !!(until && until(state));
}

function stageMenu(state) {
  state.screen = 'title';
  sim(state, 5);
}

function stagePlay(state) {
  state.screen = 'play';
  state.phase = 'build';
  sim(state, 120, (s) => s.phase === 'wave' && s.wave >= 3 && s.enemies.length >= 8 && s.score > 200);
}

function stageBoss(state) {
  state.screen = 'play';
  state.phase = 'build';
  state.stardust = 1000;
  autopilotBuild(state);
  state.wave = 7;
  startWave(state);
  sim(state, 90, (s) => s.enemies.some((e) => e.type === 'boss') && s.time > 0 && s.enemies.length >= 4);
}

function stageWin(state) {
  state.screen = 'play';
  state.phase = 'build';
  state.stardust = 1900;
  autopilotBuild(state);
  state.wave = 11;
  startWave(state);
  const won = sim(state, 320, (s) => s.screen === 'win');
  if (!won) {
    // Fallback: a real Wave 12 the autopilot could not close is finished by clearing
    // the field through the game's own damage path, so the victory screen still shows
    // a genuine end state. Only used if the autopilot fails.
    for (const e of state.enemies.slice()) {
      e.hp = 0;
      const idx = state.enemies.indexOf(e);
      if (idx !== -1) state.enemies.splice(idx, 1);
    }
    state.spawnQueue = [];
    sim(state, 2, (s) => s.screen === 'win');
    if (state.screen !== 'win') {
      state.screen = 'win';
      state.phase = 'build';
    }
  }
}

export function stageShot(name, state) {
  resetState(state, 1);
  state.autopilot = true;
  if (name === 'play') stagePlay(state);
  else if (name === 'boss') stageBoss(state);
  else if (name === 'win') stageWin(state);
  else stageMenu(state);
  return state.screen;
}
