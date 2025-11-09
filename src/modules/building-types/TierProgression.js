/**
 * TierProgression.js - Tier advancement validator with AND-gate logic
 *
 * Implements tier progression requirements as AND-gates:
 * - SURVIVAL → PERMANENT: Requires 1 HOUSE + 20 wood
 * - PERMANENT → TOWN: Requires 2 TOWN_CENTER buildings + 100 wood, 50 food, 100 stone
 * - TOWN → CASTLE: Requires 3 CASTLE-tier buildings + 500 wood, 300 food, 1000 stone
 *
 * All requirements are combined with AND logic (all must be true).
 */

class TierProgression {
  /**
   * Tier hierarchy and progression order
   * @private
   */
  static TIER_HIERARCHY = ['SURVIVAL', 'PERMANENT', 'TOWN', 'CASTLE'];

  /**
   * Initialize TierProgression validator
   * @param {BuildingConfig} buildingConfig - Building configuration instance
   * @throws {Error} If buildingConfig is invalid
   */
  constructor(buildingConfig) {
    if (!buildingConfig) {
      throw new Error('TierProgression requires BuildingConfig instance');
    }
    this.buildingConfig = buildingConfig;
    this.tierRequirements = this._initializeTierRequirements();
  }

  /**
   * Initialize tier requirements from building configs
   * @private
   * @returns {Object} Tier requirements map
   */
  _initializeTierRequirements() {
    const requirements = {
      SURVIVAL: {
        tier: 'SURVIVAL',
        previousTier: null,
        isStarting: true,
        buildingRequirements: [], // No requirements for starting tier
        resourceRequirements: { wood: 0, food: 0, stone: 0 }
      },
      PERMANENT: {
        tier: 'PERMANENT',
        previousTier: 'SURVIVAL',
        isStarting: false,
        buildingRequirements: [{ type: 'HOUSE', count: 1 }],
        resourceRequirements: { wood: 20, food: 0, stone: 0 }
      },
      TOWN: {
        tier: 'TOWN',
        previousTier: 'PERMANENT',
        isStarting: false,
        buildingRequirements: [{ type: 'TOWN_CENTER', count: 1 }],
        resourceRequirements: { wood: 100, food: 50, stone: 100 }
      },
      CASTLE: {
        tier: 'CASTLE',
        previousTier: 'TOWN',
        isStarting: false,
        buildingRequirements: [{ type: 'CASTLE', count: 1 }],
        resourceRequirements: { wood: 500, food: 300, stone: 1000 }
      }
    };

    return requirements;
  }

  /**
   * Check if player can advance to a specific tier
   * AND-gate logic: All conditions must be met
   *
   * @param {string} targetTier - Target tier to advance to
   * @param {Array<Object>} buildings - Array of placed buildings
   * @param {Object} resources - Current resources {wood, food, stone}
   * @param {string} currentTier - Current tier (optional)
   * @returns {Object} {
   *   canAdvance: boolean,
   *   reason: string,
   *   missingRequirements: Array<string>,
   *   buildingProgress: Object (buildings per type),
   *   resourceProgress: Object (resources vs requirements)
   * }
   */
  canAdvanceToTier(targetTier, buildings, resources, currentTier = 'SURVIVAL') {
    const result = {
      canAdvance: false,
      reason: '',
      missingRequirements: [],
      buildingProgress: {},
      resourceProgress: {}
    };

    // Validate tier exists
    if (!TierProgression.TIER_HIERARCHY.includes(targetTier)) {
      result.reason = `Invalid tier: ${targetTier}`;
      return result;
    }

    // Validate resources object
    if (!resources || typeof resources !== 'object') {
      result.reason = 'Invalid resources object';
      return result;
    }
    if (!('wood' in resources) || !('food' in resources) || !('stone' in resources)) {
      result.reason = 'Resources must include wood, food, and stone';
      return result;
    }

    // Check tier progression order
    const currentTierIndex = TierProgression.TIER_HIERARCHY.indexOf(currentTier);
    const targetTierIndex = TierProgression.TIER_HIERARCHY.indexOf(targetTier);

    if (targetTierIndex <= currentTierIndex) {
      result.reason = `Cannot advance backwards: ${currentTier} → ${targetTier}`;
      return result;
    }

    // Can't skip tiers - must advance in order
    if (targetTierIndex > currentTierIndex + 1) {
      result.reason = `Cannot skip tiers: must advance to ${TierProgression.TIER_HIERARCHY[currentTierIndex + 1]} first`;
      return result;
    }

    // Get requirements for target tier
    const requirements = this.tierRequirements[targetTier];

    // ============================================
    // AND-GATE 1: BUILDING REQUIREMENTS
    // ============================================
    result.buildingProgress = this._checkBuildingRequirements(
      buildings,
      requirements.buildingRequirements
    );

    const buildingsPass = this._buildingRequirementsMet(
      result.buildingProgress,
      requirements.buildingRequirements
    );

    if (!buildingsPass) {
      const missing = this._describeMissingBuildings(result.buildingProgress, requirements.buildingRequirements);
      result.missingRequirements.push(missing);
    }

    // ============================================
    // AND-GATE 2: RESOURCE REQUIREMENTS
    // ============================================
    result.resourceProgress = this._checkResourceRequirements(
      resources,
      requirements.resourceRequirements
    );

    const resourcesPass = this._resourceRequirementsMet(
      result.resourceProgress,
      requirements.resourceRequirements
    );

    if (!resourcesPass) {
      const missing = this._describeMissingResources(result.resourceProgress, requirements.resourceRequirements);
      result.missingRequirements.push(missing);
    }

    // ============================================
    // FINAL AND-GATE DECISION
    // ============================================
    if (buildingsPass && resourcesPass) {
      result.canAdvance = true;
      result.reason = `Ready to advance to ${targetTier}`;
    } else {
      result.reason = `Cannot advance to ${targetTier}: ${result.missingRequirements.join('; ')}`;
    }

    return result;
  }

  /**
   * Check building requirements against placed buildings
   * @private
   * @param {Array<Object>} buildings - Placed buildings
   * @param {Array<Object>} requirements - Building requirements
   * @returns {Object} Building counts by type
   */
  _checkBuildingRequirements(buildings, requirements) {
    const counts = {};

    // Initialize counts from requirements
    for (const req of requirements) {
      counts[req.type] = 0;
    }

    // Count buildings by type
    for (const building of buildings) {
      if (building && building.type) {
        if (!(building.type in counts)) {
          counts[building.type] = 0;
        }
        counts[building.type]++;
      }
    }

    return counts;
  }

  /**
   * Check if building requirements are met
   * @private
   * @param {Object} counts - Current building counts
   * @param {Array<Object>} requirements - Required buildings
   * @returns {boolean} True if all requirements met
   */
  _buildingRequirementsMet(counts, requirements) {
    // No requirements = pass
    if (requirements.length === 0) {
      return true;
    }

    // Check each requirement (AND logic)
    for (const req of requirements) {
      const currentCount = counts[req.type] || 0;
      if (currentCount < req.count) {
        return false; // Any single unmet requirement fails
      }
    }

    return true; // All requirements met
  }

  /**
   * Check resource requirements
   * @private
   * @param {Object} resources - Current resources
   * @param {Object} requirements - Required resources
   * @returns {Object} Progress object with available/required
   */
  _checkResourceRequirements(resources, requirements) {
    return {
      wood: {
        available: resources.wood || 0,
        required: requirements.wood || 0
      },
      food: {
        available: resources.food || 0,
        required: requirements.food || 0
      },
      stone: {
        available: resources.stone || 0,
        required: requirements.stone || 0
      }
    };
  }

  /**
   * Check if resource requirements are met
   * @private
   * @param {Object} progress - Resource progress
   * @param {Object} requirements - Required resources
   * @returns {boolean} True if all resources sufficient
   */
  _resourceRequirementsMet(progress, requirements) {
    // Check each resource (AND logic)
    for (const resource of ['wood', 'food', 'stone']) {
      if (progress[resource].available < progress[resource].required) {
        return false; // Any single unmet requirement fails
      }
    }

    return true; // All resources sufficient
  }

  /**
   * Describe missing buildings in human-readable format
   * @private
   * @param {Object} counts - Current counts
   * @param {Array<Object>} requirements - Required buildings
   * @returns {string} Description of missing buildings
   */
  _describeMissingBuildings(counts, requirements) {
    const missing = [];
    for (const req of requirements) {
      const current = counts[req.type] || 0;
      if (current < req.count) {
        const needed = req.count - current;
        missing.push(`${needed}× ${req.type} (have ${current}/${req.count})`);
      }
    }
    return missing.length > 0
      ? `Missing buildings: ${missing.join(', ')}`
      : '';
  }

  /**
   * Describe missing resources in human-readable format
   * @private
   * @param {Object} progress - Resource progress
   * @param {Object} requirements - Required resources
   * @returns {string} Description of missing resources
   */
  _describeMissingResources(progress, requirements) {
    const missing = [];
    for (const resource of ['wood', 'food', 'stone']) {
      const current = progress[resource].available;
      const required = progress[resource].required;
      if (current < required) {
        const shortage = required - current;
        missing.push(`${shortage}× ${resource} (have ${current}/${required})`);
      }
    }
    return missing.length > 0
      ? `Missing resources: ${missing.join(', ')}`
      : '';
  }

  /**
   * Get next tier after current tier
   * @param {string} currentTier - Current tier
   * @returns {string|null} Next tier or null if at max
   */
  getNextTier(currentTier) {
    const currentIndex = TierProgression.TIER_HIERARCHY.indexOf(currentTier);
    if (currentIndex === -1 || currentIndex === TierProgression.TIER_HIERARCHY.length - 1) {
      return null;
    }
    return TierProgression.TIER_HIERARCHY[currentIndex + 1];
  }

  /**
   * Get all tiers in hierarchy
   * @returns {Array<string>} Tiers in order
   */
  getTierHierarchy() {
    return [...TierProgression.TIER_HIERARCHY];
  }

  /**
   * Check if tier is valid
   * @param {string} tier - Tier name
   * @returns {boolean} True if valid tier
   */
  isValidTier(tier) {
    return TierProgression.TIER_HIERARCHY.includes(tier);
  }

  /**
   * Get tier index in hierarchy (0 = SURVIVAL, 3 = CASTLE)
   * @param {string} tier - Tier name
   * @returns {number} Tier index or -1 if invalid
   */
  getTierIndex(tier) {
    return TierProgression.TIER_HIERARCHY.indexOf(tier);
  }

  /**
   * Get requirements for advancing to specific tier
   * @param {string} targetTier - Target tier
   * @returns {Object} Requirements object
   */
  getRequirementsForTier(targetTier) {
    if (!this.tierRequirements[targetTier]) {
      throw new Error(`Invalid tier: ${targetTier}`);
    }
    return JSON.parse(JSON.stringify(this.tierRequirements[targetTier]));
  }
}

module.exports = TierProgression;
