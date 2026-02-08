/**
 * TimeManager.js — World time system
 *
 * Tracks in-game time as a continuous float. All time-dependent systems
 * (lighting, hunger, spawning, shelter) read from TimeManager.
 *
 * One in-game day = DAY_LENGTH_SECONDS real seconds (default 1200 = 20 min).
 * timeOfDay cycles 0.0 → 1.0 (0 = midnight, 0.25 = sunrise, 0.5 = noon, 0.75 = sunset).
 */

import {
  DAY_LENGTH_SECONDS,
  SUNRISE_START,
  SUNRISE_END,
  SUNSET_START,
  SUNSET_END,
} from '../../data/tuning.js';

export class TimeManager {
  /**
   * @param {number} [initialWorldTime=0] - Starting world time in seconds (for save/load)
   */
  constructor(initialWorldTime = 0) {
    /** Total elapsed world time in seconds */
    this.worldTime = initialWorldTime;

    /** Debug time scale multiplier (1 = normal, 0 = paused) */
    this.timeScale = 1;

    /** Whether time is paused (menu, cutscene, etc.) */
    this.paused = false;

    /** Cached day length — read from tuning but can be overridden for tests */
    this._dayLength = DAY_LENGTH_SECONDS;
  }

  /**
   * Advance world time by deltaSeconds (real time).
   * @param {number} deltaSeconds - Real elapsed seconds since last update
   */
  update(deltaSeconds) {
    if (this.paused || this.timeScale === 0) return;
    this.worldTime += deltaSeconds * this.timeScale;
  }

  /**
   * Time of day as 0.0–1.0 (0 = midnight, 0.5 = noon).
   * @returns {number}
   */
  get timeOfDay() {
    const dayProgress = (this.worldTime % this._dayLength) / this._dayLength;
    return dayProgress;
  }

  /**
   * Current in-game day number (starts at 1).
   * @returns {number}
   */
  get dayNumber() {
    return Math.floor(this.worldTime / this._dayLength) + 1;
  }

  /**
   * Current in-game hour (0-23).
   * @returns {number}
   */
  get hour() {
    return Math.floor(this.timeOfDay * 24);
  }

  /**
   * Current in-game minute (0-59).
   * @returns {number}
   */
  get minute() {
    return Math.floor((this.timeOfDay * 24 * 60) % 60);
  }

  /**
   * Whether it is currently night (between sunset end and sunrise start).
   * @returns {boolean}
   */
  get isNight() {
    const t = this.timeOfDay;
    return t >= SUNSET_END || t < SUNRISE_START;
  }

  /**
   * Whether it is currently dusk (sunset transition).
   * @returns {boolean}
   */
  get isDusk() {
    const t = this.timeOfDay;
    return t >= SUNSET_START && t < SUNSET_END;
  }

  /**
   * Whether it is currently dawn (sunrise transition).
   * @returns {boolean}
   */
  get isDawn() {
    const t = this.timeOfDay;
    return t >= SUNRISE_START && t < SUNRISE_END;
  }

  /**
   * Whether it is currently full daytime (between sunrise end and sunset start).
   * @returns {boolean}
   */
  get isDay() {
    const t = this.timeOfDay;
    return t >= SUNRISE_END && t < SUNSET_START;
  }

  /**
   * Get the current time period as a string.
   * @returns {'night'|'dawn'|'day'|'dusk'}
   */
  get period() {
    if (this.isDawn) return 'dawn';
    if (this.isDay) return 'day';
    if (this.isDusk) return 'dusk';
    return 'night';
  }

  /**
   * Set time of day directly (for debug). Value 0.0–1.0.
   * @param {number} tod - Target time of day
   */
  setTimeOfDay(tod) {
    const currentDay = Math.floor(this.worldTime / this._dayLength);
    this.worldTime = (currentDay + tod) * this._dayLength;
  }

  /**
   * Skip forward to the next occurrence of a time-of-day value.
   * @param {number} targetTod - Target time of day (0.0–1.0)
   */
  skipTo(targetTod) {
    const current = this.timeOfDay;
    const advance = targetTod > current
      ? targetTod - current
      : (1.0 - current) + targetTod;
    this.worldTime += advance * this._dayLength;
  }

  /**
   * Serialize for save.
   * @returns {{ worldTime: number, timeScale: number }}
   */
  serialize() {
    return {
      worldTime: this.worldTime,
      timeScale: this.timeScale,
    };
  }

  /**
   * Restore from saved data.
   * @param {{ worldTime: number, timeScale?: number }} data
   */
  deserialize(data) {
    if (data && typeof data.worldTime === 'number') {
      this.worldTime = data.worldTime;
    }
    if (data && typeof data.timeScale === 'number') {
      this.timeScale = data.timeScale;
    }
  }
}
