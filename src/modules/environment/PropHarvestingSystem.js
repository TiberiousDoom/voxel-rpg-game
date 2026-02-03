/**
 * PropHarvestingSystem.js
 * Handles prop harvesting mechanics, progress tracking, and resource drops
 *
 * Phase 3A: Interactive Props & Harvesting
 */

/**
 * Harvest state for a prop being harvested
 */
class HarvestState {
  constructor(propId, prop, startTime, duration) {
    this.propId = propId;
    this.prop = prop;
    this.startTime = startTime;
    this.duration = duration; // milliseconds
    this.paused = false;
  }

  /**
   * Get harvest progress (0-1)
   */
  getProgress(currentTime) {
    if (this.paused) return this._pausedProgress || 0;

    const elapsed = currentTime - this.startTime;
    return Math.min(elapsed / this.duration, 1);
  }

  /**
   * Check if harvest is complete
   */
  isComplete(currentTime) {
    return this.getProgress(currentTime) >= 1;
  }

  /**
   * Pause harvesting
   */
  pause(currentTime) {
    this._pausedProgress = this.getProgress(currentTime);
    this.paused = true;
  }

  /**
   * Resume harvesting
   */
  resume(currentTime) {
    this.startTime = currentTime - (this._pausedProgress * this.duration);
    this.paused = false;
    this._pausedProgress = null;
  }
}

/**
 * PropHarvestingSystem
 * Manages prop harvesting, progress tracking, and resource generation
 */
export class PropHarvestingSystem {
  constructor(propManager, options = {}) {
    this.propManager = propManager;

    this.config = {
      // Base harvest times (milliseconds) - can be modified by tools
      baseHarvestTime: options.baseHarvestTime || 2000, // 2 seconds default
      harvestRange: options.harvestRange || 2, // tiles
      autoLootResources: options.autoLootResources !== false, // Auto-add to inventory
      showFloatingText: options.showFloatingText !== false,
      ...options
    };

    // Active harvests (propId -> HarvestState)
    this.activeHarvests = new Map();

    // Callbacks
    this.callbacks = {
      onHarvestStart: null,
      onHarvestProgress: null,
      onHarvestComplete: null,
      onHarvestCancel: null,
      onResourceDrop: null,
    };

    // Statistics
    this.stats = {
      propsHarvested: 0,
      resourcesGathered: 0,
      totalHarvestTime: 0,
      harvestsStarted: 0,
      harvestsCancelled: 0,
    };
  }

  /**
   * Set callback functions
   */
  setCallbacks(callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Calculate harvest time for a prop
   * @param {Prop} prop - The prop being harvested
   * @param {object} tool - Optional tool being used (affects speed)
   * @returns {number} Harvest time in milliseconds
   */
  calculateHarvestTime(prop, tool = null) {
    let baseTime = this.config.baseHarvestTime;

    // Adjust based on prop health (more health = longer harvest)
    if (prop.health) {
      baseTime = (prop.health / 100) * this.config.baseHarvestTime;
    }

    // Tool modifier (e.g., axe harvests trees faster)
    if (tool && tool.harvestSpeedModifier) {
      baseTime *= tool.harvestSpeedModifier;
    }

    // Prop-specific harvest time
    if (prop.harvestTime) {
      baseTime = prop.harvestTime;
    }

    return Math.max(100, baseTime); // Minimum 100ms
  }

  /**
   * Start harvesting a prop
   * @param {string} propId - Prop ID
   * @param {Prop} prop - Prop object
   * @param {object} harvester - Entity harvesting (player/NPC)
   * @param {object} tool - Optional tool being used
   * @returns {boolean} True if harvest started successfully
   */
  startHarvest(propId, prop, harvester = null, tool = null) {
    // Check if prop is harvestable
    if (!prop.harvestable) {
      console.warn(`Prop ${propId} is not harvestable`);
      return false;
    }

    // Check if already harvesting this prop
    if (this.activeHarvests.has(propId)) {
      console.warn(`Already harvesting prop ${propId}`);
      return false;
    }

    // Check range if harvester provided
    if (harvester && prop) {
      const distance = Math.sqrt(
        Math.pow(harvester.x - prop.x, 2) +
        Math.pow(harvester.z - prop.z, 2)
      );

      if (distance > this.config.harvestRange) {
        console.warn(`Prop ${propId} is out of range (${distance.toFixed(1)} > ${this.config.harvestRange})`);
        return false;
      }
    }

    // Calculate harvest duration
    const duration = this.calculateHarvestTime(prop, tool);
    const currentTime = performance.now();

    // Create harvest state
    const harvestState = new HarvestState(propId, prop, currentTime, duration);
    this.activeHarvests.set(propId, harvestState);

    // Update stats
    this.stats.harvestsStarted++;

    // Callback
    if (this.callbacks.onHarvestStart) {
      this.callbacks.onHarvestStart(propId, prop, duration);
    }

    return true;
  }

  /**
   * Update all active harvests (call each frame)
   * @returns {Array} Array of completed prop IDs
   */
  update() {
    const currentTime = performance.now();
    const completedProps = [];

    for (const [propId, harvestState] of this.activeHarvests.entries()) {
      // Check if complete
      if (harvestState.isComplete(currentTime)) {
        completedProps.push(propId);
        this.completeHarvest(propId, harvestState);
      } else {
        // Progress callback
        const progress = harvestState.getProgress(currentTime);
        if (this.callbacks.onHarvestProgress) {
          this.callbacks.onHarvestProgress(propId, harvestState.prop, progress);
        }
      }
    }

    return completedProps;
  }

  /**
   * Complete a harvest
   * @private
   */
  completeHarvest(propId, harvestState) {
    const prop = harvestState.prop;
    const currentTime = performance.now();

    // Generate resources
    const resources = this.generateResources(prop);

    // Update stats
    this.stats.propsHarvested++;
    this.stats.resourcesGathered += resources.length;
    this.stats.totalHarvestTime += currentTime - harvestState.startTime;

    // Callback
    if (this.callbacks.onHarvestComplete) {
      this.callbacks.onHarvestComplete(propId, prop, resources);
    }

    // Resource drops callback
    if (resources.length > 0 && this.callbacks.onResourceDrop) {
      this.callbacks.onResourceDrop(prop.x, prop.z, resources);
    }

    // Remove from active harvests
    this.activeHarvests.delete(propId);

    // Remove prop from world
    this.propManager.removeProp(propId);
  }

  /**
   * Cancel a harvest in progress
   * @param {string} propId - Prop ID
   */
  cancelHarvest(propId) {
    const harvestState = this.activeHarvests.get(propId);
    if (!harvestState) return;

    this.stats.harvestsCancelled++;

    if (this.callbacks.onHarvestCancel) {
      this.callbacks.onHarvestCancel(propId, harvestState.prop);
    }

    this.activeHarvests.delete(propId);
  }

  /**
   * Cancel all active harvests
   */
  cancelAllHarvests() {
    const propIds = Array.from(this.activeHarvests.keys());
    propIds.forEach(propId => this.cancelHarvest(propId));
  }

  /**
   * Generate resources from a prop
   * @param {Prop} prop - The harvested prop
   * @returns {Array} Array of resource objects {type, amount}
   */
  generateResources(prop) {
    if (!prop.resources || prop.resources.length === 0) {
      return [];
    }

    const generatedResources = [];

    for (const resourceRule of prop.resources) {
      const { type, min, max, chance = 1.0 } = resourceRule;

      // Check drop chance
      if (Math.random() > chance) continue;

      // Generate random amount between min and max
      const amount = min === max ? min : min + Math.floor(Math.random() * (max - min + 1));

      if (amount > 0) {
        generatedResources.push({
          type,
          amount,
          fromProp: prop.type || prop.variant,
        });
      }
    }

    return generatedResources;
  }

  /**
   * Get harvest progress for a prop
   * @param {string} propId - Prop ID
   * @returns {number|null} Progress (0-1) or null if not being harvested
   */
  getHarvestProgress(propId) {
    const harvestState = this.activeHarvests.get(propId);
    if (!harvestState) return null;

    return harvestState.getProgress(performance.now());
  }

  /**
   * Check if a prop is being harvested
   * @param {string} propId - Prop ID
   * @returns {boolean}
   */
  isHarvesting(propId) {
    return this.activeHarvests.has(propId);
  }

  /**
   * Get all active harvests
   * @returns {Array} Array of {propId, prop, progress}
   */
  getActiveHarvests() {
    const currentTime = performance.now();
    const harvests = [];

    for (const [propId, harvestState] of this.activeHarvests.entries()) {
      harvests.push({
        propId,
        prop: harvestState.prop,
        progress: harvestState.getProgress(currentTime),
        timeRemaining: harvestState.duration * (1 - harvestState.getProgress(currentTime)),
      });
    }

    return harvests;
  }

  /**
   * Pause a harvest (player moved away, etc.)
   * @param {string} propId - Prop ID
   */
  pauseHarvest(propId) {
    const harvestState = this.activeHarvests.get(propId);
    if (harvestState) {
      harvestState.pause(performance.now());
    }
  }

  /**
   * Resume a paused harvest
   * @param {string} propId - Prop ID
   */
  resumeHarvest(propId) {
    const harvestState = this.activeHarvests.get(propId);
    if (harvestState) {
      harvestState.resume(performance.now());
    }
  }

  /**
   * Get statistics
   * @returns {object} Harvesting statistics
   */
  getStats() {
    return {
      ...this.stats,
      activeHarvests: this.activeHarvests.size,
      avgHarvestTime: this.stats.propsHarvested > 0
        ? this.stats.totalHarvestTime / this.stats.propsHarvested
        : 0,
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      propsHarvested: 0,
      resourcesGathered: 0,
      totalHarvestTime: 0,
      harvestsStarted: 0,
      harvestsCancelled: 0,
    };
  }

  /**
   * Clean up
   */
  destroy() {
    this.cancelAllHarvests();
    this.callbacks = {};
  }
}

export default PropHarvestingSystem;
