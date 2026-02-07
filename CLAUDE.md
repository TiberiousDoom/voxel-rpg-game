# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm install          # Install dependencies
npm start            # Start dev server at http://localhost:3000
npm run dev          # Start with ESLint disabled (for faster iteration)
npm run build        # Production build
npm run deploy       # Build and deploy to GitHub Pages
```

## Testing

```bash
npm test                           # Run tests in watch mode
npm test -- --watchAll=false       # Run all tests once
npm test -- --coverage             # Run with coverage report
npm test -- path/to/file.test.js   # Run a single test file
npm test -- --testPathPattern="NPCManager"  # Run tests matching pattern
```

Tests are colocated with source code in `__tests__/` subdirectories. Use `fake-indexeddb` for IndexedDB mocking (already configured in setupTests.js).

## Linting & Formatting

```bash
npm run lint         # Check for linting errors
npm run lint:fix     # Auto-fix linting errors
npm run format       # Format code with Prettier
```

ESLint config: `no-unused-vars: warn`, `no-console: warn` (except warn/error).

## Architecture Overview

### Core Pattern: Module Orchestration

The game uses a **ModuleOrchestrator** (`src/core/ModuleOrchestrator.js`) that coordinates 25+ independent modules. Each module handles a specific game system and communicates through the orchestrator.

```
React UI (GameContext) → useGameManager hook → GameManager → ModuleOrchestrator → Modules
```

### State Management Layers

1. **GameContext** (`src/context/GameContext.js`) - React context providing `useGame()`, `useGameState()`, `useGameActions()` hooks
2. **Zustand stores** (`src/stores/`) - Feature-specific state (dungeon, UI, quests, game)
3. **GameManager** (`src/GameManager.js`) - Central game state and logic

### Key Modules (in `src/modules/`)

| Module | Purpose |
|--------|---------|
| `foundation/` | Grid system, spatial partitioning, terrain-aware placement |
| `building-types/` | Building definitions, tiers, effects |
| `resource-economy/` | Production ticks, storage, consumption, morale |
| `territory-town/` | Territory expansion, town management |
| `npc-system/` | NPC management, pathfinding, needs, autonomous decisions |
| `combat/` | NPC skills and equipment for combat |
| `expedition/` | Dungeon exploration, party management |
| `defense/` | Raid events, defense combat |
| `event-system/` | Disaster and positive random events |
| `achievement-system/` | Achievement tracking and rewards |
| `character/` | Character stats, skills, skill trees |
| `environment/` | Chunk management, terrain, weather, world generation |

### Rendering Architecture

The game uses React Three Fiber for 3D rendering. Rendering is separated into layers in `src/rendering/`:
- `useVoxelRenderer.js` - Main voxel rendering
- `useTerrainRenderer.js`, `useNPCRenderer.js`, `useMonsterRenderer.js`, `useBuildingRenderer.js` - Specialized renderers

### Persistence

Save/load system in `src/persistence/`:
- `BrowserSaveManager.js` - localStorage + IndexedDB fallback
- `GameStateSerializer.js` - State serialization (handles Maps, Sets)
- `SaveValidator.js`, `SaveVersionManager.js` - Validation and migration

### Configuration

`src/shared/config.js` is the **single source of truth** for game constants:
- Building types, tiers, dimensions, costs
- Resource types
- Grid configuration
- Territory settings

## Key Files

- `src/App3D.jsx` - Main 3D game component entry point
- `src/GameManager.js` - Central game state (44KB)
- `src/core/ModuleOrchestrator.js` - Module coordination (55KB)
- `src/components/GameViewport.jsx` - Main viewport (84KB)
- `src/hooks/useGameManager.js` - Primary game hook

## Code Patterns

### Adding New Modules

1. Create module in `src/modules/[module-name]/`
2. Add to ModuleOrchestrator constructor
3. Wire up in GameManager initialization
4. Add `__tests__/` directory with tests

### Component Structure

- `src/components/3d/` - Three.js 3D components
- `src/components/common/` - Reusable UI (Button, Modal, Toast, etc.)
- `src/components/npc/` - NPC-specific UI
- `src/components/resource/` - Resource management UI

### Building Tiers

Buildings progress through: `SURVIVAL → PERMANENT → TOWN → CASTLE`

Building status flow: `BLUEPRINT → BUILDING → COMPLETE` (can become `DAMAGED` or `DESTROYED`)
