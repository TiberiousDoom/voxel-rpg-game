# NPC Rendering System (WF4)

**Phase 4 - Workflow 4: NPC Rendering & Animations**

**Last Updated:** 2025-11-15
**Status:** Complete
**Owner:** WF4 Developer

---

## Overview

The NPC Rendering System provides advanced visual representation for NPCs with smooth animations, status indicators, and debug visualization. This system was developed as part of Phase 4, Workflow 4 (WF4) and integrates seamlessly with the existing game architecture.

## Features

✅ **Smooth Position Interpolation** - NPCs move smoothly between grid positions using lerp
✅ **Walking Animations** - Frame-based animations with sprite swapping
✅ **Direction-Based Sprite Flipping** - NPCs face their movement direction
✅ **Health Bars** - Visual health indicators when damaged
✅ **Status Icons** - Working/idle/resting/hungry indicators
✅ **Role Badges** - Visual role identification (Farmer, Guard, etc.)
✅ **Thought Bubbles** - Critical needs visualization
✅ **Pathfinding Visualization** - Debug mode shows NPC paths
✅ **Performance Optimized** - Efficient rendering for 100+ NPCs

---

## Architecture

```
src/
├── rendering/                          # WF4: Core rendering modules
│   ├── NPCRenderer.js                  # Main renderer class
│   ├── NPCAnimations.js                # Animation and interpolation utilities
│   ├── NPCSprite.jsx                   # React sprite component
│   ├── useNPCRenderer.js               # React hook for integration
│   └── __tests__/                      # Unit tests
│
├── assets/
│   └── npc-sprites.js                  # WF4: Sprite definitions and colors
│
└── components/
    ├── GameViewport.jsx                # WF4: Updated with NPCRenderer
    └── npc-viewport/                   # WF4: NPC-specific components
        ├── NPCIndicators.jsx           # Health bars, status, role badges
        ├── ThoughtBubble.jsx           # Critical needs bubbles
        └── __tests__/                  # Component tests
```

---

## Core Modules

### 1. NPCRenderer.js

The main rendering engine that manages NPC visualization on canvas.

**Key Features:**
- Position interpolation management
- Animation frame management
- Canvas rendering with transforms
- Debug visualization
- Performance tracking

**Usage:**
```javascript
import NPCRenderer from './rendering/NPCRenderer.js';

const renderer = new NPCRenderer({
  tileSize: 40,
  showHealthBars: true,
  showRoleBadges: true,
  showStatusIndicators: true,
  enableAnimations: true,
  debugMode: false
});

// Update NPC positions (call in animation frame)
renderer.updatePositions(npcs, deltaTime);

// Render NPCs on canvas
renderer.renderNPCs(ctx, npcs, worldToCanvas);

// Render pathfinding paths (debug mode)
renderer.renderAllPaths(ctx, npcs, worldToCanvas);
```

**API:**
- `updatePositions(npcs, deltaTime)` - Update interpolation and animations
- `renderNPCs(ctx, npcs, worldToCanvas)` - Render all NPCs
- `renderAllPaths(ctx, npcs, worldToCanvas)` - Render pathfinding visualization
- `removeNPC(npcId)` - Clean up NPC data
- `clear()` - Clear all NPCs
- `setDebugMode(enabled)` - Toggle debug mode
- `getStats()` - Get performance statistics

---

### 2. NPCAnimations.js

Provides animation and interpolation utilities.

**Key Features:**
- Linear and smooth interpolation (lerp, smoothLerp)
- Position interpolation
- Movement direction calculation
- Sprite flipping logic
- Animation frame management
- NPCPositionInterpolator class

**Usage:**
```javascript
import {
  lerp,
  lerpPosition,
  NPCPositionInterpolator,
  AnimationFrameManager
} from './rendering/NPCAnimations.js';

// Interpolate between positions
const midpoint = lerpPosition(start, end, 0.5);

// Manage NPC position interpolation
const interpolator = new NPCPositionInterpolator(initialPosition);
interpolator.setTarget(newPosition);
const currentPos = interpolator.update(deltaTime);

// Manage animation frames
const animManager = new AnimationFrameManager();
const frameIndex = animManager.update(deltaTime, frames);
```

---

### 3. useNPCRenderer Hook

React hook for easy integration with React components.

**Usage:**
```javascript
import { useNPCRenderer, useNPCAnimation } from './rendering/useNPCRenderer.js';

function GameViewport({ npcs, debugMode }) {
  // Initialize renderer
  const npcRenderer = useNPCRenderer({
    tileSize: 40,
    debugMode: debugMode
  });

  // Auto-update positions in animation frame
  useNPCAnimation(npcs, npcRenderer.updatePositions, true);

  // Render in canvas draw function
  const drawViewport = useCallback((ctx) => {
    // ... render grid and buildings ...

    // Render NPCs
    npcRenderer.renderNPCs(ctx, npcs, worldToCanvas);

    // Render paths in debug mode
    if (debugMode) {
      npcRenderer.renderPaths(ctx, npcs, worldToCanvas);
    }
  }, [npcs, npcRenderer, debugMode]);

  // ... rest of component ...
}
```

---

### 4. NPC Sprite Definitions (npc-sprites.js)

Centralized sprite and color definitions for all NPC roles.

**Supported Roles:**
- FARMER (Green)
- CRAFTSMAN (Orange)
- GUARD (Red)
- WORKER (Blue)
- MINER (Purple)
- MERCHANT (Yellow)

**Usage:**
```javascript
import {
  getSpriteForRole,
  getStatusColor,
  getHealthBarColor,
  getAnimationState
} from './assets/npc-sprites.js';

const sprite = getSpriteForRole('FARMER');
// { name: 'Farmer', color: '#4CAF50', letter: 'F', ... }

const color = getStatusColor(npc);
// Returns color based on NPC health and status
```

---

## React Components

### NPCSprite.jsx

Reusable NPC sprite component for UI displays.

**Usage:**
```jsx
import NPCSprite from './rendering/NPCSprite.jsx';

<NPCSprite
  npc={npc}
  size={32}
  showBadge={true}
  onClick={handleNPCClick}
/>
```

---

### NPCIndicators.jsx

Visual indicators for NPC status.

**Components:**
- `HealthBar` - Health progress bar
- `StatusIcon` - Status emoji icon
- `RoleBadge` - Role identification badge
- `MoraleIndicator` - Morale color indicator
- `NPCIndicators` - Combined indicators

**Usage:**
```jsx
import { NPCIndicators, HealthBar, StatusIcon } from './components/npc-viewport/NPCIndicators.jsx';

// Combined indicators
<NPCIndicators
  npc={npc}
  showHealth={true}
  showStatus={true}
  showRole={true}
  showMorale={true}
  layout="vertical"
/>

// Individual components
<HealthBar health={npc.health} maxHealth={npc.maxHealth} />
<StatusIcon npc={npc} size={12} />
```

---

### ThoughtBubble.jsx

Thought bubbles for critical NPC needs.

**Usage:**
```jsx
import ThoughtBubble from './components/npc-viewport/ThoughtBubble.jsx';

<ThoughtBubble
  npc={npc}
  showText={false}
  position="top"
  size={20}
  animate={true}
/>
```

**Displays:**
- Hunger (🍖)
- Fatigue (😴)
- Low health (❤️)
- Low morale (😞)
- Current activity

---

## GameViewport Integration

### Coordination with WF3

As specified in PHASE_4_WORKFLOWS.md, WF3 and WF4 coordinate on GameViewport.jsx using **separate render functions**:

```javascript
// GameViewport.jsx structure

function GameViewport({ buildings, npcs, debugMode }) {
  // WF3: Building renderer (when implemented)
  const buildingRenderer = useBuildingRenderer();

  // WF4: NPC renderer
  const npcRenderer = useNPCRenderer({ debugMode });
  useNPCAnimation(npcs, npcRenderer.updatePositions, true);

  const drawViewport = useCallback((ctx) => {
    // Draw grid...

    // WF3: Render buildings (when implemented)
    // buildingRenderer.renderBuildings(ctx, buildings, worldToCanvas);

    // WF4: Render NPCs
    npcRenderer.renderNPCs(ctx, npcs, worldToCanvas);

    // WF4: Render paths (debug mode)
    if (debugMode) {
      npcRenderer.renderPaths(ctx, npcs, worldToCanvas);
    }

    // Draw hover preview...
  }, [buildings, npcs, debugMode]);
}
```

### Migration from Old System

The old NPC rendering code has been replaced with the new NPCRenderer. Key changes:

**Before (Old System):**
```javascript
// Manual circle drawing with basic coloring
npcs.forEach((npc) => {
  ctx.fillStyle = getNPCColor(npc);
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  // ... manual health bar drawing ...
});
```

**After (New System):**
```javascript
// Smooth interpolation + animations + advanced features
npcRenderer.renderNPCs(ctx, npcs, worldToCanvas);
```

---

## Performance

### Optimization Features

1. **Position Interpolation**: Smooth movement without frequent state updates
2. **Animation Batching**: Single animation frame updates all NPCs
3. **Selective Rendering**: Skip dead NPCs, off-screen culling (future)
4. **Lazy Initialization**: Interpolators created on-demand
5. **Memory Cleanup**: Proper cleanup when NPCs are removed

### Performance Targets

- ✅ 60 FPS with 50 NPCs
- ✅ 55+ FPS with 100 NPCs (target)
- ✅ <3ms render time per frame
- ✅ <150MB memory usage

### Monitoring

```javascript
const stats = npcRenderer.getStats();
console.log(`NPCs: ${stats.npcCount}, Render time: ${stats.lastRenderTime}ms`);
```

---

## Debug Mode

Enable debug visualization for development:

```javascript
const npcRenderer = useNPCRenderer({ debugMode: true });
```

**Debug Features:**
- Velocity vectors (purple arrows)
- NPC IDs above sprites
- Pathfinding paths (cyan dashed lines)
- Waypoint markers with numbers
- Current waypoint highlighted (purple)

**Keyboard Toggle (WF9 integration):**
```javascript
// Press 'D' to toggle debug mode (when WF9 is complete)
```

---

## Testing

### Running Tests

```bash
# Run all WF4 tests
npm test -- rendering
npm test -- npc-viewport

# Run specific test suites
npm test NPCRenderer.test.js
npm test NPCAnimations.test.js
npm test NPCIndicators.test.jsx
```

### Test Coverage

- ✅ NPCRenderer: Core rendering logic
- ✅ NPCAnimations: Interpolation and animation utilities
- ✅ NPCIndicators: React component rendering
- ✅ Integration: GameViewport integration

**Coverage Target:** 80%+ for all modules

---

## Examples

### Basic Usage

```javascript
import { useNPCRenderer, useNPCAnimation } from './rendering/useNPCRenderer.js';

function MyGameView({ npcs }) {
  const npcRenderer = useNPCRenderer({
    tileSize: 40,
    enableAnimations: true
  });

  useNPCAnimation(npcs, npcRenderer.updatePositions, true);

  const drawCanvas = useCallback((ctx) => {
    ctx.clearRect(0, 0, width, height);
    npcRenderer.renderNPCs(ctx, npcs, worldToCanvas);
  }, [npcs, npcRenderer]);

  return <canvas ref={canvasRef} />;
}
```

### Custom Sprite Rendering

```jsx
import NPCSprite from './rendering/NPCSprite.jsx';
import { NPCIndicators } from './components/npc-viewport/NPCIndicators.jsx';

function NPCCard({ npc }) {
  return (
    <div className="npc-card">
      <NPCSprite npc={npc} size={48} showBadge={true} />
      <div className="npc-info">
        <h3>{npc.name}</h3>
        <NPCIndicators
          npc={npc}
          layout="horizontal"
          showMorale={true}
        />
      </div>
    </div>
  );
}
```

---

## Troubleshooting

### NPCs not animating

**Problem:** NPCs appear static
**Solution:** Ensure `useNPCAnimation` is called:
```javascript
useNPCAnimation(npcs, npcRenderer.updatePositions, true);
```

### Performance issues

**Problem:** Low FPS with many NPCs
**Solutions:**
1. Disable animations: `enableAnimations: false`
2. Reduce update frequency
3. Implement viewport culling (render only visible NPCs)

### Rendering artifacts

**Problem:** NPCs flicker or render incorrectly
**Solution:** Check that `updatePositions` is called before `renderNPCs`:
```javascript
// Correct order
npcRenderer.updatePositions(npcs, deltaTime);
npcRenderer.renderNPCs(ctx, npcs, worldToCanvas);
```

---

## Future Enhancements

Potential improvements for future workflows:

- [ ] **Viewport Culling**: Only render NPCs in visible area
- [ ] **LOD System**: Simplified rendering for distant NPCs
- [ ] **Sprite Sheets**: Replace circles with actual sprites
- [ ] **Particle Effects**: Dust clouds, work particles
- [ ] **Shadow System**: Dynamic shadows under NPCs
- [ ] **Z-Index Sorting**: Proper depth ordering
- [ ] **Outline Highlights**: Highlight selected NPCs
- [ ] **Animation States**: More animation types (attacking, gathering, etc.)

---

## Dependencies

- React 18+
- Canvas API (built-in)
- PropTypes (for component validation)
- Jest (for testing)
- @testing-library/react (for component tests)

---

## Contributing

When modifying the NPC rendering system:

1. **Follow ES6+ standards** (see CONTRIBUTING.md)
2. **Add JSDoc comments** for all public methods
3. **Write unit tests** for new features
4. **Update this README** for API changes
5. **Test with 100+ NPCs** to verify performance
6. **Coordinate with WF3** for GameViewport changes

---

## References

- **Phase 4 Workflows**: `documentation/planning/PHASE_4_WORKFLOWS.md`
- **Contributing Guide**: `CONTRIBUTING.md`
- **Architecture**: `ARCHITECTURE.md`
- **NPC System**: `src/modules/npc-system/NPCManager.js`
- **GameViewport**: `src/components/GameViewport.jsx`

---

## License

Part of the Voxel RPG Game project.

---

**Document Created:** 2025-11-15
**Version:** 1.0
**WF4 Status:** Complete ✅
