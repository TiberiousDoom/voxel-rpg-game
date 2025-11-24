/**
 * SeasonalEventSystem.js - Dynamic seasonal events
 *
 * Creates events based on current season:
 * - Spring: Growth Festival, Flower Bloom, Rainy Days
 * - Summer: Heat Wave, Abundant Harvest, Thunderstorms
 * - Autumn: Harvest Festival, Leaf Fall, Preparation
 * - Winter: Frost, Blizzards, Survival Challenge
 *
 * Part of Phase 3: Gameplay Mechanics Integration
 *
 * Usage:
 *   const events = new SeasonalEventSystem(seasonalSystem);
 *   events.update(deltaTime);
 */

import { SeasonType } from '../environment/SeasonalSystem.js';

/**
 * Seasonal event definitions
 */
const SEASONAL_EVENTS = {
  // === SPRING EVENTS ===
  spring_growth_festival: {
    id: 'spring_growth_festival',
    name: 'Growth Festival',
    season: SeasonType.SPRING,
    description: 'Nature blooms with vitality! Plant growth is accelerated.',
    duration: 3, // days
    probability: 0.3,
    effects: {
      plantGrowth: 2.0, // Plants grow 2x faster
      harvestYield: 1.5, // 50% more yield from plants
      animalSpawn: 1.3, // More animals
    },
    rewards: {
      experience: 100,
      materials: { seed: 10, herb: 5 },
    },
  },

  spring_flower_bloom: {
    id: 'spring_flower_bloom',
    name: 'Flower Bloom',
    season: SeasonType.SPRING,
    description: 'Flowers bloom across the land, attracting beneficial insects.',
    duration: 2,
    probability: 0.5,
    effects: {
      flowerDensity: 3.0,
      herbYield: 1.5,
      honeyProduction: 2.0,
    },
    rewards: {
      materials: { flower: 20, herb: 10 },
    },
  },

  spring_rain_blessing: {
    id: 'spring_rain_blessing',
    name: 'Rain Blessing',
    season: SeasonType.SPRING,
    description: 'Gentle rain nourishes the earth.',
    duration: 1,
    probability: 0.7,
    effects: {
      waterRegen: 1.5,
      fishSpawn: 1.8,
      plantGrowth: 1.3,
    },
    rewards: {
      experience: 50,
    },
  },

  // === SUMMER EVENTS ===
  summer_heat_wave: {
    id: 'summer_heat_wave',
    name: 'Heat Wave',
    season: SeasonType.SUMMER,
    description: 'Scorching heat tests endurance. Water becomes critical.',
    duration: 2,
    probability: 0.4,
    effects: {
      waterConsumption: 2.0, // Need more water
      plantGrowth: 0.5, // Plants struggle
      staminaDrain: 1.5, // Stamina drains faster
    },
    challenges: {
      surviveWithoutWater: { penalty: -50, reward: 200 },
    },
  },

  summer_abundant_harvest: {
    id: 'summer_abundant_harvest',
    name: 'Abundant Harvest',
    season: SeasonType.SUMMER,
    description: 'Crops reach peak ripeness! Perfect time to harvest.',
    duration: 3,
    probability: 0.6,
    effects: {
      harvestYield: 2.0,
      cropQuality: 1.5,
      foodValue: 1.3,
    },
    rewards: {
      materials: { berry: 30, mushroom: 15, herb: 20 },
    },
  },

  summer_thunderstorm: {
    id: 'summer_thunderstorm',
    name: 'Thunderstorm Season',
    season: SeasonType.SUMMER,
    description: 'Frequent storms charge the air with energy.',
    duration: 2,
    probability: 0.5,
    effects: {
      stormFrequency: 3.0,
      lightningDamage: 1.5,
      crystalGrowth: 1.8, // Storms create crystals
    },
    rewards: {
      materials: { crystal: 5 },
    },
  },

  // === AUTUMN EVENTS ===
  autumn_harvest_festival: {
    id: 'autumn_harvest_festival',
    name: 'Harvest Festival',
    season: SeasonType.AUTUMN,
    description: 'A time of celebration and abundance before winter.',
    duration: 5,
    probability: 0.8,
    effects: {
      harvestYield: 1.8,
      foodPreservation: 2.0,
      tradingBonus: 1.5,
    },
    rewards: {
      experience: 300,
      materials: { wood: 50, stone: 30, food: 40 },
    },
  },

  autumn_falling_leaves: {
    id: 'autumn_falling_leaves',
    name: 'Falling Leaves',
    season: SeasonType.AUTUMN,
    description: 'Leaves fall, revealing hidden treasures beneath trees.',
    duration: 3,
    probability: 0.6,
    effects: {
      foragingBonus: 1.8,
      hiddenItemChance: 2.0,
      woodYield: 1.3,
    },
    rewards: {
      materials: { wood: 20, mushroom: 15 },
    },
  },

  autumn_preparation: {
    id: 'autumn_preparation',
    name: 'Winter Preparation',
    season: SeasonType.AUTUMN,
    description: 'Time to gather supplies before the harsh winter.',
    duration: 4,
    probability: 0.7,
    effects: {
      storageCost: 0.5, // Cheaper storage
      craftingSpeed: 1.5,
      resourceGathering: 1.4,
    },
    rewards: {
      experience: 150,
    },
  },

  // === WINTER EVENTS ===
  winter_frost: {
    id: 'winter_frost',
    name: 'Deep Frost',
    season: SeasonType.WINTER,
    description: 'Extreme cold freezes the land. Survival is paramount.',
    duration: 3,
    probability: 0.6,
    effects: {
      movementSpeed: 0.7, // Slower movement
      coldDamage: 2.0,
      fuelConsumption: 2.5,
      iceFormation: 3.0, // More ice to harvest
    },
    challenges: {
      surviveTheCold: { penalty: -100, reward: 400 },
    },
  },

  winter_blizzard_season: {
    id: 'winter_blizzard_season',
    name: 'Blizzard Season',
    season: SeasonType.WINTER,
    description: 'Frequent blizzards reduce visibility to near zero.',
    duration: 2,
    probability: 0.5,
    effects: {
      blizzardFrequency: 4.0,
      visibility: 0.3,
      indoorBonus: 1.5, // Bonus to indoor activities
    },
    rewards: {
      materials: { ice: 30 },
    },
  },

  winter_aurora: {
    id: 'winter_aurora',
    name: 'Aurora Lights',
    season: SeasonType.WINTER,
    description: 'Beautiful aurora lights grant magical blessings.',
    duration: 1,
    probability: 0.3,
    effects: {
      manaRegen: 2.0,
      magicPower: 1.5,
      crystalGrowth: 2.0,
    },
    rewards: {
      experience: 200,
      materials: { crystal: 10, essence: 5 },
    },
  },

  winter_solstice: {
    id: 'winter_solstice',
    name: 'Winter Solstice',
    season: SeasonType.WINTER,
    description: 'The longest night of the year. Rare resources appear.',
    duration: 1,
    probability: 0.2,
    effects: {
      rareSpawns: 3.0,
      nightBonus: 2.0,
      mysticalEncounters: 5.0,
    },
    rewards: {
      experience: 500,
      materials: { crystal: 20, rare_gem: 1 },
    },
  },
};

/**
 * SeasonalEventSystem - Manages dynamic seasonal events
 */
export class SeasonalEventSystem {
  /**
   * Create seasonal event system
   * @param {object} seasonalSystem - SeasonalSystem instance
   * @param {object} options - Configuration options
   */
  constructor(seasonalSystem, options = {}) {
    this.seasonalSystem = seasonalSystem;

    // Configuration
    this.config = {
      enableEvents: options.enableEvents !== false,
      eventCheckInterval: options.eventCheckInterval || 86400000, // Check daily (24h in ms)
      maxActiveEvents: options.maxActiveEvents || 2,
      ...options,
    };

    // Active events (eventId -> event data)
    this.activeEvents = new Map();

    // Event history
    this.eventHistory = [];

    // Time tracking
    this.lastEventCheck = 0;

    // Event callbacks
    this.callbacks = {
      onEventStart: null,
      onEventEnd: null,
      onEventReward: null,
    };

    // Statistics
    this.stats = {
      totalEventsTriggered: 0,
      eventsByType: {},
      rewardsEarned: {},
    };
  }

  /**
   * Update seasonal events
   * @param {number} deltaTime - Time since last update (ms)
   */
  update(deltaTime) {
    if (!this.config.enableEvents) return;

    this.lastEventCheck += deltaTime;

    // Check for new events daily
    if (this.lastEventCheck >= this.config.eventCheckInterval) {
      this.lastEventCheck = 0;
      this._checkForNewEvents();
    }

    // Update active events
    this._updateActiveEvents(deltaTime);
  }

  /**
   * Check for new seasonal events
   * @private
   */
  _checkForNewEvents() {
    if (this.activeEvents.size >= this.config.maxActiveEvents) {
      return; // Max events already active
    }

    const currentSeason = this.seasonalSystem.getCurrentSeason();
    const eligibleEvents = this._getEligibleEvents(currentSeason);

    for (const eventDef of eligibleEvents) {
      // Check probability
      if (Math.random() > eventDef.probability) {
        continue;
      }

      // Start event
      this.startEvent(eventDef.id);

      // Only start one event per check
      break;
    }
  }

  /**
   * Get eligible events for current season
   * @private
   */
  _getEligibleEvents(season) {
    const eligible = [];

    for (const eventDef of Object.values(SEASONAL_EVENTS)) {
      // Check if event matches season
      if (eventDef.season !== season) {
        continue;
      }

      // Check if already active
      if (this.activeEvents.has(eventDef.id)) {
        continue;
      }

      eligible.push(eventDef);
    }

    return eligible;
  }

  /**
   * Start a seasonal event
   * @param {string} eventId - Event identifier
   * @returns {boolean} True if started successfully
   */
  startEvent(eventId) {
    const eventDef = SEASONAL_EVENTS[eventId];
    if (!eventDef) {
      return false;
    }

    // Create active event
    const activeEvent = {
      ...eventDef,
      startTime: Date.now(),
      endTime: Date.now() + (eventDef.duration * this.seasonalSystem.config.dayLength),
      active: true,
    };

    this.activeEvents.set(eventId, activeEvent);

    // Update statistics
    this.stats.totalEventsTriggered++;
    this.stats.eventsByType[eventId] = (this.stats.eventsByType[eventId] || 0) + 1;

    // Emit event
    this._emitCallback('onEventStart', { event: activeEvent });

    return true;
  }

  /**
   * Update active events
   * @private
   */
  _updateActiveEvents(deltaTime) {
    const now = Date.now();

    for (const [eventId, event] of this.activeEvents.entries()) {
      // Check if event has ended
      if (now >= event.endTime) {
        this._endEvent(eventId);
      }
    }
  }

  /**
   * End an active event
   * @private
   */
  _endEvent(eventId) {
    const event = this.activeEvents.get(eventId);
    if (!event) return;

    event.active = false;
    event.completedAt = Date.now();

    // Move to history
    this.eventHistory.push({
      eventId,
      startTime: event.startTime,
      endTime: event.endTime,
      completedAt: event.completedAt,
    });

    // Remove from active
    this.activeEvents.delete(eventId);

    // Grant rewards
    if (event.rewards) {
      this._grantRewards(event.rewards);
    }

    // Emit event
    this._emitCallback('onEventEnd', { event });
  }

  /**
   * Grant event rewards
   * @private
   */
  _grantRewards(rewards) {
    // Track rewards in stats
    if (rewards.experience) {
      this.stats.rewardsEarned.experience = (this.stats.rewardsEarned.experience || 0) + rewards.experience;
    }

    if (rewards.materials) {
      for (const [material, amount] of Object.entries(rewards.materials)) {
        this.stats.rewardsEarned[material] = (this.stats.rewardsEarned[material] || 0) + amount;
      }
    }

    // Emit reward event
    this._emitCallback('onEventReward', { rewards });
  }

  /**
   * Get active events
   * @returns {array} Array of active events
   */
  getActiveEvents() {
    return Array.from(this.activeEvents.values());
  }

  /**
   * Get effect multipliers from active events
   * @param {string} effectType - Effect type (e.g., 'harvestYield')
   * @returns {number} Combined multiplier
   */
  getEffectMultiplier(effectType) {
    let multiplier = 1.0;

    for (const event of this.activeEvents.values()) {
      if (event.effects && event.effects[effectType]) {
        multiplier *= event.effects[effectType];
      }
    }

    return multiplier;
  }

  /**
   * Check if a specific event is active
   * @param {string} eventId - Event identifier
   * @returns {boolean} True if active
   */
  isEventActive(eventId) {
    return this.activeEvents.has(eventId);
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
   * Get statistics
   * @returns {object} Statistics object
   */
  getStats() {
    return {
      ...this.stats,
      activeEventsCount: this.activeEvents.size,
      totalEventsCompleted: this.eventHistory.length,
    };
  }

  /**
   * Serialize state for save/load
   * @returns {object} Serialized state
   */
  serialize() {
    return {
      activeEvents: Array.from(this.activeEvents.entries()),
      eventHistory: this.eventHistory,
      stats: this.stats,
      lastEventCheck: this.lastEventCheck,
    };
  }

  /**
   * Deserialize state from save data
   * @param {object} data - Saved state data
   */
  deserialize(data) {
    if (data.activeEvents) {
      this.activeEvents = new Map(data.activeEvents);
    }
    if (data.eventHistory) {
      this.eventHistory = data.eventHistory;
    }
    if (data.stats) {
      this.stats = { ...this.stats, ...data.stats };
    }
    if (data.lastEventCheck !== undefined) {
      this.lastEventCheck = data.lastEventCheck;
    }
  }
}

export default SeasonalEventSystem;
