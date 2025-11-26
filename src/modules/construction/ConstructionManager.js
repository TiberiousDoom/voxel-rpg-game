/**
 * ConstructionManager.js - Manages all construction sites and blueprints
 *
 * Central manager for the construction system:
 * - Blueprint library management
 * - Construction site creation and tracking
 * - Work assignment for haulers and builders
 * - Integration with voxel world for block placement
 *
 * Part of Phase 4: Blueprint & Construction System
 *
 * Usage:
 *   const manager = new ConstructionManager({ voxelWorld });
 *   manager.registerBlueprint(myBlueprint);
 *   const site = manager.placeBlueprint('wooden_house', { x: 10, y: 10, z: 0 });
 */

import { Blueprint, BlueprintCategory, BlueprintTier } from './Blueprint.js';
import { ConstructionSite, SiteStatus, BlockStatus } from './ConstructionSite.js';

export class ConstructionManager {
  /**
   * Create a construction manager
   * @param {object} options - Configuration options
   */
  constructor(options = {}) {
    this.config = {
      maxActiveSites: options.maxActiveSites || 10,
      reservationTimeout: options.reservationTimeout || 60000,
      ...options
    };

    // Reference to voxel world for block placement
    this.voxelWorld = options.voxelWorld || null;

    // Blueprint library
    this.blueprints = new Map();  // Map<id, Blueprint>

    // Active construction sites
    this.sites = new Map();  // Map<id, ConstructionSite>

    // Spatial index for sites
    this.sitesByChunk = new Map();  // Map<chunkKey, Set<siteId>>

    // Statistics
    this.stats = {
      totalBuilt: 0,
      totalCancelled: 0,
      blocksPlaced: 0
    };
  }

  /**
   * Set the voxel world reference
   * @param {VoxelWorld} voxelWorld
   */
  setVoxelWorld(voxelWorld) {
    this.voxelWorld = voxelWorld;
  }

  // ==================== Blueprint Management ====================

  /**
   * Register a blueprint in the library
   * @param {Blueprint} blueprint
   */
  registerBlueprint(blueprint) {
    this.blueprints.set(blueprint.id, blueprint);
  }

  /**
   * Get a blueprint by ID
   * @param {string} blueprintId
   * @returns {Blueprint | null}
   */
  getBlueprint(blueprintId) {
    return this.blueprints.get(blueprintId) || null;
  }

  /**
   * Get all blueprints
   * @returns {Array<Blueprint>}
   */
  getAllBlueprints() {
    return Array.from(this.blueprints.values());
  }

  /**
   * Get blueprints by category
   * @param {string} category - BlueprintCategory
   * @returns {Array<Blueprint>}
   */
  getBlueprintsByCategory(category) {
    return this.getAllBlueprints().filter(bp => bp.category === category);
  }

  /**
   * Get blueprints by tier
   * @param {string} tier - BlueprintTier
   * @returns {Array<Blueprint>}
   */
  getBlueprintsByTier(tier) {
    return this.getAllBlueprints().filter(bp => bp.tier === tier);
  }

  /**
   * Get available blueprints (can be built with current resources)
   * @param {object} resources - Available resources {material: quantity}
   * @returns {Array<{blueprint: Blueprint, canBuild: boolean, missing: object}>}
   */
  getAvailableBlueprints(resources) {
    return this.getAllBlueprints().map(blueprint => {
      const check = blueprint.checkMaterials(resources);
      return {
        blueprint,
        canBuild: check.satisfied,
        missing: check.missing
      };
    });
  }

  // ==================== Construction Site Management ====================

  /**
   * Get chunk key for spatial indexing
   * @private
   */
  _getChunkKey(x, y) {
    const chunkX = Math.floor(x / 32);
    const chunkY = Math.floor(y / 32);
    return `${chunkX},${chunkY}`;
  }

  /**
   * Add site to spatial index
   * @private
   */
  _addToSpatialIndex(site) {
    const bounds = site.getBounds();
    const minChunkX = Math.floor(bounds.minX / 32);
    const maxChunkX = Math.floor(bounds.maxX / 32);
    const minChunkY = Math.floor(bounds.minY / 32);
    const maxChunkY = Math.floor(bounds.maxY / 32);

    for (let cy = minChunkY; cy <= maxChunkY; cy++) {
      for (let cx = minChunkX; cx <= maxChunkX; cx++) {
        const key = `${cx},${cy}`;
        if (!this.sitesByChunk.has(key)) {
          this.sitesByChunk.set(key, new Set());
        }
        this.sitesByChunk.get(key).add(site.id);
      }
    }
  }

  /**
   * Remove site from spatial index
   * @private
   */
  _removeFromSpatialIndex(site) {
    for (const [key, ids] of this.sitesByChunk) {
      ids.delete(site.id);
      if (ids.size === 0) {
        this.sitesByChunk.delete(key);
      }
    }
  }

  /**
   * Place a blueprint to start construction
   * @param {string} blueprintId - Blueprint ID
   * @param {object} position - {x, y, z} world position
   * @param {object} options - Additional options
   * @returns {ConstructionSite | null}
   */
  placeBlueprint(blueprintId, position, options = {}) {
    const blueprint = this.getBlueprint(blueprintId);
    if (!blueprint) {
      console.warn(`Blueprint not found: ${blueprintId}`);
      return null;
    }

    // Check if placement is valid
    if (!this.canPlaceAt(blueprint, position, options.rotation || 0)) {
      console.warn(`Cannot place blueprint at position: ${JSON.stringify(position)}`);
      return null;
    }

    // Create construction site
    const site = new ConstructionSite({
      blueprint,
      position,
      rotation: options.rotation || 0,
      priority: options.priority || 50
    });

    // Register site
    this.sites.set(site.id, site);
    this._addToSpatialIndex(site);

    return site;
  }

  /**
   * Check if a blueprint can be placed at a position
   * @param {Blueprint} blueprint - Blueprint to check
   * @param {object} position - {x, y, z}
   * @param {number} rotation - Rotation (0, 90, 180, 270)
   * @returns {boolean}
   */
  canPlaceAt(blueprint, position, rotation = 0) {
    // Check for overlapping construction sites
    for (const site of this.sites.values()) {
      if (!site.isActive()) continue;

      const bounds = site.getBounds();
      const newBounds = this._calculateBounds(blueprint, position, rotation);

      if (this._boundsOverlap(bounds, newBounds)) {
        return false;
      }
    }

    // Check terrain if voxel world is available
    if (this.voxelWorld && blueprint.requiresFoundation) {
      // Verify ground is solid at the base level
      const footprint = blueprint.getFootprint();
      for (const { x, y } of footprint) {
        let relX = x, relY = y;

        // Apply rotation
        if (rotation === 90) {
          [relX, relY] = [relY, -relX + blueprint.dimensions.width - 1];
        } else if (rotation === 180) {
          relX = -relX + blueprint.dimensions.width - 1;
          relY = -relY + blueprint.dimensions.depth - 1;
        } else if (rotation === 270) {
          [relX, relY] = [-relY + blueprint.dimensions.depth - 1, relX];
        }

        const worldX = position.x + relX;
        const worldY = position.y + relY;
        const groundZ = position.z - 1;

        // Check for solid ground below foundation
        if (groundZ >= 0 && !this.voxelWorld.isSolid(worldX, worldY, groundZ)) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Calculate bounds for a blueprint at a position
   * @private
   */
  _calculateBounds(blueprint, position, rotation) {
    let width = blueprint.dimensions.width;
    let depth = blueprint.dimensions.depth;

    if (rotation === 90 || rotation === 270) {
      [width, depth] = [depth, width];
    }

    return {
      minX: position.x,
      minY: position.y,
      minZ: position.z,
      maxX: position.x + width - 1,
      maxY: position.y + depth - 1,
      maxZ: position.z + blueprint.dimensions.height - 1
    };
  }

  /**
   * Check if two bounds overlap
   * @private
   */
  _boundsOverlap(a, b) {
    return a.minX <= b.maxX && a.maxX >= b.minX &&
           a.minY <= b.maxY && a.maxY >= b.minY &&
           a.minZ <= b.maxZ && a.maxZ >= b.minZ;
  }

  /**
   * Get a construction site by ID
   * @param {string} siteId
   * @returns {ConstructionSite | null}
   */
  getSite(siteId) {
    return this.sites.get(siteId) || null;
  }

  /**
   * Get all construction sites
   * @returns {Array<ConstructionSite>}
   */
  getAllSites() {
    return Array.from(this.sites.values());
  }

  /**
   * Get active construction sites
   * @returns {Array<ConstructionSite>}
   */
  getActiveSites() {
    return this.getAllSites().filter(site => site.isActive());
  }

  /**
   * Get sites sorted by priority
   * @returns {Array<ConstructionSite>}
   */
  getSitesByPriority() {
    return this.getActiveSites().sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get site at a world position
   * @param {number} x
   * @param {number} y
   * @param {number} z
   * @returns {ConstructionSite | null}
   */
  getSiteAt(x, y, z) {
    for (const site of this.sites.values()) {
      const block = site.getBlock(x, y, z);
      if (block) return site;
    }
    return null;
  }

  /**
   * Cancel a construction site
   * @param {string} siteId
   * @returns {boolean}
   */
  cancelSite(siteId) {
    const site = this.sites.get(siteId);
    if (!site) return false;

    site.cancel();
    this._removeFromSpatialIndex(site);
    this.stats.totalCancelled++;

    return true;
  }

  /**
   * Remove a completed or cancelled site
   * @param {string} siteId
   * @returns {boolean}
   */
  removeSite(siteId) {
    const site = this.sites.get(siteId);
    if (!site) return false;

    if (site.isActive()) {
      // Can't remove active sites, cancel first
      return false;
    }

    this._removeFromSpatialIndex(site);
    this.sites.delete(siteId);
    return true;
  }

  // ==================== Work Assignment ====================

  /**
   * Find work for a hauler NPC
   * @param {object} npcPosition - {x, y} NPC position
   * @param {string} npcId - NPC ID
   * @returns {{site: ConstructionSite, block: ConstructionBlock, material: object} | null}
   */
  findHaulingWork(npcPosition, npcId) {
    const sites = this.getSitesByPriority();

    // Find nearest site with blocks needing materials
    let bestResult = null;
    let bestDistance = Infinity;

    for (const site of sites) {
      const reservation = site.reserveBlockForDelivery(npcId);
      if (reservation) {
        const distance = Math.sqrt(
          Math.pow(site.materialDropoff.x - npcPosition.x, 2) +
          Math.pow(site.materialDropoff.y - npcPosition.y, 2)
        );

        if (distance < bestDistance) {
          // Release previous reservation if we found a better one
          if (bestResult) {
            bestResult.block.cancelReservation(npcId);
          }

          bestDistance = distance;
          bestResult = {
            site,
            block: reservation.block,
            material: reservation.material
          };
        } else {
          // Release this reservation, we have a closer one
          reservation.block.cancelReservation(npcId);
        }
      }
    }

    return bestResult;
  }

  /**
   * Find work for a builder NPC
   * @param {object} npcPosition - {x, y} NPC position
   * @param {string} npcId - NPC ID
   * @returns {{site: ConstructionSite, block: ConstructionBlock} | null}
   */
  findBuildingWork(npcPosition, npcId) {
    const sites = this.getSitesByPriority();

    // Find nearest site with blocks ready to build
    let bestResult = null;
    let bestDistance = Infinity;

    for (const site of sites) {
      const block = site.reserveBlockForBuilding(npcId);
      if (block) {
        const distance = Math.sqrt(
          Math.pow(block.position.x - npcPosition.x, 2) +
          Math.pow(block.position.y - npcPosition.y, 2)
        );

        if (distance < bestDistance) {
          // Release previous assignment if we found a better one
          if (bestResult) {
            bestResult.block.releaseBuilder(npcId);
          }

          bestDistance = distance;
          bestResult = { site, block };
        } else {
          // Release this assignment, we have a closer one
          block.releaseBuilder(npcId);
        }
      }
    }

    return bestResult;
  }

  /**
   * Complete a block and place it in the voxel world
   * @param {string} siteId - Site ID
   * @param {number} x - Block world X
   * @param {number} y - Block world Y
   * @param {number} z - Block world Z
   * @param {string} npcId - Builder NPC ID
   * @returns {boolean}
   */
  completeBlock(siteId, x, y, z, npcId = null) {
    const site = this.sites.get(siteId);
    if (!site) return false;

    const block = site.getBlock(x, y, z);
    if (!block) return false;

    // Place block in voxel world
    if (this.voxelWorld) {
      this.voxelWorld.setBlock(x, y, z, block.blueprintBlock.blockType);

      // Set metadata (rotation, etc.)
      if (block.blueprintBlock.rotation !== 0) {
        this.voxelWorld.setMetadata(x, y, z, block.blueprintBlock.rotation);
      }
    }

    // Mark block as completed
    site.completeBlock(x, y, z, npcId);
    this.stats.blocksPlaced++;

    // Check if site is now complete
    if (site.isComplete()) {
      this.stats.totalBuilt++;
    }

    return true;
  }

  /**
   * Release all reservations for an NPC
   * @param {string} npcId - NPC ID
   */
  releaseAllNpcReservations(npcId) {
    for (const site of this.sites.values()) {
      site.releaseAllReservations(npcId);
    }
  }

  // ==================== Rendering Support ====================

  /**
   * Get all ghost blocks for rendering
   * @param {number} currentZ - Current Z-level being viewed
   * @returns {Array<{x, y, z, blockType, status}>}
   */
  getAllGhostBlocks(currentZ = null) {
    const allGhosts = [];

    for (const site of this.sites.values()) {
      if (!site.isActive()) continue;

      const ghosts = site.getGhostBlocks();
      for (const ghost of ghosts) {
        if (currentZ === null || ghost.z === currentZ || ghost.z === currentZ + 1) {
          allGhosts.push(ghost);
        }
      }
    }

    return allGhosts;
  }

  // ==================== Statistics ====================

  /**
   * Get overall statistics
   * @returns {object}
   */
  getStats() {
    let activeSites = 0;
    let totalProgress = 0;
    let totalBlocks = 0;
    let completedBlocks = 0;

    for (const site of this.sites.values()) {
      if (site.isActive()) {
        activeSites++;
        totalProgress += site.getProgress();
      }
      totalBlocks += site.stats.totalBlocks;
      completedBlocks += site.stats.completedBlocks;
    }

    return {
      ...this.stats,
      totalSites: this.sites.size,
      activeSites,
      averageProgress: activeSites > 0 ? totalProgress / activeSites : 0,
      totalBlocks,
      completedBlocks,
      blueprintCount: this.blueprints.size
    };
  }

  // ==================== Serialization ====================

  /**
   * Export manager data
   * @returns {object}
   */
  toJSON() {
    const blueprints = {};
    for (const [id, blueprint] of this.blueprints) {
      blueprints[id] = blueprint.toJSON();
    }

    const sites = {};
    for (const [id, site] of this.sites) {
      sites[id] = site.toJSON();
    }

    return {
      config: this.config,
      blueprints,
      sites,
      stats: this.stats
    };
  }

  /**
   * Import manager data
   * @param {object} data
   * @returns {ConstructionManager}
   */
  static fromJSON(data) {
    const manager = new ConstructionManager(data.config);

    // Restore blueprints
    if (data.blueprints) {
      for (const [id, bpData] of Object.entries(data.blueprints)) {
        const blueprint = Blueprint.fromJSON(bpData);
        manager.blueprints.set(id, blueprint);
      }
    }

    // Restore sites
    if (data.sites) {
      for (const [id, siteData] of Object.entries(data.sites)) {
        const blueprint = manager.blueprints.get(siteData.blueprintId);
        if (blueprint) {
          const site = ConstructionSite.fromJSON(siteData, blueprint);
          manager.sites.set(id, site);
          manager._addToSpatialIndex(site);
        }
      }
    }

    // Restore stats
    if (data.stats) {
      manager.stats = { ...manager.stats, ...data.stats };
    }

    return manager;
  }
}
