# 2D Prototype Archive

**Last Updated:** November 2025
**Status:** Archived
**Purpose:** Preserved source code from the React/JavaScript 2D prototype

---

## Overview

This directory contains the complete source code from the 2D React-based prototype of the Voxel RPG Game. The code has been archived to preserve the work while the project transitions to a new implementation approach based on the 2D game planning documents.

---

## Archived Contents

### Source Code (`src/`)
The complete React/JavaScript source code including:

| Directory | Description |
|-----------|-------------|
| `accessibility/` | ARIA labels, focus management |
| `components/` | React UI components |
| `context/` | React context providers |
| `core/` | Core game engine logic |
| `data/` | Game data (recipes, spells, skill trees) |
| `debug/` | Performance monitoring tools |
| `effects/` | Visual effects and particle systems |
| `entities/` | Game entity definitions |
| `hooks/` | React custom hooks |
| `performance/` | Memory management, spatial grids, pooling |
| `persistence/` | Save/load system |
| `rendering/` | Sprite and tile rendering |
| `shared/` | Shared utilities |
| `systems/` | Game systems (AI, loot, dungeons) |
| `workers/` | Web workers |

### Configuration Files
| File | Description |
|------|-------------|
| `package.json` | NPM dependencies and scripts |
| `package-lock.json` | Locked dependency versions |
| `postcss.config.js` | PostCSS configuration |
| `tailwind.config.js` | Tailwind CSS configuration |

### Tools & Scripts
| Directory | Description |
|-----------|-------------|
| `scripts/` | Build and generation scripts |
| `tools/` | Sprite generator and utilities |

### Documentation
| Directory/File | Description |
|----------------|-------------|
| `docs/` | Original game vision documents |
| `documentation/` | Complete project documentation archive |
| `ARCHITECTURE.md` | System architecture documentation |
| `CURRENT_STATUS.md` | Development status at time of archive |
| `DEVELOPMENT_GUIDE.md` | Implementation patterns and formulas |

### Documentation Archive (`documentation/`)
| Directory | Description |
|-----------|-------------|
| `planning/` | All previous implementation plans |
| `reports/` | Audit reports and phase completion reports |
| `history/` | Development notes and investigations |
| `guides/` | Performance and optimization guides |
| `examples/` | Code examples |
| `prototypes/` | Prototype implementations and test results |
| `migration/` | Migration guides |
| `3d-components/` | Archived 3D game components |

### Public Assets (Config Only)
| File | Description |
|------|-------------|
| `public/index.html` | React entry HTML |
| `public/manifest.json` | PWA manifest |
| `public/favicon.ico` | Application favicon |
| `public/logo*.png` | Logo images |

---

## Technology Stack

The prototype was built with:

- **React 18** - UI framework
- **JavaScript (ES6+)** - Primary language
- **Tailwind CSS** - Styling
- **Jest** - Testing framework
- **Canvas API** - 2D rendering

---

## Why Archived

This code was archived as part of the transition to a new implementation approach:

1. **New Planning Documents** - Comprehensive 2D game planning docs created
2. **Engine Flexibility** - New approach allows for Unity, Godot, or custom engine
3. **Architecture Review** - Opportunity to apply lessons learned
4. **Clean Slate** - Start fresh while preserving reference code

---

## Preserved Assets

The game's sprite assets were **not** archived and remain available at:
- `public/assets/sprites/` - All sprite images

These assets are engine-agnostic and can be reused in the new implementation.

---

## Reference Use

This code can be referenced for:

- **Algorithm implementations** (pathfinding, AI, spatial grids)
- **Data structures** (inventory, recipes, skill trees)
- **Game balance formulas** (see DEVELOPMENT_GUIDE.md)
- **System design patterns** (see ARCHITECTURE.md)

---

## Reactivation

If this prototype needs to be restored:

1. Move files back to their original locations
2. Run `npm install` from root
3. Run `npm start` to launch dev server

---

**Archive Date:** November 2025
**Archived By:** Development Team
