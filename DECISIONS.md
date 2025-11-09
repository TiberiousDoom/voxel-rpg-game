# Architecture Decisions Log

## Overview
This document records all major architectural and design decisions made during development. Each decision includes rationale, alternatives considered, and risks identified.

---

## Game Systems Architecture

### 1. NPC Pathfinding Algorithm
**Decided**: Week 1, Prototype Phase
**Status**: 🟡 Pending Prototype Validation

**Decision**: Use simple grid-based movement (not A* pathfinding)

**Rationale**:
- A* is O(n log n) per NPC per tick; grid movement is O(n)
- For 50 NPCs at 10 movement ticks/sec: Grid = ~50 ops/sec, A* = ~500 ops/sec
- Early optimization wins: Grid movement proves the concept without over-engineering
- Mobile optimization: Grid movement uses less CPU than A*

**Implementation Details**:
```
- Movement: 1 grid cell per 0.1 seconds (10 cells/second)
- Collision avoidance: Pick adjacent cell if target blocked
- Stuck detection: If blocked 3+ seconds (30 ticks), teleport 1 cell away
- Movement frequency: Independent of production ticks (0.1s vs 5s)
```

**Alternatives Considered**:
1. A* pathfinding (rejected: overkill for grid movement)
2. Waypoint system (rejected: too rigid for open-ended territory)
3. No pathfinding, teleport (rejected: breaks immersion)

**Risks & Mitigation**:
- **Risk**: 50+ NPCs cause FPS drop
- **Mitigation**: Spatial partitioning (only check adjacent cells for collisions)
- **Risk**: NPCs stuck in corners
- **Mitigation**: Teleport recovery + wait-for-path-clear state

**Performance Targets**:
- 50 NPCs: 60 FPS stable
- 100 NPCs: 45-60 FPS
- 200 NPCs: 30 FPS degraded (still playable)

**Testing Checklist**:
- [ ] Benchmark: 50 NPCs walking simultaneously
- [ ] Benchmark: 100 NPCs in dense area
- [ ] Edge case: 4 NPCs converging to 1 cell
- [ ] Recovery: Stuck NPC teleports correctly

---

### 2. Production Tick Frequency
**Decided**: Week 1, Specifications Phase
**Status**: 🟢 Locked

**Decision**: Production tick = 5 seconds (not 10 or continuous)

**Rationale**:
- 5 seconds = player sees feedback quickly (snappy feel)
- 10 seconds = feels slow (testing showed players lose engagement)
- Continuous = excessive calculations (avoid)
- Aligns with game loop: physics (0.016s), movement (0.1s), production (5s)

**NPC Arrival Behavior**:
- Farm is CAPABLE of producing every 5 seconds
- If NPC present: normal production rate (1.0x)
- If NPC absent: reduced production (0.5x) until NPC arrives
- **Consequence**: Incentivizes quick NPC assignment; doesn't hard-block

**Example**:
```
Farm 20 cells away, production tick every 5s:
- NPC walks 2s to arrive
- Tick 1 (0-5s): NPC absent = 0.5x production
- Tick 2 (5-10s): NPC present = 1.0x production
- Tick 3+: Normal

Early-game slightly slower than estimated in economy sheet,
but better player experience (avoid "watching paint dry" feeling)
```

**Alternatives Considered**:
1. 10-second tick (rejected: too slow feedback)
2. Continuous production (rejected: CPU intensive)
3. Production waits for NPC (rejected: NPCs teleport, immersion breaks)

**Risks & Mitigation**:
- **Risk**: Economic projections off by 10% (tick speed variance)
- **Mitigation**: Balance spreadsheet validated; can retune if needed

---

### 3. Work Slots Per Building
**Decided**: Week 1, Specifications Phase
**Status**: 🟢 Locked

**Decision**: Each building has max concurrent NPCs (FARM=2, WORKSHOP=1, etc.)

**Rationale**:
- Prevents overcrowding (10 NPCs in tiny farm is ridiculous)
- Adds strategic depth (player must build 5 farms or train NPCs)
- Forces economy diversification (can't min-max one building type)
- Realistic modeling (physical space constraints)

**Work Slot Assignments**:
```
Building Type | Max Slots | Why
CAMPFIRE      | 1         | Sole worker
FARM          | 2         | 2 farmhands max
WORKSHOP      | 1         | Master craftsperson
MARKETPLACE   | 2         | 2 merchants
BARRACKS      | 5         | 5 soldiers stationed
TAVERN        | 1         | Bartender
WATCHTOWER    | 2         | 2 guards on duty
MAGE_TOWER    | 2         | 2 mages casting
TOWN_CENTER   | 1         | Mayor/administrator
CASTLE_WALL   | 0         | Defensive structure (no workers)
```

**NPC Assignment Priority** (when slots compete):
1. Skill match (Farmer NPC → FARM = ×1.3 bonus)
2. Idle time (longest idle wins, fairness)
3. Proximity (closest to building)
4. NPC ID (oldest first, deterministic)

**Excess NPC Behavior**:
- If FARM has 2 slots but 4 NPCs want to work:
  - 2 get assigned (by priority above)
  - 2 find next available work
  - If no work: become idle, generate -1% morale penalty per unassigned NPC (max -10%)

**Alternatives Considered**:
1. Unlimited NPCs per building (rejected: economy breaks, 10 NPCs = 10x production)
2. Queue system (rejected: too complex for MVP)
3. Skill-based assignment only (rejected: removes strategy)

**Risks & Mitigation**:
- **Risk**: Player builds 100 farms, bored with repetition
- **Mitigation**: Alternative building types (workshops, taverns); zone bonuses encourage diversity

**Testing Checklist**:
- [ ] 2 NPCs assigned to FARM, 3rd waits properly
- [ ] Priority algorithm assigns correct NPC
- [ ] Idle penalty calculates correctly

---

### 4. Territory Expansion Economics
**Decided**: Week 1, Specifications Phase
**Status**: 🟢 Locked

**Decision**: Exponential cost scaling with concrete numbers

**Expansion Formula**:
```
cost(n) = 100 × (1.5 ^ n) resources
  1st: 150 resources
  2nd: 225 resources
  3rd: 338 resources
  5th: 760 resources
  10th: 3,845 resources
```

**Expansion Mechanics**:
- Area gained: +400 cells per expansion (20×20)
- Cooldown: 2 in-game hours between expansions
- Direction: Orthogonal only (up/down/left/right)
- Tier-gated:
  - Expansions 1-3: PERMANENT tier
  - Expansions 4-7: TOWN tier
  - Expansions 8-10: CASTLE tier

**Rationale**:
- Exponential cost gates late-game expansion (1st cheap, 10th expensive)
- 400 cells per expansion = noticeable growth without map getting huge
- 2-hour cooldown = prevents spam, creates strategic pacing
- Tier gates = content gating (can't skip tiers)

**Alternatives Considered**:
1. Flat cost (rejected: trivializes expansion)
2. Linear cost (rejected: doesn't scale)
3. Unlimited expansions (rejected: no end-game gate)

**Risks & Mitigation**:
- **Risk**: Expansion cost curve wrong (10th expansion feels unfair or trivial)
- **Mitigation**: Prototype will validate; can adjust exponent (1.5 → 1.3 or 1.7)

**Testing Checklist**:
- [ ] Progression: Player can afford 1st expansion by minute 60
- [ ] Balance: 5th expansion requires significant economy
- [ ] Feel: Expansion feels rewarding, not tedious

---

### 5. Tier Progression Requirements (Hard Gates)
**Decided**: Week 2, Specifications Phase
**Status**: 🟢 Locked

**Decision**: All tier requirements are AND (must meet ALL, not ANY)

**Tier Requirements** (All must be true):

**SURVIVAL → PERMANENT**:
```
✓ Playtime: 30 minutes in-game
✓ Resources produced: 200 total
✓ Buildings placed: 5
✓ NPCs acquired: 3
✓ Specific building: 1 STORAGE_HUT placed
```

**PERMANENT → TOWN**:
```
✓ Playtime: 2 hours in-game
✓ Resources produced: 6,000 total
✓ Buildings placed: 12
✓ NPCs acquired: 5
✓ Territory expansions: 2 completed
✓ Specific buildings: 1 MARKETPLACE, 1 FARM
✓ Milestones: 5 unique building types placed
```

**TOWN → CASTLE**:
```
✓ Playtime: 10 hours in-game
✓ Resources produced: 50,000 total
✓ Buildings placed: 30
✓ NPCs acquired: 50
✓ Territory expansions: 5 completed
✓ Specific buildings: 1 MARKETPLACE, 1 FARM, 1 BARRACKS, 3+ HOUSES
✓ Previous tiers: All PERMANENT tier requirements complete
```

**No Soft Gates for Tier Progression**: Avoid confusion. If you can't build something, you're blocked hard and told why.

**Tier Lock (No Reverting)**:
- Once you enter TOWN tier, you stay in TOWN tier
- Unlocked buildings remain unlocked even if sold/destroyed
- Prevents exploit: advance → unlock → sell → downgrade → repeat

**Rationale**:
- AND gates prevent cheese-runs (can't reach TOWN by farming one resource)
- Requirements are interconnected (meet one naturally helps others)
- Playtime validation in ECONOMY_BALANCE.md shows these are achievable
- No downgrade prevents farming exploits

**Alternatives Considered**:
1. Soft gates (rejected: unclear progression, exploitable)
2. OR gates (rejected: trivializes tiers)
3. Skill-based progression (rejected: no place in resource-management game)

**Risks & Mitigation**:
- **Risk**: Some players stuck on one requirement
- **Mitigation**: Economy balanced so meeting one progresses others; stretch requirements if needed

**Testing Checklist**:
- [ ] Play SURVIVAL: Can reach PERMANENT in ~30 minutes
- [ ] Play PERMANENT: Can reach TOWN in ~2 hours
- [ ] Verify: Tier unlock triggers correct building unlocks

---

### 6. Multiplier Stacking (Hard Cap at 2.0x)
**Decided**: Week 2, Specifications Phase
**Status**: 🟢 Locked

**Decision**: Total multiplier cannot exceed 2.0x regardless of bonuses

**Stacking Order** (with incremental caps):
```
Base production × NPC (max 1.5x)
              × Zone (additive +15% max, so ×1.15)
              × Aura (max 1.05x, only strongest aura counts)
              × Tech (max 1.3x)
              × Morale (±10%, so ×0.9 to ×1.1)
              [ABSOLUTE CAP: 2.0x]
```

**Example Calculation**:
```
Base farm: 1 food/tick
× NPC (trained): 1.3 (capped at 1.5, ok)
= 1.3

× Zone bonus (Agricultural): 1.1 (additive bonus)
= 1.43

× Aura (1 Town Center): 1.05 (multiple auras capped at 1, use strongest)
= 1.50

× Tech (Advanced Farming): 1.2
= 1.80

× Morale (100%): 1.05
= 1.89 (under 2.0x cap)

Final: 1.89x production
```

**Multiple Aura Rule**:
- If 3 Town Centers all buff one farm, only strongest aura applies
- Prevents aura stacking (3 × 1.05 ≠ 1.1575x)
- Makes aura placement strategic (overlap is wasteful)

**Rationale**:
- 2.0x cap prevents runaway economy (100x production breaks balance)
- Requires upfront knowledge when tuning base rates
- Forces meaningful choices (pick which bonuses to prioritize)
- Still allows powerful farms late-game (2.0x feels rewarding)

**Alternatives Considered**:
1. No cap (rejected: economy becomes broken, 1000x production possible)
2. Multiplicative cap per layer (rejected: too complex, unpredictable)
3. Diminishing returns (rejected: players hate math)

**Risks & Mitigation**:
- **Risk**: 2.0x cap discovered too late, all base rates wrong
- **Mitigation**: Cap designed upfront; base rates tuned around it
- **Risk**: Some buildings always capped, feels unfair
- **Mitigation**: Not all buildings will hit 2.0x; varies by building type

**Implementation**:
```javascript
function applyMultipliers(baseProduction, npcMult, zoneMult, auraMult, techMult, moraleMult) {
  let cumulative = baseProduction
  cumulative *= Math.min(npcMult, 1.5)      // NPC capped
  cumulative *= zoneMult                     // Zone additive
  cumulative *= auraMult                     // Aura
  cumulative *= techMult                     // Tech
  cumulative *= moraleMult                   // Morale
  return Math.min(cumulative, baseProduction * 2.0) // Hard 2.0x cap
}
```

**Testing Checklist**:
- [ ] Calculate: Farm with max bonuses (should cap at 2.0x)
- [ ] Calculate: Building with minimum bonuses (should be < 1.0x)
- [ ] Gameplay: Late-game farm at 2.0x feels balanced (not OP)

---

### 7. NPC Food Consumption
**Decided**: Week 2, Balance Phase
**Status**: 🟢 Locked

**Decision**: NPC consumption = 0.5 food/minute (working)

**Consumption Breakdown**:
```
Base (idle): 0.1 food/minute
Working: +0.4 (total: 0.5)
Resting: +0.05 (total: 0.15)
Starving: ×2 (degraded state)
```

**Economic Impact**:
```
1 FARM with 1 NPC: produces 1.2 food/tick = 14.4 food/min
1 NPC consumption (working): 0.5 food/min
Net: 13.9 food/min surplus = feeds 28 other NPCs
Ratio: 1 farm feeds itself + 28 others (balanced)
```

**Late-Game Example**:
```
100 NPCs × 0.5 food/min = 50 food/min consumption
Territory with 20 FAR Ms (all assigned): 20 × 1.2 × 12 ticks/min = 288 food/min
Surplus: 238 food/min (plenty of buffer)
```

**Rationale**:
- 0.5 food/min feels realistic (people eat multiple times per day)
- Creates resource tension (more NPCs = more mouths to feed)
- Encourages building farms (can't ignore food production)
- Allows scaling to 300+ NPCs without economy breaking

**Alternatives Considered**:
1. 0.1 food/min (rejected: too low, food irrelevant)
2. 1.0 food/min (rejected: too high, player starves if not careful)
3. Variable consumption (rejected: too complex)

**Risks & Mitigation**:
- **Risk**: Late-game food production trivial (1 farm feeds 100 NPCs)
- **Mitigation**: Can add food consumption elsewhere (soldiers, buildings)
- **Risk**: Early-game food scarce (player starves)
- **Mitigation**: Multiple farms buildable early; starting with food reserves

**Testing Checklist**:
- [ ] Early game: 3 NPCs, 2 farms—enough food? (yes)
- [ ] Mid-game: 20 NPCs, 8 farms—starvation risk? (no)
- [ ] Late-game: 100 NPCs, 30 farms—food abundant? (yes)

---

### 8. Morale Calculation Formula
**Decided**: Week 2, Balance Phase
**Status**: 🟢 Locked

**Morale Factor Calculation**:
```javascript
morale_factor = (
  (avg_npc_happiness / 100) * 0.4 +
  (housing_utilization) * 0.3 +
  (food_reserves / food_capacity) * 0.2 +
  (recent_expansion_bonus) * 0.1
)
// Result: 0.5 (low) to 1.1 (high)
```

**Production Multiplier**:
```
final_production = base_production × (0.9 + morale_factor × 0.2)
// If morale_factor = 0.5: ×0.9 (10% penalty)
// If morale_factor = 1.0: ×1.0 (neutral)
// If morale_factor = 1.1: ×1.1 (10% bonus)
```

**NPC Happiness Changes Per Tick** (every 5 seconds):
```
+5 happiness: Working at preferred job
+2 happiness: Working at non-preferred job
-1 happiness: Idle (nothing to do)
-3 happiness: Hungry (food < threshold)
-10 happiness: Starving (food = 0)
```

**Recalculation**: Every production tick (5 seconds)

**Rationale**:
- Morale affects all buildings equally (global penalty/bonus)
- Formula combines multiple factors (happiness, housing, food, novelty)
- 20% swing (-10% to +10% production) is noticeable but not game-breaking
- Recent expansion bonus (1 hour) encourages player action, breaks stagnation

**Alternatives Considered**:
1. Individual morale per NPC (rejected: too complex for MVP)
2. No morale system (rejected: reduces emergent gameplay)
3. Morale affects only specific buildings (rejected: less elegant)

**Risks & Mitigation**:
- **Risk**: Morale oscillates wildly (feast/famine)
- **Mitigation**: Happiness changes slowly (±5/tick max)
- **Risk**: Player doesn't understand morale affects production
- **Mitigation**: UI shows "Morale: 80% → ×1.06 production"

**Testing Checklist**:
- [ ] Create ideal scenario: High happiness, full housing, food abundant → morale ~1.1x
- [ ] Create worst scenario: Low happiness, overcrowded, starving → morale ~0.5x
- [ ] Verify: Morale changes flow smoothly (no jumps)

---

### 9. Save/Load Versioning
**Decided**: Week 2, Technical Phase
**Status**: 🟢 Locked

**Current Save Version**: 1

**Migration Strategy**:
```javascript
function loadSave(saveData) {
  let version = saveData.saveVersion || 1

  // v1 → v2: Add NPC system
  if (version === 1) {
    console.log("Migrating v1 → v2...")
    saveData.npcSystem = { npcs: [] }
    saveData.saveVersion = 2
  }

  // v2 → v3: Add building effects cache
  if (version === 2) {
    console.log("Migrating v2 → v3...")
    saveData.buildingEffects = { effectCache: [] }
    saveData.saveVersion = 3
  }

  validateSaveStructure(saveData)
  return saveData
}
```

**Save File Structure** (v1):
```json
{
  "saveVersion": 1,
  "timestamp": "2025-11-08T22:47:00Z",
  "gameplay": {
    "currentTier": "TOWN",
    "playtimeSeconds": 28800
  },
  "foundation": { "buildings": [...] },
  "module3": { "resourcePools": {...} },
  "territorySystem": { "currentSize": 2800 },
  "progressionSystem": { "unlockedBuildings": [...] }
}
```

**Rationale**:
- Version field allows future-proofing
- Migration code handles saves across versions
- Validation catches corrupted saves early
- Fallback: Player starts new game if load fails

**Alternatives Considered**:
1. No versioning (rejected: breaks old saves on update)
2. Separate save files per version (rejected: confusing)
3. Auto-wipe saves on update (rejected: loss of progress)

**Risks & Mitigation**:
- **Risk**: Migration code loses data
- **Mitigation**: Test migrations with real saves; log warnings
- **Risk**: Save corruption undetected
- **Mitigation**: Validate all required fields after migration

**Testing Checklist**:
- [ ] Create v1 save file
- [ ] Load in v2 code → migrate successfully
- [ ] Verify NPC system initialized with empty array
- [ ] Save and reload v2 file → consistent

---

### 10. Hard vs Soft Gates (Explicit Decision Matrix)
**Decided**: Week 2, Design Phase
**Status**: 🟢 Locked

**Gate Types**:
```
HARD GATE: Prevents action entirely (error message)
SOFT GATE: Allows action but reduces effectiveness (warning)
```

**Decision Matrix**:

| Feature | Type | Rule | Example |
|---------|------|------|---------|
| Build FARM | Hard | PERMANENT tier required | Can't place in SURVIVAL |
| Build FARM without STORAGE_HUT | Soft | Works but limited storage | Farm produces, capped at 40 units |
| Advance tier | Hard | All 6+ requirements AND | Must have 20 buildings AND 50 NPCs etc. |
| Build BARRACKS without WATCHTOWER | Soft | Works but no defense bonus | Soldiers produce but no defense stat |
| Assign NPC to FARM (2 slots full) | Hard | Can't assign | NPC queues or finds other work |
| Build in territory you don't own | Hard | Can't place | Error: "Outside owned territory" |
| Build CASTLE_WALL as non-CASTLE tier | Hard | Can't place | Error: "Unlock CASTLE tier first" |
| Craft without WORKSHOP | Hard | Can't queue | Error: "Build a workshop to craft" |
| Territory expansion beyond 10 | Hard | Can't expand | Hard size limit reached |

**Implementation**:
```
Hard gates: Check in Foundation or Module 2 validation
  → Prevent placement/action entirely
  → Show blocking error

Soft gates: Check in Building Effects System
  → Allow action, reduce effectiveness
  → Show warning: "Limited storage—build STORAGE_HUT for +960 capacity"
```

**Rationale**:
- Hard gates prevent impossible states (can't craft without workshop)
- Soft gates create strategic choices (can build FARM early, inefficient but possible)
- Clear distinction prevents confusion (player knows what's blocked vs what's weak)

**Alternatives Considered**:
1. Only hard gates (rejected: removes strategy)
2. Only soft gates (rejected: allows broken states)
3. Complex gate conditions (rejected: confusing)

**Testing Checklist**:
- [ ] Hard gate: Try building CASTLE_WALL in PERMANENT tier → blocked
- [ ] Soft gate: Build FARM without STORAGE_HUT → produces but capped
- [ ] UX: Error messages are clear and actionable

---

## Implementation Phases

### Phase 1: Prototyping & Validation (Week 1)
- [ ] NPC pathfinding: 100 NPCs @ 60 FPS?
- [ ] Economy balance: 1 hour production matches targets?
- [ ] Save/load: v1 → v2 migration works?
- [ ] Aura radius: 50 cells OP or balanced?

### Phase 2: Module Development (Weeks 2-5)
- [ ] Foundation with spatial grid
- [ ] Module 2: Building definitions
- [ ] Module 3: Production & costs
- [ ] Module 4: Territory expansion

### Phase 3: Game Systems (Weeks 6-12)
- [ ] NPC System
- [ ] Resource Management
- [ ] Territory Mechanics
- [ ] Progression System
- [ ] Building Effects

### Phase 4: Integration & Polish (Weeks 13-15)
- [ ] End-to-end testing
- [ ] Edge case handling
- [ ] Performance optimization

---

## Future Decisions (Post-MVP)

- [ ] Day/night cycle (affects NPC consumption, visibility)
- [ ] Building decay/damage (affects resource management)
- [ ] Enemy system (affects defense mechanics)
- [ ] Advanced tech tree (affects multiplier stacking)
- [ ] Multiplayer (affects save/sync, territory claiming)
- [ ] Mobile optimization (affects pathfinding algorithm)

