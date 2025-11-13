/**
 * NPCNeedsTracker.test.js - Unit tests for NPC Needs Tracking
 */

import NPCNeedsTracker from '../NPCNeedsTracker.js';
import { NPCNeed, NeedType, NeedLevel } from '../NPCNeed.js';

describe('NPCNeedsTracker', () => {
  let needsTracker;

  beforeEach(() => {
    needsTracker = new NPCNeedsTracker();
  });

  describe('Initialization', () => {
    test('should initialize with empty state', () => {
      expect(needsTracker.npcNeeds.size).toBe(0);
      expect(needsTracker.criticalAlerts.size).toBe(0);
      expect(needsTracker.stats.totalNPCsTracked).toBe(0);
    });

    test('should have correct configuration', () => {
      expect(needsTracker.config.updateInterval).toBe(1000);
      expect(needsTracker.config.happinessUpdateInterval).toBe(60000);
      expect(needsTracker.config.alertCooldown).toBe(30000);
    });

    test('should initialize timing properties', () => {
      expect(needsTracker.lastUpdateTime).toBeDefined();
      expect(needsTracker.lastHappinessUpdate).toBeDefined();
    });
  });

  describe('NPC Registration', () => {
    test('should register NPC with default values', () => {
      const registered = needsTracker.registerNPC('npc1');

      expect(registered).toBe(true);
      expect(needsTracker.npcNeeds.has('npc1')).toBe(true);
      expect(needsTracker.stats.totalNPCsTracked).toBe(1);
    });

    test('should register NPC with custom initial values', () => {
      needsTracker.registerNPC('npc1', {
        food: 80,
        rest: 60,
        social: 40,
        shelter: 90
      });

      const needs = needsTracker.getNeeds('npc1');
      expect(needs.get(NeedType.FOOD).value).toBe(80);
      expect(needs.get(NeedType.REST).value).toBe(60);
      expect(needs.get(NeedType.SOCIAL).value).toBe(40);
      expect(needs.get(NeedType.SHELTER).value).toBe(90);
    });

    test('should create all 4 need types on registration', () => {
      needsTracker.registerNPC('npc1');
      const needs = needsTracker.getNeeds('npc1');

      expect(needs.has(NeedType.FOOD)).toBe(true);
      expect(needs.has(NeedType.REST)).toBe(true);
      expect(needs.has(NeedType.SOCIAL)).toBe(true);
      expect(needs.has(NeedType.SHELTER)).toBe(true);
      expect(needs.size).toBe(4);
    });

    test('should not register NPC twice', () => {
      needsTracker.registerNPC('npc1');
      const secondRegister = needsTracker.registerNPC('npc1');

      expect(secondRegister).toBe(false);
      expect(needsTracker.stats.totalNPCsTracked).toBe(1);
    });

    test('should unregister NPC', () => {
      needsTracker.registerNPC('npc1');
      const removed = needsTracker.unregisterNPC('npc1');

      expect(removed).toBe(true);
      expect(needsTracker.npcNeeds.has('npc1')).toBe(false);
    });

    test('should remove critical alerts when unregistering', () => {
      needsTracker.registerNPC('npc1', { food: 10 }); // Critical
      needsTracker.updateAllNeeds(1000);

      expect(needsTracker.hasCriticalNeeds('npc1')).toBe(true);

      needsTracker.unregisterNPC('npc1');

      expect(needsTracker.hasCriticalNeeds('npc1')).toBe(false);
    });

    test('should return false when unregistering non-existent NPC', () => {
      const removed = needsTracker.unregisterNPC('npc999');
      expect(removed).toBe(false);
    });
  });

  describe('Need Updates', () => {
    beforeEach(() => {
      needsTracker.registerNPC('npc1', {
        food: 100,
        rest: 100,
        social: 100,
        shelter: 100
      });
    });

    test('should update all NPC needs', () => {
      const initialStats = needsTracker.stats.totalNeedsUpdated;

      needsTracker.updateAllNeeds(5000); // 5 seconds

      expect(needsTracker.stats.totalNeedsUpdated).toBeGreaterThan(initialStats);
    });

    test('should decay food need when working', () => {
      const npcStates = {
        'npc1': { isWorking: true }
      };

      const initialFood = needsTracker.getNeed('npc1', NeedType.FOOD).value;

      needsTracker.updateAllNeeds(60000, npcStates); // 1 minute

      const finalFood = needsTracker.getNeed('npc1', NeedType.FOOD).value;
      expect(finalFood).toBeLessThan(initialFood);
    });

    test('should decay rest need when working', () => {
      const npcStates = {
        'npc1': { isWorking: true }
      };

      const initialRest = needsTracker.getNeed('npc1', NeedType.REST).value;

      needsTracker.updateAllNeeds(60000, npcStates); // 1 minute

      const finalRest = needsTracker.getNeed('npc1', NeedType.REST).value;
      expect(finalRest).toBeLessThan(initialRest);
    });

    test('should recover rest need when resting', () => {
      needsTracker.registerNPC('npc2', { rest: 50 });

      const npcStates = {
        'npc2': { isResting: true }
      };

      const initialRest = needsTracker.getNeed('npc2', NeedType.REST).value;

      needsTracker.updateAllNeeds(60000, npcStates); // 1 minute

      const finalRest = needsTracker.getNeed('npc2', NeedType.REST).value;
      expect(finalRest).toBeGreaterThan(initialRest);
    });

    test('should recover social need when socializing', () => {
      needsTracker.registerNPC('npc3', { social: 30 });

      const npcStates = {
        'npc3': { isSocializing: true }
      };

      const initialSocial = needsTracker.getNeed('npc3', NeedType.SOCIAL).value;

      needsTracker.updateAllNeeds(60000, npcStates); // 1 minute

      const finalSocial = needsTracker.getNeed('npc3', NeedType.SOCIAL).value;
      expect(finalSocial).toBeGreaterThan(initialSocial);
    });

    test('should not decay shelter need inside territory', () => {
      const npcStates = {
        'npc1': { isInsideTerritory: true }
      };

      const initialShelter = needsTracker.getNeed('npc1', NeedType.SHELTER).value;

      needsTracker.updateAllNeeds(60000, npcStates); // 1 minute

      const finalShelter = needsTracker.getNeed('npc1', NeedType.SHELTER).value;
      expect(finalShelter).toBe(initialShelter);
    });

    test('should decay shelter need outside territory', () => {
      const npcStates = {
        'npc1': { isInsideTerritory: false }
      };

      const initialShelter = needsTracker.getNeed('npc1', NeedType.SHELTER).value;

      needsTracker.updateAllNeeds(60000, npcStates); // 1 minute

      const finalShelter = needsTracker.getNeed('npc1', NeedType.SHELTER).value;
      expect(finalShelter).toBeLessThan(initialShelter);
    });

    test('should handle zero deltaTime', () => {
      const initialFood = needsTracker.getNeed('npc1', NeedType.FOOD).value;

      needsTracker.updateAllNeeds(0);

      const finalFood = needsTracker.getNeed('npc1', NeedType.FOOD).value;
      expect(finalFood).toBe(initialFood);
    });

    test('should handle large deltaTime (catch-up)', () => {
      const npcStates = {
        'npc1': { isWorking: true }
      };

      needsTracker.updateAllNeeds(600000, npcStates); // 10 minutes

      const food = needsTracker.getNeed('npc1', NeedType.FOOD).value;
      expect(food).toBeLessThan(100);
    });
  });

  describe('Need Satisfaction', () => {
    beforeEach(() => {
      needsTracker.registerNPC('npc1', { food: 30 });
    });

    test('should satisfy need', () => {
      const initialFood = needsTracker.getNeed('npc1', NeedType.FOOD).value;

      const satisfied = needsTracker.satisfyNeed('npc1', NeedType.FOOD, 20);

      expect(satisfied).toBe(true);
      expect(needsTracker.getNeed('npc1', NeedType.FOOD).value).toBe(initialFood + 20);
    });

    test('should not exceed 100 when satisfying', () => {
      needsTracker.satisfyNeed('npc1', NeedType.FOOD, 100);

      expect(needsTracker.getNeed('npc1', NeedType.FOOD).value).toBe(100);
    });

    test('should return false for non-existent NPC', () => {
      const satisfied = needsTracker.satisfyNeed('npc999', NeedType.FOOD, 20);
      expect(satisfied).toBe(false);
    });

    test('should return false for non-existent need type', () => {
      const satisfied = needsTracker.satisfyNeed('npc1', 'INVALID_TYPE', 20);
      expect(satisfied).toBe(false);
    });
  });

  describe('Critical Needs', () => {
    test('should detect critical needs', () => {
      needsTracker.registerNPC('npc1', {
        food: 10, // Critical
        rest: 15, // Critical
        social: 50,
        shelter: 80
      });

      needsTracker.updateAllNeeds(1000);

      const criticalNeeds = needsTracker.getCriticalNeeds('npc1');
      expect(criticalNeeds.length).toBe(2);
      expect(criticalNeeds).toContain(NeedType.FOOD);
      expect(criticalNeeds).toContain(NeedType.REST);
    });

    test('should check if NPC has critical needs', () => {
      needsTracker.registerNPC('npc1', { food: 10 });
      needsTracker.updateAllNeeds(1000);

      expect(needsTracker.hasCriticalNeeds('npc1')).toBe(true);
    });

    test('should return false for NPC without critical needs', () => {
      needsTracker.registerNPC('npc1', {
        food: 80,
        rest: 90,
        social: 70,
        shelter: 85
      });
      needsTracker.updateAllNeeds(1000);

      expect(needsTracker.hasCriticalNeeds('npc1')).toBe(false);
    });

    test('should get all NPCs with critical needs', () => {
      needsTracker.registerNPC('npc1', { food: 10 });
      needsTracker.registerNPC('npc2', { rest: 15 });
      needsTracker.registerNPC('npc3', { food: 80, rest: 80 });

      needsTracker.updateAllNeeds(1000);

      const criticalNPCs = needsTracker.getAllCriticalNPCs();
      expect(criticalNPCs.length).toBe(2);
      expect(criticalNPCs).toContain('npc1');
      expect(criticalNPCs).toContain('npc2');
      expect(criticalNPCs).not.toContain('npc3');
    });

    test('should remove NPC from critical alerts when need satisfied', () => {
      needsTracker.registerNPC('npc1', { food: 10 });
      needsTracker.updateAllNeeds(1000);

      expect(needsTracker.hasCriticalNeeds('npc1')).toBe(true);

      needsTracker.satisfyNeed('npc1', NeedType.FOOD, 50);
      needsTracker.updateAllNeeds(1000);

      expect(needsTracker.hasCriticalNeeds('npc1')).toBe(false);
    });

    test('should track total critical events', () => {
      needsTracker.registerNPC('npc1', {
        food: 10,
        rest: 15,
        social: 18,
        shelter: 19
      });

      const initialCriticalEvents = needsTracker.stats.totalCriticalEvents;

      needsTracker.updateAllNeeds(1000);

      expect(needsTracker.stats.totalCriticalEvents).toBeGreaterThan(initialCriticalEvents);
    });
  });

  describe('Need Queries', () => {
    beforeEach(() => {
      needsTracker.registerNPC('npc1', {
        food: 80,
        rest: 60,
        social: 40,
        shelter: 90
      });
    });

    test('should get all needs for NPC', () => {
      const needs = needsTracker.getNeeds('npc1');

      expect(needs).toBeDefined();
      expect(needs.size).toBe(4);
      expect(needs.has(NeedType.FOOD)).toBe(true);
    });

    test('should return null for non-existent NPC', () => {
      const needs = needsTracker.getNeeds('npc999');
      expect(needs).toBeNull();
    });

    test('should get specific need for NPC', () => {
      const foodNeed = needsTracker.getNeed('npc1', NeedType.FOOD);

      expect(foodNeed).toBeDefined();
      expect(foodNeed.type).toBe(NeedType.FOOD);
      expect(foodNeed.value).toBe(80);
    });

    test('should return null for non-existent need', () => {
      const need = needsTracker.getNeed('npc999', NeedType.FOOD);
      expect(need).toBeNull();
    });

    test('should get lowest need for NPC', () => {
      const lowestNeed = needsTracker.getLowestNeed('npc1');

      expect(lowestNeed).toBeDefined();
      expect(lowestNeed.type).toBe(NeedType.SOCIAL);
      expect(lowestNeed.value).toBe(40);
    });

    test('should return null when getting lowest need for non-existent NPC', () => {
      const lowestNeed = needsTracker.getLowestNeed('npc999');
      expect(lowestNeed).toBeNull();
    });

    test('should get needs summary', () => {
      const summary = needsTracker.getNeedsSummary('npc1');

      expect(summary).toBeDefined();
      expect(summary.npcId).toBe('npc1');
      expect(summary.needs).toBeDefined();
      expect(summary.needs[NeedType.FOOD]).toBeDefined();
      expect(summary.lowestNeed).toBeDefined();
      expect(summary.happinessImpact).toBeDefined();
      expect(summary.allSatisfied).toBeDefined();
    });

    test('should indicate all needs satisfied when above threshold', () => {
      needsTracker.registerNPC('npc2', {
        food: 70,
        rest: 80,
        social: 65,
        shelter: 90
      });

      const summary = needsTracker.getNeedsSummary('npc2');
      expect(summary.allSatisfied).toBe(true);
    });

    test('should indicate not all needs satisfied when below threshold', () => {
      const summary = needsTracker.getNeedsSummary('npc1');
      expect(summary.allSatisfied).toBe(false); // Social is 40 < 60
    });

    test('should return null summary for non-existent NPC', () => {
      const summary = needsTracker.getNeedsSummary('npc999');
      expect(summary).toBeNull();
    });
  });

  describe('Happiness Impact', () => {
    test('should calculate positive happiness impact when all needs satisfied', () => {
      needsTracker.registerNPC('npc1', {
        food: 80,
        rest: 90,
        social: 70,
        shelter: 85
      });

      const impact = needsTracker.calculateHappinessImpact('npc1');

      // All needs above 60: +5 each = 20, plus +5 bonus = 25
      expect(impact).toBe(25);
    });

    test('should calculate negative happiness impact for critical needs', () => {
      needsTracker.registerNPC('npc1', {
        food: 10, // Critical: -10
        rest: 15, // Critical: -10
        social: 50, // Low: 0
        shelter: 80 // Satisfied: +5
      });

      const impact = needsTracker.calculateHappinessImpact('npc1');

      expect(impact).toBe(-15); // -10 + -10 + 0 + 5
    });

    test('should calculate mixed happiness impact', () => {
      needsTracker.registerNPC('npc1', {
        food: 70, // Satisfied: +5
        rest: 30, // Low: -3
        social: 10, // Critical: -10
        shelter: 80 // Satisfied: +5
      });

      const impact = needsTracker.calculateHappinessImpact('npc1');

      expect(impact).toBe(-3); // +5 + -3 + -10 + 5
    });

    test('should return 0 for non-existent NPC', () => {
      const impact = needsTracker.calculateHappinessImpact('npc999');
      expect(impact).toBe(0);
    });

    test('should include bonus when all 4 needs are satisfied', () => {
      needsTracker.registerNPC('npc1', {
        food: 65,
        rest: 70,
        social: 60,
        shelter: 80
      });

      const impact = needsTracker.calculateHappinessImpact('npc1');

      // All above 60: +5 each = 20, plus +5 bonus = 25
      expect(impact).toBe(25);
    });
  });

  describe('Statistics', () => {
    test('should get statistics', () => {
      needsTracker.registerNPC('npc1');
      needsTracker.registerNPC('npc2');
      needsTracker.updateAllNeeds(5000);

      const stats = needsTracker.getStatistics();

      expect(stats.totalNPCsTracked).toBe(2);
      expect(stats.totalNeedsUpdated).toBeGreaterThan(0);
      expect(stats.needDistribution).toBeDefined();
    });

    test('should track critical NPCs in statistics', () => {
      needsTracker.registerNPC('npc1', { food: 10 });
      needsTracker.registerNPC('npc2', { food: 80 });
      needsTracker.updateAllNeeds(1000);

      const stats = needsTracker.getStatistics();

      expect(stats.npcWithCriticalNeeds).toBe(1);
    });

    test('should reset statistics', () => {
      needsTracker.registerNPC('npc1');
      needsTracker.updateAllNeeds(5000);

      needsTracker.resetStatistics();

      const stats = needsTracker.getStatistics();
      expect(stats.totalNeedsUpdated).toBe(0);
      expect(stats.totalCriticalEvents).toBe(0);
    });

    test('should preserve NPC count when resetting statistics', () => {
      needsTracker.registerNPC('npc1');
      needsTracker.registerNPC('npc2');

      needsTracker.resetStatistics();

      const stats = needsTracker.getStatistics();
      expect(stats.totalNPCsTracked).toBe(2);
    });
  });

  describe('Reset and Clear', () => {
    beforeEach(() => {
      needsTracker.registerNPC('npc1', {
        food: 30,
        rest: 40,
        social: 50,
        shelter: 60
      });
    });

    test('should reset NPC needs to default values', () => {
      const resetSuccess = needsTracker.resetNPCNeeds('npc1');

      expect(resetSuccess).toBe(true);

      const needs = needsTracker.getNeeds('npc1');
      for (const need of needs.values()) {
        expect(need.value).toBe(50);
      }
    });

    test('should reset NPC needs to custom values', () => {
      needsTracker.resetNPCNeeds('npc1', {
        FOOD: 80,
        REST: 70,
        SOCIAL: 60,
        SHELTER: 90
      });

      expect(needsTracker.getNeed('npc1', NeedType.FOOD).value).toBe(80);
      expect(needsTracker.getNeed('npc1', NeedType.REST).value).toBe(70);
    });

    test('should clear critical alerts when resetting', () => {
      needsTracker.registerNPC('npc2', { food: 10 });
      needsTracker.updateAllNeeds(1000);

      expect(needsTracker.hasCriticalNeeds('npc2')).toBe(true);

      needsTracker.resetNPCNeeds('npc2', { FOOD: 80 });

      expect(needsTracker.hasCriticalNeeds('npc2')).toBe(false);
    });

    test('should return false when resetting non-existent NPC', () => {
      const resetSuccess = needsTracker.resetNPCNeeds('npc999');
      expect(resetSuccess).toBe(false);
    });

    test('should clear all NPCs', () => {
      needsTracker.registerNPC('npc2');
      needsTracker.registerNPC('npc3');

      needsTracker.clearAll();

      expect(needsTracker.npcNeeds.size).toBe(0);
      expect(needsTracker.criticalAlerts.size).toBe(0);
    });
  });

  describe('Multiple NPCs', () => {
    test('should track multiple NPCs independently', () => {
      needsTracker.registerNPC('npc1', { food: 80 });
      needsTracker.registerNPC('npc2', { food: 40 });
      needsTracker.registerNPC('npc3', { food: 10 });

      expect(needsTracker.getNeed('npc1', NeedType.FOOD).value).toBe(80);
      expect(needsTracker.getNeed('npc2', NeedType.FOOD).value).toBe(40);
      expect(needsTracker.getNeed('npc3', NeedType.FOOD).value).toBe(10);
    });

    test('should update multiple NPCs with different states', () => {
      needsTracker.registerNPC('npc1', { rest: 100 });
      needsTracker.registerNPC('npc2', { rest: 100 });

      const npcStates = {
        'npc1': { isWorking: true },
        'npc2': { isResting: true }
      };

      needsTracker.updateAllNeeds(60000, npcStates);

      const npc1Rest = needsTracker.getNeed('npc1', NeedType.REST).value;
      const npc2Rest = needsTracker.getNeed('npc2', NeedType.REST).value;

      expect(npc1Rest).toBeLessThan(100); // Decayed
      expect(npc2Rest).toBeGreaterThan(100); // Would be capped at 100
    });

    test('should handle 100 concurrent NPCs (performance)', () => {
      const startTime = performance.now();

      for (let i = 0; i < 100; i++) {
        needsTracker.registerNPC(`npc${i}`);
      }

      needsTracker.updateAllNeeds(5000);

      const endTime = performance.now();
      const updateTime = endTime - startTime;

      expect(updateTime).toBeLessThan(200); // Should update in < 200ms
      expect(needsTracker.getStatistics().totalNPCsTracked).toBe(100);
    });
  });

  describe('Edge Cases', () => {
    test('should handle NPC with null ID', () => {
      const registered = needsTracker.registerNPC(null);
      expect(registered).toBe(false);
    });

    test('should handle invalid initial values', () => {
      needsTracker.registerNPC('npc1', {
        food: -50, // Invalid
        rest: 200  // Invalid
      });

      const food = needsTracker.getNeed('npc1', NeedType.FOOD).value;
      const rest = needsTracker.getNeed('npc1', NeedType.REST).value;

      // NPCNeed clamps values to 0-100
      expect(food).toBeGreaterThanOrEqual(0);
      expect(food).toBeLessThanOrEqual(100);
      expect(rest).toBeGreaterThanOrEqual(0);
      expect(rest).toBeLessThanOrEqual(100);
    });

    test('should handle empty npcStates in update', () => {
      needsTracker.registerNPC('npc1');

      expect(() => {
        needsTracker.updateAllNeeds(5000);
      }).not.toThrow();
    });

    test('should handle updateAllNeeds with no registered NPCs', () => {
      expect(() => {
        needsTracker.updateAllNeeds(5000);
      }).not.toThrow();

      expect(needsTracker.stats.totalNeedsUpdated).toBe(0);
    });

    test('should validate need distribution tracking', () => {
      needsTracker.registerNPC('npc1', {
        food: 90, // EXCELLENT
        rest: 70, // HIGH
        social: 50, // MODERATE
        shelter: 30 // LOW
      });

      needsTracker.updateAllNeeds(1000);

      const stats = needsTracker.getStatistics();
      expect(stats.needDistribution).toBeDefined();
      expect(Object.keys(stats.needDistribution).length).toBeGreaterThan(0);
    });
  });
});
