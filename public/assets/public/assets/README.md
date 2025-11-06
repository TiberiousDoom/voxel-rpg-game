# Game Assets Directory

This folder contains all artwork, sounds, and visual assets for the Voxel RPG Game.

## 📁 Folder Structure

### `/sprites/`
**Character and entity sprites**
- `player/` - Player character sprites (warrior, mage, rogue)
  - `warrior.png` - Warrior class sprite
  - `mage.png` - Mage class sprite
  - `rogue.png` - Rogue class sprite
- `enemies/` - Enemy sprites
  - `demon.png` - Demon enemy
  - `shadow.png` - Shadow enemy
  - `beast.png` - Beast enemy
  - `wraith.png` - Wraith enemy
  - `golem.png` - Golem enemy
  - `archer.png` - Archer enemy (ranged)
  - `mage-enemy.png` - Enemy mage
- `bosses/` - Boss sprites
  - `boss.png` - Generic boss
  - `boss-phase2.png` - Boss phase 2 variant
- `pets/` - Pet companion sprites
  - `wolf.png` - Wolf pet
  - `fairy.png` - Fairy pet
- `items/` - Item and loot sprites
  - `gold.png` - Gold coin
  - `potion.png` - Health potion
  - `crystal.png` - Crystal resource
  - `essence.png` - Essence resource

### `/sounds/`
**Audio files (mp3, wav, or ogg format)**
- `spells/` - Spell sound effects
  - `fireball.mp3` - Fireball cast sound
  - `lightning.mp3` - Lightning spell
  - `meteor.mp3` - Meteor impact
  - `frostnova.mp3` - Frost nova freeze
  - `chainlightning.mp3` - Chain lightning
  - `poisoncloud.mp3` - Poison cloud
  - `heal.mp3` - Healing sound
  - `shield.mp3` - Shield buff
  - `haste.mp3` - Haste buff
- `combat/` - Combat sounds
  - `hit.mp3` - Projectile hit
  - `explosion.mp3` - Explosion/big hit
  - `crit.mp3` - Critical hit
- `ui/` - UI sounds
  - `levelup.mp3` - Level up fanfare
  - `achievement.mp3` - Achievement unlocked
  - `button-click.mp3` - Button click
- `ambient/` - Background music
  - `background-music.mp3` - Main game music
  - `boss-music.mp3` - Boss battle music

### `/icons/`
**UI icons and small graphics (PNG with transparency)**
- `spells/` - Spell icons for hotbar
  - `fireball-icon.png`
  - `lightning-icon.png`
  - `heal-icon.png`
  - `meteor-icon.png`
  - `frostnova-icon.png`
  - `chainlightning-icon.png`
  - `poisoncloud-icon.png`
  - `shield-icon.png`
  - `haste-icon.png`
  - `healbeam-icon.png`
- `items/` - Inventory item icons
  - `weapon-icon.png`
  - `armor-icon.png`
  - `helmet-icon.png`
  - `gloves-icon.png`
  - `boots-icon.png`
  - `ring-icon.png`
  - `amulet-icon.png`
- `resources/` - Resource icons
  - `gold-icon.png`
  - `essence-icon.png`
  - `crystal-icon.png`
  - `wood-icon.png`
  - `iron-icon.png`
  - `leather-icon.png`

### `/backgrounds/`
**Background images and tiles**
- `terrain/` - Terrain textures
  - `grass.png` - Grass tile
  - `forest.png` - Forest tile
  - `water.png` - Water tile
  - `rock.png` - Rock tile
  - `desert-sand.png` - Desert biome
  - `tundra-snow.png` - Tundra biome
- `sky/` - Sky backgrounds
  - `day-sky.png` - Daytime sky
  - `night-sky.png` - Nighttime sky
  - `dusk-sky.png` - Dusk/dawn sky
- `dungeons/` - Dungeon backgrounds
  - `dungeon-floor.png`
  - `dungeon-wall.png`

### `/ui/`
**UI elements and panels**
- `panels/` - Menu backgrounds
  - `inventory-panel.png`
  - `skills-panel.png`
  - `crafting-panel.png`
- `buttons/` - Button graphics
  - `button-normal.png`
  - `button-hover.png`
  - `button-pressed.png`
- `effects/` - Visual effects
  - `damage-number-bg.png`
  - `combo-badge.png`
  - `achievement-popup.png`

## 🎨 Art Style Guidelines

### Recommended Specs:
- **Sprites**: 32x32px, 64x64px, or 128x128px for larger entities
- **Icons**: 32x32px or 64x64px
- **Format**: PNG with transparency
- **Color**: Vibrant, readable colors that match the voxel/pixel art style

### Current Game Style:
- Simple geometric shapes (squares, circles)
- Bright, saturated colors
- Clear outlines for visibility
- Minimalist voxel aesthetic

## 🔊 Audio Guidelines

### Sound Effects:
- **Format**: MP3 (best browser support) or OGG
- **Length**: 0.5-2 seconds for SFX
- **Volume**: Normalized to avoid clipping

### Music:
- **Format**: MP3
- **Length**: 1-3 minute loops
- **Volume**: Lower than SFX to not overwhelm

## 📝 Usage in Code

Assets are accessed via public URL:
```javascript
// Example: Loading a sprite
<img src="/assets/sprites/player/warrior.png" alt="Warrior" />

// Example: Loading a sound
const sound = new Howl({
  src: ['/assets/sounds/spells/fireball.mp3']
});
```

## 🚀 Adding New Assets

1. Place your asset file in the appropriate subfolder
2. Use descriptive, lowercase filenames with hyphens: `enemy-archer.png`
3. Update the game code to reference the new asset
4. Test in development mode: `npm start`

## 📋 Current Priorities

**Most Needed:**
1. ⭐ Spell effect sprites/animations
2. ⭐ Player class sprites (warrior, mage, rogue)
3. ⭐ Enemy sprites (demon, shadow, beast, wraith, golem)
4. ⭐ Sound effects for spells
5. Pet sprites (wolf, fairy)

**Nice to Have:**
- Background music
- Particle effect sprites
- Terrain tile improvements
- UI element graphics
