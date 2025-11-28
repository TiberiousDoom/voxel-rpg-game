# Sprite System Implementation Plan

**Last Updated:** 2025-11-17
**Status:** Active
**Purpose:** Implementation plan for adding sprite-based rendering to NPCs, buildings, and player character

---

## Table of Contents

1. [Overview](#overview)
2. [Current State Analysis](#current-state-analysis)
3. [Goals & Scope](#goals--scope)
4. [Technical Architecture](#technical-architecture)
5. [Implementation Phases](#implementation-phases)
6. [Asset Specifications](#asset-specifications)
7. [Integration Strategy](#integration-strategy)
8. [Testing Plan](#testing-plan)
9. [Performance Considerations](#performance-considerations)
10. [Rollout Strategy](#rollout-strategy)
11. [References](#references)

---

## Overview

This plan outlines the implementation of a sprite-based rendering system to replace the current circle/shape-based visualization of game entities. The system will add visual appeal through actual sprite images while maintaining the existing animation framework and performance characteristics.

### Problem Statement

Currently, all game entities (NPCs, buildings, player) are rendered as colored circles or simple shapes. While functional, this lacks visual appeal and makes it difficult to distinguish entity types at a glance.

### Solution

Implement a flexible sprite loading and rendering system that:
- Loads PNG sprite sheets for all entity types
- Integrates with existing animation frameworks
- Maintains or improves current performance
- Provides graceful fallback to current rendering

---

## Current State Analysis

### Existing Infrastructure ✅

**NPC Rendering System** (`src/rendering/`)
- ✅ NPCRenderer with smooth interpolation
- ✅ Animation frame management
- ✅ Direction-based sprite flipping
- ✅ Status indicators (health bars, badges)
- ✅ Performance optimized for 100+ NPCs

**Building Rendering System** (`src/rendering/`)
- ✅ BuildingRenderer with state management
- ✅ Multi-state support (blueprint, construction, complete)
- ✅ Visual indicators for building status

**Player Rendering System** (`src/modules/player/`)
- ✅ PlayerRenderer with movement animations
- ✅ Health/stamina bars
- ✅ Sprint indicators
- ✅ Direction facing

### Current Rendering Method

All entities currently render as:
- **NPCs**: 8px radius colored circles with role-based colors
- **Buildings**: 40x40px colored rectangles with type-based colors
- **Player**: 12px radius blue circle with white outline

### Gaps to Fill

1. **Sprite Loading System** - No infrastructure for loading/caching sprites
2. **Sprite Sheet Parser** - No system for extracting frames from sprite sheets
3. **Asset Management** - No organized asset directory structure
4. **Fallback System** - Need graceful degradation if sprites fail to load

---

## Goals & Scope

### Primary Goals 🎯

1. **Add Visual Appeal** - Replace circles with actual sprite images
2. **Maintain Performance** - No degradation in 60 FPS target with 100+ NPCs
3. **Preserve Animation** - Leverage existing animation framework
4. **Incremental Adoption** - Allow gradual rollout per entity type
5. **Developer Friendly** - Easy to add new sprites and test

### Success Criteria ✅

- [ ] All NPCs render with sprites (6 role types)
- [ ] All buildings render with sprites (6+ building types)
- [ ] Player renders with sprites (idle, walk, sprint)
- [ ] Maintains 60 FPS with 100 NPCs
- [ ] < 5MB total sprite asset size
- [ ] Fallback to circles works if sprites fail
- [ ] Hot-reload sprites in development mode

### Non-Goals ❌

- Complex particle effects
- 3D rendering or perspective
- Dynamic sprite generation
- Skeletal animation
- Advanced shader effects

---

## Technical Architecture

### Component Overview

```
Sprite System Architecture
│
├── Asset Management Layer
│   ├── public/assets/sprites/        # PNG sprite files
│   │   ├── npcs/                     # NPC sprite sheets
│   │   ├── buildings/                # Building sprites
│   │   └── player/                   # Player sprite sheets
│   │
│   └── src/assets/
│       └── sprite-manifest.js        # Sprite path definitions
│
├── Loading Layer
│   └── src/rendering/
│       ├── SpriteLoader.js           # Image loading & caching
│       └── SpriteSheetParser.js      # Frame extraction
│
├── Integration Layer
│   └── src/rendering/
│       ├── NPCRenderer.js            # Updated for sprites
│       ├── BuildingRenderer.js       # Updated for sprites
│       └── src/modules/player/
│           └── PlayerRenderer.js     # Updated for sprites
│
└── Fallback Layer
    └── Existing circle/shape rendering (preserved)
```

### Key Classes

#### SpriteLoader

**Purpose**: Load and cache sprite images

```javascript
class SpriteLoader {
  constructor() {
    this.sprites = new Map();
    this.loading = new Map();
    this.errorCache = new Set();
  }

  async loadSprite(key, path)
  async loadSpriteSheet(key, path, frameWidth, frameHeight)
  getSprite(key)
  hasSprite(key)
  clearCache()
}
```

#### SpriteSheetParser

**Purpose**: Extract individual frames from sprite sheets

```javascript
class SpriteSheetParser {
  constructor(image, frameWidth, frameHeight)

  extractFrame(frameIndex)
  extractAllFrames()
  getFrameCount()
}
```

#### Sprite Manifest

**Purpose**: Central registry of all sprite paths

```javascript
export const NPC_SPRITE_MANIFEST = {
  FARMER: {
    idle: '/assets/sprites/npcs/farmer/idle.png',
    walk: '/assets/sprites/npcs/farmer/walk.png',
    work: '/assets/sprites/npcs/farmer/work.png',
    frames: { idle: 1, walk: 4, work: 4 },
    frameSize: { width: 16, height: 16 }
  },
  // ... other roles
};
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1)

**Goal**: Set up infrastructure for sprite loading

**Tasks**:
1. Create asset directory structure
2. Implement SpriteLoader class
3. Implement SpriteSheetParser class
4. Create sprite manifest files
5. Add unit tests for loaders
6. Create placeholder sprites for testing

**Deliverables**:
- ✅ `/public/assets/sprites/` directory structure
- ✅ `SpriteLoader.js` with tests
- ✅ `SpriteSheetParser.js` with tests
- ✅ `sprite-manifest.js` with all entity definitions
- ✅ 3 test sprites (1 NPC, 1 building, 1 player)

**Success Metrics**:
- Sprites load successfully
- Frames extract correctly from sprite sheets
- < 100ms load time for all sprites
- Tests pass with >80% coverage

---

### Phase 2: NPC Integration (Week 1-2)

**Goal**: Add sprite rendering to NPCs

**Tasks**:
1. Update NPCRenderer to support sprites
2. Add sprite rendering method alongside circle rendering
3. Implement fallback logic
4. Create sprites for all 6 NPC roles (or use placeholders)
5. Test with animation system
6. Performance test with 100 NPCs

**Deliverables**:
- ✅ Updated `NPCRenderer.js` with sprite support
- ✅ NPC sprites for all roles
- ✅ Fallback system tested
- ✅ Performance benchmarks

**Success Metrics**:
- All NPC roles render with sprites
- Direction flipping works correctly
- Animation frames cycle properly
- Maintains 60 FPS with 100 NPCs
- Circle fallback works if sprites fail

---

### Phase 3: Building Integration (Week 2)

**Goal**: Add sprite rendering to buildings

**Tasks**:
1. Update BuildingRenderer to support sprites
2. Create building sprites (or use placeholders)
3. Support multi-state sprites (blueprint, construction, complete)
4. Test with all building types
5. Verify hover/selection indicators still work

**Deliverables**:
- ✅ Updated `BuildingRenderer.js`
- ✅ Building sprites for all types
- ✅ State-based rendering working
- ✅ Interaction indicators functional

**Success Metrics**:
- All building types render with sprites
- State changes visible (blueprint → construction → complete)
- Selection/hover highlights work
- No visual glitches or z-index issues

---

### Phase 4: Player Integration (Week 2-3)

**Goal**: Add sprite rendering to player character

**Tasks**:
1. Update PlayerRenderer to support sprites
2. Create player sprites (idle, walk, sprint)
3. Integrate with movement animations
4. Test sprint effects with sprites
5. Verify health/stamina bars still render

**Deliverables**:
- ✅ Updated `PlayerRenderer.js`
- ✅ Player sprite sheets (3 animation states)
- ✅ Sprint visual effects working
- ✅ UI overlays functional

**Success Metrics**:
- Player renders with sprite
- Walk/sprint animations smooth
- Direction facing works correctly
- Health/stamina bars visible above sprite

---

### Phase 5: Polish & Optimization (Week 3)

**Goal**: Optimize performance and add final touches

**Tasks**:
1. Implement sprite atlas for batch rendering (if needed)
2. Add sprite loading progress indicators
3. Optimize memory usage
4. Add hot-reload for dev mode
5. Create documentation
6. Final performance testing

**Deliverables**:
- ✅ Optimized rendering pipeline
- ✅ Developer documentation
- ✅ Performance report
- ✅ User-facing release notes

**Success Metrics**:
- < 5MB total sprite assets
- < 150MB memory usage
- 60 FPS maintained
- All sprites load < 2 seconds
- Zero visual glitches

---

## Asset Specifications

### Directory Structure

```
public/assets/sprites/
├── npcs/
│   ├── farmer/
│   │   ├── idle.png          # 16x16 (1 frame)
│   │   ├── walk.png          # 16x64 (4 frames horizontal)
│   │   └── work.png          # 16x64 (4 frames horizontal)
│   ├── guard/
│   ├── worker/
│   ├── craftsman/
│   ├── miner/
│   └── merchant/
│
├── buildings/
│   ├── farm.png              # 40x40 (single frame)
│   ├── house.png             # 40x40
│   ├── warehouse.png         # 40x40
│   ├── town_center.png       # 40x40
│   ├── watchtower.png        # 40x40
│   └── campfire.png          # 40x40
│
└── player/
    ├── idle.png              # 16x16 (1 frame)
    ├── walk.png              # 16x64 (4 frames horizontal)
    └── sprint.png            # 16x64 (4 frames horizontal)
```

### Sprite Specifications

#### NPC Sprites
- **Base Size**: 16x16 pixels per frame
- **Format**: PNG with transparency
- **Color Depth**: 32-bit RGBA
- **Animation**: 4 frames for animated actions
- **Sprite Sheet Layout**: Horizontal strip (frame1|frame2|frame3|frame4)
- **File Size Target**: < 5KB per sprite sheet
- **Style**: Pixel art or simple 2D

**Animation States**:
- `idle.png` - 1 frame (16x16)
- `walk.png` - 4 frames (16x64)
- `work.png` - 4 frames (16x64)

#### Building Sprites
- **Size**: 40x40 pixels (matches tile size)
- **Format**: PNG with transparency
- **Single State**: One image per building type
- **Multi-State** (optional): Blueprint, construction, complete variations
- **File Size Target**: < 10KB per sprite
- **Style**: Top-down 2D or isometric

#### Player Sprites
- **Base Size**: 16x16 pixels per frame
- **Format**: PNG with transparency
- **Animation**: 4 frames for movement
- **Sprite Sheet Layout**: Horizontal strip
- **File Size Target**: < 5KB per sprite sheet
- **Distinctive**: Should clearly differ from NPCs

**Animation States**:
- `idle.png` - 1 frame (16x16)
- `walk.png` - 4 frames (16x64)
- `sprint.png` - 4 frames (16x64)

### Asset Creation Options

#### Option A: Placeholder Sprites (Quick Start)
- Create simple colored squares with icons/letters
- Use existing npc-sprites.js colors
- Allows system testing without art assets
- Can be replaced incrementally

**Pros**:
- ✅ Fast to create
- ✅ No licensing concerns
- ✅ Validates system before art investment

**Cons**:
- ❌ Not visually impressive
- ❌ Still needs replacement

#### Option B: Free Asset Packs
- Source from OpenGameArt.org, itch.io, Kenney.nl
- Ensure CC0, CC-BY, or compatible license
- May need recoloring or modification

**Pros**:
- ✅ Professional quality
- ✅ Faster than custom creation
- ✅ Often includes variations

**Cons**:
- ❌ License management
- ❌ May not match game style perfectly
- ❌ Limited customization

#### Option C: Custom Creation
- Commission pixel artist or create in-house
- Full control over style and quality
- Tools: Aseprite, Piskel, PyxelEdit

**Pros**:
- ✅ Perfect style match
- ✅ Full customization
- ✅ No licensing issues

**Cons**:
- ❌ Time-intensive
- ❌ Requires art skills or budget
- ❌ Slower iteration

**Recommendation**: Start with **Option A** for proof-of-concept, then upgrade to **Option B or C** for production.

---

## Integration Strategy

### Renderer Update Pattern

Each renderer follows this pattern:

```javascript
class EntityRenderer {
  constructor(options) {
    this.spriteLoader = new SpriteLoader();
    this.useSprites = options.useSprites !== false;
    this.fallbackToShapes = true;
  }

  async initialize() {
    // Preload sprites
    await this.spriteLoader.loadManifest(ENTITY_SPRITE_MANIFEST);
  }

  render(ctx, entity, worldToCanvas) {
    if (this.useSprites && this.spriteLoader.hasSprite(entity.type)) {
      this.renderWithSprite(ctx, entity, worldToCanvas);
    } else {
      this.renderWithShapes(ctx, entity, worldToCanvas); // Fallback
    }
  }

  renderWithSprite(ctx, entity, worldToCanvas) {
    const sprite = this.spriteLoader.getSprite(entity.type, entity.state);
    const frame = this.getAnimationFrame(entity);

    // Handle sprite flipping for direction
    const flipX = this.shouldFlipSprite(entity);

    ctx.save();
    if (flipX) {
      ctx.scale(-1, 1);
    }

    ctx.drawImage(
      sprite.image,
      frame * sprite.frameWidth, 0,           // Source
      sprite.frameWidth, sprite.frameHeight,
      canvasX, canvasY,                       // Destination
      renderWidth, renderHeight
    );

    ctx.restore();

    // Render overlays (health bars, etc.)
    this.renderOverlays(ctx, entity, worldToCanvas);
  }

  renderWithShapes(ctx, entity, worldToCanvas) {
    // Existing circle/rectangle rendering (preserved)
  }
}
```

### Feature Flags

Control sprite rendering through configuration:

```javascript
// In game config
const config = {
  rendering: {
    useSprites: true,           // Master toggle
    useSpriteNPCs: true,        // Per-entity toggles
    useSpriteBuildings: true,
    useSpritePlayer: true,
    fallbackOnError: true       // Auto-fallback if sprite fails
  }
};
```

### Migration Path

1. **Phase 1**: Sprites off by default, opt-in via config
2. **Phase 2**: Sprites on by default, can disable via config
3. **Phase 3**: Remove shape rendering code (after validation)

---

## Testing Plan

### Unit Tests

**SpriteLoader Tests** (`src/rendering/__tests__/SpriteLoader.test.js`)
- ✅ Load single sprite successfully
- ✅ Load sprite sheet and extract frames
- ✅ Cache sprites correctly
- ✅ Handle missing files gracefully
- ✅ Handle corrupt images
- ✅ Clear cache on demand

**SpriteSheetParser Tests** (`src/rendering/__tests__/SpriteSheetParser.test.js`)
- ✅ Extract correct frame count
- ✅ Extract individual frames
- ✅ Handle edge cases (single frame, odd dimensions)

### Integration Tests

**NPCRenderer Integration** (`src/rendering/__tests__/NPCRenderer.test.js`)
- ✅ Render NPC with sprite
- ✅ Render NPC with fallback (no sprite)
- ✅ Animate sprite frames correctly
- ✅ Flip sprite based on direction
- ✅ Render health bars over sprite

**BuildingRenderer Integration**
- ✅ Render building with sprite
- ✅ Change sprite based on building state
- ✅ Render selection indicators

**PlayerRenderer Integration**
- ✅ Render player with sprite
- ✅ Transition between animation states (idle/walk/sprint)
- ✅ Render health/stamina bars

### Performance Tests

**Load Time Test**
```javascript
// All sprites should load < 2 seconds
test('All sprites load within 2 seconds', async () => {
  const start = performance.now();
  await spriteLoader.loadAllSprites();
  const duration = performance.now() - start;
  expect(duration).toBeLessThan(2000);
});
```

**Frame Rate Test**
```javascript
// Maintain 60 FPS with 100 NPCs
test('Maintains 60 FPS with 100 NPCs using sprites', () => {
  const npcs = generateNPCs(100);
  const fps = measureFPS(() => {
    npcRenderer.renderNPCs(ctx, npcs, worldToCanvas);
  });
  expect(fps).toBeGreaterThanOrEqual(60);
});
```

**Memory Test**
```javascript
// Memory usage < 150MB
test('Memory usage stays below 150MB', () => {
  spriteLoader.loadAllSprites();
  const memoryUsage = performance.memory.usedJSHeapSize / 1024 / 1024;
  expect(memoryUsage).toBeLessThan(150);
});
```

### Visual Regression Tests

- Screenshot comparison before/after sprite implementation
- Manual QA checklist for visual issues
- Verify no z-index or layering problems

---

## Performance Considerations

### Optimization Strategies

1. **Sprite Caching**
   - Cache all loaded sprites in memory
   - Lazy load sprites on first use
   - Preload during loading screen

2. **Canvas Optimization**
   - Use `drawImage()` for sprites (hardware accelerated)
   - Batch draws where possible
   - Minimize context state changes

3. **Memory Management**
   - Clear unused sprites after entity removal
   - Compress sprites (use PNG optimization)
   - Consider sprite atlases for many small sprites

4. **Render Culling** (Future Enhancement)
   - Only render entities in viewport
   - Skip rendering off-screen NPCs
   - Implement LOD (Level of Detail) for distant entities

### Performance Targets

| Metric | Target | Current | Notes |
|--------|--------|---------|-------|
| FPS with 100 NPCs | ≥60 | 60 | Must maintain |
| Sprite Load Time | <2s | N/A | All sprites |
| Memory Usage | <150MB | ~120MB | With sprites loaded |
| Individual Sprite Size | <10KB | N/A | Per sprite sheet |
| Total Asset Size | <5MB | N/A | All sprites combined |

### Performance Monitoring

```javascript
// Add performance tracking
class PerformanceMonitor {
  trackSpriteRenderTime(entityType, renderTime) {
    // Log if > 3ms
  }

  trackMemoryUsage() {
    // Alert if > 150MB
  }

  trackFPS() {
    // Alert if < 55 FPS
  }
}
```

---

## Rollout Strategy

### Development Environment

1. **Feature Branch**: `feature/sprite-system`
2. **Testing**: Local development with test sprites
3. **Code Review**: Before merging to main
4. **Documentation**: Update README and DEVELOPMENT_GUIDE

### Staging/Testing

1. Enable sprites via feature flag
2. Test with placeholder sprites
3. Test with real sprites (if ready)
4. Performance benchmarking
5. Cross-browser testing (Chrome, Firefox, Safari)

### Production Rollout

**Phase 1: Soft Launch**
- Sprites disabled by default
- Can enable via settings/config
- Collect feedback and metrics

**Phase 2: Gradual Enable**
- Enable for subset of users (A/B test)
- Monitor performance and error rates
- Iterate based on feedback

**Phase 3: Full Rollout**
- Enable sprites by default
- Keep fallback system active
- Monitor for issues

**Phase 4: Cleanup** (Optional)
- Remove shape rendering code
- Remove feature flags
- Finalize documentation

---

## Risk Mitigation

### Identified Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Performance degradation | Medium | High | Thorough performance testing, fallback to shapes |
| Sprite loading failures | Low | Medium | Graceful fallback system, error handling |
| Large asset sizes | Medium | Medium | PNG optimization, asset size limits |
| Browser compatibility | Low | Medium | Test on all major browsers, use standard canvas API |
| Art quality inconsistency | Medium | Low | Style guide, placeholder option |
| Delayed art asset creation | High | Medium | Start with placeholders, incremental replacement |

### Contingency Plans

**If performance degrades:**
- Implement sprite atlases
- Add aggressive viewport culling
- Reduce sprite resolution
- Optimize rendering pipeline

**If sprite loading fails:**
- Automatic fallback to shapes
- Retry logic for failed loads
- Offline sprite caching

**If asset creation delays:**
- Launch with placeholder sprites
- Replace incrementally as ready
- Consider free asset packs as temporary solution

---

## Success Metrics

### Technical Metrics

- ✅ All entity types support sprite rendering
- ✅ Maintains 60 FPS with 100+ entities
- ✅ < 2s sprite load time
- ✅ < 5MB total asset size
- ✅ Zero visual rendering bugs
- ✅ 100% fallback functionality

### User Experience Metrics

- ✅ Improved visual clarity (user feedback)
- ✅ Entity types easily distinguishable
- ✅ No negative performance reports
- ✅ Positive feedback on visuals

### Developer Experience Metrics

- ✅ Easy to add new sprites (< 5 minutes)
- ✅ Hot-reload works in dev mode
- ✅ Clear documentation and examples
- ✅ Minimal maintenance overhead

---

## Future Enhancements

**Post-Launch Improvements** (Not in initial scope):

1. **Advanced Animations**
   - More animation states (attacking, gathering, crafting)
   - Smooth state transitions
   - Animation blending

2. **Visual Effects**
   - Particle systems (dust, sparkles)
   - Status effect overlays (poison, buff icons)
   - Weather effects on sprites

3. **Sprite Customization**
   - Equipment visualization on NPCs
   - Color palette swapping
   - Procedural variations

4. **Performance Optimizations**
   - Sprite atlas system
   - WebGL renderer (instead of canvas 2D)
   - Aggressive viewport culling
   - LOD system for distant entities

5. **Tooling**
   - Sprite pack generator script
   - Animation preview tool
   - Sprite performance profiler

---

## References

### Internal Documentation
- [NPC Rendering System](../../src/rendering/README.md)
- [ARCHITECTURE.md](../../ARCHITECTURE.md)
- [DEVELOPMENT_GUIDE.md](../../DEVELOPMENT_GUIDE.md)
- [CURRENT_STATUS.md](../../CURRENT_STATUS.md)

### Code References
- `src/rendering/NPCRenderer.js` - NPC rendering system
- `src/rendering/BuildingRenderer.js` - Building rendering
- `src/modules/player/PlayerRenderer.js` - Player rendering
- `src/assets/npc-sprites.js` - NPC sprite definitions
- `src/components/GameViewport.jsx` - Main viewport component

### External Resources
- [Canvas API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- [Aseprite](https://www.aseprite.org/) - Sprite creation tool
- [Piskel](https://www.piskelapp.com/) - Free online sprite editor
- [OpenGameArt.org](https://opengameart.org/) - Free game assets
- [Kenney.nl](https://kenney.nl/assets) - Free game assets

---

## Approval & Sign-off

**Plan Author**: Claude AI Assistant
**Date Created**: 2025-11-17
**Status**: Active - Awaiting Implementation
**Next Review**: Upon Phase 1 completion

**Stakeholders**:
- [ ] Project Owner - Approval pending
- [ ] Lead Developer - Review pending
- [ ] Art Lead - Assets pending

---

**Document Created:** 2025-11-17
**Version:** 1.0
**Next Update:** Upon Phase 1 completion
