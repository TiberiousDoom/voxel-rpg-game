/**
 * EventScheduler.js - Manages event timing and triggering
 *
 * Determines when events should trigger based on:
 * - Probability rolls
 * - Time intervals (for seasonal events)
 * - Game state conditions
 * - Event conflicts/compatibility
 */

import { EventType } from './Event.js';

export default class EventScheduler {
  constructor() {
    // Track when last event check occurred
    this.lastCheckTime = 0;
    this.lastSeasonalCheckTime = 0;

    // Check intervals
    this.RANDOM_CHECK_INTERVAL = 3600; // Check random events every hour (3600 ticks)
    this.SEASONAL_CHECK_INTERVAL = 3600; // Check seasonal events every hour

    // Seasonal event tracking
    this.seasonalEventTimers = new Map();

    // Event conflicts - events that can't run simultaneously
    this.conflictGroups = [
      ['WILDFIRE', 'FLOOD'], // Can't have fire and flood at same time
      ['EARTHQUAKE', 'WILDFIRE'] // Earthquake and fire don't mix
    ];

    // Force trigger mode (for testing)
    this.forceTriggerMode = false;
    this.forceTriggerEventName = null;
  }

  /**
   * Check if any events should trigger
   * @param {number} tickCount - Current game tick
   * @param {Object} gameState - Current game state
   * @param {Array<Event>} eventLibrary - Available events
   * @param {Array<Event>} activeEvents - Currently active events
   * @returns {Array<Event>} Events to trigger
   */
  checkEvents(tickCount, gameState, eventLibrary, activeEvents) {
    const eventsToTrigger = [];

    // Check if we're in force trigger mode
    if (this.forceTriggerMode && this.forceTriggerEventName) {
      const eventToForce = eventLibrary.find(e => e.name === this.forceTriggerEventName);
      if (eventToForce) {
        eventsToTrigger.push(eventToForce);
        this.forceTriggerMode = false;
        this.forceTriggerEventName = null;
        return eventsToTrigger;
      }
    }

    // Check random events periodically
    if (tickCount - this.lastCheckTime >= this.RANDOM_CHECK_INTERVAL) {
      this.lastCheckTime = tickCount;
      const randomEvents = this._checkRandomEvents(gameState, eventLibrary, activeEvents);
      eventsToTrigger.push(...randomEvents);
    }

    // Check seasonal events
    if (tickCount - this.lastSeasonalCheckTime >= this.SEASONAL_CHECK_INTERVAL) {
      this.lastSeasonalCheckTime = tickCount;
      const seasonalEvents = this._checkSeasonalEvents(tickCount, gameState, eventLibrary, activeEvents);
      eventsToTrigger.push(...seasonalEvents);
    }

    return eventsToTrigger;
  }

  /**
   * Check random events for triggering
   * @private
   */
  _checkRandomEvents(gameState, eventLibrary, activeEvents) {
    const eventsToTrigger = [];

    // Get all random/disaster events
    const randomEvents = eventLibrary.filter(e =>
      e.type === EventType.RANDOM || e.type === EventType.DISASTER || e.type === EventType.POSITIVE
    );

    for (const event of randomEvents) {
      // Check if event can trigger based on conditions
      if (!event.canTrigger(gameState)) continue;

      // Check if conflicting event is active
      if (this._hasConflictingEvent(event, activeEvents)) continue;

      // Roll for probability
      const roll = Math.random();
      if (roll < event.probability) {
        eventsToTrigger.push(event);
        // Only trigger one random event per check to avoid overwhelming player
        break;
      }
    }

    return eventsToTrigger;
  }

  /**
   * Check seasonal events for triggering
   * @private
   */
  _checkSeasonalEvents(tickCount, gameState, eventLibrary, activeEvents) {
    const eventsToTrigger = [];

    // Get all seasonal events
    const seasonalEvents = eventLibrary.filter(e => e.type === EventType.SEASONAL);

    for (const event of seasonalEvents) {
      // Check if event can trigger based on conditions
      if (!event.canTrigger(gameState)) continue;

      // Initialize timer if not exists
      if (!this.seasonalEventTimers.has(event.id)) {
        this.seasonalEventTimers.set(event.id, {
          lastTriggered: 0,
          interval: event.seasonalInterval || 7200 // Default 2 hours
        });
      }

      const timer = this.seasonalEventTimers.get(event.id);

      // Check if enough time has passed since last trigger
      if (tickCount - timer.lastTriggered >= timer.interval) {
        // Check if conflicting event is active
        if (this._hasConflictingEvent(event, activeEvents)) continue;

        eventsToTrigger.push(event);
        timer.lastTriggered = tickCount;
      }
    }

    return eventsToTrigger;
  }

  /**
   * Check if event conflicts with any active events
   * @private
   */
  _hasConflictingEvent(event, activeEvents) {
    for (const conflictGroup of this.conflictGroups) {
      if (conflictGroup.includes(event.name)) {
        // Check if any other event in this conflict group is active
        const hasConflict = activeEvents.some(activeEvent =>
          conflictGroup.includes(activeEvent.name) && activeEvent.name !== event.name
        );
        if (hasConflict) return true;
      }
    }
    return false;
  }

  /**
   * Force trigger an event (for testing/debugging)
   * @param {string} eventName - Name of event to trigger
   */
  forceTrigger(eventName) {
    this.forceTriggerMode = true;
    this.forceTriggerEventName = eventName;
  }

  /**
   * Add a conflict group
   * @param {Array<string>} eventNames - Event names that conflict
   */
  addConflictGroup(eventNames) {
    this.conflictGroups.push(eventNames);
  }

  /**
   * Set seasonal event interval
   * @param {string} eventId - Event ID
   * @param {number} interval - Interval in ticks
   */
  setSeasonalInterval(eventId, interval) {
    if (this.seasonalEventTimers.has(eventId)) {
      this.seasonalEventTimers.get(eventId).interval = interval;
    } else {
      this.seasonalEventTimers.set(eventId, {
        lastTriggered: 0,
        interval
      });
    }
  }

  /**
   * Reset scheduler state
   */
  reset() {
    this.lastCheckTime = 0;
    this.lastSeasonalCheckTime = 0;
    this.seasonalEventTimers.clear();
    this.forceTriggerMode = false;
    this.forceTriggerEventName = null;
  }

  /**
   * Serialize scheduler state
   * @returns {Object} Serialized state
   */
  serialize() {
    return {
      lastCheckTime: this.lastCheckTime,
      lastSeasonalCheckTime: this.lastSeasonalCheckTime,
      seasonalEventTimers: Array.from(this.seasonalEventTimers.entries())
    };
  }

  /**
   * Deserialize scheduler state
   * @param {Object} data - Serialized state
   */
  deserialize(data) {
    this.lastCheckTime = data.lastCheckTime || 0;
    this.lastSeasonalCheckTime = data.lastSeasonalCheckTime || 0;
    this.seasonalEventTimers = new Map(data.seasonalEventTimers || []);
  }
}
