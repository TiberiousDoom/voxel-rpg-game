/**
 * WeatherGameplayEffects.js - Applies weather conditions to gameplay
 *
 * Integrates Phase 3C WeatherSystem with gameplay mechanics:
 * - Movement speed modifiers based on weather
 * - Visibility effects for rendering
 * - Lightning strike damage during storms
 * - Environmental hazards
 *
 * Part of Phase 3: Gameplay Mechanics Integration
 *
 * Usage:
 *   const effects = new WeatherGameplayEffects(weatherSystem, gameState);
 *   effects.update(deltaTime);
 *   const speedModifier = effects.getMovementModifier(player.position);
 */

import { WeatherType } from './WeatherSystem.js';

/**
 * Lightning strike configuration
 */
const LIGHTNING_CONFIG = {
  DAMAGE_MIN: 10,
  DAMAGE_MAX: 30,
  STRIKE_RADIUS: 3, // tiles
  STRIKE_INTERVAL_MIN: 5000, // 5 seconds minimum between strikes
  STRIKE_INTERVAL_MAX: 15000, // 15 seconds maximum
  WARNING_DURATION: 1000, // 1 second warning before strike
  INDOOR_PROTECTION: true, // Structures protect from lightning
};

/**
 * Environmental damage types
 */
export const DAMAGE_TYPE = {
  LIGHTNING: 'lightning',
  COLD: 'cold',
  HEAT: 'heat',
  WIND: 'wind',
};

/**
 * WeatherGameplayEffects - Applies weather conditions to gameplay
 */
export class WeatherGameplayEffects {
  /**
   * Create weather gameplay effects system
   * @param {WeatherSystem} weatherSystem - Weather system instance
   * @param {object} options - Configuration options
   */
  constructor(weatherSystem, options = {}) {
    this.weatherSystem = weatherSystem;

    // Configuration
    this.config = {
      enableMovementModifiers: options.enableMovementModifiers !== false,
      enableVisibilityEffects: options.enableVisibilityEffects !== false,
      enableLightning: options.enableLightning !== false,
      enableEnvironmentalDamage: options.enableEnvironmentalDamage !== false,
      lightningDamageMultiplier: options.lightningDamageMultiplier || 1.0,
      ...options,
    };

    // Lightning strike state
    this.lightningStrikes = []; // Active lightning strikes
    this.nextLightningTime = 0;
    this.lightningWarnings = []; // Warning indicators before strikes

    // Event callbacks
    this.callbacks = {
      onLightningStrike: null,
      onLightningWarning: null,
      onWeatherDamage: null,
    };

    // Statistics
    this.stats = {
      lightningStrikes: 0,
      playersHitByLightning: 0,
      totalWeatherDamage: 0,
      damageByType: {},
    };
  }

  /**
   * Update weather effects
   * @param {number} deltaTime - Time since last update (ms)
   * @param {object} gameState - Current game state
   */
  update(deltaTime, gameState) {
    if (!this.config.enableLightning) return;

    const currentWeather = this.weatherSystem.getCurrentWeather(0, 0);

    // Update lightning strikes during storms
    if (currentWeather === WeatherType.STORM) {
      this._updateLightning(deltaTime, gameState);
    }

    // Update active lightning strike visuals
    this._updateActiveLightning(deltaTime);

    // Update lightning warnings
    this._updateLightningWarnings(deltaTime);
  }

  /**
   * Get movement speed modifier for a position
   * @param {object} position - World position {x, z}
   * @returns {number} Movement multiplier (0.5 = 50% speed)
   */
  getMovementModifier(position) {
    if (!this.config.enableMovementModifiers) return 1.0;

    const weather = this.weatherSystem.getCurrentWeather(position.x, position.z);
    const weatherData = this.weatherSystem.getWeatherData(weather);

    return weatherData?.movementModifier || 1.0;
  }

  /**
   * Get visibility modifier for rendering
   * @param {object} position - World position {x, z}
   * @returns {number} Visibility multiplier (0.5 = 50% visibility)
   */
  getVisibilityModifier(position) {
    if (!this.config.enableVisibilityEffects) return 1.0;

    const weather = this.weatherSystem.getCurrentWeather(position.x, position.z);
    const weatherData = this.weatherSystem.getWeatherData(weather);

    return weatherData?.visibility || 1.0;
  }

  /**
   * Get lighting modifier for rendering
   * @param {object} position - World position {x, z}
   * @returns {number} Lighting multiplier (0.5 = 50% brightness)
   */
  getLightingModifier(position) {
    const weather = this.weatherSystem.getCurrentWeather(position.x, position.z);
    const weatherData = this.weatherSystem.getWeatherData(weather);

    return weatherData?.lightingModifier || 1.0;
  }

  /**
   * Check if position is protected from weather (inside structure)
   * @param {object} position - World position {x, z}
   * @param {object} gameState - Game state with structures
   * @returns {boolean} True if protected
   */
  isProtectedFromWeather(position, gameState) {
    if (!LIGHTNING_CONFIG.INDOOR_PROTECTION) return false;
    if (!gameState?.structures) return false;

    // Check if player is inside any structure
    for (const structure of gameState.structures) {
      if (this._isInsideStructure(position, structure)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Update lightning strikes
   * @private
   */
  _updateLightning(deltaTime, gameState) {
    const now = Date.now();

    // Check if it's time for next lightning strike
    if (now >= this.nextLightningTime) {
      this._spawnLightningStrike(gameState);

      // Schedule next strike
      const interval = LIGHTNING_CONFIG.STRIKE_INTERVAL_MIN +
        Math.random() * (LIGHTNING_CONFIG.STRIKE_INTERVAL_MAX - LIGHTNING_CONFIG.STRIKE_INTERVAL_MIN);
      this.nextLightningTime = now + interval;
    }
  }

  /**
   * Spawn a lightning strike
   * @private
   */
  _spawnLightningStrike(gameState) {
    if (!gameState?.player) return;

    // Random position near player (within view distance)
    const playerPos = gameState.player.position;
    const angle = Math.random() * Math.PI * 2;
    const distance = 5 + Math.random() * 15; // 5-20 tiles from player

    const strikePosition = {
      x: playerPos.x + Math.cos(angle) * distance,
      z: playerPos.z + Math.sin(angle) * distance,
    };

    // Create warning indicator
    this._createLightningWarning(strikePosition);

    // Schedule actual strike after warning duration
    setTimeout(() => {
      this._executeLightningStrike(strikePosition, gameState);
    }, LIGHTNING_CONFIG.WARNING_DURATION);
  }

  /**
   * Create lightning warning indicator
   * @private
   */
  _createLightningWarning(position) {
    const warning = {
      position: { ...position },
      startTime: Date.now(),
      duration: LIGHTNING_CONFIG.WARNING_DURATION,
    };

    this.lightningWarnings.push(warning);

    this._emitCallback('onLightningWarning', warning);
  }

  /**
   * Execute lightning strike with damage
   * @private
   */
  _executeLightningStrike(position, gameState) {
    const strike = {
      position: { ...position },
      startTime: Date.now(),
      duration: 500, // Visual effect duration
      radius: LIGHTNING_CONFIG.STRIKE_RADIUS,
    };

    this.lightningStrikes.push(strike);
    this.stats.lightningStrikes++;

    // Calculate damage to entities in radius
    const damage = LIGHTNING_CONFIG.DAMAGE_MIN +
      Math.random() * (LIGHTNING_CONFIG.DAMAGE_MAX - LIGHTNING_CONFIG.DAMAGE_MIN);

    const finalDamage = Math.floor(damage * this.config.lightningDamageMultiplier);

    // Check if player is in range and not protected
    if (gameState.player) {
      const playerPos = gameState.player.position;
      const dist = Math.sqrt(
        Math.pow(playerPos.x - position.x, 2) +
        Math.pow(playerPos.z - position.z, 2)
      );

      if (dist <= LIGHTNING_CONFIG.STRIKE_RADIUS) {
        const isProtected = this.isProtectedFromWeather(playerPos, gameState);

        if (!isProtected) {
          this._applyWeatherDamage(gameState.player, finalDamage, DAMAGE_TYPE.LIGHTNING);
          this.stats.playersHitByLightning++;
        }
      }
    }

    // Emit strike event
    this._emitCallback('onLightningStrike', {
      position,
      damage: finalDamage,
      radius: LIGHTNING_CONFIG.STRIKE_RADIUS,
    });
  }

  /**
   * Apply weather damage to entity
   * @private
   */
  _applyWeatherDamage(entity, damage, damageType) {
    if (!this.config.enableEnvironmentalDamage) return;

    // Apply damage to entity
    if (entity.takeDamage) {
      entity.takeDamage(damage);
    } else if (entity.health !== undefined) {
      entity.health = Math.max(0, entity.health - damage);
    }

    // Update statistics
    this.stats.totalWeatherDamage += damage;
    this.stats.damageByType[damageType] = (this.stats.damageByType[damageType] || 0) + damage;

    // Emit damage event
    this._emitCallback('onWeatherDamage', {
      entity,
      damage,
      damageType,
      position: entity.position,
    });
  }

  /**
   * Update active lightning strike visuals
   * @private
   */
  _updateActiveLightning(deltaTime) {
    const now = Date.now();

    // Remove expired strikes
    this.lightningStrikes = this.lightningStrikes.filter(strike => {
      return (now - strike.startTime) < strike.duration;
    });
  }

  /**
   * Update lightning warnings
   * @private
   */
  _updateLightningWarnings(deltaTime) {
    const now = Date.now();

    // Remove expired warnings
    this.lightningWarnings = this.lightningWarnings.filter(warning => {
      return (now - warning.startTime) < warning.duration;
    });
  }

  /**
   * Check if position is inside structure
   * @private
   */
  _isInsideStructure(position, structure) {
    if (!structure.bounds) return false;

    const { x, z } = position;
    const { minX, maxX, minZ, maxZ } = structure.bounds;

    return x >= minX && x <= maxX && z >= minZ && z <= maxZ;
  }

  /**
   * Get active lightning strikes for rendering
   * @returns {array} Array of active lightning strikes
   */
  getActiveLightningStrikes() {
    return this.lightningStrikes;
  }

  /**
   * Get lightning warnings for rendering
   * @returns {array} Array of lightning warnings
   */
  getLightningWarnings() {
    return this.lightningWarnings;
  }

  /**
   * Register event callback
   * @param {string} event - Event name
   * @param {function} callback - Callback function
   */
  on(event, callback) {
    if (this.callbacks.hasOwnProperty(event)) {
      this.callbacks[event] = callback;
    }
  }

  /**
   * Emit callback event
   * @private
   */
  _emitCallback(event, data) {
    if (this.callbacks[event]) {
      this.callbacks[event](data);
    }
  }

  /**
   * Get weather gameplay statistics
   * @returns {object} Statistics object
   */
  getStats() {
    return {
      ...this.stats,
      activeLightningStrikes: this.lightningStrikes.length,
      activeWarnings: this.lightningWarnings.length,
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      lightningStrikes: 0,
      playersHitByLightning: 0,
      totalWeatherDamage: 0,
      damageByType: {},
    };
  }

  /**
   * Serialize state for save/load
   * @returns {object} Serialized state
   */
  serialize() {
    return {
      stats: this.stats,
      nextLightningTime: this.nextLightningTime,
    };
  }

  /**
   * Deserialize state from save data
   * @param {object} data - Saved state data
   */
  deserialize(data) {
    if (data.stats) {
      this.stats = { ...this.stats, ...data.stats };
    }
    if (data.nextLightningTime !== undefined) {
      this.nextLightningTime = data.nextLightningTime;
    }
  }
}

export default WeatherGameplayEffects;
