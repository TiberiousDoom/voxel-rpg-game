/**
 * WeatherSystem.js - Dynamic weather and climate system
 *
 * Phase 3: Weather/Climate System
 *
 * Features:
 * - Biome-based weather patterns
 * - Dynamic weather transitions
 * - Weather effects (rain, snow, fog)
 * - Time-based weather cycles
 * - Visual effects support
 *
 * Usage:
 *   const weather = new WeatherSystem(worldGenerator);
 *   weather.update(deltaTime);
 *   const currentWeather = weather.getCurrentWeather(x, z);
 */

/**
 * Weather types - Phase 3C: Extended weather types
 */
export const WeatherType = {
  CLEAR: 'clear',
  CLOUDY: 'cloudy',
  RAIN: 'rain',
  HEAVY_RAIN: 'heavy_rain',
  SNOW: 'snow',
  BLIZZARD: 'blizzard',
  SANDSTORM: 'sandstorm',
  FOG: 'fog',
  STORM: 'storm'
};

/**
 * Biome-based weather rules - Phase 3C: Enhanced weather probabilities
 * Defines probability of each weather type per biome
 */
const BiomeWeatherRules = {
  ocean: {
    clear: 0.3,
    cloudy: 0.2,
    rain: 0.2,
    storm: 0.2,
    fog: 0.1
  },
  beach: {
    clear: 0.6,
    cloudy: 0.2,
    rain: 0.1,
    fog: 0.1
  },
  plains: {
    clear: 0.5,
    cloudy: 0.2,
    rain: 0.2,
    storm: 0.1
  },
  forest: {
    clear: 0.4,
    cloudy: 0.2,
    rain: 0.3,
    fog: 0.1
  },
  desert: {
    clear: 0.7,
    cloudy: 0.2,
    sandstorm: 0.1
  },
  tundra: {
    clear: 0.3,
    snow: 0.4,
    blizzard: 0.2,
    fog: 0.1
  },
  mountains: {
    clear: 0.2,
    cloudy: 0.2,
    snow: 0.3,
    blizzard: 0.1,
    fog: 0.1,
    storm: 0.1
  },
  swamp: {
    clear: 0.3,
    cloudy: 0.2,
    rain: 0.2,
    heavy_rain: 0.2,
    fog: 0.1
  },
  hills: {
    clear: 0.5,
    cloudy: 0.2,
    rain: 0.2,
    fog: 0.1
  }
};

/**
 * Weather visual effects configuration - Phase 3C: Enhanced with gameplay modifiers
 */
const WeatherEffects = {
  [WeatherType.CLEAR]: {
    particles: 0,
    opacity: 0,
    windSpeed: 0.1,
    visibility: 1.0,
    lightingModifier: 1.0,
    movementModifier: 1.0
  },
  [WeatherType.CLOUDY]: {
    particles: 0,
    opacity: 0.1,
    windSpeed: 0.2,
    visibility: 0.95,
    lightingModifier: 0.85,
    movementModifier: 1.0,
    overlayColor: 'rgba(100, 100, 120, 0.1)'
  },
  [WeatherType.RAIN]: {
    particles: 200,
    particleColor: 'rgba(150, 200, 255, 0.6)',
    particleSize: 2,
    particleSpeed: 8,
    opacity: 0.3,
    windSpeed: 0.3,
    visibility: 0.8,
    lightingModifier: 0.7,
    movementModifier: 0.95
  },
  [WeatherType.HEAVY_RAIN]: {
    particles: 350,
    particleColor: 'rgba(120, 180, 230, 0.7)',
    particleSize: 3,
    particleSpeed: 10,
    opacity: 0.4,
    windSpeed: 0.5,
    visibility: 0.6,
    lightingModifier: 0.6,
    movementModifier: 0.85,
    overlayColor: 'rgba(50, 80, 120, 0.2)'
  },
  [WeatherType.SNOW]: {
    particles: 150,
    particleColor: 'rgba(255, 255, 255, 0.8)',
    particleSize: 3,
    particleSpeed: 2,
    opacity: 0.2,
    windSpeed: 0.2,
    visibility: 0.85,
    lightingModifier: 0.9,
    movementModifier: 0.9
  },
  [WeatherType.BLIZZARD]: {
    particles: 400,
    particleColor: 'rgba(240, 248, 255, 0.85)',
    particleSize: 4,
    particleSpeed: 4,
    opacity: 0.6,
    windSpeed: 0.7,
    visibility: 0.4,
    lightingModifier: 0.7,
    movementModifier: 0.7,
    overlayColor: 'rgba(220, 230, 255, 0.3)'
  },
  [WeatherType.SANDSTORM]: {
    particles: 300,
    particleColor: 'rgba(222, 184, 135, 0.7)',
    particleSize: 3,
    particleSpeed: 6,
    opacity: 0.5,
    windSpeed: 0.8,
    visibility: 0.5,
    lightingModifier: 0.75,
    movementModifier: 0.8,
    overlayColor: 'rgba(200, 160, 100, 0.25)'
  },
  [WeatherType.FOG]: {
    particles: 50,
    particleColor: 'rgba(200, 200, 200, 0.5)',
    particleSize: 20,
    particleSpeed: 0.5,
    opacity: 0.5,
    windSpeed: 0.1,
    visibility: 0.5,
    lightingModifier: 0.8,
    movementModifier: 0.95,
    overlayColor: 'rgba(200, 200, 220, 0.3)'
  },
  [WeatherType.STORM]: {
    particles: 300,
    particleColor: 'rgba(100, 150, 200, 0.7)',
    particleSize: 3,
    particleSpeed: 12,
    opacity: 0.5,
    windSpeed: 0.8,
    visibility: 0.5,
    lightingModifier: 0.5,
    movementModifier: 0.8,
    overlayColor: 'rgba(40, 60, 80, 0.2)',
    lightning: true,
    lightningChance: 0.01
  }
};

/**
 * WeatherSystem class
 */
export class WeatherSystem {
  /**
   * Create a weather system
   * @param {WorldGenerator} worldGenerator - World generator for biome data
   * @param {object} options - Configuration options
   */
  constructor(worldGenerator = null, options = {}) {
    this.worldGenerator = worldGenerator;

    this.config = {
      weatherChangeDuration: options.weatherChangeDuration || 300000, // 5 minutes default
      enableWeather: options.enableWeather !== false, // Default: enabled
      globalWeather: options.globalWeather !== false, // Same weather everywhere (default: true)
      ...options
    };

    // Current weather state
    this.currentWeather = WeatherType.CLEAR;
    this.targetWeather = WeatherType.CLEAR;
    this.transitionProgress = 1.0; // 0-1, 1 = fully transitioned
    this.timeSinceLastChange = 0;

    // Weather particles (for rendering)
    this.particles = [];
    this.maxParticles = 0;

    // Phase 3C: Lightning tracking
    this.lightningFlashes = [];

    // Phase 3C: Statistics
    this.stats = {
      weatherChanges: 0,
      weatherByType: {},
      lightningStrikes: 0,
    };
  }

  /**
   * Update weather system
   * @param {number} deltaTime - Time since last update (ms)
   */
  update(deltaTime) {
    if (!this.config.enableWeather) {
      this.timeSinceLastChange += deltaTime;  // Track time even when disabled
      return;
    }

    this.timeSinceLastChange += deltaTime;

    // Check if it's time to change weather
    if (this.timeSinceLastChange >= this.config.weatherChangeDuration) {
      this.changeWeather();
      this.timeSinceLastChange = 0;
    }

    // Update transition
    if (this.transitionProgress < 1.0) {
      this.transitionProgress = Math.min(1.0, this.transitionProgress + (deltaTime / 5000)); // 5s transition
    }

    // Update particles
    this.updateParticles(deltaTime);

    // Phase 3C: Update lightning
    this.updateLightning(deltaTime);
  }

  /**
   * Change to a new weather pattern
   * @param {string} biome - Biome type for weather selection (optional)
   */
  changeWeather(biome = 'plains') {
    // Select new weather based on biome rules
    const weatherRules = BiomeWeatherRules[biome] || BiomeWeatherRules.plains;

    const rand = Math.random();
    let cumulative = 0;

    for (const [weather, probability] of Object.entries(weatherRules)) {
      cumulative += probability;
      if (rand <= cumulative) {
        this.targetWeather = weather;
        break;
      }
    }

    // Start transition
    this.transitionProgress = 0.0;

    // Update particle count
    const effects = WeatherEffects[this.targetWeather];
    this.maxParticles = effects.particles;
  }

  /**
   * Get current weather at a location
   * @param {number} x - X coordinate
   * @param {number} z - Z coordinate
   * @returns {string} Weather type
   */
  getCurrentWeather(x, z) {
    if (this.config.globalWeather) {
      // Same weather everywhere
      return this.transitionProgress >= 1.0 ? this.targetWeather : this.currentWeather;
    }

    // Biome-specific weather (if worldGenerator available)
    if (this.worldGenerator) {
      const biome = this.worldGenerator.getBiome(x, z);
      const weatherRules = BiomeWeatherRules[biome] || BiomeWeatherRules.plains;

      // Simple: return most likely weather for this biome
      let maxProb = 0;
      let bestWeather = WeatherType.CLEAR;

      for (const [weather, probability] of Object.entries(weatherRules)) {
        if (probability > maxProb) {
          maxProb = probability;
          bestWeather = weather;
        }
      }

      return bestWeather;
    }

    return this.currentWeather;
  }

  /**
   * Get weather effects configuration
   * @param {string} weatherType - Weather type (optional, uses current if not specified)
   * @returns {object} Weather effects configuration
   */
  getWeatherEffects(weatherType = null) {
    const weather = weatherType || this.currentWeather;
    return WeatherEffects[weather] || WeatherEffects[WeatherType.CLEAR];
  }

  /**
   * Get weather data (alias for getWeatherEffects for gameplay integration)
   * @param {string} weatherType - Weather type
   * @returns {object} Weather data with modifiers
   */
  getWeatherData(weatherType) {
    return this.getWeatherEffects(weatherType);
  }

  /**
   * Update weather particles for rendering
   * @param {number} deltaTime - Time since last update (ms)
   */
  updateParticles(deltaTime) {
    const effects = this.getWeatherEffects(this.targetWeather);

    // Add particles if below max
    while (this.particles.length < this.maxParticles) {
      this.particles.push({
        x: Math.random() * 1000, // Canvas width (adjust as needed)
        y: Math.random() * -100, // Start above screen
        vx: (Math.random() - 0.5) * effects.windSpeed,
        vy: effects.particleSpeed
      });
    }

    // Remove excess particles
    if (this.particles.length > this.maxParticles) {
      this.particles = this.particles.slice(0, this.maxParticles);
    }

    // Update particle positions
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.x += p.vx * (deltaTime / 16);
      p.y += p.vy * (deltaTime / 16);

      // Respawn particle if it goes off screen
      if (p.y > 800) { // Canvas height (adjust as needed)
        p.y = -10;
        p.x = Math.random() * 1000;
      }

      if (p.x < -10 || p.x > 1010) {
        p.x = Math.random() * 1000;
        p.y = Math.random() * 800;
      }
    }
  }

  /**
   * Get current weather particles for rendering
   * @returns {Array<{x, y}>} Array of particle positions
   */
  getParticles() {
    return this.particles;
  }

  /**
   * Set weather manually (for testing/events)
   * @param {string} weatherType - Weather type to set
   */
  setWeather(weatherType) {
    if (!Object.values(WeatherType).includes(weatherType)) {
      console.warn(`Invalid weather type: ${weatherType}`);
      return;
    }

    this.currentWeather = this.targetWeather;
    this.targetWeather = weatherType;
    this.transitionProgress = 0.0;

    const effects = WeatherEffects[weatherType];
    this.maxParticles = effects.particles;
  }

  /**
   * Get weather statistics for a region
   * @param {number} startX - Region start X
   * @param {number} startZ - Region start Z
   * @param {number} width - Region width
   * @param {number} depth - Region depth
   * @returns {object} Weather stats
   */
  getRegionWeatherStats(startX, startZ, width, depth) {
    if (!this.worldGenerator) {
      return { globalWeather: this.currentWeather };
    }

    const weatherCounts = {};

    for (let z = startZ; z < startZ + depth; z += 5) { // Sample every 5 tiles
      for (let x = startX; x < startX + width; x += 5) {
        const weather = this.getCurrentWeather(x, z);
        weatherCounts[weather] = (weatherCounts[weather] || 0) + 1;
      }
    }

    return weatherCounts;
  }

  /**
   * Phase 3C: Update lightning flashes
   * @param {number} deltaTime - Time since last update (ms)
   */
  updateLightning(deltaTime) {
    const effects = this.getWeatherEffects(this.targetWeather);

    // Spawn lightning
    if (effects.lightning && Math.random() < (effects.lightningChance * (deltaTime / 16))) {
      this.lightningFlashes.push({
        startTime: Date.now(),
        duration: 100 + Math.random() * 200, // 100-300ms
        intensity: 0.5 + Math.random() * 0.5, // 0.5-1.0
      });
      this.stats.lightningStrikes++;
    }

    // Remove expired lightning
    const currentTime = Date.now();
    this.lightningFlashes = this.lightningFlashes.filter(
      flash => currentTime - flash.startTime < flash.duration
    );
  }

  /**
   * Phase 3C: Get current lightning intensity (0-1)
   * @returns {number} Lightning intensity
   */
  getLightningIntensity() {
    if (this.lightningFlashes.length === 0) return 0;

    const currentTime = Date.now();
    let maxIntensity = 0;

    for (const flash of this.lightningFlashes) {
      const elapsed = currentTime - flash.startTime;
      const progress = elapsed / flash.duration;

      // Fade in/out
      let flashIntensity;
      if (progress < 0.2) {
        flashIntensity = progress / 0.2; // Fast fade in
      } else {
        flashIntensity = 1 - ((progress - 0.2) / 0.8); // Slow fade out
      }

      flashIntensity *= flash.intensity;
      maxIntensity = Math.max(maxIntensity, flashIntensity);
    }

    return maxIntensity;
  }

  /**
   * Phase 3C: Get visibility modifier (0-1)
   * @returns {number} Visibility modifier
   */
  getVisibility() {
    const effects = this.getWeatherEffects(this.targetWeather);
    return effects.visibility || 1.0;
  }

  /**
   * Phase 3C: Get lighting modifier (0-1) with lightning flash
   * @returns {number} Lighting modifier
   */
  getLightingModifier() {
    const effects = this.getWeatherEffects(this.targetWeather);
    const lightning = this.getLightningIntensity();
    return Math.min(1.0, (effects.lightingModifier || 1.0) + lightning * 0.5);
  }

  /**
   * Phase 3C: Get movement speed modifier (0-1)
   * @returns {number} Movement modifier
   */
  getMovementModifier() {
    const effects = this.getWeatherEffects(this.targetWeather);
    return effects.movementModifier || 1.0;
  }

  /**
   * Phase 3C: Get weather overlay color
   * @returns {string|null} Overlay color or null
   */
  getOverlayColor() {
    const effects = this.getWeatherEffects(this.targetWeather);
    return effects.overlayColor || null;
  }

  /**
   * Phase 3C: Get weather statistics
   * @returns {object} Weather statistics
   */
  getStats() {
    return {
      ...this.stats,
      currentWeather: this.currentWeather,
      targetWeather: this.targetWeather,
      transitionProgress: this.transitionProgress,
      activeLightning: this.lightningFlashes.length,
    };
  }

  /**
   * Serialize weather state for saving
   * @returns {object} Serialized state
   */
  serialize() {
    return {
      currentWeather: this.currentWeather,
      targetWeather: this.targetWeather,
      transitionProgress: this.transitionProgress,
      timeSinceLastChange: this.timeSinceLastChange
    };
  }

  /**
   * Deserialize weather state from save
   * @param {object} data - Serialized state
   */
  deserialize(data) {
    if (data) {
      this.currentWeather = data.currentWeather || WeatherType.CLEAR;
      this.targetWeather = data.targetWeather || WeatherType.CLEAR;
      this.transitionProgress = data.transitionProgress || 1.0;
      this.timeSinceLastChange = data.timeSinceLastChange || 0;

      // Reinitialize particles
      const effects = WeatherEffects[this.currentWeather];
      this.maxParticles = effects.particles;
      this.particles = [];
    }
  }
}
