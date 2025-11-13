/**
 * Event System - Main exports
 *
 * Phase 3B: Dynamic Event System
 * Provides disaster, seasonal, and positive random events
 */

// Core system
export { default as EventSystem } from './EventSystem.js';
export { default as EventScheduler } from './EventScheduler.js';
export { default as Event, EventType, EventState } from './Event.js';

// Disaster events
export { default as WildfireEvent } from './events/WildfireEvent.js';
export { default as FloodEvent } from './events/FloodEvent.js';
export { default as EarthquakeEvent } from './events/EarthquakeEvent.js';

// Seasonal events
export { default as HarvestFestivalEvent } from './events/HarvestFestivalEvent.js';
export { default as WinterFreezeEvent } from './events/WinterFreezeEvent.js';
export { default as SpringBloomEvent } from './events/SpringBloomEvent.js';

// Positive events
export { default as MerchantVisitEvent } from './events/MerchantVisitEvent.js';
export { default as GoodWeatherEvent } from './events/GoodWeatherEvent.js';
export { default as WandererJoinsEvent } from './events/WandererJoinsEvent.js';

// Import for createEventSystem function
import EventSystem from './EventSystem.js';
import WildfireEvent from './events/WildfireEvent.js';
import FloodEvent from './events/FloodEvent.js';
import EarthquakeEvent from './events/EarthquakeEvent.js';
import HarvestFestivalEvent from './events/HarvestFestivalEvent.js';
import WinterFreezeEvent from './events/WinterFreezeEvent.js';
import SpringBloomEvent from './events/SpringBloomEvent.js';
import MerchantVisitEvent from './events/MerchantVisitEvent.js';
import GoodWeatherEvent from './events/GoodWeatherEvent.js';
import WandererJoinsEvent from './events/WandererJoinsEvent.js';

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
