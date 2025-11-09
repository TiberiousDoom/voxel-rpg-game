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
   * @param {Object} npcs - NPC assignments {buildingId: [npcIds]}
   * @param {number} moraleMultiplier - Morale multiplier (0.9 to 1.1)
   * @returns {Object} Tick result with production, consumption, storage status
   */
  executeTick(buildings, npcs, moraleMultiplier = 1.0) {
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

        try {
          const result = this._calculateBuildingProduction(
            building,
            npcs[building.id] ? npcs[building.id].length : 0,
            moraleMultiplier
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
      // STEP 2: ADD PRODUCTION TO STORAGE
      // ============================================
      for (const [resource, amount] of Object.entries(productionByType)) {
        this.storageManager.addResource(resource, amount);
      }

      // ============================================
      // STEP 3: CHECK STORAGE OVERFLOW
      // ============================================
      const overflowResult = this.storageManager.checkAndHandleOverflow();
      if (overflowResult.overflowed) {
        tickResult.overflow = {
          amountDumped: overflowResult.amountDumped,
          resources: overflowResult.resourcesDumped
        };
      }

      // ============================================
      // STEP 4: GET CURRENT STORAGE STATUS
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
   * Calculate production for a single building
   * @private
   * @param {Object} building - Building with type, id, position
   * @param {number} assignedNPCCount - Number of NPCs assigned
   * @param {number} moraleMultiplier - Global morale multiplier
   * @returns {Object} Production result
   */
  _calculateBuildingProduction(building, assignedNPCCount, moraleMultiplier) {
    const config = this.buildingConfig.getConfig(building.type);
    const baseProduction = config.production;

    const result = {
      buildingId: building.id,
      buildingType: building.type,
      assignedNPCs: assignedNPCCount,
      production: {}
    };

    // Calculate multiplier
    let multiplier = this._calculateMultiplier(
      building,
      assignedNPCCount,
      moraleMultiplier
    );

    result.baseMultiplier = multiplier.toFixed(3);

    // Apply production with multiplier
    for (const [resource, baseRate] of Object.entries(baseProduction)) {
      if (baseRate > 0) {
        result.production[resource] = baseRate * multiplier;
      }
    }

    return result;
  }

  /**
   * Calculate total multiplier for building
   * Order: NPC × Zone × Aura × Tech × Morale (hard cap 2.0x)
   *
   * For MVP: NPC × Aura × Morale (zones handled separately)
   * @private
   */
  _calculateMultiplier(building, npcCount, moraleMultiplier) {
    let multiplier = 1.0;

    // ============================================
    // MULTIPLIER 1: NPC SKILL (based on count)
    // ============================================
    if (npcCount > 0) {
      // Simple model: each NPC adds efficiency
      // 1 NPC: 1.0x, 2 NPCs: 1.25x, 3 NPCs: 1.5x (cap)
      const npcBonus = Math.min(npcCount * 0.25, 0.5);
      multiplier *= (1.0 + npcBonus);
    } else {
      // No NPC assigned: 50% efficiency (building still produces)
      multiplier *= 0.5;
    }

    // ============================================
    // MULTIPLIER 2: AURA EFFECT
    // ============================================
    const auraBonus = this.buildingEffect.getProductionBonusAt(
      building.position.x,
      building.position.y,
      building.position.z
    );
    multiplier *= auraBonus;

    // ============================================
    // MULTIPLIER 3: ZONE BONUS (for certain building types)
    // ============================================
    // Zone bonuses are applied at Module 4 level (territory-wide)
    // For now, skip zone multiplier in core production

    // ============================================
    // MULTIPLIER 4: TECHNOLOGY (Module 5+)
    // ============================================
    // Skip for MVP

    // ============================================
    // MULTIPLIER 5: MORALE
    // ============================================
    multiplier *= moraleMultiplier;

    // ============================================
    // APPLY HARD CAP
    // ============================================
    multiplier = Math.min(multiplier, 2.0);

    return multiplier;
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
