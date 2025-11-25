# Archived 3D Components

**Last Updated:** November 25, 2025
**Status:** Archived
**Purpose:** Preserve 3D game version components for future reference

---

## Overview

This directory contains the archived 3D version of the Voxel RPG Game. The 3D version was built using React-Three-Fiber (Three.js) with Rapier physics. The project has been refocused to the 2D Canvas version only.

---

## Archived Files

### Entry Points

| File | Description |
|------|-------------|
| `App3D.jsx` | Main 3D app component - Three.js Canvas with Experience scene |
| `GameSelector.jsx` | Mode selector (allowed switching between 2D and 3D) |

### 3D Scene Components

| File | Description |
|------|-------------|
| `Experience.jsx` | Main 3D scene container with Physics (Rapier) |
| `Player.jsx` | 3D player mesh with movement, keyboard/touch controls |
| `Enemy.jsx` | 3D enemy entities with physics |
| `VoxelTerrain.jsx` | 3D voxel terrain mesh |
| `Projectile.jsx` | 3D projectile physics & rendering |
| `ParticleEffect.jsx` | 3D particle effects |
| `DamageNumber.jsx` | 3D floating damage numbers |
| `XPOrb.jsx` | 3D experience orb pickups |
| `LootDrop.jsx` | 3D loot drop entities |
| `TargetMarker.jsx` | 3D target/movement indicators |
| `TouchControls.jsx` | Touch/click input handling for 3D |
| `CameraRotateControls.jsx` | 3D camera rotation controls |
| `WaveManager.jsx` | Wave spawn management for 3D |

---

## Dependencies Required

To restore the 3D version, the following dependencies must be added to `package.json`:

```json
{
  "dependencies": {
    "@react-three/drei": "^9.122.0",
    "@react-three/fiber": "^8.18.0",
    "@react-three/rapier": "^1.5.0",
    "three": "^0.160.1"
  },
  "overrides": {
    "three-mesh-bvh": "^0.8.0"
  }
}
```

---

## Restoration Guide

To restore the 3D version:

1. **Add dependencies** to `package.json` (see above)

2. **Move files back** to their original locations:
   ```bash
   # Create 3d directory
   mkdir -p src/components/3d

   # Move 3D scene components
   mv documentation/archive-code/3d-components/*.jsx src/components/3d/

   # Move App3D back
   mv documentation/archive-code/3d-components/App3D.jsx src/

   # Move GameSelector back
   mv documentation/archive-code/3d-components/GameSelector.jsx src/
   ```

3. **Update `src/index.js`** to use GameSelector:
   ```javascript
   import GameSelector from './GameSelector';
   // Remove initDebugCommands() - GameSelector handles it

   // Change <App /> to <GameSelector />
   ```

4. **Run npm install** to install 3D dependencies

---

## Original Architecture

### 3D Entry Flow

```
index.js
  └─> GameSelector.jsx (User chooses 2D or 3D)
       ├─> 2D: App.jsx
       │    └─> GameProvider → GameScreen → GameViewport (Canvas 2D)
       │
       └─> 3D: App3D.jsx
            └─> Canvas (React-Three-Fiber)
                 └─> Experience.jsx (3D scene)
                      ├─> Physics (Rapier)
                      ├─> Player
                      ├─> Enemies
                      ├─> VoxelTerrain
                      ├─> Projectiles
                      └─> Effects
```

### Key Technologies

- **Three.js** - 3D rendering engine
- **React-Three-Fiber** - React renderer for Three.js
- **@react-three/drei** - Three.js utilities and helpers
- **@react-three/rapier** - Physics engine integration

### Features

- Isometric 3D perspective
- Physics-based movement with gravity
- 3D particle effects
- Camera rotation controls
- Touch/tap controls for mobile
- WebGL rendering

---

## Reason for Archival

The 3D version was archived to:

1. **Reduce bundle size** - Three.js and related packages add ~500KB+ to the bundle
2. **Focus development** - Concentrate on polishing the 2D Canvas version
3. **Improve performance** - 2D Canvas has better mobile performance
4. **Simplify maintenance** - Single rendering path reduces complexity

The 3D code is preserved here for potential future reactivation.

---

## Related Documentation

- [ARCHITECTURE.md](../../../ARCHITECTURE.md) - System architecture
- [3D_MIGRATION_GUIDE.md](../migration/3D_MIGRATION_GUIDE.md) - Original 3D migration guide

---

**Archive Created:** November 25, 2025
**Archived By:** Claude Code Assistant
**Version:** 1.0
