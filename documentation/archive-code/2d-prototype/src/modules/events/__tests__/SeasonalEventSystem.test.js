/**
 * SeasonalEventSystem.test.js - Tests for seasonal event system
 */

import { SeasonalEventSystem } from '../SeasonalEventSystem.js';
import { SeasonType } from '../../environment/SeasonalSystem.js';

// Mock SeasonalSystem
class MockSeasonalSystem {
  constructor(currentSeason = SeasonType.SPRING) {
    this.currentSeason = currentSeason;
    this.config = {
      dayLength: 86400000, // 24 hours
    };
  }

  getCurrentSeason() {
    return this.currentSeason;
  }

  setCurrentSeason(season) {
    this.currentSeason = season;
  }
}

describe('SeasonalEventSystem', () => {
  let seasonalSystem;
  let eventSystem;

  beforeEach(() => {
    seasonalSystem = new MockSeasonalSystem();
    eventSystem = new SeasonalEventSystem(seasonalSystem);
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with default configuration', () => {
      expect(eventSystem.seasonalSystem).toBe(seasonalSystem);
      expect(eventSystem.config.enableEvents).toBe(true);
      expect(eventSystem.config.eventCheckInterval).toBe(86400000);
      expect(eventSystem.config.maxActiveEvents).toBe(2);
    });

    it('should accept custom configuration', () => {
      const customSystem = new SeasonalEventSystem(seasonalSystem, {
        enableEvents: false,
        eventCheckInterval: 60000,
        maxActiveEvents: 3,
      });

      expect(customSystem.config.enableEvents).toBe(false);
      expect(customSystem.config.eventCheckInterval).toBe(60000);
      expect(customSystem.config.maxActiveEvents).toBe(3);
    });

    it('should initialize empty state', () => {
      expect(eventSystem.activeEvents.size).toBe(0);
      expect(eventSystem.eventHistory).toEqual([]);
      expect(eventSystem.lastEventCheck).toBe(0);
    });

    it('should initialize statistics', () => {
      expect(eventSystem.stats.totalEventsTriggered).toBe(0);
      expect(eventSystem.stats.eventsByType).toEqual({});
      expect(eventSystem.stats.rewardsEarned).toEqual({});
    });
  });

  describe('Event Starting', () => {
    it('should start a spring event', () => {
      const result = eventSystem.startEvent('spring_growth_festival');

      expect(result).toBe(true);
      expect(eventSystem.activeEvents.has('spring_growth_festival')).toBe(true);
      expect(eventSystem.stats.totalEventsTriggered).toBe(1);
    });

    it('should start a summer event', () => {
      const result = eventSystem.startEvent('summer_heat_wave');

      expect(result).toBe(true);
      expect(eventSystem.activeEvents.has('summer_heat_wave')).toBe(true);
    });

    it('should start an autumn event', () => {
      const result = eventSystem.startEvent('autumn_harvest_festival');

      expect(result).toBe(true);
      expect(eventSystem.activeEvents.has('autumn_harvest_festival')).toBe(true);
    });

    it('should start a winter event', () => {
      const result = eventSystem.startEvent('winter_frost');

      expect(result).toBe(true);
      expect(eventSystem.activeEvents.has('winter_frost')).toBe(true);
    });

    it('should fail to start invalid event', () => {
      const result = eventSystem.startEvent('invalid_event');

      expect(result).toBe(false);
      expect(eventSystem.activeEvents.size).toBe(0);
    });

    it('should set correct event duration', () => {
      eventSystem.startEvent('spring_growth_festival');
      const event = eventSystem.activeEvents.get('spring_growth_festival');

      const expectedDuration = 3 * seasonalSystem.config.dayLength;
      const actualDuration = event.endTime - event.startTime;

      expect(actualDuration).toBe(expectedDuration);
    });

    it('should mark event as active', () => {
      eventSystem.startEvent('spring_growth_festival');
      const event = eventSystem.activeEvents.get('spring_growth_festival');

      expect(event.active).toBe(true);
      expect(event.startTime).toBeDefined();
      expect(event.endTime).toBeDefined();
    });

    it('should increment statistics on start', () => {
      eventSystem.startEvent('spring_growth_festival');
      eventSystem.startEvent('summer_heat_wave');

      expect(eventSystem.stats.totalEventsTriggered).toBe(2);
      expect(eventSystem.stats.eventsByType['spring_growth_festival']).toBe(1);
      expect(eventSystem.stats.eventsByType['summer_heat_wave']).toBe(1);
    });

    it('should track multiple starts of same event type', () => {
      eventSystem.startEvent('spring_growth_festival');
      eventSystem._endEvent('spring_growth_festival');
      eventSystem.startEvent('spring_growth_festival');

      expect(eventSystem.stats.eventsByType['spring_growth_festival']).toBe(2);
    });
  });

  describe('Event Callbacks', () => {
    it('should call onEventStart callback', () => {
      const callback = jest.fn();
      eventSystem.on('onEventStart', callback);

      eventSystem.startEvent('spring_growth_festival');

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback.mock.calls[0][0].event).toBeDefined();
      expect(callback.mock.calls[0][0].event.id).toBe('spring_growth_festival');
    });

    it('should call onEventEnd callback', () => {
      const callback = jest.fn();
      eventSystem.on('onEventEnd', callback);

      eventSystem.startEvent('spring_growth_festival');
      eventSystem._endEvent('spring_growth_festival');

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback.mock.calls[0][0].event).toBeDefined();
    });

    it('should call onEventReward callback', () => {
      const callback = jest.fn();
      eventSystem.on('onEventReward', callback);

      eventSystem.startEvent('spring_growth_festival');
      eventSystem._endEvent('spring_growth_festival');

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback.mock.calls[0][0].rewards).toBeDefined();
    });

    it('should not call callback if not registered', () => {
      // Should not throw error
      expect(() => {
        eventSystem.startEvent('spring_growth_festival');
        eventSystem._endEvent('spring_growth_festival');
      }).not.toThrow();
    });
  });

  describe('Active Events Management', () => {
    it('should get active events', () => {
      eventSystem.startEvent('spring_growth_festival');
      eventSystem.startEvent('summer_heat_wave');

      const active = eventSystem.getActiveEvents();

      expect(active.length).toBe(2);
      expect(active.some(e => e.id === 'spring_growth_festival')).toBe(true);
      expect(active.some(e => e.id === 'summer_heat_wave')).toBe(true);
    });

    it('should check if event is active', () => {
      eventSystem.startEvent('spring_growth_festival');

      expect(eventSystem.isEventActive('spring_growth_festival')).toBe(true);
      expect(eventSystem.isEventActive('summer_heat_wave')).toBe(false);
    });

    it('should return empty array when no active events', () => {
      const active = eventSystem.getActiveEvents();
      expect(active).toEqual([]);
    });

    it('should remove event from active when ended', () => {
      eventSystem.startEvent('spring_growth_festival');
      expect(eventSystem.isEventActive('spring_growth_festival')).toBe(true);

      eventSystem._endEvent('spring_growth_festival');
      expect(eventSystem.isEventActive('spring_growth_festival')).toBe(false);
    });
  });

  describe('Effect Multipliers', () => {
    it('should return 1.0 when no events active', () => {
      const multiplier = eventSystem.getEffectMultiplier('plantGrowth');
      expect(multiplier).toBe(1.0);
    });

    it('should return effect multiplier for active event', () => {
      eventSystem.startEvent('spring_growth_festival');

      const multiplier = eventSystem.getEffectMultiplier('plantGrowth');
      expect(multiplier).toBe(2.0); // Growth Festival gives 2x plant growth
    });

    it('should combine multipliers from multiple events', () => {
      eventSystem.startEvent('spring_growth_festival'); // 2.0x plantGrowth
      eventSystem.startEvent('spring_rain_blessing'); // 1.3x plantGrowth

      const multiplier = eventSystem.getEffectMultiplier('plantGrowth');
      expect(multiplier).toBe(2.6); // 2.0 * 1.3 = 2.6
    });

    it('should return 1.0 for non-existent effect', () => {
      eventSystem.startEvent('spring_growth_festival');

      const multiplier = eventSystem.getEffectMultiplier('nonExistentEffect');
      expect(multiplier).toBe(1.0);
    });

    it('should handle events without effects property', () => {
      const event = {
        id: 'test_event',
        season: SeasonType.SPRING,
        duration: 1,
        probability: 1.0,
      };

      eventSystem.activeEvents.set('test_event', event);
      const multiplier = eventSystem.getEffectMultiplier('plantGrowth');

      expect(multiplier).toBe(1.0);
    });

    it('should calculate different effect types independently', () => {
      eventSystem.startEvent('spring_growth_festival');

      expect(eventSystem.getEffectMultiplier('plantGrowth')).toBe(2.0);
      expect(eventSystem.getEffectMultiplier('harvestYield')).toBe(1.5);
      expect(eventSystem.getEffectMultiplier('animalSpawn')).toBe(1.3);
    });
  });

  describe('Event Rewards', () => {
    it('should grant experience rewards', () => {
      eventSystem.startEvent('spring_growth_festival');
      eventSystem._endEvent('spring_growth_festival');

      expect(eventSystem.stats.rewardsEarned.experience).toBe(100);
    });

    it('should grant material rewards', () => {
      eventSystem.startEvent('spring_growth_festival');
      eventSystem._endEvent('spring_growth_festival');

      expect(eventSystem.stats.rewardsEarned.seed).toBe(10);
      expect(eventSystem.stats.rewardsEarned.herb).toBe(5);
    });

    it('should accumulate rewards from multiple events', () => {
      eventSystem.startEvent('spring_growth_festival'); // +100 xp, +10 seed, +5 herb
      eventSystem._endEvent('spring_growth_festival');

      eventSystem.startEvent('spring_flower_bloom'); // +20 flower, +10 herb
      eventSystem._endEvent('spring_flower_bloom');

      expect(eventSystem.stats.rewardsEarned.experience).toBe(100);
      expect(eventSystem.stats.rewardsEarned.seed).toBe(10);
      expect(eventSystem.stats.rewardsEarned.herb).toBe(15); // 5 + 10
      expect(eventSystem.stats.rewardsEarned.flower).toBe(20);
    });

    it('should handle events without rewards', () => {
      const event = {
        id: 'test_event',
        season: SeasonType.SPRING,
        duration: 1,
        probability: 1.0,
      };

      eventSystem.activeEvents.set('test_event', event);

      // Should not throw
      expect(() => {
        eventSystem._endEvent('test_event');
      }).not.toThrow();
    });
  });

  describe('Event History', () => {
    it('should add completed events to history', () => {
      eventSystem.startEvent('spring_growth_festival');
      const startTime = eventSystem.activeEvents.get('spring_growth_festival').startTime;

      eventSystem._endEvent('spring_growth_festival');

      expect(eventSystem.eventHistory.length).toBe(1);
      expect(eventSystem.eventHistory[0].eventId).toBe('spring_growth_festival');
      expect(eventSystem.eventHistory[0].startTime).toBe(startTime);
    });

    it('should track multiple completed events', () => {
      eventSystem.startEvent('spring_growth_festival');
      eventSystem._endEvent('spring_growth_festival');

      eventSystem.startEvent('summer_heat_wave');
      eventSystem._endEvent('summer_heat_wave');

      expect(eventSystem.eventHistory.length).toBe(2);
    });

    it('should record completion time', () => {
      eventSystem.startEvent('spring_growth_festival');
      eventSystem._endEvent('spring_growth_festival');

      expect(eventSystem.eventHistory[0].completedAt).toBeDefined();
      expect(eventSystem.eventHistory[0].completedAt).toBeGreaterThan(0);
    });
  });

  describe('Eligible Events', () => {
    it('should get spring events in spring season', () => {
      seasonalSystem.setCurrentSeason(SeasonType.SPRING);
      const eligible = eventSystem._getEligibleEvents(SeasonType.SPRING);

      expect(eligible.length).toBeGreaterThan(0);
      expect(eligible.every(e => e.season === SeasonType.SPRING)).toBe(true);
    });

    it('should get summer events in summer season', () => {
      seasonalSystem.setCurrentSeason(SeasonType.SUMMER);
      const eligible = eventSystem._getEligibleEvents(SeasonType.SUMMER);

      expect(eligible.length).toBeGreaterThan(0);
      expect(eligible.every(e => e.season === SeasonType.SUMMER)).toBe(true);
    });

    it('should get autumn events in autumn season', () => {
      seasonalSystem.setCurrentSeason(SeasonType.AUTUMN);
      const eligible = eventSystem._getEligibleEvents(SeasonType.AUTUMN);

      expect(eligible.length).toBeGreaterThan(0);
      expect(eligible.every(e => e.season === SeasonType.AUTUMN)).toBe(true);
    });

    it('should get winter events in winter season', () => {
      seasonalSystem.setCurrentSeason(SeasonType.WINTER);
      const eligible = eventSystem._getEligibleEvents(SeasonType.WINTER);

      expect(eligible.length).toBeGreaterThan(0);
      expect(eligible.every(e => e.season === SeasonType.WINTER)).toBe(true);
    });

    it('should exclude already active events', () => {
      seasonalSystem.setCurrentSeason(SeasonType.SPRING);
      eventSystem.startEvent('spring_growth_festival');

      const eligible = eventSystem._getEligibleEvents(SeasonType.SPRING);

      expect(eligible.every(e => e.id !== 'spring_growth_festival')).toBe(true);
    });

    it('should return winter events when requesting winter season', () => {
      seasonalSystem.setCurrentSeason(SeasonType.SPRING);
      const eligible = eventSystem._getEligibleEvents(SeasonType.WINTER);

      // _getEligibleEvents filters by the season parameter, not current season
      expect(eligible.length).toBeGreaterThan(0);
      expect(eligible.every(e => e.season === SeasonType.WINTER)).toBe(true);
    });
  });

  describe('Update and Event Checking', () => {
    it('should not check for new events if disabled', () => {
      const disabledSystem = new SeasonalEventSystem(seasonalSystem, {
        enableEvents: false,
      });

      disabledSystem.update(100000000);
      expect(disabledSystem.activeEvents.size).toBe(0);
    });

    it('should check for new events after interval', () => {
      const mathRandomSpy = jest.spyOn(Math, 'random').mockReturnValue(0); // Always succeed probability

      seasonalSystem.setCurrentSeason(SeasonType.SPRING);
      eventSystem.update(86400001); // Just past check interval

      expect(eventSystem.activeEvents.size).toBeGreaterThan(0);

      mathRandomSpy.mockRestore();
    });

    it('should not check for new events before interval', () => {
      eventSystem.update(86400000 - 1); // Just before check interval
      expect(eventSystem.activeEvents.size).toBe(0);
    });

    it('should not exceed max active events', () => {
      const mathRandomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);

      eventSystem.startEvent('spring_growth_festival');
      eventSystem.startEvent('spring_flower_bloom');

      expect(eventSystem.activeEvents.size).toBe(2);

      // Try to check for new events (should be blocked by max)
      eventSystem._checkForNewEvents();

      expect(eventSystem.activeEvents.size).toBe(2); // Still 2, not more

      mathRandomSpy.mockRestore();
    });

    it('should end events when time expires', () => {
      const now = Date.now();
      eventSystem.startEvent('spring_growth_festival');

      const event = eventSystem.activeEvents.get('spring_growth_festival');
      event.endTime = now - 1; // Set to past

      eventSystem._updateActiveEvents(0);

      expect(eventSystem.isEventActive('spring_growth_festival')).toBe(false);
      expect(eventSystem.eventHistory.length).toBe(1);
    });

    it('should not end events before time expires', () => {
      const now = Date.now();
      eventSystem.startEvent('spring_growth_festival');

      const event = eventSystem.activeEvents.get('spring_growth_festival');
      event.endTime = now + 1000000; // Set to future

      eventSystem._updateActiveEvents(0);

      expect(eventSystem.isEventActive('spring_growth_festival')).toBe(true);
    });
  });

  describe('Specific Seasonal Events', () => {
    describe('Spring Events', () => {
      it('should have correct Growth Festival effects', () => {
        eventSystem.startEvent('spring_growth_festival');

        expect(eventSystem.getEffectMultiplier('plantGrowth')).toBe(2.0);
        expect(eventSystem.getEffectMultiplier('harvestYield')).toBe(1.5);
        expect(eventSystem.getEffectMultiplier('animalSpawn')).toBe(1.3);
      });

      it('should have correct Flower Bloom effects', () => {
        eventSystem.startEvent('spring_flower_bloom');

        expect(eventSystem.getEffectMultiplier('flowerDensity')).toBe(3.0);
        expect(eventSystem.getEffectMultiplier('herbYield')).toBe(1.5);
        expect(eventSystem.getEffectMultiplier('honeyProduction')).toBe(2.0);
      });

      it('should have correct Rain Blessing effects', () => {
        eventSystem.startEvent('spring_rain_blessing');

        expect(eventSystem.getEffectMultiplier('waterRegen')).toBe(1.5);
        expect(eventSystem.getEffectMultiplier('fishSpawn')).toBe(1.8);
        expect(eventSystem.getEffectMultiplier('plantGrowth')).toBe(1.3);
      });
    });

    describe('Summer Events', () => {
      it('should have correct Heat Wave effects', () => {
        eventSystem.startEvent('summer_heat_wave');

        expect(eventSystem.getEffectMultiplier('waterConsumption')).toBe(2.0);
        expect(eventSystem.getEffectMultiplier('plantGrowth')).toBe(0.5);
        expect(eventSystem.getEffectMultiplier('staminaDrain')).toBe(1.5);
      });

      it('should have correct Abundant Harvest effects', () => {
        eventSystem.startEvent('summer_abundant_harvest');

        expect(eventSystem.getEffectMultiplier('harvestYield')).toBe(2.0);
        expect(eventSystem.getEffectMultiplier('cropQuality')).toBe(1.5);
        expect(eventSystem.getEffectMultiplier('foodValue')).toBe(1.3);
      });

      it('should have correct Thunderstorm effects', () => {
        eventSystem.startEvent('summer_thunderstorm');

        expect(eventSystem.getEffectMultiplier('stormFrequency')).toBe(3.0);
        expect(eventSystem.getEffectMultiplier('lightningDamage')).toBe(1.5);
        expect(eventSystem.getEffectMultiplier('crystalGrowth')).toBe(1.8);
      });
    });

    describe('Autumn Events', () => {
      it('should have correct Harvest Festival effects', () => {
        eventSystem.startEvent('autumn_harvest_festival');

        expect(eventSystem.getEffectMultiplier('harvestYield')).toBe(1.8);
        expect(eventSystem.getEffectMultiplier('foodPreservation')).toBe(2.0);
        expect(eventSystem.getEffectMultiplier('tradingBonus')).toBe(1.5);
      });

      it('should have correct Falling Leaves effects', () => {
        eventSystem.startEvent('autumn_falling_leaves');

        expect(eventSystem.getEffectMultiplier('foragingBonus')).toBe(1.8);
        expect(eventSystem.getEffectMultiplier('hiddenItemChance')).toBe(2.0);
        expect(eventSystem.getEffectMultiplier('woodYield')).toBe(1.3);
      });

      it('should have correct Winter Preparation effects', () => {
        eventSystem.startEvent('autumn_preparation');

        expect(eventSystem.getEffectMultiplier('storageCost')).toBe(0.5);
        expect(eventSystem.getEffectMultiplier('craftingSpeed')).toBe(1.5);
        expect(eventSystem.getEffectMultiplier('resourceGathering')).toBe(1.4);
      });
    });

    describe('Winter Events', () => {
      it('should have correct Deep Frost effects', () => {
        eventSystem.startEvent('winter_frost');

        expect(eventSystem.getEffectMultiplier('movementSpeed')).toBe(0.7);
        expect(eventSystem.getEffectMultiplier('coldDamage')).toBe(2.0);
        expect(eventSystem.getEffectMultiplier('fuelConsumption')).toBe(2.5);
        expect(eventSystem.getEffectMultiplier('iceFormation')).toBe(3.0);
      });

      it('should have correct Blizzard Season effects', () => {
        eventSystem.startEvent('winter_blizzard_season');

        expect(eventSystem.getEffectMultiplier('blizzardFrequency')).toBe(4.0);
        expect(eventSystem.getEffectMultiplier('visibility')).toBe(0.3);
        expect(eventSystem.getEffectMultiplier('indoorBonus')).toBe(1.5);
      });

      it('should have correct Aurora Lights effects', () => {
        eventSystem.startEvent('winter_aurora');

        expect(eventSystem.getEffectMultiplier('manaRegen')).toBe(2.0);
        expect(eventSystem.getEffectMultiplier('magicPower')).toBe(1.5);
        expect(eventSystem.getEffectMultiplier('crystalGrowth')).toBe(2.0);
      });

      it('should have correct Winter Solstice effects', () => {
        eventSystem.startEvent('winter_solstice');

        expect(eventSystem.getEffectMultiplier('rareSpawns')).toBe(3.0);
        expect(eventSystem.getEffectMultiplier('nightBonus')).toBe(2.0);
        expect(eventSystem.getEffectMultiplier('mysticalEncounters')).toBe(5.0);
      });
    });
  });

  describe('Statistics', () => {
    it('should track total events triggered', () => {
      eventSystem.startEvent('spring_growth_festival');
      eventSystem.startEvent('summer_heat_wave');

      const stats = eventSystem.getStats();
      expect(stats.totalEventsTriggered).toBe(2);
    });

    it('should track events by type', () => {
      eventSystem.startEvent('spring_growth_festival');
      eventSystem._endEvent('spring_growth_festival');
      eventSystem.startEvent('spring_growth_festival');

      const stats = eventSystem.getStats();
      expect(stats.eventsByType.spring_growth_festival).toBe(2);
    });

    it('should track active events count', () => {
      eventSystem.startEvent('spring_growth_festival');
      eventSystem.startEvent('summer_heat_wave');

      const stats = eventSystem.getStats();
      expect(stats.activeEventsCount).toBe(2);
    });

    it('should track total completed events', () => {
      eventSystem.startEvent('spring_growth_festival');
      eventSystem._endEvent('spring_growth_festival');
      eventSystem.startEvent('summer_heat_wave');
      eventSystem._endEvent('summer_heat_wave');

      const stats = eventSystem.getStats();
      expect(stats.totalEventsCompleted).toBe(2);
    });

    it('should track rewards earned', () => {
      eventSystem.startEvent('spring_growth_festival');
      eventSystem._endEvent('spring_growth_festival');

      const stats = eventSystem.getStats();
      expect(stats.rewardsEarned.experience).toBe(100);
      expect(stats.rewardsEarned.seed).toBe(10);
      expect(stats.rewardsEarned.herb).toBe(5);
    });
  });

  describe('Serialization', () => {
    it('should serialize state', () => {
      eventSystem.startEvent('spring_growth_festival');
      eventSystem.startEvent('summer_heat_wave');
      eventSystem._endEvent('spring_growth_festival');

      const serialized = eventSystem.serialize();

      expect(serialized.activeEvents).toBeDefined();
      expect(serialized.eventHistory).toBeDefined();
      expect(serialized.stats).toBeDefined();
      expect(serialized.lastEventCheck).toBeDefined();
    });

    it('should serialize active events', () => {
      eventSystem.startEvent('spring_growth_festival');
      const serialized = eventSystem.serialize();

      expect(serialized.activeEvents.length).toBe(1);
      expect(serialized.activeEvents[0][0]).toBe('spring_growth_festival');
    });

    it('should serialize event history', () => {
      eventSystem.startEvent('spring_growth_festival');
      eventSystem._endEvent('spring_growth_festival');

      const serialized = eventSystem.serialize();

      expect(serialized.eventHistory.length).toBe(1);
      expect(serialized.eventHistory[0].eventId).toBe('spring_growth_festival');
    });

    it('should serialize statistics', () => {
      eventSystem.startEvent('spring_growth_festival');
      eventSystem._endEvent('spring_growth_festival');

      const serialized = eventSystem.serialize();

      expect(serialized.stats.totalEventsTriggered).toBe(1);
      expect(serialized.stats.rewardsEarned.experience).toBe(100);
    });

    it('should deserialize state', () => {
      const data = {
        activeEvents: [['spring_growth_festival', {
          id: 'spring_growth_festival',
          startTime: Date.now(),
          endTime: Date.now() + 100000,
          active: true,
        }]],
        eventHistory: [{
          eventId: 'summer_heat_wave',
          startTime: 1000,
          endTime: 2000,
          completedAt: 2000,
        }],
        stats: {
          totalEventsTriggered: 5,
          eventsByType: { spring_growth_festival: 2 },
          rewardsEarned: { experience: 500 },
        },
        lastEventCheck: 50000,
      };

      eventSystem.deserialize(data);

      expect(eventSystem.activeEvents.size).toBe(1);
      expect(eventSystem.eventHistory.length).toBe(1);
      expect(eventSystem.stats.totalEventsTriggered).toBe(5);
      expect(eventSystem.lastEventCheck).toBe(50000);
    });

    it('should handle partial deserialization', () => {
      const data = {
        stats: { totalEventsTriggered: 10 },
      };

      eventSystem.deserialize(data);

      expect(eventSystem.stats.totalEventsTriggered).toBe(10);
      expect(eventSystem.activeEvents.size).toBe(0);
      expect(eventSystem.eventHistory.length).toBe(0);
    });

    it('should restore event functionality after deserialization', () => {
      eventSystem.startEvent('spring_growth_festival');
      const serialized = eventSystem.serialize();

      const newSystem = new SeasonalEventSystem(seasonalSystem);
      newSystem.deserialize(serialized);

      expect(newSystem.isEventActive('spring_growth_festival')).toBe(true);
      expect(newSystem.getEffectMultiplier('plantGrowth')).toBe(2.0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle ending non-existent event gracefully', () => {
      expect(() => {
        eventSystem._endEvent('non_existent_event');
      }).not.toThrow();
    });

    it('should handle empty event history', () => {
      const stats = eventSystem.getStats();
      expect(stats.totalEventsCompleted).toBe(0);
    });

    it('should handle checking for events when none are eligible', () => {
      eventSystem.config.maxActiveEvents = 0;

      expect(() => {
        eventSystem._checkForNewEvents();
      }).not.toThrow();
    });

    it('should handle event with no duration', () => {
      const event = {
        id: 'test_event',
        season: SeasonType.SPRING,
        duration: 0,
        probability: 1.0,
      };

      // Manually create event (since startEvent might fail)
      const activeEvent = {
        ...event,
        startTime: Date.now(),
        endTime: Date.now(),
        active: true,
      };

      eventSystem.activeEvents.set('test_event', activeEvent);
      expect(eventSystem.isEventActive('test_event')).toBe(true);
    });

    it('should handle multiple simultaneous event endings', () => {
      const now = Date.now();

      eventSystem.startEvent('spring_growth_festival');
      eventSystem.startEvent('spring_flower_bloom');

      // Set both to expire
      eventSystem.activeEvents.get('spring_growth_festival').endTime = now - 1;
      eventSystem.activeEvents.get('spring_flower_bloom').endTime = now - 1;

      eventSystem._updateActiveEvents(0);

      expect(eventSystem.activeEvents.size).toBe(0);
      expect(eventSystem.eventHistory.length).toBe(2);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle full event lifecycle', () => {
      // Start event
      const startResult = eventSystem.startEvent('spring_growth_festival');
      expect(startResult).toBe(true);

      // Check active
      expect(eventSystem.isEventActive('spring_growth_festival')).toBe(true);

      // Get effect
      expect(eventSystem.getEffectMultiplier('plantGrowth')).toBe(2.0);

      // End event
      eventSystem._endEvent('spring_growth_festival');

      // Check ended
      expect(eventSystem.isEventActive('spring_growth_festival')).toBe(false);
      expect(eventSystem.eventHistory.length).toBe(1);
      expect(eventSystem.stats.rewardsEarned.experience).toBe(100);
    });

    it('should handle season transition correctly', () => {
      seasonalSystem.setCurrentSeason(SeasonType.SPRING);
      eventSystem.startEvent('spring_growth_festival');
      expect(eventSystem.isEventActive('spring_growth_festival')).toBe(true);

      // Season changes to summer
      seasonalSystem.setCurrentSeason(SeasonType.SUMMER);

      // Spring event still active until it expires
      expect(eventSystem.isEventActive('spring_growth_festival')).toBe(true);

      // Can't get new spring events
      const eligible = eventSystem._getEligibleEvents(SeasonType.SPRING);
      expect(eligible.some(e => e.id === 'spring_growth_festival')).toBe(false);
    });

    it('should handle complex multi-event scenario', () => {
      const callback = jest.fn();
      eventSystem.on('onEventStart', callback);

      // Start multiple events
      eventSystem.startEvent('spring_growth_festival');
      eventSystem.startEvent('spring_flower_bloom');

      expect(callback).toHaveBeenCalledTimes(2);
      expect(eventSystem.activeEvents.size).toBe(2);

      // Combined effects
      const plantGrowth = eventSystem.getEffectMultiplier('plantGrowth');
      expect(plantGrowth).toBe(2.0); // Only Growth Festival has plantGrowth

      // End one event
      eventSystem._endEvent('spring_growth_festival');

      expect(eventSystem.activeEvents.size).toBe(1);
      expect(eventSystem.isEventActive('spring_flower_bloom')).toBe(true);

      // End second event
      eventSystem._endEvent('spring_flower_bloom');

      expect(eventSystem.activeEvents.size).toBe(0);
      expect(eventSystem.eventHistory.length).toBe(2);
    });
  });
});
