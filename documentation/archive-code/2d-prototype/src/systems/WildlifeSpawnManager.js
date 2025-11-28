/**
 * WildlifeSpawnManager.js - Wildlife spawn system
 *
 * Manages:
 * - Wildlife spawn zones based on biomes
 * - Herd spawning with leader assignment
 * - Day/night cycle awareness for activity patterns
 * - Population balance across the world
 */

/* eslint-disable no-console */

import { Wildlife } from '../entities/Wildlife.js';
// AnimalBehavior imported for potential future use in behavior-based spawn filtering

/**
 * Default wildlife spawn configuration
 */
const DEFAULT_SPAWN_CONFIG = {
  // Forest biome
  forest: {
    enabled: true,
    position: { x: 150, z: 150 },
    radius: 80,
    maxPopulation: 15,
    respawnTime: 60000, // 60 seconds
    animalTypes: [
      { type: 'DEER', weight: 30, herdChance: 0.8 },
      { type: 'RABBIT', weight: 40, herdChance: 0 },
      { type: 'BOAR', weight: 15, herdChance: 0.4 },
      { type: 'WOLF', weight: 10, herdChance: 0.7 },
      { type: 'BEAR', weight: 5, herdChance: 0 }
    ]
  },
  // Plains biome
  plains: {
    enabled: true,
    position: { x: 50, z: 200 },
    radius: 100,
    maxPopulation: 20,
    respawnTime: 45000,
    animalTypes: [
      { type: 'SHEEP', weight: 40, herdChance: 0.9 },
      { type: 'RABBIT', weight: 35, herdChance: 0 },
      { type: 'CHICKEN', weight: 25, herdChance: 0.3 }
    ]
  },
  // Hills biome
  hills: {
    enabled: true,
    position: { x: -100, z: 100 },
    radius: 70,
    maxPopulation: 10,
    respawnTime: 90000,
    animalTypes: [
      { type: 'BOAR', weight: 35, herdChance: 0.5 },
      { type: 'DEER', weight: 30, herdChance: 0.6 },
      { type: 'WOLF', weight: 25, herdChance: 0.8 },
      { type: 'BEAR', weight: 10, herdChance: 0 }
    ]
  },
  // Near water (lakes/rivers)
  waterside: {
    enabled: true,
    position: { x: 200, z: 50 },
    radius: 40,
    maxPopulation: 8,
    respawnTime: 30000,
    animalTypes: [
      { type: 'FISH', weight: 60, herdChance: 0.5 },
      { type: 'DEER', weight: 25, herdChance: 0.4 },
      { type: 'BEAR', weight: 15, herdChance: 0 }
    ]
  }
};

/**
 * WildlifeSpawnManager handles all wildlife spawning
 */
export class WildlifeSpawnManager {
  constructor(config = {}) {
    this.zones = {};
    this.herds = new Map(); // herdId -> { leaderId, members: Set, type }
    this.lastUpdateTime = 0;
    this.nextHerdId = 1;

    // Load spawn zones from config or use defaults
    this.loadZones(config.zones || DEFAULT_SPAWN_CONFIG);
  }

  /**
   * Load spawn zones from configuration
   * @param {Object} zoneConfig - Zone configurations
   */
  loadZones(zoneConfig) {
    Object.entries(zoneConfig).forEach(([id, config]) => {
      if (config.enabled) {
        this.zones[id] = {
          id,
          name: id.charAt(0).toUpperCase() + id.slice(1),
          ...config,
          currentPopulation: 0,
          wildlife: [], // IDs of wildlife in this zone
          lastSpawnTime: 0
        };
      }
    });

    console.log(`✅ WildlifeSpawnManager: Loaded ${Object.keys(this.zones).length} spawn zones`);
  }

  /**
   * Update wildlife spawning
   * @param {Array<Wildlife>} currentWildlife - All current wildlife
   * @param {number} deltaTime - Time since last update (ms)
   * @param {number} gameHour - Current game hour (0-23)
   * @returns {Array<Wildlife>} - New wildlife to spawn
   */
  update(currentWildlife, deltaTime, gameHour = 12) {
    this.lastUpdateTime += deltaTime;

    // Only check spawns every 2 seconds
    if (this.lastUpdateTime < 2000) {
      return [];
    }

    this.lastUpdateTime = 0;
    const wildlifeToSpawn = [];

    // Update each zone
    Object.values(this.zones).forEach(zone => {
      // Count living wildlife in this zone
      zone.currentPopulation = currentWildlife.filter(w =>
        zone.wildlife.includes(w.id) && w.alive
      ).length;

      // Remove dead wildlife IDs from zone tracking
      zone.wildlife = zone.wildlife.filter(id =>
        currentWildlife.some(w => w.id === id && w.alive)
      );

      // Check if zone needs more wildlife
      if (zone.currentPopulation < zone.maxPopulation) {
        const now = Date.now();

        // Check respawn timer
        if (now - zone.lastSpawnTime >= zone.respawnTime) {
          const needed = Math.min(
            zone.maxPopulation - zone.currentPopulation,
            3 // Max 3 spawns per cycle
          );
          const newWildlife = this.spawnInZone(zone, needed, gameHour);
          wildlifeToSpawn.push(...newWildlife);
          zone.lastSpawnTime = now;
        }
      }
    });

    // Clean up empty herds
    this.cleanupHerds(currentWildlife);

    return wildlifeToSpawn;
  }

  /**
   * Spawn wildlife in a zone
   * @param {Object} zone - Zone configuration
   * @param {number} count - Number of wildlife to spawn
   * @param {number} gameHour - Current game hour
   * @returns {Array<Wildlife>} - Spawned wildlife
   */
  spawnInZone(zone, count, gameHour) {
    const wildlife = [];
    let remaining = count;

    while (remaining > 0) {
      const animalDef = this.selectAnimalType(zone.animalTypes);

      // Check if we should spawn a herd
      if (animalDef.herdChance > 0 && Math.random() < animalDef.herdChance && remaining >= 3) {
        // Spawn a herd
        const herdSize = Math.min(Math.floor(Math.random() * 4) + 3, remaining); // 3-6 animals
        const herdWildlife = this.spawnHerd(zone, animalDef.type, herdSize);
        wildlife.push(...herdWildlife);
        remaining -= herdSize;
      } else {
        // Spawn single animal
        const position = this.getRandomPositionInZone(zone);
        const animal = new Wildlife(animalDef.type, position);
        zone.wildlife.push(animal.id);
        wildlife.push(animal);
        remaining--;
      }
    }

    if (wildlife.length > 0) {
      console.log(`🦌 Spawned ${wildlife.length} wildlife in ${zone.name}`);
    }

    return wildlife;
  }

  /**
   * Spawn a herd of animals
   * @param {Object} zone - Zone configuration
   * @param {string} type - Animal type
   * @param {number} size - Herd size
   * @returns {Array<Wildlife>} - Spawned herd
   */
  spawnHerd(zone, type, size) {
    const wildlife = [];
    const herdId = `herd_${this.nextHerdId++}`;
    const centerPosition = this.getRandomPositionInZone(zone);

    // Spawn leader first
    const leader = new Wildlife(type, centerPosition, {
      herdId,
      isHerdLeader: true
    });
    zone.wildlife.push(leader.id);
    wildlife.push(leader);

    // Track herd
    this.herds.set(herdId, {
      leaderId: leader.id,
      members: new Set([leader.id]),
      type
    });

    // Spawn followers around leader
    for (let i = 1; i < size; i++) {
      const offset = {
        x: (Math.random() - 0.5) * 10,
        z: (Math.random() - 0.5) * 10
      };
      const position = {
        x: centerPosition.x + offset.x,
        z: centerPosition.z + offset.z
      };

      const follower = new Wildlife(type, position, { herdId });
      zone.wildlife.push(follower.id);
      wildlife.push(follower);

      // Add to herd tracking
      const herd = this.herds.get(herdId);
      if (herd) {
        herd.members.add(follower.id);
      }
    }

    console.log(`🦌 Spawned herd of ${size} ${type}s (${herdId})`);
    return wildlife;
  }

  /**
   * Select animal type based on weighted probabilities
   * @param {Array<Object>} animalTypes - Array of {type, weight, herdChance}
   * @returns {Object} - Selected animal definition
   */
  selectAnimalType(animalTypes) {
    const totalWeight = animalTypes.reduce((sum, a) => sum + a.weight, 0);
    let random = Math.random() * totalWeight;

    for (const animalDef of animalTypes) {
      random -= animalDef.weight;
      if (random <= 0) {
        return animalDef;
      }
    }

    return animalTypes[0];
  }

  /**
   * Get random position within zone radius
   * @param {Object} zone - Spawn zone
   * @returns {Object} - Position {x, z}
   */
  getRandomPositionInZone(zone) {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.sqrt(Math.random()) * zone.radius;

    return {
      x: zone.position.x + Math.cos(angle) * distance,
      z: zone.position.z + Math.sin(angle) * distance
    };
  }

  /**
   * Clean up herds with no living members
   * @param {Array<Wildlife>} currentWildlife - All current wildlife
   */
  cleanupHerds(currentWildlife) {
    const aliveIds = new Set(currentWildlife.filter(w => w.alive).map(w => w.id));

    for (const [herdId, herd] of this.herds.entries()) {
      // Remove dead members
      for (const memberId of herd.members) {
        if (!aliveIds.has(memberId)) {
          herd.members.delete(memberId);
        }
      }

      // Remove empty herds
      if (herd.members.size === 0) {
        this.herds.delete(herdId);
        continue;
      }

      // If leader died, assign new leader
      if (!aliveIds.has(herd.leaderId) && herd.members.size > 0) {
        const newLeaderId = herd.members.values().next().value;
        herd.leaderId = newLeaderId;

        // Update the wildlife's isHerdLeader flag
        const newLeader = currentWildlife.find(w => w.id === newLeaderId);
        if (newLeader) {
          newLeader.isHerdLeader = true;
        }
      }
    }
  }

  /**
   * Populate all zones at game start
   * @returns {Array<Wildlife>} - All spawned wildlife
   */
  populateAllZones() {
    const allWildlife = [];

    Object.keys(this.zones).forEach(zoneId => {
      const zone = this.zones[zoneId];
      const count = Math.floor(zone.maxPopulation * 0.6); // Start with 60% population
      const wildlife = this.spawnInZone(zone, count, 12);
      allWildlife.push(...wildlife);
    });

    console.log(`🌍 Populated all wildlife zones: ${allWildlife.length} total animals`);
    return allWildlife;
  }

  /**
   * Get zone by ID
   * @param {string} zoneId - Zone ID
   * @returns {Object|null} - Zone configuration
   */
  getZone(zoneId) {
    return this.zones[zoneId] || null;
  }

  /**
   * Get all zones
   * @returns {Object} - All zones
   */
  getAllZones() {
    return { ...this.zones };
  }

  /**
   * Get herd info
   * @param {string} herdId - Herd ID
   * @returns {Object|null} - Herd info
   */
  getHerd(herdId) {
    return this.herds.get(herdId) || null;
  }

  /**
   * Get all herds
   * @returns {Map} - All herds
   */
  getAllHerds() {
    return new Map(this.herds);
  }

  /**
   * Get statistics
   * @returns {Object} - Spawn statistics
   */
  getStatistics() {
    return {
      zoneCount: Object.keys(this.zones).length,
      herdCount: this.herds.size,
      totalPopulation: Object.values(this.zones).reduce((sum, z) => sum + z.currentPopulation, 0),
      maxPopulation: Object.values(this.zones).reduce((sum, z) => sum + z.maxPopulation, 0)
    };
  }
}

export default WildlifeSpawnManager;
