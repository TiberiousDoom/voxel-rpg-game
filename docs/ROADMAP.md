# Development Roadmap

**Last Updated:** November 26, 2025
**Status:** Active
**Purpose:** Comprehensive development plan from current state to launch and beyond

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State](#current-state)
3. [Development Phases](#development-phases)
4. [Detailed Phase Breakdown](#detailed-phase-breakdown)
5. [Fundraising Strategy](#fundraising-strategy)
6. [Risk Assessment](#risk-assessment)
7. [Success Metrics](#success-metrics)

---

## Executive Summary

### The Vision
> *Rise from ruin. Build something worth protecting. You're not alone.*

An RPG survival base-building game where an ordinary farmer, guided by a mystical companion, rebuilds civilization in a world torn by divine conflict—with the help of autonomous NPCs who feel like companions, not tools.

### Development Strategy

**Approach:** Iterative development with playable milestones at each phase. Each phase produces a demonstrable build that can be used for:
- Internal testing and feedback
- Community building and early access
- Fundraising demonstrations
- Marketing materials

### Timeline Overview

| Phase | Name | Focus | Estimated Duration |
|-------|------|-------|-------------------|
| 0 | Foundation | Core systems completion | Current |
| 1 | Playable Prototype | Survival loop | 2-3 months |
| 2 | Colony Alpha | NPC settlement | 2-3 months |
| 3 | Combat & Threats | Monsters, portals | 2-3 months |
| 4 | The Companion | Magic, story hooks | 2-3 months |
| 5 | Content & Polish | Full experience | 3-4 months |
| 6 | Multiplayer | Network play | 2-3 months |
| 7 | Launch Prep | QA, marketing | 2-3 months |

**Total Estimated Development Time:** 15-22 months from current state

---

## Current State

### What Exists

#### Core Systems ✅
- Game engine with tick-based update loop
- State management architecture
- Event system for cross-module communication
- Basic rendering pipeline

#### Voxel World ✅
- Chunk-based voxel storage
- Block type registry
- Chunk loading/unloading
- Block modification events
- Terrain-to-voxel conversion

#### NPC Building System ✅ (Phases 1-27 Complete)
- Mining task management
- Hauling system
- Stockpile management
- Blueprint system
- Construction sites
- NPC worker behavior (autonomous)
- Spatial indexing for performance
- Work area priorities
- Mining patterns
- Tutorial framework

#### Rendering ✅
- Voxel renderer with Z-level support
- Mining designation overlays
- Worker indicators
- Selection highlighting
- Basic particle effects

### What's Missing

#### Critical Path Items
- [ ] World generation (procedural terrain, biomes)
- [ ] Player character controller
- [ ] Inventory system
- [ ] Combat system
- [ ] Monster AI
- [ ] Portal mechanics
- [ ] The Companion (special NPC)
- [ ] Magic system
- [ ] Save/Load system
- [ ] Audio (music, SFX)
- [ ] Full UI implementation
- [ ] Multiplayer networking

---

## Development Phases

### Phase 0: Foundation (Current)
**Status:** In Progress
**Goal:** Complete core systems needed for all future development

```
Duration: Ongoing
Deliverable: Stable foundation for Phase 1
```

#### Tasks
- [x] Voxel world core
- [x] NPC task system
- [x] Building/construction system
- [ ] Save/Load system
- [ ] Player character controller
- [ ] Basic inventory system
- [ ] Configuration/settings framework

#### Exit Criteria
- Player can move through voxel world
- Game state can be saved and loaded
- Foundation supports all Phase 1 features

---

### Phase 1: Playable Prototype
**Goal:** Create the core survival gameplay loop

```
Duration: 2-3 months
Deliverable: Playable survival demo
Fundraising Milestone: "Proof of Concept" demo
```

#### Core Features
| Feature | Description | Priority |
|---------|-------------|----------|
| World Generation | Procedural terrain with biomes | Critical |
| Player Survival | Hunger, health, basic needs | Critical |
| Resource Gathering | Player can mine, chop, collect | Critical |
| Basic Crafting | Essential tools and items | Critical |
| Day/Night Cycle | Time progression, darkness danger | High |
| Simple Threats | Basic monster spawns | High |
| Basic UI | HUD, inventory screen | Critical |

#### Technical Requirements
- Procedural world generation with seeds
- Player state persistence
- Basic AI for hostile creatures
- Crafting recipe system

#### Demo Scenario
> *Player spawns in a generated world. They must gather resources, craft tools, build a shelter, and survive the first night when monsters emerge.*

---

### Phase 2: Colony Alpha
**Goal:** Transform solo survival into settlement building with NPCs

```
Duration: 2-3 months
Deliverable: Colony management demo
Fundraising Milestone: "Settlement Simulation" demo
```

#### Core Features
| Feature | Description | Priority |
|---------|-------------|----------|
| NPC Settlers | NPCs arrive and join settlement | Critical |
| Autonomous Work | NPCs find and perform tasks | Critical |
| Personality System | NPCs have traits and preferences | High |
| Stockpile Management | Resource storage and organization | Critical |
| Building Upgrades | Improve structures over time | High |
| NPC Needs | Food, rest, shelter for NPCs | High |
| Zone Designation | Mark areas for specific purposes | Medium |

#### Technical Requirements
- NPC attraction/migration system
- Personality trait framework
- Need satisfaction AI
- Relationship tracking (basic)

#### Demo Scenario
> *Player establishes a settlement. NPCs arrive over time, each with distinct personalities. The settlement grows as NPCs autonomously mine, build, and manage resources while player focuses on expansion and defense.*

---

### Phase 3: Combat & Threats
**Goal:** Add meaningful conflict and the portal/territory system

```
Duration: 2-3 months
Deliverable: Combat and defense demo
Fundraising Milestone: "Reclaim the World" demo
```

#### Core Features
| Feature | Description | Priority |
|---------|-------------|----------|
| Player Combat | Melee, ranged, dodging | Critical |
| NPC Combat | Guards, defensive behavior | Critical |
| Monster Variety | Multiple enemy types | High |
| Portal System | Spawning, closing mechanics | Critical |
| Territory Control | Claimed vs corrupted areas | Critical |
| Defensive Structures | Walls, gates, traps | High |
| Corruption Spread | Neglected areas degrade | Medium |
| Portal Reopening | Monsters reclaim territory | High |

#### Technical Requirements
- Combat state machine for player and NPCs
- Monster AI with varied behaviors
- Portal entity with spawn management
- Territory tracking and corruption system
- Pathfinding for combat scenarios

#### Demo Scenario
> *Player's settlement is threatened by a nearby portal. They must build defenses, train guards, and eventually assault the portal to close it. If left undefended, closed portals can be reopened by monsters.*

---

### Phase 4: The Companion
**Goal:** Implement the mystical companion and magic system

```
Duration: 2-3 months
Deliverable: Story and magic demo
Fundraising Milestone: "Rise Together" demo
```

#### Core Features
| Feature | Description | Priority |
|---------|-------------|----------|
| Companion NPC | Unique AI, rescue narrative | Critical |
| Companion Recovery | Healing tied to player progress | Critical |
| Magic System | Learning, casting, progression | Critical |
| Teaching Mechanic | Companion teaches spells over time | High |
| Dialogue System | Conversations with companion | High |
| Story Hooks | Lore discovery, mysteries | Medium |
| Companion Abilities | Unique help from companion | High |

#### Technical Requirements
- Special AI for companion (different from settlers)
- Magic ability framework
- Dialogue tree system
- Progress-gated teaching system
- Companion state persistence

#### Demo Scenario
> *Player discovers the wounded companion early in the game. As they build their settlement and grow stronger, the companion heals and teaches them magic. The companion shares fragments of the world's history and hints at deeper mysteries.*

---

### Phase 5: Content & Polish
**Goal:** Full game experience with narrative content

```
Duration: 3-4 months
Deliverable: Feature-complete single-player
Fundraising Milestone: "Early Access Ready" build
```

#### Core Features
| Feature | Description | Priority |
|---------|-------------|----------|
| Full Narrative | Complete optional story | High |
| Quest System | Objectives and rewards | High |
| Audio Implementation | Music, SFX, ambient | Critical |
| Animation Polish | Smooth character movement | High |
| Visual Effects | Particles, weather, lighting | High |
| Balancing Pass | Difficulty, progression curves | Critical |
| Tutorial Completion | Full onboarding experience | High |
| Accessibility | Options for different needs | Medium |

#### Technical Requirements
- Quest tracking system
- Audio engine integration
- Animation state machines
- Weather and environmental effects
- Difficulty scaling system

#### Demo Scenario
> *Complete single-player experience. Player can engage with optional story content, pursue quests, or focus entirely on building. The game feels polished with full audio and visual feedback.*

---

### Phase 6: Multiplayer
**Goal:** Cooperative settlement building

```
Duration: 2-3 months
Deliverable: Multiplayer beta
```

#### Core Features
| Feature | Description | Priority |
|---------|-------------|----------|
| Network Architecture | Client-server or P2P | Critical |
| State Synchronization | World state across players | Critical |
| Shared Settlement | Multiple players, one base | Critical |
| Permission System | Who can build/destroy | High |
| Drop-in/Drop-out | Seamless joining/leaving | High |
| Chat System | Player communication | Medium |

#### Technical Requirements
- Network protocol design
- Lag compensation
- Conflict resolution for simultaneous actions
- Authentication system
- Server hosting options

---

### Phase 7: Launch Preparation
**Goal:** Ship-ready game

```
Duration: 2-3 months
Deliverable: Version 1.0
```

#### Tasks
| Task | Description | Priority |
|------|-------------|----------|
| QA & Bug Fixing | Comprehensive testing | Critical |
| Performance Optimization | Stable frame rates | Critical |
| Platform Builds | Windows, Mac, Linux | Critical |
| Store Presence | Steam, itch.io pages | Critical |
| Marketing Materials | Trailers, screenshots | High |
| Press Kit | Assets for media | High |
| Launch Trailer | Polished video | High |
| Community Setup | Discord, forums | Medium |
| Documentation | Player guides | Medium |
| Localization | Multiple languages | Medium |

---

## Detailed Phase Breakdown

### Phase 1: Playable Prototype (Detailed)

#### Month 1: World & Player
**Week 1-2: World Generation**
- Implement noise-based terrain generation
- Create biome system (forest, plains, mountains, etc.)
- Add resource distribution (ore veins, trees, etc.)
- Implement world seed system

**Week 3-4: Player Controller**
- First-person or third-person camera
- WASD movement, jumping
- Block interaction (place, remove)
- Basic collision detection

#### Month 2: Survival & Crafting
**Week 1-2: Survival Mechanics**
- Health system (damage, healing)
- Hunger system (food consumption)
- Stamina (optional)
- Death and respawn

**Week 3-4: Crafting System**
- Recipe data structure
- Crafting UI
- Tool creation (pickaxe, axe, sword)
- Workbench mechanic

#### Month 3: Threats & Polish
**Week 1-2: Basic Threats**
- Simple monster AI (approach, attack)
- Monster spawning (night, portals)
- Combat basics (hit detection, damage)

**Week 3-4: Integration & Polish**
- Day/night cycle
- Basic UI (HUD, menus)
- Bug fixing
- Demo preparation

---

## Fundraising Strategy

### Overview

Developing a game of this scope requires resources. Multiple fundraising approaches should be explored in parallel.

### Funding Options

#### 1. Kickstarter Campaign
**Best Timing:** After Phase 1 or Phase 2

**Pros:**
- Validates market interest
- Builds community early
- No equity given up
- Marketing through platform

**Cons:**
- Requires polished demo
- Marketing effort required
- All-or-nothing (standard campaigns)
- Platform fees (~10%)

**Requirements for Success:**
- Playable demo (Phase 1 minimum, Phase 2 preferred)
- Compelling video trailer
- Clear reward tiers
- Active social media presence
- Press coverage strategy
- Realistic funding goal

**Suggested Tiers:**
| Tier | Price | Reward |
|------|-------|--------|
| Supporter | $10 | Digital copy at launch |
| Founder | $25 | Copy + name in credits |
| Builder | $50 | Copy + exclusive cosmetic |
| Patron | $100 | Copy + design input (NPC name, etc.) |
| Champion | $250 | Copy + early alpha access |
| Legend | $500+ | All above + unique in-game memorial |

**Funding Goal Considerations:**
- Calculate minimum needed to complete development
- Factor in platform fees, taxes, reward fulfillment
- Consider stretch goals for additional features

#### 2. Early Access (Steam, itch.io)
**Best Timing:** After Phase 3 or Phase 4

**Pros:**
- Ongoing revenue during development
- Player feedback shapes development
- Builds community
- Lower pressure than Kickstarter

**Cons:**
- Must be "fun" even if incomplete
- Negative reviews can hurt launch
- Expectation management is critical
- Requires regular updates

**Early Access Checklist:**
- [ ] Core gameplay loop is fun
- [ ] 5-10+ hours of content minimum
- [ ] Save system works reliably
- [ ] No game-breaking bugs
- [ ] Clear roadmap communicated
- [ ] Regular update schedule planned

#### 3. Publisher Partnership
**Best Timing:** After Phase 1 with strong demo

**Pros:**
- Funding secured
- Marketing support
- Business expertise
- Platform relationships

**Cons:**
- Revenue share (often 30-50%)
- May lose creative control
- Contractual obligations
- May require exclusivity

**Publisher Pitch Requirements:**
- Polished demo
- Clear vision document (VISION.md)
- Development roadmap
- Team information
- Budget breakdown
- Market analysis

#### 4. Grants & Competitions
**Timing:** Ongoing

**Options to Explore:**
- Epic MegaGrants
- Indie Fund
- Regional arts/media grants
- Game development competitions
- Platform-specific funds (Steam, Xbox, PlayStation)

**Pros:**
- No equity or revenue share
- Validation/prestige
- Networking opportunities

**Cons:**
- Competitive
- Time-consuming applications
- Often small amounts

#### 5. Patreon / Ongoing Support
**Best Timing:** After building community (Phase 1+)

**Pros:**
- Steady monthly income
- Direct community connection
- Flexibility in rewards

**Cons:**
- Requires consistent content/updates
- Community management overhead
- Usually modest amounts initially

### Fundraising Timeline

```
Phase 0-1: Preparation
├── Build playable demo
├── Create marketing materials
├── Establish social media presence
├── Research Kickstarter best practices
└── Identify potential publishers/grants

Phase 1 Complete: Decision Point
├── Option A: Launch Kickstarter
├── Option B: Continue to Phase 2, then Kickstarter
└── Option C: Pursue publisher meetings

Phase 2-3: Active Fundraising
├── Execute chosen strategy
├── Apply for grants
├── Build community (Discord, social media)
└── Consider Patreon for ongoing support

Phase 3-4: Early Access Consideration
├── Evaluate if game is ready
├── Plan Early Access launch
└── Prepare for community feedback

Phase 5+: Sustainable Development
├── Early Access revenue
├── Growing community
└── Prepare for 1.0 launch
```

### Marketing Alongside Fundraising

**Content to Create:**
- Development blog/devlog
- Regular social media updates
- Behind-the-scenes videos
- GIFs of gameplay moments
- Comparison posts (before/after)

**Platforms:**
- Twitter/X (game dev community)
- Reddit (r/indiegaming, r/gamedev)
- TikTok (short gameplay clips)
- YouTube (devlogs, trailers)
- Discord (community building)

**Key Moments to Promote:**
- Major feature completions
- Demo releases
- Kickstarter launch/updates
- Early Access announcements
- Major updates

---

## Risk Assessment

### Technical Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Performance issues with large worlds | High | Medium | Chunk optimization, LOD, profiling |
| Multiplayer complexity | High | High | Design for single-player first, add MP later |
| Save system corruption | High | Low | Robust serialization, backup saves |
| AI pathfinding at scale | Medium | Medium | Spatial indexing, hierarchical pathfinding |

### Development Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Scope creep | High | High | Strict phase gates, MVP focus |
| Burnout | High | Medium | Realistic timelines, regular breaks |
| Feature doesn't fun | Medium | Medium | Prototype early, test often |
| Technical debt | Medium | High | Regular refactoring, code reviews |

### Business Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Kickstarter fails | High | Medium | Build audience first, compelling demo |
| Poor Early Access reception | High | Medium | Wait until game is genuinely fun |
| Market saturation | Medium | Medium | Unique vision, strong identity |
| Running out of funds | Critical | Medium | Conservative estimates, multiple funding sources |

---

## Success Metrics

### Development Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Build stability | <1 crash per hour | Automated testing, user reports |
| Performance | 60 FPS on mid-range hardware | Profiling, benchmarks |
| Test coverage | >70% for core systems | Automated test suite |
| Bug resolution | <1 week for critical | Issue tracking |

### Community Metrics

| Metric | Target (Pre-Launch) | Measurement |
|--------|---------------------|-------------|
| Discord members | 1,000+ | Discord stats |
| Newsletter subscribers | 500+ | Email service |
| Social media followers | 2,000+ | Platform analytics |
| Wishlist (Steam) | 10,000+ | Steamworks |

### Fundraising Metrics

| Metric | Target | Notes |
|--------|--------|-------|
| Kickstarter funding | 100%+ of goal | Set realistic goal |
| Backer count | 500+ | Community size indicator |
| Average pledge | $30+ | Tier attractiveness |
| Early Access sales (Month 1) | Break even on dev costs | Sustainability |

### Launch Metrics

| Metric | Target | Notes |
|--------|--------|-------|
| Steam review score | 80%+ positive | Quality indicator |
| Day 1 sales | TBD based on wishlists | ~10-20% of wishlists |
| Refund rate | <10% | Player satisfaction |
| Critical reception | 70+ Metacritic | If reviews happen |

---

## Next Steps

### Immediate Actions (This Month)

1. **Complete Phase 0**
   - Implement save/load system
   - Create player character controller
   - Build basic inventory system

2. **Begin Fundraising Preparation**
   - Research successful game Kickstarters
   - Start social media presence
   - Document development with screenshots/videos

3. **Plan Phase 1**
   - Create detailed task breakdown
   - Identify technical unknowns
   - Set up milestone tracking

### Decision Points

| Milestone | Decision |
|-----------|----------|
| Phase 1 Complete | Launch Kickstarter or continue to Phase 2? |
| Phase 2 Complete | Pursue publisher or self-publish? |
| Phase 3 Complete | Ready for Early Access? |
| Phase 5 Complete | Launch 1.0 or extend development? |

---

## References

- [Game Vision](VISION.md) - Creative direction and design principles
- [NPC Building System](NPC_BUILDING_SYSTEM.md) - Technical documentation for completed systems
- [Contributing Guide](../CONTRIBUTING.md) - How to contribute to the project

---

**Document Created:** November 26, 2025
**Version:** 1.0
