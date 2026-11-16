// Waves and the between-wave protocol choices. One job: what attacks, when, and what
// the Warden is offered for surviving it.
import { PROTOCOLS, TOTAL_WAVES } from './config.js';
import { shuffle } from './random.js';
import { spawnEnemy } from './enemies.js';

// A wave is a timed list of spawns: {type, at} in seconds after the wave starts.
export function waveComp(wave) {
  const list = [];
  const push = (type, count, start, gap) => {
    for (let i = 0; i < count; i += 1) list.push({ type, at: start + i * gap });
  };
  const mites = 4 + wave * 2;
  const skitters = wave >= 2 ? 2 + wave : 0;
  const crawlers = wave >= 3 ? 1 + Math.floor(wave / 2) : 0;
  const brutes = wave >= 4 ? Math.floor((wave - 2) / 2) : 0;
  push('mite', mites, 1, 0.9);
  if (skitters) push('skitter', skitters, 6, 1.4);
  if (crawlers) push('crawler', crawlers, 10, 2.2);
  if (brutes) push('brute', brutes, 14, 3.5);
  if (wave === 4 || wave === 8 || wave === 12) {
    list.push({ type: 'boss', at: 10 });
    push('mite', 6, 16, 1.1);
    if (wave >= 8) push('crawler', 4, 20, 2.0);
  }
  list.sort((a, b) => a.at - b.at);
  return list;
}

export function waveSummary(wave) {
  const comp = waveComp(wave);
  const counts = {};
  for (const s of comp) counts[s.type] = (counts[s.type] || 0) + 1;
  const parts = [];
  if (counts.mite) parts.push(`${counts.mite} MITE`);
  if (counts.skitter) parts.push(`${counts.skitter} SKITTER`);
  if (counts.crawler) parts.push(`${counts.crawler} CRAWLER`);
  if (counts.brute) parts.push(`${counts.brute} BRUTE`);
  if (counts.boss) parts.push('1 HUSK TITAN');
  return parts.join('  ·  ');
}

export function startWave(state) {
  if (state.phase !== 'build' || state.screen !== 'play') return false;
  state.wave += 1;
  state.phase = 'wave';
  state.spawnQueue = waveComp(state.wave);
  state.spawnTimer = 0;
  state.protocolChoices = null;
  state.selectedTower = null;
  state.message = `Wave ${state.wave} of ${TOTAL_WAVES} — ${waveSummary(state.wave)}`;
  state.messageTimer = 5;
  state.sound.horn();
  return true;
}

export function chooseProtocols(state) {
  state.protocolChoices = shuffle(state.rng, PROTOCOLS).slice(0, 3);
}

export function applyProtocol(state, proto) {
  const m = state.mods;
  if (proto.id === 'tithe') state.stardust += 60;
  else if (proto.id === 'plating') {
    state.coreMax += 15;
    state.coreHp = Math.min(state.coreMax, state.coreHp + 15);
  } else if (proto.id === 'overcharge') m.dmg *= 1.15;
  else if (proto.id === 'longbarrel') m.range *= 1.12;
  else if (proto.id === 'quickhands') m.cost *= 0.8;
  else if (proto.id === 'capacitor') m.surgeCd *= 0.65;
  else if (proto.id === 'sharpeyes') m.rate *= 1.1;
  else if (proto.id === 'bounty') m.dust *= 1.25;
  state.protocolChoices = null;
  state.message = `Protocol accepted: ${proto.name}.`;
  state.messageTimer = 4;
  state.sound.build();
}

export function updateSpawns(state, dt) {
  state.spawnTimer += dt;
  while (state.spawnQueue.length > 0 && state.spawnQueue[0].at <= state.spawnTimer) {
    const s = state.spawnQueue.shift();
    spawnEnemy(state, s.type);
  }
}

export function isBossWave(wave) {
  return wave === 4 || wave === 8 || wave === 12;
}
