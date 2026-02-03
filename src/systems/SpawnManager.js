/**
 * SpawnManager.js - Monster spawn system
 *
 * Manages:
 * - Spawn zones with automatic population
 * - Respawn timers for dead monsters
 * - Group spawning
 * - Elite/modified monster spawns
 */

/* eslint-disable no-console */

import { Monster } from '../entities/Monster.js';
import SPAWN_ZONES from '../config/monsters/spawn-zones.json';
import MONSTER_MODIFIERS from '../config/monsters/monster-modifiers.json';

/**
 * SpawnManager handles all monster spawning logic
 */
export class SpawnManager {
  constructor() {
    this.zones = {};
    this.deadMonsters = []; // Tracks dead monsters for respawn
    this.spawnTimers = {}; // Zone-specific spawn timers
    this.lastUpdateTime = 0;

    // Load spawn zones
    this.loadZones();
  }

  /**
   * Load spawn zones from configuration
   */
  loadZones() {
    Object.entries(SPAWN_ZONES).forEach(([id, config]) => {
      if (config.enabled) {
        this.zones[id] = {
          id,
          ...config,
          currentPopulation: 0,
          monsters: [], // IDs of monsters spawned in this zone
          lastSpawnTime: 0
        };
      }
    });

    console.log(`✅ SpawnManager: Loaded ${Object.keys(this.zones).length} spawn zones`);
  }

  /**
   * Update spawn system
   * @param {Array<Monster>} currentMonsters - All current monsters
   * @param {number} deltaTime - Time since last update (ms)
   * @param {Object} playerPosition - Player position {x, z} for relative spawning
   * @returns {Array<Monster>} - New monsters to spawn
   */
  update(currentMonsters, deltaTime, playerPosition = null) {
    this.lastUpdateTime += deltaTime;

    // Only check spawns every second
    if (this.lastUpdateTime < 1000) {
      return [];
    }

    this.lastUpdateTime = 0;

    const monstersToSpawn = [];

    // Update each zone
    Object.values(this.zones).forEach(zone => {
      // Count living monsters in this zone
      zone.currentPopulation = currentMonsters.filter(m =>
        zone.monsters.includes(m.id) && m.alive
      ).length;

      // Remove dead monster IDs from zone tracking
      zone.monsters = zone.monsters.filter(id =>
        currentMonsters.some(m => m.id === id && m.alive)
      );

      // Check if zone needs more monsters
      if (zone.currentPopulation < zone.maxPopulation) {
        const now = Date.now();

        // Check respawn timer
        if (now - zone.lastSpawnTime >= zone.respawnTime) {
          const needed = zone.maxPopulation - zone.currentPopulation;
          const newMonsters = this.spawnInZone(zone, needed, playerPosition);
          monstersToSpawn.push(...newMonsters);
          zone.lastSpawnTime = now;
        }
      }
    });

    return monstersToSpawn;
  }

  /**
   * Spawn monsters in a zone
   * @param {Object} zone - Zone configuration
   * @param {number} count - Number of monsters to spawn
   * @param {Object} playerPosition - Player position {x, z} for relative spawning
   * @returns {Array<Monster>} - Spawned monsters
   */
  spawnInZone(zone, count, playerPosition = null) {
    const monsters = [];
    let remaining = count;

    while (remaining > 0) {
      // Check for group spawn
      if (Math.random() < zone.groupSpawnChance && remaining >= 2) {
        // Spawn a group
        const minGroupSize = Math.min(zone.groupSize[0], remaining);
        const maxGroupSize = Math.min(zone.groupSize[1], remaining);
        const groupSize = this.randomInt(minGroupSize, maxGroupSize);

        const groupType = this.selectMonsterType(zone.monsterTypes);
        const groupLevel = this.randomInt(zone.minLevel, zone.maxLevel);
        const groupPosition = this.getRandomPositionInZone(zone, playerPosition);

        for (let i = 0; i < groupSize; i++) {
          // Spread group members around spawn point
          const offset = {
            x: (Math.random() - 0.5) * 4, // 4 tile spread
            z: (Math.random() - 0.5) * 4
          };

          const monster = this.spawnMonster(
            groupType,
            {
              x: groupPosition.x + offset.x,
              z: groupPosition.z + offset.z
            },
            groupLevel,
            zone
          );

          monsters.push(monster);
        }

        remaining -= groupSize;
      } else {
        // Spawn single monster
        const monsterType = this.selectMonsterType(zone.monsterTypes);
        const level = this.randomInt(zone.minLevel, zone.maxLevel);
        const position = this.getRandomPositionInZone(zone, playerPosition);

        const monster = this.spawnMonster(monsterType, position, level, zone);
        monsters.push(monster);
        remaining--;
      }
    }

    console.log(`🔄 Spawned ${monsters.length} monsters in ${zone.name}`);
    return monsters;
  }

  /**
   * Spawn a single monster
   * @param {string} type - Monster type
   * @param {Object} position - Position {x, z}
   * @param {number} level - Monster level
   * @param {Object} zone - Spawn zone
   * @returns {Monster} - Created monster
   */
  spawnMonster(type, position, level, zone) {
    const options = { level };

    // Check for elite spawn
    if (Math.random() < zone.eliteSpawnChance) {
      // Select random modifier
      const modifierNames = Object.keys(MONSTER_MODIFIERS);
      const modifier = modifierNames[Math.floor(Math.random() * modifierNames.length)];
      options.modifier = modifier;
    }

    const monster = new Monster(type, position, options);

    // Track in zone
    zone.monsters.push(monster.id);

    return monster;
  }

  /**
   * Select monster type based on weighted probabilities
   * @param {Array<Object>} monsterTypes - Array of {type, weight}
   * @returns {string} - Selected monster type
   */
  selectMonsterType(monsterTypes) {
    const totalWeight = monsterTypes.reduce((sum, m) => sum + m.weight, 0);
    let random = Math.random() * totalWeight;

    for (const monsterDef of monsterTypes) {
      random -= monsterDef.weight;
      if (random <= 0) {
        return monsterDef.type;
      }
    }

    // Fallback to first type
    return monsterTypes[0].type;
  }

  /**
   * Get random position for spawning
   * If playerPosition is provided, spawn 6-10 tiles from player
   * Otherwise, spawn within zone radius
   * @param {Object} zone - Spawn zone
   * @param {Object} playerPosition - Player position {x, z} (optional)
   * @returns {Object} - Position {x, z}
   */
  getRandomPositionInZone(zone, playerPosition = null) {
    // Random angle
    const angle = Math.random() * Math.PI * 2;

    // If player position is provided, spawn 6-10 tiles from player
    if (playerPosition) {
      const minDistance = 6;
      const maxDistance = 10;
      // Random distance between 6 and 10 tiles
      const distance = minDistance + Math.random() * (maxDistance - minDistance);

      return {
        x: playerPosition.x + Math.cos(angle) * distance,
        z: playerPosition.z + Math.sin(angle) * distance
      };
    }

    // Fallback: spawn within zone radius (for initial population or when no player pos)
    const distance = Math.sqrt(Math.random()) * zone.radius;

    return {
      x: zone.position.x + Math.cos(angle) * distance,
      z: zone.position.z + Math.sin(angle) * distance
    };
  }

  /**
   * Get random integer between min and max (inclusive)
   * @param {number} min - Minimum value
   * @param {number} max - Maximum value
   * @returns {number} - Random integer
   */
  randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Manually populate a zone (for testing/initialization)
   * @param {string} zoneId - Zone ID
   * @returns {Array<Monster>} - Spawned monsters
   */
  populateZone(zoneId) {
    const zone = this.zones[zoneId];
    if (!zone) {
      console.warn(`⚠️ Unknown spawn zone: ${zoneId}`);
      return [];
    }

    const needed = zone.maxPopulation - zone.currentPopulation;
    return this.spawnInZone(zone, needed);
  }

  /**
   * Populate all zones
   * @returns {Array<Monster>} - All spawned monsters
   */
  populateAllZones() {
    const allMonsters = [];

    Object.keys(this.zones).forEach(zoneId => {
      const monsters = this.populateZone(zoneId);
      allMonsters.push(...monsters);
    });

    console.log(`🌍 Populated all zones: ${allMonsters.length} total monsters`);
    return allMonsters;
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
   * Enable/disable a zone
   * @param {string} zoneId - Zone ID
   * @param {boolean} enabled - Enabled state
   */
  setZoneEnabled(zoneId, enabled) {
    if (this.zones[zoneId]) {
      this.zones[zoneId].enabled = enabled;
      console.log(`${enabled ? '✅' : '❌'} Zone ${zoneId} ${enabled ? 'enabled' : 'disabled'}`);
    }
  }

  /**
   * Clear all zone populations
   */
  clearAllZones() {
    Object.values(this.zones).forEach(zone => {
      zone.currentPopulation = 0;
      zone.monsters = [];
      zone.lastSpawnTime = 0;
    });
    console.log('🧹 Cleared all spawn zones');
  }
}

export default SpawnManager;
