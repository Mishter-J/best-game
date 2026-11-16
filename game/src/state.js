// The whole game state in one object, plus its reset. One job: what a game is, at any moment.
import {
  CORE, RING_RADII, START_CORE_HP, START_STARDUST, SURGE_COOLDOWN,
} from './config.js';
import { makeRng } from './random.js';

export function createState(seed) {
  const rng = makeRng(seed);
  const stars = [];
  for (let i = 0; i < 150; i += 1) {
    stars.push({
      x: 232 + rng() * 776, y: 64 + rng() * 594,
      r: 0.5 + rng() * 1.4, tw: rng() * Math.PI * 2, sp: 0.5 + rng() * 1.5,
    });
  }
  const state = {
    seed,
    rng,
    stars,
    screen: 'title', // title | play | pause | over | win
    phase: 'build', // build | wave
    time: 0,
    wave: 0,
    score: 0,
    best: 0,
    stardust: START_STARDUST,
    kills: 0,
    combo: 0,
    comboTimer: 0,
    coreHp: START_CORE_HP,
    coreMax: START_CORE_HP,
    rings: RING_RADII.map((r, i) => ({
      radius: r, angle: (i * Math.PI) / 3, vel: 0, index: i,
    })),
    selectedRing: 1,
    towers: [],
    enemies: [],
    projectiles: [],
    beams: [],
    particles: [],
    texts: [],
    spawnQueue: [],
    spawnTimer: 0,
    surgeCd: 0,
    surgeMax: SURGE_COOLDOWN,
    surgeActive: null, // {r} while the shockwave expands
    speed: 1,
    selectedBuild: null, // tower key the player is about to place
    selectedTower: null, // placed tower the player clicked
    protocolChoices: null,
    mods: { dmg: 1, range: 1, rate: 1, cost: 1, dust: 1, surgeCd: 1 },
    message: 'Welcome, Warden. Build on the rings, then start Wave 1.',
    messageTimer: 6,
    shake: 0,
    flash: 0,
    stats: { shots: 0, hits: 0, damage: 0, built: 0, earned: 0 },
    drag: null, // {ring, lastAngle} while the player drags a ring
    autopilot: false,
    ui: { hot: [] },
  };
  try {
    state.best = Number(window.localStorage.getItem('ringwarden-best') || 0) || 0;
  } catch {
    state.best = 0;
  }
  return state;
}

export function resetState(state, seed) {
  const fresh = createState(seed === undefined ? state.seed : seed);
  fresh.best = state.best;
  for (const key of Object.keys(fresh)) state[key] = fresh[key];
}

export function saveBest(state) {
  if (state.score > state.best) {
    state.best = state.score;
    try {
      window.localStorage.setItem('ringwarden-best', String(state.best));
    } catch {
      // best score is a nicety, not a requirement
    }
  }
}

export function corePos() {
  return CORE;
}
