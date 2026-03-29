/**
 * DungeonCombatEngine - Handles dungeon generation, combat, and floor progression
 * Enhanced with elemental damage, combo system, and boss encounters
 */
import elementalSystem, { ELEMENT_TYPES } from '../combat/ElementalSystem';
import comboSystem from '../combat/ComboSystem';
import { getBossForFloor, getCurrentPhase, createBossEnemy } from '../../data/bosses';

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
    const enemies = [];

    // Check for boss floor (every 5th floor)
    const bossDef = getBossForFloor(floor);
    if (bossDef) {
      enemies.push(createBossEnemy(bossDef, difficulty));
    } else {
      const enemyCount = Math.min(3 + floor, 10);
      for (let i = 0; i < enemyCount; i++) {
        enemies.push(this._generateEnemy(floor, difficulty));
      }
    }

    return {
      floor,
      enemies,
      isBossFloor: !!bossDef,
      treasureChests: bossDef ? 3 : Math.floor(Math.random() * 2) + 1,
      exitFound: false
    };
  }

  /**
   * Generate an enemy with elemental properties
   * @private
   */
  _generateEnemy(floor, difficulty) {
    const type = this._getEnemyType(floor);
    const baseHealth = 50 + (floor * 20) + (difficulty * 10);
    const baseDamage = 5 + (floor * 3) + (difficulty * 2);
    const element = elementalSystem.getEnemyElement(type);

    return {
      id: `enemy_${Date.now()}_${Math.random()}`,
      type,
      element,
      resistances: elementalSystem.generateResistances(element),
      health: {
        current: baseHealth,
        max: baseHealth
      },
      damage: baseDamage,
      defense: floor + difficulty,
      speed: 2 + Math.random() * 2,
      critChance: 5 + floor,
      xpReward: 20 + (floor * 10) + (difficulty * 5),
      goldReward: 10 + (floor * 5) + (difficulty * 3),
      statusEffects: [],
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
   * Enhanced with elemental damage, combos, status effects, and boss phases
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
      casualties: [],
      combosTriggered: [],
      elementalEffects: [],
      bossPhaseChanges: [],
    };

    // Reset combo tracking
    comboSystem.reset();

    // Get party NPCs
    const partyNPCs = party.map(member => {
      const npc = this.npcManager.getNPC(member.npcId);
      return {
        ...member,
        npc,
        currentHealth: npc.combatStats.health.current,
        statusEffects: [],
      };
    });

    const activeEnemies = [...enemies];

    // Combat rounds
    while (partyNPCs.some(p => p.currentHealth > 0) && activeEnemies.length > 0) {
      result.rounds++;

      // Process status effects on enemies at start of round
      for (const enemy of activeEnemies) {
        const dotResult = elementalSystem.processStatusEffects(enemy, enemy.damage);
        if (dotResult.totalDotDamage > 0) {
          enemy.health.current -= dotResult.totalDotDamage;
        }
      }

      // Remove dead enemies from status effects
      for (let i = activeEnemies.length - 1; i >= 0; i--) {
        if (activeEnemies[i].health.current <= 0) {
          result.enemiesKilled++;
          result.totalXP += activeEnemies[i].xpReward;
          result.totalGold += activeEnemies[i].goldReward;
          activeEnemies.splice(i, 1);
        }
      }

      if (activeEnemies.length === 0) break;

      // Party attacks
      for (const partyMember of partyNPCs) {
        if (partyMember.currentHealth <= 0) continue;
        if (activeEnemies.length === 0) break;

        const target = activeEnemies[0];

        // Determine attack element (from weapon or default physical)
        const attackElement = this._getAttackElement(partyMember.npc);

        let damage = this._calculateDamage(partyMember.npc, target, attackElement);

        // Record attack for combo tracking
        comboSystem.recordAttack('party', attackElement);

        // Check for combo
        const combo = comboSystem.checkCombo('party');
        if (combo) {
          const comboResult = comboSystem.applyCombo(damage, combo);
          damage = comboResult.damage;
          result.combosTriggered.push(comboResult.comboName);

          // Apply combo bonus status effect
          if (comboResult.bonusEffect) {
            if (!target.statusEffects) target.statusEffects = [];
            target.statusEffects.push(comboResult.bonusEffect);
          }
        }

        target.health.current -= damage;

        // Check for boss phase change
        if (target.isBoss && target.phases) {
          const hpPercent = target.health.current / target.health.max;
          const phase = getCurrentPhase(target, hpPercent);
          if (target._currentPhase !== phase.name) {
            target._currentPhase = phase.name;
            result.bossPhaseChanges.push({ boss: target.name, phase: phase.name });
          }
        }

        if (target.health.current <= 0) {
          result.enemiesKilled++;
          result.totalXP += target.xpReward;
          result.totalGold += target.goldReward;

          // Boss loot
          if (target.isBoss && target.loot) {
            result.bossLoot = this._rollBossLoot(target.loot);
          }

          activeEnemies.shift();
        }
      }

      // Process status effects on party members
      for (const member of partyNPCs) {
        if (member.currentHealth <= 0) continue;
        const dotResult = elementalSystem.processStatusEffects(member);
        if (dotResult.totalDotDamage > 0) {
          member.currentHealth -= dotResult.totalDotDamage;
          if (member.currentHealth <= 0) {
            result.casualties.push(member.npcId);
          }
        }
      }

      // Enemies attack
      for (const enemy of activeEnemies) {
        if (partyNPCs.every(p => p.currentHealth <= 0)) break;

        // Check if enemy is stunned
        if (elementalSystem.isStunned(enemy)) continue;

        // Boss special ability check
        if (enemy.isBoss) {
          const hpPercent = enemy.health.current / enemy.health.max;
          const phase = getCurrentPhase(enemy, hpPercent);
          const special = phase.specialAbility;

          if (special && this._canUseSpecialAbility(enemy, special)) {
            this._executeSpecialAbility(enemy, special, phase, partyNPCs, activeEnemies, result);
            this._putOnCooldown(enemy, special);
            continue; // Special replaces normal attack
          }
        }

        // Normal enemy attack
        const aliveMembers = partyNPCs.filter(p => p.currentHealth > 0);
        if (aliveMembers.length === 0) break;

        const target = aliveMembers[Math.floor(Math.random() * aliveMembers.length)];
        const enemyElement = enemy.element || ELEMENT_TYPES.PHYSICAL;
        const damage = this._calculateEnemyDamage(enemy, target.npc, enemyElement);
        target.currentHealth -= damage;

        if (!result.partyDamage[target.npcId]) {
          result.partyDamage[target.npcId] = 0;
        }
        result.partyDamage[target.npcId] += damage;
        target.npc.damageTaken = (target.npc.damageTaken || 0) + damage;

        if (target.currentHealth <= 0) {
          result.casualties.push(target.npcId);
        }
      }

      // Tick cooldowns for bosses
      for (const enemy of activeEnemies) {
        if (enemy.specialAbilityCooldowns) {
          for (const key in enemy.specialAbilityCooldowns) {
            if (enemy.specialAbilityCooldowns[key] > 0) {
              enemy.specialAbilityCooldowns[key]--;
            }
          }
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
   * Get attack element from NPC's weapon or default to physical
   * @private
   */
  _getAttackElement(npc) {
    if (this.equipmentManager) {
      const equipment = this.equipmentManager.getEquipmentBonuses(npc);
      if (equipment.element) return equipment.element;
    }
    return ELEMENT_TYPES.PHYSICAL;
  }

  /**
   * Calculate damage dealt by NPC with elemental system
   * @private
   */
  _calculateDamage(npc, enemy, attackElement) {
    let damage = npc.combatStats.damage;

    // Apply skill bonuses
    const skillBonuses = this.skillSystem.getSkillBonuses(npc);
    damage *= skillBonuses.damageMultiplier;

    // Apply equipment bonuses
    if (this.equipmentManager) {
      const equipBonuses = this.equipmentManager.getEquipmentBonuses(npc);
      damage += equipBonuses.damage;
    }

    // Apply defense reduction (modified by status effects)
    const defenseModifier = elementalSystem.getDefenseModifier(enemy);
    const effectiveDefense = enemy.defense * defenseModifier;
    damage = Math.max(1, damage - effectiveDefense);

    // Critical hit chance
    const critChance = npc.combatStats.critChance;
    if (Math.random() * 100 < critChance) {
      damage *= (npc.combatStats.critDamage / 100);
    }

    // Apply elemental damage
    const eleResult = elementalSystem.calculateElementalDamage(
      damage, attackElement, enemy.element || ELEMENT_TYPES.PHYSICAL, enemy.resistances || {}
    );
    damage = eleResult.damage;

    // Apply elemental status effect
    if (eleResult.statusEffect) {
      if (!enemy.statusEffects) enemy.statusEffects = [];
      enemy.statusEffects.push(eleResult.statusEffect);
    }

    npc.damageDealt = (npc.damageDealt || 0) + Math.floor(damage);
    return Math.floor(damage);
  }

  /**
   * Calculate damage dealt by enemy with elemental system
   * @private
   */
  _calculateEnemyDamage(enemy, npc, enemyElement) {
    let damage = enemy.damage;

    // Apply boss phase multiplier
    if (enemy.isBoss && enemy.phases) {
      const hpPercent = enemy.health.current / enemy.health.max;
      const phase = getCurrentPhase(enemy, hpPercent);
      damage *= phase.damageMultiplier;
    }

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

    // Elemental damage from enemy
    if (enemyElement && enemyElement !== ELEMENT_TYPES.PHYSICAL) {
      const eleResult = elementalSystem.calculateElementalDamage(
        damage, enemyElement, ELEMENT_TYPES.PHYSICAL, {}
      );
      damage = eleResult.damage;
    }

    return Math.floor(damage);
  }

  /**
   * Check if a boss can use its special ability
   * @private
   */
  _canUseSpecialAbility(enemy, special) {
    if (!enemy.specialAbilityCooldowns) enemy.specialAbilityCooldowns = {};
    const cd = enemy.specialAbilityCooldowns[special.name] || 0;
    return cd <= 0;
  }

  /**
   * Put a special ability on cooldown
   * @private
   */
  _putOnCooldown(enemy, special) {
    if (!enemy.specialAbilityCooldowns) enemy.specialAbilityCooldowns = {};
    enemy.specialAbilityCooldowns[special.name] = special.cooldown;
  }

  /**
   * Execute a boss special ability
   * @private
   */
  _executeSpecialAbility(enemy, special, phase, partyNPCs, activeEnemies, result) {
    const aliveMembers = partyNPCs.filter(p => p.currentHealth > 0);
    if (aliveMembers.length === 0) return;

    switch (special.type) {
      case 'AOE':
      case 'AOE_ELEMENTAL': {
        const baseDmg = enemy.damage * (special.damageMultiplier || 1.0) * (phase.damageMultiplier || 1.0);
        const targets = special.hitAllTargets ? aliveMembers : [aliveMembers[0]];

        for (const target of targets) {
          let damage = Math.max(1, Math.floor(baseDmg) - target.npc.combatStats.defense);

          if (special.element) {
            const eleResult = elementalSystem.calculateElementalDamage(
              damage, special.element, ELEMENT_TYPES.PHYSICAL, {}
            );
            damage = eleResult.damage;
          }

          target.currentHealth -= damage;
          if (!result.partyDamage[target.npcId]) result.partyDamage[target.npcId] = 0;
          result.partyDamage[target.npcId] += damage;

          if (special.statusEffect && !target.statusEffects) target.statusEffects = [];
          if (special.statusEffect) {
            target.statusEffects.push({
              ...special.statusEffect,
              remainingDuration: special.statusEffect.duration,
            });
          }

          if (target.currentHealth <= 0) {
            result.casualties.push(target.npcId);
          }
        }
        break;
      }

      case 'SUMMON': {
        for (let i = 0; i < (special.summonCount || 1); i++) {
          const minion = this._generateEnemy(
            Math.ceil(activeEnemies[0]?.health?.max / 100) || 1,
            1
          );
          minion.type = special.summonType || 'goblin';
          minion.element = elementalSystem.getEnemyElement(minion.type);
          activeEnemies.push(minion);
        }
        break;
      }

      case 'DRAIN': {
        let totalDrained = 0;
        const targets = special.hitAllTargets ? aliveMembers : [aliveMembers[0]];
        for (const target of targets) {
          const damage = Math.max(1, Math.floor(enemy.damage * (special.damageMultiplier || 0.5)));
          target.currentHealth -= damage;
          totalDrained += damage;
          if (!result.partyDamage[target.npcId]) result.partyDamage[target.npcId] = 0;
          result.partyDamage[target.npcId] += damage;
          if (target.currentHealth <= 0) result.casualties.push(target.npcId);
        }
        // Heal boss
        const healAmount = Math.floor(totalDrained * (special.healPercent || 0.5));
        enemy.health.current = Math.min(enemy.health.max, enemy.health.current + healAmount);
        break;
      }

      case 'BUFF_SELF': {
        if (special.defenseBoost) {
          enemy.defense += special.defenseBoost;
          // Remove after duration (simplified: just add then won't remove)
        }
        break;
      }

      default:
        break;
    }
  }

  /**
   * Roll boss loot based on drop chances
   * @private
   */
  _rollBossLoot(lootTable) {
    const dropped = [];
    for (const lootDef of lootTable) {
      if (Math.random() < lootDef.dropChance) {
        dropped.push({
          id: `item_boss_${Date.now()}_${Math.random()}`,
          name: lootDef.name,
          type: lootDef.type,
          tier: lootDef.tier,
          damage: lootDef.damage || 0,
          defense: lootDef.defense || 0,
          critChance: lootDef.critChance || 0,
          critDamage: lootDef.critDamage || 0,
          dodgeChance: lootDef.dodgeChance || 0,
          healthBonus: lootDef.healthBonus || 0,
          value: lootDef.tier * 100,
          durability: { current: 100, max: 100 },
        });
      }
    }
    return dropped;
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
      items: combatResult.bossLoot || [],
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
      durability: { current: 50, max: 50 }
    };

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

  _getItemPrefix(tier) {
    const prefixes = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
    return prefixes[tier - 1] || 'Common';
  }

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
