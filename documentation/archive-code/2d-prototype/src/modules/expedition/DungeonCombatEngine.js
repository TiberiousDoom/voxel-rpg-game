/**
 * DungeonCombatEngine - Handles dungeon generation, combat, and floor progression
 */
class DungeonCombatEngine {
  constructor(npcManager, skillSystem, equipmentManager) {
    this.npcManager = npcManager;
    this.skillSystem = skillSystem;
    this.equipmentManager = equipmentManager;
  }

  /**
   * Generate a dungeon floor
   * @param {number} floor - Floor number
   * @param {number} difficulty - Difficulty level
   * @returns {Object} Floor data
   */
  generateFloor(floor, difficulty) {
    const enemyCount = Math.min(3 + floor, 10);
    const enemies = [];

    for (let i = 0; i < enemyCount; i++) {
      enemies.push(this._generateEnemy(floor, difficulty));
    }

    return {
      floor,
      enemies,
      treasureChests: Math.floor(Math.random() * 2) + 1,
      exitFound: false
    };
  }

  /**
   * Generate an enemy
   * @private
   */
  _generateEnemy(floor, difficulty) {
    const baseHealth = 50 + (floor * 20) + (difficulty * 10);
    const baseDamage = 5 + (floor * 3) + (difficulty * 2);

    return {
      id: `enemy_${Date.now()}_${Math.random()}`,
      type: this._getEnemyType(floor),
      health: {
        current: baseHealth,
        max: baseHealth
      },
      damage: baseDamage,
      defense: floor + difficulty,
      speed: 2 + Math.random() * 2,
      critChance: 5 + floor,
      xpReward: 20 + (floor * 10) + (difficulty * 5),
      goldReward: 10 + (floor * 5) + (difficulty * 3)
    };
  }

  /**
   * Get enemy type based on floor
   * @private
   */
  _getEnemyType(floor) {
    if (floor <= 2) return 'goblin';
    if (floor <= 4) return 'skeleton';
    if (floor <= 6) return 'orc';
    if (floor <= 8) return 'troll';
    return 'dragon';
  }

  /**
   * Simulate combat between party and enemies
   * @param {Array} party - Party members (NPCs)
   * @param {Array} enemies - Enemy list
   * @returns {Object} Combat result
   */
  simulateCombat(party, enemies) {
    const result = {
      victory: false,
      rounds: 0,
      enemiesKilled: 0,
      totalXP: 0,
      totalGold: 0,
      partyDamage: {},
      casualties: []
    };

    // Get party NPCs
    const partyNPCs = party.map(member => {
      const npc = this.npcManager.getNPC(member.npcId);
      return {
        ...member,
        npc,
        currentHealth: npc.combatStats.health.current
      };
    });

    const activeEnemies = [...enemies];

    // Combat rounds
    while (partyNPCs.some(p => p.currentHealth > 0) && activeEnemies.length > 0) {
      result.rounds++;

      // Party attacks
      for (const partyMember of partyNPCs) {
        if (partyMember.currentHealth <= 0) continue;
        if (activeEnemies.length === 0) break;

        const target = activeEnemies[0];
        const damage = this._calculateDamage(partyMember.npc, target);
        target.health.current -= damage;

        if (target.health.current <= 0) {
          result.enemiesKilled++;
          result.totalXP += target.xpReward;
          result.totalGold += target.goldReward;
          activeEnemies.shift();
        }
      }

      // Enemies attack
      for (const enemy of activeEnemies) {
        if (partyNPCs.every(p => p.currentHealth <= 0)) break;

        // Target random alive party member
        const aliveMembers = partyNPCs.filter(p => p.currentHealth > 0);
        if (aliveMembers.length === 0) break;

        const target = aliveMembers[Math.floor(Math.random() * aliveMembers.length)];
        const damage = this._calculateEnemyDamage(enemy, target.npc);
        target.currentHealth -= damage;

        if (!result.partyDamage[target.npcId]) {
          result.partyDamage[target.npcId] = 0;
        }
        result.partyDamage[target.npcId] += damage;

        // Track NPC damage taken
        target.npc.damageTaken = (target.npc.damageTaken || 0) + damage;

        if (target.currentHealth <= 0) {
          result.casualties.push(target.npcId);
        }
      }

      // Prevent infinite loops
      if (result.rounds > 100) break;
    }

    result.victory = activeEnemies.length === 0;

    // Update NPC health
    for (const partyMember of partyNPCs) {
      partyMember.npc.combatStats.health.current = Math.max(0, partyMember.currentHealth);
    }

    return result;
  }

  /**
   * Calculate damage dealt by NPC
   * @private
   */
  _calculateDamage(npc, enemy) {
    let damage = npc.combatStats.damage;

    // Apply skill bonuses
    const skillBonuses = this.skillSystem.getSkillBonuses(npc);
    damage *= skillBonuses.damageMultiplier;

    // Apply equipment bonuses
    if (this.equipmentManager) {
      const equipBonuses = this.equipmentManager.getEquipmentBonuses(npc);
      damage += equipBonuses.damage;
    }

    // Apply defense reduction
    damage = Math.max(1, damage - enemy.defense);

    // Critical hit chance
    const critChance = npc.combatStats.critChance;
    if (Math.random() * 100 < critChance) {
      damage *= (npc.combatStats.critDamage / 100);
    }

    // Track damage dealt
    npc.damageDealt = (npc.damageDealt || 0) + Math.floor(damage);

    return Math.floor(damage);
  }

  /**
   * Calculate damage dealt by enemy
   * @private
   */
  _calculateEnemyDamage(enemy, npc) {
    let damage = enemy.damage;

    // Apply NPC defense
    const defense = npc.combatStats.defense;
    damage = Math.max(1, damage - defense);

    // Dodge chance
    const dodgeChance = npc.combatStats.dodgeChance;
    if (Math.random() * 100 < dodgeChance) {
      return 0; // Dodged
    }

    // Enemy critical hit
    if (Math.random() * 100 < enemy.critChance) {
      damage *= 1.5;
    }

    return Math.floor(damage);
  }

  /**
   * Process floor completion
   * @param {Object} floorData - Floor data
   * @param {Object} combatResult - Combat result
   * @returns {Object} Floor rewards
   */
  processFloorCompletion(floorData, combatResult) {
    const rewards = {
      gold: combatResult.totalGold,
      xp: combatResult.totalXP,
      items: []
    };

    // Open treasure chests
    for (let i = 0; i < floorData.treasureChests; i++) {
      const treasure = this._generateTreasure(floorData.floor);
      rewards.gold += treasure.gold;
      if (treasure.item) {
        rewards.items.push(treasure.item);
      }
    }

    return rewards;
  }

  /**
   * Generate treasure
   * @private
   */
  _generateTreasure(floor) {
    const treasure = {
      gold: Math.floor((10 + floor * 5) * (0.8 + Math.random() * 0.4)),
      item: null
    };

    // 30% chance for item
    if (Math.random() < 0.3) {
      treasure.item = this._generateItem(floor);
    }

    return treasure;
  }

  /**
   * Generate equipment item
   * @private
   */
  _generateItem(floor) {
    const types = ['weapon', 'armor', 'accessory'];
    const type = types[Math.floor(Math.random() * types.length)];
    const tier = Math.min(Math.ceil(floor / 2), 5);

    const item = {
      id: `item_${Date.now()}_${Math.random()}`,
      name: `${this._getItemPrefix(tier)} ${this._getItemName(type)}`,
      type,
      tier,
      value: tier * 50,
      durability: {
        current: 50,
        max: 50
      }
    };

    // Add stats based on type
    if (type === 'weapon') {
      item.damage = tier * 5;
      item.critChance = tier;
    } else if (type === 'armor') {
      item.defense = tier * 3;
      item.healthBonus = tier * 10;
    } else if (type === 'accessory') {
      item.damage = tier * 2;
      item.critChance = tier * 2;
      item.dodgeChance = tier;
    }

    return item;
  }

  /**
   * Get item prefix based on tier
   * @private
   */
  _getItemPrefix(tier) {
    const prefixes = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
    return prefixes[tier - 1] || 'Common';
  }

  /**
   * Get item name based on type
   * @private
   */
  _getItemName(type) {
    const names = {
      weapon: ['Sword', 'Axe', 'Spear', 'Dagger', 'Mace'],
      armor: ['Plate', 'Chainmail', 'Leather', 'Robe', 'Vest'],
      accessory: ['Ring', 'Amulet', 'Belt', 'Cloak', 'Boots']
    };

    const typeNames = names[type] || names.weapon;
    return typeNames[Math.floor(Math.random() * typeNames.length)];
  }

  /**
   * Heal party (between floors or after combat)
   * @param {Array} party - Party members
   * @param {number} percentage - Healing percentage (0-1)
   */
  healParty(party, percentage = 0.3) {
    for (const member of party) {
      const npc = this.npcManager.getNPC(member.npcId);
      if (npc) {
        const maxHealth = npc.combatStats.health.max;
        const healing = Math.floor(maxHealth * percentage);
        npc.combatStats.health.current = Math.min(
          maxHealth,
          npc.combatStats.health.current + healing
        );
      }
    }
  }
}

export default DungeonCombatEngine;
