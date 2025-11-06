# 🎨 Asset Checklist for Voxel RPG

Quick reference for what assets are needed and their current status.

## ⭐ High Priority (Immediate Impact)

### Player Classes (3 sprites needed)
- [ ] `sprites/player/warrior.png` - Red/brown heavy armor look
- [ ] `sprites/player/mage.png` - Blue robes, mystical appearance
- [ ] `sprites/player/rogue.png` - Green/black, agile look

**Size:** 32x32px or 64x64px
**Style:** Simple, clear silhouette, matches current square aesthetic

---

### Enemy Sprites (5 basic + 2 ranged)
- [ ] `sprites/enemies/demon.png` - Red, menacing
- [ ] `sprites/enemies/shadow.png` - Purple/dark, ethereal
- [ ] `sprites/enemies/beast.png` - Brown, animal-like
- [ ] `sprites/enemies/wraith.png` - Ghostly, fast-moving
- [ ] `sprites/enemies/golem.png` - Gray/stone, large and slow
- [ ] `sprites/enemies/archer.png` - Bow/ranged weapon visible
- [ ] `sprites/enemies/mage-enemy.png` - Staff/magical appearance

**Size:** 32x32px
**Style:** Distinct colors, easily recognizable at a glance

---

### Boss Sprite
- [ ] `sprites/bosses/boss.png` - Large, imposing (64x64px or 128x128px)

---

### Pet Companions
- [ ] `sprites/pets/wolf.png` - Brown/gray canine
- [ ] `sprites/pets/fairy.png` - Pink/magical, flying

**Size:** 24x24px or 32x32px
**Note:** Should be smaller than player

---

## 🔊 High Priority Sounds

### Spell Sounds
- [ ] `sounds/spells/fireball.mp3` - Whoosh + fire crackling
- [ ] `sounds/spells/lightning.mp3` - Electric zap
- [ ] `sounds/spells/meteor.mp3` - Heavy impact/explosion
- [ ] `sounds/spells/frostnova.mp3` - Ice crystallizing
- [ ] `sounds/spells/chainlightning.mp3` - Electric arc
- [ ] `sounds/spells/poisoncloud.mp3` - Bubbling/gas hiss
- [ ] `sounds/spells/heal.mp3` - Magical chime/sparkle
- [ ] `sounds/spells/shield.mp3` - Protective shimmer
- [ ] `sounds/spells/haste.mp3` - Whoosh/acceleration

### Combat Sounds
- [ ] `sounds/combat/hit.mp3` - Impact sound (short, punchy)
- [ ] `sounds/combat/explosion.mp3` - Big explosion
- [ ] `sounds/combat/crit.mp3` - Extra impactful hit

### UI Sounds
- [ ] `sounds/ui/levelup.mp3` - Triumphant fanfare (1-2 sec)
- [ ] `sounds/ui/achievement.mp3` - Success jingle

**Format:** MP3, 0.5-2 seconds each, normalized volume

---

## 🎨 Medium Priority

### Spell Icons (for hotbar)
- [ ] `icons/spells/fireball-icon.png`
- [ ] `icons/spells/lightning-icon.png`
- [ ] `icons/spells/heal-icon.png`
- [ ] `icons/spells/meteor-icon.png`
- [ ] `icons/spells/frostnova-icon.png`
- [ ] `icons/spells/chainlightning-icon.png`
- [ ] `icons/spells/poisoncloud-icon.png`
- [ ] `icons/spells/shield-icon.png`
- [ ] `icons/spells/haste-icon.png`
- [ ] `icons/spells/healbeam-icon.png`

**Size:** 32x32px or 64x64px
**Style:** Clear symbols that represent each spell

---

### Item Sprites
- [ ] `sprites/items/gold.png` - Gold coin
- [ ] `sprites/items/potion.png` - Red potion bottle
- [ ] `sprites/items/crystal.png` - Purple crystal
- [ ] `sprites/items/essence.png` - Glowing orb

**Size:** 16x16px or 24x24px

---

### Equipment Icons
- [ ] `icons/items/weapon-icon.png` - Sword
- [ ] `icons/items/armor-icon.png` - Chestplate
- [ ] `icons/items/helmet-icon.png` - Helmet
- [ ] `icons/items/gloves-icon.png` - Gauntlets
- [ ] `icons/items/boots-icon.png` - Boots
- [ ] `icons/items/ring-icon.png` - Ring
- [ ] `icons/items/amulet-icon.png` - Necklace

---

## 🌍 Low Priority (Future)

### Terrain Tiles
- [ ] `backgrounds/terrain/grass.png`
- [ ] `backgrounds/terrain/forest.png`
- [ ] `backgrounds/terrain/water.png`
- [ ] `backgrounds/terrain/rock.png`
- [ ] `backgrounds/terrain/desert-sand.png`
- [ ] `backgrounds/terrain/tundra-snow.png`

**Size:** 20x20px (current tile size)
**Note:** Currently using solid colors, tiles would be upgrade

---

### Background Music
- [ ] `sounds/ambient/background-music.mp3` - Main game loop
- [ ] `sounds/ambient/boss-music.mp3` - Intense boss battle

**Length:** 1-3 minute loops
**Style:** Atmospheric, not too distracting

---

### Particle/Effect Sprites
- [ ] Explosion animation frames
- [ ] Magic sparkles
- [ ] Hit impacts
- [ ] Buff aura effects

---

## 📐 Technical Specs Summary

| Asset Type | Size | Format | Notes |
|------------|------|--------|-------|
| Player Sprites | 32x32 or 64x64 | PNG | Transparent background |
| Enemy Sprites | 32x32 | PNG | Distinct colors |
| Boss Sprites | 64x64 or 128x128 | PNG | Larger than player |
| Pet Sprites | 24x24 or 32x32 | PNG | Smaller than player |
| Icons | 32x32 or 64x64 | PNG | Clear symbols |
| Spell SFX | 0.5-2 sec | MP3 | Normalized volume |
| Music | 1-3 min loops | MP3 | Lower volume |
| Terrain | 20x20 | PNG | Tileable |

---

## 🎨 Style Guide

### Colors (Current Game Palette)
- **Player:** Blue (#3498db)
- **Enemies:**
  - Demon: Red (#cc0000)
  - Shadow: Purple (#4a0080)
  - Beast: Brown (#804000)
  - Wraith: Dark Purple (#9400d3)
  - Golem: Gray (#696969)
- **Spells:**
  - Fire: Orange/Red
  - Lightning: Yellow
  - Ice: Cyan
  - Poison: Green
  - Heal: Bright Green

### Art Style
- Minimalist voxel/pixel aesthetic
- Clear outlines for visibility
- Bright, saturated colors
- Simple geometric shapes
- Readable at small sizes

---

## 💡 Tips for Creating Assets

1. **Start Simple:** Basic shapes work great! The game currently uses squares and circles.

2. **High Contrast:** Make sure sprites stand out against backgrounds.

3. **Test In-Game:** Assets should be clear when moving at game speed.

4. **Consistent Scale:** Keep relative sizes consistent (player = 24x24, enemies = 30x30, etc.)

5. **Transparent Backgrounds:** Always use PNG with transparency for sprites.

6. **Sound Length:** Keep SFX short (under 2 seconds) so they don't overlap badly.

---

## 🚀 Integration

Once you add assets:

1. Place files in appropriate folders
2. I'll update the game code to use them
3. Test with `npm start`
4. Build for production with `npm run build`

Assets are loaded from `/assets/...` URL path in the game code.

---

**Questions?** Just ask! I can help integrate any assets you create.
