/**
 * AI Module - Advanced AI & Behavior Systems
 *
 * Phase 4 Implementation:
 * - BehaviorTree: Generic behavior tree architecture
 * - PathfindingSystem: A* pathfinding with terrain awareness
 * - PerceptionSystem: Vision, hearing, and memory
 * - NPCBehaviorSystem: Enhanced NPC behaviors
 * - EnemyAISystem: Advanced combat AI
 * - EconomicAISystem: Dynamic economy simulation
 * - WildlifeAISystem: Animal behaviors
 * - CompanionAISystem: Player companion AI
 * - QuestAISystem: Dynamic quest generation
 */

// Core AI Infrastructure
export {
  BehaviorTree,
  BehaviorTreeBuilder,
  BTNode,
  Selector,
  Sequence,
  Parallel,
  Decorator,
  Inverter,
  Succeeder,
  Repeater,
  Condition,
  Cooldown,
  Leaf,
  Action,
  ConditionCheck,
  Wait,
  Blackboard,
  NodeStatus
} from './BehaviorTree.js';

export {
  PathfindingSystem,
  TERRAIN_COSTS,
  distance,
  distanceSquared,
  normalize
} from './PathfindingSystem.js';

export {
  PerceptionSystem,
  PerceptionEventType,
  SoundType,
  WeatherPerceptionModifiers,
  MemoryEntry
} from './PerceptionSystem.js';

// AI Systems
export {
  NPCBehaviorSystem,
  NPCMemory,
  PersonalityTraits,
  ActivityType,
  RelationshipStatus,
  MemoryEventType
} from './NPCBehaviorSystem.js';

export {
  EnemyAISystem,
  EnemyState,
  CombatBehavior,
  FormationType,
  FactionRelation,
  ThreatEntry,
  EnemyGroup
} from './EnemyAISystem.js';

export {
  EconomicAISystem,
  MarketData,
  Merchant,
  ItemCategory,
  SeasonPriceModifiers,
  WeatherPriceModifiers
} from './EconomicAISystem.js';

export {
  WildlifeAISystem,
  Herd,
  AnimalBehavior,
  ActivityPattern,
  AnimalState
} from './WildlifeAISystem.js';

export {
  CompanionAISystem,
  CompanionType,
  CompanionCommand,
  CompanionState
} from './CompanionAISystem.js';

export {
  QuestAISystem,
  Quest,
  QuestObjective,
  QuestReward,
  QuestType,
  QuestDifficulty,
  QuestState,
  ObjectiveType
} from './QuestAISystem.js';

// AI System Manager - Central coordinator
export { AISystemManager } from './AISystemManager.js';
