/**
 * RiverSystem.js
 * Generates flowing rivers using elevation-based pathfinding
 *
 * Phase 3B: Water Features Enhancement
 *
 * Features:
 * - Rivers flow from high to low elevation
 * - Pathfinding to find natural flow paths
 * - River width variation based on flow
 * - River merging and tributaries
 * - Delta formation at ocean/lake connections
 */

import { NoiseGenerator } from './NoiseGenerator.js';

/**
 * River segment (part of a river path)
 */
export class RiverSegment {
  constructor(x, z, width, flow) {
    this.x = x;
    this.z = z;
    this.width = width; // River width at this point
    this.flow = flow; // Flow strength (0-1)
  }
}

/**
 * River instance
 */
export class River {
  constructor(id, sourceX, sourceZ) {
    this.id = id;
    this.source = { x: sourceX, z: sourceZ };
    this.segments = []; // Array of RiverSegment
    this.length = 0;
    this.endType = null; // 'ocean', 'lake', 'dry'
    this.createdAt = Date.now();
  }

  /**
   * Add segment to river
   */
  addSegment(x, z, width, flow) {
    this.segments.push(new RiverSegment(x, z, width, flow));
    this.length = this.segments.length;
  }

  /**
   * Check if position is in river
   */
  containsPosition(x, z) {
    for (const segment of this.segments) {
      const halfWidth = segment.width / 2;
      if (Math.abs(x - segment.x) <= halfWidth &&
          Math.abs(z - segment.z) <= halfWidth) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get river width at position (0 if outside)
   */
  getWidthAt(x, z) {
    for (const segment of this.segments) {
      const halfWidth = segment.width / 2;
      if (Math.abs(x - segment.x) <= halfWidth &&
          Math.abs(z - segment.z) <= halfWidth) {
        return segment.width;
      }
    }
    return 0;
  }

  /**
   * Get flow strength at position (0-1, 0 if outside)
   */
  getFlowAt(x, z) {
    for (const segment of this.segments) {
      const halfWidth = segment.width / 2;
      if (Math.abs(x - segment.x) <= halfWidth &&
          Math.abs(z - segment.z) <= halfWidth) {
        return segment.flow;
      }
    }
    return 0;
  }
}

/**
 * RiverSystem - Generates and manages rivers
 */
export class RiverSystem {
  constructor(terrainSystem, options = {}) {
    this.terrainSystem = terrainSystem;

    this.config = {
      enabled: options.enabled !== false,
      riverDensity: options.riverDensity || 0.02, // Chance per region
      minElevation: options.minElevation || 6, // Min elevation for source
      maxRiverLength: options.maxRiverLength || 200, // Max segments
      minRiverWidth: options.minRiverWidth || 1,
      maxRiverWidth: options.maxRiverWidth || 4,
      flowAccumulation: options.flowAccumulation !== false, // Width increases downstream
      allowMerging: options.allowMerging !== false,
      regionSize: options.regionSize || 128, // Size of regions for river generation
      ...options,
    };

    // Storage
    this.rivers = new Map(); // riverId -> River
    this.riverGrid = new Map(); // posKey -> riverId (for fast lookups)
    this.generatedRegions = new Set(); // Track regions that have been generated

    // Noise for source placement
    this.sourceNoise = new NoiseGenerator(terrainSystem?.seed || Date.now());

    this.nextRiverId = 0;

    // Statistics
    this.stats = {
      riversGenerated: 0,
      totalLength: 0,
      averageLength: 0,
    };
  }

  /**
   * Generate rivers for a region
   */
  generateRiversForRegion(regionX, regionZ) {
    if (!this.config.enabled || !this.terrainSystem) return [];

    // Check if region already generated (caching)
    const regionKey = `${regionX},${regionZ}`;
    if (this.generatedRegions.has(regionKey)) {
      return []; // Already generated, skip
    }
    this.generatedRegions.add(regionKey);

    const rivers = [];
    const regionSize = this.config.regionSize;
    const worldX = regionX * regionSize;
    const worldZ = regionZ * regionSize;

    // Use noise to determine if river should spawn
    const spawnChance = this.sourceNoise.noise2D(regionX * 0.1, regionZ * 0.1) * 0.5 + 0.5;

    if (spawnChance < this.config.riverDensity) {
      return rivers;
    }

    // Find suitable source position (high elevation)
    const sourcePos = this.findRiverSource(worldX, worldZ, regionSize);

    if (sourcePos) {
      const river = this.generateRiver(sourcePos.x, sourcePos.z);
      if (river && river.length > 10) { // Only keep rivers longer than 10 segments
        rivers.push(river);
        this.rivers.set(river.id, river);

        // Update grid
        for (const segment of river.segments) {
          const key = `${segment.x},${segment.z}`;
          this.riverGrid.set(key, river.id);
        }

        // Update stats
        this.stats.riversGenerated++;
        this.stats.totalLength += river.length;
        this.stats.averageLength = this.stats.totalLength / this.stats.riversGenerated;
      }
    }

    return rivers;
  }

  /**
   * Find suitable river source in region
   */
  findRiverSource(startX, startZ, regionSize) {
    const samples = 20;
    let bestPos = null;
    let bestHeight = this.config.minElevation;

    for (let i = 0; i < samples; i++) {
      const x = startX + Math.floor(Math.random() * regionSize);
      const z = startZ + Math.floor(Math.random() * regionSize);
      const height = this.terrainSystem.getHeight(x, z);

      if (height > bestHeight) {
        bestHeight = height;
        bestPos = { x, z };
      }
    }

    return bestPos;
  }

  /**
   * Generate a single river from source
   * Uses greedy pathfinding: always flow downhill
   */
  generateRiver(sourceX, sourceZ) {
    const river = new River(`river_${this.nextRiverId++}`, sourceX, sourceZ);

    let currentX = sourceX;
    let currentZ = sourceZ;
    let currentHeight = this.terrainSystem.getHeight(currentX, currentZ);
    let width = this.config.minRiverWidth;
    let flow = 1.0;

    const visited = new Set();
    visited.add(`${currentX},${currentZ}`);

    river.addSegment(currentX, currentZ, width, flow);

    for (let step = 0; step < this.config.maxRiverLength; step++) {
      // Find next position (steepest descent)
      const next = this.findNextRiverPosition(currentX, currentZ, currentHeight, visited);

      if (!next) {
        // River ends (no downhill path or reached ocean/lake)
        river.endType = 'dry';
        break;
      }

      currentX = next.x;
      currentZ = next.z;
      currentHeight = next.height;
      visited.add(`${currentX},${currentZ}`);

      // Increase width with flow accumulation
      if (this.config.flowAccumulation) {
        width = Math.min(this.config.maxRiverWidth, width + 0.01);
      }

      // Check if reached water body
      if (currentHeight <= 3) { // Water level
        river.endType = 'ocean';
        break;
      }

      // Check if merged with another river
      const existingRiver = this.getRiverAt(currentX, currentZ);
      if (existingRiver && this.config.allowMerging) {
        river.endType = 'merge';
        break;
      }

      river.addSegment(currentX, currentZ, width, flow);
    }

    return river;
  }

  /**
   * Find next river position (steepest downhill)
   */
  findNextRiverPosition(x, z, currentHeight, visited) {
    const directions = [
      { dx: -1, dz: 0 },  // West
      { dx: 1, dz: 0 },   // East
      { dx: 0, dz: -1 },  // North
      { dx: 0, dz: 1 },   // South
      { dx: -1, dz: -1 }, // NW
      { dx: 1, dz: -1 },  // NE
      { dx: -1, dz: 1 },  // SW
      { dx: 1, dz: 1 },   // SE
    ];

    let bestNext = null;
    let bestHeight = currentHeight;

    for (const dir of directions) {
      const nextX = x + dir.dx;
      const nextZ = z + dir.dz;
      const key = `${nextX},${nextZ}`;

      // Skip visited
      if (visited.has(key)) continue;

      const nextHeight = this.terrainSystem.getHeight(nextX, nextZ);

      // Must be downhill
      if (nextHeight < bestHeight) {
        bestHeight = nextHeight;
        bestNext = { x: nextX, z: nextZ, height: nextHeight };
      }
    }

    return bestNext;
  }

  /**
   * Get river at position
   */
  getRiverAt(x, z) {
    const key = `${x},${z}`;
    const riverId = this.riverGrid.get(key);
    return riverId ? this.rivers.get(riverId) : null;
  }

  /**
   * Check if position is river
   */
  isRiver(x, z) {
    return this.getRiverAt(x, z) !== null;
  }

  /**
   * Get all rivers in region
   */
  getRiversInRegion(startX, startZ, width, depth) {
    const rivers = new Set();

    for (let z = startZ; z < startZ + depth; z++) {
      for (let x = startX; x < startX + width; x++) {
        const river = this.getRiverAt(x, z);
        if (river) rivers.add(river);
      }
    }

    return Array.from(rivers);
  }

  /**
   * Generate rivers for viewport
   * Call this lazily when chunks are loaded
   */
  generateRiversForArea(startX, startZ, width, depth) {
    const regionSize = this.config.regionSize;

    const minRegionX = Math.floor(startX / regionSize);
    const maxRegionX = Math.floor((startX + width) / regionSize);
    const minRegionZ = Math.floor(startZ / regionSize);
    const maxRegionZ = Math.floor((startZ + depth) / regionSize);

    for (let regionZ = minRegionZ; regionZ <= maxRegionZ; regionZ++) {
      for (let regionX = minRegionX; regionX <= maxRegionX; regionX++) {
        this.generateRiversForRegion(regionX, regionZ);
      }
    }
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      ...this.stats,
      totalRivers: this.rivers.size,
    };
  }

  /**
   * Clear all rivers
   */
  clear() {
    this.rivers.clear();
    this.riverGrid.clear();
    this.nextRiverId = 0;
    this.stats = {
      riversGenerated: 0,
      totalLength: 0,
      averageLength: 0,
    };
  }
}

export default RiverSystem;
