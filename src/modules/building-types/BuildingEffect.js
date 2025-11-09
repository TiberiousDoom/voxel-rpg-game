/**
 * BuildingEffect.js - Building effects system (aura and zone bonuses)
 *
 * Manages building effects:
 * - Aura effects: Production bonuses within radius (e.g., Town Center +5%)
 * - Zone bonuses: Special bonuses within radius (e.g., Watchtower defense +20%)
 * - Effect stacking: Only strongest effect applies in overlapping zones
 *
 * This system integrates with SpatialPartitioning for efficient radius queries.
 */

class BuildingEffect {
  /**
   * Effect types and their properties
   * @private
   */
  static EFFECT_TYPES = {
    AURA_PRODUCTION: 'aura_production',
    ZONE_DEFENSE: 'zone_defense',
    ZONE_TRADE: 'zone_trade'
  };

  /**
   * Initialize BuildingEffect system
   * @param {SpatialPartitioning} spatialPartitioning - Spatial query system
   * @param {BuildingConfig} buildingConfig - Building configurations
   * @throws {Error} If dependencies invalid
   */
  constructor(spatialPartitioning, buildingConfig) {
    if (!spatialPartitioning) {
      throw new Error('BuildingEffect requires SpatialPartitioning instance');
    }
    if (!buildingConfig) {
      throw new Error('BuildingEffect requires BuildingConfig instance');
    }

    this.spatial = spatialPartitioning;
    this.buildingConfig = buildingConfig;

    // Map of all active effects: effectId -> {building, effect, type}
    this.activeEffects = new Map();

    // Effect ID counter
    this.effectIdCounter = 0;

    // Cache of building effects for quick lookup
    this.buildingEffects = new Map(); // buildingId -> [effectIds]
  }

  /**
   * Register a building's effects
   * Called when building is placed or becomes active
   *
   * @param {Object} building - Building object with id, type, position
   * @returns {Array<string>} Effect IDs created
   * @throws {Error} If building invalid
   */
  registerBuildingEffects(building) {
    if (!building || !building.id || !building.type || !building.position) {
      throw new Error('Invalid building: missing id, type, or position');
    }

    const effectIds = [];
    const config = this.buildingConfig.getConfig(building.type);
    const effects = config.effects;

    // Register aura if present
    if (effects.aura) {
      const effectId = this._createAuraEffect(building, effects.aura);
      effectIds.push(effectId);
    }

    // Register zone bonus if present
    if (effects.zoneBonus) {
      const effectId = this._createZoneBonusEffect(building, effects.zoneBonus);
      effectIds.push(effectId);
    }

    // Store building->effects mapping
    if (effectIds.length > 0) {
      this.buildingEffects.set(building.id, effectIds);
    }

    return effectIds;
  }

  /**
   * Create aura effect
   * @private
   * @param {Object} building - Building with position
   * @param {Object} auraConfig - Aura configuration
   * @returns {string} Effect ID
   */
  _createAuraEffect(building, auraConfig) {
    const effectId = `effect_aura_${this.effectIdCounter++}`;

    this.activeEffects.set(effectId, {
      id: effectId,
      buildingId: building.id,
      type: BuildingEffect.EFFECT_TYPES.AURA_PRODUCTION,
      position: { ...building.position },
      radius: auraConfig.radius,
      multiplier: auraConfig.multiplier,
      effectType: auraConfig.type
    });

    return effectId;
  }

  /**
   * Create zone bonus effect
   * @private
   * @param {Object} building - Building with position
   * @param {Object} zoneBonusConfig - Zone bonus configuration
   * @returns {string} Effect ID
   */
  _createZoneBonusEffect(building, zoneBonusConfig) {
    const effectId = `effect_zone_${this.effectIdCounter++}`;

    const typeMap = {
      defense: BuildingEffect.EFFECT_TYPES.ZONE_DEFENSE,
      trade: BuildingEffect.EFFECT_TYPES.ZONE_TRADE
    };

    this.activeEffects.set(effectId, {
      id: effectId,
      buildingId: building.id,
      type: typeMap[zoneBonusConfig.type] || zoneBonusConfig.type,
      position: { ...building.position },
      radius: zoneBonusConfig.radius,
      multiplier: zoneBonusConfig.multiplier,
      effectType: zoneBonusConfig.type
    });

    return effectId;
  }

  /**
   * Unregister building's effects
   * Called when building is removed or destroyed
   *
   * @param {string} buildingId - Building ID
   * @returns {number} Number of effects removed
   */
  unregisterBuildingEffects(buildingId) {
    const effectIds = this.buildingEffects.get(buildingId) || [];
    let removed = 0;

    for (const effectId of effectIds) {
      if (this.activeEffects.delete(effectId)) {
        removed++;
      }
    }

    this.buildingEffects.delete(buildingId);
    return removed;
  }

  /**
   * Update building effect positions (after move)
   * @param {Object} building - Building with updated position
   * @throws {Error} If building has no registered effects
   */
  updateBuildingEffectPosition(building) {
    const effectIds = this.buildingEffects.get(building.id);
    if (!effectIds || effectIds.length === 0) {
      return; // No effects to update
    }

    for (const effectId of effectIds) {
      const effect = this.activeEffects.get(effectId);
      if (effect) {
        effect.position = { ...building.position };
      }
    }
  }

  /**
   * Get production bonus at a position
   * Returns the strongest aura bonus affecting this position
   *
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} z - Z coordinate
   * @returns {number} Multiplier (1.0 = no bonus, 1.05 = +5%)
   */
  getProductionBonusAt(x, y, z) {
    let maxMultiplier = 1.0;

    for (const effect of this.activeEffects.values()) {
      // Only check production auras
      if (effect.type !== BuildingEffect.EFFECT_TYPES.AURA_PRODUCTION) {
        continue;
      }

      // Calculate distance
      const distance = this._calculateDistance(x, y, z, effect.position);

      // Check if within radius
      if (distance <= effect.radius) {
        maxMultiplier = Math.max(maxMultiplier, effect.multiplier);
      }
    }

    return maxMultiplier;
  }

  /**
   * Get defense bonus at a position
   * Returns the strongest defense zone bonus affecting this position
   *
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} z - Z coordinate
   * @returns {number} Multiplier (1.0 = no bonus, 1.2 = +20% defense)
   */
  getDefenseBonusAt(x, y, z) {
    let maxMultiplier = 1.0;

    for (const effect of this.activeEffects.values()) {
      // Only check defense zones
      if (effect.type !== BuildingEffect.EFFECT_TYPES.ZONE_DEFENSE) {
        continue;
      }

      // Calculate distance
      const distance = this._calculateDistance(x, y, z, effect.position);

      // Check if within radius
      if (distance <= effect.radius) {
        maxMultiplier = Math.max(maxMultiplier, effect.multiplier);
      }
    }

    return maxMultiplier;
  }

  /**
   * Get trade bonus at a position
   * Returns the strongest trade zone bonus affecting this position
   *
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} z - Z coordinate
   * @returns {number} Multiplier (1.0 = no bonus, 1.1 = +10% trade)
   */
  getTradeBonusAt(x, y, z) {
    let maxMultiplier = 1.0;

    for (const effect of this.activeEffects.values()) {
      // Only check trade zones
      if (effect.type !== BuildingEffect.EFFECT_TYPES.ZONE_TRADE) {
        continue;
      }

      // Calculate distance
      const distance = this._calculateDistance(x, y, z, effect.position);

      // Check if within radius
      if (distance <= effect.radius) {
        maxMultiplier = Math.max(maxMultiplier, effect.multiplier);
      }
    }

    return maxMultiplier;
  }

  /**
   * Get all effects affecting a building
   * @param {Object} building - Building to check
   * @returns {Array<Object>} Effects affecting this building
   */
  getAffectingEffects(building) {
    const affecting = [];

    for (const effect of this.activeEffects.values()) {
      // Skip self-effects
      if (effect.buildingId === building.id) {
        continue;
      }

      // Calculate distance
      const distance = this._calculateDistance(
        building.position.x,
        building.position.y,
        building.position.z,
        effect.position
      );

      // Check if within radius
      if (distance <= effect.radius) {
        affecting.push(effect);
      }
    }

    return affecting;
  }

  /**
   * Get all buildings affected by an effect
   * @param {string} effectId - Effect ID
   * @param {Array<Object>} allBuildings - All buildings in game
   * @returns {Array<Object>} Buildings within effect radius
   */
  getBuildingsAffectedByEffect(effectId, allBuildings) {
    const effect = this.activeEffects.get(effectId);
    if (!effect) {
      return [];
    }

    const affected = [];

    for (const building of allBuildings) {
      // Skip source building
      if (building.id === effect.buildingId) {
        continue;
      }

      // Calculate distance
      const distance = this._calculateDistance(
        building.position.x,
        building.position.y,
        building.position.z,
        effect.position
      );

      // Check if within radius
      if (distance <= effect.radius) {
        affected.push(building);
      }
    }

    return affected;
  }

  /**
   * Calculate 3D Euclidean distance
   * @private
   * @param {number} x1, y1, z1 - Point 1
   * @param {Object} pos2 - Point 2 {x, y, z}
   * @returns {number} Distance
   */
  _calculateDistance(x1, y1, z1, pos2) {
    const dx = x1 - pos2.x;
    const dy = y1 - pos2.y;
    const dz = z1 - pos2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Get statistics about active effects
   * @returns {Object} Statistics
   */
  getStatistics() {
    const stats = {
      totalEffects: this.activeEffects.size,
      effectsByType: {},
      buildingsWithEffects: this.buildingEffects.size
    };

    for (const effect of this.activeEffects.values()) {
      if (!(effect.type in stats.effectsByType)) {
        stats.effectsByType[effect.type] = 0;
      }
      stats.effectsByType[effect.type]++;
    }

    return stats;
  }

  /**
   * Get all active effects
   * @returns {Array<Object>} All active effects
   */
  getAllEffects() {
    return Array.from(this.activeEffects.values());
  }

  /**
   * Check if effect is active
   * @param {string} effectId - Effect ID
   * @returns {boolean} True if active
   */
  isEffectActive(effectId) {
    return this.activeEffects.has(effectId);
  }

  /**
   * Clear all effects (for testing)
   */
  clearAllEffects() {
    this.activeEffects.clear();
    this.buildingEffects.clear();
    this.effectIdCounter = 0;
  }
}

module.exports = BuildingEffect;
