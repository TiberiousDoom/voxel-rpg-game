import {
  getDaylightFactor,
  getAmbientIntensity,
  getDirectionalIntensity,
  getSunPosition,
  getSkyColor,
  getAmbientColor,
  getLightingState,
} from '../DayNightLighting';

import {
  LIGHT_AMBIENT_NIGHT,
  LIGHT_AMBIENT_DAY,
  LIGHT_DIRECTIONAL_NIGHT,
  LIGHT_DIRECTIONAL_DAY,
} from '../../../data/tuning';

describe('DayNightLighting', () => {
  describe('getDaylightFactor', () => {
    test('midnight returns 0', () => {
      expect(getDaylightFactor(0)).toBe(0);
    });

    test('noon returns 1', () => {
      expect(getDaylightFactor(0.5)).toBe(1);
    });

    test('deep night returns 0', () => {
      expect(getDaylightFactor(0.1)).toBe(0);
      expect(getDaylightFactor(0.9)).toBe(0);
    });

    test('sunrise midpoint returns ~0.5', () => {
      const mid = (0.20 + 0.30) / 2; // 0.25
      const factor = getDaylightFactor(mid);
      expect(factor).toBeGreaterThan(0.3);
      expect(factor).toBeLessThan(0.7);
    });

    test('sunset midpoint returns ~0.5', () => {
      const mid = (0.70 + 0.80) / 2; // 0.75
      const factor = getDaylightFactor(mid);
      expect(factor).toBeGreaterThan(0.3);
      expect(factor).toBeLessThan(0.7);
    });

    test('after sunrise end returns 1', () => {
      expect(getDaylightFactor(0.35)).toBe(1);
    });

    test('before sunset start returns 1', () => {
      expect(getDaylightFactor(0.65)).toBe(1);
    });

    test('transitions are monotonic during sunrise', () => {
      let prev = 0;
      for (let t = 0.20; t <= 0.30; t += 0.01) {
        const f = getDaylightFactor(t);
        expect(f).toBeGreaterThanOrEqual(prev - 0.001); // allow tiny float error
        prev = f;
      }
    });

    test('transitions are monotonic during sunset', () => {
      let prev = 1;
      for (let t = 0.70; t <= 0.80; t += 0.01) {
        const f = getDaylightFactor(t);
        expect(f).toBeLessThanOrEqual(prev + 0.001);
        prev = f;
      }
    });
  });

  describe('getAmbientIntensity', () => {
    test('noon returns max ambient', () => {
      expect(getAmbientIntensity(0.5)).toBeCloseTo(LIGHT_AMBIENT_DAY, 2);
    });

    test('midnight returns min ambient', () => {
      expect(getAmbientIntensity(0)).toBeCloseTo(LIGHT_AMBIENT_NIGHT, 2);
    });

    test('sunrise is between min and max', () => {
      const val = getAmbientIntensity(0.25);
      expect(val).toBeGreaterThan(LIGHT_AMBIENT_NIGHT);
      expect(val).toBeLessThan(LIGHT_AMBIENT_DAY);
    });
  });

  describe('getDirectionalIntensity', () => {
    test('noon returns max directional', () => {
      expect(getDirectionalIntensity(0.5)).toBeCloseTo(LIGHT_DIRECTIONAL_DAY, 2);
    });

    test('midnight returns min directional', () => {
      expect(getDirectionalIntensity(0)).toBeCloseTo(LIGHT_DIRECTIONAL_NIGHT, 2);
    });
  });

  describe('getSunPosition', () => {
    test('noon sun is high', () => {
      const pos = getSunPosition(0.5);
      expect(pos.y).toBeGreaterThan(30);
    });

    test('midnight sun is low or below horizon', () => {
      const pos = getSunPosition(0);
      expect(pos.y).toBeLessThanOrEqual(0);
    });

    test('sunrise sun is near horizon', () => {
      const pos = getSunPosition(0.20);
      expect(pos.y).toBeLessThan(10);
    });
  });

  describe('getSkyColor', () => {
    test('noon is sky blue', () => {
      expect(getSkyColor(0.5)).toBe('#87ceeb');
    });

    test('midnight is dark', () => {
      expect(getSkyColor(0)).toBe('#0a0a2e');
    });

    test('returns valid hex for all times', () => {
      for (let t = 0; t <= 1; t += 0.05) {
        const color = getSkyColor(t);
        expect(color).toMatch(/^#[0-9a-f]{6}$/);
      }
    });
  });

  describe('getAmbientColor', () => {
    test('noon is white', () => {
      expect(getAmbientColor(0.5)).toBe('#ffffff');
    });

    test('night is cool blue', () => {
      expect(getAmbientColor(0)).toBe('#334466');
    });
  });

  describe('getLightingState', () => {
    test('returns all fields', () => {
      const state = getLightingState(0.5);
      expect(state).toHaveProperty('ambientIntensity');
      expect(state).toHaveProperty('ambientColor');
      expect(state).toHaveProperty('directionalIntensity');
      expect(state).toHaveProperty('sunPosition');
      expect(state).toHaveProperty('skyColor');
      expect(state).toHaveProperty('fogColor');
      expect(state).toHaveProperty('daylightFactor');
    });

    test('weather modifier applies correctly (external)', () => {
      const state = getLightingState(0.5); // noon
      const weatherMod = 0.5; // storm
      const effective = state.ambientIntensity * weatherMod;
      expect(effective).toBeCloseTo(LIGHT_AMBIENT_DAY * 0.5, 2);
    });
  });
});
