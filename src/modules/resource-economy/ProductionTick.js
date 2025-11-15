/**
 * ProductionTick.js - Main production tick orchestration system
 *
 * Coordinates all production, consumption, and morale calculations
 * Called once every 5 real seconds (1 game tick)
 *
 * Based on FORMULAS.md section 1: PRODUCTION TICK SYSTEM
 *
 * Tick sequence:
 * 1. Calculate production from all buildings
 * 2. Apply building effects (aura, zones)
 * 3. Process NPC assignments and multipliers
 * 4. Execute consumption
 * 5. Calculate morale
 * 6. Check storage and overflow
 * 7. Report results
 */

class ProductionTick {
  /**
   * Initialize ProductionTick system
   * @param {BuildingConfig} buildingConfig - Building configurations
   * @param {BuildingEffect} buildingEffect - Building effects system
   * @param {StorageManager} storageManager - Storage and inventory
   */
  constructor(buildingConfig, buildingEffect, storageManager) {
    if (!buildingConfig) throw new Error('ProductionTick requires BuildingConfig');
    if (!buildingEffect) throw new Error('ProductionTick requires BuildingEffect');
    if (!storageManager) throw new Error('ProductionTick requires StorageManager');

    this.buildingConfig = buildingConfig;
    this.buildingEffect = buildingEffect;
    this.storageManager = storageManager;

    // Track tick number for statistics
    this.tickNumber = 0;

    // Tick results
    this.lastTickResult = null;
  }

  /**
   * Execute one production tick
   * @param {Array<Object>} buildings - All placed buildings with id, type, position
   * @param {Object} npcAssignments - NPCAssignment instance
   * @param {Object} npcManager - NPCManager instance
   * @param {number} moraleMultiplier - Morale multiplier (0.9 to 1.1)
   * @param {Object} gameState - Game state with event multipliers (optional)
   * @returns {Object} Tick result with production, consumption, storage status
   */
  executeTick(buildings, npcAssignments, npcManager, moraleMultiplier = 1.0, gameState = null) {
    this.tickNumber++;

    const tickResult = {
      tick: this.tickNumber,
      timestamp: new Date().toISOString(),
      production: {},
      buildingResults: [],
      storageStatus: {},
      errors: []
    };

    try {
      // ============================================
      // STEP 1: PRODUCTION PHASE
      // ============================================
      const productionByType = {};
      const buildingResults = [];

      for (const building of buildings) {
        if (!building || !building.type) {
          tickResult.errors.push(`Invalid building: ${building?.id}`);
          continue;
        }

        // Only complete buildings produce
        if (building.state !== 'COMPLETE' && building.state !== 'COMPLETED') {
          continue;
        }

        try {
          // Get assigned NPCs for this building
          const workerIds = npcAssignments.getNPCsInBuilding(building.id);
          const workers = workerIds
            .map(id => npcManager.npcs.get(id))
            .filter(npc => npc !== undefined && npc.alive);

          const result = this._calculateBuildingProduction(
            building,
            workers,
            moraleMultiplier,
            gameState
          );

          buildingResults.push(result);

          // Accumulate production by resource type
          for (const [resource, amount] of Object.entries(result.production)) {
            if (amount > 0) {
              productionByType[resource] = (productionByType[resource] || 0) + amount;
            }
          }
        } catch (err) {
          tickResult.errors.push(`Production error for ${building.id}: ${err.message}`);
        }
      }

      tickResult.production = productionByType;
      tickResult.buildingResults = buildingResults;

      // ============================================
      // STEP 2: NPC WOOD PRODUCTION
      // ============================================
      // NPCs generate a small amount of wood per tick
      const aliveNPCs = Array.from(npcManager.npcs.values()).filter(npc => npc.alive);
      const npcWoodProduction = aliveNPCs.length * 0.2; // 0.2 wood per NPC per tick

      if (npcWoodProduction > 0) {
        productionByType.wood = (productionByType.wood || 0) + npcWoodProduction;
        tickResult.npcWoodProduction = npcWoodProduction;
      }

      // Update tickResult with combined production
      tickResult.production = productionByType;

      // ============================================
      // STEP 3: ADD PRODUCTION TO STORAGE
      // ============================================
      for (const [resource, amount] of Object.entries(productionByType)) {
        this.storageManager.addResource(resource, amount);
      }

      // ============================================
      // STEP 4: CHECK STORAGE OVERFLOW
      // ============================================
      const overflowResult = this.storageManager.checkAndHandleOverflow();
      if (overflowResult.overflowed) {
        tickResult.overflow = {
          amountDumped: overflowResult.amountDumped,
          resources: overflowResult.resourcesDumped
        };
      }

      // ============================================
      // STEP 5: GET CURRENT STORAGE STATUS
      // ============================================
      tickResult.storageStatus = this.storageManager.getStatus();

      this.lastTickResult = tickResult;
      return tickResult;
    } catch (err) {
      tickResult.errors.push(`Critical tick error: ${err.message}`);
      this.lastTickResult = tickResult;
      return tickResult;
    }
  }

  /**
   * Calculate production for a single building based on NPC staffing
   * @private
   * @param {Object} building - Building with type, id, position
   * @param {Array} assignedNPCs - Array of NPC entities assigned to this building
   * @param {number} moraleMultiplier - Global morale multiplier
   * @param {Object} gameState - Game state with event multipliers (optional)
   * @returns {Object} Production result
   */
  _calculateBuildingProduction(building, assignedNPCs, moraleMultiplier, gameState = null) {
    const config = this.buildingConfig.getConfig(building.type);
    const baseProduction = config.production;

    const result = {
      buildingId: building.id,
      buildingType: building.type,
      assignedNPCs: assignedNPCs.length,
      production: {}
    };

    // Calculate staffing multiplier (0.0 to 1.0)
    const staffingMultiplier = this._calculateStaffingMultiplier(building, assignedNPCs, config);

    // Calculate skill bonus (0.0 to 1.0+)
    const skillBonus = this._calculateSkillBonus(building, assignedNPCs);

    // Hybrid Game: Calculate combat bonus (average of all assigned NPCs)
    const combatBonus = assignedNPCs.length > 0
      ? assignedNPCs.reduce((sum, npc) => sum + this._getCombatProductionBonus(npc), 0) / assignedNPCs.length
      : 1.0;

    // Apply aura bonus
    const auraBonus = this.buildingEffect.getProductionBonusAt(
      building.position.x,
      building.position.y,
      building.position.z
    );

    // Final production = base × staffing × (1 + skillBonus) × combatBonus × aura × morale
    let multiplier = staffingMultiplier * (1 + skillBonus) * combatBonus * auraBonus * moraleMultiplier;

    // Hard cap at 2.0x
    multiplier = Math.min(multiplier, 2.0);

    result.baseMultiplier = multiplier.toFixed(3);
    result.staffingMultiplier = staffingMultiplier.toFixed(3);
    result.skillBonus = skillBonus.toFixed(3);
    result.combatBonus = (combatBonus - 1.0).toFixed(3); // Show as bonus percentage

    // Apply production with multiplier
    for (const [resource, baseRate] of Object.entries(baseProduction)) {
      if (baseRate > 0) {
        let finalProduction = baseRate * multiplier;

        // Apply event multipliers (Phase 3B)
        if (gameState?.eventMultipliers?.[resource]) {
          const eventMultiplier = gameState.eventMultipliers[resource];
          finalProduction *= eventMultiplier;

          // Track that event multiplier was applied
          if (!result.eventMultipliers) {
            result.eventMultipliers = {};
          }
          result.eventMultipliers[resource] = eventMultiplier;
        }

        result.production[resource] = finalProduction;
      }
    }

    return result;
  }

  /**
   * Calculate staffing multiplier (0.0 to 1.0)
   * 0 workers = 0% production
   * Full capacity = 100% production
   * @private
   * @param {Object} building - Building entity
   * @param {Array} assignedNPCs - Array of NPC entities
   * @param {Object} config - Building config
   * @returns {number} Staffing multiplier (0.0 to 1.0)
   */
  _calculateStaffingMultiplier(building, assignedNPCs, config) {
    const capacity = config.workSlots || config.npcCapacity || 1;
    const actual = assignedNPCs.length;

    // Linear scaling: 0 workers = 0%, 1/2 workers = 50%, 2/2 workers = 100%
    return actual / capacity;
  }

  /**
   * Calculate skill bonus (0.0 to 1.0+)
   * Average skill level of workers provides bonus production
   * @private
   * @param {Object} building - Building entity
   * @param {Array} assignedNPCs - Array of NPC entities
   * @returns {number} Skill bonus (0.0 to 1.0+)
   */
  _calculateSkillBonus(building, assignedNPCs) {
    if (assignedNPCs.length === 0) return 0;

    const relevantSkillName = this._getRelevantSkill(building.type);

    const totalSkill = assignedNPCs.reduce((sum, npc) => {
      // Skills are stored as multipliers (1.0 = base, 1.5 = 150%)
      // Convert to 0-100 scale for bonus calculation
      const skillMultiplier = npc.skills?.[relevantSkillName] || 1.0;
      const skillLevel = (skillMultiplier - 1.0) * 100; // 1.0 → 0, 1.5 → 50
      return sum + skillLevel;
    }, 0);

    const averageSkill = totalSkill / assignedNPCs.length;

    // Skill bonus: 0 skill = 0% bonus, 50 skill = 50% bonus, 100 skill = 100% bonus
    return averageSkill / 100;
  }

  /**
   * Calculate combat production bonus for NPC
   * Hybrid Game: NPCs with combat experience provide production bonuses
   * @private
   * @param {Object} npc - NPC entity
   * @returns {number} Multiplier (1.0 = no bonus)
   */
  _getCombatProductionBonus(npc) {
    let multiplier = 1.0;

    // Combat level bonus (1% per level above 1)
    if (npc.combatLevel) {
      multiplier += (npc.combatLevel - 1) * 0.01;
    }

    // Equipment bonus (0.5% per tier of best equipment)
    if (npc.equipment) {
      const bestTier = Math.max(
        npc.equipment.weapon?.tier || 0,
        npc.equipment.armor?.tier || 0,
        npc.equipment.accessory?.tier || 0
      );
      multiplier += bestTier * 0.005;
    }

    // Veteran bonus (5% after 10 expeditions)
    if (npc.isVeteran) {
      multiplier += 0.05;
    }

    return multiplier;
  }

  /**
   * Map building type to relevant skill
   * @private
   * @param {string} buildingType - Building type
   * @returns {string} Skill name
   */
  _getRelevantSkill(buildingType) {
    const skillMap = {
      'CAMPFIRE': 'general',
      'FARM': 'farming',
      'MINE': 'general', // No mining skill yet
      'LUMBER_MILL': 'general', // No woodcutting skill yet
      'CRAFTING_STATION': 'crafting',
      'MARKETPLACE': 'general' // No trading skill yet
    };

    return skillMap[buildingType] || 'general';
  }

  /**
   * Get production report for this tick
   * @returns {Object} Formatted report
   */
  getTickReport() {
    if (!this.lastTickResult) {
      return { error: 'No tick executed yet' };
    }

    const report = {
      tick: this.lastTickResult.tick,
      totalProduction: this._calculateTotalProduction(this.lastTickResult.production),
      buildingsProduced: this.lastTickResult.buildingResults.length,
      storageUtilization: this.storageManager.getUtilizationPercent() + '%',
      hasOverflow: !!(this.lastTickResult.overflow)
    };

    if (this.lastTickResult.errors.length > 0) {
      report.errors = this.lastTickResult.errors;
    }

    return report;
  }

  /**
   * Calculate total production amount
   * @private
   */
  _calculateTotalProduction(production) {
    return Object.values(production).reduce((sum, val) => sum + val, 0).toFixed(2);
  }

  /**
   * Get statistics about production system
   * @returns {Object} Statistics
   */
  getStatistics() {
    return {
      ticksExecuted: this.tickNumber,
      currentStorage: this.storageManager.getStorage(),
      storageCapacity: this.storageManager.getCapacity(),
      storageUtilization: this.storageManager.getUtilizationPercent()
    };
  }

  /**
   * Get last tick's detailed results
   * @returns {Object} Last tick result
   */
  getLastTickResult() {
    return this.lastTickResult;
  }
}

export default ProductionTick;
