/**
 * PerceptionSystem.js - AI Perception for Vision, Hearing, and Memory
 *
 * Features:
 * - Vision system with line of sight and view cones
 * - Hearing system for sound detection
 * - Memory system for tracking known entities
 * - Weather-based perception modifiers
 * - Information sharing between allies
 */

/**
 * Perception event types
 */
export const PerceptionEventType = {
  SAW_ENTITY: 'SAW_ENTITY',
  HEARD_SOUND: 'HEARD_SOUND',
  LOST_SIGHT: 'LOST_SIGHT',
  ALLY_WARNED: 'ALLY_WARNED',
  MEMORY_EXPIRED: 'MEMORY_EXPIRED'
};

/**
 * Sound types with base detection ranges
 */
export const SoundType = {
  FOOTSTEP: { range: 20, priority: 1 },
  FOOTSTEP_RUN: { range: 40, priority: 2 },
  COMBAT: { range: 80, priority: 5 },
  EXPLOSION: { range: 150, priority: 8 },
  SPEECH: { range: 30, priority: 3 },
  DOOR_OPEN: { range: 25, priority: 2 },
  ITEM_DROP: { range: 15, priority: 1 },
  ALERT: { range: 100, priority: 7 }
};

/**
 * Weather modifiers for perception
 */
export const WeatherPerceptionModifiers = {
  CLEAR: { vision: 1.0, hearing: 1.0 },
  CLOUDY: { vision: 0.95, hearing: 1.0 },
  RAIN: { vision: 0.7, hearing: 0.5 },
  HEAVY_RAIN: { vision: 0.5, hearing: 0.3 },
  SNOW: { vision: 0.6, hearing: 0.7 },
  FOG: { vision: 0.3, hearing: 1.0 },
  STORM: { vision: 0.4, hearing: 0.2 },
  NIGHT: { vision: 0.5, hearing: 1.2 }
};

/**
 * Memory entry for a perceived entity
 */
class MemoryEntry {
  /**
   * @param {Object} entity - Perceived entity
   * @param {Object} position - Last known position {x, z}
   * @param {string} source - How it was perceived (vision, hearing, warning)
   */
  constructor(entity, position, source = 'vision') {
    this.entityId = entity.id || entity;
    this.entityType = entity.type || 'unknown';
    this.position = { ...position };
    this.source = source;
    this.firstSeen = Date.now();
    this.lastSeen = Date.now();
    this.sightings = 1;
    this.confidence = 1.0; // Decreases over time
    this.threatLevel = entity.threatLevel || 0;
    this.isFriendly = entity.faction === 'player' || entity.isFriendly || false;
  }

  /**
   * Update memory with new sighting
   * @param {Object} position - Current position
   * @param {string} source - Perception source
   */
  update(position, source = 'vision') {
    this.position = { ...position };
    this.lastSeen = Date.now();
    this.sightings++;
    this.confidence = 1.0;
    if (source === 'vision') {
      this.source = source;
    }
  }

  /**
   * Decay confidence over time
   * @param {number} decayRate - Confidence decay per second
   * @param {number} deltaTime - Time since last update (ms)
   */
  decay(decayRate, deltaTime) {
    const decayAmount = (deltaTime / 1000) * decayRate;
    this.confidence = Math.max(0, this.confidence - decayAmount);
  }

  /**
   * Get age of memory in milliseconds
   * @returns {number}
   */
  getAge() {
    return Date.now() - this.lastSeen;
  }

  /**
   * Check if memory is still valid
   * @param {number} maxAge - Maximum age in ms
   * @returns {boolean}
   */
  isValid(maxAge = 30000) {
    return this.getAge() < maxAge && this.confidence > 0;
  }

  /**
   * Serialize to JSON
   * @returns {Object}
   */
  toJSON() {
    return {
      entityId: this.entityId,
      entityType: this.entityType,
      position: { ...this.position },
      source: this.source,
      firstSeen: this.firstSeen,
      lastSeen: this.lastSeen,
      sightings: this.sightings,
      confidence: this.confidence,
      threatLevel: this.threatLevel,
      isFriendly: this.isFriendly
    };
  }

  /**
   * Create from JSON
   * @param {Object} data
   * @returns {MemoryEntry}
   */
  static fromJSON(data) {
    const entry = new MemoryEntry({ id: data.entityId, type: data.entityType }, data.position, data.source);
    entry.firstSeen = data.firstSeen;
    entry.lastSeen = data.lastSeen;
    entry.sightings = data.sightings;
    entry.confidence = data.confidence;
    entry.threatLevel = data.threatLevel;
    entry.isFriendly = data.isFriendly;
    return entry;
  }
}

/**
 * PerceptionSystem class
 * Manages AI perception for entities
 */
export class PerceptionSystem {
  /**
   * Create perception system
   * @param {Object} options - Configuration
   * @param {number} options.defaultVisionRange - Default vision range (default: 100)
   * @param {number} options.defaultHearingRange - Default hearing range (default: 50)
   * @param {number} options.defaultFOV - Default field of view in degrees (default: 120)
   * @param {number} options.memoryDuration - How long memories last (default: 30000ms)
   * @param {number} options.memoryDecayRate - Confidence decay per second (default: 0.1)
   */
  constructor(options = {}) {
    this.defaultVisionRange = options.defaultVisionRange || 100;
    this.defaultHearingRange = options.defaultHearingRange || 50;
    this.defaultFOV = options.defaultFOV || 120;
    this.memoryDuration = options.memoryDuration || 30000;
    this.memoryDecayRate = options.memoryDecayRate || 0.1;

    // Entity memories: entityId -> Map<targetId, MemoryEntry>
    this.memories = new Map();

    // Current weather modifier
    this.currentWeather = 'CLEAR';
    this.isNight = false;

    // Listeners for perception events
    this.listeners = [];

    // Line of sight checker (can be overridden)
    this.lineOfSightChecker = null;

    // Statistics
    this.stats = {
      visionChecks: 0,
      hearingChecks: 0,
      memoriesCreated: 0,
      memoriesExpired: 0
    };
  }

  /**
   * Set line of sight checker function
   * @param {Function} checker - Function(from, to) => boolean
   */
  setLineOfSightChecker(checker) {
    this.lineOfSightChecker = checker;
  }

  /**
   * Set current weather
   * @param {string} weather - Weather type
   */
  setWeather(weather) {
    this.currentWeather = weather || 'CLEAR';
  }

  /**
   * Set night mode
   * @param {boolean} isNight - Whether it's night
   */
  setNightMode(isNight) {
    this.isNight = isNight;
  }

  /**
   * Get weather modifier
   * @returns {Object} {vision, hearing} modifiers
   */
  getWeatherModifier() {
    let modifier = WeatherPerceptionModifiers[this.currentWeather] ||
                   WeatherPerceptionModifiers.CLEAR;

    // Apply night modifier on top
    if (this.isNight) {
      const nightMod = WeatherPerceptionModifiers.NIGHT;
      modifier = {
        vision: modifier.vision * nightMod.vision,
        hearing: modifier.hearing * nightMod.hearing
      };
    }

    return modifier;
  }

  /**
   * Register perception event listener
   * @param {Function} listener - Callback(eventType, data)
   */
  addListener(listener) {
    this.listeners.push(listener);
  }

  /**
   * Remove perception event listener
   * @param {Function} listener
   */
  removeListener(listener) {
    const index = this.listeners.indexOf(listener);
    if (index !== -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Emit perception event
   * @private
   */
  _emitEvent(type, data) {
    for (const listener of this.listeners) {
      try {
        listener(type, data);
      } catch (error) {
        console.error('[PerceptionSystem] Listener error:', error);
      }
    }
  }

  /**
   * Check vision for an entity
   * @param {Object} perceiver - Entity doing the perceiving
   * @param {Object[]} targets - Array of potential targets
   * @param {Object} options - Vision options
   * @returns {Object[]} Array of visible targets
   */
  checkVision(perceiver, targets, options = {}) {
    this.stats.visionChecks++;

    const visionRange = options.visionRange || perceiver.visionRange || this.defaultVisionRange;
    const fov = options.fov || perceiver.fov || this.defaultFOV;
    const facingAngle = perceiver.facingAngle || 0;

    // Apply weather modifier
    const weatherMod = this.getWeatherModifier();
    const effectiveRange = visionRange * weatherMod.vision;

    const visible = [];

    for (const target of targets) {
      if (!target || !target.position || target.id === perceiver.id) continue;

      // Check distance
      const dx = target.position.x - perceiver.position.x;
      const dz = target.position.z - perceiver.position.z;
      const distSq = dx * dx + dz * dz;

      if (distSq > effectiveRange * effectiveRange) continue;

      // Check field of view
      if (fov < 360) {
        const angleToTarget = Math.atan2(dz, dx);
        let angleDiff = angleToTarget - facingAngle;

        // Normalize angle difference to -PI to PI
        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

        const halfFOV = (fov * Math.PI / 180) / 2;
        if (Math.abs(angleDiff) > halfFOV) continue;
      }

      // Check line of sight
      if (this.lineOfSightChecker &&
          !this.lineOfSightChecker(perceiver.position, target.position)) {
        continue;
      }

      visible.push(target);

      // Update memory
      this._updateMemory(perceiver.id, target, target.position, 'vision');

      // Emit event
      this._emitEvent(PerceptionEventType.SAW_ENTITY, {
        perceiverId: perceiver.id,
        targetId: target.id,
        position: { ...target.position },
        distance: Math.sqrt(distSq)
      });
    }

    return visible;
  }

  /**
   * Check hearing for an entity
   * @param {Object} perceiver - Entity doing the perceiving
   * @param {Object[]} sounds - Array of sound events {position, type, sourceId}
   * @param {Object} options - Hearing options
   * @returns {Object[]} Array of heard sounds
   */
  checkHearing(perceiver, sounds, options = {}) {
    this.stats.hearingChecks++;

    const hearingRange = options.hearingRange || perceiver.hearingRange || this.defaultHearingRange;

    // Apply weather modifier
    const weatherMod = this.getWeatherModifier();
    const baseRange = hearingRange * weatherMod.hearing;

    const heard = [];

    for (const sound of sounds) {
      if (!sound || !sound.position || sound.sourceId === perceiver.id) continue;

      // Get sound type data
      const soundData = SoundType[sound.type] || { range: 30, priority: 3 };

      // Calculate effective range for this sound
      const effectiveRange = Math.min(baseRange, soundData.range * weatherMod.hearing);

      // Check distance
      const dx = sound.position.x - perceiver.position.x;
      const dz = sound.position.z - perceiver.position.z;
      const distSq = dx * dx + dz * dz;

      if (distSq > effectiveRange * effectiveRange) continue;

      heard.push({
        ...sound,
        distance: Math.sqrt(distSq),
        priority: soundData.priority
      });

      // Update memory with approximate position
      const approximatePos = this._approximatePosition(perceiver.position, sound.position, 0.2);
      this._updateMemory(perceiver.id, { id: sound.sourceId, type: 'heard_entity' }, approximatePos, 'hearing');

      // Emit event
      this._emitEvent(PerceptionEventType.HEARD_SOUND, {
        perceiverId: perceiver.id,
        sourceId: sound.sourceId,
        soundType: sound.type,
        position: approximatePos,
        distance: Math.sqrt(distSq)
      });
    }

    // Sort by priority (highest first)
    heard.sort((a, b) => b.priority - a.priority);

    return heard;
  }

  /**
   * Share threat information with allies
   * @param {Object} perceiver - Entity sharing information
   * @param {Object[]} allies - Array of allied entities
   * @param {string} targetId - ID of threat to share
   * @param {number} shareRange - Range to share within
   */
  shareThreatWithAllies(perceiver, allies, targetId, shareRange = 100) {
    const memory = this.getMemory(perceiver.id, targetId);
    if (!memory) return;

    for (const ally of allies) {
      if (!ally || ally.id === perceiver.id) continue;

      // Check distance to ally
      const dx = ally.position.x - perceiver.position.x;
      const dz = ally.position.z - perceiver.position.z;
      const distSq = dx * dx + dz * dz;

      if (distSq > shareRange * shareRange) continue;

      // Share the memory
      this._updateMemory(ally.id, { id: targetId, type: memory.entityType }, memory.position, 'warning');

      // Emit event
      this._emitEvent(PerceptionEventType.ALLY_WARNED, {
        warnerId: perceiver.id,
        allyId: ally.id,
        targetId,
        position: { ...memory.position }
      });
    }
  }

  /**
   * Update entity memory
   * @private
   */
  _updateMemory(perceiverId, target, position, source) {
    if (!this.memories.has(perceiverId)) {
      this.memories.set(perceiverId, new Map());
    }

    const entityMemories = this.memories.get(perceiverId);
    const targetId = target.id || target;

    if (entityMemories.has(targetId)) {
      entityMemories.get(targetId).update(position, source);
    } else {
      entityMemories.set(targetId, new MemoryEntry(target, position, source));
      this.stats.memoriesCreated++;
    }
  }

  /**
   * Get memory of a specific entity
   * @param {string} perceiverId - ID of perceiving entity
   * @param {string} targetId - ID of target entity
   * @returns {MemoryEntry|null}
   */
  getMemory(perceiverId, targetId) {
    const entityMemories = this.memories.get(perceiverId);
    if (!entityMemories) return null;

    const memory = entityMemories.get(targetId);
    return memory && memory.isValid(this.memoryDuration) ? memory : null;
  }

  /**
   * Get all memories for an entity
   * @param {string} perceiverId - ID of perceiving entity
   * @param {Object} filter - Optional filter {type, minConfidence, maxAge}
   * @returns {MemoryEntry[]}
   */
  getAllMemories(perceiverId, filter = {}) {
    const entityMemories = this.memories.get(perceiverId);
    if (!entityMemories) return [];

    const result = [];

    for (const memory of entityMemories.values()) {
      if (!memory.isValid(filter.maxAge || this.memoryDuration)) continue;
      if (filter.type && memory.entityType !== filter.type) continue;
      if (filter.minConfidence && memory.confidence < filter.minConfidence) continue;
      if (filter.onlyHostile && memory.isFriendly) continue;
      if (filter.onlyFriendly && !memory.isFriendly) continue;

      result.push(memory);
    }

    // Sort by confidence (highest first)
    result.sort((a, b) => b.confidence - a.confidence);

    return result;
  }

  /**
   * Get hostile memories
   * @param {string} perceiverId - ID of perceiving entity
   * @returns {MemoryEntry[]}
   */
  getHostileMemories(perceiverId) {
    return this.getAllMemories(perceiverId, { onlyHostile: true });
  }

  /**
   * Get last known position of an entity
   * @param {string} perceiverId - ID of perceiving entity
   * @param {string} targetId - ID of target entity
   * @returns {Object|null} Position {x, z} or null
   */
  getLastKnownPosition(perceiverId, targetId) {
    const memory = this.getMemory(perceiverId, targetId);
    return memory ? { ...memory.position } : null;
  }

  /**
   * Clear memories for an entity
   * @param {string} perceiverId - ID of perceiving entity
   */
  clearMemories(perceiverId) {
    this.memories.delete(perceiverId);
  }

  /**
   * Update all memories (call each tick)
   * @param {number} deltaTime - Time since last update (ms)
   */
  update(deltaTime) {
    for (const [perceiverId, entityMemories] of this.memories) {
      const toDelete = [];

      for (const [targetId, memory] of entityMemories) {
        // Decay confidence
        memory.decay(this.memoryDecayRate, deltaTime);

        // Mark for deletion if expired
        if (!memory.isValid(this.memoryDuration)) {
          toDelete.push(targetId);

          // Emit event
          this._emitEvent(PerceptionEventType.MEMORY_EXPIRED, {
            perceiverId,
            targetId,
            lastPosition: { ...memory.position }
          });
        }
      }

      // Remove expired memories
      for (const targetId of toDelete) {
        entityMemories.delete(targetId);
        this.stats.memoriesExpired++;
      }

      // Remove empty memory maps
      if (entityMemories.size === 0) {
        this.memories.delete(perceiverId);
      }
    }
  }

  /**
   * Calculate approximate position with uncertainty
   * @private
   */
  _approximatePosition(fromPos, actualPos, uncertaintyFactor) {
    const dx = actualPos.x - fromPos.x;
    const dz = actualPos.z - fromPos.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    // Add random offset based on distance and uncertainty
    const offset = dist * uncertaintyFactor;
    return {
      x: actualPos.x + (Math.random() - 0.5) * offset,
      z: actualPos.z + (Math.random() - 0.5) * offset
    };
  }

  /**
   * Check if entity can see target (convenience method)
   * @param {Object} perceiver - Perceiving entity
   * @param {Object} target - Target entity
   * @param {Object} options - Vision options
   * @returns {boolean}
   */
  canSee(perceiver, target, options = {}) {
    const visible = this.checkVision(perceiver, [target], options);
    return visible.length > 0;
  }

  /**
   * Get distance between two positions
   * @param {Object} pos1 - First position {x, z}
   * @param {Object} pos2 - Second position {x, z}
   * @returns {number}
   */
  getDistance(pos1, pos2) {
    const dx = pos2.x - pos1.x;
    const dz = pos2.z - pos1.z;
    return Math.sqrt(dx * dx + dz * dz);
  }

  /**
   * Get direction from one position to another
   * @param {Object} from - From position {x, z}
   * @param {Object} to - To position {x, z}
   * @returns {number} Angle in radians
   */
  getDirection(from, to) {
    return Math.atan2(to.z - from.z, to.x - from.x);
  }

  /**
   * Get statistics
   * @returns {Object}
   */
  getStatistics() {
    let totalMemories = 0;
    for (const entityMemories of this.memories.values()) {
      totalMemories += entityMemories.size;
    }

    return {
      ...this.stats,
      entitiesWithMemory: this.memories.size,
      totalMemories
    };
  }

  /**
   * Reset statistics
   */
  resetStatistics() {
    this.stats = {
      visionChecks: 0,
      hearingChecks: 0,
      memoriesCreated: 0,
      memoriesExpired: 0
    };
  }

  /**
   * Serialize to JSON
   * @returns {Object}
   */
  toJSON() {
    const memories = {};
    for (const [perceiverId, entityMemories] of this.memories) {
      memories[perceiverId] = {};
      for (const [targetId, memory] of entityMemories) {
        memories[perceiverId][targetId] = memory.toJSON();
      }
    }

    return {
      currentWeather: this.currentWeather,
      isNight: this.isNight,
      memories
    };
  }

  /**
   * Load from JSON
   * @param {Object} data
   */
  fromJSON(data) {
    this.currentWeather = data.currentWeather || 'CLEAR';
    this.isNight = data.isNight || false;

    this.memories.clear();
    if (data.memories) {
      for (const [perceiverId, entityMemories] of Object.entries(data.memories)) {
        const memoryMap = new Map();
        for (const [targetId, memoryData] of Object.entries(entityMemories)) {
          memoryMap.set(targetId, MemoryEntry.fromJSON(memoryData));
        }
        this.memories.set(perceiverId, memoryMap);
      }
    }
  }
}

export { MemoryEntry };
export default PerceptionSystem;
