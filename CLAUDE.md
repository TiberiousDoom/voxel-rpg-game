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

Test setup (`src/setupTests.js`) provides: fake-indexeddb, Canvas 2D mock, rAF polyfill, TextEncoder/TextDecoder, crypto.subtle mock. Vitest globals (`vi.fn`, `describe`, `it`) available without import.

## Linting & Formatting

```bash
npm run lint         # ESLint check
npm run lint:fix     # ESLint auto-fix
npm run format       # Prettier (singleQuote, trailingComma: es5, semi: true)
```

ESLint: `no-unused-vars: warn`, `no-console: warn` (except warn/error), `react/no-unknown-property: off` (needed for R3F).

## Architecture Overview

### Two Game Architectures (Coexisting)

1. **Module System** — `GameManager` → `ModuleOrchestrator` → 25+ modules in `src/modules/`. Used for the strategic/management layer (buildings, economy, NPCs, combat, expeditions). Communicates via orchestrator events.

2. **3D Real-Time System** — `App3D.jsx` → `Experience.jsx` → R3F components + Zustand store. Used for the voxel world, player movement, real-time combat, settlement simulation. Runs inside a React Three Fiber `<Canvas>`.

These two systems connect via bridge patterns (e.g., `SettlementBridge.js`) that sync module state into Zustand stores.

### 3D Rendering Pipeline

```
App3D.jsx (Canvas + UI overlay)
  → Experience.jsx (Physics, scene setup)
    → useChunkSystem hook → ChunkManager + WorkerPool
      → chunkWorker.js (terrain generation, off-thread)
      → meshBuilder.js (block → geometry, off-thread)
    → ChunkRenderer (visible chunk meshes)
    → Player, Enemy, SettlerNPC, WildlifeAnimal (physics entities)
    → Invisible tick components (SettlementTick, SurvivalTick, RiftController, ConstructionTick)
```

Tick components use `useFrame` inside R3F Canvas to drive game logic each frame.

### State Management

- **`useGameStore`** (`src/stores/useGameStore.js`, ~1650 lines) — Primary store. Player, enemies, projectiles, settlement NPCs, zones, world time, UI state, inventory. Almost all 3D components read/write here.
- **`useDungeonStore`** — Dungeon layout, monsters, loot (2100+ lines).
- **`useQuestStore`** — Quest progress and objectives.
- **`useSettlementStore`** — Settlement UI state (zone selection, NPC panel).

Pattern: Game logic writes to stores via actions. 3D components subscribe to slices. No circular deps — modules don't read components.

### Settlement System

```
SettlementTick.jsx (useFrame loop)
  → SettlementBridge.js (reads store → feeds modules → writes results back)
    → SettlementModule.js (orchestrates tick order)
      → ImmigrationManager, ZoneManager, StockpileManager,
        TaskAssignmentEngine, HousingManager, NPCStateMachine
```

NPC states: `IDLE → THINKING → WORKING_MINE/WORKING_HAUL/WORKING_BUILD → EATING/SLEEPING → LEAVING`

### Web Workers

| Worker | Purpose |
|--------|---------|
| `chunkWorker.js` | Terrain generation via simplex noise (seeded) |
| `meshBuilder.js` | Block arrays → Three.js geometry (face culling) |
| `terrainGenerator.js` | Height maps, biomes, ore distribution |

WorkerPool caps at `Math.min(navigator.hardwareConcurrency, 4)` threads.

### Key Data Files

- **`src/data/tuning.js`** — Single source of truth for ALL balance constants (day length, hunger rates, mining speeds, immigration thresholds, rift spawning, etc.). Never hardcode gameplay numbers.
- **`src/data/zoneTypes.js`** — Zone type definitions (MINING, STOCKPILE, FARMING, BUILDING, RESTRICTED).
- **`src/data/blockDrops.js`** — Block → loot tables, calculated via `calculateDrops(blockType, toolTier)`.
- **`src/data/spells.js`** — Spell definitions with cooldowns and mana costs.
- **`src/shared/config.js`** — Building types, tiers, dimensions, costs, resource types, grid config.

### Persistence

Save/load in `src/persistence/`:
- `BrowserSaveManager.js` — localStorage + IndexedDB fallback
- `GameStateSerializer.js` — Handles Maps, Sets serialization
- `SaveVersionManager.js` — Schema migrations (current: v3)

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

## Key Files

- `src/App3D.jsx` — Main 3D game component entry point
- `src/components/3d/Experience.jsx` — Scene setup, entity rendering, tick orchestration
- `src/stores/useGameStore.js` — Central Zustand store (~1650 lines)
- `src/GameManager.js` — Module-based game state initialization
- `src/core/ModuleOrchestrator.js` — Module coordination
- `src/data/tuning.js` — All gameplay balance constants
- `src/systems/chunks/ChunkManager.js` — Terrain chunk loading/unloading
- `src/modules/settlement/SettlementModule.js` — Settlement tick orchestration
- `src/modules/settlement/SettlementBridge.js` — Module ↔ Store bridge
