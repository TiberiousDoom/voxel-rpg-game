# Phase 3: Combat & Portals — Detailed Implementation Plan

**Created:** November 11, 2026
**Estimated Duration:** 10-14 weeks
**Status:** Draft — needs review (see [Decisions Needed](#decisions-needed))
**Prerequisite:** Phase 2 core settlement loop (campfire → immigration → zones → mine → haul → build) — ✅ working. Phase 2 items Phase 3 depends on are listed in [3.0](#30-foundations-week-1-2).

---

## Lessons from Phases 1 & 2

1. **"Built but not connected" is the most common failure mode.** The companion story, quest UI, skill-tree UI, town upgrades and game modes were all merged but never mounted (see `docs/ROADMAP_AUDIT.md`). Every task below ends with an *in-game* acceptance check ("visible in a normal play session without dev tools"), not just passing unit tests.
2. **Constants without behavior read as done.** `tuning.js` has shelter regen, shelter monster exclusion and tool durability numbers that nothing uses. Add a tuning constant in the same commit as the code that reads it.
3. **The module orchestrator is gone.** The 3D game never used `GameManager`/`ModuleOrchestrator` (removed). Phase 3 follows the live pattern: pure-logic classes in `src/systems/<area>/` (unit-testable, no React), driven by invisible tick components inside the R3F canvas (`RiftController.jsx`, `SettlementTick.jsx` style), writing to `useGameStore`.
4. **Rift enemies are plain data; their health lives in `Enemy.jsx`.** Damage goes through `store._enemyHandlers` / `systems/combat/enemyHits.js`. Phase 3 extends that registry rather than adding a second combat path. The legacy Monster-class path in the store (`attackMonster`, `handleMonsterDeath`, `aiSystemManager`) should be removed in 3.0 so there is exactly one.
5. **Never subscribe components to per-frame state.** Enemy and NPC positions change every frame — read them with `getState()` in `useFrame` (see CLAUDE.md). Raids will multiply entity counts; this matters more than ever.
6. **Pause is global.** Every new `useFrame` loop early-returns while `gameState === 'paused'`.
7. **Measure with the dev overlay.** Perf tab (frame-time p95, draw calls, entity counts) is the gate for the "60 FPS with a raid in progress" criterion. Add a Combat section to it (3.8) instead of ad-hoc logging.
8. **Keep it fun first.** Playtest checkpoints at weeks 4 and 8 (see [Timeline](#timeline)) — combat feel can't be tuned on paper.

---

## Overview

Phase 3 turns rifts from a survival hazard into the game's central conflict. The player fights monsters that behave differently from each other, closes rifts to reclaim land, and builds defenses because the darkness pushes back: rifts try to reopen and raids come for the settlement. NPCs stop being bystanders — guards defend, everyone else takes cover.

### Goals
1. Combat feels impactful and readable: telegraphed attacks, hit feedback, meaningful block/dodge
2. Each monster type has a distinct behavior, not just different stats
3. Rifts have a full lifecycle: active → closing → closed → (if neglected) resurgent
4. Territory exists: the settlement and reclaimed land are areas the player can see and defend
5. Defensive structures matter: walls, watchtowers, wards and light change what monsters can do
6. NPCs participate: guards fight, civilians shelter, injuries and (optionally) deaths have weight
7. Raids are periodic, telegraphed threats to the settlement that scale with its size

### What Success Looks Like
The player closes the rift nearest their village; the corruption fades and the land is marked as reclaimed. Two in-game days later a horn sounds — "Raid approaching from the north" — and a wave of goblins and a skeleton archer pour out of a rift 150 blocks away. The player's two guards take positions on the palisade, the other settlers run to their houses. The player kites the skeleton archer, blocks a telegraphed goblin lunge, and one guard is knocked down but recovers by the campfire. Meanwhile an unguarded ward stone at the closed rift has gone dark — that rift is flickering back to life. Next morning the player builds a watchtower and assigns a third guard.

### Design Philosophy
From the Vision document:

> *Victory is never permanent. The forces of darkness don't accept defeat.*
> *Monsters have behaviors, not just spawn points.*
> *Combat serves the story, not the other way around.*
> *Death is a setback, not a punishment.*

- **Readable over hard.** Every enemy attack is telegraphed (wind-up pose + color flash). Damage comes from the player's mistakes, not from invisible hits.
- **Defense is a choice, not a tax.** Raids scale with what the player has built; a small, well-defended village and a sprawling one both work.
- **NPC autonomy holds.** The player assigns guard *roles* and builds defenses; NPCs decide where to stand, when to fight and when to flee.
- **No softlocks.** Losing a raid costs resources and repairs, never the settlement.

---

## Existing Systems Audit

Only live code (reachable from `src/index.jsx`) is listed.

| System | Status | Location | Notes |
|--------|--------|----------|-------|
| Player melee (cone hit, crits) | **Functional** | `data/meleeAttack.js`, `systems/combat/enemyHits.js` | Uses weapon damage or player damage |
| Spells: projectile, AOE, beam, buffs, status effects | **Functional** | `data/spells.js`, `components/3d/Projectile.jsx` | 15 spells; AOE/status effects work since PR #557 |
| Dodge roll, block (75% reduction), shield buff | **Functional** | `components/3d/Player.jsx`, `stores/useGameStore.js` `dealDamageToPlayer` | No parry, no stamina cost per blocked hit |
| Enemy entity & AI | **Basic** | `components/3d/Enemy.jsx` | One behavior for all types: chase player within 20u, hit at 2u, 1 s cooldown. No telegraph, no pathfinding, no other targets |
| Monster types | **Basic** | `systems/survival/RiftManager.js` `MONSTER_TYPES` | slime, goblin, skeleton (night), shadow creeper (night); elites +50% |
| Rift spawning, day/night intensity | **Functional** | `RiftManager.update`, `RiftController.jsx` | Deterministic placement from world seed |
| Rift closing (anchor, corruption fade, reinforcements, wounded state) | **Partial** | `RiftManager.beginClosing/tickCorruptionFade/getReinforcementSpawns`, `CorruptionManager.js`, `BlockInteraction.jsx` (E key) | Fade and reinforcement waves work, but **the anchor is effectively never attacked**: reinforcements get a `targetPosition` that `Enemy.jsx` ignores (they chase the player), and `RiftController`'s anchor-hit check uses each enemy's spawn-time `position` instead of its live position (`_enemyPositions`) |
| Rift persistence | **Missing** | — | Rift state isn't saved; rifts are regenerated from the seed on load, so **closed rifts reopen after a reload** |
| Corruption spread | **Functional** | `CorruptionManager.js` | Static radius around each rift; no creep over time |
| Rift reopening / resurgence | **Missing** | — | `RIFT_DORMANT_DURATION` is a short spawn pause, not a reopen mechanic |
| Territory | **Missing** | — | Settlement has a center and attractiveness, no area |
| Defensive structures | **Missing** | — | `data/buildings.js` has no defensive blueprints; wall blocks only count toward housing cap |
| NPC combat / health / death | **Missing** | — | NPC identity has `skills.combat`; enemies never target NPCs; NPCs can't be hurt |
| NPC threat response | **Missing** | — | NPCs keep working with monsters nearby (wildlife has a FLEEING state that can be reused as a pattern) |
| Raids | **Missing** | — | |
| Enemy health bars / threat UI | **Missing** | — | Damage numbers exist (`DamageNumber.jsx`) |
| Combat audio | **Basic** | `utils/AudioManager.js` | A few SFX (hit, enemy death, fireball) |

---

## Task Breakdown

### 3.0 Foundations (Week 1-2)

Infrastructure every other Phase 3 task depends on. No new player-facing content.

#### 3.0.1 Persist rift state
**Goal:** Closing a rift is permanent across save/load (today it isn't).

**Implementation tasks:**
- [ ] Add `RiftManager.serialize()` / `deserialize(data)`: per-rift `state`, `corruptionProgress`, `anchorHealth`, `closedAt`, resurgence fields (3.3), `lastSpawnTime` reset on load
- [ ] Include rifts in `Game3DSaveManager` (schema v7, `migrateSave`: v6 saves keep seed-generated rifts)
- [ ] `RiftController` applies saved state after creating the manager (same seed → same rift IDs)
- [ ] Corrupted/purified blocks are already world edits and persist via modified chunks — verify

**Acceptance criteria:**
- [ ] Close a rift, save, reload: rift stays closed, land stays purified
- [ ] Mid-closing save/load resumes CLOSING with the same progress

**Tests:** `RiftManager.persistence.test.js`, extend `Game3DSaveManager.test.js`

#### 3.0.2 Combat targets & one damage path
**Goal:** Enemies can target things other than the player; all damage flows through one API.

**Implementation tasks:**
- [ ] Create `src/systems/combat/targets.js`: a target registry (`player`, NPCs, anchors, structures) with `{ id, kind, position(), isAlive(), takeDamage(amount, source), faction }`; NPCs and anchors register like enemies do via `_enemyHandlers`
- [ ] Create `src/systems/combat/targeting.js`: `selectTarget(enemy, candidates, profile)` — scored by distance, kind preference (per behavior profile), threat (who hit me last), reachability
- [ ] Remove the legacy Monster-class path from `useGameStore` (`attackMonster`, `handleMonsterDeath`, `aiSystemManager`, `spawnMonster`…) and `systems/LootIntegration.js` usages that only it reaches; route loot through `Enemy.jsx` death (already the live path)
- [ ] `Enemy.jsx` asks the targeting module for a target instead of hard-coding the player; reinforcements honor their `targetPosition` (anchor)
- [ ] Anchor damage: register anchors as targets so hits go through `takeDamage`, replacing `RiftController`'s distance check (which reads spawn-time `enemy.position`, so it almost never fires)

**Acceptance criteria:**
- [ ] Reinforcement waves walk to and attack the anchor (anchor HP visibly drops) unless the player is closer and attacking them
- [ ] No code path damages enemies except `enemyHits.js`

**Tests:** `targeting.test.js` (distance/preference/threat scoring), `Enemy.test.jsx` (targets anchor when given `targetPosition`)

#### 3.0.3 Enemy steering & obstacle handling
**Goal:** Enemies get around obstacles well enough for walls to matter (and for raids not to get stuck on a tree).

**Implementation tasks:**
- [ ] `src/systems/combat/steering.js`: seek + simple obstacle avoidance using `chunkManager.getBlock` probes (left/right whiskers), step-up for 1-block ledges (same logic as player auto-jump), "stuck" detection → re-path around
- [ ] For walls: if blocked for > `ENEMY_BLOCKED_ATTACK_DELAY` and the blocking block is breakable (3.5.3), attack the block instead
- [ ] Budget: steering for ≤ 40 enemies in < 2 ms/frame (measure with dev overlay)

**Decision needed:** full A* on the voxel grid (accurate, costly, needs a worker) vs. steering + "attack the wall" (cheap, good enough for open terrain). This plan assumes steering; A* stays a conditional task like Phase 2's pathfinding worker.

**Tests:** `steering.test.js` with a stub chunk manager (wall ahead → sidestep; 1-block ledge → jump; enclosed → attack wall)

#### 3.0.4 Phase 2 carry-overs Phase 3 needs
- [ ] **Housing from completed buildings** (Phase 2 exit criterion): civilians need a house to shelter in during raids (3.6.3)
- [ ] **NPC day/night schedule**: guards' shifts and civilians' "go home at night" both hang off it

If these slip, 3.6.3 falls back to "shelter near the campfire".

---

### 3.1 Combat Feel (Week 2-3)

#### 3.1.1 Telegraphed enemy attacks
**Implementation tasks:**
- [ ] Enemy attack state machine in `Enemy.jsx` (logic in `systems/combat/enemyAttack.js`): `CHASE → WINDUP (ENEMY_WINDUP_TIME) → STRIKE → RECOVER`
- [ ] Wind-up visual: body squash + color flash + small forward lean (mesh transforms — no drei Text)
- [ ] Damage resolves at STRIKE only if the target is still in range/arc → dodging out works
- [ ] Hit-stop on player hits: 40–60 ms time-scale dip via a `combatFeel` store slice read by the physics/tick loops (respect pause)

#### 3.1.2 Block, parry, stagger
- [ ] Blocking costs `BLOCK_STAMINA_PER_HIT` per blocked hit; at 0 stamina the block breaks and the player is staggered
- [ ] Parry window: block pressed within `PARRY_WINDOW` before STRIKE → enemy staggered for `PARRY_STAGGER_TIME`, takes bonus damage
- [ ] Enemy stagger state (reuses stun handling in `Enemy.jsx`)

#### 3.1.3 Weapons that differ
- [ ] Melee uses equipped weapon stats: `damage`, `attackSpeed`, `reach`, `knockback` (craftingRecipes already have weapons)
- [ ] Two archetypes to start: fast/short (swords, clubs) and slow/wide (axes) — different cone/range/cooldown in `meleeAttack.js`
- [ ] Swing visual (arc mesh) so melee is visible in third person

**Tuning constants (in `tuning.js`):**
```
ENEMY_WINDUP_TIME = 0.45          (s, per-type override in MONSTER_TYPES)
ENEMY_RECOVER_TIME = 0.6
HIT_STOP_MS = 50
BLOCK_STAMINA_PER_HIT = 15
PARRY_WINDOW = 0.2                (s)
PARRY_STAGGER_TIME = 1.2
PARRY_DAMAGE_MULT = 1.5
```

**Acceptance criteria:**
- [ ] A new player can see every enemy attack coming and dodge it
- [ ] Holding block forever is not a strategy (stamina breaks it)
- [ ] Axe and sword feel different within 30 seconds of use

**Tests:** `enemyAttack.test.js` (state transitions, strike misses after dodge), `meleeAttack.test.js` (weapon archetypes), `Player.test.jsx` (block stamina, parry window)

---

### 3.2 Monster Variety & Behavior (Week 3-5)

Each type gets a **behavior profile** (data in `MONSTER_TYPES`, logic in `systems/combat/behaviors/*.js`), so new monsters are data + at most one behavior file.

| Type | Profile | Behavior |
|------|---------|----------|
| Slime | `swarm` | Slow, approaches directly, splits into 2 small slimes on death (cap 1 generation) |
| Goblin | `skirmisher` | Circles at mid range, dashes in to strike, retreats when hit; prefers NPCs and loose loot over the player |
| Skeleton | `archer` (night) | Keeps 10–16u away, fires arrows (enemy projectiles reuse `Projectile.jsx` with an enemy faction), repositions when the player closes in |
| Shadow Creeper | `ambusher` (night) | Near-invisible until within 8u, prefers targets that are alone or not in light (3.5.4), flees from light sources |
| Rift Guardian (new) | `guardian` | One per **major** rift (3.3.1); slow, high HP, telegraphed slam AOE; must be defeated before closing a major rift |

**Implementation tasks:**
- [ ] `behaviors/swarm.js`, `skirmisher.js`, `archer.js`, `ambusher.js`, `guardian.js` — each exports `decide(enemy, ctx) → { move, attack, target }`
- [ ] Enemy projectiles: faction field on projectiles, `Projectile.jsx` damages the player/NPCs/structures when `faction === 'monster'`
- [ ] Elite modifier becomes a visual + behavior tweak (faster wind-up, aura), not only +50% stats
- [ ] Guardian model: larger voxel body; health bar (3.8.2)
- [ ] Spawn tables updated per rift tier and time of day

**Acceptance criteria:**
- [ ] A playtester can name each monster's behavior after one encounter
- [ ] Skeleton archers force the player to close distance or use cover
- [ ] Shadow creepers make an unlit settlement feel unsafe at night
- [ ] 20 mixed monsters + 6 NPCs at 60 FPS (dev overlay p95 < 18 ms on target hardware)

**Tests:** one test file per behavior (`decide` with synthetic contexts), `RiftManager.test.js` (spawn tables by tier/time)

---

### 3.3 Portal Lifecycle (Week 4-6)

#### 3.3.1 Rift tiers
- [ ] `minor` (current behavior) and `major` rifts (rarer, larger corruption radius, guardian, longer closing with 2 anchor phases)
- [ ] Major rifts drop a guaranteed rare reward (void crystal) used by 3.5 ward stones and Phase 4 magic

#### 3.3.2 Resurgence — "victory is never permanent"
- [ ] Closed rifts track `stability` (0–100). Stability decays when no **ward stone** (3.5.2) is powered within `WARD_RADIUS` and no settlement territory covers it
- [ ] At 0 stability the rift enters `RESURGENT`: flickering visual, minor spawns, corruption regrows over `RIFT_RESURGE_DURATION`; the player can re-seal it with a short ritual (cheaper than first close) before it returns to ACTIVE
- [ ] Notifications: "The sealed rift at … is weakening" at 50% and 20% stability

#### 3.3.3 Chain reactions (exists — extend)
- [ ] Closing a rift already boosts nearby rifts' spawn rate; also raise their raid weight (3.7) for a day

**Tuning constants:**
```
RIFT_MAJOR_CHANCE = 0.15
RIFT_MAJOR_CORRUPTION_MULT = 1.75
RIFT_STABILITY_DECAY_PER_DAY = 25     (unwarded, outside territory)
RIFT_RESURGE_DURATION = 120           (s of RESURGENT before ACTIVE)
RIFT_RESEAL_COST = { void_shard: 3 }
```

**Acceptance criteria:**
- [ ] An unattended closed rift reopens within ~4 in-game days; a warded one never does
- [ ] Re-sealing a resurgent rift is noticeably easier than the first close
- [ ] Rift state (including stability) survives save/load (3.0.1)

**Tests:** `RiftManager.lifecycle.test.js` (stability decay, ward/territory protection, resurgence transitions, reseal)

---

### 3.4 Territory & Corruption (Week 5-6)

#### 3.4.1 Territory
- [ ] `systems/territory/TerritoryManager.js`: territory = union of circles around the settlement center, completed buildings (`TERRITORY_RADIUS_PER_BUILDING`) and closed+warded rifts (reclaimed land)
- [ ] Store `territory` (list of circles) and a cheap `isInTerritory(x, z)`
- [ ] Rendering: faint ground border at territory edges (reuse ZoneOverlay approach), toggle in the build/zone modes
- [ ] Effects: monsters don't spawn inside territory except during raids; NPC work zones must be inside territory

#### 3.4.2 Corruption creep
- [ ] Active rifts slowly extend corruption outward (`CORRUPTION_CREEP_PER_DAY` blocks, capped at `CORRUPTION_MAX_RADIUS`) unless blocked by territory
- [ ] Corrupted ground inside territory lowers attractiveness and NPC happiness — gives the player a reason to push rifts back
- [ ] Purification: existing fade on closing; plus a craftable **purifying torch** for small patches (uses void shards)

**Tuning constants:**
```
TERRITORY_BASE_RADIUS = 32
TERRITORY_RADIUS_PER_BUILDING = 6     (capped)
TERRITORY_MAX_RADIUS = 96
CORRUPTION_CREEP_PER_DAY = 2          (blocks)
CORRUPTION_MAX_RADIUS = 48
```

**Acceptance criteria:**
- [ ] The player can see their territory and watch it grow as they build
- [ ] A neglected active rift visibly creeps toward the village over several days
- [ ] Creep and territory updates cost < 1 ms/frame (amortized like the campfire scan)

**Tests:** `TerritoryManager.test.js`, `CorruptionManager.test.js` (creep, blocked by territory)

---

### 3.5 Defensive Structures (Week 6-8)

All new structures are blueprints in `data/buildings.js`, placed with the existing catalog and built by NPCs (Phase 2 construction loop) — no new construction system.

#### 3.5.1 Walls & gates
- [ ] Palisade (wood) and stone wall segments as blueprints (straight + corner), gate blueprint NPCs path through and monsters can't (until broken)
- [ ] Wall blocks get HP via a sparse `blockDamage` map in ChunkManager (only damaged blocks stored; saved with chunks)

#### 3.5.2 Ward stone
- [ ] Blueprint requiring void crystal; powered while within territory or tended by an NPC once per day
- [ ] Keeps closed rifts stable (3.3.2) and suppresses spawns within `WARD_RADIUS`

#### 3.5.3 Monsters vs. structures
- [ ] Blocked enemies attack breakable blocks (wood < stone < reinforced) — `BLOCK_HP_*` constants
- [ ] Broken blocks drop partial materials; damaged blocks show cracks (vertex color darken in mesh builder)
- [ ] NPC builders auto-queue repair tasks for damaged defensive blocks after a raid

#### 3.5.4 Light & watchtowers
- [ ] Brazier/torch blueprints: light radius suppresses shadow creeper spawns and reveals ambushers; feeds the "shelter" check
- [ ] Watchtower: +detection range for guards, early raid warning (+`WATCHTOWER_WARNING_BONUS` seconds), guard post

**Tuning constants:**
```
BLOCK_HP_WOOD = 40      BLOCK_HP_STONE = 120      BLOCK_HP_REINFORCED = 300
ENEMY_BLOCKED_ATTACK_DELAY = 2.0     (s blocked before attacking a wall)
WARD_RADIUS = 48
LIGHT_RADIUS_BRAZIER = 12
WATCHTOWER_DETECTION_BONUS = 16
WATCHTOWER_WARNING_BONUS = 20         (s)
```

**Acceptance criteria:**
- [ ] A walled village with a gate measurably reduces damage taken in a raid (playtest scenario 3)
- [ ] Monsters break through wood faster than stone; NPCs repair afterward without being told
- [ ] Light visibly changes night threat

**Tests:** `blockDamage.test.js` (HP, persistence, drops), `buildings.test.js` (new blueprints valid), `WardStone.test.js`

---

### 3.6 NPC Guards & Combat (Week 7-9)

#### 3.6.1 NPC health, injury and death
- [ ] NPCs get `health`/`maxHealth` (from identity, scaled by `skills.combat`) and register as combat targets (3.0.2)
- [ ] At 0 HP an NPC becomes **downed** (not dead): crawls/is carried to the campfire/house, recovers over `NPC_DOWNED_RECOVERY` with a happiness penalty
- [ ] **Decision needed:** permanent NPC death (vision says "can leave if unhappy", silent on death). Default proposal: no permadeath in Phase 3; downed NPCs that are hit again while downed leave the settlement ("too dangerous here")

#### 3.6.2 Guard role
- [ ] New job `GUARD` (player sets guard count/assigns from the NPC panel — depends on Phase 2 NPC detail panel; fallback: guard slots on watchtowers)
- [ ] Guard behavior: patrol territory edge or man a watchtower by day/night shift, engage enemies inside territory, fall back to the campfire when < 30% HP
- [ ] Guards use equipment from the stockpile (weapon/armor items) — gives crafting a settlement purpose
- [ ] Rift closing: guards near a closing rift count as defenders (`RIFT_NPC_DEFENDER_SPEED_BONUS` already exists — wire it to real guards)

#### 3.6.3 Civilian threat response
- [ ] Non-guards within `NPC_THREAT_RADIUS` of a hostile drop work (release task), flee to their house/campfire (state `SHELTERING`), return when clear for `NPC_ALL_CLEAR_TIME`
- [ ] Thought bubbles for fear/relief; brave personalities shelter later, timid earlier

**Tuning constants:**
```
NPC_BASE_HEALTH = 60
NPC_HEALTH_PER_COMBAT_SKILL = 60
NPC_DOWNED_RECOVERY = 90          (s)
NPC_THREAT_RADIUS = 20
NPC_ALL_CLEAR_TIME = 15
GUARD_ENGAGE_RADIUS = 24
GUARD_RETREAT_HP_FRACTION = 0.3
```

**Acceptance criteria:**
- [ ] Monsters entering the village make civilians run and guards engage — every time, without player input
- [ ] Downed NPCs always recover or leave; no NPC is ever stuck downed
- [ ] Guards make rift closing noticeably faster

**Tests:** `GuardBehavior.test.js`, `NPCThreatResponse.test.js`, `SettlementTick` integration test with a hostile inside territory

---

### 3.7 Raids (Week 8-10)

#### 3.7.1 Raid director
- [ ] `systems/raids/RaidDirector.js`: daily roll at dusk; raid chance and strength from settlement size (NPCs + buildings), days since last raid, nearby active rifts (and chain-reaction weight), difficulty; no raids before `RAID_GRACE_DAYS`
- [ ] Picks a source rift (nearest active/resurgent) and composes waves from its spawn table + guardian for big raids

#### 3.7.2 Warning & waves
- [ ] Warning `RAID_WARNING_TIME` (+ watchtower bonus) before arrival: notification, horn SFX, direction indicator on the HUD
- [ ] 2–4 waves spaced `RAID_WAVE_INTERVAL`; enemies path from the source rift to the settlement (steering 3.0.3), target walls/gates/NPCs/stockpiles by profile
- [ ] Raid ends when all raid enemies are dead or `RAID_MAX_DURATION` passes (survivors retreat)

#### 3.7.3 Outcomes
- [ ] Victory: void shards + attractiveness bonus for a day ("the village held")
- [ ] Losses: damaged blocks, some stockpile items stolen (goblins), happiness hit; never destroys the campfire or deletes buildings outright
- [ ] Raid summary notification (enemies defeated, damage, losses)

**Tuning constants:**
```
RAID_GRACE_DAYS = 3
RAID_BASE_CHANCE = 0.25           (per dusk after grace)
RAID_CHANCE_PER_NPC = 0.03
RAID_WARNING_TIME = 45            (s)
RAID_WAVE_INTERVAL = 30
RAID_MAX_DURATION = 300
RAID_STOCKPILE_STEAL_FRACTION = 0.1
```

**Acceptance criteria:**
- [ ] Raids are announced, arrive from a visible direction, and end with a summary
- [ ] An unprepared 5-NPC village survives its first raid with losses; a prepared one with few
- [ ] Save/load during a raid is safe (raid either resumes or cleanly ends)

**Tests:** `RaidDirector.test.js` (chance/strength formula, grace period, source selection), `RaidOutcome.test.js`

---

### 3.8 UI & Feedback (throughout, Week 9-10 polish)

#### 3.8.1 Threat HUD
- [ ] Threat indicator (calm / monsters near / raid incoming / raid) next to the clock
- [ ] Off-screen enemy direction arrows during raids
- [ ] Rift panel when near a rift (E prompt area): state, stability, anchor HP, reseal cost

#### 3.8.2 Health bars
- [ ] Mesh-based (plane + scaled fill, no drei Text/Billboard) health bars above damaged enemies, guardians always; NPC health shown when injured

#### 3.8.3 Map of the world's state
- [ ] Simple top-down minimap or full-screen map (rifts by state, territory, settlement) — **Decision needed** on scope; minimal version is a rift list in the pause menu

#### 3.8.4 Dev overlay: Combat section
- [ ] World tab: start raid now (with strength), set rift stability, toggle enemy AI debug (current target + behavior state drawn as lines/labels via meshes)
- [ ] Perf tab: enemy steering ms/frame, active behaviors count

#### 3.8.5 Audio
- [ ] Wind-up, block, parry, stagger, guard alert, raid horn SFX (Howler via `AudioManager`)

---

### 3.9 Integration & Balance (Week 10-12+)

- [ ] Run all [playtest scenarios](#playtest-scenarios); tune constants in `tuning.js`
- [ ] Add Phase 3 criteria to the QA tracker (`data/testCriteria.js`) so they can be checked off in-game
- [ ] Performance pass with the dev overlay on mid-range hardware and one phone
- [ ] Update `docs/ROADMAP_AUDIT.md`, CLAUDE.md (new systems & patterns), and tick the exit criteria below

---

## Exit Criteria

Phase 3 is **complete** when ALL of the following are true:

### Functional Requirements
- [ ] **Telegraphed combat:** every enemy attack has a visible wind-up; dodging out of range avoids it
- [ ] **Block & parry:** blocking costs stamina; a timed block staggers the enemy
- [ ] **Weapon variety:** at least two melee weapon archetypes with different reach/speed
- [ ] **Monster behaviors:** slime, goblin, skeleton archer, shadow creeper and rift guardian each behave distinctly
- [ ] **Enemy projectiles:** skeleton archers shoot; projectiles hurt the player, NPCs and blocks
- [ ] **Rift tiers:** minor and major rifts; major rifts have a guardian
- [ ] **Rift persistence:** closed/closing rift state survives save/load
- [ ] **Resurgence:** unwarded closed rifts weaken and reopen; re-sealing is possible
- [ ] **Territory:** visible, grows with buildings and reclaimed rifts, blocks spawns and corruption creep
- [ ] **Corruption creep:** active rifts spread corruption over days
- [ ] **Defenses:** palisade/stone walls, gate, ward stone, brazier, watchtower — all NPC-buildable
- [ ] **Breakable defenses:** monsters damage and break defensive blocks; NPCs repair them
- [ ] **NPC combat:** guards fight, civilians shelter, NPCs can be downed and recover
- [ ] **Raids:** announced, directional, multi-wave, end with a summary; never destroy the settlement
- [ ] **Save/load preserves all Phase 3 state**, including during a raid
- [ ] **One damage path:** legacy Monster-class combat code removed

### Quality Requirements
- [ ] **60 FPS** (dev overlay p95 < 18 ms) during a raid with 25 enemies, 8 NPCs, walls and 2 projectiles/s on target hardware
- [ ] **No stuck enemies:** no raid enemy idles > 10 s without moving or attacking
- [ ] **No NPC softlocks:** downed/sheltering NPCs always return to normal states
- [ ] **All new systems have tests** (>70% coverage for logic modules in `src/systems/combat`, `raids`, `territory`)
- [ ] **Readable on 375 px** width (threat HUD, health bars, rift panel)
- [ ] **Color-blind safe:** wind-up and threat states don't rely on red/green alone (shape/flash too)

### Player Experience
- [ ] **Combat feels fair:** playtesters attribute damage taken to their own mistakes
- [ ] **Monsters are recognizable** by behavior, not just color
- [ ] **Closing a rift feels like an achievement** and reclaimed land feels like *yours*
- [ ] **The world pushes back:** players notice resurgence and corruption creep and choose to respond
- [ ] **Defense is a meaningful choice:** building walls/guards changes raid outcomes noticeably
- [ ] **Raids create tension, not dread:** a first raid is survivable without preparation
- [ ] **NPCs feel brave/afraid,** not robotic, under attack

---

## Playtest Scenarios

1. **First fight:** new save, night 1 — can the player read and dodge goblin and skeleton attacks without explanation?
2. **Close a minor rift** with no NPCs; then with 2 guards — is the difference felt?
3. **First raid, unprepared** (5 NPCs, no walls) — survivable? Do civilians shelter?
4. **Prepared raid** (palisade, gate, watchtower, 2 guards) — measurably better?
5. **Neglect test:** close a rift, walk away 5 days — does it resurge with warnings?
6. **Major rift + guardian** at mid-game gear
7. **Night with no light vs. braziers** — do shadow creepers change behavior?
8. **Save/load stress:** save mid-closing, mid-raid, with damaged walls and downed NPCs
9. **Mobile:** block/parry and dodge on touch controls; raid HUD on a phone

---

## Timeline

| Week | Focus | Deliverables |
|------|-------|--------------|
| 1-2 | Foundations | Rift persistence, combat targets, steering, legacy combat removal, Phase 2 carry-overs |
| 2-3 | Combat feel | Telegraphs, block/parry/stagger, weapon archetypes, hit-stop |
| 3-5 | Monster behaviors | 4 profiles + guardian, enemy projectiles, elites |
| 4 | **Playtest checkpoint** | Scenarios 1-2 — is combat fun? |
| 4-6 | Portal lifecycle | Rift tiers, stability/resurgence, reseal |
| 5-6 | Territory & corruption | Territory, creep, purification |
| 6-8 | Defenses | Walls/gates, block HP & repair, ward stone, light, watchtower |
| 7-9 | NPC combat | Health/downed, guards, civilian sheltering |
| 8 | **Playtest checkpoint** | Scenarios 3-5 — does defending feel meaningful? |
| 8-10 | Raids | Director, warnings/waves, outcomes |
| 9-10 | UI & audio | Threat HUD, health bars, rift panel, dev overlay combat tools |
| 10-12+ | Integration & balance | All scenarios, perf pass, docs, QA tracker criteria |

---

## New Files (proposed)

```
src/systems/combat/targets.js                 — combat target registry (player, NPCs, anchors, structures)
src/systems/combat/targeting.js               — target selection by behavior profile
src/systems/combat/steering.js                — obstacle-aware enemy movement
src/systems/combat/enemyAttack.js             — wind-up / strike / recover state machine
src/systems/combat/behaviors/{swarm,skirmisher,archer,ambusher,guardian}.js
src/systems/territory/TerritoryManager.js
src/systems/raids/RaidDirector.js
src/systems/settlement/GuardBehavior.js
src/systems/settlement/ThreatResponse.js
src/components/3d/RaidController.jsx          — invisible tick component
src/components/3d/HealthBar3D.jsx             — mesh-based health bar
src/components/3d/TerritoryOverlay.jsx
src/components/ui/ThreatIndicator.jsx
src/components/ui/RiftPanel.jsx
+ __tests__ for each logic module
```

## Modified Files

```
src/data/tuning.js                         — all Phase 3 constants (in the same commit as their code)
src/data/buildings.js                      — palisade, stone wall, gate, ward stone, brazier, watchtower
src/data/craftingRecipes.js                — weapon archetype stats, purifying torch
src/systems/survival/RiftManager.js        — tiers, serialize/deserialize, stability, resurgence, spawn tables
src/systems/survival/CorruptionManager.js  — creep, territory blocking
src/systems/chunks/ChunkManager.js         — blockDamage map (persisted with modified chunks)
src/workers/chunkWorker.js                 — crack shading for damaged blocks
src/components/3d/Enemy.jsx                — targeting, behaviors, attack state machine, health bar
src/components/3d/Projectile.jsx           — monster faction projectiles
src/components/3d/Player.jsx               — block stamina, parry, stagger
src/components/3d/RiftController.jsx       — persistence hookup, resurgence ticks
src/components/3d/SettlementTick.jsx       — NPC health, guard job, sheltering (or via SettlementBridge if unified first)
src/components/3d/SettlerNPC.jsx           — downed/sheltering/guard visuals
src/data/meleeAttack.js                    — weapon archetypes
src/stores/useGameStore.js                 — remove legacy Monster path; territory, raid, combatFeel slices
src/persistence/Game3DSaveManager.js       — schema v7: rifts, raid, NPC health, block damage
src/components/dev/DevOverlay.jsx, devActions.js — raid/rift/AI debug tools
src/data/testCriteria.js                   — Phase 3 QA checklist
```

---

## Risk Areas

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Steering isn't good enough; raids get stuck on terrain | High | Medium | "Attack the wall" fallback + stuck timeout teleport-to-last-good-position; conditional A* worker if playtests demand it |
| 25+ enemies + NPCs blow the frame budget | High | Medium | Behavior ticks at 10 Hz with interpolation; sleep enemies far from the player; measure every week with the dev overlay |
| Combat feel needs many iterations | Medium | High | Telegraph/hit-stop constants in tuning.js; week-4 playtest before building more monsters |
| Raids feel punishing and make players quit | High | Medium | Grace days, first-raid tuning, no building deletion, clear summaries |
| Resurgence feels like busywork | Medium | Medium | Ward stones make it a one-time investment per rift; generous warnings |
| Block HP storage grows saves | Low | Low | Sparse map, only damaged blocks, cleared on repair |
| Settlement unification lands mid-phase and conflicts with guard/threat code | Medium | Medium | Decide order first (see Decisions); keep guard/threat logic in `systems/settlement/*` pure modules callable from either tick |
| NPC deaths (if chosen) make players reload-scum | Medium | Medium | Default to downed/leave instead of death |

---

## Multiplayer Compatibility Notes

| System | Multiplayer Implication | Design Choice |
|--------|------------------------|---------------|
| Enemy AI & targeting | Server-authoritative | Pure `decide()` functions over plain data — runnable server-side |
| Raids & rift lifecycle | Server-triggered | Director and RiftManager have no React/three dependencies |
| Block damage | Shared world state | Stored with chunk data, replicated like block edits |
| Hit detection | Server validates | Keep damage resolution in `enemyHits.js`/`targets.js` so one place can become authoritative |
| Territory | Shared | Derived from buildings and rifts — recomputed, not replicated |

---

## Decisions Needed

These change scope; defaults are proposed so work can start, but please confirm or override:

1. **Order vs. Phase 2 leftovers.** Phase 2's daily schedule, housing, farming zone, dashboard and NPC panel aren't done, and the settlement-unification plan isn't wired. Proposed: do 3.0.4 (housing + schedule) and the NPC panel first; leave dashboard/farming for later. Alternative: finish Phase 2 fully before starting Phase 3.
2. **Settlement unification first?** Guards and threat response are NPC logic. Doing the `SettlementBridge` unification before 3.6 avoids writing them twice. Proposed: yes, if it fits in weeks 1-3.
3. **NPC permadeath.** Proposed: no; downed + recover, or leave if hit while downed.
4. **Pathfinding.** Proposed: steering + wall-breaking; A* only if playtests show stuck raids.
5. **Can monsters break blocks?** Proposed: only defensive/player-placed wood/stone blocks, never terrain — keeps the world intact and raids predictable.
6. **Map scope (3.8.3).** Proposed: rift list in the pause menu now; real map in Phase 5.
7. **Companion's role in combat.** Phase 4 owns the companion, but it's the vision's core and currently unplayable. Proposed: keep it out of Phase 3; consider pulling the companion rescue arc forward as its own mini-phase.

---

## Open Questions

1. **Friendly fire** (carried from Phase 2): can player spells hurt NPCs? Proposed: no in Phase 3; AOE spells skip NPCs.
2. **Loot from raids:** should goblins that steal from stockpiles drop the stolen items when killed? (Proposed: yes — gives a reason to chase.)
3. **Difficulty settings:** a "peaceful builder" toggle (no raids, no resurgence) fits the Choose pillar — Phase 3 or Phase 5?
4. **Guard equipment:** do guards consume weapon durability (tool durability isn't implemented yet either)?
5. **Recruitment** (carried from Phase 2): defer to Phase 5 trade caravans.

---

**Ready to start? Resolve the [Decisions Needed](#decisions-needed), then begin with 3.0.1 (rift persistence) — it's small, fixes a real bug, and everything about the portal lifecycle depends on it.**
