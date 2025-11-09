/**
 * TerritoryManager.js - Territory expansion and management
 *
 * Manages:
 * - Territory creation and boundaries
 * - Territory expansion with cost validation
 * - Aura coverage calculation based on territory size
 * - Building effects within territory boundaries
 *
 * Territory Tiers (from ECONOMY_BALANCE.md):
 * - SURVIVAL: 25×25×25 (0-15 min gameplay)
 * - PERMANENT: ~50×50×50 (15 min - 2.5 hours)
 * - TOWN: ~100×100×100 (2.5 - 10 hours)
 * - CASTLE: ~150×150×150 (10+ hours)
 */

class Territory {
  /**
   * Create a territory
   * @param {string} id - Territory ID
   * @param {Object} center - Center position {x, y, z}
   * @param {number} radius - Radius from center (half of dimension)
   * @param {string} tier - Tier level
   */
  constructor(id, center, radius, tier) {
    this.id = id;
    this.center = { ...center };
    this.radius = radius; // Allows non-cubic territories in future
    this.tier = tier;

    // Territory dimensions (cubic for MVP)
    this.dimension = radius * 2;

    // Buildings in territory
    this.buildings = []; // Building IDs

    // Expansion history
    this.createdAt = new Date().toISOString();
    this.expandedAt = new Date().toISOString();
    this.expansionCount = 0;
  }

  /**
   * Check if building is within territory
   * @param {Object} building - Building with position
   * @returns {boolean} True if within boundaries
   */
  containsBuilding(building) {
    if (!building || !building.position) {
      return false;
    }

    const dx = Math.abs(building.position.x - this.center.x);
    const dz = Math.abs(building.position.z - this.center.z);

    // Cubic boundary check
    return dx <= this.radius && dz <= this.radius;
  }

  /**
   * Calculate aura coverage percentage
   * @param {number} auraRadius - Aura radius (50 for Town Center)
   * @returns {number} Coverage percentage 0-100
   */
  getAuraCoveragePercent(auraRadius = 50) {
    // Territory is cubic with dimension = 2*radius
    // Aura is sphere with radius = auraRadius
    // Approximate: sphere volume / cube volume

    // Sphere volume: (4/3)πr³
    // Cube volume: (2r)³ = 8r³
    // Coverage ≈ (4/3)πr³ / 8r³ = π/6 ≈ 0.524 (52.4%)

    // But we need to check how much of aura fits in territory
    // For simplicity: if auraRadius >= territoryRadius, coverage = 100%
    // Otherwise: approximate coverage based on ratio

    if (auraRadius >= this.radius) {
      return 100;
    }

    // Ratio-based approximation
    const ratio = auraRadius / this.radius;
    return Math.min(100, ratio * 100 * 0.7); // 0.7 adjustment factor
  }

  /**
   * Get territory size classification
   * @returns {string} Size (small, medium, large, huge)
   */
  getSize() {
    if (this.dimension <= 50) return 'small';
    if (this.dimension <= 100) return 'medium';
    if (this.dimension <= 150) return 'large';
    return 'huge';
  }
}

class TerritoryManager {
  /**
   * Initialize territory manager
   * @param {BuildingConfig} buildingConfig - Building configurations
   */
  constructor(buildingConfig) {
    if (!buildingConfig) {
      throw new Error('TerritoryManager requires BuildingConfig');
    }

    this.buildingConfig = buildingConfig;

    // Active territories
    this.territories = new Map(); // id -> Territory
    this.territoryIdCounter = 0;

    // Building to territory mapping
    this.buildingToTerritory = new Map(); // buildingId -> territoryId

    // Expansion requirements per tier
    this.expansionCosts = {
      SURVIVAL: { // 25×25×25 (no cost for starting)
        wood: 0,
        food: 0,
        stone: 0,
        buildingsRequired: []
      },
      PERMANENT: { // 50×50×50
        wood: 100,
        food: 50,
        stone: 50,
        buildingsRequired: [
          { type: 'HOUSE', count: 2 },
          { type: 'FARM', count: 2 }
        ]
      },
      TOWN: { // 100×100×100
        wood: 500,
        food: 300,
        stone: 500,
        buildingsRequired: [
          { type: 'TOWN_CENTER', count: 1 },
          { type: 'HOUSE', count: 5 }
        ]
      },
      CASTLE: { // 150×150×150
        wood: 2000,
        food: 1000,
        stone: 2000,
        buildingsRequired: [
          { type: 'CASTLE', count: 1 },
          { type: 'TOWN_CENTER', count: 2 }
        ]
      }
    };
  }

  /**
   * Create initial territory
   * @param {Object} center - Center position
   * @param {string} tier - Starting tier (usually SURVIVAL)
   * @returns {Territory} Created territory
   */
  createTerritory(center, tier = 'SURVIVAL') {
    const id = `territory_${this.territoryIdCounter++}`;

    // Territory dimensions per tier
    const dimensions = {
      SURVIVAL: 25,
      PERMANENT: 50,
      TOWN: 100,
      CASTLE: 150
    };

    const radius = (dimensions[tier] || 25) / 2;
    const territory = new Territory(id, center, radius, tier);

    this.territories.set(id, territory);
    return territory;
  }

  /**
   * Expand territory to next tier
   * @param {string} territoryId - Territory to expand
   * @param {Object} resources - Available resources
   * @param {Array<Object>} buildings - Buildings in territory for validation
   * @returns {Object} {success, reason, newTier}
   */
  expandTerritory(territoryId, resources, buildings = []) {
    const territory = this.territories.get(territoryId);
    if (!territory) {
      return { success: false, reason: 'Territory not found' };
    }

    // Get next tier
    const tierHierarchy = ['SURVIVAL', 'PERMANENT', 'TOWN', 'CASTLE'];
    const currentIndex = tierHierarchy.indexOf(territory.tier);

    if (currentIndex === -1 || currentIndex === tierHierarchy.length - 1) {
      return { success: false, reason: 'Already at max tier' };
    }

    const nextTier = tierHierarchy[currentIndex + 1];
    const expansionCost = this.expansionCosts[nextTier];

    // ============================================
    // VALIDATE RESOURCES
    // ============================================
    for (const [resource, required] of Object.entries(expansionCost)) {
      if (resource !== 'buildingsRequired') {
        const available = resources[resource] || 0;
        if (available < required) {
          return {
            success: false,
            reason: `Insufficient ${resource}: need ${required}, have ${available}`
          };
        }
      }
    }

    // ============================================
    // VALIDATE BUILDINGS
    // ============================================
    const buildingCounts = {};
    for (const building of buildings) {
      if (this.buildingToTerritory.get(building.id) === territoryId) {
        buildingCounts[building.type] = (buildingCounts[building.type] || 0) + 1;
      }
    }

    for (const requirement of expansionCost.buildingsRequired) {
      const count = buildingCounts[requirement.type] || 0;
      if (count < requirement.count) {
        return {
          success: false,
          reason: `Need ${requirement.count} ${requirement.type}, have ${count}`
        };
      }
    }

    // ============================================
    // PERFORM EXPANSION
    // ============================================
    // Update territory size
    const dimensions = {
      SURVIVAL: 25,
      PERMANENT: 50,
      TOWN: 100,
      CASTLE: 150
    };

    const newRadius = (dimensions[nextTier] || 25) / 2;
    territory.radius = newRadius;
    territory.dimension = newRadius * 2;
    territory.tier = nextTier;
    territory.expandedAt = new Date().toISOString();
    territory.expansionCount++;

    return {
      success: true,
      newTier: nextTier,
      newDimension: territory.dimension,
      expansionCount: territory.expansionCount
    };
  }

  /**
   * Add building to territory
   * @param {string} territoryId - Territory ID
   * @param {Object} building - Building to add
   * @returns {boolean} True if added
   */
  addBuildingToTerritory(territoryId, building) {
    const territory = this.territories.get(territoryId);
    if (!territory) {
      return false;
    }

    if (territory.containsBuilding(building)) {
      if (!territory.buildings.includes(building.id)) {
        territory.buildings.push(building.id);
      }
      this.buildingToTerritory.set(building.id, territoryId);
      return true;
    }

    return false;
  }

  /**
   * Remove building from territory
   * @param {string} buildingId - Building to remove
   */
  removeBuildingFromTerritory(buildingId) {
    const territoryId = this.buildingToTerritory.get(buildingId);
    if (!territoryId) {
      return;
    }

    const territory = this.territories.get(territoryId);
    if (territory) {
      const idx = territory.buildings.indexOf(buildingId);
      if (idx >= 0) {
        territory.buildings.splice(idx, 1);
      }
    }

    this.buildingToTerritory.delete(buildingId);
  }

  /**
   * Get buildings in territory
   * @param {string} territoryId - Territory ID
   * @returns {Array<string>} Building IDs
   */
  getBuildingsInTerritory(territoryId) {
    const territory = this.territories.get(territoryId);
    return territory ? [...territory.buildings] : [];
  }

  /**
   * Get territory containing building
   * @param {string} buildingId - Building ID
   * @returns {Territory|null} Territory or null
   */
  getTerritoryForBuilding(buildingId) {
    const territoryId = this.buildingToTerritory.get(buildingId);
    return territoryId ? this.territories.get(territoryId) : null;
  }

  /**
   * Get territory
   * @param {string} territoryId - Territory ID
   * @returns {Territory|null} Territory or null
   */
  getTerritory(territoryId) {
    return this.territories.get(territoryId) || null;
  }

  /**
   * Get all territories
   * @returns {Array<Territory>} All territories
   */
  getAllTerritories() {
    return Array.from(this.territories.values());
  }

  /**
   * Get expansion cost for tier
   * @param {string} tier - Target tier
   * @returns {Object} Cost object
   */
  getExpansionCost(tier) {
    return this.expansionCosts[tier] || null;
  }

  /**
   * Check if territory can expand to tier
   * @param {string} territoryId - Territory ID
   * @param {string} targetTier - Target tier
   * @returns {boolean} True if can expand
   */
  canExpandToTier(territoryId, targetTier) {
    const territory = this.territories.get(territoryId);
    if (!territory) {
      return false;
    }

    const tierHierarchy = ['SURVIVAL', 'PERMANENT', 'TOWN', 'CASTLE'];
    const currentIndex = tierHierarchy.indexOf(territory.tier);
    const targetIndex = tierHierarchy.indexOf(targetTier);

    return targetIndex === currentIndex + 1;
  }

  /**
   * Get territory statistics
   * @param {string} territoryId - Territory ID
   * @returns {Object} Statistics
   */
  getStatistics(territoryId) {
    const territory = this.territories.get(territoryId);
    if (!territory) {
      return null;
    }

    return {
      id: territory.id,
      tier: territory.tier,
      dimension: territory.dimension,
      radius: territory.radius,
      size: territory.getSize(),
      center: territory.center,
      buildingCount: territory.buildings.length,
      auraCoveragePercent: territory.getAuraCoveragePercent(50),
      createdAt: territory.createdAt,
      expandedAt: territory.expandedAt,
      expansionCount: territory.expansionCount
    };
  }

  /**
   * Check if building is within any territory
   * @param {Object} building - Building with position
   * @returns {string|null} Territory ID or null
   */
  findTerritoryForBuilding(building) {
    for (const [id, territory] of this.territories) {
      if (territory.containsBuilding(building)) {
        return id;
      }
    }
    return null;
  }

  /**
   * Get total territory size (sum of all territories)
   * @returns {number} Total dimension cubed
   */
  getTotalTerritorySize() {
    let total = 0;
    for (const territory of this.territories.values()) {
      total += territory.dimension * territory.dimension * territory.dimension;
    }
    return total;
  }
}

module.exports = { TerritoryManager, Territory };
