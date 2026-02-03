/**
 * DefenseCombatEngine - Handles wave-based defense combat during raids
 */
class DefenseCombatEngine {
  constructor(npcManager, skillSystem, equipmentManager) {
    this.npcManager = npcManager;
    this.skillSystem = skillSystem;
    this.equipmentManager = equipmentManager;
    this.settlementHealth = 1000;
  }

  /**
   * Get available defenders
   * @returns {Array} NPCs available to defend
   */
  getAvailableDefenders() {
    const allNPCs = Array.from(this.npcManager.npcs?.values() || []);

    return allNPCs.filter(npc =>
      npc.alive &&
      npc.combatStats?.health?.current > 0 &&
      !npc.onExpedition
    );
  }

  /**
   * Simulate wave combat
   * @param {Array} defenders - Defender NPCs
   * @param {Array} enemies - Enemy wave
   * @returns {Object} Combat result
   */
  simulateWaveCombat(defenders, enemies) {
    const result = {
      victory: false,
      rounds: 0,
      enemiesKilled: 0,
      enemiesRemaining: 0,
      defendersKilled: [],
      damageToSettlement: 0,
      defenderDamage: {}
    };

    // Get defender combat data
    const activeDefenders = defenders.map(npc => ({
      npc,
      currentHealth: npc.combatStats.health.current
    }));

    const activeEnemies = enemies.filter(e => e.alive);

    // Combat rounds
    while (activeDefenders.some(d => d.currentHealth > 0) && activeEnemies.length > 0) {
      result.rounds++;

      // Defenders attack
      for (const defender of activeDefenders) {
        if (defender.currentHealth <= 0) continue;
        if (activeEnemies.length === 0) break;

        // Target first enemy
        const target = activeEnemies[0];
        const damage = this._calculateDefenderDamage(defender.npc, target);
        target.health.current -= damage;

        if (target.health.current <= 0) {
          target.alive = false;
          result.enemiesKilled++;
          activeEnemies.shift();
        }
      }

      // Enemies attack
      for (const enemy of activeEnemies) {
        if (!enemy.alive) continue;

        // Enemies target defenders or settlement
        if (activeDefenders.some(d => d.currentHealth > 0)) {
          // Attack random defender
          const aliveDefenders = activeDefenders.filter(d => d.currentHealth > 0);
          const target = aliveDefenders[Math.floor(Math.random() * aliveDefenders.length)];

          const damage = this._calculateEnemyDamage(enemy, target.npc);
          target.currentHealth -= damage;

          if (!result.defenderDamage[target.npc.id]) {
            result.defenderDamage[target.npc.id] = 0;
          }
          result.defenderDamage[target.npc.id] += damage;

          if (target.currentHealth <= 0) {
            result.defendersKilled.push(target.npc.id);
          }
        } else {
          // All defenders down - attack settlement
          result.damageToSettlement += enemy.damage;
        }
      }

      // Prevent infinite loops
      if (result.rounds > 100) break;
    }

    result.victory = activeEnemies.length === 0;
    result.enemiesRemaining = activeEnemies.length;

    // Remaining enemies attack settlement
    if (!result.victory && activeEnemies.length > 0) {
      for (const enemy of activeEnemies) {
        if (enemy.alive) {
          result.damageToSettlement += enemy.damage;
        }
      }
    }

    // Update defender health
    for (const defender of activeDefenders) {
      defender.npc.combatStats.health.current = Math.max(0, defender.currentHealth);
    }

    return result;
  }

  /**
   * Calculate damage dealt by defender
   * @private
   */
  _calculateDefenderDamage(defender, enemy) {
    let damage = defender.combatStats.damage;

    // Apply skill bonuses
    if (this.skillSystem && defender.skills_combat) {
      const skillBonuses = this.skillSystem.getSkillBonuses(defender);
      damage *= skillBonuses.damageMultiplier;
    }

    // Apply equipment bonuses
    if (this.equipmentManager && defender.equipment) {
      const equipBonuses = this.equipmentManager.getEquipmentBonuses(defender);
      damage += equipBonuses.damage;
    }

    // Apply enemy defense
    damage = Math.max(1, damage - enemy.defense);

    // Critical hit
    const critChance = defender.combatStats.critChance;
    if (Math.random() * 100 < critChance) {
      damage *= (defender.combatStats.critDamage / 100);
    }

    return Math.floor(damage);
  }

  /**
   * Calculate damage dealt by enemy
   * @private
   */
  _calculateEnemyDamage(enemy, defender) {
    let damage = enemy.damage;

    // Apply defender defense
    const defense = defender.combatStats.defense;
    damage = Math.max(1, damage - defense);

    // Dodge chance
    const dodgeChance = defender.combatStats.dodgeChance;
    if (Math.random() * 100 < dodgeChance) {
      return 0; // Dodged
    }

    return Math.floor(damage);
  }

  /**
   * Heal defenders between waves
   * @param {Array} defenders - Defender NPCs
   * @param {number} percentage - Healing percentage (0-1)
   */
  healDefenders(defenders, percentage = 0.2) {
    for (const defender of defenders) {
      if (!defender.combatStats) continue;

      const maxHealth = defender.combatStats.health.max;
      const healing = Math.floor(maxHealth * percentage);
      defender.combatStats.health.current = Math.min(
        maxHealth,
        defender.combatStats.health.current + healing
      );
    }
  }

  /**
   * Calculate total defense power
   * @param {Array} defenders - Defender NPCs
   * @returns {Object} Defense statistics
   */
  getDefenseStats(defenders) {
    const stats = {
      totalDefenders: defenders.length,
      totalHealth: 0,
      totalDamage: 0,
      averageDefense: 0,
      averageSpeed: 0
    };

    if (defenders.length === 0) return stats;

    for (const defender of defenders) {
      if (!defender.combatStats) continue;

      stats.totalHealth += defender.combatStats.health.max;
      stats.totalDamage += defender.combatStats.damage;
      stats.averageDefense += defender.combatStats.defense;
      stats.averageSpeed += defender.combatStats.speed;
    }

    stats.averageDefense /= defenders.length;
    stats.averageSpeed /= defenders.length;

    return stats;
  }

  /**
   * Repair settlement
   * @param {number} amount - Amount to repair
   */
  repairSettlement(amount) {
    this.settlementHealth = Math.min(1000, this.settlementHealth + amount);
  }

  /**
   * Get settlement health
   * @returns {number} Current settlement health
   */
  getSettlementHealth() {
    return this.settlementHealth;
  }

  /**
   * Set settlement health
   * @param {number} health - New health value
   */
  setSettlementHealth(health) {
    this.settlementHealth = Math.max(0, Math.min(1000, health));
  }
}

export default DefenseCombatEngine;
