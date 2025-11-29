# Sprite Assets

This directory contains sprite assets for NPCs, buildings, and the player character.

## Directory Structure

```
sprites/
├── npcs/                  # NPC sprite sheets
│   ├── farmer/
│   │   ├── idle.png      # 16x16 (1 frame)
│   │   ├── walk.png      # 16x64 (4 frames horizontal)
│   │   └── work.png      # 16x64 (4 frames)
│   ├── guard/
│   ├── worker/
│   ├── craftsman/
│   ├── miner/
│   └── merchant/
│
├── buildings/             # Building sprites
│   ├── farm.png          # 40x40
│   ├── house.png         # 40x40
│   ├── warehouse.png     # 40x40
│   ├── town_center.png   # 40x40
│   ├── watchtower.png    # 40x40
│   ├── campfire.png      # 40x40
│   ├── market.png        # 40x40
│   └── castle.png        # 40x40
│
└── player/                # Player sprite sheets
    ├── idle.png          # 16x16 (1 frame)
    ├── walk.png          # 16x64 (4 frames horizontal)
    └── sprint.png        # 16x64 (4 frames)
```

## Sprite Specifications

### NPCs
- **Frame Size**: 16x16 pixels
- **Format**: PNG with transparency (RGBA)
- **Animation Layout**: Horizontal sprite strip
- **Frame Count**:
  - idle: 1 frame (16x16 total)
  - walk: 4 frames (16x64 total)
  - work: 4 frames (16x64 total)

### Buildings
- **Size**: 40x40 pixels (matches tile size)
- **Format**: PNG with transparency (RGBA)
- **Layout**: Single frame per building

### Player
- **Frame Size**: 16x16 pixels
- **Format**: PNG with transparency (RGBA)
- **Animation Layout**: Horizontal sprite strip
- **Frame Count**:
  - idle: 1 frame (16x16 total)
  - walk: 4 frames (16x64 total)
  - sprint: 4 frames (16x64 total)

## Creating Sprites

### Option 1: Placeholder Sprites (Quick Start)
Create simple colored squares with role letters:
- Use existing color scheme from `src/assets/npc-sprites.js`
- Add single letter or icon in center
- Allows testing system without art

### Option 2: Pixel Art Tools
Recommended tools:
- **Aseprite** (paid): https://www.aseprite.org/
- **Piskel** (free, online): https://www.piskelapp.com/
- **PyxelEdit** (paid): https://pyxeledit.com/
- **GIMP** (free): https://www.gimp.org/

### Option 3: Free Asset Packs
Sources for free sprites:
- **OpenGameArt.org**: https://opengameart.org/
- **Kenney.nl**: https://kenney.nl/assets
- **itch.io**: https://itch.io/game-assets/free

Ensure license is compatible (CC0, CC-BY, MIT, etc.)

## Animation Frame Layout

Sprite sheets use horizontal strip layout:

```
Idle (1 frame):
+------+
| F1   |
+------+

Walk (4 frames):
+------+------+------+------+
| F1   | F2   | F3   | F4   |
+------+------+------+------+

Work (4 frames):
+------+------+------+------+
| F1   | F2   | F3   | F4   |
+------+------+------+------+
```

## File Naming Convention

- **Lowercase**: Use lowercase for animation states (idle.png, walk.png)
- **Underscores**: Use underscores for multi-word names (town_center.png)
- **PNG Only**: All sprites must be PNG format

## Color Guidelines

### NPC Role Colors (from npc-sprites.js)
- Farmer: #4CAF50 (Green)
- Craftsman: #FF9800 (Orange)
- Guard: #F44336 (Red)
- Worker: #2196F3 (Blue)
- Miner: #9C27B0 (Purple)
- Merchant: #FFEB3B (Yellow)

### Building Colors (from GameViewport.jsx)
- Farm: #90EE90 (Light Green)
- House: #D2B48C (Tan)
- Warehouse: #A9A9A9 (Gray)
- Town Center: #FFD700 (Gold)
- Watchtower: #8B4513 (Brown)
- Campfire: #FF8C00 (Orange)

### Player Color
- Player: #4A90E2 (Blue)

## Testing Sprites

After adding sprites:
1. Run the game in development mode
2. Sprites should automatically load via SpriteLoader
3. Check browser console for load errors
4. If sprites fail, system will fallback to colored circles

## Fallback System

The sprite system includes graceful fallback:
- If sprite fails to load, entity renders as colored circle
- No crashes or visual glitches
- Error logged to console for debugging

## Performance Guidelines

- **File Size**: Keep individual sprites < 10KB
- **Total Size**: All sprites combined < 5MB
- **Compression**: Use PNG optimization tools:
  - TinyPNG: https://tinypng.com/
  - OptiPNG: Command-line PNG optimizer
  - ImageOptim: Mac app

## Current Status

**Phase 1: Foundation** ✅
- Directory structure created
- SpriteLoader implemented
- SpriteSheetParser implemented
- Sprite manifest defined
- Unit tests added

**Phase 2: Asset Creation** 🚧
- **TODO**: Create NPC sprites
- **TODO**: Create building sprites
- **TODO**: Create player sprites

**Phase 3: Integration** 📋
- Pending: Update NPCRenderer
- Pending: Update BuildingRenderer
- Pending: Update PlayerRenderer

## References

- Sprite System Plan: `documentation/planning/SPRITE_SYSTEM_IMPLEMENTATION_PLAN.md`
- Sprite Manifest: `src/assets/sprite-manifest.js`
- SpriteLoader: `src/rendering/SpriteLoader.js`
- SpriteSheetParser: `src/rendering/SpriteSheetParser.js`

## Questions?

For questions about sprite creation or integration, see:
- Implementation plan in `documentation/planning/`
- Code examples in `src/rendering/`
- Existing rendering systems in `src/rendering/README.md`
