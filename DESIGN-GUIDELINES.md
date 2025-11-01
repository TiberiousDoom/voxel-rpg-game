# 🎨 Design Guidelines - Voxel RPG

## Code Style & Standards

### Naming Conventions

#### Constants
Use SCREAMING_SNAKE_CASE for constants:
```javascript
// ✅ Good
const MAP_WIDTH = 2500;
const ENEMY_SPAWN_INTERVAL = 120;
const MAX_SPELL_LEVEL = 4;

// ❌ Bad
const mapWidth = 2500;
const enemySpawnInterval = 120;
const max_spell_level = 4;
```

#### Variables & Functions
Use camelCase for variables and functions:
```javascript
// ✅ Good
const playerPosition = { x: 100, y: 100 };
const calculateDamage = (base, bonus) => base + bonus;

// ❌ Bad
const PlayerPosition = { x: 100, y: 100 };
const calculate_damage = (base, bonus) => base + bonus;
```

#### Components & Classes
Use PascalCase:
```javascript
// ✅ Good
const GameCanvas = () => { ... };
const PlayerUI = () => { ... };

// ❌ Bad
const gameCanvas = () => { ... };
const player_UI = () => { ... };
```

---

## Performance Priorities

### Rule 1: Maintain 60 FPS
- Target frame rate: 60 FPS (16.67ms per frame)
- Profiling tool: Chrome DevTools Performance tab
- Any operation >5ms should be optimized

### Rule 2: Minimize Re-renders
- Use React.memo for components that receive same props
- Use useMemo for expensive calculations
- Use useCallback for event handlers
- Avoid creating new objects/arrays in render

### Rule 3: Optimize Canvas Rendering
```javascript
// ✅ Good - Only render visible tiles
const visibleTiles = terrain.filter(tile => isInViewport(tile, camera));

// ✅ Good - Disable image smoothing for pixel art
ctx.imageSmoothingEnabled = false;

// ❌ Bad - Render entire map every frame
terrain.forEach(tile => renderTile(tile, ctx));
```

### Rule 4: Efficient Collision Detection
```javascript
// ✅ Good - Use squared distance to avoid sqrt()
const distSquared = (dx * dx) + (dy * dy);
if (distSquared < COLLISION_RADIUS_SQUARED) { ... }

// ❌ Bad - Use sqrt() on every check
const distance = Math.sqrt(dx * dx + dy * dy);
if (distance < COLLISION_RADIUS) { ... }
```

### Rule 5: Batch State Updates
```javascript
// ✅ Good - Single update with all changes
setEnemies(prev => {
  const updated = prev.map(e => updateEnemy(e));
  return updated.filter(e => e.health > 0);
});

// ❌ Bad - Multiple updates causing re-renders
updated.forEach(e => {
  setEnemies(prev => [...prev, e]); // Re-render each time
});
```

---

## Code Organization

### Module Structure
Each module should have a single, well-defined responsibility:

```javascript
// ✅ Good - Focused module
// collision.js - Only handles collision detection
export const detectCollision = (entity1, entity2, radius) => { ... };
export const detectCollisionsWithTerrain = (entity, terrain) => { ... };

// ❌ Bad - Too many concerns
// utils.js - Does everything
export const detectCollision = { ... };
export const renderTile = { ... };
export const parseJSON = { ... };
export const calculateDamage = { ... };
```

### File Size Guidelines
- **Components:** <300 lines (preferably <150)
- **Custom hooks:** <200 lines
- **Utility functions:** <100 lines
- **Constants files:** <500 lines

### Folder Structure
```
src/
├── components/           # Reusable React components
│   ├── Game/
│   │   ├── GameCanvas.jsx
│   │   ├── PlayerUI.jsx
│   │   └── ...
│   └── ...
├── hooks/               # Custom React hooks
│   ├── useGameLoop.js
│   ├── usePlayer.js
│   └── ...
├── utils/               # Pure utility functions
│   ├── collision.js
│   ├── physics.js
│   ├── terrain.js
│   └── ...
├── constants/           # All game constants
│   ├── gameBalance.js
│   ├── colors.js
│   └── ui.js
├── App.js              # Main component
└── index.js            # Entry point
```

---

## React Best Practices

### Hooks Usage

#### ✅ Do
```javascript
// Use hooks at top level
const MyComponent = () => {
  const [count, setCount] = useState(0);
  const memoized = useMemo(() => expensiveCalc(), [deps]);
  const callback = useCallback(() => handler(), [deps]);
  
  useEffect(() => {
    // Effect logic
    return () => { /* cleanup */ };
  }, [dependencies]);
};

// Wrap expensive callbacks
const handleClick = useCallback(() => { ... }, [deps]);
const handleData = useMemo(() => processData(), [deps]);
```

#### ❌ Don't
```javascript
// Don't call hooks conditionally
if (someCondition) {
  const [count, setCount] = useState(0); // ❌ Bad
}

// Don't nest useState inside other setters
setInventory(prev => {
  setPlayer(p => ...); // ❌ Bad
  return prev;
});

// Don't forget dependencies
useEffect(() => {
  useFunction(); // ❌ Missing dependency
}, []);
```

### State Management Rules

#### Atomic Updates
```javascript
// ✅ Good - Related updates together
setGameState(prev => ({
  ...prev,
  player: { ...prev.player, health: prev.player.health - 10 },
  enemies: prev.enemies.filter(e => e.id !== enemyId)
}));

// ❌ Bad - Separate updates race
setPlayer(p => ({ ...p, health: p.health - 10 }));
setEnemies(e => e.filter(enemy => enemy.id !== enemyId));
```

#### Normalize State
```javascript
// ✅ Good - Normalized by ID
const enemies = {
  '1': { id: '1', health: 50, x: 100 },
  '2': { id: '2', health: 30, x: 200 }
};

// ❌ Bad - Arrays with search overhead
const enemies = [
  { id: '1', health: 50, x: 100 },
  { id: '2', health: 30, x: 200 }
];
// Need to search array every time
const enemy = enemies.find(e => e.id === '1');
```

---

## Game Development Guidelines

### Game Loop Structure
```javascript
const gameLoop = (deltaTime) => {
  // 1. Input
  updatePlayerInput();
  
  // 2. Update
  updatePlayer(deltaTime);
  updateEnemies(deltaTime);
  updateProjectiles(deltaTime);
  updateCollisions();
  
  // 3. Render
  clearCanvas();
  renderTerrain();
  renderEntities();
  renderUI();
};
```

### Collision Detection
```javascript
// Quadratic complexity - O(n²) - can be optimized with spatial partitioning
const checkCollisions = (entities) => {
  for (let i = 0; i < entities.length; i++) {
    for (let j = i + 1; j < entities.length; j++) {
      if (detectCollision(entities[i], entities[j])) {
        handleCollision(entities[i], entities[j]);
      }
    }
  }
};
```

### Entity Update Pattern
```javascript
// Update entities with immutability
const updateEnemies = (enemies, deltaTime) => {
  return enemies.map(enemy => {
    const newEnemy = { ...enemy };
    newEnemy.x += newEnemy.vx * deltaTime;
    newEnemy.y += newEnemy.vy * deltaTime;
    newEnemy.rotation = calculateAngle(newEnemy, target);
    return newEnemy;
  }).filter(e => e.health > 0);
};
```

---

## Architecture Patterns

### Custom Hook Pattern
```javascript
// ✅ Good - Encapsulate game logic
const usePlayer = (initialState) => {
  const [player, setPlayer] = useState(initialState);
  
  const movePlayer = useCallback((dx, dy) => {
    setPlayer(prev => ({
      ...prev,
      x: prev.x + dx,
      y: prev.y + dy
    }));
  }, []);
  
  const takeDamage = useCallback((amount) => {
    setPlayer(prev => ({
      ...prev,
      health: Math.max(0, prev.health - amount)
    }));
  }, []);
  
  return { player, movePlayer, takeDamage };
};

// Usage
const { player, movePlayer, takeDamage } = usePlayer(initialPlayer);
```

### Component Composition Pattern
```javascript
// Break into focused components
<VoxelRPG>
  <GameCanvas />
  <PlayerUI />
  <Inventory />
  <BaseBuilder />
  <Notifications />
</VoxelRPG>

// Easier to:
// - Test individual components
// - Reuse components
// - Find bugs
// - Update features
```

---

## Magic Numbers & Constants

### All Numbers Should Be Named
```javascript
// ❌ Bad - Magic numbers everywhere
const enemies = terrain.filter(t => {
  return t.type === 2 && t.health < 30 && t.damage > 5;
});

// ✅ Good - Named constants
const ENEMY_TYPE_HOSTILE = 2;
const HEALTH_THRESHOLD_CRITICAL = 30;
const DAMAGE_THRESHOLD_DANGEROUS = 5;

const enemies = terrain.filter(t => {
  return t.type === ENEMY_TYPE_HOSTILE 
    && t.health < HEALTH_THRESHOLD_CRITICAL 
    && t.damage > DAMAGE_THRESHOLD_DANGEROUS;
});
```

### Constants Organization
```javascript
// gameBalance.js
export const PLAYER = {
  INITIAL_HEALTH: 100,
  INITIAL_MANA: 100,
  HEALTH_PER_LEVEL: 20,
  DAMAGE_PER_LEVEL: 5
};

export const ENEMIES = {
  SPAWN_INTERVAL: 120,
  SPAWN_RADIUS: 500,
  MAX_COUNT: 50,
  DETECTION_RADIUS: 400,
  HUNT_RADIUS: 800
};

export const SPELLS = {
  FIREBALL: { COST: 15, DAMAGE: 25, COOLDOWN: 0.5 },
  LIGHTNING: { COST: 25, DAMAGE: 40, COOLDOWN: 1 },
  HEAL: { COST: 30, AMOUNT: 40, COOLDOWN: 2 },
  METEOR: { COST: 50, DAMAGE: 60, COOLDOWN: 3 }
};
```

---

## Error Handling

### Try-Catch Pattern
```javascript
// ✅ Good - Handle specific errors
try {
  const result = parseGameState(data);
  updateGame(result);
} catch (error) {
  console.error('Failed to parse game state:', error);
  resetGameState();
}

// ❌ Bad - Silent failures
try {
  parseGameState(data);
} catch (error) {
  // Silently ignored - very bad for debugging
}
```

### Error Boundary Pattern
```javascript
// Wrap game in error boundary
<ErrorBoundary fallback={<GameCrashScreen />}>
  <VoxelRPG />
</ErrorBoundary>

// Catches and displays errors gracefully
```

---

## Testing Guidelines

### Unit Test Structure
```javascript
describe('collision', () => {
  it('should detect collision when entities overlap', () => {
    const entity1 = { x: 100, y: 100 };
    const entity2 = { x: 105, y: 105 };
    expect(detectCollision(entity1, entity2, 25)).toBe(true);
  });
  
  it('should not detect collision when entities far apart', () => {
    const entity1 = { x: 0, y: 0 };
    const entity2 = { x: 1000, y: 1000 };
    expect(detectCollision(entity1, entity2, 25)).toBe(false);
  });
});
```

### Coverage Goals
- **Target:** 70%+ test coverage
- **Priority areas:** Collision, physics, damage calculation, loot
- **Nice to have:** UI, animations

---

## Documentation Standards

### Inline Comments
```javascript
// ✅ Good - Explain WHY, not WHAT
// Use squared distance to avoid expensive sqrt() calculation
const distSquared = (dx * dx) + (dy * dy);
if (distSquared < COLLISION_RADIUS_SQUARED) {
  handleCollision();
}

// ❌ Bad - Redundant comments
// Add squared distance
const distSquared = (dx * dx) + (dy * dy);
```

### Function Documentation
```javascript
/**
 * Calculate damage to player from an enemy attack
 * @param {number} baseDamage - Enemy's base damage value
 * @param {Object} player - Player object with defense stat
 * @returns {number} Final damage after defense reduction
 */
const calculatePlayerDamage = (baseDamage, player) => {
  return Math.max(1, baseDamage - player.defense);
};
```

---

## Performance Optimization Checklist

- [ ] Use requestAnimationFrame for game loop (not setInterval)
- [ ] Disable canvas image smoothing for pixel art
- [ ] Use squared distance for collision checks
- [ ] Batch state updates together
- [ ] Memoize expensive calculations
- [ ] Use React.memo for components
- [ ] Avoid creating new objects/functions in renders
- [ ] Keep components <300 lines
- [ ] Extract constants to separate file
- [ ] Profile with Chrome DevTools regularly

---

## Code Review Checklist

Before committing:
- [ ] Code follows naming conventions
- [ ] No magic numbers (all in constants)
- [ ] Functions have single responsibility
- [ ] Performance-critical code is optimized
- [ ] No console.log() left in production code
- [ ] Comments explain WHY, not WHAT
- [ ] Tests added for new features
- [ ] No memory leaks
- [ ] Follows project architecture

---

**Last Updated:** October 31, 2025  
**Version:** 1.0.0  
**Status:** Ready for implementation
