# Phase 1: Survival & Gathering - Detailed Implementation Plan

**Created:** February 7, 2026
**Estimated Duration:** 8-12 weeks
**Status:** Planning
**Prerequisite:** Phase 0 (Foundation) complete

---

## Lessons from Phase 0

1. **Worker communication is reliable but fragile at scale** — cap consecutive errors, use Transferable objects, batch messages where possible.
2. **React state + timer callbacks need ref-based patterns** — long-press, stamina regen, and similar tick-based systems should read from refs and call chunkManager/store directly to avoid stale closures.
3. **Float-based voxel math is a recurring source of bugs** — always floor to voxel grid coords early; never compare floating-point ray positions for face detection.
4. **Dirty flag races** — if two systems both read/clear a dirty flag, one starves. Use generation counters instead of boolean flags where multiple consumers exist.
5. **Mobile and desktop diverge significantly** — design input systems with both paths from the start, not as afterthoughts.

---

## Overview

Phase 1 transforms the technical foundation from Phase 0 into the core survival gameplay loop. By the end, a player can survive multiple in-game days by gathering resources, crafting tools, building shelter, and fending off night monsters. The game should feel like a playable demo — not polished, but engaging.

### Goals
1. Day/night cycle with dynamic lighting that creates urgency
2. Hunger system that drives resource gathering
3. Block mining drops items into inventory (not just destroys blocks)
4. Tool crafting that makes gathering faster
5. Night monsters that create real danger
6. Shelter detection so building matters
7. Cohesive survival HUD

### What Success Looks Like
By the end of Phase 1, a player spawns in a generated world, gathers resources by mining blocks, crafts basic tools, builds a shelter, eats food to stave off hunger, and survives the first night when monsters become aggressive. Dying feels consequential, surviving feels earned.

---

## Existing Systems Audit

Before building, here's what already works and what's missing:

| System | Status | Notes |
|--------|--------|-------|
| Health | **Functional** | `dealDamageToPlayer()`, `healPlayer()`, death → respawn |
| Stamina | **Functional** | Drains on sprint, regenerates, `consumeStamina()`/`regenStamina()` |
| Hunger | **Missing** | No food, no satiation, no starvation |
| Day/Night Cycle | **Missing** | No world time, no time progression |
| Dynamic Lighting | **Missing** | Fixed ambient (0.6) + directional (0.8) in Experience.jsx |
| Mining → Inventory | **Missing** | Mining destroys blocks but doesn't yield items |
| Tool Speed Modifiers | **Partial** | Tool tiers defined in craftingRecipes.js with `harvestSpeed`, not wired to BlockInteraction |
| Crafting | **Functional** | MaterialCraftingSystem, recipes, quality tiers, CraftingUI |
| Monster Spawning | **Functional** | SpawnManager, zones, AI states (idle/patrol/chase/attack/flee) |
| Night Spawning | **Missing** | No time-based spawn rules |
| Death/Respawn | **Functional** | DeathScreen, `respawnPlayer()` resets stats |
| Inventory | **Functional** | Materials, items, equipment slots, InventoryUI |
| Block Types | **Functional** | 16 types with hardness values in blockTypes.js |
| Weather | **Functional** | WeatherSystem with lighting modifiers (not applied to scene) |

---

## Task Breakdown

### 1.1 World Time System (Week 1)

The day/night cycle is the backbone of Phase 1 — hunger, lighting, and night threats all depend on it.

#### 1.1.1 Time Manager
**Goal:** Track in-game time with configurable day length

**Implementation tasks:**
- [ ] Create `src/systems/time/TimeManager.js`
- [ ] Track world time as a continuous float (total seconds elapsed)
- [ ] Define day length (default: 20 real minutes = 1 in-game day)
- [ ] Expose `timeOfDay` as 0.0–1.0 (0=midnight, 0.25=sunrise, 0.5=noon, 0.75=sunset)
- [ ] Expose `dayNumber`, `hour` (0-23), `isNight` (sunset→sunrise)
- [ ] Provide `update(deltaSeconds)` method
- [ ] Integrate with useGameStore (store worldTime, timeOfDay, dayNumber, isNight)
- [ ] Persist worldTime in save/load

**Time constants (in `src/data/tuning.js`):**
```
DAY_LENGTH_SECONDS = 1200   (20 real minutes — configurable for playtesting)
SUNRISE_START = 0.20        (4:48 AM equivalent)
SUNRISE_END = 0.30          (7:12 AM)
SUNSET_START = 0.70         (4:48 PM)
SUNSET_END = 0.80           (7:12 PM)
```

**Debug tools:**
- [ ] Add debug command to set time of day (`setTime(0.5)` for noon)
- [ ] Add debug time multiplier (`timeScale`: 1×, 2×, 5×, 10×, pause)
- [ ] Add debug key combo (Ctrl+Shift+T) to skip to next dawn/dusk
- [ ] All tuning constants in a single `src/data/tuning.js` file with comments

**Acceptance criteria:**
- [ ] `timeOfDay` cycles 0→1→0 continuously
- [ ] `isNight` is true between sunset end and sunrise start
- [ ] Day number increments at midnight
- [ ] Time persists across save/load
- [ ] Time pauses when game is paused
- [ ] `DAY_LENGTH_SECONDS` is easily adjustable for balancing

**Tests:** `TimeManager.test.js`
- Time advances by delta correctly
- Day/night boundaries are accurate
- Save/load roundtrip preserves time
- Pause halts progression
- Time scale multiplier works correctly

---

#### 1.1.2 Time Display UI
**Goal:** Show current time on the HUD

**Implementation tasks:**
- [ ] Create `src/components/ui/TimeDisplay.jsx`
- [ ] Show clock icon + time (e.g. "Day 3 - 14:30")
- [ ] Show sun/moon icon based on day/night
- [ ] Subtle background tint transition during sunrise/sunset
- [ ] Position in top-right corner of HUD

**Acceptance criteria:**
- [ ] Time updates in real-time
- [ ] Day/night icon switches at correct thresholds
- [ ] Readable at a glance

---

### 1.2 Dynamic Lighting (Week 1-2)

#### 1.2.1 Sun/Moon Light Cycle
**Goal:** Ambient and directional light intensity/color change with time of day

**Implementation tasks:**
- [ ] Create `src/systems/lighting/DayNightLighting.js` (pure logic, no React)
- [ ] Calculate sun position from `timeOfDay` (arc across sky)
- [ ] Calculate ambient light intensity: bright at noon (0.7), dim at night (0.15)
- [ ] Calculate directional light intensity: full at noon (1.0), off at night (0.0)
- [ ] Calculate ambient color: warm at sunrise/sunset, cool blue at night, white at noon
- [ ] Calculate fog color to match sky
- [ ] Calculate sky background color (blue→orange→dark blue→black)
- [ ] Compose lighting multiplicatively: `finalIntensity = baseLighting(timeOfDay) × weatherModifier × shelterModifier`
- [ ] WeatherSystem `getLightingModifier()` applied as multiplier (storm = 0.5× base)
- [ ] Create `src/components/3d/DayNightCycle.jsx` React component
- [ ] Replace fixed lights in Experience.jsx with DayNightCycle component
- [ ] Smoothly animate sun position using `useFrame`

**Lighting curves (timeOfDay → intensity):**
```
Ambient:     night=0.15, sunrise=0.3→0.6, noon=0.7, sunset=0.6→0.3, night=0.15
Directional: night=0.0,  sunrise=0.0→0.8, noon=1.0, sunset=0.8→0.0, night=0.0
```

**Sky colors (timeOfDay → hex):**
```
Midnight:  #0a0a2e (deep blue-black)
Pre-dawn:  #1a1a3e
Sunrise:   #ff7744 → #ffaa66
Morning:   #87ceeb (sky blue)
Noon:      #87ceeb
Sunset:    #ff6633 → #cc3300
Dusk:      #2a1a3e
Night:     #0a0a2e
```

**Acceptance criteria:**
- [ ] Standing still, sky visibly transitions over a full day cycle
- [ ] Night is genuinely dark — hard to see without torches
- [ ] Sunrise/sunset are visually distinct warm transitions
- [ ] Weather overlays dim the lighting further (storm = darker)
- [ ] No sudden jumps — all transitions are smooth (lerp)
- [ ] Fog matches sky color to prevent horizon line mismatch

**Tests:** `DayNightLighting.test.js`
- Noon returns max intensity
- Midnight returns min intensity
- Sunrise/sunset return intermediate values
- Weather modifier applies correctly

---

#### 1.2.2 Torch/Campfire Light (Stretch Goal)
**Goal:** Placeable light sources that illuminate surroundings at night

**Implementation tasks:**
- [ ] Add TORCH block type to blockTypes.js
- [ ] Add point light to torch block rendering in ChunkRenderer
- [ ] Limit active point lights to nearest 8 (WebGL limit per object)
- [ ] Torches craftable from wood + coal

**Acceptance criteria:**
- [ ] Torch block emits visible light in a radius
- [ ] Multiple torches illuminate area
- [ ] Performance stays within budget (max 8 active lights)

*Note: This is a stretch goal. If it impacts performance significantly, defer to Phase 5.*

---

### 1.3 Hunger & Food System (Week 2-3)

#### 1.3.1 Hunger Mechanics
**Goal:** Player hunger that drains over time, driving resource gathering

**Implementation tasks:**
- [ ] Add `hunger` (0–100), `maxHunger` (100) to player state in useGameStore
- [ ] Add `hungerDrainRate` constant in tuning.js: 0.5 hunger per 60 real seconds (= ~10 per in-game day)
- [ ] Sprinting doubles hunger drain rate
- [ ] At hunger < 20: health regeneration stops
- [ ] At hunger = 0: take 1 damage per 10 seconds (starvation)
- [ ] Create `src/systems/survival/HungerSystem.js` with `update(delta)` method
- [ ] Wire into game tick loop (GameManager or useFrame)
- [ ] Persist hunger in save/load

**Design note:** Start with a generous drain rate (0.5/60s = ~10/day = full depletion in ~10 in-game days). This gives new players ample time to learn the food system before feeling pressure. Tighten during balance pass (1.11) based on playtest data. Track `avgHungerAtDeath` metric.

**Hunger thresholds:**
```
100-60: Well Fed    — normal health regen, "Well Fed" buff icon
 60-20: Hungry      — health regen halved
 20-1:  Starving    — no health regen, movement speed -20%
    0:  Famished    — 1 damage per 10 seconds
```

**Acceptance criteria:**
- [ ] Hunger drains visibly over time
- [ ] Sprint accelerates drain
- [ ] Starvation damage kicks in at 0
- [ ] Eating food restores hunger
- [ ] Hunger persists across save/load
- [ ] Hunger drain rate is easily tunable via tuning.js

**Tests:** `HungerSystem.test.js`
- Hunger drains at correct rate
- Sprint modifier applies
- Threshold effects trigger correctly
- Starvation damage rate is accurate
- Drain rate constant can be adjusted without code changes

---

#### 1.3.2 Food Items
**Goal:** Define food items that restore hunger

**Implementation tasks:**
- [ ] Add food item category to ITEM_TYPES: `FOOD: 'food'`
- [ ] Define food items in craftingRecipes.js (or new foodItems.js):
  - Raw Meat (dropped by animals) — restores 15 hunger, risk of food poisoning
  - Cooked Meat (craft: raw meat + wood at campfire) — restores 35 hunger
  - Berries (gathered from berry bushes) — restores 10 hunger
  - Bread (craft: 3 wheat) — restores 25 hunger
  - Apple (dropped from trees) — restores 15 hunger
- [ ] Add `eatFood(itemId)` action to useGameStore
- [ ] Add eat button/context action in InventoryUI
- [ ] Food consumption plays a sound/particle (placeholder is fine)

**Acceptance criteria:**
- [ ] Each food item restores the correct amount
- [ ] Food is consumed (removed from inventory) on use
- [ ] Cannot eat when hunger is full
- [ ] Food items show hunger restore value in tooltip

---

#### 1.3.3 Food Sources in World
**Goal:** Players can find food in the world

**Implementation tasks:**
- [ ] Add BERRY_BUSH block type — drops berries when mined
- [ ] Trees occasionally drop apples when leaves are mined (10% chance)
- [ ] Animals (existing wildlife system) drop raw meat on death
- [ ] Add wheat/crop block type for future farming (placeholder, not growable yet)

**Food density targets (tunable in tuning.js):**
```
Berry bushes: 1-2 per plains/forest chunk
Animals:      0-1 per chunk (biome dependent)
Trees:        natural density, 10% apple drop from leaves
```
Target: player finds 3-5 food sources within 5 minutes of exploring. Food should require effort but never be impossible.

**Acceptance criteria:**
- [ ] Berry bushes generate in the world (terrain gen)
- [ ] Mining berry bush yields berries in inventory
- [ ] Mining leaves has a chance to drop apples
- [ ] Killing wildlife yields raw meat
- [ ] Player finds food within 5 minutes of looking

---

#### 1.3.4 Hunger HUD
**Goal:** Display hunger on the survival HUD

**Implementation tasks:**
- [ ] Add hunger bar to HUD (alongside health/stamina)
- [ ] Color-coded: green (>60), yellow (20-60), red (<20), flashing red (0)
- [ ] Show "Starving" warning text when hunger hits 0
- [ ] Optional: food icon with hunger value

**Acceptance criteria:**
- [ ] Hunger bar visible during gameplay
- [ ] Color transitions smoothly
- [ ] Warning is noticeable but not obstructive

---

### 1.4 Mining → Inventory Pipeline (Week 3-4)

Currently, mining destroys blocks but yields nothing. This section wires mining to the inventory so resources have purpose.

#### 1.4.1 Block Drop Definitions
**Goal:** Each block type drops specific items when mined

**Implementation tasks:**
- [ ] Create `src/data/blockDrops.js` defining drops per block type
- [ ] Drop table format: `{ blockType: [{ itemId, quantity, chance }] }`
- [ ] Define drops:
  - STONE → 1 cobblestone (material)
  - DIRT → 1 dirt
  - GRASS → 1 dirt
  - SAND → 1 sand
  - WOOD → 1-2 wood (material)
  - LEAVES → nothing (10% chance: 1 apple or 1 sapling)
  - COAL_ORE → 1-3 coal
  - IRON_ORE → 1 raw iron
  - GOLD_ORE → 1 raw gold
  - GRAVEL → 1 gravel (5% chance: 1 flint)
  - CLAY → 1-4 clay balls
  - BERRY_BUSH → 2-4 berries

**Acceptance criteria:**
- [ ] Every minable block type has a drop definition
- [ ] Random drops use seeded RNG for reproducibility
- [ ] Drop table is data-driven (easy to modify/extend)

---

#### 1.4.2 Mining Yields Items
**Goal:** When a block is mined, items go into player inventory

**Implementation tasks:**
- [ ] Import blockDrops into BlockInteraction.jsx
- [ ] After successful `setBlock(..., AIR)`, look up drops for the old block type
- [ ] Roll drop chances, calculate quantities
- [ ] Call `addMaterial(type, quantity)` or `addItem(item)` on store
- [ ] Show floating item pickup text ("+2 Wood") near mined block
- [ ] Play pickup particle effect (small sparkle)

**Acceptance criteria:**
- [ ] Mining stone yields cobblestone in inventory
- [ ] Mining iron ore yields raw iron in inventory
- [ ] Mining wood yields wood material
- [ ] Floating text shows what was gained
- [ ] Inventory UI reflects new items immediately

---

#### 1.4.3 Expand Material Types
**Goal:** Add missing material types to support the full gathering→crafting pipeline

**Implementation tasks:**
- [ ] Expand `inventory.materials` in useGameStore to include:
  - cobblestone, dirt, sand, gravel, clay, flint
  - coal, rawIron, rawGold
  - berries, apple, rawMeat, cookedMeat
  - sapling, wheat
- [ ] Update `addMaterial()` / `removeMaterial()` to handle new types
- [ ] Update InventoryUI to display new material icons
- [ ] Update crafting recipes to use new material names where needed

**Acceptance criteria:**
- [ ] All drop types have corresponding material slots
- [ ] Materials display with appropriate icons in UI
- [ ] Save/load preserves new material types

---

### 1.5 Tool-Modified Mining (Week 4)

#### 1.5.1 Progressive Mining (Hold to Break)
**Goal:** Blocks take time to mine, modified by tool tier and block hardness

**Implementation tasks:**
- [ ] Add mining progress system to BlockInteraction.jsx
- [ ] Mining starts on mouse-down/long-press-hold, progresses while held
- [ ] Break time = `blockHardness / toolHarvestSpeed` seconds
  - Bare hands: harvestSpeed = 0.5
  - Stone pickaxe: 1.2
  - Iron pickaxe: 1.5
  - Diamond pickaxe: 2.0
- [ ] Show mining progress bar on targeted block (visual overlay)
- [ ] Block breaks when progress reaches 100%
- [ ] Add crack animation stages (25%, 50%, 75% — texture overlay or scale change)
- [ ] Cancel mining if player looks away or releases button
- [ ] On mobile, long-press continues to mine while held
- [ ] Mobile: show mining progress as circular fill around touch point
- [ ] Mobile: vibrate briefly on block break (navigator.vibrate, if available)

**Block break times (bare hands):**
```
Dirt/Sand/Leaves:  1.0 sec
Grass/Gravel/Clay: 1.2 sec
Stone:             3.0 sec
Wood:              4.0 sec
Coal/Iron/Gold:    6.0 sec
Bedrock:           Infinity (unbreakable)
```

**Acceptance criteria:**
- [ ] Mining takes visible time (not instant)
- [ ] Better tools mine faster
- [ ] Progress bar shows on targeted block
- [ ] Releasing mouse/touch cancels mining
- [ ] Block hardness affects break time

**Tests:** Mining time calculations
- Bare hands + stone = 3 seconds
- Iron pickaxe + stone = 1 second
- Tool modifier correctly divides hardness

---

#### 1.5.2 Tool Requirement for Ore
**Goal:** Certain blocks require specific tool types to yield drops

**Implementation tasks:**
- [ ] Add `requiredTool` field to blockDrops.js entries
  - COAL_ORE: requires pickaxe (any tier)
  - IRON_ORE: requires pickaxe (iron+)
  - GOLD_ORE: requires pickaxe (iron+)
- [ ] Add `minToolTier` field (0=any, 1=stone, 2=iron, 3=diamond)
- [ ] If player mines ore without proper tool: block breaks but drops nothing
- [ ] Show "Requires Iron Pickaxe" warning within 0.5 sec of starting to mine
- [ ] Grey out or red-tint the mining progress bar when using wrong tool
- [ ] Show crosshair change (red X) when targeting ore without correct tool

**Acceptance criteria:**
- [ ] Ore blocks break without right tool but yield nothing
- [ ] Correct tool yields normal drops
- [ ] Warning appears immediately (not after full mine time)
- [ ] Visual distinction between "can mine" and "wrong tool" is obvious

---

#### 1.5.3 Tool Durability
**Goal:** Tools wear out with use, creating ongoing crafting demand

**Implementation tasks:**
- [ ] Add `durability` and `maxDurability` to tool items
- [ ] Each block mined reduces durability by 1
- [ ] At durability 0, tool breaks (removed from inventory, plays break sound)
- [ ] Show durability bar on equipped tool in HUD
- [ ] Tool durabilities:
  - Stone tools: 65 uses
  - Iron tools: 250 uses
  - Diamond tools: 1000 uses

**Acceptance criteria:**
- [ ] Durability decreases on each mine action
- [ ] Tool removed from inventory at 0 durability
- [ ] Durability bar visible in hotbar
- [ ] Durability persists in save/load

---

### 1.6 Night Threats (Week 5-6)

#### 1.6.1 Night Monster Spawning
**Goal:** Monsters spawn more aggressively at night, creating danger

**Implementation tasks:**
- [ ] Add `getTimeOfDay()` check to SpawnManager
- [ ] Define night spawn multipliers:
  - Day: normal spawn rate (current behavior)
  - Dusk: 1.5× spawn rate
  - Night: 3× spawn rate, stronger monster variants
  - Dawn: spawn rate decreases, existing night monsters flee/despawn at sunrise
- [ ] Add new night-specific monster types:
  - Shadow Creeper: spawns only at night, fast, low HP, high damage
  - Night Skeleton: upgraded skeleton, appears at night
- [ ] Monsters spawned at night get "Nocturnal" modifier: +50% damage, +25% speed
- [ ] Night monsters despawn (fade out) after sunrise — within 60s if in sunlight, up to 5 min if in shade/cave

**Acceptance criteria:**
- [ ] Noticeably more monsters at night
- [ ] Night monsters are visibly stronger
- [ ] Dawn triggers monster retreat/despawn
- [ ] Day is relatively safe for exploration
- [ ] Night feels dangerous and urgent

**Tests:** `NightSpawning.test.js`
- Spawn multiplier correct per time period
- Night-only types don't spawn during day
- Nocturnal modifier applies correctly
- Sunrise despawn triggers at correct time

---

#### 1.6.2 Monster Aggression by Time
**Goal:** Monsters behave differently at night

**Implementation tasks:**
- [ ] Add time awareness to EnemyAISystem
- [ ] Daytime: monsters have smaller aggro range (8 units), may flee from player
- [ ] Nighttime: monsters have larger aggro range (16 units), always chase
- [ ] Night monsters actively seek out the player (patrol toward last known position)
- [ ] Daytime monsters are more passive (only attack if player enters their zone)

**Acceptance criteria:**
- [ ] Monsters are passive during day (unless provoked)
- [ ] Monsters actively hunt at night
- [ ] Aggro range visibly changes with time

---

#### 1.6.3 Monster Drops
**Goal:** Killing monsters yields useful survival resources

**Implementation tasks:**
- [ ] Define monster drop tables:
  - Slime: 1-2 slime gel (crafting material)
  - Goblin: 0-1 iron, 0-1 leather
  - Wolf: 1-2 raw meat, 1 leather
  - Skeleton: 1-3 bone (crafting material), 0-1 iron
  - Orc: 1-2 iron, 0-1 weapon drop
- [ ] Wire into existing `handleMonsterDeath()` loot system
- [ ] Add material types: slimeGel, bone, leather (if not already present)

**Acceptance criteria:**
- [ ] Killing monsters yields items in inventory
- [ ] Drop rates feel fair (not too rare, not flooding)
- [ ] Rare drops feel rewarding

---

### 1.7 Shelter Detection (Week 6-7)

The vision says "Night is dangerous, shelter matters." Shelter should provide tangible benefits.

#### 1.7.1 Enclosed Space Detection
**Goal:** Detect when the player is inside a sheltered area

**Implementation tasks:**
- [ ] Create `src/systems/survival/ShelterDetector.js`
- [ ] Define "shelter" as: player surrounded by solid blocks on 4 sides + roof within 8 blocks above
- [ ] Use raycasts in 6 directions (±X, ±Z, +Y, and check ground) to detect enclosure
- [ ] Cache result, update every 2 seconds (not every frame)
- [ ] Expose `isInShelter` boolean to game store

**Shelter algorithm (simplified):**
```
1. Cast ray up from player: if solid block within 8 units → has roof
2. Cast rays in 4 horizontal directions: count how many hit solid within 4 units
3. If has roof AND 4 walls → isFullShelter = true  (full benefits)
4. If has roof AND 3 walls → isPartialShelter = true  (reduced benefits)
5. If underground (solid above AND below) → isFullShelter = true  (cave)
```

**Shelter tiers:**
- **Full shelter** (4 walls + roof, or underground): 100% shelter benefits
- **Partial shelter** (3 walls + roof): 50% shelter benefits
- **Exposed** (open sky or <3 walls): no benefits, "Exposed" warning at night

**Acceptance criteria:**
- [ ] Standing inside a roofed box registers as fully sheltered
- [ ] Standing outside in the open registers as exposed
- [ ] 3 walls + roof gives partial shelter
- [ ] Caves count as full shelter
- [ ] Tree canopies alone do NOT count (no walls)
- [ ] Performance: <1ms per check

**Tests:** `ShelterDetector.test.js`
- Fully enclosed → full shelter
- Open sky → exposed
- Cave/underground → full shelter
- 3 walls + roof → partial shelter
- 2 walls + roof → exposed
- Dense leaves above, no walls → exposed
- Missing roof → exposed

---

#### 1.7.2 Shelter Effects
**Goal:** Being in shelter provides survival benefits

**Implementation tasks:**
- [ ] In shelter at night: monsters don't spawn within 16 blocks
- [ ] In shelter: hunger drain reduced by 25%
- [ ] In shelter: health regeneration rate doubled
- [ ] In shelter: stamina regeneration rate +50%
- [ ] Show "Sheltered" status icon on HUD when active
- [ ] Unsheltered at night: show "Exposed" warning on HUD

**Acceptance criteria:**
- [ ] Shelter noticeably reduces hunger drain
- [ ] Health regens faster in shelter
- [ ] Monsters don't spawn right next to player's base
- [ ] HUD indicator visible

---

### 1.8 Survival HUD (Week 7)

#### 1.8.1 Unified Survival Bar
**Goal:** Clean, readable HUD showing all survival stats

**Implementation tasks:**
- [ ] Create `src/components/ui/SurvivalHUD.jsx`
- [ ] Display bars for: Health (red), Stamina (yellow), Hunger (orange), Mana (blue)
- [ ] Show equipped tool with durability in bottom-center hotbar
- [ ] Show time of day / day number in top-right
- [ ] Show shelter status icon when applicable
- [ ] Show status effects (starving, poisoned, etc.) as icons
- [ ] All bars animate smoothly on change (lerp)
- [ ] Compact layout that doesn't obstruct gameplay
- [ ] Responsive — works on mobile and desktop

**Layout:**
```
┌─────────────────────────────────────────┐
│ ♥ Health ████████░░  Day 3  ☀ 14:30    │
│ ⚡ Stamina ██████████                    │
│ 🍖 Hunger ███████░░░   [Sheltered 🏠]  │
│ ✦ Mana   █████░░░░░                     │
│                                          │
│                                          │
│          [ + 2 Wood ]  (floating text)   │
│                                          │
│    ┌───┬───┬───┬───┬───┬───┬───┬───┬───┐│
│    │ ⛏│ 🪓│ ⚔│   │   │   │   │   │   ││
│    └───┴───┴───┴───┴───┴───┴───┴───┴───┘│
└─────────────────────────────────────────┘
```

**Acceptance criteria:**
- [ ] All survival stats visible at a glance
- [ ] Bars update in real-time
- [ ] Low values draw attention (flashing, color change)
- [ ] Works on both mobile and desktop
- [ ] Doesn't block gameplay view

---

#### 1.8.2 Floating Pickup Text
**Goal:** Show "+2 Wood" floating text when items are gathered

**Implementation tasks:**
- [ ] Create `src/components/ui/FloatingText.jsx`
- [ ] Text appears at world position of mined block (projected to screen space)
- [ ] Floats upward and fades out over 1.5 seconds
- [ ] Batch identical item pickups within 0.5s window ("+6 Wood" instead of 3× "+2 Wood")
- [ ] Limit max concurrent floating texts to 8 (oldest removed first)
- [ ] Color matches item rarity
- [ ] Use CSS/HTML overlay (not WebGL text) for performance

**Acceptance criteria:**
- [ ] Text appears on mining
- [ ] Text floats up and fades
- [ ] Rapid mining batches into single text ("+6 Wood")
- [ ] Max 8 concurrent — no screen spam from fast mining

---

### 1.9 Crafting Integration (Week 7-8)

#### 1.9.1 Survival Crafting Recipes
**Goal:** Add recipes for Phase 1 survival items

**New recipes to add:**
```
Workbench:
  Crafting Table — 4 wood → enables advanced crafting

Tools:
  Wooden Pickaxe — 3 wood, 2 sticks → harvestSpeed 1.0, durability 30
  Wooden Axe — 3 wood, 2 sticks → harvestSpeed 1.0, durability 30
  Stone Pickaxe — 3 cobblestone, 2 sticks → harvestSpeed 1.2, durability 65
  Stone Axe — 3 cobblestone, 2 sticks → harvestSpeed 1.2, durability 65
  Stone Sword — 2 cobblestone, 1 stick → damage 5, durability 65

Materials:
  Sticks — 1 wood → 4 sticks
  Planks — 1 wood → 4 planks

Food:
  Cooked Meat — 1 raw meat + 1 coal (or campfire) → 35 hunger
  Bread — 3 wheat → 25 hunger
  Mushroom Stew — 2 mushrooms, 1 wood bowl → 30 hunger

Building:
  Torch — 1 stick + 1 coal → placeable light source
  Campfire — 3 wood + 3 stone → cooking station (future)
```

**Implementation tasks:**
- [ ] Add recipes to craftingRecipes.js
- [ ] Add TOOL_TIER enum (WOOD=0, STONE=1, IRON=2, DIAMOND=3)
- [ ] Add durability fields to all tool recipes
- [ ] Add food items with hungerRestore field
- [ ] Update CraftingUI categories to include "Survival", "Food"

**Acceptance criteria:**
- [ ] All survival recipes craftable with gathered materials
- [ ] Crafted tools have correct stats
- [ ] Food items have hunger restore values
- [ ] CraftingUI shows new categories

---

#### 1.9.2 Quick Craft / Hotbar
**Goal:** Equip tools and food from a hotbar for fast access

**Implementation tasks:**
- [ ] Add hotbar slots (1-9) to player state
- [ ] Desktop: number keys 1-9 select hotbar slot
- [ ] Desktop: scroll wheel cycles hotbar selection
- [ ] Mobile: tap hotbar slot directly to select
- [ ] Mobile: swipe left/right on hotbar to cycle
- [ ] Currently selected tool affects mining speed
- [ ] Right-click food in hotbar to eat (desktop), long-press slot to eat (mobile)
- [ ] Show selected slot highlight in HUD

**Acceptance criteria:**
- [ ] Number keys switch active hotbar slot (desktop)
- [ ] Tap/swipe works for slot selection (mobile)
- [ ] Selected tool modifies mining speed
- [ ] Food usable from hotbar
- [ ] Visual selection indicator in HUD

---

### 1.10 Death & Consequences (Week 8)

#### 1.10.1 Enhanced Death
**Goal:** Death has meaningful consequences without being punishing

**Implementation tasks:**
- [ ] On death: drop 50% of materials on ground as loot bag
- [ ] Loot bag persists for 5 in-game minutes, then despawns
- [ ] Player respawns at original spawn point (or bed if placed — future)
- [ ] Health/hunger/stamina reset to 50% (not full)
- [ ] Tools and equipment kept but lose 25% durability on death
- [ ] Show death cause on death screen ("Killed by Skeleton", "Starvation")
- [ ] Death location marked on future minimap (stretch)

**Acceptance criteria:**
- [ ] Dying feels consequential (lost resources)
- [ ] Dying isn't game-ending (keep equipment)
- [ ] Can recover dropped materials if quick
- [ ] Death cause displayed clearly
- [ ] Respawn with reduced stats creates early vulnerability

---

### 1.11 Integration & Balance (Weeks 9-10)

#### 1.11.1 Gameplay Loop Testing
**Goal:** The full survival loop works end-to-end

**Integration verification:**
```
Spawn → Gather wood → Craft tools → Mine stone/ore → Craft better tools →
Build shelter → Gather food → Survive night → Repeat with progression
```

**Playtest scenarios (run each manually):**
1. **"Naked & Afraid"** — Can player survive first 3 in-game days from scratch?
2. **"Tool Chain"** — Can player progress from bare hands → iron tools in one session?
3. **"Night Terror"** — Is night actually dangerous or just an annoyance?
4. **"Starvation Recovery"** — Can player recover from 0 hunger without dying?
5. **"Death Spiral"** — After dying, can player recover without a compounding disadvantage?
6. **"Speed Run"** — Can an experienced player build shelter before first nightfall?

**Metrics to track (log to console in debug mode):**
- Average survival time per session
- Cause of death breakdown (monster/starvation/fall)
- Hunger at time of death
- Time to first shelter
- Time to first tool craft

**Tasks:**
- [ ] Verify the complete loop can be played through
- [ ] Tune hunger drain rate (not too fast, not ignorable)
- [ ] Tune night monster difficulty (threatening but survivable with shelter)
- [ ] Tune tool durability (enough uses to feel useful, not infinite)
- [ ] Tune crafting costs (achievable in first day, not trivial)
- [ ] Tune food availability (requires effort to stay fed, not impossible)
- [ ] Ensure first night is survivable with basic shelter
- [ ] Ensure no crafting dead-ends (can always gather base materials)
- [ ] Run all 6 playtest scenarios and document results

**Balance targets:**
```
First day timeline:
  0:00-5:00   Gather wood, make tools
  5:00-10:00  Mine stone, build basic shelter
  10:00-15:00 Gather food, smelt iron
  15:00-20:00 Reinforce shelter, prepare for night

Night survival:
  - In shelter: safe, hunger drains slowly
  - Outside: dangerous, must fight or flee
  - With stone sword: can fight basic monsters
  - Without weapons: death is likely
```

**Acceptance criteria:**
- [ ] New player can figure out the survival loop without a tutorial
- [ ] First night is a genuine challenge
- [ ] Subsequent nights get easier with better gear
- [ ] No softlock states (always possible to recover)

---

#### 1.11.2 Save/Load Validation
**Goal:** All new systems persist correctly

**Tasks:**
- [ ] World time saves and loads correctly
- [ ] Hunger value saves and loads
- [ ] Expanded materials save and load
- [ ] Tool durability saves and loads
- [ ] Hotbar configuration saves and loads
- [ ] Monster spawn state saves (or regenerates consistently)
- [ ] Lighting restores to correct time of day

**Tests:** `SurvivalSaveLoad.test.js`
- Full game state roundtrip with all Phase 1 additions

---

#### 1.11.3 Minimal Tutorial Hints
**Goal:** New players can discover the survival loop without a wiki

**Implementation tasks:**
- [ ] Show one-time contextual hints as overlay text (dismiss on click/tap):
  - On spawn: "Gather wood from trees to get started"
  - On first wood pickup: "Open crafting (C) to make tools"
  - On first tool craft: "Equip your tool (1-9) to mine faster"
  - At dusk (first night): "Night is coming — find or build shelter!"
  - On first hunger below 50: "You're getting hungry — find food"
- [ ] Track shown hints in player state (don't repeat after dismissal)
- [ ] Hints auto-dismiss after 8 seconds if not clicked
- [ ] Persist hint state in save/load

**Design note:** These are NOT a tutorial system — just 5 one-time breadcrumbs. Full tutorial is Phase 5.

**Acceptance criteria:**
- [ ] First-time player receives guidance at key moments
- [ ] Hints don't repeat once dismissed
- [ ] Hints don't obstruct gameplay (small, positioned at top-center)
- [ ] Experienced players see each hint at most once per save

---

#### 1.11.4 Tuning Constants File
**Goal:** All gameplay balance numbers in one place for easy iteration

**Implementation tasks:**
- [ ] Create `src/data/tuning.js` exporting all balance constants
- [ ] Move constants from scattered files into tuning.js:
  - `DAY_LENGTH_SECONDS`, `SUNRISE_START/END`, `SUNSET_START/END`
  - `HUNGER_DRAIN_RATE`, `SPRINT_HUNGER_MULTIPLIER`, hunger thresholds
  - `STARVATION_DAMAGE_RATE`, `SHELTER_HUNGER_REDUCTION`
  - Block break times, tool harvest speeds, tool durabilities
  - Night spawn multiplier, aggro ranges (day/night)
  - Death material drop percentage, respawn stat percentages
  - Food density targets (berry bushes per chunk, apple drop chance)
- [ ] Comment each constant with rationale and acceptable range
- [ ] Import tuning.js wherever constants are used

**Acceptance criteria:**
- [ ] Changing one number in tuning.js adjusts gameplay immediately
- [ ] No magic numbers scattered across source files
- [ ] Each constant has a comment explaining what it controls

---

#### 1.11.5 Sound Placeholders (Stretch Goal)
**Goal:** Audio feedback for key survival actions

**Implementation tasks:**
- [ ] Mining: rhythmic tap sound during progress, crunch on block break
- [ ] Tool break: snap/shatter sound
- [ ] Eating: crunch/gulp sound
- [ ] Night transition: ambient cricket → owl hoot → wolf howl
- [ ] Monster aggro: growl/screech when monster starts chasing
- [ ] Low hunger warning: stomach rumble

**Design note:** Even free/placeholder sounds from a sound library improve game feel dramatically. Use Web Audio API or Howler.js. Defer polish-quality audio to Phase 5.

**Acceptance criteria:**
- [ ] At least mining, eating, and night transition have placeholder sounds
- [ ] Sounds can be muted globally
- [ ] Sound system doesn't impact performance (<0.5ms per frame)

---

#### 1.11.6 Performance Validation
**Goal:** Phase 1 additions don't degrade performance

**Performance checks:**
- [ ] Day/night lighting updates: <0.5ms per frame
- [ ] Hunger/shelter systems: <0.1ms per tick
- [ ] Mining progress tracking: <0.1ms per frame
- [ ] Monster spawn calculations: <1ms per tick
- [ ] Floating text rendering: <0.5ms for 10 active texts
- [ ] Total frame budget: still <16ms average

---

### 1.12 Mobile Controls Overhaul (Week 8-9)

Mobile controls need significant improvement to make the survival loop feel natural on touch devices. Currently camera rotation requires 2 fingers (awkward), there's no jump on mobile, and there's no zoom control.

#### 1.12.1 One-Finger Camera Rotation
**Goal:** Swipe anywhere on screen with one finger to rotate camera

**Current behavior:** Camera rotation requires a 2-finger touch swipe (CameraRotateControls.jsx). One-finger tap is used for tap-to-move. This makes camera control awkward — players need both hands and two fingers on one hand just to look around.

**New behavior:** Distinguish between tap (short, <200ms, <10px movement) and drag (longer or moved) on a single finger:
- **Short tap** (<200ms, <10px): tap-to-move / tap-to-attack (existing behavior via TouchControls)
- **Single-finger drag** (>10px movement or >200ms): rotate camera (replaces 2-finger rotation)
- **Two-finger gestures**: reserved for pinch-to-zoom (see 1.12.3)

**Implementation tasks:**
- [ ] Modify `CameraRotateControls.jsx` to handle 1-finger drag for rotation
- [ ] Add gesture disambiguation: track touch start time + distance moved
- [ ] If finger moves >10px before 200ms timeout → begin camera rotation, suppress tap-to-move
- [ ] If finger lifts <200ms and <10px → dispatch click for TouchControls (tap-to-move)
- [ ] Store `isDragging` flag on canvas dataset so TouchControls knows to ignore
- [ ] Rotation sensitivity: `0.008` radians per pixel (tunable in tuning.js)
- [ ] Remove 2-finger rotation code (replaced by 1-finger + pinch-zoom)

**Interaction with BlockInteraction:**
- Long-press (500ms hold on block) still works — drag threshold cancels it if finger moves >20px
- Drag-to-rotate cancels block highlight if active

**Acceptance criteria:**
- [ ] Single finger drag rotates camera smoothly
- [ ] Short tap still triggers movement/attack
- [ ] No conflict between drag-to-rotate and tap-to-move
- [ ] Long-press mining still works (hold still on block)
- [ ] Rotation feels responsive, not sluggish
- [ ] 2-finger touch no longer rotates (reserved for zoom)

---

#### 1.12.2 Auto-Jump for Mobile
**Goal:** Player automatically jumps when walking into a 1-block-high obstacle

**Rationale:** Mobile has no jump button. Desktop players press Space, but mobile tap-to-move has no equivalent. Without auto-jump, mobile players get stuck on single-block height changes constantly.

**Implementation tasks:**
- [ ] Add auto-jump detection in `Player.jsx` useFrame loop (mobile only)
- [ ] Detection logic:
  1. Player is moving (velocity magnitude > 0.5)
  2. Player is grounded (vertical velocity near zero)
  3. Horizontal movement is blocked (velocity much lower than intended speed)
  4. Block ahead at foot level is solid
  5. Block ahead at head level (foot + 2) is air (room to jump)
- [ ] When all conditions met: apply jump impulse (`velocity.y = 8`, same as Space key)
- [ ] Add cooldown (300ms) to prevent rapid-fire jumps
- [ ] Use a forward raycast from player center at knee height to detect obstacles
- [ ] Only active on touch devices (`isTouchDevice()`) — desktop keeps manual Space jump

**Detection algorithm:**
```
Every frame while mobile + moving + grounded:
  1. Get movement direction from velocity (normalized XZ)
  2. Raycast forward from player feet (y + 0.5) in movement direction, range 1.5 units
  3. If ray hits solid block:
     a. Raycast forward from player head (y + 2.5) in same direction, range 1.5 units
     b. If head ray hits nothing (air): trigger jump
     c. If head ray hits solid: don't jump (wall, not step)
  4. Set cooldown timer to 300ms
```

**Tuning constants (in tuning.js):**
```
AUTO_JUMP_COOLDOWN_MS = 300
AUTO_JUMP_DETECT_RANGE = 1.5  (world units ahead of player)
AUTO_JUMP_IMPULSE = 8         (same as manual jump)
AUTO_JUMP_MIN_SPEED = 0.5     (minimum XZ velocity to trigger)
```

**Acceptance criteria:**
- [ ] Mobile player auto-jumps over 1-block obstacles while moving
- [ ] No auto-jump when facing a wall (2+ blocks high)
- [ ] No auto-jump when stationary
- [ ] Desktop players unaffected (still use Space)
- [ ] Auto-jump cooldown prevents jittering at block edges
- [ ] Works with tap-to-move pathfinding (player walks toward target, auto-jumps over terrain bumps)
- [ ] Does not interfere with falling (only triggers when grounded)

**Tests:** `AutoJump.test.js`
- Triggers when grounded + moving + blocked + headroom
- Does not trigger when stationary
- Does not trigger against 2-block walls
- Cooldown prevents rapid re-trigger
- Disabled on desktop

---

#### 1.12.3 Pinch-to-Zoom Camera
**Goal:** Two-finger pinch gesture zooms camera in/out

**Current behavior:** Camera distance is fixed at 12 units, height at 10 units. No zoom control exists.

**Implementation tasks:**
- [ ] Add pinch gesture detection to `CameraRotateControls.jsx`
- [ ] Track initial distance between 2 touch points on `touchstart`
- [ ] On `touchmove` with 2 fingers: calculate new distance, compute scale ratio
- [ ] Map pinch ratio to `camera.distance`:
  - Pinch in (fingers closer): decrease distance (zoom in)
  - Pinch out (fingers apart): increase distance (zoom out)
- [ ] Clamp distance range: min 4 (close third-person), max 30 (wide overview)
- [ ] Smoothly lerp distance changes (not instant)
- [ ] Scale `camera.height` proportionally: `height = distance × 0.83`
- [ ] Persist camera distance in game store (survives rotation changes)
- [ ] Update REACH_DISTANCE_THIRD_PERSON dynamically based on camera distance
- [ ] Desktop: scroll wheel also adjusts zoom (same range/logic)

**Tuning constants (in tuning.js):**
```
CAMERA_MIN_DISTANCE = 4
CAMERA_MAX_DISTANCE = 30
CAMERA_DEFAULT_DISTANCE = 12
CAMERA_ZOOM_SPEED = 0.02       (pinch sensitivity)
CAMERA_ZOOM_LERP = 0.1         (smoothing factor)
CAMERA_HEIGHT_RATIO = 0.83     (height = distance × ratio)
```

**Acceptance criteria:**
- [ ] Pinch in zooms camera closer to player
- [ ] Pinch out zooms camera further away
- [ ] Zoom range clamped (no clipping through player, no losing sight)
- [ ] Smooth transitions (not jumpy)
- [ ] Camera height adjusts with distance (overview stays useful)
- [ ] Block interaction reach adjusts with camera distance
- [ ] Desktop scroll wheel mirrors pinch behavior
- [ ] Zoom level persists during gameplay (doesn't reset on rotation)
- [ ] No conflict with 1-finger drag rotation

---

## Exit Criteria

Phase 1 is **complete** when ALL of the following are true:

### Functional Requirements
- [ ] **Day/night cycle:** Visually distinct day and night with smooth transitions
- [ ] **Dynamic lighting:** Sun/moon arc, ambient changes, sky color changes
- [ ] **Hunger system:** Drains over time, food restores, starvation damages
- [ ] **Mining yields items:** Breaking blocks adds resources to inventory
- [ ] **Tool progression:** Wooden → stone → iron tools with increasing speed
- [ ] **Tool durability:** Tools break after extended use
- [ ] **Night monsters:** Significantly more dangerous at night
- [ ] **Shelter detection:** Being enclosed provides tangible benefits
- [ ] **Survival HUD:** Health, stamina, hunger, time, tool status visible
- [ ] **Death consequences:** Lose some resources, respawn with reduced stats
- [ ] **Core loop works:** Can survive 7+ in-game days with growing capability
- [ ] **All block types yield appropriate drops**
- [ ] **No crafting dead-ends** — can always progress from any state
- [ ] **Save/load preserves all new state**
- [ ] **Mobile camera rotation:** 1-finger swipe rotates camera smoothly
- [ ] **Mobile auto-jump:** Player auto-jumps 1-block obstacles while moving
- [ ] **Pinch-to-zoom:** 2-finger pinch zooms camera in/out (also scroll wheel on desktop)

### Quality Requirements
- [ ] **60 FPS maintained** with all new systems active (120 chunks, 50+ monsters)
- [ ] **No starvation softlock:** Player can always recover from low hunger
- [ ] **Night is survivable:** With basic preparation, player won't inevitably die
- [ ] **Crafting pipeline clear:** Obvious path from raw materials to useful items
- [ ] **All new systems have tests** (>70% coverage for logic modules)
- [ ] **All UI text readable** on smallest target screen (375px width)
- [ ] **Color-blind safe** — don't rely solely on red/green for status indicators
- [ ] **All interactions have visual feedback** (and audio if stretch goal met)

### Player Experience
- [ ] **First day is engaging:** Player has clear goals (gather, build, survive)
- [ ] **Night creates urgency:** Player feels motivated to prepare
- [ ] **Shelter feels rewarding:** Building a structure provides real benefit
- [ ] **Progression is satisfying:** Better tools = noticeably faster gathering
- [ ] **Death is a setback, not a punishment:** Losing materials stings but isn't devastating
- [ ] **First-time player survives night 1** within 3 attempts
- [ ] **Tool crafting feels rewarding** — noticeable speed difference
- [ ] **Hunger doesn't dominate** — max 30% of playtime spent on food

---

## Dependencies

```
1.1 World Time System
    ↓
1.2 Dynamic Lighting
    ↓
1.6 Night Threats (depends on 1.1 + existing SpawnManager)

1.3 Hunger System (parallel with 1.1/1.2)
    ↓
1.8 Survival HUD (depends on 1.3 for hunger bar)

1.4 Mining → Inventory (parallel with 1.1-1.3)
    ↓
1.5 Tool-Modified Mining (depends on 1.4)
    ↓
1.9 Crafting Integration (depends on 1.4 + 1.5)

1.7 Shelter Detection (parallel, depends on 1.1 for night benefits)

1.10 Death Consequences (depends on 1.4 for drop system)

1.12 Mobile Controls (parallel with 1.8-1.10, touches Player.jsx + CameraRotateControls.jsx)

1.11 Integration (after all above)
```

---

## Weekly Milestones

| Week | Focus | Deliverable |
|------|-------|-------------|
| 1 | Time + Lighting | Day/night cycle visible, sky changes |
| 2 | Lighting + Hunger | Dynamic lights polished, hunger draining |
| 3 | Food + Mining drops | Food items, mining yields materials |
| 4 | Tool mining | Progressive mining, tool speed modifiers — **PLAYTEST CHECKPOINT: test mining loop end-to-end** |
| 5 | Night threats | Night spawning, monster aggression |
| 6 | Night + Shelter | Monster drops, shelter detection |
| 7 | HUD + Crafting | Survival HUD, new recipes, tutorial hints — **PLAYTEST CHECKPOINT: full survival loop** |
| 8 | Death + Hotbar + Mobile | Death consequences, hotbar system, 1-finger camera rotation |
| 9 | Mobile controls | Auto-jump, pinch-to-zoom, mobile gesture testing |
| 10-11 | Integration | Balance tuning, all 6 playtest scenarios, save/load, performance, bug fixing |

**Early playtesting is critical.** Don't wait until Week 9 to discover that mining feels slow or hunger is too aggressive. Test the mining loop at Week 4 and the full survival loop at Week 7.

---

## New Files Created

```
src/data/tuning.js                                 — all balance constants
src/systems/time/TimeManager.js
src/systems/time/__tests__/TimeManager.test.js
src/systems/lighting/DayNightLighting.js
src/systems/lighting/__tests__/DayNightLighting.test.js
src/systems/survival/HungerSystem.js
src/systems/survival/__tests__/HungerSystem.test.js
src/systems/survival/ShelterDetector.js
src/systems/survival/__tests__/ShelterDetector.test.js
src/data/blockDrops.js
src/data/foodItems.js
src/components/3d/DayNightCycle.jsx
src/components/ui/SurvivalHUD.jsx
src/components/ui/TimeDisplay.jsx
src/components/ui/FloatingText.jsx
src/components/ui/TutorialHints.jsx                — one-time contextual hints
```

## Modified Files

```
src/stores/useGameStore.js        — hunger state, food actions, hotbar, worldTime
src/components/3d/Experience.jsx   — replace fixed lights with DayNightCycle
src/components/3d/BlockInteraction.jsx — mining progress, tool modifiers, item drops
src/components/3d/Player.jsx          — auto-jump detection for mobile
src/components/3d/CameraRotateControls.jsx — 1-finger rotation, pinch-to-zoom, remove 2-finger rotation
src/systems/chunks/blockTypes.js   — new block types (TORCH, BERRY_BUSH)
src/data/craftingRecipes.js        — survival recipes, tool durability
src/systems/SpawnManager.js        — night spawn multipliers
src/modules/ai/EnemyAISystem.js    — time-based aggression
src/persistence/Game3DSaveManager.js — persist new state
src/components/DeathScreen.jsx     — death cause, loot drop info
```

---

## Risk Areas

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Dynamic lighting tanks FPS | High | Medium | Pre-compute lighting curves, limit point lights, profile early |
| Hunger feels tedious, not fun | Medium | Medium | Tune drain rate generously, make food easy to find early |
| Night is too hard / too easy | Medium | High | Playtest extensively, expose tuning constants |
| Mining progress feels slow | Medium | Medium | Keep base times short (1-6 sec), ensure tools feel impactful |
| Shelter detection has false positives/negatives | Low | Medium | Use simple raycast approach, err toward "sheltered" |
| 1-finger gesture ambiguity (tap vs drag) | Medium | Medium | Use time+distance threshold (200ms / 10px); playtest on real devices |
| Auto-jump triggers incorrectly on stairs/slopes | Medium | Medium | Require grounded + blocked + headroom; add cooldown to prevent jitter |
| Save file size grows with expanded materials | Low | Low | Materials are just numbers, negligible |

---

## Multiplayer Compatibility Notes

Phase 1 systems must stay compatible with the multiplayer-ready state architecture from Phase 0. Key considerations:

| System | Multiplayer Implication | Design Choice |
|--------|------------------------|---------------|
| World time | Must be server-authoritative, synced to all clients | Store in authoritative state, clients read only |
| Hunger | Per-player state | Store under player state, not world state |
| Shelter | Per-player check | Computed client-side, validated server-side |
| Mining progress | Per-player per-block | Client predicts, server authorizes block break |
| Loot bags | World-level entities | Store as world entities with ownership/timeout |
| Tool durability | Per-player | Store under player inventory state |

No networking code needed yet — just ensure these systems don't assume single-player.

---

## Open Questions

1. **Campfire cooking vs crafting menu?** — Should food be cooked at a campfire block (immersive) or through the crafting menu (simpler)? Start with crafting menu, add campfire as stretch goal.
2. **Torch light performance** — Point lights are expensive in WebGL. Test with 4-8 torches. If too slow, defer to Phase 5.
3. **Bed/respawn point** — Should players be able to set spawn with a crafted bed? Useful but adds complexity. Consider for Phase 2.
4. **Weapon durability** — Should weapons also break? Probably yes for consistency, but could feel punishing in Phase 1. Defer to Phase 3.
5. **Difficulty settings** — Should hunger/night difficulty be configurable? Good idea but defer to Phase 5 polish.
6. **Weather → survival effects?** — Should rain accelerate hunger drain or reduce visibility? Good atmosphere but adds complexity. Note for Phase 2.

---

**Ready to start? Create a branch and begin with 1.1.1 TimeManager.**
