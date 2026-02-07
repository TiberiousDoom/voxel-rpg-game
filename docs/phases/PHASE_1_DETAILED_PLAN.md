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

**Time constants:**
```
DAY_LENGTH_SECONDS = 1200   (20 real minutes)
SUNRISE_START = 0.20        (4:48 AM equivalent)
SUNRISE_END = 0.30          (7:12 AM)
SUNSET_START = 0.70         (4:48 PM)
SUNSET_END = 0.80           (7:12 PM)
```

**Acceptance criteria:**
- [ ] `timeOfDay` cycles 0→1→0 continuously
- [ ] `isNight` is true between sunset end and sunrise start
- [ ] Day number increments at midnight
- [ ] Time persists across save/load
- [ ] Time pauses when game is paused

**Tests:** `TimeManager.test.js`
- Time advances by delta correctly
- Day/night boundaries are accurate
- Save/load roundtrip preserves time
- Pause halts progression

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
- [ ] Multiply with WeatherSystem `lightingModifier` for weather effects
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
- [ ] Add `hungerDrainRate` constant: 1 hunger per 60 real seconds (= ~20 per in-game day)
- [ ] Sprinting doubles hunger drain rate
- [ ] At hunger < 20: health regeneration stops
- [ ] At hunger = 0: take 1 damage per 10 seconds (starvation)
- [ ] Create `src/systems/survival/HungerSystem.js` with `update(delta)` method
- [ ] Wire into game tick loop (GameManager or useFrame)
- [ ] Persist hunger in save/load

**Hunger thresholds:**
```
100-60: Well Fed    — normal health regen
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

**Tests:** `HungerSystem.test.js`
- Hunger drains at correct rate
- Sprint modifier applies
- Threshold effects trigger correctly
- Starvation damage rate is accurate

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

**Acceptance criteria:**
- [ ] Berry bushes generate in the world (terrain gen)
- [ ] Mining berry bush yields berries in inventory
- [ ] Mining leaves has a chance to drop apples
- [ ] Killing wildlife yields raw meat

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
- [ ] Show "Requires Iron Pickaxe" tooltip when targeting ore without correct tool

**Acceptance criteria:**
- [ ] Ore blocks break without right tool but yield nothing
- [ ] Correct tool yields normal drops
- [ ] Tooltip warns about wrong tool

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
- [ ] Night monsters despawn (fade out) if still alive 5 minutes after sunrise

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
3. If has roof AND 3+ walls → isInShelter = true
```

**Acceptance criteria:**
- [ ] Standing inside a roofed box registers as sheltered
- [ ] Standing outside in the open registers as unsheltered
- [ ] Partially enclosed spaces (3 walls + roof) count
- [ ] Caves count as shelter
- [ ] Performance: <1ms per check

**Tests:** `ShelterDetector.test.js`
- Fully enclosed → sheltered
- Open sky → not sheltered
- Cave → sheltered
- Missing wall → still sheltered (3/4 walls)
- Missing roof → not sheltered

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
- [ ] Stacks nearby pickups ("+2 Wood, +1 Coal" on same line)
- [ ] Color matches item rarity

**Acceptance criteria:**
- [ ] Text appears on mining
- [ ] Text floats up and fades
- [ ] Multiple pickups don't spam screen (stacked)

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
- [ ] Number keys 1-9 select hotbar slot
- [ ] Currently selected tool affects mining speed
- [ ] Right-click food in hotbar to eat
- [ ] Show selected slot highlight in HUD

**Acceptance criteria:**
- [ ] Number keys switch active hotbar slot
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
- [ ] Tools and equipment kept (not dropped)
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

**Tasks:**
- [ ] Verify the complete loop can be played through
- [ ] Tune hunger drain rate (not too fast, not ignorable)
- [ ] Tune night monster difficulty (threatening but survivable with shelter)
- [ ] Tune tool durability (enough uses to feel useful, not infinite)
- [ ] Tune crafting costs (achievable in first day, not trivial)
- [ ] Tune food availability (requires effort to stay fed, not impossible)
- [ ] Ensure first night is survivable with basic shelter
- [ ] Ensure no crafting dead-ends (can always gather base materials)

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

#### 1.11.3 Performance Validation
**Goal:** Phase 1 additions don't degrade performance

**Performance checks:**
- [ ] Day/night lighting updates: <0.5ms per frame
- [ ] Hunger/shelter systems: <0.1ms per tick
- [ ] Mining progress tracking: <0.1ms per frame
- [ ] Monster spawn calculations: <1ms per tick
- [ ] Floating text rendering: <0.5ms for 10 active texts
- [ ] Total frame budget: still <16ms average

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
- [ ] **Core loop works:** Can survive multiple in-game days with growing capability
- [ ] **Save/load preserves all new state**

### Quality Requirements
- [ ] **60 FPS maintained** with all new systems active
- [ ] **No starvation softlock:** Player can always recover from low hunger
- [ ] **Night is survivable:** With basic preparation, player won't inevitably die
- [ ] **Crafting pipeline clear:** Obvious path from raw materials to useful items
- [ ] **All new systems have tests** (>70% coverage for logic modules)

### Player Experience
- [ ] **First day is engaging:** Player has clear goals (gather, build, survive)
- [ ] **Night creates urgency:** Player feels motivated to prepare
- [ ] **Shelter feels rewarding:** Building a structure provides real benefit
- [ ] **Progression is satisfying:** Better tools = noticeably faster gathering
- [ ] **Death is a setback, not a punishment:** Losing materials stings but isn't devastating

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

1.11 Integration (after all above)
```

---

## Weekly Milestones

| Week | Focus | Deliverable |
|------|-------|-------------|
| 1 | Time + Lighting | Day/night cycle visible, sky changes |
| 2 | Lighting + Hunger | Dynamic lights polished, hunger draining |
| 3 | Food + Mining drops | Food items, mining yields materials |
| 4 | Tool mining | Progressive mining, tool speed modifiers |
| 5 | Night threats | Night spawning, monster aggression |
| 6 | Night + Shelter | Monster drops, shelter detection |
| 7 | HUD + Crafting | Survival HUD, new recipes |
| 8 | Death + Hotbar | Death consequences, hotbar system |
| 9-10 | Integration | Balance, save/load, performance, bug fixing |

---

## New Files Created

```
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
```

## Modified Files

```
src/stores/useGameStore.js        — hunger state, food actions, hotbar, worldTime
src/components/3d/Experience.jsx   — replace fixed lights with DayNightCycle
src/components/3d/BlockInteraction.jsx — mining progress, tool modifiers, item drops
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
| Save file size grows with expanded materials | Low | Low | Materials are just numbers, negligible |

---

## Open Questions

1. **Campfire cooking vs crafting menu?** — Should food be cooked at a campfire block (immersive) or through the crafting menu (simpler)? Start with crafting menu, add campfire as stretch goal.
2. **Torch light performance** — Point lights are expensive in WebGL. Test with 4-8 torches. If too slow, defer to Phase 5.
3. **Bed/respawn point** — Should players be able to set spawn with a crafted bed? Useful but adds complexity. Consider for Phase 2.
4. **Weapon durability** — Should weapons also break? Probably yes for consistency, but could feel punishing in Phase 1. Defer to Phase 3.
5. **Difficulty settings** — Should hunger/night difficulty be configurable? Good idea but defer to Phase 5 polish.

---

**Ready to start? Create a branch and begin with 1.1.1 TimeManager.**
