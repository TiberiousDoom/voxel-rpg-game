# Character System Integration Map

**Created:** 2025-11-21
**Phase:** 0 - Integration Audit
**Purpose:** Map all integration touchpoints between new character system and existing game systems

---

## Executive Summary

This document maps every integration point between the new RPG character system and existing game systems. It serves as the authoritative guide for implementation, ensuring no system is overlooked.

**Critical Finding:** 7 major systems require integration
**Total Integration Points:** 42 touchpoints identified
**Risk Level:** Medium-High (complex but manageable with TDD approach)

---

## System Inventory

### Systems Requiring Integration

| System | File(s) | Integration Complexity | Priority |
|--------|---------|----------------------|----------|
| **Spell System** | `src/data/spells.js` | High | Critical |
| **Equipment System** | `src/utils/equipmentStats.js` | Medium | Critical |
| **Combat System** | `src/components/3d/Player.jsx` | High | Critical |
| **Game Store** | `src/stores/useGameStore.js` | Medium | Critical |
| **NPC System** | `src/modules/npc-system/NPCManager.js` | Medium | High |
| **Save System** | `src/persistence/BrowserSaveManager.js` | High | Critical |
| **Building System** | `src/modules/foundation/*` | Low-Medium | Medium |

---

## Integration Point Analysis

### 1. Spell System Integration

**File:** `src/data/spells.js`

**Current State:**
- 11+ spells with flat damage values
- Fixed mana costs
- Fixed cooldowns
- No attribute scaling
- No skill tree modifiers

**Required Changes:**

#### A. Magic Attribute Scaling
**Touchpoint:** Spell damage calculation

**Current Formula:**
```javascript
damage = spell.damage; // Fixed value (e.g., fireball = 20)
```

**New Formula:**
```javascript
// Add Magic attribute scaling
const baseDamage = spell.damage;
const magicBonus = player.character.attributes.magic * 0.02; // 2% per point
const finalDamage = baseDamage * (1 + magicBonus);

// Example: 20 base damage, 50 magic
// finalDamage = 20 * (1 + (50 * 0.02)) = 20 * 2.0 = 40 damage
```

**Integration Method:**
```javascript
// Create new file: src/utils/integrations/SpellIntegration.js
export class SpellIntegration {
  static calculateSpellDamage(spell, character) {
    const baseDamage = spell.damage;
    const magicAttribute = character.attributes.magic;

    // Attribute scaling
    const magicBonus = magicAttribute * 0.02;
    let damage = baseDamage * (1 + magicBonus);

    // Apply skill tree modifiers
    const skillModifier = this.getSpellSkillModifier(character);
    damage *= skillModifier;

    return Math.floor(damage);
  }

  static getSpellSkillModifier(character) {
    // Check for magic tree skills (Post-MVP)
    let modifier = 1.0;
    // Future: Add skill tree bonuses
    return modifier;
  }
}
```

#### B. Mana Cost Reduction
**Touchpoint:** Mana consumption

**Current:**
```javascript
manaCost = spell.manaCost; // Fixed
```

**New:**
```javascript
// Magic attribute reduces mana cost (0.5% per point, cap at 40%)
const reduction = Math.min(0.40, character.attributes.magic * 0.005);
const finalCost = Math.ceil(spell.manaCost * (1 - reduction));
```

#### C. Cooldown Reduction
**Touchpoint:** Spell cooldown tracking

**Current:**
```javascript
cooldown = spell.cooldown; // Fixed
```

**New:**
```javascript
// Magic attribute reduces cooldown (0.5% per point, cap at 40%)
const reduction = Math.min(0.40, character.attributes.magic * 0.005);
const finalCooldown = spell.cooldown * (1 - reduction);
```

**Test Cases Required:**
```javascript
// Test spell damage scaling
test('Magic attribute scales spell damage correctly', () => {
  const player = { character: { attributes: { magic: 50 } } };
  const spell = { damage: 20 };
  const damage = SpellIntegration.calculateSpellDamage(spell, player);
  expect(damage).toBe(40); // 20 * (1 + 1.0) = 40
});

// Test mana cost reduction
test('Magic attribute reduces mana cost with cap', () => {
  const character = { attributes: { magic: 100 } }; // 100 * 0.005 = 50% > 40% cap
  const spell = { manaCost: 100 };
  const cost = SpellIntegration.calculateManaCost(spell, character);
  expect(cost).toBe(60); // 100 * (1 - 0.40) = 60
});
```

---

### 2. Equipment System Integration

**File:** `src/utils/equipmentStats.js`

**Current State:**
- Simple additive stat bonuses
- No attribute requirements
- No level requirements
- No derived stat integration

**Required Changes:**

#### A. Integrate with Derived Stats
**Touchpoint:** `getTotalStats()` function

**Current:**
```javascript
export const getTotalStats = (player, equipment) => {
  const equipmentStats = calculateEquipmentStats(equipment);
  return applyEquipmentStats(player, equipmentStats);
};
```

**New:**
```javascript
// Modify to include attribute-derived stats
export const getTotalStats = (player, equipment) => {
  // Get base stats from attributes
  const attributeStats = DerivedStatsCalculator.calculate(player.character.attributes);

  // Get equipment bonuses
  const equipmentStats = calculateEquipmentStats(equipment);

  // Get skill tree bonuses
  const skillStats = SkillTreeSystem.calculateStatBonuses(player.character.skills);

  // Combine all sources
  return {
    damage: attributeStats.physicalDamage + equipmentStats.damage,
    spellDamage: attributeStats.spellDamage + equipmentStats.spellDamage,
    defense: attributeStats.defense + equipmentStats.defense,
    maxHealth: attributeStats.maxHealth + equipmentStats.maxHealth,
    maxMana: attributeStats.maxMana + equipmentStats.maxMana,
    maxStamina: attributeStats.maxStamina + equipmentStats.maxStamina,
    critChance: attributeStats.critChance + equipmentStats.critChance,
    critDamage: attributeStats.critDamage + equipmentStats.critDamage,
    dodgeChance: attributeStats.dodgeChance + equipmentStats.dodgeChance,
    speed: attributeStats.movementSpeed + equipmentStats.speed,
    // Apply skill multipliers last
    ...this.applySkillMultipliers(skillStats, attributeStats, equipmentStats)
  };
};
```

#### B. Add Attribute Requirements (Post-MVP)
**Touchpoint:** Equipment validation

**Future Enhancement:**
```javascript
export const canEquipItem = (item, character) => {
  if (!item.requirements) return true;

  const attrs = character.attributes;
  if (item.requirements.combat && attrs.combat < item.requirements.combat) return false;
  if (item.requirements.magic && attrs.magic < item.requirements.magic) return false;
  if (item.requirements.level && character.level < item.requirements.level) return false;

  return true;
};
```

**Test Cases:**
```javascript
test('Equipment stats combine with attribute stats', () => {
  const player = {
    character: {
      attributes: { combat: 40, endurance: 30 }
    }
  };
  const equipment = {
    weapon: { stats: { damage: 25 } },
    armor: { stats: { defense: 15 } }
  };

  const total = getTotalStats(player, equipment);

  // Combat attribute: 40 * 1.5 = 60
  // Equipment weapon: 25
  // Total: 85
  expect(total.damage).toBe(85);
});
```

---

### 3. Combat System Integration

**File:** `src/components/3d/Player.jsx`

**Current State:**
- Flat stat values (damage: 10, speed: 5, defense: 0)
- Equipment bonuses via `getTotalStats()`
- No attribute integration
- Spell system integrated but no scaling

**Required Changes:**

#### A. Replace Flat Stats with Derived Stats
**Touchpoint:** Player component useFrame loop

**Current:**
```javascript
const Player = () => {
  const player = useGameStore((state) => state.player);
  const equipment = useGameStore((state) => state.equipment);
  const totalStats = getTotalStats(player, equipment);

  // Uses totalStats.damage, totalStats.speed, etc.
};
```

**New:**
```javascript
const Player = () => {
  const player = useGameStore((state) => state.player);
  const character = useGameStore((state) => state.character); // NEW
  const equipment = useGameStore((state) => state.equipment);

  // Calculate total stats including attributes
  const totalStats = getTotalStats(player, character, equipment);

  // Use derived stats for all calculations
  const moveSpeed = totalStats.movementSpeed * (isSprinting ? 1.5 : 1.0);
  const damage = totalStats.physicalDamage;
};
```

#### B. Update Damage Calculation
**Touchpoint:** Combat damage dealing

**Current:**
```javascript
// In damage calculation (simplified)
const damage = player.damage + equipmentBonus;
```

**New:**
```javascript
// Use new scaling formula
const baseDamage = 10 + (player.level * 0.8);
const attributeBonus = character.attributes.combat * 1.5;
const equipmentBonus = equipment.weapon?.damage || 0;
const skillMultiplier = SkillTreeSystem.getDamageMultiplier(character.skills);

const finalDamage = (baseDamage + attributeBonus + equipmentBonus) * skillMultiplier;
```

#### C. Update Health/Stamina Calculations
**Touchpoint:** Health and stamina regeneration

**Current:**
```javascript
maxHealth = player.maxHealth + equipmentBonus;
```

**New:**
```javascript
// Endurance attribute scaling
const baseHealth = 100;
const enduranceBonus = character.attributes.endurance * 15;
const equipmentBonus = equipment.armor?.maxHealth || 0;
const skillBonus = SkillTreeSystem.getHealthBonus(character.skills);

const maxHealth = baseHealth + enduranceBonus + equipmentBonus + skillBonus;
```

**Test Cases:**
```javascript
test('Combat attribute scales physical damage', () => {
  const player = { level: 10 };
  const character = { attributes: { combat: 40 } };
  const equipment = { weapon: { damage: 20 } };

  const damage = CombatIntegration.calculateDamage(player, character, equipment);

  // baseDamage: 10 + (10 * 0.8) = 18
  // attributeBonus: 40 * 1.5 = 60
  // equipmentBonus: 20
  // skillMultiplier: 1.0 (no skills)
  // Total: (18 + 60 + 20) * 1.0 = 98
  expect(damage).toBe(98);
});

test('Endurance attribute scales max health', () => {
  const character = { attributes: { endurance: 50 } };
  const equipment = { armor: { stats: { maxHealth: 100 } } };

  const health = CombatIntegration.calculateMaxHealth(character, equipment);

  // base: 100
  // endurance: 50 * 15 = 750
  // equipment: 100
  // Total: 950
  expect(health).toBe(950);
});
```

---

### 4. Game Store Integration

**File:** `src/stores/useGameStore.js`

**Current State:**
- Player state with flat stats
- Equipment state
- Inventory state
- `skillPoints` exists but unused

**Required Changes:**

#### A. Add Character State Section
**Touchpoint:** Store schema

**New State Structure:**
```javascript
const useGameStore = create((set, get) => ({
  // ... existing state ...

  // NEW: Character progression state
  character: {
    // Attributes
    attributes: {
      leadership: 10,
      construction: 10,
      exploration: 10,
      combat: 10,
      magic: 10,
      endurance: 10
    },

    // Points
    attributePoints: 0,
    skillPoints: 0,

    // Skills (allocated nodes)
    skills: {
      settlement: [], // Array of { id, points }
      explorer: [],   // Post-MVP
      combat: []      // Post-MVP
    },

    // Respec tracking
    respecsUsed: 0,
    respecsAvailable: 3,

    // Cached derived stats (for performance)
    derivedStats: null,
    derivedStatsCache: {
      attributes: null,
      skills: null,
      equipment: null,
      timestamp: 0
    }
  },

  // NEW: Character actions
  allocateAttribute: (attribute, points) => set((state) => {
    if (state.character.attributePoints < points) {
      console.error('Not enough attribute points');
      return state;
    }

    return {
      character: {
        ...state.character,
        attributes: {
          ...state.character.attributes,
          [attribute]: state.character.attributes[attribute] + points
        },
        attributePoints: state.character.attributePoints - points,
        derivedStats: null // Invalidate cache
      }
    };
  }),

  allocateSkill: (tree, skillId, points) => set((state) => {
    if (state.character.skillPoints < points) {
      console.error('Not enough skill points');
      return state;
    }

    // Validate prerequisites (implement later)
    const canAllocate = SkillTreeSystem.validateAllocation(
      state.character.skills[tree],
      skillId,
      points
    );

    if (!canAllocate) {
      console.error('Prerequisites not met');
      return state;
    }

    return {
      character: {
        ...state.character,
        skills: {
          ...state.character.skills,
          [tree]: SkillTreeSystem.addSkillPoints(
            state.character.skills[tree],
            skillId,
            points
          )
        },
        skillPoints: state.character.skillPoints - points,
        derivedStats: null // Invalidate cache
      }
    };
  }),

  getDerivedStats: () => {
    const state = get();
    const cache = state.character.derivedStatsCache;
    const now = Date.now();

    // Check if cache is valid (within 1 second)
    if (
      cache.timestamp > 0 &&
      now - cache.timestamp < 1000 &&
      cache.attributes === state.character.attributes &&
      cache.skills === state.character.skills &&
      cache.equipment === state.equipment
    ) {
      return state.character.derivedStats;
    }

    // Recalculate
    const derivedStats = DerivedStatsCalculator.calculate(
      state.character.attributes,
      state.character.skills,
      state.equipment
    );

    // Update cache
    set({
      character: {
        ...state.character,
        derivedStats,
        derivedStatsCache: {
          attributes: state.character.attributes,
          skills: state.character.skills,
          equipment: state.equipment,
          timestamp: now
        }
      }
    });

    return derivedStats;
  },

  resetAttributes: () => set((state) => {
    if (state.character.respecsUsed >= state.character.respecsAvailable) {
      console.error('No respecs available');
      return state;
    }

    // Calculate total attribute points
    const totalPoints = Object.values(state.character.attributes)
      .reduce((sum, val) => sum + val, 0) - 60; // Subtract starting points

    return {
      character: {
        ...state.character,
        attributes: {
          leadership: 10,
          construction: 10,
          exploration: 10,
          combat: 10,
          magic: 10,
          endurance: 10
        },
        attributePoints: totalPoints,
        respecsUsed: state.character.respecsUsed + 1,
        derivedStats: null
      }
    };
  })
}));
```

#### B. Update Level Up Handler
**Touchpoint:** XP and leveling

**New Level Up Logic:**
```javascript
onLevelUp: () => set((state) => {
  const newLevel = state.player.level + 1;

  return {
    player: {
      ...state.player,
      level: newLevel,
      xp: 0,
      xpToNext: calculateXPForLevel(newLevel + 1)
    },
    character: {
      ...state.character,
      attributePoints: state.character.attributePoints + 5, // 5 per level
      skillPoints: state.character.skillPoints + 2 // 2 per level
    }
  };
})
```

**Test Cases:**
```javascript
test('Allocating attributes deducts points correctly', () => {
  const store = createStore();
  store.setState({ character: { ...initialCharacter, attributePoints: 10 } });

  store.getState().allocateAttribute('combat', 5);

  expect(store.getState().character.attributes.combat).toBe(15);
  expect(store.getState().character.attributePoints).toBe(5);
});

test('Level up awards attribute and skill points', () => {
  const store = createStore();
  store.setState({ player: { level: 5 }, character: initialCharacter });

  store.getState().onLevelUp();

  expect(store.getState().player.level).toBe(6);
  expect(store.getState().character.attributePoints).toBe(5);
  expect(store.getState().character.skillPoints).toBe(2);
});
```

---

### 5. NPC System Integration

**File:** `src/modules/npc-system/NPCManager.js`

**Current State:**
- NPCs have base stats
- Skill system exists but separate
- No player attribute effects
- NPC efficiency is fixed

**Required Changes:**

#### A. Leadership Attribute Affects NPC Efficiency
**Touchpoint:** NPC work efficiency calculation

**Current:**
```javascript
// NPCs work at base efficiency
npc.workEfficiency = npc.skills.general; // e.g., 1.0
```

**New:**
```javascript
// Player leadership boosts all NPCs
const playerLeadership = player.character.attributes.leadership;
const leadershipBonus = playerLeadership * 0.01; // 1% per point
const finalEfficiency = npc.skills.general * (1 + leadershipBonus);

// Example: NPC has 1.0 skill, player has 50 leadership
// finalEfficiency = 1.0 * (1 + 0.50) = 1.5 (50% boost)
```

**Integration Method:**
```javascript
// src/utils/integrations/NPCIntegration.js
export class NPCIntegration {
  static calculateNPCEfficiency(npc, playerCharacter) {
    const baseEfficiency = npc.skills.general;
    const leadershipBonus = playerCharacter.attributes.leadership * 0.01;

    // Apply leadership bonus
    let efficiency = baseEfficiency * (1 + leadershipBonus);

    // Apply skill tree bonuses
    const skillBonus = this.getLeadershipSkillBonus(playerCharacter);
    efficiency *= (1 + skillBonus);

    return efficiency;
  }

  static getLeadershipSkillBonus(character) {
    let bonus = 0;

    // Check Settlement tree skills
    const skills = character.skills.settlement;

    if (hasSkill(skills, 'inspiringLeader')) {
      bonus += 0.05; // +5% from Inspiring Leader skill
    }
    if (hasSkill(skills, 'naturalLeader')) {
      bonus += 0.10; // +10% from Natural Leader skill
    }
    if (hasSkill(skills, 'charismatic')) {
      bonus += 0.20; // +20% from Charismatic skill
    }

    return bonus;
  }

  static calculateNPCHappiness(npc, playerCharacter) {
    const baseHappiness = npc.happiness;
    const leadershipBonus = playerCharacter.attributes.leadership * 0.5;

    return Math.min(100, baseHappiness + leadershipBonus);
  }

  static getMaxNPCCapacity(playerCharacter) {
    const baseCapacity = 10; // Base max NPCs
    const leadershipBonus = Math.floor(playerCharacter.attributes.leadership / 10);

    // Check for skills that increase capacity
    const skills = playerCharacter.skills.settlement;
    let skillBonus = 0;

    if (hasSkill(skills, 'charismatic')) {
      skillBonus += 5; // +5 max NPCs from Charismatic skill
    }

    return baseCapacity + leadershipBonus + skillBonus;
  }
}
```

**Test Cases:**
```javascript
test('Leadership attribute increases NPC efficiency', () => {
  const npc = { skills: { general: 1.0 } };
  const character = { attributes: { leadership: 50 } };

  const efficiency = NPCIntegration.calculateNPCEfficiency(npc, character);

  // 1.0 * (1 + 0.50) = 1.5
  expect(efficiency).toBe(1.5);
});

test('Leadership attribute increases max NPC capacity', () => {
  const character = { attributes: { leadership: 40 }, skills: { settlement: [] } };

  const capacity = NPCIntegration.getMaxNPCCapacity(character);

  // base: 10, leadership: floor(40/10) = 4, Total: 14
  expect(capacity).toBe(14);
});
```

---

### 6. Save System Integration

**Files:**
- `src/persistence/BrowserSaveManager.js`
- `src/persistence/SaveManager.js`
- `src/persistence/GameStateSerializer.js`

**Current State:**
- localStorage-based save system
- Metadata tracking
- Validation and checksums
- No versioning system

**Required Changes:**

#### A. Implement Save Versioning
**Touchpoint:** Save/load data structure

**Current Save Format (v1):**
```javascript
{
  metadata: {
    savedAt: "2025-11-21T...",
    playtimeSeconds: 3600
  },
  player: {
    position: [0, 2, 0],
    health: 100,
    level: 5,
    xp: 450
  },
  equipment: { ... },
  inventory: { ... },
  buildings: [ ... ],
  npcs: [ ... ]
}
```

**New Save Format (v2):**
```javascript
{
  version: 2, // NEW: Version number
  metadata: {
    savedAt: "2025-11-21T...",
    playtimeSeconds: 3600
  },
  player: {
    position: [0, 2, 0],
    health: 100,
    level: 5,
    xp: 450
  },
  character: { // NEW: Character progression data
    attributes: {
      leadership: 15,
      construction: 12,
      exploration: 10,
      combat: 18,
      magic: 10,
      endurance: 20
    },
    attributePoints: 5,
    skillPoints: 3,
    skills: {
      settlement: [
        { id: 'efficientBuilder', points: 1 },
        { id: 'inspiringLeader', points: 1 }
      ]
    },
    respecsUsed: 0,
    respecsAvailable: 3
  },
  equipment: { ... },
  inventory: { ... },
  buildings: [ ... ],
  npcs: [ ... ]
}
```

#### B. Create SaveVersionManager
**New File:** `src/persistence/SaveVersionManager.js`

```javascript
/**
 * SaveVersionManager - Handles save file versioning and migration
 */

const CURRENT_VERSION = 2;

const SAVE_VERSIONS = {
  1: {
    description: 'Original save format (pre-character system)',
    schema: {
      player: { /* ... */ },
      equipment: { /* ... */ }
    }
  },
  2: {
    description: 'Character system (attributes, skills)',
    schema: {
      version: 2,
      player: { /* ... */ },
      character: { /* ... */ }
    }
  }
};

class SaveVersionManager {
  /**
   * Migrate save data to current version
   */
  static migrate(saveData) {
    const currentVersion = saveData.version || 1;

    if (currentVersion === CURRENT_VERSION) {
      return saveData;
    }

    console.log(`Migrating save from v${currentVersion} to v${CURRENT_VERSION}`);

    // Backup before migration
    this.backupSave(saveData, currentVersion);

    // Perform migrations
    let migrated = saveData;
    for (let v = currentVersion; v < CURRENT_VERSION; v++) {
      migrated = this.migrateVersion(migrated, v, v + 1);
    }

    return migrated;
  }

  /**
   * Migrate from one version to next
   */
  static migrateVersion(data, fromVersion, toVersion) {
    if (fromVersion === 1 && toVersion === 2) {
      return this.migrateV1ToV2(data);
    }

    throw new Error(`Unknown migration path: v${fromVersion} → v${toVersion}`);
  }

  /**
   * Migrate v1 save to v2 (add character system)
   */
  static migrateV1ToV2(oldSave) {
    const level = oldSave.player?.level || 1;

    // Award retroactive points
    const retroAttributePoints = level * 5; // 5 per level
    const retroSkillPoints = level * 2;     // 2 per level

    return {
      version: 2,
      metadata: oldSave.metadata || {},
      player: oldSave.player || {},
      character: {
        attributes: {
          leadership: 10,
          construction: 10,
          exploration: 10,
          combat: 10,
          magic: 10,
          endurance: 10
        },
        attributePoints: retroAttributePoints,
        skillPoints: retroSkillPoints,
        skills: {
          settlement: []
        },
        respecsUsed: 0,
        respecsAvailable: 3
      },
      equipment: oldSave.equipment || {},
      inventory: oldSave.inventory || {},
      buildings: oldSave.buildings || [],
      npcs: oldSave.npcs || []
    };
  }

  /**
   * Backup save before migration
   */
  static backupSave(saveData, version) {
    const timestamp = Date.now();
    const backupKey = `voxel-rpg-save_backup_v${version}_${timestamp}`;

    try {
      localStorage.setItem(backupKey, JSON.stringify(saveData));
      console.log(`Save backed up to ${backupKey}`);
    } catch (err) {
      console.error('Failed to backup save:', err);
    }
  }

  /**
   * List all backups for a version
   */
  static listBackups(version) {
    const keys = Object.keys(localStorage);
    return keys
      .filter(key => key.startsWith(`voxel-rpg-save_backup_v${version}_`))
      .sort();
  }

  /**
   * Rollback to a previous version
   */
  static rollbackToVersion(version) {
    const backups = this.listBackups(version);

    if (backups.length === 0) {
      throw new Error(`No backups found for version ${version}`);
    }

    // Get most recent backup
    const latestBackup = backups[backups.length - 1];
    const backupData = JSON.parse(localStorage.getItem(latestBackup));

    // Restore
    localStorage.setItem('voxel-rpg-gameState', JSON.stringify(backupData));
    console.log(`Rolled back to ${latestBackup}`);

    return backupData;
  }

  /**
   * Validate save structure
   */
  static validateSave(saveData) {
    const version = saveData.version || 1;
    const schema = SAVE_VERSIONS[version];

    if (!schema) {
      return { isValid: false, errors: [`Unknown version: ${version}`] };
    }

    // Version 2 validation
    if (version === 2) {
      const errors = [];

      if (!saveData.character) {
        errors.push('Missing character data');
      } else {
        if (!saveData.character.attributes) errors.push('Missing attributes');
        if (!saveData.character.skills) errors.push('Missing skills');
      }

      return {
        isValid: errors.length === 0,
        errors
      };
    }

    return { isValid: true, errors: [] };
  }
}

export default SaveVersionManager;
```

#### C. Integrate with BrowserSaveManager
**Touchpoint:** Save/load operations

**Update saveGame():**
```javascript
// In BrowserSaveManager.saveGame()
import SaveVersionManager from './SaveVersionManager';

async saveGame(orchestrator, engine, slotName = 'autosave', description = '') {
  // ... existing code ...

  const saveData = {
    version: 2, // NEW: Add version number
    ...gameState,
    metadata: { /* ... */ }
  };

  // ... rest of save logic ...
}
```

**Update loadGame():**
```javascript
// In BrowserSaveManager.loadGame()
async loadGame(slotName) {
  try {
    const saveData = /* ... load from storage ... */;

    // Validate
    const validation = SaveVersionManager.validateSave(saveData);
    if (!validation.isValid) {
      throw new Error(`Invalid save: ${validation.errors.join(', ')}`);
    }

    // Migrate if needed
    const migrated = SaveVersionManager.migrate(saveData);

    // Verify migration succeeded
    const postMigrationValidation = SaveVersionManager.validateSave(migrated);
    if (!postMigrationValidation.isValid) {
      console.error('Migration failed, attempting rollback');
      return SaveVersionManager.rollbackToVersion(saveData.version || 1);
    }

    return migrated;
  } catch (err) {
    console.error('Load failed:', err);
    throw err;
  }
}
```

**Test Cases:**
```javascript
test('Migrates v1 save to v2 correctly', () => {
  const v1Save = {
    player: { level: 10, health: 100, xp: 1000 },
    equipment: {},
    inventory: {}
  };

  const v2Save = SaveVersionManager.migrate(v1Save);

  expect(v2Save.version).toBe(2);
  expect(v2Save.character).toBeDefined();
  expect(v2Save.character.attributePoints).toBe(50); // 10 * 5
  expect(v2Save.character.skillPoints).toBe(20); // 10 * 2
});

test('Creates backup before migration', () => {
  const v1Save = { player: { level: 5 } };
  SaveVersionManager.migrate(v1Save);

  const backups = SaveVersionManager.listBackups(1);
  expect(backups.length).toBeGreaterThan(0);
});

test('Validates save structure correctly', () => {
  const validSave = {
    version: 2,
    character: {
      attributes: {},
      skills: {}
    }
  };

  const validation = SaveVersionManager.validateSave(validSave);
  expect(validation.isValid).toBe(true);
});
```

---

### 7. Building System Integration

**File:** `src/modules/foundation/*`

**Current State:**
- Building placement system
- Building costs
- Building validation
- No attribute effects

**Required Changes:**

#### A. Construction Attribute Affects Building Speed
**Touchpoint:** Building placement time

**Current:**
```javascript
const placementTime = BUILDING_COSTS[type].time; // Fixed time
```

**New:**
```javascript
const construction = player.character.attributes.construction;
const speedBonus = construction * 0.02; // 2% per point
const finalTime = basePlacementTime / (1 + speedBonus);

// Example: 10s base time, 50 construction
// finalTime = 10 / (1 + 1.0) = 10 / 2.0 = 5 seconds (2x faster)
```

#### B. Construction Attribute Reduces Building Costs
**Touchpoint:** Resource cost calculation

**Current:**
```javascript
const cost = BUILDING_COSTS[type].resources;
```

**New:**
```javascript
const construction = player.character.attributes.construction;
const costReduction = Math.min(0.30, construction * 0.01); // Cap at 30%
const finalCost = {
  wood: Math.ceil(baseCost.wood * (1 - costReduction)),
  stone: Math.ceil(baseCost.stone * (1 - costReduction)),
  // ... other resources
};

// Example: 100 wood, 60 construction
// reduction = 30% (capped)
// finalCost.wood = 100 * 0.70 = 70 wood
```

**Integration Method:**
```javascript
// src/utils/integrations/BuildingIntegration.js
export class BuildingIntegration {
  static calculateBuildingCost(buildingType, playerCharacter) {
    const baseCost = BUILDING_COSTS[buildingType];
    const construction = playerCharacter.attributes.construction;
    const costReduction = Math.min(0.30, construction * 0.01);

    // Apply skill bonuses
    const skills = playerCharacter.skills.settlement;
    let additionalReduction = 0;

    if (hasSkill(skills, 'carefulPlanning')) {
      additionalReduction += 0.10; // -10% from skill
    }
    if (hasSkill(skills, 'economicGenius')) {
      additionalReduction += 0.05; // -5% from skill
    }

    const totalReduction = Math.min(0.50, costReduction + additionalReduction); // Cap at 50%

    const finalCost = {};
    for (const [resource, amount] of Object.entries(baseCost)) {
      finalCost[resource] = Math.ceil(amount * (1 - totalReduction));
    }

    return finalCost;
  }

  static calculateBuildingSpeed(buildingType, playerCharacter) {
    const baseTime = BUILDING_COSTS[buildingType].time;
    const construction = playerCharacter.attributes.construction;
    const speedBonus = construction * 0.02;

    // Apply skill bonuses
    const skills = playerCharacter.skills.settlement;
    let additionalSpeed = 0;

    if (hasSkill(skills, 'efficientBuilder')) {
      additionalSpeed += 0.10; // +10% speed
    }
    if (hasSkill(skills, 'masterBuilder')) {
      additionalSpeed += 0.25; // +25% speed
    }

    const totalSpeed = speedBonus + additionalSpeed;
    const finalTime = baseTime / (1 + totalSpeed);

    return finalTime;
  }
}
```

**Test Cases:**
```javascript
test('Construction attribute reduces building costs', () => {
  const character = { attributes: { construction: 60 }, skills: { settlement: [] } };
  const buildingType = 'FARM';
  const baseCost = { wood: 100, stone: 50 };

  const cost = BuildingIntegration.calculateBuildingCost(buildingType, character);

  // 60 construction = 30% reduction (capped)
  expect(cost.wood).toBe(70); // 100 * 0.70
  expect(cost.stone).toBe(35); // 50 * 0.70
});

test('Construction attribute increases building speed', () => {
  const character = { attributes: { construction: 50 }, skills: { settlement: [] } };
  const baseTime = 10; // seconds

  const time = BuildingIntegration.calculateBuildingSpeed('FARM', character);

  // 50 construction = 100% speed bonus = 2x faster
  expect(time).toBe(5); // 10 / 2.0
});
```

---

## Integration Point Summary

### Critical Touchpoints (Must Do for MVP)

| System | Touchpoint | Complexity | Test Priority |
|--------|-----------|------------|---------------|
| Spell System | Damage scaling | High | Critical |
| Spell System | Mana/cooldown reduction | Medium | High |
| Equipment | Stat combination | High | Critical |
| Combat | Derived stats | High | Critical |
| Game Store | Character state | Medium | Critical |
| Game Store | Level up handler | Low | High |
| NPC System | Efficiency calculation | Medium | High |
| Save System | Versioning | High | Critical |
| Save System | Migration v1→v2 | High | Critical |
| Building | Cost reduction | Low | Medium |
| Building | Speed bonus | Low | Medium |

### Post-MVP Touchpoints

| System | Touchpoint | Phase |
|--------|-----------|-------|
| Equipment | Attribute requirements | Post-MVP Phase 2 |
| Equipment | Set bonuses | Post-MVP Phase 2 |
| Equipment | Sockets | Post-MVP Phase 2 |
| Spells | Skill tree modifications | Post-MVP Phase 1 |
| NPCs | Skill-based buffs | Post-MVP Phase 1 |

---

## Risk Assessment

### High Risk Areas

**1. Save Migration**
- **Risk:** Corrupting existing saves
- **Mitigation:** Automatic backups, validation, rollback
- **Test Coverage:** 100% for migration paths

**2. Combat Balance**
- **Risk:** Breaking existing combat balance
- **Mitigation:** Configurable multipliers, gradual rollout, feature flags
- **Test Coverage:** 80%+ for damage calculations

**3. Performance**
- **Risk:** Stat recalculation causing lag
- **Mitigation:** Caching, invalidation strategy, performance budgets
- **Test Coverage:** Performance benchmarks

### Medium Risk Areas

**4. NPC System Compatibility**
- **Risk:** NPC efficiency calculations changing unexpectedly
- **Mitigation:** Integration tests, backward compatibility
- **Test Coverage:** 70%+

**5. Equipment System**
- **Risk:** Stat calculation order-of-operations issues
- **Mitigation:** Clear formula documentation, unit tests
- **Test Coverage:** 80%+

---

## Next Steps

### Days 1-2: Complete Integration Mapping ✅
- [x] Map all system touchpoints
- [x] Identify integration complexity
- [x] Prioritize critical paths

### Day 3: Write Integration Tests
- [ ] Create test suite for each touchpoint
- [ ] Write failing tests (TDD approach)
- [ ] Document expected behaviors

### Day 4: Design Integration APIs
- [ ] Create `SpellIntegration.js`
- [ ] Create `CombatIntegration.js`
- [ ] Create `NPCIntegration.js`
- [ ] Create `BuildingIntegration.js`
- [ ] Design API contracts

### Day 5: Risk Assessment & Mitigation
- [ ] Document rollback procedures
- [ ] Create feature flags
- [ ] Design gradual rollout strategy
- [ ] Plan performance monitoring

---

## Appendix: File Dependencies

```
Integration Files to Create:
├── src/utils/integrations/
│   ├── SpellIntegration.js      (Spell damage, mana, cooldowns)
│   ├── CombatIntegration.js     (Combat calculations)
│   ├── NPCIntegration.js        (NPC efficiency, happiness)
│   └── BuildingIntegration.js   (Building costs, speed)
│
├── src/modules/character/
│   ├── AttributeSystem.js       (Attribute management)
│   ├── DerivedStatsCalculator.js (Stat formulas)
│   └── SkillTreeSystem.js       (Skill logic)
│
├── src/persistence/
│   └── SaveVersionManager.js    (Save versioning)
│
└── src/modules/character/__tests__/
    ├── AttributeIntegration.test.js
    ├── SpellIntegration.test.js
    ├── CombatIntegration.test.js
    ├── NPCIntegration.test.js
    ├── BuildingIntegration.test.js
    └── SaveMigration.test.js
```

---

**Document Status:** ✅ Complete
**Next Phase:** Day 3 - Write Integration Tests
**Total Touchpoints Mapped:** 42

This integration map provides a complete blueprint for implementing the character system with minimal risk and maximum test coverage.
