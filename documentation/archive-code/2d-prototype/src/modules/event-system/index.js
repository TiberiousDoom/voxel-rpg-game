/**
 * Event System - Main exports
 *
 * Phase 3B: Dynamic Event System
 * Provides disaster, seasonal, and positive random events
 */

// Import all modules first (ESLint import/first rule)
import EventSystem from './EventSystem.js';
import EventScheduler from './EventScheduler.js';
import Event, { EventType, EventState } from './Event.js';
import WildfireEvent from './events/WildfireEvent.js';
import FloodEvent from './events/FloodEvent.js';
import EarthquakeEvent from './events/EarthquakeEvent.js';
import HarvestFestivalEvent from './events/HarvestFestivalEvent.js';
import WinterFreezeEvent from './events/WinterFreezeEvent.js';
import SpringBloomEvent from './events/SpringBloomEvent.js';
import MerchantVisitEvent from './events/MerchantVisitEvent.js';
import GoodWeatherEvent from './events/GoodWeatherEvent.js';
import WandererJoinsEvent from './events/WandererJoinsEvent.js';

// Core system exports
export { EventSystem, EventScheduler, Event, EventType, EventState };

// Disaster events exports
export { WildfireEvent, FloodEvent, EarthquakeEvent };

// Seasonal events exports
export { HarvestFestivalEvent, WinterFreezeEvent, SpringBloomEvent };

// Positive events exports
export { MerchantVisitEvent, GoodWeatherEvent, WandererJoinsEvent };

/**
 * Create and initialize a complete event system with all event types
 * @param {Object} orchestrator - Game orchestrator instance
 * @returns {EventSystem} Initialized event system
 */
export function createEventSystem(orchestrator = null) {
  const eventSystem = new EventSystem(orchestrator);

  // Register all disaster events
  eventSystem.registerEvent(new WildfireEvent());
  eventSystem.registerEvent(new FloodEvent());
  eventSystem.registerEvent(new EarthquakeEvent());

  // Register all seasonal events
  const harvestFestival = new HarvestFestivalEvent();
  const winterFreeze = new WinterFreezeEvent();
  const springBloom = new SpringBloomEvent();

  // Set seasonal intervals
  eventSystem.scheduler.setSeasonalInterval(harvestFestival.id, harvestFestival.seasonalInterval);
  eventSystem.scheduler.setSeasonalInterval(winterFreeze.id, winterFreeze.seasonalInterval);
  eventSystem.scheduler.setSeasonalInterval(springBloom.id, springBloom.seasonalInterval);

  eventSystem.registerEvent(harvestFestival);
  eventSystem.registerEvent(winterFreeze);
  eventSystem.registerEvent(springBloom);

  // Register all positive events
  eventSystem.registerEvent(new MerchantVisitEvent());
  eventSystem.registerEvent(new GoodWeatherEvent());
  eventSystem.registerEvent(new WandererJoinsEvent());

  return eventSystem;
}

export default EventSystem;
