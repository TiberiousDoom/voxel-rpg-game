/**
 * SeasonalSystem.js
 * Manages seasonal variations across the game world
 *
 * Phase 3C: Advanced Biome Features
 *
 * Features:
 * - Four seasons with smooth transitions
 * - Season-specific visual changes (colors, props)
 * - Season-based weather probabilities
 * - Biome-specific seasonal effects
 * - Day-based progression or manual control
 */

/**
 * Season types
 */
export const SeasonType = {
  SPRING: 'spring',
  SUMMER: 'summer',
  AUTUMN: 'autumn',
  WINTER: 'winter',
};

/**
 * Season definitions
 */
const SEASON_DEFINITIONS = {
  spring: {
    id: 'spring',
    name: 'Spring',
    duration: 30, // days (configurable)
    colorModifier: {
      hueShift: 10, // Greenish tint
      saturation: 1.1,
      brightness: 1.05,
    },
    weatherModifiers: {
      rain: 1.5, // 50% more rain
      clear: 0.8,
    },
    propModifiers: {
      flowers: 2.0, // More flowers
      grass: 1.3,
    },
    description: 'A season of new growth and frequent rain',
  },

  summer: {
    id: 'summer',
    name: 'Summer',
    duration: 30,
    colorModifier: {
      hueShift: 5,
      saturation: 1.2,
      brightness: 1.15,
    },
    weatherModifiers: {
      clear: 1.5, // More clear weather
      rain: 0.5,
      storm: 1.2, // More storms
    },
    propModifiers: {
      flowers: 1.5,
      grass: 1.2,
      trees: 1.0,
    },
    description: 'A bright, warm season with occasional storms',
  },

  autumn: {
    id: 'autumn',
    name: 'Autumn',
    duration: 30,
    colorModifier: {
      hueShift: 30, // Orange/yellow tint
      saturation: 1.15,
      brightness: 0.95,
    },
    weatherModifiers: {
      fog: 1.5, // More fog
      cloudy: 1.3,
      clear: 0.9,
    },
    propModifiers: {
      flowers: 0.5, // Fewer flowers
      grass: 0.8,
      trees: 1.1, // Different tree colors
    },
    description: 'A season of harvest and falling leaves',
  },

  winter: {
    id: 'winter',
    name: 'Winter',
    duration: 30,
    colorModifier: {
      hueShift: -10, // Blueish tint
      saturation: 0.7,
      brightness: 1.1, // Brighter (snow reflection)
    },
    weatherModifiers: {
      snow: 3.0, // Much more snow
      blizzard: 2.0,
      clear: 0.6,
      rain: 0.2, // Less rain
    },
    propModifiers: {
      flowers: 0.1, // Almost no flowers
      grass: 0.5,
      trees: 0.9,
    },
    biomeTints: {
      // Biomes get white/blue tint in winter
      plains: '#E8F4F8',
      forest: '#D0E8F0',
      tundra: '#F0F8FF',
    },
    description: 'A cold season with snow and ice',
  },
};

/**
 * SeasonalSystem - Manages seasons
 */
export class SeasonalSystem {
  constructor(options = {}) {
    this.config = {
      enabled: options.enabled !== false,
      dayLength: options.dayLength || 600000, // 10 minutes per day (default)
      daysPerSeason: options.daysPerSeason || 30,
      transitionDuration: options.transitionDuration || 3, // days for transition
      autoProgress: options.autoProgress !== false,
      startSeason: options.startSeason || SeasonType.SPRING,
      ...options,
    };

    this.definitions = SEASON_DEFINITIONS;

    // Current state
    this.currentSeason = this.config.startSeason;
    this.nextSeason = this.getNextSeason(this.currentSeason);
    this.currentDay = 0;
    this.timeInDay = 0; // 0-1, current time within day
    this.transitionProgress = 0; // 0-1, transition between seasons

    // Statistics
    this.stats = {
      totalDays: 0,
      totalSeasons: 0,
      seasonHistory: [],
    };
  }

  /**
   * Update seasonal system
   * @param {number} deltaTime - Time since last update (ms)
   */
  update(deltaTime) {
    if (!this.config.enabled || !this.config.autoProgress) {
      return;
    }

    this.timeInDay += deltaTime / this.config.dayLength;

    // Check if day completed
    if (this.timeInDay >= 1.0) {
      this.timeInDay = 0;
      this.currentDay++;
      this.stats.totalDays++;

      // Check if season change needed
      const seasonDef = this.definitions[this.currentSeason];
      if (this.currentDay >= seasonDef.duration) {
        this.changeSeason();
      }
    }

    // Update transition progress
    const daysIntoSeason = this.currentDay;
    const transitionDays = this.config.transitionDuration;

    if (daysIntoSeason < transitionDays) {
      // Transitioning from previous season
      this.transitionProgress = daysIntoSeason / transitionDays;
    } else {
      this.transitionProgress = 1.0; // Fully in current season
    }
  }

  /**
   * Change to next season
   */
  changeSeason(forceSeason = null) {
    const previousSeason = this.currentSeason;

    if (forceSeason && this.definitions[forceSeason]) {
      this.currentSeason = forceSeason;
    } else {
      this.currentSeason = this.nextSeason;
    }

    this.nextSeason = this.getNextSeason(this.currentSeason);
    this.currentDay = 0;
    this.transitionProgress = 0;

    this.stats.totalSeasons++;
    this.stats.seasonHistory.push({
      season: previousSeason,
      duration: this.currentDay,
      timestamp: Date.now(),
    });

    // Keep history limited
    if (this.stats.seasonHistory.length > 20) {
      this.stats.seasonHistory.shift();
    }
  }

  /**
   * Get next season in cycle
   */
  getNextSeason(currentSeason) {
    const cycle = [
      SeasonType.SPRING,
      SeasonType.SUMMER,
      SeasonType.AUTUMN,
      SeasonType.WINTER,
    ];

    const currentIndex = cycle.indexOf(currentSeason);
    return cycle[(currentIndex + 1) % cycle.length];
  }

  /**
   * Get current season definition
   */
  getCurrentSeasonDefinition() {
    return this.definitions[this.currentSeason];
  }

  /**
   * Get season color modifier for blending
   */
  getColorModifier() {
    const currentDef = this.definitions[this.currentSeason];

    // If transitioning, blend with previous season
    if (this.transitionProgress < 1.0) {
      const previousSeason = this.getPreviousSeason(this.currentSeason);
      const previousDef = this.definitions[previousSeason];

      return {
        hueShift: this.blend(previousDef.colorModifier.hueShift,
          currentDef.colorModifier.hueShift, this.transitionProgress),
        saturation: this.blend(previousDef.colorModifier.saturation,
          currentDef.colorModifier.saturation, this.transitionProgress),
        brightness: this.blend(previousDef.colorModifier.brightness,
          currentDef.colorModifier.brightness, this.transitionProgress),
      };
    }

    return currentDef.colorModifier;
  }

  /**
   * Get weather probability modifier for a weather type
   */
  getWeatherModifier(weatherType) {
    const seasonDef = this.getCurrentSeasonDefinition();
    return seasonDef.weatherModifiers[weatherType] || 1.0;
  }

  /**
   * Get prop spawn rate modifier for a prop type
   */
  getPropModifier(propType) {
    const seasonDef = this.getCurrentSeasonDefinition();
    return seasonDef.propModifiers[propType] || 1.0;
  }

  /**
   * Get biome tint color for current season
   */
  getBiomeTint(biome) {
    const seasonDef = this.getCurrentSeasonDefinition();
    return seasonDef.biomeTints?.[biome] || null;
  }

  /**
   * Apply seasonal color modification to a base color
   */
  applySeasonalColor(baseColor, biome = null) {
    const colorMod = this.getColorModifier();
    const biomeTint = biome ? this.getBiomeTint(biome) : null;

    // Parse base color
    const rgb = this.hexToRgb(baseColor);

    // Apply brightness
    let r = rgb.r * colorMod.brightness;
    let g = rgb.g * colorMod.brightness;
    let b = rgb.b * colorMod.brightness;

    // Apply saturation (convert to HSL, modify, convert back)
    // Simplified: just scale color intensity
    const avg = (r + g + b) / 3;
    r = avg + (r - avg) * colorMod.saturation;
    g = avg + (g - avg) * colorMod.saturation;
    b = avg + (b - avg) * colorMod.saturation;

    // Apply hue shift (simplified rotation)
    const hueShift = colorMod.hueShift / 360;
    if (Math.abs(hueShift) > 0.01) {
      r += hueShift * 100;
      g += hueShift * 50;
      b -= hueShift * 50;
    }

    // Blend with biome tint if present
    if (biomeTint) {
      const tintRgb = this.hexToRgb(biomeTint);
      const tintStrength = 0.3; // 30% tint blend
      r = r * (1 - tintStrength) + tintRgb.r * tintStrength;
      g = g * (1 - tintStrength) + tintRgb.g * tintStrength;
      b = b * (1 - tintStrength) + tintRgb.b * tintStrength;
    }

    // Clamp and convert back
    r = Math.max(0, Math.min(255, Math.round(r)));
    g = Math.max(0, Math.min(255, Math.round(g)));
    b = Math.max(0, Math.min(255, Math.round(b)));

    return this.rgbToHex(r, g, b);
  }

  /**
   * Get previous season in cycle
   */
  getPreviousSeason(currentSeason) {
    const cycle = [
      SeasonType.SPRING,
      SeasonType.SUMMER,
      SeasonType.AUTUMN,
      SeasonType.WINTER,
    ];

    const currentIndex = cycle.indexOf(currentSeason);
    return cycle[(currentIndex - 1 + cycle.length) % cycle.length];
  }

  /**
   * Blend two values
   */
  blend(a, b, t) {
    return a + (b - a) * t;
  }

  /**
   * Convert hex to RGB
   */
  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 136, g: 170, b: 136 };
  }

  /**
   * Convert RGB to hex
   */
  rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  /**
   * Get current season info
   */
  getCurrentSeasonInfo() {
    return {
      season: this.currentSeason,
      nextSeason: this.nextSeason,
      currentDay: this.currentDay,
      timeInDay: this.timeInDay,
      transitionProgress: this.transitionProgress,
      daysUntilNext: this.definitions[this.currentSeason].duration - this.currentDay,
    };
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      ...this.stats,
      currentSeason: this.currentSeason,
      currentDay: this.currentDay,
    };
  }

  /**
   * Set season manually
   */
  setSeason(season) {
    if (this.definitions[season]) {
      this.changeSeason(season);
    }
  }

  /**
   * Set time in day (0-1)
   */
  setTimeInDay(time) {
    this.timeInDay = Math.max(0, Math.min(1, time));
  }

  /**
   * Serialize state
   */
  serialize() {
    return {
      currentSeason: this.currentSeason,
      currentDay: this.currentDay,
      timeInDay: this.timeInDay,
      stats: this.stats,
    };
  }

  /**
   * Deserialize state
   */
  deserialize(data) {
    if (data) {
      this.currentSeason = data.currentSeason || SeasonType.SPRING;
      this.currentDay = data.currentDay || 0;
      this.timeInDay = data.timeInDay || 0;
      this.stats = data.stats || this.stats;
      this.nextSeason = this.getNextSeason(this.currentSeason);
    }
  }
}

export default SeasonalSystem;
