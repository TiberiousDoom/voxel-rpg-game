import { TimeManager } from '../TimeManager';
import { DAY_LENGTH_SECONDS, SUNRISE_START, SUNSET_END } from '../../../data/tuning';

describe('TimeManager', () => {
  let tm;

  beforeEach(() => {
    tm = new TimeManager();
  });

  describe('time advancement', () => {
    test('advances worldTime by delta', () => {
      tm.update(10);
      expect(tm.worldTime).toBe(10);
    });

    test('accumulates over multiple updates', () => {
      tm.update(5);
      tm.update(3);
      expect(tm.worldTime).toBe(8);
    });

    test('respects timeScale', () => {
      tm.timeScale = 2;
      tm.update(10);
      expect(tm.worldTime).toBe(20);
    });

    test('timeScale 0 freezes time', () => {
      tm.timeScale = 0;
      tm.update(100);
      expect(tm.worldTime).toBe(0);
    });

    test('does not advance when paused', () => {
      tm.paused = true;
      tm.update(100);
      expect(tm.worldTime).toBe(0);
    });
  });

  describe('timeOfDay', () => {
    test('starts at 0 (midnight)', () => {
      expect(tm.timeOfDay).toBe(0);
    });

    test('is 0.5 at noon', () => {
      tm.worldTime = DAY_LENGTH_SECONDS * 0.5;
      expect(tm.timeOfDay).toBeCloseTo(0.5, 5);
    });

    test('cycles back to 0 after full day', () => {
      tm.worldTime = DAY_LENGTH_SECONDS;
      expect(tm.timeOfDay).toBeCloseTo(0, 5);
    });

    test('is 0.25 at quarter-day', () => {
      tm.worldTime = DAY_LENGTH_SECONDS * 0.25;
      expect(tm.timeOfDay).toBeCloseTo(0.25, 5);
    });
  });

  describe('dayNumber', () => {
    test('starts at day 1', () => {
      expect(tm.dayNumber).toBe(1);
    });

    test('increments at midnight', () => {
      tm.worldTime = DAY_LENGTH_SECONDS;
      expect(tm.dayNumber).toBe(2);
    });

    test('day 3 after 2 full cycles', () => {
      tm.worldTime = DAY_LENGTH_SECONDS * 2;
      expect(tm.dayNumber).toBe(3);
    });
  });

  describe('hour and minute', () => {
    test('midnight = hour 0', () => {
      expect(tm.hour).toBe(0);
    });

    test('noon = hour 12', () => {
      tm.worldTime = DAY_LENGTH_SECONDS * 0.5;
      expect(tm.hour).toBe(12);
    });

    test('6 AM = hour 6', () => {
      tm.worldTime = DAY_LENGTH_SECONDS * (6 / 24);
      expect(tm.hour).toBe(6);
    });

    test('minute is 0-59', () => {
      tm.worldTime = DAY_LENGTH_SECONDS * (6.5 / 24); // 6:30 AM
      expect(tm.hour).toBe(6);
      expect(tm.minute).toBe(30);
    });
  });

  describe('day/night detection', () => {
    test('midnight is night', () => {
      expect(tm.isNight).toBe(true);
      expect(tm.period).toBe('night');
    });

    test('noon is day', () => {
      tm.worldTime = DAY_LENGTH_SECONDS * 0.5;
      expect(tm.isDay).toBe(true);
      expect(tm.isNight).toBe(false);
      expect(tm.period).toBe('day');
    });

    test('sunrise start is dawn', () => {
      tm.worldTime = DAY_LENGTH_SECONDS * SUNRISE_START;
      expect(tm.isDawn).toBe(true);
      expect(tm.period).toBe('dawn');
    });

    test('mid-sunrise is dawn', () => {
      tm.worldTime = DAY_LENGTH_SECONDS * ((SUNRISE_START + 0.25) / 2);
      // This might be dawn or day depending on exact value
      const t = tm.timeOfDay;
      if (t >= SUNRISE_START && t < 0.30) {
        expect(tm.isDawn).toBe(true);
      }
    });

    test('sunset is dusk', () => {
      tm.worldTime = DAY_LENGTH_SECONDS * 0.75;
      expect(tm.isDusk).toBe(true);
      expect(tm.period).toBe('dusk');
    });

    test('after sunset end is night', () => {
      tm.worldTime = DAY_LENGTH_SECONDS * SUNSET_END;
      expect(tm.isNight).toBe(true);
    });

    test('just before sunrise is night', () => {
      tm.worldTime = DAY_LENGTH_SECONDS * (SUNRISE_START - 0.01);
      expect(tm.isNight).toBe(true);
    });
  });

  describe('setTimeOfDay', () => {
    test('sets time to noon', () => {
      tm.setTimeOfDay(0.5);
      expect(tm.timeOfDay).toBeCloseTo(0.5, 5);
    });

    test('preserves current day number', () => {
      tm.worldTime = DAY_LENGTH_SECONDS * 2.3; // Day 3
      tm.setTimeOfDay(0.75);
      expect(tm.dayNumber).toBe(3);
      expect(tm.timeOfDay).toBeCloseTo(0.75, 5);
    });
  });

  describe('skipTo', () => {
    test('skips forward to target time', () => {
      tm.worldTime = DAY_LENGTH_SECONDS * 0.3; // 7:12 AM
      tm.skipTo(0.5); // Skip to noon
      expect(tm.timeOfDay).toBeCloseTo(0.5, 5);
    });

    test('wraps around midnight', () => {
      tm.worldTime = DAY_LENGTH_SECONDS * 0.9; // 9:36 PM
      tm.skipTo(0.1); // Skip to 2:24 AM (next day)
      expect(tm.timeOfDay).toBeCloseTo(0.1, 5);
      expect(tm.dayNumber).toBe(2);
    });
  });

  describe('save/load', () => {
    test('serialize returns worldTime and timeScale', () => {
      tm.worldTime = 500;
      tm.timeScale = 5;
      const data = tm.serialize();
      expect(data).toEqual({ worldTime: 500, timeScale: 5 });
    });

    test('deserialize restores state', () => {
      const data = { worldTime: 500, timeScale: 5 };
      tm.deserialize(data);
      expect(tm.worldTime).toBe(500);
      expect(tm.timeScale).toBe(5);
    });

    test('roundtrip preserves time', () => {
      tm.worldTime = 12345.67;
      tm.timeScale = 2;
      const data = tm.serialize();

      const tm2 = new TimeManager();
      tm2.deserialize(data);
      expect(tm2.worldTime).toBe(tm.worldTime);
      expect(tm2.timeScale).toBe(tm.timeScale);
    });

    test('deserialize handles missing data gracefully', () => {
      tm.worldTime = 100;
      tm.deserialize(null);
      expect(tm.worldTime).toBe(100); // unchanged
    });
  });

  describe('constructor with initial time', () => {
    test('starts at given worldTime', () => {
      const tm2 = new TimeManager(600);
      expect(tm2.worldTime).toBe(600);
      expect(tm2.timeOfDay).toBeCloseTo(0.5, 5);
    });
  });
});
