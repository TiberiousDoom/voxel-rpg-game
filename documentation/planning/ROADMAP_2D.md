# Development Roadmap (2D)

**Last Updated:** November 2025
**Status:** Active
**Platform:** Unity 2D / Godot (C# or GDScript)
**Purpose:** Comprehensive development plan from start to launch

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Development Phases](#development-phases)
3. [Detailed Phase Breakdown](#detailed-phase-breakdown)
4. [Fundraising Strategy](#fundraising-strategy)
5. [Additional Preparation](#additional-preparation)
6. [Risk Assessment](#risk-assessment)
7. [Success Metrics](#success-metrics)

---

## Executive Summary

### The Vision
> *Rise from ruin. Build something worth protecting. You're not alone.*

A 2D RPG survival base-building game where an ordinary farmer, guided by a mystical companion, rebuilds civilization in a world torn by divine conflict—with the help of autonomous NPCs who feel like companions, not tools.

### Platform Choice Options

#### Web/TypeScript (Current Implementation)

| Factor | Rating | Notes |
|--------|--------|-------|
| Performance | ★★★★☆ | Excellent with modern browsers |
| Development Speed | ★★★★★ | Rapid iteration, hot reload |
| 2D Support | ★★★★☆ | Canvas API, good for tilemaps |
| Platform Support | ★★★★★ | **All platforms via browser + PWA** |
| Mobile Support | ★★★★★ | **Native touch, instant play** |
| Community | ★★★★★ | Massive web ecosystem |
| Cost | ★★★★★ | Free, open source tools |

**Key Advantage:** Instant mobile play via PWA—no app store approval needed.

#### Unity 2D

| Factor | Rating | Notes |
|--------|--------|-------|
| Performance | ★★★★★ | Excellent for 2D |
| Development Speed | ★★★★★ | Huge ecosystem, visual editor |
| 2D Support | ★★★★★ | Tilemap, 2D physics, Sprite |
| Platform Support | ★★★★★ | PC, Mac, Linux, Console, Mobile |
| Mobile Support | ★★★★☆ | Good, requires native builds |
| Community | ★★★★★ | Massive, problems are solved |
| Cost | ★★★☆☆ | Free until $200K revenue |

#### Godot

| Factor | Rating | Notes |
|--------|--------|-------|
| Performance | ★★★★☆ | Good for 2D, improving |
| Development Speed | ★★★★☆ | Excellent scene system |
| 2D Support | ★★★★★ | Native 2D engine, tilemaps |
| Platform Support | ★★★★☆ | PC, Mac, Linux, Mobile, Web |
| Mobile Support | ★★★★☆ | Web export for PWA, native builds |
| Community | ★★★★☆ | Growing rapidly |
| Cost | ★★★★★ | Completely free, MIT license |

**Reference Games:** Terraria, Stardew Valley, Rimworld, Starbound

### Target Platforms

| Platform | Priority | Distribution |
|----------|----------|--------------|
| **Web (PWA)** | Primary | GitHub Pages, itch.io |
| **Mobile Web** | Primary | PWA install from browser |
| **Desktop (Web)** | Primary | Electron wrapper or native browser |
| iOS (Native) | Secondary | App Store (post-launch) |
| Android (Native) | Secondary | Google Play (post-launch) |
| Steam | Secondary | Steam release for visibility |

**Mobile-First Strategy:** Launch as PWA first, then native apps for stores.

### Development Strategy

**Approach:** Iterative development with playable milestones at each phase. Each phase produces a demonstrable build for:
- Internal testing and feedback
- Community building and early access
- Fundraising demonstrations
- Marketing materials

### Timeline Overview

| Phase | Name | Focus | Estimated Duration |
|-------|------|-------|-------------------|
| 0 | Foundation | Core 2D systems | 2-3 months |
| 1 | Playable Prototype | Survival loop | 2-3 months |
| 2 | Colony Alpha | NPC settlement | 2-3 months |
| 3 | Combat & Threats | Monsters, portals | 2-3 months |
| 4 | The Companion | Magic, story hooks | 2-3 months |
| 5 | Content & Polish | Full experience | 3-4 months |
| 6 | Multiplayer | Network play | 2-3 months |
| 7 | Launch Prep | QA, marketing | 2-3 months |

**Total Estimated Development Time:** 17-24 months

---

## Development Phases

### Phase 0: Foundation
**Goal:** Establish core 2D systems with mobile support

```
Duration: 2-3 months
Deliverable: Technical foundation (desktop + mobile)
```

#### Tasks
- [ ] Project setup and folder structure
- [ ] Tilemap world system (tile layers, autotiling)
- [ ] Tile type registry and configuration
- [ ] Basic player controller (movement, camera)
- [ ] Save/Load system architecture
- [ ] Input system setup (keyboard, mouse, gamepad, **touch**)
- [ ] Basic UI framework (**responsive**)
- [ ] **Touch input system (virtual joystick, touch buttons)**
- [ ] **Responsive layout system (phone/tablet/desktop)**
- [ ] **PWA manifest and service worker**

#### Exit Criteria
- Player can move through a 2D tile-based world
- Tiles can be placed and removed
- Game state can be saved and loaded
- **Touch controls work on mobile devices**
- **UI adapts to different screen sizes**
- **Game installable as PWA**

---

### Phase 1: Playable Prototype
**Goal:** Create the core survival gameplay loop (playable on all platforms)

```
Duration: 2-3 months
Deliverable: Playable survival demo (desktop + mobile)
Fundraising Milestone: "Proof of Concept" demo
```

#### Core Features
| Feature | Description | Priority |
|---------|-------------|----------|
| World Generation | Procedural terrain with biomes | Critical |
| Player Survival | Hunger, health, basic needs | Critical |
| Resource Gathering | Mining, chopping, collecting | Critical |
| Basic Crafting | Essential tools and items | Critical |
| Day/Night Cycle | Time progression, darkness danger | High |
| Simple Threats | Basic monster spawns | High |
| Basic UI | HUD, inventory screen (**responsive**) | Critical |
| **Touch Interactions** | **Tap-to-interact, drag-to-build** | Critical |
| **Mobile Performance** | **60 FPS on mid-range phones** | Critical |

#### Demo Scenario
> *Player spawns in a generated world. They must gather resources, craft tools, build a shelter, and survive the first night when monsters emerge. **Works seamlessly on phone, tablet, or desktop.***

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

#### Demo Scenario
> *Player establishes a settlement. NPCs arrive over time, each with distinct personalities. The settlement grows as NPCs autonomously mine, build, and manage resources.*

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
| Portal Reopening | Monsters reclaim territory | High |

#### Demo Scenario
> *Player's settlement is threatened by a nearby portal. They must build defenses, train guards, and assault the portal to close it. Undefended portals can be reopened.*

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

#### Demo Scenario
> *Player discovers the wounded companion. As they build their settlement, the companion heals and teaches them magic, sharing fragments of the world's history.*

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

---

### Phase 7: Launch Preparation
**Goal:** Ship-ready game on all platforms

```
Duration: 2-3 months
Deliverable: Version 1.0 (all platforms)
```

#### Tasks
| Task | Description | Priority |
|------|-------------|----------|
| QA & Bug Fixing | Comprehensive testing (all platforms) | Critical |
| Performance Optimization | Stable frame rates (including mobile) | Critical |
| Platform Builds | Windows, Mac, Linux, **Web/PWA** | Critical |
| **Mobile App Builds** | **iOS, Android native wrappers** | High |
| Store Presence | Steam, itch.io, **App Store, Google Play** | Critical |
| Marketing Materials | Trailers, screenshots (**mobile screenshots**) | High |
| Launch Trailer | Polished video (**show mobile gameplay**) | High |
| **App Store Assets** | **Icons, descriptions, screenshots for stores** | High |

---

## Detailed Phase Breakdown

### Phase 1: Playable Prototype (Detailed)

#### Month 1: World & Player
**Week 1-2: Tilemap World**
- Implement tile-based world system
- Create biome generation with noise
- Add resource distribution (ore deposits, trees)
- Implement world seed system
- Set up tile autotiling for natural terrain

**Week 3-4: Player Controller**
- Top-down or side-view character controller
- WASD/arrow movement
- Tile interaction (place, remove, interact)
- Basic collision detection
- Camera following

#### Month 2: Survival & Crafting
**Week 1-2: Survival Mechanics**
- Health system (damage, healing)
- Hunger system (food consumption)
- Death and respawn

**Week 3-4: Crafting System**
- Recipe data structure
- Crafting UI
- Tool creation (pickaxe, axe, sword)
- Workbench mechanic

#### Month 3: Threats & Polish
**Week 1-2: Basic Threats**
- Simple monster AI (A* pathfinding or steering)
- Monster spawning (night, portals)
- Combat basics (hit detection, damage)

**Week 3-4: Integration & Polish**
- Day/night cycle with lighting
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

#### 2. Early Access (Steam, itch.io)
**Best Timing:** After Phase 3 or Phase 4

**Pros:**
- Ongoing revenue during development
- Player feedback shapes development
- Builds community

**Cons:**
- Must be "fun" even if incomplete
- Negative reviews can hurt launch
- Requires regular updates

**Early Access Checklist:**
- [ ] Core gameplay loop is fun
- [ ] 5-10+ hours of content minimum
- [ ] Save system works reliably
- [ ] No game-breaking bugs
- [ ] Clear roadmap communicated

#### 3. Publisher Partnership
**Best Timing:** After Phase 1 with strong demo

**Pros:**
- Funding secured
- Marketing support
- Business expertise

**Cons:**
- Revenue share (often 30-50%)
- May lose creative control
- Contractual obligations

#### 4. Grants & Competitions
**Options to Explore:**
- Epic MegaGrants
- Indie Fund
- Regional arts/media grants
- Game development competitions

#### 5. Patreon / Ongoing Support
**Best Timing:** After building community (Phase 1+)

**Pros:**
- Steady monthly income
- Direct community connection

**Cons:**
- Requires consistent content/updates
- Usually modest amounts initially

### Fundraising Timeline

```
Phase 0-1: Preparation
├── Build playable demo
├── Create marketing materials
├── Establish social media presence
└── Research Kickstarter best practices

Phase 1 Complete: Decision Point
├── Option A: Launch Kickstarter
├── Option B: Continue to Phase 2, then Kickstarter
└── Option C: Pursue publisher meetings

Phase 2-3: Active Fundraising
├── Execute chosen strategy
├── Apply for grants
└── Build community (Discord, social media)

Phase 3-4: Early Access Consideration
├── Evaluate if game is ready
├── Plan Early Access launch
└── Prepare for community feedback
```

### Marketing Alongside Fundraising

**Content to Create:**
- Development blog/devlog
- Regular social media updates
- Behind-the-scenes videos
- GIFs of gameplay moments

**Platforms:**
- Twitter/X (game dev community)
- Reddit (r/indiegaming, r/gamedev)
- TikTok (short gameplay clips)
- YouTube (devlogs, trailers)
- Discord (community building)

---

## Additional Preparation

Beyond code and fundraising, these areas need attention.

### Business & Legal

| Item | Description | When |
|------|-------------|------|
| **Business entity** | LLC or similar—protects personal assets | Before receiving any money |
| **Business bank account** | Separate finances from personal | Before Kickstarter |
| **Tax planning** | Game income, Kickstarter funds, contractor payments | Consult accountant early |
| **Contracts** | Written agreements with artists, composers, collaborators | Before any work begins |
| **Trademark search** | Ensure game name isn't taken | Before public announcement |
| **Trademark registration** | Protect the game name | After validation, before launch |
| **Terms of Service** | Required for Steam, multiplayer | Before Early Access |
| **Privacy Policy** | Required if collecting any user data | Before Early Access |

### Art & Audio Direction

| Item | Description | When |
|------|-------------|------|
| **Visual style guide** | Color palette, tile styles, UI aesthetics | Before hiring artists |
| **Character concepts** | Companion, player, NPCs, monsters | Phase 1-2 |
| **UI/UX mockups** | Design screens before building them | Before each UI phase |
| **Audio direction doc** | What should the game *sound* like? | Before hiring composer |
| **Asset pipeline** | How does art/audio get into engine? | Before external assets |
| **Asset list** | What assets are needed? Prioritized backlog | Ongoing |

### Market Research

| Research | Purpose | When |
|----------|---------|------|
| **Competitor analysis** | What similar games exist? Strengths/weaknesses? | Now |
| **Pricing research** | What do comparable games cost? | Before Kickstarter |
| **Steam tag analysis** | Which tags perform well? | Before store page |
| **Audience research** | Who plays games like this? | Before marketing push |

### Community Building

| Activity | Description | When |
|----------|-------------|------|
| **Social media presence** | Twitter/X, TikTok, YouTube | Now |
| **Discord server** | Community hub for fans and testers | Before first demo |
| **Email newsletter** | Direct line to interested players | Now (landing page) |
| **Development blog** | Regular updates, builds trust | Ongoing |
| **Influencer list** | YouTubers, streamers who cover similar games | Before demo release |
| **Press list** | Journalists, outlets to contact | Before major announcements |

### Playtesting Strategy

| Phase | Testers | Goals |
|-------|---------|-------|
| **Internal** | Self, close friends | Basic functionality |
| **Alpha (Closed)** | Trusted testers (10-50), NDA | Balance, fun factor |
| **Beta (Closed)** | Expanded group (50-200) | Polish, edge cases |
| **Beta (Open)** | Public | Stress testing |
| **Content creators** | Selected influencers | Pre-launch coverage |

### Personal Preparation

| Item | Description |
|------|-------------|
| **Financial runway** | How many months can you work without income? |
| **Day job strategy** | Keep it? Go part-time? Quit after funding? |
| **Health & burnout** | Sustainable pace, regular breaks, boundaries |
| **Support system** | People who understand the journey |
| **Skill gaps** | What can't you do? Plan to hire or learn. |
| **Backup plan** | What if Kickstarter fails? Have Plan B. |

### Tools & Infrastructure

| Tool | Purpose | When Needed |
|------|---------|-------------|
| **Project management** | Trello, Notion, GitHub Projects | Now |
| **Version control** | Git + GitHub/GitLab | Now |
| **CI/CD pipeline** | Unity Cloud Build or GitHub Actions | Phase 1 |
| **Bug tracking** | GitHub Issues, Jira | Before testing |
| **Analytics** | Unity Analytics or custom | Early Access |
| **Crash reporting** | Cloud Diagnostics | Before release |

---

## Risk Assessment

### Technical Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Performance with large worlds | High | Medium | Region/chunk optimization, culling |
| Multiplayer complexity | High | High | Design single-player first |
| Save system corruption | High | Low | Robust serialization, backups |
| AI pathfinding at scale | Medium | Medium | A* optimization, flow fields |

### Development Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Scope creep | High | High | Strict phase gates, MVP focus |
| Burnout | High | Medium | Realistic timelines, breaks |
| Feature not fun | Medium | Medium | Prototype early, test often |
| Technical debt | Medium | High | Regular refactoring |

### Business Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Kickstarter fails | High | Medium | Build audience first |
| Poor Early Access reception | High | Medium | Wait until genuinely fun |
| Running out of funds | Critical | Medium | Conservative estimates |

---

## Success Metrics

### Development Metrics

| Metric | Target |
|--------|--------|
| Build stability | <1 crash per hour |
| Performance (Desktop) | 60 FPS on mid-range hardware |
| **Performance (Mobile)** | **60 FPS on 2-year-old mid-range phones** |
| **Touch responsiveness** | **<50ms input latency on mobile** |
| Test coverage | >70% for core systems |

### Community Metrics (Pre-Launch)

| Metric | Target |
|--------|--------|
| Discord members | 1,000+ |
| Newsletter subscribers | 500+ |
| Social media followers | 2,000+ |
| Steam wishlists | 10,000+ |
| **PWA installs** | **1,000+** |

### Launch Metrics

| Metric | Target |
|--------|--------|
| Steam review score | 80%+ positive |
| **App Store rating** | **4.0+ stars** |
| **Google Play rating** | **4.0+ stars** |
| Day 1 sales/downloads | 10-20% of wishlists |
| Refund rate | <10% |
| **Mobile retention (D7)** | **>20%** |

### Cross-Platform Metrics

| Metric | Target |
|--------|--------|
| **Mobile % of players** | **>30%** |
| **Cross-platform saves** | **<1% sync failures** |
| **Session length (mobile)** | **Average 15+ minutes** |

---

## 2D-Specific Technical Considerations

### Tilemap Architecture

```
World Structure (2D):
├── Tilemap Layers
│   ├── Background (terrain, grass, water)
│   ├── Ground (floors, paths)
│   ├── Objects (furniture, resources)
│   ├── Walls (structures)
│   └── Foreground (overlays, roofs)
├── Region System
│   └── Load/unload regions as player moves
└── Autotiling
    └── Automatic tile transitions
```

### 2D vs 3D Simplifications

| 3D Concern | 2D Approach |
|------------|-------------|
| Complex mesh rendering | Sprite batching |
| 3D physics | 2D colliders, simpler physics |
| Camera perspective | Orthographic, simpler culling |
| Vertical building | Layered approach or side-view |
| 3D pathfinding | 2D A* or flow fields |

### Performance Benefits of 2D

- Simpler rendering pipeline
- Easier sprite batching
- Faster collision detection
- Smaller asset file sizes
- Lower hardware requirements
- Broader platform support

---

## Next Steps

### Immediate Actions

1. **Set up project**
   - Create project with proper folder structure
   - Configure version control
   - Set up basic scene

2. **Begin Phase 0**
   - Research tilemap systems
   - Prototype tile-based world
   - Implement basic player controller

3. **Start marketing preparation**
   - Create social media accounts
   - Begin documenting development
   - Research successful Kickstarters

### Decision Points

| Milestone | Decision |
|-----------|----------|
| Phase 1 Complete | Launch Kickstarter or continue? |
| Phase 2 Complete | Pursue publisher or self-publish? |
| Phase 3 Complete | Ready for Early Access? |
| Phase 5 Complete | Launch 1.0 or extend? |

---

## References

- [Game Vision (2D)](VISION_2D.md) - Creative direction and design principles
- [NPC System Design (2D)](NPC_SYSTEM_DESIGN_2D.md) - NPC behavior architecture

---

**Document Created:** November 2025
**Version:** 1.0 (2D Adaptation)
