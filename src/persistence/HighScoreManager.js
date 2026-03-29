/**
 * HighScoreManager.js
 * Stores and manages high scores per game mode in localStorage
 */

const STORAGE_KEY = 'voxel-rpg-highscores';
const MAX_SCORES_PER_MODE = 10;

class HighScoreManager {
  constructor() {
    this.scores = this._load();
  }

  /**
   * Load scores from localStorage
   * @private
   */
  _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {
      // Corrupted data, start fresh
    }
    return {};
  }

  /**
   * Save scores to localStorage
   * @private
   */
  _save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.scores));
    } catch {
      // Storage full or unavailable
    }
  }

  /**
   * Submit a new score
   * @param {string} mode - Game mode (e.g., 'ENDLESS', 'CHALLENGE_SPEED_RUN')
   * @param {Object} entry - Score entry
   * @param {number} entry.score - Numeric score
   * @param {string} entry.mode - Mode name
   * @param {number} entry.duration - Play time in seconds
   * @param {Object} entry.stats - Summary stats
   * @returns {{ rank: number|null, isHighScore: boolean }}
   */
  submitScore(mode, entry) {
    if (!this.scores[mode]) {
      this.scores[mode] = [];
    }

    const scoreEntry = {
      score: entry.score || 0,
      date: Date.now(),
      mode: entry.mode || mode,
      duration: entry.duration || 0,
      stats: entry.stats || {},
    };

    this.scores[mode].push(scoreEntry);
    this.scores[mode].sort((a, b) => b.score - a.score);
    this.scores[mode] = this.scores[mode].slice(0, MAX_SCORES_PER_MODE);

    this._save();

    const rank = this.scores[mode].findIndex(
      (s) => s.date === scoreEntry.date && s.score === scoreEntry.score
    );

    return {
      rank: rank >= 0 ? rank + 1 : null,
      isHighScore: rank >= 0,
    };
  }

  /**
   * Get scores for a specific mode
   * @param {string} mode
   * @returns {Array}
   */
  getScores(mode) {
    return (this.scores[mode] || []).map((entry, i) => ({
      ...entry,
      rank: i + 1,
    }));
  }

  /**
   * Get all modes that have scores
   * @returns {string[]}
   */
  getModesWithScores() {
    return Object.keys(this.scores).filter((mode) => this.scores[mode].length > 0);
  }

  /**
   * Get the top score for a mode
   * @param {string} mode
   * @returns {Object|null}
   */
  getTopScore(mode) {
    const scores = this.scores[mode];
    return scores && scores.length > 0 ? { ...scores[0], rank: 1 } : null;
  }

  /**
   * Clear scores for a specific mode
   * @param {string} mode
   */
  clearMode(mode) {
    delete this.scores[mode];
    this._save();
  }

  /**
   * Clear all scores
   */
  clearAll() {
    this.scores = {};
    this._save();
  }

  /**
   * Format duration for display
   * @param {number} seconds
   * @returns {string}
   */
  static formatDuration(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }
}

export default HighScoreManager;
