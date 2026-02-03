# Multiplayer State Architecture

**Created:** February 3, 2026
**Status:** Research Complete
**Decision:** Authoritative host model with client prediction, designed from Phase 0

---

## Overview

We're designing for multiplayer from the start, even though the networking implementation comes in Phase 6. This means structuring our state management so that:

1. Single-player works as "multiplayer with one player"
2. All game mutations flow through a validated action system
3. State can be serialized and transmitted
4. Client prediction is possible without corruption

---

## Architecture Model

### Host-Authoritative with Client Prediction

```
┌─────────────────────────────────────────────────────────────────┐
│                           HOST                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Authoritative Game State                    │   │
│  │  • World (chunks, blocks, time)                         │   │
│  │  • All Players (positions, inventories, health)         │   │
│  │  • NPCs (positions, states, tasks)                      │   │
│  │  • Settlement (buildings, resources, zones)             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                    Validates & Applies                           │
│                              │                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   Action Processor                       │   │
│  │  • Receives actions from all clients                    │   │
│  │  • Validates (can player do this?)                      │   │
│  │  • Applies to authoritative state                       │   │
│  │  • Broadcasts state updates                             │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
              Network (WebRTC/WebSocket)
                              │
┌─────────────────────────────────────────────────────────────────┐
│                          CLIENT                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 Predicted State                          │   │
│  │  • Local player movement (immediate response)           │   │
│  │  • Local player actions (optimistic)                    │   │
│  │  • Pending action queue                                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 Replicated State                         │   │
│  │  • Last known server state                              │   │
│  │  • Other players                                        │   │
│  │  • World state                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 Rendered State                           │   │
│  │  • Merge of predicted + replicated                      │   │
│  │  • What the player actually sees                        │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Why This Model?

| Alternative | Problem |
|-------------|---------|
| Lockstep | High latency, all players wait for slowest |
| Full state sync | Too much bandwidth for voxel world |
| Peer-to-peer no authority | Desync, cheating impossible to prevent |
| **Host authority + prediction** | Best of all worlds |

---

## State Slices

Divide game state into logical slices with different sync behaviors:

### 1. World State (Large, Infrequent Updates)

```javascript
const worldState = {
  seed: 12345,
  time: 1000,  // Game ticks
  weather: 'clear',

  // Chunks are NOT in central state
  // They're loaded/unloaded locally based on player position
  // Only MODIFICATIONS are synced
  chunkModifications: {
    // Map of chunkKey -> block changes
    '0,0': [
      { x: 5, y: 10, z: 3, block: 'stone', timestamp: 1000 },
    ],
  },
};
```

**Sync strategy:**
- Seed synced once at join
- Time synced periodically (every few seconds)
- Block modifications synced immediately (small data)
- Chunks generated locally from seed (no sync needed)

### 2. Player State (Per-Player, Frequent Updates)

```javascript
const playerState = {
  id: 'player-123',
  name: 'Alice',

  // Physics state (synced frequently)
  position: { x: 0, y: 10, z: 0 },
  velocity: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0, w: 1 },

  // Game state (synced on change)
  health: 100,
  maxHealth: 100,
  hunger: 80,
  stamina: 100,

  // Inventory (synced on change)
  inventory: [...],
  equipment: {...},
  hotbarSelection: 0,

  // Multiplayer-specific
  lastInputSequence: 0,  // For reconciliation
  isLocal: true,  // Is this the local player?
};
```

**Sync strategy:**
- Position/velocity: 10-20 times per second (interpolated)
- Health/hunger: On change only
- Inventory: On change only
- Input sequence: For prediction reconciliation

### 3. Entity State (NPCs, Monsters, Items)

```javascript
const entityState = {
  npcs: {
    'npc-1': {
      id: 'npc-1',
      type: 'settler',
      position: { x: 10, y: 5, z: 10 },
      currentTask: 'mining',
      health: 50,
      // ... NPC-specific state
    },
  },

  monsters: {
    'monster-1': {
      id: 'monster-1',
      type: 'zombie',
      position: { x: -20, y: 5, z: 15 },
      target: 'player-123',
      health: 30,
    },
  },

  items: {
    'item-1': {
      id: 'item-1',
      type: 'wood',
      position: { x: 5, y: 6, z: 5 },
      quantity: 3,
    },
  },
};
```

**Sync strategy:**
- Position: Interpolated, 5-10 times per second
- State changes: On change
- Spawn/despawn: Immediate

### 4. Settlement State (Shared, Infrequent)

```javascript
const settlementState = {
  buildings: {
    'building-1': {
      type: 'house',
      position: { x: 0, z: 0 },
      rotation: 0,
      state: 'complete',
      assignedNPCs: ['npc-1'],
    },
  },

  zones: {
    'zone-1': {
      type: 'mining',
      bounds: { x1: -10, z1: -10, x2: 10, z2: 10 },
      priority: 1,
    },
  },

  stockpiles: {
    'stockpile-1': {
      position: { x: 5, z: 5 },
      contents: { wood: 50, stone: 30 },
    },
  },
};
```

**Sync strategy:**
- Building changes: Immediate (rare)
- Zone changes: Immediate (rare)
- Stockpile contents: Periodic or on significant change

---

## Zustand Store Structure

### Store Separation

```javascript
// src/stores/index.js

// Authoritative state - source of truth (host) or replicated (client)
export { useWorldStore } from './worldStore';
export { usePlayersStore } from './playersStore';
export { useEntitiesStore } from './entitiesStore';
export { useSettlementStore } from './settlementStore';

// Predicted state - local player only
export { usePredictionStore } from './predictionStore';

// UI state - never synced
export { useUIStore } from './uiStore';

// Combined accessor for convenience
export { useGameState } from './gameState';
```

### World Store

```javascript
// src/stores/worldStore.js
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

export const useWorldStore = create(
  subscribeWithSelector((set, get) => ({
    seed: null,
    time: 0,
    weather: 'clear',
    chunkModifications: new Map(),

    // Initialize world
    initialize(seed) {
      set({ seed, time: 0, weather: 'clear', chunkModifications: new Map() });
    },

    // Tick time forward
    tick(deltaTime) {
      set(state => ({ time: state.time + deltaTime }));
    },

    // Record block modification
    setBlock(chunkKey, x, y, z, blockType) {
      set(state => {
        const mods = new Map(state.chunkModifications);
        const chunkMods = mods.get(chunkKey) || [];
        chunkMods.push({ x, y, z, block: blockType, time: state.time });
        mods.set(chunkKey, chunkMods);
        return { chunkModifications: mods };
      });
    },

    // Get modifications for a chunk (for applying after generation)
    getChunkModifications(chunkKey) {
      return get().chunkModifications.get(chunkKey) || [];
    },

    // Serialization
    serialize() {
      const state = get();
      return {
        seed: state.seed,
        time: state.time,
        weather: state.weather,
        chunkModifications: Object.fromEntries(state.chunkModifications),
      };
    },

    // Deserialization
    deserialize(data) {
      set({
        seed: data.seed,
        time: data.time,
        weather: data.weather,
        chunkModifications: new Map(Object.entries(data.chunkModifications || {})),
      });
    },
  }))
);
```

### Players Store

```javascript
// src/stores/playersStore.js
import { create } from 'zustand';

export const usePlayersStore = create((set, get) => ({
  players: new Map(),
  localPlayerId: null,

  // Set local player ID
  setLocalPlayer(playerId) {
    set({ localPlayerId: playerId });
  },

  // Add/update player
  setPlayer(playerId, playerData) {
    set(state => {
      const players = new Map(state.players);
      players.set(playerId, { ...players.get(playerId), ...playerData });
      return { players };
    });
  },

  // Remove player
  removePlayer(playerId) {
    set(state => {
      const players = new Map(state.players);
      players.delete(playerId);
      return { players };
    });
  },

  // Get local player
  getLocalPlayer() {
    const { players, localPlayerId } = get();
    return players.get(localPlayerId);
  },

  // Get all other players
  getOtherPlayers() {
    const { players, localPlayerId } = get();
    return Array.from(players.values()).filter(p => p.id !== localPlayerId);
  },

  // Serialization
  serialize() {
    return {
      players: Object.fromEntries(get().players),
      localPlayerId: get().localPlayerId,
    };
  },

  deserialize(data) {
    set({
      players: new Map(Object.entries(data.players)),
      localPlayerId: data.localPlayerId,
    });
  },
}));
```

### Prediction Store

```javascript
// src/stores/predictionStore.js
import { create } from 'zustand';

export const usePredictionStore = create((set, get) => ({
  // Predicted local player state
  predictedPosition: { x: 0, y: 0, z: 0 },
  predictedVelocity: { x: 0, y: 0, z: 0 },

  // Pending inputs awaiting server confirmation
  pendingInputs: [],
  lastProcessedInput: 0,

  // Apply local input immediately (prediction)
  applyInput(input) {
    const { predictedPosition, predictedVelocity, pendingInputs } = get();

    // Calculate new predicted state
    const newPosition = applyMovement(predictedPosition, predictedVelocity, input);

    set({
      predictedPosition: newPosition,
      pendingInputs: [...pendingInputs, { ...input, sequence: pendingInputs.length }],
    });
  },

  // Server confirmed state - reconcile
  reconcile(serverState, lastProcessedInput) {
    const { pendingInputs } = get();

    // Remove acknowledged inputs
    const remainingInputs = pendingInputs.filter(
      input => input.sequence > lastProcessedInput
    );

    // Start from server state and replay remaining inputs
    let position = serverState.position;
    let velocity = serverState.velocity;

    for (const input of remainingInputs) {
      position = applyMovement(position, velocity, input);
    }

    set({
      predictedPosition: position,
      predictedVelocity: velocity,
      pendingInputs: remainingInputs,
      lastProcessedInput,
    });
  },

  // Clear prediction (e.g., on disconnect)
  clear() {
    set({
      predictedPosition: { x: 0, y: 0, z: 0 },
      predictedVelocity: { x: 0, y: 0, z: 0 },
      pendingInputs: [],
      lastProcessedInput: 0,
    });
  },
}));

function applyMovement(position, velocity, input) {
  // Simple movement prediction
  const speed = input.sprint ? 10 : 5;
  const dt = input.deltaTime;

  return {
    x: position.x + input.moveX * speed * dt,
    y: position.y + velocity.y * dt,
    z: position.z + input.moveZ * speed * dt,
  };
}
```

---

## Action System

### Action Types

```javascript
// src/actions/actionTypes.js

export const ActionTypes = {
  // Player actions
  PLAYER_MOVE: 'player/move',
  PLAYER_JUMP: 'player/jump',
  PLAYER_ATTACK: 'player/attack',
  PLAYER_USE_ITEM: 'player/useItem',
  PLAYER_DROP_ITEM: 'player/dropItem',
  PLAYER_PICKUP_ITEM: 'player/pickupItem',

  // World actions
  WORLD_PLACE_BLOCK: 'world/placeBlock',
  WORLD_BREAK_BLOCK: 'world/breakBlock',

  // Settlement actions
  SETTLEMENT_PLACE_BUILDING: 'settlement/placeBuilding',
  SETTLEMENT_REMOVE_BUILDING: 'settlement/removeBuilding',
  SETTLEMENT_CREATE_ZONE: 'settlement/createZone',

  // NPC actions
  NPC_ASSIGN_TASK: 'npc/assignTask',
  NPC_CANCEL_TASK: 'npc/cancelTask',

  // Game actions
  GAME_SAVE: 'game/save',
  GAME_LOAD: 'game/load',
};
```

### Action Structure

```javascript
// Every action has this shape
{
  type: 'world/placeBlock',
  playerId: 'player-123',      // Who initiated
  timestamp: 1234567890,        // When (game time)
  sequence: 42,                 // For ordering/dedup
  payload: {                    // Action-specific data
    chunkKey: '0,0',
    x: 5, y: 10, z: 3,
    blockType: 'stone',
  },
}
```

### Action Dispatcher

```javascript
// src/actions/dispatcher.js

class ActionDispatcher {
  constructor() {
    this.validators = new Map();
    this.handlers = new Map();
    this.middleware = [];
    this.networkAdapter = null;  // Set when multiplayer active
  }

  // Register action handler
  register(actionType, validator, handler) {
    this.validators.set(actionType, validator);
    this.handlers.set(actionType, handler);
  }

  // Dispatch action (from local input)
  dispatch(action) {
    // Run through middleware (logging, etc.)
    for (const mw of this.middleware) {
      action = mw(action);
      if (!action) return;  // Middleware can cancel
    }

    // If we're the host (or single-player), process directly
    if (this.isHost()) {
      this.processAction(action);
    } else {
      // Send to host for validation
      this.networkAdapter?.sendAction(action);

      // Apply prediction for certain action types
      if (this.shouldPredict(action.type)) {
        this.applyPrediction(action);
      }
    }
  }

  // Process action (host only)
  processAction(action) {
    const validator = this.validators.get(action.type);
    const handler = this.handlers.get(action.type);

    if (!validator || !handler) {
      console.warn(`Unknown action type: ${action.type}`);
      return { success: false, error: 'Unknown action' };
    }

    // Validate
    const validation = validator(action);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Apply
    handler(action);

    // Broadcast to clients
    this.networkAdapter?.broadcastAction(action);

    return { success: true };
  }

  // Actions that should be predicted locally
  shouldPredict(actionType) {
    return [
      ActionTypes.PLAYER_MOVE,
      ActionTypes.PLAYER_JUMP,
      ActionTypes.WORLD_PLACE_BLOCK,
      ActionTypes.WORLD_BREAK_BLOCK,
    ].includes(actionType);
  }

  isHost() {
    // In single-player, always host
    // In multiplayer, check network adapter
    return !this.networkAdapter || this.networkAdapter.isHost();
  }
}

export const dispatcher = new ActionDispatcher();
```

### Registering Action Handlers

```javascript
// src/actions/worldActions.js
import { dispatcher } from './dispatcher';
import { ActionTypes } from './actionTypes';
import { useWorldStore } from '../stores/worldStore';

// Validator: Can the player place this block?
function validatePlaceBlock(action) {
  const { playerId, payload } = action;
  const { chunkKey, x, y, z, blockType } = payload;

  // Check player has the block in inventory
  // Check position is valid
  // Check not placing inside another player
  // etc.

  return { valid: true };
}

// Handler: Apply the block placement
function handlePlaceBlock(action) {
  const { chunkKey, x, y, z, blockType } = action.payload;
  useWorldStore.getState().setBlock(chunkKey, x, y, z, blockType);
}

// Register
dispatcher.register(
  ActionTypes.WORLD_PLACE_BLOCK,
  validatePlaceBlock,
  handlePlaceBlock
);
```

---

## Single-Player Mode

In single-player, the architecture simplifies but uses the same code:

```javascript
// src/systems/GameSession.js

class GameSession {
  constructor() {
    this.mode = 'single';  // 'single', 'host', 'client'
    this.dispatcher = dispatcher;
  }

  startSinglePlayer(seed) {
    this.mode = 'single';
    this.dispatcher.networkAdapter = null;  // No network

    // Initialize stores
    useWorldStore.getState().initialize(seed);

    // Create local player
    const playerId = 'local-player';
    usePlayersStore.getState().setLocalPlayer(playerId);
    usePlayersStore.getState().setPlayer(playerId, {
      id: playerId,
      name: 'Player',
      position: { x: 0, y: 20, z: 0 },
      health: 100,
      // ...
    });
  }

  // All actions go through dispatcher
  placeBlock(chunkKey, x, y, z, blockType) {
    this.dispatcher.dispatch({
      type: ActionTypes.WORLD_PLACE_BLOCK,
      playerId: usePlayersStore.getState().localPlayerId,
      timestamp: useWorldStore.getState().time,
      sequence: this.nextSequence(),
      payload: { chunkKey, x, y, z, blockType },
    });
  }
}

export const gameSession = new GameSession();
```

---

## Network Layer (Phase 6 Preview)

The network adapter interface we'll implement later:

```javascript
// src/network/NetworkAdapter.js (interface)

class NetworkAdapter {
  // Connection
  async connect(hostId) {}
  async host() {}
  disconnect() {}

  // State
  isHost() {}
  isConnected() {}
  getPlayerId() {}

  // Actions
  sendAction(action) {}
  broadcastAction(action) {}
  onAction(callback) {}

  // State sync
  sendState(state) {}
  onState(callback) {}

  // Players
  onPlayerJoin(callback) {}
  onPlayerLeave(callback) {}
}
```

---

## Serialization Format

For save files and network transmission:

```javascript
// Full game state serialization
function serializeGameState() {
  return {
    version: 1,
    timestamp: Date.now(),

    world: useWorldStore.getState().serialize(),
    players: usePlayersStore.getState().serialize(),
    entities: useEntitiesStore.getState().serialize(),
    settlement: useSettlementStore.getState().serialize(),
  };
}

function deserializeGameState(data) {
  if (data.version !== 1) {
    throw new Error(`Unknown save version: ${data.version}`);
  }

  useWorldStore.getState().deserialize(data.world);
  usePlayersStore.getState().deserialize(data.players);
  useEntitiesStore.getState().deserialize(data.entities);
  useSettlementStore.getState().deserialize(data.settlement);
}
```

---

## Testing Strategy

### Unit Tests

```javascript
// Test action validation
test('placeBlock validates player has block in inventory', () => {
  const action = createPlaceBlockAction('player-1', 'stone');
  setPlayerInventory('player-1', []); // Empty inventory

  const result = validatePlaceBlock(action);

  expect(result.valid).toBe(false);
  expect(result.error).toContain('inventory');
});

// Test action handling
test('placeBlock adds modification to world state', () => {
  const action = createPlaceBlockAction('player-1', 'stone');

  handlePlaceBlock(action);

  const mods = useWorldStore.getState().getChunkModifications('0,0');
  expect(mods).toContainEqual(expect.objectContaining({ block: 'stone' }));
});
```

### Integration Tests

```javascript
// Test full action flow
test('player can place block through dispatcher', () => {
  const session = new GameSession();
  session.startSinglePlayer(123);

  session.placeBlock('0,0', 5, 10, 3, 'stone');

  // Verify world state updated
  const mods = useWorldStore.getState().getChunkModifications('0,0');
  expect(mods).toHaveLength(1);
});
```

---

## Summary

### Key Principles

1. **All mutations through actions** - No direct state manipulation
2. **Host is authoritative** - Single source of truth
3. **Clients predict** - For responsive feel
4. **State is serializable** - For save/load and network
5. **Single-player = host** - Same code paths

### Files to Create

1. `src/stores/worldStore.js`
2. `src/stores/playersStore.js`
3. `src/stores/entitiesStore.js`
4. `src/stores/settlementStore.js`
5. `src/stores/predictionStore.js`
6. `src/stores/uiStore.js`
7. `src/actions/actionTypes.js`
8. `src/actions/dispatcher.js`
9. `src/actions/worldActions.js`
10. `src/actions/playerActions.js`
11. `src/systems/GameSession.js`
