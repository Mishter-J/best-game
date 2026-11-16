# best-game

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/Mishter-J/best-game/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/Mishter-J/best-game/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

**RINGWARDEN** — an orbital ring-defense game. You are the Warden of the last core, a glowing heart at the centre of a dead star's orbit. Husks spiral in from the dark to devour it. Your towers ride three turning rings — drag a ring, or turn it with Q / E, so each tower's firing arc meets the swarm. Survive all 12 waves, beat the Husk Titans on waves 4, 8 and 12, and the core endures. Built by an AI agent for make.fun's "Make the best game" bounty, $1,000 in USDC.

## The game

- **Turn the rings:** five tower types (Pulse, Railgun, Frostwell, Nova Mortar, Lance) sit on slots around three concentric rings. Every tower fires only inside its arc, so where a ring points matters as much as what is built on it. Drag a ring to turn it, or pick a ring with TAB and turn it with Q / E.
- **Twelve waves, three Titans:** mites, skitters, crawlers and brutes spiral inward with their own speeds and paths; a Husk Titan boss anchors waves 4, 8 and 12 and drops a fortune in stardust.
- **An economy that rewards nerve:** kills pay stardust, kill streaks build a combo multiplier, and between waves you choose one of three Protocols — damage, range, fire rate, cheaper towers, a stronger Surge, and more.
- **The Surge:** SPACE fires a shockwave from the core that damages and slows everything near it. Spend it when the swarm crowds the core, not before.
- **A complete game:** title screen, build phase, waves, pause, victory and defeat screens with full stats, a best score that persists, synthesized WebAudio sound (M mutes), and 1×/2× speed.

## Controls

| Key / mouse | Action |
| --- | --- |
| 1–5 | Pick a tower to build |
| Click a slot | Build the picked tower / select a placed tower |
| Drag a ring | Turn that ring |
| Q / E | Turn the selected ring |
| TAB | Pick the next ring |
| SPACE | Start the next wave · fire the Surge during a wave |
| U / X | Upgrade / sell the selected tower |
| F | Toggle 1× / 2× speed |
| P | Pause |
| M | Mute |
| R | Restart after victory or defeat |

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome and click **START GAME**. No build step, no network requests: the game is static files under `game/` (plain canvas + ES modules, no library vendored).

## Layout

- `game/index.html` — the page: a 1280×720 canvas, nothing else
- `game/src/main.js` — boot, the loop, and the `?shot=` staging hook
- `game/src/config.js` — every tuned number: layout, towers, enemies, protocols
- `game/src/state.js` — the whole game state in one object, plus its reset
- `game/src/world.js` — the simulation step: rings, waves, combat, Surge
- `game/src/waves.js` — wave compositions, bosses, and protocol choices
- `game/src/enemies.js` — husk definitions, spiral movement, and drawing
- `game/src/towers.js` — placement, upgrades, targeting, and firing
- `game/src/projectiles.js` — bolts, shells, and their impacts
- `game/src/particles.js` — sparks, shockwave rings, floating score text
- `game/src/render.js` — the board, the HUD, the menus, and hit regions
- `game/src/input.js` — mouse and keyboard
- `game/src/audio.js` — synthesized WebAudio effects and ambient pad
- `game/src/shots.js` — staged screenshot scenes (`?shot=menu|play|boss|win`)
- `game/src/random.js` — the seeded RNG behind determinism
- `main.ts` — the make.fun program entrypoint (copies the game and writes the dossier)

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
