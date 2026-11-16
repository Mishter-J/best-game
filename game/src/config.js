// RINGWARDEN balance and layout constants. One job: every number the game tunes lives here.
export const VIEW_W = 1280;
export const VIEW_H = 720;

// Playfield geometry. Core sits in the middle of the open area between the side panels.
export const CORE = { x: 620, y: 362, r: 34 };
export const RING_RADII = [96, 152, 208];
export const RING_SLOTS = 8;
export const SPAWN_R = 292;
export const FIELD = { x0: 232, y0: 64, x1: 1008, y1: 658 };

// Panels.
export const LEFT_PANEL = { x: 8, y: 64, w: 214, h: 594 };
export const RIGHT_PANEL = { x: 1018, y: 64, w: 254, h: 594 };
export const TOP_BAR = { x: 0, y: 0, w: 1280, h: 56 };
export const BOTTOM_BAR = { x: 0, y: 666, w: 1280, h: 54 };

export const TOTAL_WAVES = 12;
export const START_STARDUST = 120;
export const START_CORE_HP = 20;
export const SURGE_COOLDOWN = 25;
export const SURGE_RADIUS = 270;
export const SURGE_DAMAGE = 45;
export const COMBO_WINDOW = 3;
export const COMBO_MAX = 3;

export const COLORS = {
  bg0: '#0a0a1e',
  bg1: '#141433',
  panel: 'rgba(16, 20, 48, 0.92)',
  panelEdge: '#2e3a6e',
  gold: '#ffd166',
  cyan: '#7df9ff',
  teal: '#2dd4bf',
  pink: '#ff5d8f',
  violet: '#a78bfa',
  red: '#ff5470',
  green: '#7ee787',
  text: '#e8ecff',
  dim: '#9aa3c7',
  faint: '#6b7396',
};

export const TOWER_DEFS = {
  pulse: {
    key: 'pulse', name: 'PULSE', hotkey: '1', cost: 40, color: '#7df9ff',
    range: 178, arc: 140, rate: 2.6, dmg: 7, projSpeed: 580, pierce: 1,
    desc: 'Rapid bolts. Cheap, reliable.',
  },
  rail: {
    key: 'rail', name: 'RAILGUN', hotkey: '2', cost: 90, color: '#ffd166',
    range: 272, arc: 110, rate: 0.65, dmg: 30, projSpeed: 940, pierce: 3,
    desc: 'Slow piercing lance. Hits a line.',
  },
  frost: {
    key: 'frost', name: 'FROSTWELL', hotkey: '3', cost: 60, color: '#a5f3fc',
    range: 158, arc: 360, rate: 1.0, dmg: 3, slow: 0.45,
    desc: 'Freezing aura. Slows husks 45%.',
  },
  nova: {
    key: 'nova', name: 'NOVA MORTAR', hotkey: '4', cost: 120, color: '#f0abfc',
    range: 205, arc: 360, rate: 0.8, dmg: 20, blast: 96,
    desc: 'Lobbed shell. Wide splash damage.',
  },
  lance: {
    key: 'lance', name: 'LANCE', hotkey: '5', cost: 150, color: '#ff5d8f',
    range: 302, arc: 90, dps: 46,
    desc: 'Searing beam. Melts what it holds.',
  },
};
export const TOWER_ORDER = ['pulse', 'rail', 'frost', 'nova', 'lance'];

export const ENEMY_DEFS = {
  mite: {
    key: 'mite', name: 'MITE', hp: 14, radial: 26, angular: 0.22, r: 9,
    coreDmg: 1, dust: 4, score: 10, color: '#ffb454',
  },
  skitter: {
    key: 'skitter', name: 'SKITTER', hp: 20, radial: 34, angular: -0.34, r: 10,
    coreDmg: 1, dust: 6, score: 15, color: '#ff8fa3', zigzag: true,
  },
  crawler: {
    key: 'crawler', name: 'CRAWLER', hp: 46, radial: 19, angular: 0.16, r: 13,
    coreDmg: 1, dust: 7, score: 20, color: '#c084fc',
  },
  brute: {
    key: 'brute', name: 'BRUTE', hp: 130, radial: 13, angular: 0.1, r: 18,
    coreDmg: 3, dust: 15, score: 40, color: '#f87171',
  },
  boss: {
    key: 'boss', name: 'HUSK TITAN', hp: 900, radial: 10, angular: 0.07, r: 30,
    coreDmg: 10, dust: 150, score: 500, color: '#ff5470',
  },
};

export const PROTOCOLS = [
  { id: 'tithe', name: 'FOUNDRY TITHE', desc: '+60 stardust, right now.' },
  { id: 'plating', name: 'CORE PLATING', desc: '+15 max core HP and repair 15.' },
  { id: 'overcharge', name: 'OVERCHARGE', desc: '+15% tower damage, forever.' },
  { id: 'longbarrel', name: 'LONG BARRELS', desc: '+12% tower range, forever.' },
  { id: 'quickhands', name: 'QUICK HANDS', desc: 'Towers cost 20% less from now on.' },
  { id: 'capacitor', name: 'SURGE CAPACITOR', desc: 'Surge recharges 35% faster.' },
  { id: 'sharpeyes', name: 'SHARP EYES', desc: '+10% tower fire rate, forever.' },
  { id: 'bounty', name: 'BOUNTY EDICT', desc: 'Kills pay +25% stardust, forever.' },
];
