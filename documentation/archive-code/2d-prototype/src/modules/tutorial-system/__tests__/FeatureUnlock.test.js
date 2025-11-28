/**
 * Tests for FeatureUnlock
 */

import FeatureUnlock from '../FeatureUnlock.js';

describe('FeatureUnlock', () => {
  let featureUnlock;

  beforeEach(() => {
    featureUnlock = new FeatureUnlock();
  });

  describe('Initialization', () => {
    test('should initialize with default features', () => {
      expect(featureUnlock.features.size).toBeGreaterThan(0);
      expect(featureUnlock.unlockedFeatures.size).toBe(0);
      expect(featureUnlock.enabled).toBe(true);
    });

    test('should have default features registered', () => {
      expect(featureUnlock.features.has('building-campfire')).toBe(true);
      expect(featureUnlock.features.has('building-farm')).toBe(true);
      expect(featureUnlock.features.has('npc-spawn-button')).toBe(true);
    });
  });

  describe('Feature Registration', () => {
    test('should register new feature', () => {
      featureUnlock.registerFeature({
        id: 'test-feature',
        name: 'Test Feature',
        description: 'A test feature',
        unlockCondition: {
          type: 'tutorial_complete'
        }
      });

      expect(featureUnlock.features.has('test-feature')).toBe(true);
    });

    test('should store feature with correct properties', () => {
      featureUnlock.registerFeature({
        id: 'test-feature',
        name: 'Test Feature',
        description: 'A test feature',
        unlockCondition: {
          type: 'tutorial_complete'
        }
      });

      const feature = featureUnlock.features.get('test-feature');
      expect(feature.id).toBe('test-feature');
      expect(feature.name).toBe('Test Feature');
      expect(feature.isUnlocked).toBe(false);
    });
  });

  describe('Manual Feature Unlock', () => {
    test('should unlock a feature manually', () => {
      const result = featureUnlock.unlockFeature('building-campfire');

      expect(result).toBe(true);
      expect(featureUnlock.isFeatureUnlocked('building-campfire')).toBe(true);
    });

    test('should not unlock non-existent feature', () => {
      const result = featureUnlock.unlockFeature('non-existent');

      expect(result).toBe(false);
    });

    test('should not unlock already unlocked feature', () => {
      featureUnlock.unlockFeature('building-campfire');
      const result = featureUnlock.unlockFeature('building-campfire');

      expect(result).toBe(false);
    });
  });

  describe('Tutorial-Based Unlocks', () => {
    test('should unlock on tutorial start', () => {
      const gameState = { tutorialStarted: true };
      const unlocked = featureUnlock.checkUnlocks(gameState);

      expect(unlocked).toContain('building-campfire');
      expect(featureUnlock.isFeatureUnlocked('building-campfire')).toBe(true);
    });

    test('should unlock on tutorial step completion', () => {
      const gameState = { tutorialStepCompleted: 'place-campfire' };
      const unlocked = featureUnlock.checkUnlocks(gameState);

      expect(unlocked).toContain('building-farm');
      expect(featureUnlock.isFeatureUnlocked('building-farm')).toBe(true);
    });

    test('should unlock on tutorial complete', () => {
      const gameState = { tutorialCompleted: true };
      const unlocked = featureUnlock.checkUnlocks(gameState);

      expect(unlocked).toContain('survival-buildings');
      expect(featureUnlock.isFeatureUnlocked('survival-buildings')).toBe(true);
    });
  });

  describe('Tier-Based Unlocks', () => {
    test('should unlock PERMANENT tier features', () => {
      const gameState = { currentTier: 'PERMANENT' };
      const unlocked = featureUnlock.checkUnlocks(gameState);

      expect(unlocked).toContain('permanent-buildings');
      expect(featureUnlock.isFeatureUnlocked('permanent-buildings')).toBe(true);
    });

    test('should unlock TOWN tier features', () => {
      const gameState = { currentTier: 'TOWN' };
      const unlocked = featureUnlock.checkUnlocks(gameState);

      expect(unlocked).toContain('town-buildings');
      expect(featureUnlock.isFeatureUnlocked('town-buildings')).toBe(true);
    });

    test('should unlock CASTLE tier features', () => {
      const gameState = { currentTier: 'CASTLE' };
      const unlocked = featureUnlock.checkUnlocks(gameState);

      expect(unlocked).toContain('castle-buildings');
      expect(featureUnlock.isFeatureUnlocked('castle-buildings')).toBe(true);
    });

    test('should unlock features for higher tiers', () => {
      // If player is at CASTLE tier, they should have PERMANENT tier features
      const gameState = { currentTier: 'CASTLE' };
      featureUnlock.checkUnlocks(gameState);

      expect(featureUnlock.isFeatureUnlocked('permanent-buildings')).toBe(true);
      expect(featureUnlock.isFeatureUnlocked('town-buildings')).toBe(true);
    });
  });

  describe('Custom Unlock Conditions', () => {
    test('should unlock on custom condition', () => {
      featureUnlock.registerFeature({
        id: 'custom-test',
        name: 'Custom Test',
        description: 'Test custom unlock',
        unlockCondition: {
          type: 'custom',
          checkFn: (gameState) => gameState.customFlag === true
        }
      });

      const gameState = { customFlag: true };
      const unlocked = featureUnlock.checkUnlocks(gameState);

      expect(unlocked).toContain('custom-test');
    });

    test('should not unlock on false custom condition', () => {
      featureUnlock.registerFeature({
        id: 'custom-test',
        name: 'Custom Test',
        description: 'Test custom unlock',
        unlockCondition: {
          type: 'custom',
          checkFn: (gameState) => gameState.customFlag === true
        }
      });

      const gameState = { customFlag: false };
      const unlocked = featureUnlock.checkUnlocks(gameState);

      expect(unlocked).not.toContain('custom-test');
    });
  });

  describe('Feature Query Methods', () => {
    test('should get unlocked features', () => {
      featureUnlock.unlockFeature('building-campfire');
      featureUnlock.unlockFeature('building-farm');

      const unlocked = featureUnlock.getUnlockedFeatures();

      expect(unlocked.length).toBe(2);
      expect(unlocked.some(f => f.id === 'building-campfire')).toBe(true);
      expect(unlocked.some(f => f.id === 'building-farm')).toBe(true);
    });

    test('should get locked features', () => {
      featureUnlock.unlockFeature('building-campfire');

      const locked = featureUnlock.getLockedFeatures();

      expect(locked.some(f => f.id === 'building-campfire')).toBe(false);
      expect(locked.length).toBeGreaterThan(0);
    });

    test('should check if feature is unlocked', () => {
      featureUnlock.unlockFeature('building-campfire');

      expect(featureUnlock.isFeatureUnlocked('building-campfire')).toBe(true);
      expect(featureUnlock.isFeatureUnlocked('building-farm')).toBe(false);
    });
  });

  describe('Enable/Disable System', () => {
    test('should unlock all features when disabled', () => {
      featureUnlock.disable();

      expect(featureUnlock.enabled).toBe(false);
      expect(featureUnlock.isFeatureUnlocked('building-campfire')).toBe(true);
      expect(featureUnlock.isFeatureUnlocked('building-farm')).toBe(true);
    });

    test('should re-enable progressive unlock', () => {
      featureUnlock.disable();
      featureUnlock.enable();

      expect(featureUnlock.enabled).toBe(true);
    });

    test('should return empty array when disabled', () => {
      featureUnlock.disable();

      const gameState = { tutorialStarted: true };
      const unlocked = featureUnlock.checkUnlocks(gameState);

      expect(unlocked.length).toBe(0);
    });
  });

  describe('Reset Functionality', () => {
    test('should reset all unlocks', () => {
      featureUnlock.unlockFeature('building-campfire');
      featureUnlock.unlockFeature('building-farm');

      featureUnlock.reset();

      expect(featureUnlock.unlockedFeatures.size).toBe(0);
      expect(featureUnlock.isFeatureUnlocked('building-campfire')).toBe(false);
    });

    test('should reset feature unlock status', () => {
      featureUnlock.unlockFeature('building-campfire');

      const feature = featureUnlock.features.get('building-campfire');
      expect(feature.isUnlocked).toBe(true);

      featureUnlock.reset();

      expect(feature.isUnlocked).toBe(false);
    });
  });

  describe('Event Listeners', () => {
    test('should notify listeners on feature unlock', () => {
      const mockListener = jest.fn();
      featureUnlock.onFeatureUnlock(mockListener);

      featureUnlock.unlockFeature('building-campfire');

      expect(mockListener).toHaveBeenCalled();
      const feature = mockListener.mock.calls[0][0];
      expect(feature.id).toBe('building-campfire');
    });

    test('should remove listeners', () => {
      const mockListener = jest.fn();
      featureUnlock.onFeatureUnlock(mockListener);
      featureUnlock.removeFeatureUnlockListener(mockListener);

      featureUnlock.unlockFeature('building-campfire');

      expect(mockListener).not.toHaveBeenCalled();
    });

    test('should handle listener errors gracefully', () => {
      const errorListener = jest.fn(() => {
        throw new Error('Test error');
      });

      featureUnlock.onFeatureUnlock(errorListener);

      // Should not throw
      expect(() => featureUnlock.unlockFeature('building-campfire')).not.toThrow();
    });
  });

  describe('Serialization', () => {
    test('should serialize state', () => {
      featureUnlock.unlockFeature('building-campfire');
      featureUnlock.unlockFeature('building-farm');

      const serialized = featureUnlock.serialize();

      expect(serialized.enabled).toBe(true);
      expect(serialized.unlockedFeatures).toContain('building-campfire');
      expect(serialized.unlockedFeatures).toContain('building-farm');
    });

    test('should deserialize state', () => {
      const savedState = {
        enabled: true,
        unlockedFeatures: ['building-campfire', 'building-farm']
      };

      featureUnlock.deserialize(savedState);

      expect(featureUnlock.enabled).toBe(true);
      expect(featureUnlock.isFeatureUnlocked('building-campfire')).toBe(true);
      expect(featureUnlock.isFeatureUnlocked('building-farm')).toBe(true);
    });

    test('should handle missing data in deserialize', () => {
      expect(() => featureUnlock.deserialize(null)).not.toThrow();
      expect(() => featureUnlock.deserialize({})).not.toThrow();
    });

    test('should update feature unlock status on deserialize', () => {
      const savedState = {
        enabled: true,
        unlockedFeatures: ['building-campfire']
      };

      featureUnlock.deserialize(savedState);

      const feature = featureUnlock.features.get('building-campfire');
      expect(feature.isUnlocked).toBe(true);
    });
  });

  describe('Tier Comparison', () => {
    test('should correctly compare tier order', () => {
      const gameState1 = { currentTier: 'TOWN' };
      featureUnlock.checkUnlocks(gameState1);

      // TOWN tier should unlock PERMANENT tier features
      expect(featureUnlock.isFeatureUnlocked('permanent-buildings')).toBe(true);
    });

    test('should not unlock higher tier features', () => {
      const gameState = { currentTier: 'SURVIVAL' };
      featureUnlock.checkUnlocks(gameState);

      // SURVIVAL tier should not unlock PERMANENT tier features
      expect(featureUnlock.isFeatureUnlocked('permanent-buildings')).toBe(false);
    });
  });

  describe('Idempotency', () => {
    test('should not re-unlock already unlocked features', () => {
      const gameState = { tutorialStarted: true };

      const unlocked1 = featureUnlock.checkUnlocks(gameState);
      expect(unlocked1.length).toBeGreaterThan(0);

      // Second check should return empty array
      const unlocked2 = featureUnlock.checkUnlocks(gameState);
      expect(unlocked2.length).toBe(0);
    });
  });
});
