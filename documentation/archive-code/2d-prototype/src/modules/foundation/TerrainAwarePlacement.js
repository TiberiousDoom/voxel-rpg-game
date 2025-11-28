/**
 * TerrainAwarePlacement.js - Terrain-aware building placement helper
 *
 * Integrates terrain system with GridManager for automatic terrain flattening
 * when placing buildings. Implements the auto-flatten decision from Phase 0.
 *
 * Part of Phase 1: Terrain Integration with GridManager
 *
 * Features:
 * - Auto-flatten terrain under buildings (free, automatic)
 * - Max slope tolerance check (height diff <= 1)
 * - Elevation-aware building placement
 * - Validates terrain suitability before placement
 *
 * Usage:
 *   const placement = new TerrainAwarePlacement(gridManager, terrainSystem);
 *   const result = placement.placeBuilding(building, { autoFlatten: true });
 */

export class TerrainAwarePlacement {
  /**
   * Create a terrain-aware placement helper
   * @param {GridManager} gridManager - Grid manager instance
   * @param {TerrainSystem} terrainSystem - Terrain system instance (optional)
   * @param {object} options - Configuration options
   */
  constructor(gridManager, terrainSystem = null, options = {}) {
    this.gridManager = gridManager;
    this.terrainSystem = terrainSystem;

    this.config = {
      autoFlatten: options.autoFlatten !== false, // Default: true
      maxSlopeTolerance: options.maxSlopeTolerance || 1, // From Phase 0
      requireFlat: options.requireFlat !== false, // Default: true
      minBuildingElevation: options.minBuildingElevation || 0,
      maxBuildingElevation: options.maxBuildingElevation || 10,
      ...options
    };
  }

  /**
   * Place a building with terrain awareness
   * Automatically flattens terrain if enabled
   *
   * @param {object} building - Building object
   * @param {object} overrides - Override default config for this placement
   * @returns {object} {success, buildingId?, error?, terrainModified?, flattenedTo?}
   */
  placeBuilding(building, overrides = {}) {
    const config = { ...this.config, ...overrides };

    // Validate building has required fields
    if (!building.position) {
      return { success: false, error: 'Building missing position' };
    }

    const { x, z } = building.position;
    const { width = 1, depth = 1 } = building.dimensions || {};

    let terrainModified = false;
    let flattenedTo = null;

    // If terrain system is available, perform terrain checks
    if (this.terrainSystem) {
      try {
        // Check if region is flat enough
        const flatCheck = this.terrainSystem.isRegionFlat(
          x, z, width, depth, config.maxSlopeTolerance
        );

        // If not flat and auto-flatten is enabled, flatten the region
        if (!flatCheck.flat) {
          if (config.autoFlatten) {
            const flattenResult = this.terrainSystem.flattenRegion(
              x, z, width, depth
            );

            terrainModified = flattenResult.success;
            flattenedTo = flattenResult.flattenedTo;

            // Update building elevation to flattened height
            building.position.y = flattenedTo;
          } else if (config.requireFlat) {
            // Not flat and auto-flatten disabled - reject placement
            return {
              success: false,
              error: `Terrain too steep (height difference: ${flatCheck.heightDiff}). Flatten terrain or enable auto-flatten.`,
              terrainInfo: flatCheck
            };
          }
        } else {
          // Region is already flat - use average height
          const avgHeight = this.terrainSystem.terrainManager.getRegionAverageHeight(
            x, z, width, depth
          );
          building.position.y = avgHeight;
          flattenedTo = avgHeight;
        }

        // Validate elevation is within acceptable range
        if (building.position.y < config.minBuildingElevation ||
            building.position.y > config.maxBuildingElevation) {
          return {
            success: false,
            error: `Building elevation ${building.position.y} out of range [${config.minBuildingElevation}, ${config.maxBuildingElevation}]`
          };
        }
      } catch (error) {
        return {
          success: false,
          error: `Terrain check failed: ${error.message}`
        };
      }
    } else {
      // No terrain system - use default elevation
      if (building.position.y === undefined) {
        building.position.y = 0;
      }
    }

    // Delegate to GridManager for actual placement
    const result = this.gridManager.placeBuilding(building);

    // Include terrain modification info in result
    return {
      ...result,
      terrainModified,
      flattenedTo
    };
  }

  /**
   * Check if a building can be placed at a position
   * Includes terrain checks
   *
   * @param {object} position - {x, z}
   * @param {object} dimensions - {width, depth}
   * @param {object} overrides - Override default config
   * @returns {object} {canPlace, reason?, terrainInfo?}
   */
  canPlaceBuilding(position, dimensions, overrides = {}) {
    const config = { ...this.config, ...overrides };
    const { x, z } = position;
    const { width = 1, depth = 1 } = dimensions;

    // Check grid manager constraints
    const { y = 0, height = 1 } = dimensions;
    const boundsCheck = this.gridManager.validateBounds(x, y, z);
    if (!boundsCheck.valid) {
      return {
        canPlace: false,
        reason: boundsCheck.error
      };
    }

    const regionCheck = this.gridManager.isRegionFree(x, y, z, width, height, depth);
    if (!regionCheck.free) {
      return {
        canPlace: false,
        reason: 'Region occupied',
        occupiedCells: regionCheck.occupiedCells
      };
    }

    // Check terrain constraints if available
    if (this.terrainSystem) {
      try {
        const flatCheck = this.terrainSystem.isRegionFlat(
          x, z, width, depth, config.maxSlopeTolerance
        );

        // If not flat and auto-flatten disabled, can't place
        if (!flatCheck.flat && !config.autoFlatten && config.requireFlat) {
          return {
            canPlace: false,
            reason: `Terrain too steep (${flatCheck.heightDiff} height difference)`,
            terrainInfo: flatCheck
          };
        }

        // Check elevation range
        const avgHeight = this.terrainSystem.terrainManager.getRegionAverageHeight(
          x, z, width, depth
        );

        if (avgHeight < config.minBuildingElevation ||
            avgHeight > config.maxBuildingElevation) {
          return {
            canPlace: false,
            reason: `Elevation ${avgHeight} out of acceptable range`,
            terrainInfo: { ...flatCheck, avgHeight }
          };
        }

        return {
          canPlace: true,
          terrainInfo: { ...flatCheck, avgHeight },
          willFlattenTerrain: !flatCheck.flat && config.autoFlatten
        };
      } catch (error) {
        return {
          canPlace: false,
          reason: `Terrain check failed: ${error.message}`
        };
      }
    }

    // No terrain system - can place if grid manager says ok
    return { canPlace: true };
  }

  /**
   * Get terrain height at a position
   * @param {number} x - Tile X
   * @param {number} z - Tile Z
   * @returns {number} Height (0 if no terrain system)
   */
  getTerrainHeight(x, z) {
    if (!this.terrainSystem) return 0;
    return this.terrainSystem.getHeight(x, z);
  }

  /**
   * Get terrain info for a building footprint
   * @param {number} x - Start X
   * @param {number} z - Start Z
   * @param {number} width - Building width
   * @param {number} depth - Building depth
   * @returns {object} Terrain info
   */
  getTerrainInfo(x, z, width, depth) {
    if (!this.terrainSystem) {
      return {
        hasTerrainSystem: false,
        avgHeight: 0
      };
    }

    const flatCheck = this.terrainSystem.isRegionFlat(x, z, width, depth, this.config.maxSlopeTolerance);
    const avgHeight = this.terrainSystem.terrainManager.getRegionAverageHeight(x, z, width, depth);

    return {
      hasTerrainSystem: true,
      flat: flatCheck.flat,
      minHeight: flatCheck.minHeight,
      maxHeight: flatCheck.maxHeight,
      heightDiff: flatCheck.heightDiff,
      avgHeight,
      slopeTolerance: this.config.maxSlopeTolerance
    };
  }

  /**
   * Enable/disable auto-flatten
   * @param {boolean} enabled
   */
  setAutoFlatten(enabled) {
    this.config.autoFlatten = enabled;
  }

  /**
   * Get current config
   * @returns {object}
   */
  getConfig() {
    return { ...this.config };
  }
}
