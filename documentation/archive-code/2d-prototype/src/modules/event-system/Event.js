/**
 * Event.js - Base event class for all game events
 *
 * Provides structure and interface for all events in the game.
 * Events can be disasters, seasonal events, or positive random occurrences.
 */

export const EventType = {
  RANDOM: 'RANDOM',
  SEASONAL: 'SEASONAL',
  DISASTER: 'DISASTER',
  POSITIVE: 'POSITIVE'
};

export const EventState = {
  QUEUED: 'QUEUED',
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED'
};

/**
 * Base Event class
 * All specific events should extend this class
 */
export default class Event {
  /**
   * Create an event
   * @param {Object} config - Event configuration
   */
  constructor(config = {}) {
    this.id = config.id || `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.name = config.name || 'Unknown Event';
    this.description = config.description || 'An event occurred';
    this.type = config.type || EventType.RANDOM;
    this.duration = config.duration || 60; // Duration in seconds
    this.probability = config.probability || 0.01; // Chance to trigger per check

    // Effects
    this.effects = {
      resources: config.effects?.resources || {}, // Resource changes
      buildings: config.effects?.buildings || {}, // Building effects
      npcs: config.effects?.npcs || {}, // NPC effects
      morale: config.effects?.morale || 0, // Morale change
      production: config.effects?.production || {} // Production multipliers
    };

    // State tracking
    this.state = EventState.QUEUED;
    this.startTime = null;
    this.endTime = null;
    this.elapsedTime = 0;
    this.ticksSinceStart = 0;

    // Conditions for triggering
    this.conditions = config.conditions || null;

    // Callbacks
    this._onStartCallback = null;
    this._onTickCallback = null;
    this._onEndCallback = null;
  }

  /**
   * Check if event can trigger based on conditions
   * @param {Object} gameState - Current game state
   * @returns {boolean} True if event can trigger
   */
  canTrigger(gameState) {
    if (!this.conditions) return true;

    // Check tier requirement
    if (this.conditions.minTier && gameState.currentTier) {
      const tiers = ['SURVIVAL', 'PERMANENT', 'TOWN', 'CASTLE'];
      const currentTierIndex = tiers.indexOf(gameState.currentTier);
      const requiredTierIndex = tiers.indexOf(this.conditions.minTier);
      if (currentTierIndex < requiredTierIndex) return false;
    }

    // Check population requirement
    if (this.conditions.minPopulation && gameState.population < this.conditions.minPopulation) {
      return false;
    }

    // Check building requirement
    if (this.conditions.requiredBuilding && gameState.buildings) {
      const hasBuilding = gameState.buildings.some(b => b.type === this.conditions.requiredBuilding);
      if (!hasBuilding) return false;
    }

    return true;
  }

  /**
   * Start the event
   * @param {Object} gameState - Current game state
   */
  start(gameState) {
    if (this.state !== EventState.QUEUED) {
      throw new Error(`Cannot start event ${this.id} - current state: ${this.state}`);
    }

    this.state = EventState.ACTIVE;
    this.startTime = Date.now();
    this.elapsedTime = 0;
    this.ticksSinceStart = 0;

    // Call onStart hook
    this.onStart(gameState);

    if (this._onStartCallback) {
      this._onStartCallback(this, gameState);
    }
  }

  /**
   * Update event state (called periodically)
   * @param {number} deltaTime - Time since last update in seconds
   * @param {Object} gameState - Current game state
   * @returns {boolean} True if event is still active
   */
  update(deltaTime, gameState) {
    if (this.state !== EventState.ACTIVE) return false;

    this.elapsedTime += deltaTime;
    this.ticksSinceStart++;

    // Check if event should end
    if (this.elapsedTime >= this.duration) {
      this.end(gameState);
      return false;
    }

    // Call onTick hook
    this.onTick(deltaTime, gameState);

    if (this._onTickCallback) {
      this._onTickCallback(this, deltaTime, gameState);
    }

    return true;
  }

  /**
   * End the event
   * @param {Object} gameState - Current game state
   */
  end(gameState) {
    if (this.state !== EventState.ACTIVE) {
      throw new Error(`Cannot end event ${this.id} - current state: ${this.state}`);
    }

    this.state = EventState.COMPLETED;
    this.endTime = Date.now();

    // Call onEnd hook
    this.onEnd(gameState);

    if (this._onEndCallback) {
      this._onEndCallback(this, gameState);
    }
  }

  /**
   * Cancel the event
   */
  cancel() {
    this.state = EventState.CANCELLED;
  }

  /**
   * Hook called when event starts
   * Override in subclasses
   * @param {Object} gameState - Current game state
   */
  onStart(gameState) {
    // Override in subclasses
  }

  /**
   * Hook called periodically while event is active
   * Override in subclasses
   * @param {number} deltaTime - Time since last tick in seconds
   * @param {Object} gameState - Current game state
   */
  onTick(deltaTime, gameState) {
    // Override in subclasses
  }

  /**
   * Hook called when event ends
   * Override in subclasses
   * @param {Object} gameState - Current game state
   */
  onEnd(gameState) {
    // Override in subclasses
  }

  /**
   * Set callback for event start
   * @param {Function} callback - Callback function
   */
  setOnStartCallback(callback) {
    this._onStartCallback = callback;
  }

  /**
   * Set callback for event tick
   * @param {Function} callback - Callback function
   */
  setOnTickCallback(callback) {
    this._onTickCallback = callback;
  }

  /**
   * Set callback for event end
   * @param {Function} callback - Callback function
   */
  setOnEndCallback(callback) {
    this._onEndCallback = callback;
  }

  /**
   * Get event progress (0-1)
   * @returns {number} Progress as decimal
   */
  getProgress() {
    if (this.state !== EventState.ACTIVE || this.duration === 0) return 0;
    return Math.min(this.elapsedTime / this.duration, 1);
  }

  /**
   * Get time remaining in seconds
   * @returns {number} Seconds remaining
   */
  getTimeRemaining() {
    if (this.state !== EventState.ACTIVE) return 0;
    return Math.max(this.duration - this.elapsedTime, 0);
  }

  /**
   * Serialize event to plain object
   * @returns {Object} Serialized event
   */
  serialize() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      type: this.type,
      duration: this.duration,
      probability: this.probability,
      effects: this.effects,
      state: this.state,
      startTime: this.startTime,
      endTime: this.endTime,
      elapsedTime: this.elapsedTime,
      ticksSinceStart: this.ticksSinceStart,
      conditions: this.conditions
    };
  }

  /**
   * Deserialize event from plain object
   * @param {Object} data - Serialized event data
   * @returns {Event} Event instance
   */
  static deserialize(data) {
    const event = new Event(data);
    event.state = data.state;
    event.startTime = data.startTime;
    event.endTime = data.endTime;
    event.elapsedTime = data.elapsedTime;
    event.ticksSinceStart = data.ticksSinceStart;
    return event;
  }
}
