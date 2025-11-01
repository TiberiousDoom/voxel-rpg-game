# 🏗️ System Architecture - Voxel RPG

## Current Architecture (Pre-Refactor)

### Monolithic Component Design
```
App.js (1204 lines)
├── Game State (18 useState hooks)
├── Game Loop (useEffect + requestAnimationFrame)
├── Rendering Logic (Canvas drawing)
├── Event Handlers (Keyboard, Mouse)
├── Collision Detection
├── Enemy AI
└── UI Rendering
```

**Status:** ⚠️ Functional but difficult to maintain and scale

### Component Hierarchy (Current)
```
VoxelRPG
└── Entire game logic in single component
    ├── Canvas rendering
    ├── Player management
    ├── Enemy management
    ├── Projectile management
    ├── Loot management
    ├── Quest system
    ├── Base building
    ├── Inventory
    └── UI overlays
```

---

## Planned Architecture (Post-Refactor)

### Proposed Component Structure
```
src/
├── App.jsx (150 lines)
│   └── Main component tying everything together
│
├── components/
│   ├── Game/
│   │   ├── VoxelRPG.jsx (200 lines - container)
│   │   ├── GameCanvas.jsx (200 lines - rendering only)
│   │   ├── PlayerUI.jsx (100 lines - health/mana/xp bars)
│   │   ├── Inventory.jsx (150 lines - inventory modal)
│   │   ├── BaseBuilding.jsx (150 lines - build menu)
│   │   ├── NotificationSystem.jsx (60 lines - toast notifications)
│   │   ├── IntroScreen.jsx (80 lines - start screen)
│   │   ├── GameOverScreen.jsx (80 lines - game over screen)
│   │   └── ErrorBoundary.jsx (50 lines - error handling)
│   │
│   └── UI/
│       ├── Button.jsx (30 lines)
│       ├── Modal.jsx (40 lines)
│       └── HealthBar.jsx (50 lines)
│
├── hooks/
│   ├── useGameLoop.js (150 lines)
│   ├── usePlayer.js (120 lines)
│   ├── useEnemies.js (180 lines)
│   ├── useProjectiles.js (140 lines)
│   ├── useCombat.js (160 lines)
│   ├── useCollision.js (120 lines)
│   ├── useDungeons.js (100 lines)
│   ├── useBase.js (100 lines)
│   ├── useQuests.js (80 lines)
│   └── useNotifications.js (70 lines)
│
├── utils/
│   ├── collision.js (80 lines)
│   ├── physics.js (100 lines)
│   ├── terrain.js (120 lines)
│   ├── loot.js (90 lines)
│   ├── enemyAI.js (150 lines)
│   ├── camera.js (60 lines)
│   ├── spriteRenderer.js (100 lines)
│   └── validation.js (50 lines)
│
├── constants/
│   ├── index.js (50 lines)
│   ├── gameBalance.js (120 lines)
│   ├── colors.js (60 lines)
│   ├── ui.js (70 lines)
│   └── sprites.js (50 lines)
│
└── types/
    └── game.ts (TypeScript definitions - future)
```

### Refactored Component Hierarchy
```
App
└── ErrorBoundary
    └── VoxelRPG
        ├── GameCanvas (rendering)
        ├── PlayerUI (health/mana/xp)
        ├── Inventory (modal)
        ├── BaseBuilding (modal)
        ├── NotificationSystem (toasts)
        └── IntroScreen / GameOverScreen (modals)
```

---

## Data Flow Architecture

### Current Data Flow (Problematic)
```
Input Events
    ↓
App.js (processes everything)
    ├─→ Update state
    ├─→ Calculate collisions
    ├─→ Update enemies
    ├─→ Update projectiles
    ├─→ Update player
    └─→ Re-render everything
```

**Issues:**
- 18 separate useState calls
- Multiple state updates can race condition
- All logic in one component
- Entire app re-renders on each state change

### Proposed Data Flow (Improved)
```
Input Events
    ↓
useGameLoop (manages timing)
    ↓
Custom Hooks (update logic)
├─ usePlayer (player state)
├─ useEnemies (enemy state)
├─ useProjectiles (projectile state)
└─ useCollision (collision logic)
    ↓
Selectors (compute derived state)
    ↓
Components (render only)
├─ GameCanvas (render game)
├─ PlayerUI (render UI)
├─ Inventory (render modal)
└─ Notifications (render toasts)
```

**Benefits:**
- Clear separation of concerns
- Easier to test
- Better performance with useMemo/useCallback
- Easier to debug
- Easier to extend

---

## Game Loop Architecture

### Current Implementation
```javascript
useEffect(() => {
  const gameLoop = () => {
    // Updates player
    // Updates enemies
    // Updates projectiles
    // Checks collisions
    // Renders everything
  };
  
  gameLoopRef.current = setInterval(gameLoop, 1000 / 60);
  
  return () => clearInterval(gameLoopRef.current);
}, [dependencies...]); // ❌ Too many dependencies
```

**Problems:** Multiple game loops, memory leak, poor performance

### Improved Implementation
```javascript
const useGameLoop = (gameState, callbacks) => {
  useEffect(() => {
    if (gameState !== 'playing') return;
    
    let frameId;
    let lastTime = performance.now();
    
    const gameLoop = (currentTime) => {
      const deltaTime = (currentTime - lastTime) / 16.67;
      lastTime = currentTime;
      
      callbacks.onUpdate(deltaTime);
      callbacks.onRender();
      
      frameId = requestAnimationFrame(gameLoop);
    };
    
    frameId = requestAnimationFrame(gameLoop);
    
    return () => cancelAnimationFrame(frameId);
  }, [gameState, callbacks]);
};
```

**Benefits:**
- Single game loop
- Proper cleanup
- Delta time handling
- Minimal dependencies

---

## State Management Architecture

### Game State Organization

#### Player State
```javascript
const [player, setPlayer] = useState({
  id: 'player-1',
  x: 1000,
  y: 1000,
  health: 100,
  maxHealth: 100,
  mana: 100,
  maxMana: 100,
  level: 1,
  xp: 0,
  xpToNext: 100,
  damage: 10,
  defense: 0,
  speed: 3,
  rotation: 0,
  equipment: { weapon: null, armor: null }
});
```

#### Entities State (Normalized)
```javascript
const [enemies, setEnemies] = useState([
  {
    id: 'enemy-1',
    type: 'demon',
    x: 500,
    y: 500,
    health: 30,
    maxHealth: 30,
    damage: 5,
    xpReward: 10,
    state: 'roaming' // 'roaming' | 'chasing' | 'hunting'
  }
]);

const [projectiles, setProjectiles] = useState([
  {
    id: 'proj-1',
    type: 'fireball',
    x: 100,
    y: 100,
    vx: 2,
    vy: 1,
    damage: 25,
    owner: 'player-1',
    life: 300
  }
]);

const [loot, setLoot] = useState([
  {
    id: 'loot-1',
    type: 'gold',
    x: 400,
    y: 400,
    value: 10,
    life: 600
  }
]);
```

### State Update Pattern (Improved)
```javascript
// ✅ Good - Batch related updates
const onCollision = (projectile, enemy) => {
  const newHealth = Math.max(0, enemy.health - projectile.damage);
  const isDefeated = newHealth === 0;
  
  // Single update with all changes
  setEnemies(prev => prev.map(e => 
    e.id === enemy.id 
      ? { ...e, health: newHealth }
      : e
  ).filter(e => e.health > 0));
  
  if (isDefeated) {
    addXP(enemy.xpReward);
    dropLoot(enemy.x, enemy.y, enemy.lootTable);
  }
};
```

---

## Performance Architecture

### Optimization Layers

#### Layer 1: Rendering Optimization
```javascript
// Only render visible objects
const visibleEnemies = enemies.filter(e => isInViewport(e, camera));
const visibleLoot = loot.filter(l => isInViewport(l, camera));
const visibleTerrain = terrain.slice(viewportStart, viewportEnd);
```

#### Layer 2: Collision Optimization
```javascript
// Use spatial partitioning (future)
const grid = new SpatialGrid(MAP_WIDTH, MAP_HEIGHT, CELL_SIZE);
const nearbyEnemies = grid.getCellsNear(player.x, player.y);
```

#### Layer 3: State Optimization
```javascript
// Memoize expensive calculations
const playerStats = useMemo(() => ({
  totalDamage: player.damage + (equipment.weapon?.damage || 0),
  totalHealth: player.health + (equipment.armor?.health || 0)
}), [player, equipment]);
```

#### Layer 4: React Optimization
```javascript
// Prevent unnecessary re-renders
export const GameCanvas = React.memo(
  ({ game, camera }) => { ... },
  (prevProps, nextProps) => {
    return prevProps.game === nextProps.game 
      && prevProps.camera === nextProps.camera;
  }
);
```

---

## Canvas Rendering Architecture

### Rendering Pipeline
```
1. Clear Canvas
   └─→ ctx.clearRect(0, 0, width, height)

2. Set Transform
   └─→ Apply camera offset

3. Render Layers (Bottom to Top)
   ├─→ Background/Terrain
   ├─→ Loot items
   ├─→ Enemies
   ├─→ Projectiles
   ├─→ Player
   ├─→ Effects/Particles
   └─→ Debug info (if enabled)

4. Reset Transform

5. Render UI Overlay
   ├─→ Health/Mana bars
   ├─→ Minimap
   ├─→ Quest markers
   └─→ FPS counter
```

### Sprite System
```javascript
// Centralized sprite management
const spriteSystem = {
  load: (spriteData) => { /* load all sprites */ },
  render: (ctx, spriteKey, x, y, width, height) => {
    ctx.drawImage(spriteImages[spriteKey], x, y, width, height);
  },
  renderRotated: (ctx, spriteKey, x, y, angle) => { /* ... */ }
};
```

---

## Enemy AI Architecture

### AI State Machine
```
States:
├─ IDLE (at spawn, not aware)
├─ ROAMING (moving around spawn)
├─ CHASING (player detected, moving toward)
├─ HUNTING (was attacked, looking for attacker)
└─ DEAD (health <= 0)

Transitions:
├─ IDLE → ROAMING (on spawn)
├─ ROAMING → CHASING (player in detection range)
├─ CHASING → HUNTING (player out of range)
├─ HUNTING → ROAMING (hunt timeout)
├─ * → DEAD (health <= 0)
└─ * → IDLE (on reset)
```

### AI Update Loop
```javascript
const updateEnemyAI = (enemy, player) => {
  // 1. Check state transitions
  const newState = getNextState(enemy.state, enemy, player);
  
  // 2. Execute state behavior
  switch (newState) {
    case 'ROAMING':
      return roamBehavior(enemy);
    case 'CHASING':
      return chaseBehavior(enemy, player);
    case 'HUNTING':
      return huntBehavior(enemy, hunterPosition);
    default:
      return enemy;
  }
};
```

---

## Collision System Architecture

### Collision Types
```javascript
// Entity-to-Entity collisions
Player × Enemy → Damage player
Projectile × Enemy → Damage enemy
Enemy × Terrain → Block movement

// Query systems
getEnemiesNear(x, y, radius)
getProjectilesForEntity(entityId)
getTileCollisions(entity)
```

### Collision Detection Optimization Path
```
Phase 1 (Current):
├─ O(n²) naive collision checks
├─ Uses sqrt() distance calculation
└─ Frame rate: 30-45 FPS

Phase 2 (Planned):
├─ Use squared distance (no sqrt)
└─ Frame rate: 50-60 FPS

Phase 3 (Future):
├─ Spatial partitioning/grid
├─ Early rejection with AABB
└─ Frame rate: 60 FPS stable (100+ entities)
```

---

## Module Dependencies

### Core Dependencies
```
App.js
  ├─ VoxelRPG.jsx
  │  ├─ GameCanvas.jsx
  │  │  └─ spriteRenderer.js
  │  ├─ PlayerUI.jsx
  │  ├─ Inventory.jsx
  │  ├─ BaseBuilding.jsx
  │  └─ NotificationSystem.jsx
  │
  ├─ useGameLoop.js
  │  ├─ usePlayer.js
  │  ├─ useEnemies.js
  │  ├─ useProjectiles.js
  │  └─ useCombat.js
  │
  ├─ useCollision.js
  │  └─ collision.js
  │
  ├─ terrain.js
  │  └─ constants/gameBalance.js
  │
  └─ constants/
     ├─ gameBalance.js
     ├─ colors.js
     └─ ui.js
```

### No Circular Dependencies
- Always import from more general to more specific
- Utils don't import components
- Hooks don't import other hooks (except via parameters)
- Constants import nothing (except other constants)

---

## Testing Architecture

### Unit Tests
```
utils/collision.test.js
├─ detectCollision()
├─ getCollisionsWithTerrain()
└─ getEnemiesInRange()

utils/physics.test.js
├─ calculateVelocity()
├─ updatePosition()
└─ calculateDamage()

hooks/usePlayer.test.js
├─ movePlayer()
├─ takeDamage()
└─ gainXP()
```

### Integration Tests
```
Game flow tests
├─ Player moves and enemies react
├─ Projectiles hit and damage enemies
├─ Loot drops and player collects
├─ Quest progress updates
└─ Base building placement works
```

### E2E Tests
```
Full game scenarios
├─ Complete level without dying
├─ Defeat boss
├─ Build base
└─ Complete all quests
```

---

## Deployment Architecture

### Build Pipeline
```
src/ (TypeScript/JSX)
  ↓
Babel (transpile)
  ↓
Webpack (bundle)
  ↓
build/ (minified, optimized)
  ↓
GitHub Pages (or static host)
```

### Performance Targets
```
Load time: < 2 seconds
Bundle size: < 500KB
FPS: 60 (stable)
Memory: < 100MB (browser)
```

---

## Future Architecture Enhancements

### Phase 3 Improvements
1. **TypeScript** - Add type safety
2. **State Management** - Consider Redux/Zustand for complex state
3. **Spatial Partitioning** - Optimize collision detection
4. **Worker Threads** - Offload AI to web worker
5. **Asset Pipeline** - Sprite atlas, shader system

### Phase 4+ Enhancements
1. **Network Multiplayer** - WebSocket server
2. **Procedural Generation** - Better terrain
3. **Save/Load System** - Database integration
4. **Monetization** - Analytics tracking
5. **Accessibility** - WCAG compliance

---

## Architecture Decision Log

### Decision: Monolithic Component (Current)
**Rationale:** Quick prototype and MVP development  
**Trade-off:** Harder to maintain and extend  
**Review Date:** After GitHub release

### Decision: Canvas Rendering (vs WebGL)
**Rationale:** Simpler, adequate performance, better browser support  
**Trade-off:** Limited visual effects  
**Future:** Could migrate to WebGL if needed

### Decision: React Hooks (vs Redux)
**Rationale:** Simpler for game state, less boilerplate  
**Trade-off:** May need redesign if state complexity increases  
**Review Date:** After Phase 3 refactoring

### Decision: Request Animation Frame (vs SetInterval)
**Rationale:** Better performance, synced with browser refresh  
**Trade-off:** Delta time calculation needed  
**Status:** Required change in Phase 2

---

**Last Updated:** October 31, 2025  
**Version:** 1.0.0  
**Status:** Ready for Phase 2 Refactoring
