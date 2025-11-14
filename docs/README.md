# Voxel RPG Game - Documentation

**Live Game**: [https://tiberiousdoom.github.io/voxel-rpg-game/](https://tiberiousdoom.github.io/voxel-rpg-game/)

**Repository**: [https://github.com/TiberiousDoom/voxel-rpg-game](https://github.com/TiberiousDoom/voxel-rpg-game)

---

## Overview

A 2D idle RPG game featuring advanced NPC behaviors, dynamic events, an achievement system, and guided tutorials.

## Phase 3 Implementation (Complete - 99/100)

### Phase 3A: NPC Advanced Behaviors (98/100)
- **Idle Task System**: NPCs perform autonomous tasks (WANDER, REST, SOCIALIZE, INSPECT)
- **Needs Tracking**: Tracks 4 need types (FOOD, REST, SOCIAL, SHELTER)
- **Autonomous Decision Making**: Priority-based AI for NPC actions
- **Memory Management**: Automatic cleanup to prevent memory leaks
- **Save/Load Support**: Full serialization for game state persistence

### Phase 3B: Event System (98/100)
- **8 Event Types**: DISASTER, INVASION, BLESSING, FESTIVAL, STORM, DROUGHT, PLAGUE, BOOM
- **Dynamic Effects**: Production, consumption, morale, and happiness modifiers
- **Event Scheduling**: Time-based and condition-based triggers
- **Event Panel UI**: View active events and history

### Phase 3C: Achievement System (100/100) ⭐
- **50 Achievements**: Across 5 categories (Building, Resource, NPC, Tier, Survival)
- **Progress Tracking**: Real-time tracking of 11 condition types
- **Reward System**: Multiplicative bonuses applied to gameplay
- **Achievement UI**: Filterable grid with progress bars and notifications

### Phase 3D: Tutorial System (100/100) ⭐
- **15+ Tutorial Steps**: Guided player onboarding
- **Context Help**: Contextual hints and tips system
- **Feature Unlocks**: Progressive feature revelation
- **Tutorial UI**: Step-by-step interface with progress tracking

## Testing

**310+ Unit Tests** covering:
- IdleTaskManager (50+ tests)
- NPCNeedsTracker (80+ tests)
- AutonomousDecision (60+ tests)
- Achievement (60+ tests)
- AchievementTracker (60+ tests)

## Documentation

- [Phase 3 Final Summary](../PHASE_3_FINAL_SUMMARY.md)
- [Phase 3 Completion Report](../PHASE_3_COMPLETION_REPORT.md)
- [Main README](../README.md)

## Development

```bash
# Install dependencies
npm install

# Run development server
npm start

# Build for production
npm run build

# Run tests
npm test
```

## Features

- **Resource Management**: Gather and manage food, wood, stone, gold, essence, and crystals
- **Building System**: Construct various building types with tier progression
- **NPC System**: Recruit and manage NPCs with advanced behaviors
- **Territory Expansion**: Grow your settlement and control more land
- **Event System**: Face dynamic events that affect your settlement
- **Achievement System**: Complete goals and earn rewards
- **Tutorial System**: Learn the game with guided tutorials

## License

See [LICENSE](../LICENSE) file in the repository root.

---

*Last Updated: 2025-11-14*
*Game Version: 1.1.0*
*Phase 3 Status: Complete (99/100)*
