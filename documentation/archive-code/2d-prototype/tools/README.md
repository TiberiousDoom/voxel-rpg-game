# Development Tools

This directory contains development tools and utilities for the Voxel RPG Game project.

## Available Tools

### sprite-generator.html

**Purpose**: Generate placeholder sprites for testing the sprite system

**Usage**:
1. Open `sprite-generator.html` in your web browser
2. Click "Generate All Sprites"
3. Download each sprite using the download buttons
4. Place sprites in the appropriate `/public/assets/sprites/` folders

**What it generates**:
- **NPC Sprites**: FARMER (idle, walk, work) - 16x16 and 16x64 px
- **Building Sprites**: FARM - 40x40 px
- **Player Sprites**: idle, walk, sprint - 16x16 and 16x64 px

**Features**:
- Uses game's color scheme from `src/assets/npc-sprites.js`
- Generates animated sprite sheets (4 frames)
- Pixel-perfect preview with 4x scaling
- One-click download as PNG
- Statistics tracking

**Output locations**:
```
public/assets/sprites/
├── npcs/farmer/
│   ├── idle.png      (16x16)
│   ├── walk.png      (64x16)
│   └── work.png      (64x16)
├── buildings/
│   └── farm.png      (40x40)
└── player/
    ├── idle.png      (16x16)
    ├── walk.png      (64x16)
    └── sprint.png    (64x16)
```

**Next Steps After Generation**:
1. Open the sprite generator in browser: `file:///.../tools/sprite-generator.html`
2. Generate and download all sprites
3. Move downloaded files to correct sprite folders
4. Test with: `npm test -- SpriteLoader`
5. Run game to see sprites in action

## Adding More Tools

To add new development tools:
1. Create tool file in this directory
2. Document in this README
3. Keep tools browser-based or Node.js scripts
4. Avoid binary executables

## Tool Development Guidelines

- Keep tools simple and focused
- Document all inputs and outputs
- Include usage examples
- Make tools browser-compatible when possible
- No external dependencies when possible
