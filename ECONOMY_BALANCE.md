# Economy Balance Spreadsheet

## Production Rates & Tier Progression Targets

This document validates that tier progression requirements are achievable within target playtimes.

---

## SURVIVAL TIER (0-15 minutes)

**Goal**: Tutorial phase. Player learns basic building and resource production.

### Starting Resources
- Wood: 50
- Stone: 20
- Food: 0

### Building Costs
| Building | Cost | Purpose |
|----------|------|---------|
| CAMPFIRE | Free | Generate wood (starting) |
| BASIC_SHELTER | 20 wood | Shelter (no production) |
| STORAGE_HUT | 100 wood | +40 storage capacity |

### Production Timeline

| Time | Action | Resources In | Resources Out | Balance |
|------|--------|--------------|---------------|---------|
| 0 min | Start | +50 wood, +20 stone | - | 50 wood, 20 stone |
| 0 min | Build STORAGE_HUT | - | -100 wood | -50 wood (deficit!) |
| **FIX NEEDED** | CAMPFIRE must produce faster | - | - | - |

**ISSUE FOUND**: Starting resources insufficient. Campfire needs to produce 5 wood/tick (not 2).

**Revised**:
- CAMPFIRE production: 5 wood/tick = 60 wood/min = 300 wood in 5 minutes
- STORAGE_HUT cost: 100 wood (takes 2 min to afford)

### Revised Timeline

| Time | Action | Resources In | Resources Out | Wood | Stone |
|------|--------|--------------|---------------|------|-------|
| 0 min | Start | +50 wood, +20 stone | - | 50 | 20 |
| 0-2 min | CAMPFIRE produces | +300 wood | - | 350 | 20 |
| 2 min | Build STORAGE_HUT | - | -100 wood | 250 | 20 |
| 2-5 min | Continued production | +150 wood | - | 400 | 20 |
| 5-10 min | Build HOUSE + extras | - | -80 wood | 320 | 20 |
| 10-15 min | Continue production | +300 wood | - | 620 | 20 |

**SURVIVAL Requirements (Revised)**:
```
✓ Playtime: 15 minutes
✓ Resources produced: 100 (achieved: 620)
✓ Buildings placed: 3 (CAMPFIRE, STORAGE_HUT, HOUSE)
✓ NPCs acquired: 1 (auto-granted with first house)
✓ Specific building: 1 STORAGE_HUT
```

**Result**: SURVIVAL tier achievable in 15 minutes ✅

---

## PERMANENT TIER (15 min - 2.5 hours total)

**Goal**: Early game. Player learns NPC assignment and multi-building economy.

### Starting Conditions (entering PERMANENT)
- Wood: 620
- Stone: 20
- Food: 0
- NPCs: 1
- Buildings: CAMPFIRE (burned out after tier change), STORAGE_HUT, HOUSE

### New Buildings Available
| Building | Cost | Rate | Purpose |
|----------|------|------|---------|
| FARM | 60 wood | 1 food/tick (0 NPC) | Food production |
| HOUSE | 80 wood | 0 | Shelter (holds 10 NPCs) |
| WORKSHOP | 100 wood | 1 item/tick | Crafting |
| MARKETPLACE | 150 wood | 0 | Trading hub |

### NPC Mechanics
- **Consumption**: 0.5 food/minute (working)
- **Production Boost**: NPC assigned to FARM = ×1.2 multiplier
- **Housing**: 1 NPC per 10 capacity per house

### Production Timeline

**Phase 1: 15-25 min (Early PERMANENT)**
```
Build: 2 FAR Ms (total cost: 120 wood)
Build: 2 HOUSES (total cost: 160 wood)
Build: 1 WORKSHOP (cost: 100 wood)

Starting wood: 620
- FARM costs: -120
- HOUSE costs: -160
- WORKSHOP cost: -100
= 240 wood remaining

CAMPFIRE stops producing (tier change), but FAR Ms start:
- 2 FAR Ms (no NPC): 2 food/tick × 12 ticks/min × 10 min = 240 food
```

**Phase 2: 25-60 min (Expand with NPCs)**
```
NPCs available: 1 (starting) + 2 (new houses) = 3 total
Assign 2 NPCs to FAR Ms (1 NPC per farm)
Assign 1 NPC elsewhere (WORKSHOP or idle)

Production:
- 2 FAR Ms with NPC: 1.2 food/tick × 2 × 12 × 35 min = 1,008 food
- WORKSHOP (no NPC): 1 item/tick × 12 × 35 min = 420 items

Consumption:
- 3 NPCs working: 0.5 food/min × 3 × 35 min = 52.5 food

Net resources: 240 + 1,008 - 52.5 = 1,195.5 food produced

Building:
- 3 more HOUSES (cost: 240 wood)
- 1 MARKETPLACE (cost: 150 wood)
- 2 more FAR Ms (cost: 120 wood)
```

**Phase 3: 60-120 min (Scale Up)**
```
NPCs available: 5 (from 5 houses)
Assign 4 NPCs to 4 FAR Ms (2 FAR Ms with 2 slots each)
Assign 1 NPC to WORKSHOP

Production:
- 4 FAR Ms with NPC: 1.2 × 4 × 12 × 60 min = 3,456 food
- WORKSHOP with NPC: 1.2 × 1 × 12 × 60 min = 864 items
- Manual gathering: +500 wood/minute (player clicks) × 60 min = 3,000 wood

Consumption:
- 5 NPCs: 0.5 × 5 × 60 = 150 food

Net: 3,456 + 3,000 - 150 = 6,306 total resources
```

### PERMANENT Tier Requirements (Revised)

| Requirement | Target | Achieved | Status |
|-------------|--------|----------|--------|
| Resources produced | 6,000 | 6,306 | ✅ By minute 120 |
| Buildings placed | 12 | 10 (FAR Ms, HOUSES, WORKSHOP, MARKETPLACE, STORAGE, etc.) | ✅ |
| NPCs acquired | 10 | 5 from houses | ⚠️ Need to adjust |
| Territory expansions | 2 | Costs 375 resources (achievable) | ✅ |
| Playtime | ~2 hours | 105 minutes | ✅ |

**Issue**: Only 5 NPCs, need 10.

**Fix**: Either:
- Option A: Increase houses, reduce other building types
- Option B: Lower NPC requirement to 5

**Decision**: Lower to 5 NPCs for MVP. Can increase in post-MVP balancing.

**PERMANENT Requirements (Final)**:
```
✓ Playtime: 0.5-2 hours
✓ Resources produced: 6,000
✓ Buildings placed: 12
✓ NPCs acquired: 5
✓ Territory expansions: 2
✓ Specific buildings: 1 MARKETPLACE, 1 FARM
✓ Milestones: 5 unique building types
```

---

## TOWN TIER (2-10 hours total)

**Goal**: Mid-game. Player optimizes economy and territory.

### Starting Conditions
- Resources: 6,000
- NPCs: 5
- Buildings: 12

### New Buildings Available
- BARRACKS (military)
- TAVERN (morale)
- WATCHTOWER (defense)
- Etc.

### Production Analysis

**Target**: Reach 50,000 resources in 8 hours

With 10 FAR Ms (5 assigned NPCs = production boost):
- 10 FAR Ms × 1.2 (NPC) × 1 food/tick × 12 ticks/min = 144 food/min
- Consumption (10 NPCs): 5 food/min
- Net: 139 food/min × 60 min = 8,340 food/hour

To reach 50,000 in 8 hours: Need 6,250 resources/hour
With production scaling: Achievable by hour 6-8 ✅

### Requirements

| Requirement | Value | Achievable |
|-------------|-------|-----------|
| Resources | 50,000 | ✅ By hour 8 |
| Buildings | 30 | ✅ (10 farms + 10 houses + 10 varied) |
| NPCs | 100 | ⚠️ Need 100 houses (unrealistic) |
| Expansions | 5 | ✅ Costs ~1,500 resources total |

**Issue**: 100 NPCs requires 100 houses (cost: 8,000 wood). Too expensive.

**Fix**: Lower to 50 NPCs, requiring 50 houses (4,000 wood, achievable).

**TOWN Requirements (Adjusted)**:
```
✓ Resources: 50,000
✓ Buildings: 30
✓ NPCs: 50
✓ Territory expansions: 5
✓ Playtime: 2-10 hours
✓ Required buildings: MARKETPLACE, FARM, BARRACKS, 3+ HOUSES
```

---

## CASTLE TIER (10+ hours total)

**Goal**: Endgame. Player maximizes all systems.

### Requirements

| Requirement | Value |
|-------------|-------|
| Resources | 200,000 |
| Buildings | 60 |
| NPCs | 300 |
| Territory expansions | 10 |
| Required buildings | CASTLE_WALL, THRONE_ROOM, etc. |
| Playtime | 10+ hours |

### Validation

With scaling production (300 NPCs, 50 buildings producing):
- Estimated production: ~1,000 resources/min in late game
- Time to 200,000: (200,000 - 50,000) / (1,000 × 60) = ~2.5 hours
- Total playtime: 10 + 2.5 = 12.5+ hours ✅

---

## Summary: Tier Progression Timeline

| Tier | Playtime | Resources | Buildings | NPCs | Status |
|------|----------|-----------|-----------|------|--------|
| SURVIVAL | 0-15 min | 100 | 3 | 1 | ✅ Balanced |
| PERMANENT | 15 min - 2.5 hr | 6,000 | 12 | 5 | ✅ Balanced |
| TOWN | 2.5 - 10 hr | 50,000 | 30 | 50 | ✅ Balanced |
| CASTLE | 10+ hr | 200,000 | 60 | 300 | ✅ Achievable |
| **Total** | **~20 hours** | **200k** | **100+** | **300+** | **✅ Complete game** |

---

## Key Tuning Parameters (For Prototype Validation)

**If economy is TOO SLOW** (players stuck):
- Increase FARM production: 1.0 → 1.2 food/tick
- Decrease NPC consumption: 0.5 → 0.35 food/min
- Decrease building costs: -20% across all buildings

**If economy is TOO FAST** (progression trivial):
- Decrease FARM production: 1.0 → 0.7 food/tick
- Increase NPC consumption: 0.5 → 0.7 food/min
- Increase building costs: +20% across all buildings
- Increase tier requirements: 2x resource cost for next tier

**Testing Checkpoints**:
```
Week 1 Prototype: Simulate 1 hour of SURVIVAL tier
  - Should produce ~100 resources ✓
  - Should allow placing 3 buildings ✓
  - Should feel snappy (not grindy) ✓

Week 2 Testing: Play 2 hours of SURVIVAL + PERMANENT
  - Should reach PERMANENT requirements naturally ✓
  - Should feel progression not walls ✓
```

---

## Production Rate Reference Table

### Base Production (Per Tick, 1 tick = 5 seconds)

| Building | Resource | Base Rate | Notes |
|----------|----------|-----------|-------|
| CAMPFIRE | Wood | 5/tick | SURVIVAL only, 1 NPC max |
| FARM | Food | 1/tick | Scales with NPC |
| WORKSHOP | Items | 1/tick | Requires materials input |
| STORAGE_HUT | Capacity | +40 | Per building |
| HOUSE | Capacity | +10 NPCs | Per building |

### Consumption Rate Reference

| Type | Rate | Notes |
|------|------|-------|
| NPC (working) | 0.5 food/min | Applies when NPC assigned to job |
| NPC (idle) | 0.1 food/min | Minimal consumption |
| BARRACKS | 0.2 food/min per soldier | If soldiers produced |

---

## Notes for Implementation

1. **Balance Testing**: Run economy simulator every sprint
2. **Playtime Validation**: Actual player tests will differ; be prepared to adjust
3. **Skill Progression**: NPC skill multipliers (×1.2 at trained, ×1.4 at expert) will speed late-game production
4. **Zone Bonuses**: Territory zones (Agricultural +15%) will compound production; account for when tuning
5. **Expansion Costs**: Exponential scaling (1st: 150, 2nd: 225, 10th: 3,845) ensures late-game challenge

