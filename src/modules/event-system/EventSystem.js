/**
 * EventSystem.js - Main event orchestration system
 *
 * Manages:
 * - Event lifecycle (queuing, activation, completion)
 * - Event scheduling and triggering
 * - Event history and notifications
 * - Integration with game systems
 */

import EventScheduler from './EventScheduler.js';

export default class EventSystem {
  constructor(orchestrator = null) {
    this.orchestrator = orchestrator;

    // Event management
    this.eventLibrary = []; // All available events
    this.activeEvents = []; // Currently active events
    this.eventQueue = []; // Events waiting to start
    this.eventHistory = []; // Past events

    // Scheduler
    this.scheduler = new EventScheduler();

    // Notifications (for UI integration)
    this.pendingNotifications = [];

    // Statistics
    this.stats = {
      totalEventsTriggered: 0,
      disastersTriggered: 0,
      positiveEventsTriggered: 0,
      seasonalEventsTriggered: 0
    };

    // Event listeners
    this.listeners = {
      onEventStart: [],
      onEventTick: [],
      onEventEnd: [],
      onEventQueued: []
    };
  }

  /**
   * Register an event in the library
   * @param {Event} event - Event to register
   */
  registerEvent(event) {
    if (!event || !event.id) {
      throw new Error('Invalid event: missing id');
    }

    // Check if event already registered
    const exists = this.eventLibrary.find(e => e.id === event.id);
    if (exists) {
      throw new Error(`Event ${event.id} already registered`);
    }

    this.eventLibrary.push(event);

    // Set up event callbacks to trigger listeners
    event.setOnStartCallback((e, gameState) => this._onEventStart(e, gameState));
    event.setOnTickCallback((e, deltaTime, gameState) => this._onEventTick(e, deltaTime, gameState));
    event.setOnEndCallback((e, gameState) => this._onEventEnd(e, gameState));
  }

  /**
   * Register multiple events
   * @param {Array<Event>} events - Events to register
   */
  registerEvents(events) {
    for (const event of events) {
      this.registerEvent(event);
    }
  }

  /**
   * Check for event triggers (called each game tick)
   * @param {number} tickCount - Current game tick
   * @param {Object} gameState - Current game state
   */
  checkEventTriggers(tickCount, gameState) {
    // Use scheduler to determine which events should trigger
    const eventsToTrigger = this.scheduler.checkEvents(
      tickCount,
      gameState,
      this.eventLibrary,
      this.activeEvents
    );

    // Queue events for triggering
    for (const event of eventsToTrigger) {
      this.queueEvent(event);
    }
  }

  /**
   * Queue an event to start
   * @param {Event} event - Event to queue
   */
  queueEvent(event) {
    // Create a fresh instance of the event to avoid state issues
    const EventClass = event.constructor;
    const newEvent = new EventClass(event);

    this.eventQueue.push(newEvent);

    // Notify listeners
    this._notifyListeners('onEventQueued', newEvent);

    // Add notification
    this.addNotification({
      type: 'event_queued',
      event: newEvent,
      message: `Event incoming: ${newEvent.name}`,
      timestamp: Date.now()
    });
  }

  /**
   * Update all active events (called periodically)
   * @param {number} deltaTime - Time since last update in seconds
   * @param {Object} gameState - Current game state
   */
  updateActiveEvents(deltaTime, gameState) {
    // Start any queued events
    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift();
      this._startEvent(event, gameState);
    }

    // Update all active events
    const stillActive = [];
    for (const event of this.activeEvents) {
      const isActive = event.update(deltaTime, gameState);
      if (isActive) {
        stillActive.push(event);
      }
    }

    this.activeEvents = stillActive;
  }

  /**
   * Start an event
   * @private
   */
  _startEvent(event, gameState) {
    try {
      event.start(gameState);
      this.activeEvents.push(event);

      // Update statistics
      this.stats.totalEventsTriggered++;
      if (event.type === 'DISASTER') {
        this.stats.disastersTriggered++;
      } else if (event.type === 'POSITIVE') {
        this.stats.positiveEventsTriggered++;
      } else if (event.type === 'SEASONAL') {
        this.stats.seasonalEventsTriggered++;
      }

      // Add notification
      this.addNotification({
        type: 'event_started',
        event: event,
        message: `${event.name} has started!`,
        description: event.description,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error(`Failed to start event ${event.id}:`, error);
    }
  }

  /**
   * Get all active events
   * @returns {Array<Event>} Active events
   */
  getActiveEvents() {
    return [...this.activeEvents];
  }

  /**
   * Get event by ID
   * @param {string} eventId - Event ID
   * @returns {Event|null} Event or null if not found
   */
  getEventById(eventId) {
    return this.activeEvents.find(e => e.id === eventId) ||
           this.eventQueue.find(e => e.id === eventId) ||
           this.eventLibrary.find(e => e.id === eventId) ||
           null;
  }

  /**
   * Cancel an event
   * @param {string} eventId - Event ID
   */
  cancelEvent(eventId) {
    const event = this.getEventById(eventId);
    if (event) {
      event.cancel();
      // Remove from active events
      this.activeEvents = this.activeEvents.filter(e => e.id !== eventId);
      this.eventQueue = this.eventQueue.filter(e => e.id !== eventId);
    }
  }

  /**
   * Add a notification
   * @param {Object} notification - Notification data
   */
  addNotification(notification) {
    this.pendingNotifications.push(notification);
  }

  /**
   * Get and clear pending notifications
   * @returns {Array<Object>} Pending notifications
   */
  getPendingNotifications() {
    const notifications = [...this.pendingNotifications];
    this.pendingNotifications = [];
    return notifications;
  }

  /**
   * Add event listener
   * @param {string} eventName - Event name (onEventStart, onEventTick, onEventEnd, onEventQueued)
   * @param {Function} callback - Callback function
   */
  addEventListener(eventName, callback) {
    if (this.listeners[eventName]) {
      this.listeners[eventName].push(callback);
    }
  }

  /**
   * Remove event listener
   * @param {string} eventName - Event name
   * @param {Function} callback - Callback function
   */
  removeEventListener(eventName, callback) {
    if (this.listeners[eventName]) {
      this.listeners[eventName] = this.listeners[eventName].filter(cb => cb !== callback);
    }
  }

  /**
   * Notify all listeners of an event
   * @private
   */
  _notifyListeners(eventName, ...args) {
    if (this.listeners[eventName]) {
      for (const callback of this.listeners[eventName]) {
        try {
          callback(...args);
        } catch (error) {
          console.error(`Error in event listener ${eventName}:`, error);
        }
      }
    }
  }

  /**
   * Event started callback
   * @private
   */
  _onEventStart(event, gameState) {
    this._notifyListeners('onEventStart', event, gameState);
  }

  /**
   * Event tick callback
   * @private
   */
  _onEventTick(event, deltaTime, gameState) {
    this._notifyListeners('onEventTick', event, deltaTime, gameState);
  }

  /**
   * Event ended callback
   * @private
   */
  _onEventEnd(event, gameState) {
    // Add to history
    this.eventHistory.push({
      event: event.serialize(),
      completedAt: Date.now()
    });

    // Keep history manageable (max 100 events)
    if (this.eventHistory.length > 100) {
      this.eventHistory = this.eventHistory.slice(-100);
    }

    // Phase 3C: Record event survived for achievement system
    if (this.orchestrator && this.orchestrator.achievementSystem) {
      this.orchestrator.achievementSystem.recordEventSurvived(event.type);
    }

    // Add notification
    this.addNotification({
      type: 'event_ended',
      event: event,
      message: `${event.name} has ended`,
      timestamp: Date.now()
    });

    this._notifyListeners('onEventEnd', event, gameState);
  }

  /**
   * Get event statistics
   * @returns {Object} Statistics
   */
  getStats() {
    return {
      ...this.stats,
      activeEvents: this.activeEvents.length,
      queuedEvents: this.eventQueue.length,
      historySize: this.eventHistory.length,
      registeredEvents: this.eventLibrary.length
    };
  }

  /**
   * Get event history
   * @param {number} limit - Maximum number of events to return
   * @returns {Array<Object>} Event history
   */
  getHistory(limit = 20) {
    return this.eventHistory.slice(-limit);
  }

  /**
   * Force trigger an event by name (for testing)
   * @param {string} eventName - Name of event to trigger
   */
  forceTrigger(eventName) {
    this.scheduler.forceTrigger(eventName);
  }

  /**
   * Reset event system
   */
  reset() {
    this.activeEvents = [];
    this.eventQueue = [];
    this.eventHistory = [];
    this.pendingNotifications = [];
    this.scheduler.reset();
    this.stats = {
      totalEventsTriggered: 0,
      disastersTriggered: 0,
      positiveEventsTriggered: 0,
      seasonalEventsTriggered: 0
    };
  }

  /**
   * Serialize event system state
   * @returns {Object} Serialized state
   */
  serialize() {
    return {
      activeEvents: this.activeEvents.map(e => e.serialize()),
      eventQueue: this.eventQueue.map(e => e.serialize()),
      eventHistory: this.eventHistory,
      stats: this.stats,
      scheduler: this.scheduler.serialize()
    };
  }

  /**
   * Deserialize event system state
   * @param {Object} data - Serialized state
   */
  deserialize(data) {
    // Note: This is a simplified deserialization
    // In production, you'd need to reconstruct event instances properly
    this.activeEvents = [];
    this.eventQueue = [];
    this.eventHistory = data.eventHistory || [];
    this.stats = data.stats || this.stats;
    if (data.scheduler) {
      this.scheduler.deserialize(data.scheduler);
    }
  }
}
