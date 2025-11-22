/**
 * PropManager.js - Environmental Prop Management
 *
 * Manages placement, rendering, and interaction with environmental props
 * (trees, rocks, bushes, ore veins, herbs, etc.) using biome-based rules.
 *
 * Part of Phase 3: Environmental Props & Resources
 *
 * Features:
 * - Poisson disc sampling for natural distribution
 * - Biome-based prop density and types
 * - Prop harvesting and resource drops
 * - Chunk-based prop generation (on-demand)
 * - Spatial partitioning for efficient queries
 * - Prop persistence (save/load)
 *
 * Usage:
 *   const propManager = new PropManager(terrainSystem, biomeManager, propDefinitions);
 *   propManager.generatePropsForChunk(chunkX, chunkZ);
 *   const props = propManager.getPropsInRegion(x, z, width, depth);
 */

/**
 * Prop instance
 */
class Prop {
  constructor(id, type, x, z, variant, config) {
    this.id = id;
    this.type = type;           // 'tree', 'rock', 'bush', etc.
    this.x = x;
    this.z = z;
    this.variant = variant;     // 'oak', 'pine', 'iron_vein', etc.
    this.config = config;       // Prop definition

    // State
    this.health = config.health || 100;
    this.maxHealth = config.health || 100;
    this.harvestable = config.harvestable !== false;
    this.resources = config.resources || [];

    // Rendering
    this.sprite = config.sprite || variant;
    this.width = config.width || 1;
    this.height = config.height || 1;

    // Metadata
    this.createdAt = Date.now();
    this.lastHarvested = null;
  }

  /**
   * Check if prop is destroyed
   */
  isDestroyed() {
    return this.health <= 0;
  }

  /**
   * Damage the prop
   */
  damage(amount) {
    this.health = Math.max(0, this.health - amount);
    return this.isDestroyed();
  }

  /**
   * Get resource drops when harvested
   */
  getResourceDrops() {
    if (!this.harvestable) return [];

    return this.resources.map(resource => ({
      type: resource.type,
      amount: Math.floor(
        resource.min + Math.random() * (resource.max - resource.min + 1)
      )
    }));
  }

  /**
   * Serialize prop
   */
  toJSON() {
    return {
      id: this.id,
      type: this.type,
      x: this.x,
      z: this.z,
      variant: this.variant,
      health: this.health,
      lastHarvested: this.lastHarvested
    };
  }
}

/**
 * Poisson disc sampler for natural prop distribution
 */
class PoissonDiscSampler {
  /**
   * Generate points using Poisson disc sampling
   * @param {number} width - Region width
   * @param {number} height - Region height
   * @param {number} minDistance - Minimum distance between points
   * @param {number} maxAttempts - Max attempts per point (default: 30)
   * @param {function} isValidPoint - Optional validation function
   * @returns {Array<{x, y}>} Array of points
   */
  static sample(width, height, minDistance, maxAttempts = 30, isValidPoint = null) {
    const cellSize = minDistance / Math.sqrt(2);
    const gridWidth = Math.ceil(width / cellSize);
    const gridHeight = Math.ceil(height / cellSize);
    const grid = new Array(gridWidth * gridHeight).fill(null);

    const points = [];
    const activeList = [];

    // Helper: Get grid cell
    const getCell = (x, y) => {
      const cellX = Math.floor(x / cellSize);
      const cellY = Math.floor(y / cellSize);
      if (cellX < 0 || cellX >= gridWidth || cellY < 0 || cellY >= gridHeight) {
        return null;
      }
      return grid[cellY * gridWidth + cellX];
    };

    // Helper: Set grid cell
    const setCell = (x, y, point) => {
      const cellX = Math.floor(x / cellSize);
      const cellY = Math.floor(y / cellSize);
      if (cellX >= 0 && cellX < gridWidth && cellY >= 0 && cellY < gridHeight) {
        grid[cellY * gridWidth + cellX] = point;
      }
    };

    // Helper: Check if point is valid (not too close to others)
    const isValid = (x, y) => {
      if (x < 0 || x >= width || y < 0 || y >= height) return false;
      if (isValidPoint && !isValidPoint(x, y)) return false;

      // Check surrounding cells
      const cellX = Math.floor(x / cellSize);
      const cellY = Math.floor(y / cellSize);

      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const nx = cellX + dx;
          const ny = cellY + dy;

          if (nx < 0 || nx >= gridWidth || ny < 0 || ny >= gridHeight) continue;

          const neighbor = grid[ny * gridWidth + nx];
          if (neighbor) {
            const dist = Math.sqrt(
              (x - neighbor.x) ** 2 + (y - neighbor.y) ** 2
            );
            if (dist < minDistance) return false;
          }
        }
      }

      return true;
    };

    // Start with random point
    const firstPoint = {
      x: Math.random() * width,
      y: Math.random() * height
    };
    points.push(firstPoint);
    activeList.push(firstPoint);
    setCell(firstPoint.x, firstPoint.y, firstPoint);

    // Generate points
    while (activeList.length > 0) {
      const index = Math.floor(Math.random() * activeList.length);
      const point = activeList[index];
      let found = false;

      for (let i = 0; i < maxAttempts; i++) {
        // Generate random point in annulus around current point
        const angle = Math.random() * Math.PI * 2;
        const radius = minDistance + Math.random() * minDistance;
        const newX = point.x + Math.cos(angle) * radius;
        const newY = point.y + Math.sin(angle) * radius;

        if (isValid(newX, newY)) {
          const newPoint = { x: newX, y: newY };
          points.push(newPoint);
          activeList.push(newPoint);
          setCell(newX, newY, newPoint);
          found = true;
          break;
        }
      }

      if (!found) {
        activeList.splice(index, 1);
      }
    }

    return points;
  }
}

export class PropManager {
  /**
   * Create a prop manager
   * @param {TerrainSystem} terrainSystem - Terrain system for height/biome data
   * @param {BiomeManager} biomeManager - Biome manager for biome-specific rules
   * @param {object} propDefinitions - Prop type definitions
   * @param {object} options - Configuration options
   */
  constructor(terrainSystem, biomeManager, propDefinitions = {}, options = {}) {
    this.terrainSystem = terrainSystem;
    this.biomeManager = biomeManager;
    this.propDefinitions = propDefinitions;

    this.config = {
      chunkSize: terrainSystem?.config.chunkSize || 32,
      poissonAttempts: options.poissonAttempts || 30,
      minPropDistance: options.minPropDistance || 2,
      maxPropsPerChunk: options.maxPropsPerChunk || 200,
      enableRegeneration: options.enableRegeneration !== false,
      regenerationTime: options.regenerationTime || 300000, // 5 minutes
      ...options
    };

    // Prop storage: Map<chunkKey, Array<Prop>>
    this.chunkProps = new Map();

    // All props indexed by ID
    this.propsById = new Map();

    // Next prop ID
    this.nextPropId = 1;

    // Statistics
    this.stats = {
      chunksGenerated: 0,
      propsCreated: 0,
      propsHarvested: 0,
      resourcesGathered: {}
    };
  }

  /**
   * Generate props for a chunk
   * @param {number} chunkX - Chunk X coordinate
   * @param {number} chunkZ - Chunk Z coordinate
   * @returns {Array<Prop>} Generated props
   */
  generatePropsForChunk(chunkX, chunkZ) {
    const chunkKey = `${chunkX},${chunkZ}`;

    // Check if already generated
    if (this.chunkProps.has(chunkKey)) {
      return this.chunkProps.get(chunkKey);
    }

    const props = [];
    const chunkSize = this.config.chunkSize;
    const startX = chunkX * chunkSize;
    const startZ = chunkZ * chunkSize;

    // Get biome-specific prop rules for this chunk
    const centerX = startX + chunkSize / 2;
    const centerZ = startZ + chunkSize / 2;
    const biome = this.terrainSystem?.getBiome(centerX, centerZ) || 'plains';
    const biomeConfig = this.biomeManager?.getBiomeConfig(biome);

    if (!biomeConfig || !biomeConfig.props) {
      this.chunkProps.set(chunkKey, props);
      return props;
    }

    // Generate props for each prop type in biome
    for (const propRule of biomeConfig.props) {
      const propType = propRule.type;
      const density = propRule.density || 0.1;
      const minDistance = propRule.minDistance || this.config.minPropDistance;
      const variants = propRule.variants || [propType];

      // Calculate expected prop count
      const expectedCount = Math.floor(chunkSize * chunkSize * density);

      if (expectedCount === 0) continue;

      // Use Poisson disc sampling for natural distribution
      const points = PoissonDiscSampler.sample(
        chunkSize,
        chunkSize,
        minDistance,
        this.config.poissonAttempts,
        (x, z) => {
          // Validate point (check terrain, existing props, etc.)
          const worldX = startX + Math.floor(x);
          const worldZ = startZ + Math.floor(z);
          return this.isValidPropLocation(worldX, worldZ, propType);
        }
      );

      // Limit to expected count (Poisson can generate more)
      const selectedPoints = points.slice(0, expectedCount);

      // Create props at sampled points
      for (const point of selectedPoints) {
        const worldX = startX + Math.floor(point.x);
        const worldZ = startZ + Math.floor(point.y);

        // Random variant
        const variant = variants[Math.floor(Math.random() * variants.length)];

        // Get prop definition
        const propDef = this.propDefinitions[propType] || this.getDefaultPropDefinition(propType);

        // Create prop
        const prop = new Prop(
          `prop_${this.nextPropId++}`,
          propType,
          worldX,
          worldZ,
          variant,
          propDef
        );

        props.push(prop);
        this.propsById.set(prop.id, prop);
        this.stats.propsCreated++;
      }
    }

    // Store props for this chunk
    this.chunkProps.set(chunkKey, props);
    this.stats.chunksGenerated++;

    return props;
  }

  /**
   * Check if location is valid for prop placement
   * @private
   */
  isValidPropLocation(x, z, propType) {
    if (!this.terrainSystem) return true;

    try {
      const height = this.terrainSystem.getHeight(x, z);

      // Water check (height <= 3 is water in most biomes)
      if (height <= 3 && propType !== 'water_lily' && propType !== 'reed') {
        return false;
      }

      // Very steep terrain (for most props)
      if (propType !== 'rock' && propType !== 'cliff_moss') {
        const neighbors = [
          this.terrainSystem.getHeight(x + 1, z),
          this.terrainSystem.getHeight(x - 1, z),
          this.terrainSystem.getHeight(x, z + 1),
          this.terrainSystem.getHeight(x, z - 1)
        ];

        for (const nHeight of neighbors) {
          if (Math.abs(height - nHeight) > 2) {
            return false; // Too steep
          }
        }
      }

      return true;
    } catch (e) {
      return true; // If terrain check fails, allow placement
    }
  }

  /**
   * Get default prop definition if not in definitions
   * @private
   */
  getDefaultPropDefinition(propType) {
    const defaults = {
      tree: {
        sprite: 'tree',
        health: 100,
        width: 1,
        height: 1,
        harvestable: true,
        resources: [{ type: 'wood', min: 3, max: 8 }]
      },
      rock: {
        sprite: 'rock',
        health: 150,
        width: 1,
        height: 1,
        harvestable: true,
        resources: [{ type: 'stone', min: 2, max: 5 }]
      },
      ore_vein: {
        sprite: 'ore',
        health: 200,
        width: 1,
        height: 1,
        harvestable: true,
        resources: [{ type: 'iron', min: 1, max: 3 }]
      },
      herb: {
        sprite: 'herb',
        health: 20,
        width: 1,
        height: 1,
        harvestable: true,
        resources: [{ type: 'herb', min: 1, max: 2 }]
      },
      bush: {
        sprite: 'bush',
        health: 30,
        width: 1,
        height: 1,
        harvestable: true,
        resources: [{ type: 'berry', min: 1, max: 4 }]
      }
    };

    return defaults[propType] || {
      sprite: propType,
      health: 50,
      width: 1,
      height: 1,
      harvestable: false,
      resources: []
    };
  }

  /**
   * Get props in a region
   * @param {number} startX - Region start X
   * @param {number} startZ - Region start Z
   * @param {number} width - Region width
   * @param {number} depth - Region depth
   * @returns {Array<Prop>} Props in region
   */
  getPropsInRegion(startX, startZ, width, depth) {
    const props = [];
    const chunkSize = this.config.chunkSize;

    // Calculate chunk range
    const minChunkX = Math.floor(startX / chunkSize);
    const maxChunkX = Math.floor((startX + width) / chunkSize);
    const minChunkZ = Math.floor(startZ / chunkSize);
    const maxChunkZ = Math.floor((startZ + depth) / chunkSize);

    // Check each chunk
    for (let chunkZ = minChunkZ; chunkZ <= maxChunkZ; chunkZ++) {
      for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
        const chunkKey = `${chunkX},${chunkZ}`;
        let chunkProps = this.chunkProps.get(chunkKey);

        // Lazy generation: Generate props if chunk doesn't have them yet
        if (!chunkProps) {
          chunkProps = this.generatePropsForChunk(chunkX, chunkZ);
        }

        // Filter props in region
        for (const prop of chunkProps) {
          if (prop.x >= startX && prop.x < startX + width &&
              prop.z >= startZ && prop.z < startZ + depth) {
            props.push(prop);
          }
        }
      }
    }

    return props;
  }

  /**
   * Get prop at exact position
   * @param {number} x - Tile X
   * @param {number} z - Tile Z
   * @returns {Prop|null} Prop at position
   */
  getPropAt(x, z) {
    const props = this.getPropsInRegion(x, z, 1, 1);
    return props.find(p => p.x === x && p.z === z) || null;
  }

  /**
   * Get props within radius
   * @param {number} centerX - Center X
   * @param {number} centerZ - Center Z
   * @param {number} radius - Search radius
   * @returns {Array<Prop>} Props within radius
   */
  getPropsInRadius(centerX, centerZ, radius) {
    const props = this.getPropsInRegion(
      centerX - radius,
      centerZ - radius,
      radius * 2,
      radius * 2
    );

    return props.filter(prop => {
      const dist = Math.sqrt(
        (prop.x - centerX) ** 2 + (prop.z - centerZ) ** 2
      );
      return dist <= radius;
    });
  }

  /**
   * Harvest/remove a prop
   * @param {string} propId - Prop ID
   * @returns {object} {success, resources, prop}
   */
  removeProp(propId) {
    const prop = this.propsById.get(propId);

    if (!prop) {
      return { success: false, error: 'Prop not found' };
    }

    // Get resource drops
    const resources = prop.getResourceDrops();

    // Update statistics
    this.stats.propsHarvested++;
    for (const resource of resources) {
      const current = this.stats.resourcesGathered[resource.type] || 0;
      this.stats.resourcesGathered[resource.type] = current + resource.amount;
    }

    // Remove from chunk
    const chunkX = Math.floor(prop.x / this.config.chunkSize);
    const chunkZ = Math.floor(prop.z / this.config.chunkSize);
    const chunkKey = `${chunkX},${chunkZ}`;
    const chunkProps = this.chunkProps.get(chunkKey);

    if (chunkProps) {
      const index = chunkProps.findIndex(p => p.id === propId);
      if (index !== -1) {
        chunkProps.splice(index, 1);
      }
    }

    // Remove from ID map
    this.propsById.delete(propId);

    return {
      success: true,
      resources,
      prop
    };
  }

  /**
   * Get statistics
   * @returns {object}
   */
  getStats() {
    return {
      ...this.stats,
      totalProps: this.propsById.size,
      chunksWithProps: this.chunkProps.size
    };
  }

  /**
   * Serialize prop manager state
   * @returns {object}
   */
  toJSON() {
    const chunks = {};
    for (const [key, props] of this.chunkProps.entries()) {
      chunks[key] = props.map(p => p.toJSON());
    }

    return {
      config: this.config,
      chunks,
      nextPropId: this.nextPropId,
      stats: this.stats
    };
  }

  /**
   * Deserialize prop manager state
   * @param {object} data - Saved data
   * @param {TerrainSystem} terrainSystem - Terrain system
   * @param {BiomeManager} biomeManager - Biome manager
   * @param {object} propDefinitions - Prop definitions
   * @returns {PropManager}
   */
  static fromJSON(data, terrainSystem, biomeManager, propDefinitions) {
    const manager = new PropManager(terrainSystem, biomeManager, propDefinitions, data.config);

    manager.nextPropId = data.nextPropId;
    manager.stats = data.stats;

    // Restore props
    for (const [chunkKey, propDataArray] of Object.entries(data.chunks)) {
      const props = propDataArray.map(propData => {
        const propDef = propDefinitions[propData.type] ||
                       manager.getDefaultPropDefinition(propData.type);
        const prop = new Prop(
          propData.id,
          propData.type,
          propData.x,
          propData.z,
          propData.variant,
          propDef
        );
        prop.health = propData.health;
        prop.lastHarvested = propData.lastHarvested;

        manager.propsById.set(prop.id, prop);
        return prop;
      });

      manager.chunkProps.set(chunkKey, props);
    }

    return manager;
  }
}

export { Prop, PoissonDiscSampler };
