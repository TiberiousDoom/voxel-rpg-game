# Phase 0: Terrain Integration Findings & Decisions

**Date:** 2025-11-20
**Status:** In Progress
**Purpose:** Document integration testing results and architectural decisions before Phase 1 implementation

---

## Executive Summary

Phase 0 is a 1-week prototype and validation phase to test how terrain height integrates with existing game systems (building placement, NPC pathfinding, combat, rendering) before committing to full Phase 1 implementation. This document records findings, decisions, and recommendations.

**Time Investment**: 1 week upfront to save 2-4 weeks of potential rework.

---

## Testing Infrastructure Created

### 1. TerrainHeightPrototype Class
**Location**: `src/prototypes/TerrainHeightPrototype.js`

**Features**:
- 10x10 test height map (0-10 height values)
- Varied terrain: flat areas, gentle slopes, steep hills
- `isRegionFlat(x, z, width, depth, tolerance)` - Check if area is suitable for building
- `getRegionAverageHeight()` - Get average height for placement
- `flattenRegion()` - Auto-flatten terrain under buildings
- `getSlope()` - Calculate slope between adjacent tiles

**Test Terrain Layout**:
- **Bottom-Left Quadrant**: Flat (height 0) - for testing flat placement
- **Bottom-Right**: Gentle slope (height 0-3) - for testing slope tolerance
- **Top-Left**: Medium elevation (height 2-4) - for elevated placement
- **Top-Right**: Hill (height 0-8) - for steep slope testing

### 2. Visual Test Page
**Location**: `public/phase0-terrain-test.html`

**Capabilities**:
- Visual height map (color-coded: dark green = low, light green = high)
- Interactive building placement tests
- Auto-flatten demonstration
- FPS performance baseline measurement (1000 frame benchmark)

**To Test**: Run dev server and navigate to `http://localhost:3000/phase0-terrain-test.html`

---

## Integration Tests & Findings

### Test 1: Building Placement on Slopes

**Objective**: Determine if buildings can be placed on sloped terrain and what tolerance is acceptable.

**Test Cases**:
1. **Flat Area (0,0 2x2)**: Height 0-0 (diff: 0)
2. **Gentle Slope (5,2 2x2)**: Height varies by 1-2
3. **Steep Hill (8,8 2x2)**: Height varies by 4-6

**Findings**: *(To be filled after testing)*
- [ ] Can buildings be placed on perfectly flat terrain? (Expected: YES)
- [ ] Can buildings be placed on slopes with height diff = 1? (Test with tolerance 1)
- [ ] Can buildings be placed on slopes with height diff = 2? (Test with tolerance 2)
- [ ] What is the maximum acceptable slope for building placement?

**Decision Point**:
- [ ] **Require perfectly flat terrain** (maxSlopeTolerance = 0)
- [ ] **Allow gentle slopes** (maxSlopeTolerance = 1-2)
- [ ] **Auto-flatten terrain** under buildings (recommended approach)

**Recommendation**: *(To be decided after testing)*

---

### Test 2: Auto-Flatten Terrain

**Objective**: Test if automatically flattening terrain under buildings is a viable approach.

**Test**:
- Select area with slope (e.g., 5,2 2x2)
- Get average height of region
- Flatten all tiles in region to average height
- Verify building can now be placed

**Findings**: *(To be filled after testing)*
- [ ] Does auto-flatten work correctly?
- [ ] What is the performance cost of flattening?
- [ ] Should flattening be automatic or manual (player tool)?
- [ ] Should flattening cost resources (dirt/stone)?

**Decision Point**:
- [ ] **Auto-flatten on building placement** (simplest UX)
- [ ] **Manual terrain tool** (more player control)
- [ ] **No flattening, flat terrain required** (more restrictive)

**Recommendation**: *(To be decided after testing)*

---

### Test 3: Performance Baseline

**Objective**: Measure the performance impact of terrain rendering to establish if 32x32 chunks with 500 props is achievable.

**Test**:
- Render 10x10 terrain (100 tiles) 1000 times
- Measure FPS
- Calculate frame time
- Extrapolate to 50x50 grid (2500 tiles) and 32x32 chunks (1024 tiles)

**Findings**: *(To be filled after testing)*
- [ ] FPS for 10x10 terrain: ____ FPS
- [ ] Frame time per tile: ____ ms
- [ ] Estimated FPS for 50x50: ____ FPS
- [ ] Estimated FPS for 32x32 chunk: ____ FPS
- [ ] Estimated frame time for 500 props + terrain: ____ ms

**Targets**:
- Desktop: 60 FPS (16.67ms frame budget)
- Mobile: 30 FPS (33.33ms frame budget)
- Terrain rendering budget: 4ms (from plan)

**Decision Point**:
- [ ] **Chunk size confirmed**: 32x32 is acceptable
- [ ] **Chunk size adjustment needed**: Use different size based on performance

**Recommendation**: *(To be decided after testing)*

---

### Test 4: NPC Pathfinding with Height

**Objective**: Determine how terrain height affects NPC pathfinding.

**Considerations**:
1. Can NPCs walk up/down slopes?
2. What is max traversable slope?
3. Should height difference have a movement cost?
4. Performance impact of pathfinding with height?

**Test Approach**:
- Review existing NPC pathfinding code
- Prototype pathfinding cost with height
- Test performance with height-aware pathfinding

**Findings**: *(To be filled after code review)*
- [ ] Current pathfinding algorithm: ____
- [ ] Supports cost weighting: YES/NO
- [ ] Max slope NPCs can traverse: ____
- [ ] Height cost multiplier: ____
- [ ] Performance impact: ____ ms per pathfinding call

**Decision Point**:
- [ ] **Simple approach**: NPCs ignore height, visual only
- [ ] **Cost-based**: Height difference adds movement cost
- [ ] **Max slope**: NPCs cannot traverse slopes > X
- [ ] **Layered**: NPCs pathfind on height layers separately

**Recommendation**: *(To be decided after testing)*

---

### Test 5: Combat & Projectiles with Height

**Objective**: Determine if height should affect combat mechanics.

**Considerations**:
1. High ground advantage in combat?
2. Projectiles blocked by terrain elevation?
3. Line-of-sight affected by hills?

**Decision Point** (Simple vs Complex):
- [ ] **Simple (recommended)**: Height is visual only, no gameplay effects
- [ ] **Complex**: Height affects combat, projectiles, LOS (add in later phase)

**Recommendation**: Start simple (visual only), add gameplay effects in Phase 6+ if desired.

---

### Test 6: Rendering Integration

**Objective**: Validate terrain rendering can integrate with existing GameViewport system.

**Current GameViewport**:
- Canvas 2D rendering
- Tile size: 40px
- Grid: 50x50
- Viewport: 800x600 (shows ~20x15 tiles)
- Camera follow system

**Integration Approach**:
- Render terrain layer FIRST (background)
- Render buildings SECOND (on top of terrain)
- Render NPCs/entities THIRD (on top of buildings)
- Buildings positioned at terrain height (Y-axis in rendering)

**Findings**: *(To be validated)*
- [ ] Terrain renders correctly as background layer
- [ ] Buildings render on top of terrain
- [ ] Z-ordering correct (terrain < buildings < entities)
- [ ] Height visualized correctly (isometric or stacked tiles?)

**Decision Point (Height Visualization)**:
- [ ] **Color-coded flat tiles** (darker = lower, lighter = higher) - Simplest
- [ ] **Stacked tiles** (show vertical elevation with stacked sprites) - More 3D feel
- [ ] **Isometric projection** (full isometric view) - Most complex

**Recommendation**: Start with color-coded flat tiles, add stacked tiles in Phase 1 polish.

---

## Architecture Decisions

### Decision 1: GridManager Integration

**Question**: How should GridManager handle terrain height?

**Option A**: Add `terrainHeight` to GridManager
```javascript
gridManager.terrainHeight = new TerrainManager();
gridManager.validateBounds(x, y, z) // y = building layer, separate from terrain height
```

**Option B**: Separate TerrainManager, GridManager queries it
```javascript
// GridManager checks terrain when placing buildings
const terrainHeight = terrainManager.getHeight(x, z);
const buildingY = terrainHeight; // Building placed at terrain height
gridManager.placeBuilding({position: {x, y: buildingY, z}, ...})
```

**Recommendation**: Option B (separation of concerns, TerrainManager is independent)

---

### Decision 2: Terrain Height Storage

**Question**: How is terrain height stored?

**Option A**: 2D array (simple)
```javascript
terrainHeight[z][x] = heightValue; // 0-10
```

**Option B**: Map/dictionary (sparse, memory efficient)
```javascript
terrainHeight.set(`${x},${z}`, heightValue);
```

**Option C**: Chunk-based (for 32x32 chunks)
```javascript
chunks.get(`${chunkX},${chunkZ}`).heightMap[localZ][localX] = heightValue;
```

**Recommendation**: Option C (chunk-based, aligns with Phase 1 plan)

---

### Decision 3: Save System Integration

**Question**: How is terrain saved?

**Approach**: Differential saves (only save changes from procedural baseline)
- Generate terrain procedurally from seed
- Only save modified tiles (flattened, dug, filled)
- On load: regenerate from seed + apply modifications

**Benefits**:
- Small save files (only changes)
- Version-safe (algorithm changes don't break saves)

**Implementation**: Phase 1 (save system architecture week)

---

## Performance Budget Allocation

Based on 60 FPS = 16.67ms frame budget:

| System | Budget | Notes |
|--------|--------|-------|
| **Terrain rendering** | 4ms | 32x32 chunk, color-coded tiles |
| **Prop rendering** | 3ms | 500 props with batching/LOD |
| **Building rendering** | 2ms | Existing system |
| **Entity rendering** | 2ms | NPCs, monsters, player |
| **Game logic** | 5ms | Pathfinding, AI, physics |
| **Other** | 0.67ms | UI, input, etc. |
| **TOTAL** | 16.67ms | 60 FPS |

**Validation**: Measure actual terrain rendering time in test page.

---

## Risks & Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| **Terrain rendering too slow** | High | Low | Use 32x32 chunks, optimize rendering, LOD |
| **Building placement too restrictive** | Medium | Medium | Auto-flatten terrain, adjust tolerance |
| **NPC pathfinding breaks** | High | Low | Make height optional/visual-only initially |
| **Save file size too large** | Medium | Low | Use differential saves |
| **Integration complexity underestimated** | High | Low | This Phase 0 testing mitigates this! |

---

## Next Steps

### Immediate (Phase 0 Completion)
1. ✅ Test building placement on slopes (test page)
2. ✅ Measure performance baseline (test page)
3. [ ] Review NPC pathfinding code
4. [ ] Make integration decisions
5. [ ] Document findings in this file
6. [ ] Create Phase 0 completion report

### Phase 1 Preparation
1. Update Phase 1 plan based on findings
2. Create integration test suite (automated tests)
3. Design TerrainManager API based on decisions
4. Plan save system architecture

---

## Findings Summary

*(To be filled at end of Phase 0)*

### Building Placement Decision
**Decision**: ____________
**Rationale**: ____________

### Performance Conclusion
**Result**: ____________
**Action**: ____________

### NPC Pathfinding Decision
**Decision**: ____________
**Rationale**: ____________

### Combat/Height Decision
**Decision**: ____________
**Rationale**: ____________

### Rendering Approach Decision
**Decision**: ____________
**Rationale**: ____________

---

## Recommendations for Phase 1

*(To be filled at end of Phase 0)*

1. ____________
2. ____________
3. ____________

---

**Phase 0 Start Date:** 2025-11-20
**Phase 0 Target Completion:** 2025-11-27 (1 week)
**Document Version:** 1.0

**Approved By**: ____________
**Date Approved**: ____________
