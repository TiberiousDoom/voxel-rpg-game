/**
 * RaidEventManager.js - Manage raid events on settlement
 */
import EventEmitter from 'events';

class RaidEventManager extends EventEmitter {
  constructor(npcManager) {
    super();
    this.npcManager = npcManager;

    this.activeRaid = null;
    this.raidHistory = [];
    this.nextRaidTime = null;
    this.raidIntervalBase = 600000; // 10 minutes
  }

  /**
   * Schedule next raid event
   * @param {number} customInterval - Optional custom interval in ms
   */
  scheduleNextRaid(customInterval = null) {
    const variance = Math.random() * 0.3 + 0.85; // 85-115% of base
    const interval = customInterval || Math.floor(this.raidIntervalBase * variance);
    this.nextRaidTime = Date.now() + interval;

    this.emit('raid:scheduled', {
      time: this.nextRaidTime,
      interval
    });

    return { nextRaidTime: this.nextRaidTime, interval };
  }

  /**
   * Check if raid should trigger
   * @returns {boolean} Should trigger
   */
  shouldTriggerRaid() {
    if (this.activeRaid) return false;
    if (!this.nextRaidTime) return false;

    return Date.now() >= this.nextRaidTime;
  }

  /**
   * Start raid event
   * @param {Object} config - Raid configuration
   * @returns {Object} Result { success, raid }
   */
  startRaid(config = {}) {
    if (this.activeRaid) {
      return { success: false, error: 'Raid already active' };
    }

    const difficulty = config.difficulty || this._calculateRaidDifficulty();
    const raidType = config.type || this._selectRaidType(difficulty);

    this.activeRaid = {
      id: `raid_${Date.now()}`,
      type: raidType,
      difficulty,
      startTime: Date.now(),
      endTime: null,
      status: 'active',
      waves: this._generateWaves(raidType, difficulty),
      currentWave: 0,
      enemiesSpawned: [],
      enemiesKilled: 0,
      damageToSettlement: 0,
      defendersKilled: []
    };

    this.emit('raid:started', {
      raidId: this.activeRaid.id,
      raid: this.activeRaid
    });

    return {
      success: true,
      raid: this.activeRaid
    };
  }

  /**
   * Spawn next wave
   * @returns {Object} Wave data
   */
  spawnNextWave() {
    if (!this.activeRaid) {
      return { success: false, error: 'No active raid' };
    }

    if (this.activeRaid.currentWave >= this.activeRaid.waves.length) {
      return { success: false, error: 'No more waves' };
    }

    const wave = this.activeRaid.waves[this.activeRaid.currentWave];
    const enemies = [];

    // Spawn enemies from wave definition
    for (const enemyDef of wave.enemies) {
      const enemy = this._createEnemy(
        enemyDef.type,
        enemyDef.level,
        wave.spawnPosition
      );
      enemies.push(enemy);
      this.activeRaid.enemiesSpawned.push(enemy);
    }

    this.activeRaid.currentWave++;

    this.emit('raid:waveSpawned', {
      waveNumber: this.activeRaid.currentWave,
      enemies
    });

    return {
      success: true,
      wave,
      enemies
    };
  }

  /**
   * Update raid statistics
   * @param {Object} updates - Stat updates
   */
  updateRaidStats(updates) {
    if (!this.activeRaid) return;

    Object.assign(this.activeRaid, updates);
  }

  /**
   * Complete raid (victory)
   * @returns {Object} Result
   */
  completeRaid() {
    if (!this.activeRaid) {
      return { success: false, error: 'No active raid' };
    }

    this.activeRaid.endTime = Date.now();
    this.activeRaid.status = 'victory';

    const rewards = this._calculateRewards();

    // Save to history
    this.raidHistory.push({ ...this.activeRaid, rewards });

    this.emit('raid:completed', {
      raidId: this.activeRaid.id,
      rewards
    });

    const completedRaid = this.activeRaid;
    this.activeRaid = null;
    this.scheduleNextRaid();

    return {
      success: true,
      raid: completedRaid,
      rewards
    };
  }

  /**
   * Fail raid (settlement overrun)
   * @returns {Object} Result
   */
  failRaid() {
    if (!this.activeRaid) {
      return { success: false, error: 'No active raid' };
    }

    this.activeRaid.endTime = Date.now();
    this.activeRaid.status = 'defeat';

    const penalties = this._calculatePenalties();

    // Save to history
    this.raidHistory.push({ ...this.activeRaid, penalties });

    this.emit('raid:failed', {
      raidId: this.activeRaid.id,
      penalties
    });

    const failedRaid = this.activeRaid;
    this.activeRaid = null;
    this.scheduleNextRaid();

    return {
      success: true,
      raid: failedRaid,
      penalties
    };
  }

  /**
   * Get active raid
   * @returns {Object|null} Active raid
   */
  getActiveRaid() {
    return this.activeRaid;
  }

  /**
   * Get raid history
   * @returns {Array} Past raids
   */
  getRaidHistory() {
    return [...this.raidHistory];
  }

  /**
   * Get raid statistics
   * @returns {Object} Statistics
   */
  getStatistics() {
    const stats = {
      totalRaids: this.raidHistory.length,
      victories: 0,
      defeats: 0,
      totalEnemiesKilled: 0,
      totalDamageToSettlement: 0,
      totalDefendersKilled: 0
    };

    for (const raid of this.raidHistory) {
      if (raid.status === 'victory') stats.victories++;
      if (raid.status === 'defeat') stats.defeats++;

      stats.totalEnemiesKilled += raid.enemiesKilled || 0;
      stats.totalDamageToSettlement += raid.damageToSettlement || 0;
      stats.totalDefendersKilled += raid.defendersKilled?.length || 0;
    }

    return stats;
  }

  /**
   * Calculate raid difficulty based on settlement progress
   * @private
   * @returns {number} Difficulty (1-10)
   */
  _calculateRaidDifficulty() {
    const population = this.npcManager.getAllNPCs?.().length || 5;

    // Scale difficulty with population
    const baseDifficulty = Math.floor(population / 5) + 1;

    return Math.min(baseDifficulty, 10);
  }

  /**
   * Select raid type based on difficulty
   * @private
   * @returns {string} Raid type
   */
  _selectRaidType(difficulty) {
    if (difficulty <= 2) return 'goblin_raid';
    if (difficulty <= 4) return 'orc_raid';
    if (difficulty <= 6) return 'undead_raid';
    if (difficulty <= 8) return 'troll_raid';
    return 'dragon_assault';
  }

  /**
   * Generate waves for raid
   * @private
   */
  _generateWaves(raidType, difficulty) {
    const waveCount = Math.min(2 + difficulty, 5);
    const waves = [];

    for (let i = 0; i < waveCount; i++) {
      const enemyCount = Math.min(3 + i + difficulty, 10);
      const enemies = [];

      for (let j = 0; j < enemyCount; j++) {
        enemies.push({
          type: this._getEnemyType(raidType),
          level: difficulty + Math.floor(i / 2)
        });
      }

      waves.push({
        number: i + 1,
        enemies,
        spawnPosition: { x: 0, y: 0, z: 0 },
        delay: i * 15000 // 15 seconds between waves
      });
    }

    return waves;
  }

  /**
   * Get enemy type from raid type
   * @private
   */
  _getEnemyType(raidType) {
    const typeMap = {
      'goblin_raid': 'goblin',
      'orc_raid': 'orc',
      'undead_raid': 'skeleton',
      'troll_raid': 'troll',
      'dragon_assault': 'dragon'
    };

    return typeMap[raidType] || 'goblin';
  }

  /**
   * Create enemy instance
   * @private
   */
  _createEnemy(type, level, position) {
    const baseHealth = 50 + (level * 20);
    const baseDamage = 5 + (level * 3);

    return {
      id: `enemy_${Date.now()}_${Math.random()}`,
      type,
      level,
      health: {
        current: baseHealth,
        max: baseHealth
      },
      damage: baseDamage,
      defense: level,
      speed: 2 + Math.random(),
      position: { ...position },
      alive: true
    };
  }

  /**
   * Calculate rewards for victory
   * @private
   */
  _calculateRewards() {
    if (!this.activeRaid) return {};

    const difficulty = this.activeRaid.difficulty;
    const enemiesKilled = this.activeRaid.enemiesKilled;

    return {
      gold: (50 + difficulty * 20) + (enemiesKilled * 5),
      xp: (100 + difficulty * 50) + (enemiesKilled * 10),
      items: difficulty >= 3 ? Math.floor(difficulty / 2) : 0
    };
  }

  /**
   * Calculate penalties for defeat
   * @private
   */
  _calculatePenalties() {
    if (!this.activeRaid) return {};

    const damage = this.activeRaid.damageToSettlement;

    return {
      resourceLoss: Math.floor(damage * 0.1), // 10% of damage as resource loss
      buildingDamage: damage > 100 ? 1 : 0, // Buildings damaged if high damage
      moraleDebuff: 0.1 // 10% morale penalty
    };
  }
}

export default RaidEventManager;
