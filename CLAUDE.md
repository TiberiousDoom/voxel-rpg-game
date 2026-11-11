# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm install          # Install dependencies
npm start            # Start Vite dev server at http://localhost:3000
npm run build        # Production build (output: build/)
npm run deploy       # Build and deploy to GitHub Pages
```

## Testing

Uses **Vitest** (not Jest). Tests colocated in `__tests__/` subdirectories.

```bash
npm test                                    # Run all tests once (vitest run)
npm run test:watch                          # Watch mode
npx vitest run path/to/file.test.js         # Single test file
npx vitest run -t "test name pattern"       # Run tests matching name
```

Test setup (`src/setupTests.js`) provides: fake-indexeddb, Canvas 2D mock, rAF polyfill, TextEncoder/TextDecoder, crypto.subtle mock, and a **seeded `Math.random` reset before every test** (results are reproducible; use `vi.spyOn(Math, 'random')` for specific values). Vitest globals (`vi.fn`, `describe`, `it`) available without import.

- Test files containing JSX must use the `.jsx` extension. `vi.mock` factories must return a module object (`{ default: ... }`), and tests use ESM imports, not `require()`.
- 3D component tests import `src/components/3d/testSetup.js` first: it swaps `@react-three/*` for the DOM mocks in `src/__mocks__/@react-three/` and stubs `Worker`. The fiber mock's `advanceFrames(n, delta)` runs mounted `useFrame` callbacks so frame logic can be tested.

## Linting & Formatting

```bash
npm run lint         # ESLint check
npm run lint:fix     # ESLint auto-fix
npm run format       # Prettier (singleQuote, trailingComma: es5, semi: true)
```

ESLint (lints `.js` and `.jsx`; CI fails on errors): `no-unused-vars: warn`, `no-console: warn` (except warn/error), `react/no-unknown-property: off` (needed for R3F). CI (`.github/workflows/deploy.yml`) runs lint + tests before building; only `main` auto-deploys.

## Architecture Overview

The game is a single 3D real-time app: `index.jsx` → `App3D.jsx` → `Experience.jsx` → R3F components + the `useGameStore` Zustand store, inside a React Three Fiber `<Canvas>`. The old 2D game and the `GameManager`/`ModuleOrchestrator` module system were removed (they were never reachable from the app); `git log` has them if needed.

`src/modules/` now holds only modules the 3D game uses or is about to: `character/` (attributes, skill trees), `crafting/`, and `settlement/` + `hauling/` + `construction/` + `voxel/` + `npc-system/NPCPersonality.js`, which form the headless settlement engine that `.claude/plans/phase2-settlement-unification.md` wires in via `SettlementBridge` (not yet active — `SettlementTick.jsx` still runs its own inline logic).

### 3D Rendering Pipeline

```
App3D.jsx (Canvas + UI overlay)
  → Experience.jsx (Physics, scene setup)
    → useChunkSystem hook → ChunkManager + WorkerPool
      → chunkWorker.js (terrain generation + meshing, off-thread)
    → ChunkRenderer (visible chunk meshes)
    → Player, Enemy, SettlerNPC, WildlifeAnimal (physics entities)
    → Invisible tick components (SettlementTick, SurvivalTick, RiftController, ConstructionTick)
```

Tick components use `useFrame` inside R3F Canvas to drive game logic each frame.

### State Management

- **`useGameStore`** (`src/stores/useGameStore.js`, ~1650 lines) — Primary store. Player, enemies, projectiles, settlement NPCs, zones, world time, UI state, inventory. Almost all 3D components read/write here.
- **`useQuestStore`** — Quest progress and objectives (driven by `systems/QuestManager.js`; no quest UI yet).

Pattern: Game logic writes to stores via actions. 3D components subscribe to slices. No circular deps — modules don't read components.

### Settlement System

Live today: `SettlementTick.jsx` (useFrame loop) runs campfire detection, attractiveness, immigration, NPC needs and the work loop inline, using `systems/settlement/*` (TaskAssignmentEngine, AttractivenessCalculator, MiningZoneScanner).

Planned (not active): `SettlementTick` → `SettlementBridge.js` → `SettlementModule.js` → ImmigrationManager, ZoneManager, StockpileManager, TaskAssignmentEngine, HousingManager, NPCStateMachine. `store._settlementModule` is never set yet, so the bridge branch is skipped.

NPC states: `IDLE → THINKING → WORKING_MINE/WORKING_HAUL/WORKING_BUILD → EATING/SLEEPING → LEAVING`

### Web Workers

| Worker | Purpose |
|--------|---------|
| `chunkWorker.js` | Seeded terrain generation (height maps, biomes, ores) and block → geometry meshing with face culling and LOD |

WorkerPool caps at `Math.min(navigator.hardwareConcurrency, 4)` threads.

### Key Data Files

- **`src/data/tuning.js`** — Single source of truth for ALL balance constants (day length, hunger rates, mining speeds, immigration thresholds, rift spawning, etc.). Never hardcode gameplay numbers.
- **`src/data/zoneTypes.js`** — Zone type definitions (MINING, STOCKPILE, FARMING, BUILDING, RESTRICTED).
- **`src/data/blockDrops.js`** — Block → loot tables, calculated via `calculateDrops(blockType, toolTier)`.
- **`src/data/spells.js`** — Spell definitions with cooldowns and mana costs.
- **`src/data/buildings.js`** — Building blueprints for the construction system.

### Persistence

Save/load in `src/persistence/Game3DSaveManager.js` (IndexedDB `voxel3d-saves`, schema v6, migrations inline in `migrateSave`). Main state + all modified chunks are written in one transaction. `TestNotesManager.js` stores QA tracker notes.

### Chunk System Constants

`VOXEL_SIZE=2`, `CHUNK_SIZE=16`. ChunkManager exposes `getBlock(wx,wy,wz)` and `setBlock()` for world-space block access. Coordinate conversion in `src/systems/chunks/coordinates.js`.

## Key Patterns

- **drei Text/Billboard components cause WebGL shader corruption** — use mesh-based UIs instead.
- Camera pitch stored in `camera.pitch` (radians, clamped ±1.05 ≈ 60°).
- `dealDamageToPlayer(damage, source)` — second arg tracks death cause for DeathScreen.
- Tool tier stored in `stats.toolTier` on crafting recipes.
- Enemy.jsx accepts optional `monsterData` prop for rift-spawned enemies vs hardcoded defaults.
- Mobile touch handlers need gesture disambiguation (tap vs drag) using time + distance thresholds.
- `useEffect` deps in CameraRotateControls: only `[gl]` — reads store via `getState()` to avoid stale closures.
- **Never subscribe to `state.player` or `state.player.position` in components** — position changes every frame. Read it with `getState()` inside `useFrame`, use `useShallow(selectPlayerStats)` for HUD-style stats, or select a coarse derived value (e.g. chunk key).
- Move the player with `teleportPlayer(pos)` / `pendingTeleport` (Player.jsx moves the physics body); writing `player.position` alone is overwritten by physics next frame.
- Rift enemies are plain data; their health lives in `Enemy.jsx`. Damage them through `store._enemyHandlers` (see `src/systems/combat/enemyHits.js`), with live positions from `store._enemyPositions`.
- Gameplay must stop while `gameState === 'paused'` (Physics is paused; `useFrame` loops should early-return).
- Block placement goes through `tryPlaceBlock` in BlockInteraction.jsx, which charges `BLOCK_PLACEMENT_COSTS` (`src/data/blockDrops.js`).
- World edits survive chunk unloads via `ChunkManager.modifiedChunkCache`; saves use `getModifiedChunks()` / `applyModifiedChunks()`.
- Debug tools load only in dev builds or with `?debug=1` (remembered; `?debug=0` turns it off) — see `src/utils/debugFlags.js`:
  - **Dev overlay** (`src/components/dev/DevOverlay.jsx`): F3 cycles closed → full → mini perf strip; F4 opens the Settlement tab; DEV button on touch devices. Tabs: Perf (frame-time graph vs. 60 fps budget, draw calls, chunks, workers, entities), Player (stats + cheats: heal, god mode, materials, XP, teleports), World (time controls, spawn/kill enemies, rifts, quick save/load in its own slot), Settlement (NPCs, zones, Phase 2 checks). Cheats live in `devActions.js`; renderer stats come from `DebugStatsTick` in Experience.jsx via `store._debugStats`.
  - **QA tracker** (backtick): manual test checklist (`TestTracker.jsx`, criteria in `data/testCriteria.js`).

## Key Files

- `src/App3D.jsx` — Main 3D game component entry point
- `src/components/3d/Experience.jsx` — Scene setup, entity rendering, tick orchestration
- `src/stores/useGameStore.js` — Central Zustand store (~1650 lines)
- `src/persistence/Game3DSaveManager.js` — Save/load
- `src/data/tuning.js` — All gameplay balance constants
- `src/systems/chunks/ChunkManager.js` — Terrain chunk loading/unloading
- `src/components/3d/SettlementTick.jsx` — Live settlement simulation
- `src/modules/settlement/SettlementBridge.js` — Planned module ↔ store bridge
