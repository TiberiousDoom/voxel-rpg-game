/**
 * EndlessMode.js
 * Escalating wave-based survival after main game completion
 */

class EndlessMode {
  constructor() {
    this.active = false;
    this.currentWave = 0;
    this.waveTimer = 0;
    this.waveCooldown = 600; // 10 minutes between waves (in seconds)
    this.score = 0;
    this.stats = {
      totalKills: 0,
      maxWave: 0,
      buildingsBuilt: 0,
      npcsAlive: 0,
      survivalTime: 0,
    };
    this.startTime = 0;
  }

  /**
   * Activate endless mode
   */
  activate() {
    this.active = true;
    this.currentWave = 0;
    this.waveTimer = this.waveCooldown;
    this.score = 0;
    this.startTime = Date.now();
    this.stats = {
      totalKills: 0,
      maxWave: 0,
      buildingsBuilt: 0,
      npcsAlive: 0,
      survivalTime: 0,
    };
  }

  /**
   * Update endless mode each tick
   * @param {number} deltaTime - Time since last update in seconds
   * @param {Object} gameState - Current game state snapshot
   * @returns {Object|null} Wave event if a new wave starts, null otherwise
   */
  update(deltaTime, gameState = {}) {
    if (!this.active) return null;

    this.stats.survivalTime = (Date.now() - this.startTime) / 1000;
    this.stats.npcsAlive = gameState.npcCount || 0;
    this.stats.buildingsBuilt = gameState.buildingCount || 0;

    this.waveTimer -= deltaTime;

    if (this.waveTimer <= 0) {
      return this._startNextWave();
    }

    return null;
  }

  /**
   * Start the next wave
   * @private
   * @returns {Object} Wave configuration
   */
  _startNextWave() {
    this.currentWave++;
    this.stats.maxWave = Math.max(this.stats.maxWave, this.currentWave);

    // Reset wave timer (slightly faster each wave)
    this.waveTimer = Math.max(180, this.waveCooldown - this.currentWave * 10);

    const isBossWave = this.currentWave % 5 === 0;
    const enemyCount = Math.floor(5 + this.currentWave * 2);
    const statMultiplier = 1 + this.currentWave * 0.05;

    // New enemy tiers at milestones
    let enemyTier = 'BASIC';
    if (this.currentWave >= 30) enemyTier = 'ELITE';
    else if (this.currentWave >= 20) enemyTier = 'VETERAN';
    else if (this.currentWave >= 10) enemyTier = 'ADVANCED';

    return {
      wave: this.currentWave,
      enemyCount,
      statMultiplier,
      enemyTier,
      isBossWave,
      bossId: isBossWave ? this._getBossForWave(this.currentWave) : null,
    };
  }

  /**
   * Get boss ID for a boss wave
   * @private
   */
  _getBossForWave(wave) {
    const bosses = ['goblin_king', 'dragon_lord', 'lich_king', 'frost_giant', 'storm_serpent'];
    const index = Math.floor((wave / 5 - 1) % bosses.length);
    return bosses[index];
  }

  /**
   * Record an enemy kill
   * @param {number} xpValue - XP value of the killed enemy
   */
  recordKill(xpValue = 0) {
    this.stats.totalKills++;
    this.score += 10 + Math.floor(xpValue * 0.5);
  }

  /**
   * Calculate final composite score
   * @returns {Object} Score breakdown
   */
  calculateFinalScore() {
    const timeBonus = Math.floor(this.stats.survivalTime / 60) * 50;
    const killBonus = this.stats.totalKills * 10;
    const waveBonus = this.stats.maxWave * 100;
    const buildingBonus = this.stats.buildingsBuilt * 25;
    const npcBonus = this.stats.npcsAlive * 50;

    const total = timeBonus + killBonus + waveBonus + buildingBonus + npcBonus;

    return {
      timeBonus,
      killBonus,
      waveBonus,
      buildingBonus,
      npcBonus,
      total,
      stats: { ...this.stats },
    };
  }

  /**
   * Get time until next wave
   * @returns {number} Seconds remaining
   */
  getTimeUntilNextWave() {
    return Math.max(0, Math.ceil(this.waveTimer));
  }

  /**
   * Get current status for HUD display
   */
  getStatus() {
    return {
      active: this.active,
      wave: this.currentWave,
      score: this.score,
      timeUntilNextWave: this.getTimeUntilNextWave(),
      stats: { ...this.stats },
    };
  }

  /**
   * End endless mode (settlement fell)
   * @returns {Object} Final score breakdown
   */
  end() {
    this.active = false;
    return this.calculateFinalScore();
  }

  /**
   * Reset
   */
  reset() {
    this.active = false;
    this.currentWave = 0;
    this.waveTimer = 0;
    this.score = 0;
    this.startTime = 0;
    this.stats = {
      totalKills: 0,
      maxWave: 0,
      buildingsBuilt: 0,
      npcsAlive: 0,
      survivalTime: 0,
    };
  }
}

export default EndlessMode;
