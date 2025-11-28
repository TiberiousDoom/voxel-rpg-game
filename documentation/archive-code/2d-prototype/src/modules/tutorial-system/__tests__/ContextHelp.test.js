/**
 * Tests for ContextHelp
 */

import ContextHelp from '../ContextHelp.js';

describe('ContextHelp', () => {
  let contextHelp;
  let sampleDefinitions;

  beforeEach(() => {
    sampleDefinitions = [
      {
        id: 'test-tip-1',
        title: 'Test Tip 1',
        message: 'This is a test tip',
        triggerType: 'building_placement_failed',
        priority: 'high',
        showOnce: true,
        category: 'building'
      },
      {
        id: 'test-tip-2',
        title: 'Test Tip 2',
        message: 'This is another test tip',
        triggerType: 'food_depleted',
        priority: 'normal',
        showOnce: false,
        category: 'resources'
      },
      {
        id: 'test-tip-3',
        title: 'Resource Threshold Test',
        message: 'Low resource warning',
        triggerType: 'resource_threshold',
        triggerCondition: { resource: 'food', operator: '<', value: 20 },
        priority: 'high',
        showOnce: true,
        category: 'resources'
      },
      {
        id: 'test-tip-4',
        title: 'Custom Trigger Test',
        message: 'Custom condition',
        triggerType: 'custom',
        triggerCondition: (gameState) => gameState.customFlag === true,
        priority: 'low',
        showOnce: true,
        category: 'general'
      }
    ];

    contextHelp = new ContextHelp(sampleDefinitions);
  });

  describe('Initialization', () => {
    test('should initialize with correct default state', () => {
      expect(contextHelp.enabled).toBe(true);
      expect(contextHelp.triggeredTips.size).toBe(0);
      expect(contextHelp.dismissedTips.size).toBe(0);
      expect(contextHelp.tipsShownCount).toBe(0);
    });

    test('should load help definitions', () => {
      expect(contextHelp.helpDefinitions.size).toBe(4);
      expect(contextHelp.helpDefinitions.get('test-tip-1')).toBeDefined();
    });
  });

  describe('Trigger Detection', () => {
    test('should trigger on building placement failed', () => {
      const gameState = { buildingPlacementFailed: true };
      const triggeredTips = contextHelp.checkTriggers(gameState);

      expect(triggeredTips.length).toBeGreaterThan(0);
      expect(triggeredTips[0].id).toBe('test-tip-1');
    });

    test('should trigger on food depleted', () => {
      const gameState = { food: 0 };
      const triggeredTips = contextHelp.checkTriggers(gameState);

      expect(triggeredTips.length).toBeGreaterThan(0);
      expect(triggeredTips.some(tip => tip.id === 'test-tip-2')).toBe(true);
    });

    test('should trigger on resource threshold', () => {
      const gameState = { food: 15 };
      const triggeredTips = contextHelp.checkTriggers(gameState);

      expect(triggeredTips.length).toBeGreaterThan(0);
      expect(triggeredTips.some(tip => tip.id === 'test-tip-3')).toBe(true);
    });

    test('should trigger on custom condition', () => {
      const gameState = { customFlag: true };
      const triggeredTips = contextHelp.checkTriggers(gameState);

      expect(triggeredTips.length).toBeGreaterThan(0);
      expect(triggeredTips.some(tip => tip.id === 'test-tip-4')).toBe(true);
    });

    test('should not trigger when conditions not met', () => {
      const gameState = { food: 100 };
      const triggeredTips = contextHelp.checkTriggers(gameState);

      expect(triggeredTips.length).toBe(0);
    });

    test('should return empty array when disabled', () => {
      contextHelp.disable();
      const gameState = { buildingPlacementFailed: true };
      const triggeredTips = contextHelp.checkTriggers(gameState);

      expect(triggeredTips.length).toBe(0);
    });
  });

  describe('Show Once Behavior', () => {
    test('should show tip only once if showOnce is true', () => {
      const gameState = { buildingPlacementFailed: true };

      // First trigger
      let triggeredTips = contextHelp.checkTriggers(gameState);
      expect(triggeredTips.length).toBeGreaterThan(0);

      // Second trigger - should not show again
      triggeredTips = contextHelp.checkTriggers(gameState);
      expect(triggeredTips.find(tip => tip.id === 'test-tip-1')).toBeUndefined();
    });

    test('should show tip multiple times if showOnce is false', () => {
      const gameState = { food: 0 };

      // First trigger
      let triggeredTips = contextHelp.checkTriggers(gameState);
      expect(triggeredTips.some(tip => tip.id === 'test-tip-2')).toBe(true);

      // Reset triggered to test again
      contextHelp.resetTriggered();

      // Second trigger - should show again
      triggeredTips = contextHelp.checkTriggers(gameState);
      expect(triggeredTips.some(tip => tip.id === 'test-tip-2')).toBe(true);
    });
  });

  describe('Dismiss Functionality', () => {
    test('should not show dismissed tips', () => {
      contextHelp.dismissTip('test-tip-1');

      const gameState = { buildingPlacementFailed: true };
      const triggeredTips = contextHelp.checkTriggers(gameState);

      expect(triggeredTips.find(tip => tip.id === 'test-tip-1')).toBeUndefined();
    });

    test('should track dismissed tips', () => {
      contextHelp.dismissTip('test-tip-1');
      expect(contextHelp.dismissedTips.has('test-tip-1')).toBe(true);
    });
  });

  describe('Priority Sorting', () => {
    test('should sort tips by priority (high > normal > low)', () => {
      const gameState = {
        buildingPlacementFailed: true,
        food: 0,
        customFlag: true
      };

      const triggeredTips = contextHelp.checkTriggers(gameState);

      // High priority should come first
      const priorities = triggeredTips.map(tip => tip.priority);
      const highIndex = priorities.indexOf('high');
      const lowIndex = priorities.indexOf('low');

      if (highIndex !== -1 && lowIndex !== -1) {
        expect(highIndex).toBeLessThan(lowIndex);
      }
    });
  });

  describe('Manual Trigger', () => {
    test('should manually trigger a tip', () => {
      const tip = contextHelp.triggerTip('test-tip-1');

      expect(tip).toBeDefined();
      expect(tip.id).toBe('test-tip-1');
      expect(contextHelp.triggeredTips.has('test-tip-1')).toBe(true);
    });

    test('should not trigger non-existent tip', () => {
      const tip = contextHelp.triggerTip('non-existent');

      expect(tip).toBeNull();
    });

    test('should not trigger dismissed tip manually', () => {
      contextHelp.dismissTip('test-tip-1');
      const tip = contextHelp.triggerTip('test-tip-1');

      expect(tip).toBeNull();
    });
  });

  describe('Resource Threshold Conditions', () => {
    test('should handle less than operator', () => {
      const gameState = { food: 15 };
      const triggeredTips = contextHelp.checkTriggers(gameState);

      expect(triggeredTips.some(tip => tip.id === 'test-tip-3')).toBe(true);
    });

    test('should handle greater than operator', () => {
      const definitions = [{
        id: 'gt-test',
        title: 'Test',
        message: 'Test',
        triggerType: 'resource_threshold',
        triggerCondition: { resource: 'gold', operator: '>', value: 50 },
        priority: 'normal'
      }];

      const help = new ContextHelp(definitions);
      const gameState = { gold: 100 };
      const triggeredTips = help.checkTriggers(gameState);

      expect(triggeredTips.length).toBeGreaterThan(0);
    });

    test('should handle equals operator', () => {
      const definitions = [{
        id: 'eq-test',
        title: 'Test',
        message: 'Test',
        triggerType: 'resource_threshold',
        triggerCondition: { resource: 'gold', operator: '===', value: 100 },
        priority: 'normal'
      }];

      const help = new ContextHelp(definitions);
      const gameState = { gold: 100 };
      const triggeredTips = help.checkTriggers(gameState);

      expect(triggeredTips.length).toBeGreaterThan(0);
    });
  });

  describe('Event Listeners', () => {
    test('should notify listeners when tip triggered', () => {
      const mockListener = jest.fn();
      contextHelp.onTipTriggered(mockListener);

      const gameState = { buildingPlacementFailed: true };
      contextHelp.checkTriggers(gameState);

      expect(mockListener).toHaveBeenCalled();
    });

    test('should remove listeners', () => {
      const mockListener = jest.fn();
      contextHelp.onTipTriggered(mockListener);
      contextHelp.removeTipTriggeredListener(mockListener);

      const gameState = { buildingPlacementFailed: true };
      contextHelp.checkTriggers(gameState);

      expect(mockListener).not.toHaveBeenCalled();
    });

    test('should handle listener errors gracefully', () => {
      const errorListener = jest.fn(() => {
        throw new Error('Test error');
      });

      contextHelp.onTipTriggered(errorListener);

      const gameState = { buildingPlacementFailed: true };

      // Should not throw
      expect(() => contextHelp.checkTriggers(gameState)).not.toThrow();
    });
  });

  describe('Reset Functions', () => {
    test('should reset triggered tips', () => {
      const gameState = { buildingPlacementFailed: true };
      contextHelp.checkTriggers(gameState);

      expect(contextHelp.triggeredTips.size).toBeGreaterThan(0);

      contextHelp.resetTriggered();

      expect(contextHelp.triggeredTips.size).toBe(0);
      expect(contextHelp.tipsShownCount).toBe(0);
    });

    test('should reset dismissed tips', () => {
      contextHelp.dismissTip('test-tip-1');
      expect(contextHelp.dismissedTips.size).toBeGreaterThan(0);

      contextHelp.resetDismissed();

      expect(contextHelp.dismissedTips.size).toBe(0);
    });
  });

  describe('Serialization', () => {
    test('should serialize state', () => {
      contextHelp.dismissTip('test-tip-1');
      const gameState = { food: 0 };
      contextHelp.checkTriggers(gameState);

      const serialized = contextHelp.serialize();

      expect(serialized.enabled).toBe(true);
      expect(serialized.triggeredTips).toBeInstanceOf(Array);
      expect(serialized.dismissedTips).toContain('test-tip-1');
    });

    test('should deserialize state', () => {
      const savedState = {
        enabled: true,
        triggeredTips: ['test-tip-1'],
        dismissedTips: ['test-tip-2'],
        tipsShownCount: 5
      };

      contextHelp.deserialize(savedState);

      expect(contextHelp.enabled).toBe(true);
      expect(contextHelp.triggeredTips.has('test-tip-1')).toBe(true);
      expect(contextHelp.dismissedTips.has('test-tip-2')).toBe(true);
      expect(contextHelp.tipsShownCount).toBe(5);
    });

    test('should handle missing data in deserialize', () => {
      expect(() => contextHelp.deserialize(null)).not.toThrow();
      expect(() => contextHelp.deserialize({})).not.toThrow();
    });
  });

  describe('Query Functions', () => {
    test('should get help tip by ID', () => {
      const tip = contextHelp.getHelpTip('test-tip-1');

      expect(tip).toBeDefined();
      expect(tip.id).toBe('test-tip-1');
    });

    test('should return null for non-existent ID', () => {
      const tip = contextHelp.getHelpTip('non-existent');

      expect(tip).toBeNull();
    });

    test('should get tips by category', () => {
      const buildingTips = contextHelp.getHelpTipsByCategory('building');

      expect(buildingTips.length).toBeGreaterThan(0);
      expect(buildingTips.every(tip => tip.category === 'building')).toBe(true);
    });
  });

  describe('Spam Prevention', () => {
    test('should stop showing tips after max limit', () => {
      contextHelp.maxTipsPerSession = 2;

      const gameState1 = { buildingPlacementFailed: true };
      contextHelp.checkTriggers(gameState1);

      contextHelp.resetTriggered();

      const gameState2 = { food: 0 };
      contextHelp.checkTriggers(gameState2);

      contextHelp.resetTriggered();

      // Third trigger should be blocked
      const gameState3 = { customFlag: true };
      const tips = contextHelp.checkTriggers(gameState3);

      expect(tips.length).toBe(0);
    });
  });
});
