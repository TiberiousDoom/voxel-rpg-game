import {
  getHungerStatus,
  calculateHungerDrain,
  calculateStarvationDamage,
  getHungerSpeedModifier,
  getHealthRegenModifier,
  tickHunger,
  eatFood,
} from '../HungerSystem';

import {
  HUNGER_DRAIN_RATE,
  SPRINT_HUNGER_MULTIPLIER,
  HUNGER_WELL_FED,
  HUNGER_STARVING,
  HUNGER_MAX,
  STARVATION_DAMAGE_RATE,
  SHELTER_HUNGER_REDUCTION,
} from '../../../data/tuning';

describe('HungerSystem', () => {
  describe('getHungerStatus', () => {
    test('100 → well_fed', () => {
      expect(getHungerStatus(100)).toBe('well_fed');
    });

    test('60 → well_fed (at threshold)', () => {
      expect(getHungerStatus(HUNGER_WELL_FED)).toBe('well_fed');
    });

    test('59 → hungry (just below well_fed)', () => {
      expect(getHungerStatus(HUNGER_WELL_FED - 1)).toBe('hungry');
    });

    test('20 → hungry (at starving threshold)', () => {
      expect(getHungerStatus(HUNGER_STARVING)).toBe('hungry');
    });

    test('19 → starving', () => {
      expect(getHungerStatus(HUNGER_STARVING - 1)).toBe('starving');
    });

    test('0 → famished', () => {
      expect(getHungerStatus(0)).toBe('famished');
    });

    test('-1 → famished', () => {
      expect(getHungerStatus(-1)).toBe('famished');
    });
  });

  describe('calculateHungerDrain', () => {
    test('drains at base rate', () => {
      const drain = calculateHungerDrain(60); // 60 seconds
      expect(drain).toBeCloseTo(HUNGER_DRAIN_RATE * 60, 5);
    });

    test('sprinting doubles drain', () => {
      const normal = calculateHungerDrain(60);
      const sprint = calculateHungerDrain(60, { isSprinting: true });
      expect(sprint).toBeCloseTo(normal * SPRINT_HUNGER_MULTIPLIER, 5);
    });

    test('shelter reduces drain', () => {
      const normal = calculateHungerDrain(60);
      const sheltered = calculateHungerDrain(60, { isInShelter: true });
      expect(sheltered).toBeCloseTo(normal * (1 - SHELTER_HUNGER_REDUCTION), 5);
    });

    test('sprinting + shelter combines', () => {
      const drain = calculateHungerDrain(60, { isSprinting: true, isInShelter: true });
      const expected = HUNGER_DRAIN_RATE * SPRINT_HUNGER_MULTIPLIER * (1 - SHELTER_HUNGER_REDUCTION) * 60;
      expect(drain).toBeCloseTo(expected, 5);
    });

    test('zero delta = zero drain', () => {
      expect(calculateHungerDrain(0)).toBe(0);
    });
  });

  describe('calculateStarvationDamage', () => {
    test('no damage when hunger > 0', () => {
      expect(calculateStarvationDamage(10, 50)).toBe(0);
      expect(calculateStarvationDamage(10, 1)).toBe(0);
    });

    test('deals damage when hunger = 0', () => {
      const damage = calculateStarvationDamage(10, 0);
      expect(damage).toBeCloseTo(STARVATION_DAMAGE_RATE * 10, 5);
    });

    test('10 seconds at hunger 0 = 1 HP damage', () => {
      // STARVATION_DAMAGE_RATE = 0.1, so 10s = 1 HP
      const damage = calculateStarvationDamage(10, 0);
      expect(damage).toBeCloseTo(1, 5);
    });
  });

  describe('getHungerSpeedModifier', () => {
    test('normal speed when well fed', () => {
      expect(getHungerSpeedModifier(100)).toBe(1.0);
    });

    test('normal speed when hungry', () => {
      expect(getHungerSpeedModifier(40)).toBe(1.0);
    });

    test('slow when starving', () => {
      expect(getHungerSpeedModifier(10)).toBe(0.8);
    });
  });

  describe('getHealthRegenModifier', () => {
    test('full regen when well fed', () => {
      expect(getHealthRegenModifier(80)).toBe(1.0);
    });

    test('half regen when hungry', () => {
      expect(getHealthRegenModifier(40)).toBe(0.5);
    });

    test('no regen when starving', () => {
      expect(getHealthRegenModifier(10)).toBe(0);
    });
  });

  describe('tickHunger', () => {
    test('returns all expected fields', () => {
      const result = tickHunger(100, 1);
      expect(result).toHaveProperty('hunger');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('starvationDamage');
      expect(result).toHaveProperty('speedModifier');
      expect(result).toHaveProperty('healthRegenModifier');
    });

    test('hunger decreases over time', () => {
      const result = tickHunger(100, 60);
      expect(result.hunger).toBeLessThan(100);
      expect(result.hunger).toBeGreaterThan(0);
    });

    test('hunger never goes below 0', () => {
      const result = tickHunger(0.001, 1000);
      expect(result.hunger).toBe(0);
    });

    test('starvation damage when hunger reaches 0', () => {
      const result = tickHunger(0, 10);
      expect(result.starvationDamage).toBeGreaterThan(0);
      expect(result.status).toBe('famished');
    });

    test('no starvation damage when hunger > 0', () => {
      const result = tickHunger(50, 10);
      expect(result.starvationDamage).toBe(0);
    });
  });

  describe('eatFood', () => {
    test('restores hunger', () => {
      expect(eatFood(50, 20)).toBe(70);
    });

    test('clamps to max', () => {
      expect(eatFood(90, 20)).toBe(HUNGER_MAX);
    });

    test('eating at full hunger stays at max', () => {
      expect(eatFood(HUNGER_MAX, 10)).toBe(HUNGER_MAX);
    });
  });
});
