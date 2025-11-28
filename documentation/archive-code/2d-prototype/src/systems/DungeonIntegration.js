/**
 * DungeonIntegration.js - Integrates dungeon system with game systems
 *
 * Connects:
 * - RoomLayoutGenerator for dungeon creation
 * - BossMonster for boss fights
 * - QuestManager for dungeon quests
 * - LootGenerator for rewards
 * - GameStore for player state
 */

import { RoomLayoutGenerator } from './RoomLayoutGenerator';
import { BossMonster } from '../entities/BossMonster';
import { BossAI } from './BossAI';
import useDungeonStore from '../stores/useDungeonStore';
import useGameStore from '../stores/useGameStore';

/**
 * Dungeon type to boss mapping
 */
const DUNGEON_BOSS_MAP = {
  CAVE: 'BROOD_MOTHER',
  CRYPT: 'NECROMANCER',
  RUINS: 'STONE_GOLEM'
};

/**
 * DungeonIntegration class
 */
export class DungeonIntegration {
  constructor(options = {}) {
    this.layoutGenerator = new RoomLayoutGenerator(options.seed);
    this.bossAI = new BossAI();
    this.activeBoss = null;
    this.activeMonsters = new Map();

    // Quest manager reference (injected)
    this.questManager = options.questManager || null;

    // Loot generator reference (injected)
    this.lootGenerator = options.lootGenerator || null;

    // Event listeners
    this.eventListeners = new Map();

    // Bind methods
    this._onBossDeath = this._onBossDeath.bind(this);
    this._onBossPhaseChange = this._onBossPhaseChange.bind(this);
  }

  /**
   * Start a new dungeon
   * @param {string} dungeonType - CAVE, CRYPT, or RUINS
   * @param {number} level - Dungeon difficulty level
   * @param {number} seed - Optional seed for generation
   * @returns {Object} Dungeon data
   */
  startDungeon(dungeonType = 'CAVE', level = 1, seed = null) {
    // Generate layout
    if (seed !== null) {
      this.layoutGenerator = new RoomLayoutGenerator(seed);
    }

    const layout = this.layoutGenerator.generate(dungeonType, level);

    // Populate rooms with enemies
    this._populateRooms(layout, dungeonType, level);

    // Start dungeon in store
    useDungeonStore.getState().startDungeon(
      dungeonType,
      level,
      layout,
      this.layoutGenerator.seed
    );

    // Emit event
    this._emit('dungeonStarted', {
      type: dungeonType,
      level,
      roomCount: layout.rooms.size
    });

    // Notify quest manager
    if (this.questManager) {
      this.questManager.onDungeonEntered?.(dungeonType, level);
    }

    return {
      layout,
      dungeonType,
      level
    };
  }

  /**
   * Populate rooms with enemies
   * @private
   */
  _populateRooms(layout, dungeonType, level) {
    this.activeMonsters.clear();

    for (const [roomId, room] of layout.rooms) {
      if (room.type === 'ENTRANCE') continue;

      if (room.type === 'BOSS') {
        // Create boss for boss room
        const bossType = DUNGEON_BOSS_MAP[dungeonType] || 'BROOD_MOTHER';
        this.activeBoss = new BossMonster(bossType, { x: 7, y: 3 }, { level });

        // Set up boss event listeners
        this.activeBoss.on('death', this._onBossDeath);
        this.activeBoss.on('phase:transition', this._onBossPhaseChange);

        room.bossId = this.activeBoss.id;
      } else if (room.type === 'CHAMBER' || room.type === 'CORRIDOR') {
        // Generate regular enemies
        const enemyCount = room.type === 'CHAMBER' ? 2 + Math.floor(level / 2) : 1;
        room.enemyIds = [];

        for (let i = 0; i < enemyCount; i++) {
          const enemy = this._createEnemy(dungeonType, level, i);
          this.activeMonsters.set(enemy.id, enemy);
          room.enemyIds.push(enemy.id);
        }
      }
    }
  }

  /**
   * Create an enemy for a room
   * @private
   */
  _createEnemy(dungeonType, level, index) {
    const enemyTypes = {
      CAVE: ['CAVE_SPIDER', 'CAVE_BAT', 'CAVE_TROLL'],
      CRYPT: ['ZOMBIE', 'SKELETON', 'WRAITH'],
      RUINS: ['GARGOYLE', 'CONSTRUCT', 'GUARDIAN']
    };

    const types = enemyTypes[dungeonType] || enemyTypes.CAVE;
    const type = types[index % types.length];

    // Base stats scaled by level
    const baseHealth = 30 + (level * 10);
    const baseDamage = 5 + (level * 2);

    return {
      id: `enemy_${Date.now()}_${index}`,
      type,
      name: type.replace('_', ' '),
      health: baseHealth,
      maxHealth: baseHealth,
      damage: baseDamage,
      xpReward: 10 + (level * 5),
      goldReward: 5 + (level * 3),
      color: this._getEnemyColor(type),
      alive: true
    };
  }

  /**
   * Get enemy color by type
   * @private
   */
  _getEnemyColor(type) {
    const colors = {
      CAVE_SPIDER: '#4a1942',
      CAVE_BAT: '#2d2d44',
      CAVE_TROLL: '#3d5a3d',
      ZOMBIE: '#4a5a4a',
      SKELETON: '#e8e8d8',
      WRAITH: '#5a4a6a',
      GARGOYLE: '#5a5a5a',
      CONSTRUCT: '#8a7a5a',
      GUARDIAN: '#4a5a8a'
    };
    return colors[type] || '#ef4444';
  }

  /**
   * Get enemies for a room
   * @param {string} roomId - Room ID
   * @returns {Array} Enemy data
   */
  getEnemiesForRoom(roomId) {
    const store = useDungeonStore.getState();
    const room = store.rooms.find(r => r.id === roomId);

    if (!room) return [];

    // Check if boss room
    if (room.type === 'BOSS' && this.activeBoss) {
      return []; // Boss handled separately
    }

    // Get regular enemies
    if (room.enemyIds) {
      return room.enemyIds
        .map(id => this.activeMonsters.get(id))
        .filter(e => e && e.alive);
    }

    return [];
  }

  /**
   * Enter boss room
   * @param {string} roomId - Boss room ID
   */
  enterBossRoom(roomId) {
    if (!this.activeBoss) return;

    useDungeonStore.getState().startBossFight(this.activeBoss);

    this._emit('bossFightStarted', {
      bossType: this.activeBoss.bossType,
      bossName: this.activeBoss.name
    });
  }

  /**
   * Update boss AI
   * @param {number} deltaTime - Time since last update
   */
  updateBoss(deltaTime) {
    if (!this.activeBoss || !this.activeBoss.alive) return;

    const gameState = {
      player: useGameStore.getState().player
    };

    this.bossAI.update(this.activeBoss, gameState, deltaTime);

    // Sync boss state to store
    useDungeonStore.getState().updateBoss({
      health: this.activeBoss.health,
      healthPercent: this.activeBoss.getHealthPercent() * 100,
      phase: this.activeBoss.currentPhase,
      enraged: this.activeBoss.enraged
    });
  }

  /**
   * Handle boss death
   * @private
   */
  _onBossDeath(event) {
    this._emit('bossDefeated', {
      bossType: event.bossType,
      xpReward: event.xpReward,
      goldReward: event.goldReward,
      loot: event.guaranteedDrops
    });

    // Notify quest manager
    if (this.questManager) {
      this.questManager.onBossDefeated?.(event.bossType);
    }

    // Generate loot
    const loot = this._generateBossLoot(event);

    // Update store
    useDungeonStore.getState().defeatBoss(
      loot,
      event.xpReward,
      Array.isArray(event.goldReward)
        ? Math.floor(Math.random() * (event.goldReward[1] - event.goldReward[0])) + event.goldReward[0]
        : event.goldReward
    );

    // Grant XP to player
    useGameStore.getState().addXP?.(event.xpReward);

    this.activeBoss = null;
  }

  /**
   * Handle boss phase change
   * @private
   */
  _onBossPhaseChange(event) {
    this._emit('bossPhaseChanged', {
      oldPhase: event.oldPhase,
      newPhase: event.newPhase,
      phaseName: event.phaseName
    });
  }

  /**
   * Generate boss loot
   * @private
   */
  _generateBossLoot(event) {
    const loot = [];

    // Guaranteed drops
    if (event.guaranteedDrops) {
      event.guaranteedDrops.forEach((drop, i) => {
        loot.push({
          id: `boss_loot_${Date.now()}_${i}`,
          name: drop,
          type: 'equipment',
          rarity: 'epic'
        });
      });
    }

    // Random loot from loot generator
    if (this.lootGenerator && event.lootTable) {
      const randomLoot = this.lootGenerator.generateFromTable?.(event.lootTable) || [];
      loot.push(...randomLoot);
    }

    return loot;
  }

  /**
   * End dungeon run
   * @param {boolean} success - Whether dungeon was cleared
   * @returns {Object} Run results
   */
  endDungeon(success = false) {
    const result = useDungeonStore.getState().endDungeon(success);

    // Clean up
    this.activeBoss = null;
    this.activeMonsters.clear();

    // Notify quest manager
    if (this.questManager) {
      if (success) {
        this.questManager.onDungeonCleared?.(result.dungeonType, result.dungeonLevel);
      } else {
        this.questManager.onDungeonFailed?.(result.dungeonType);
      }
    }

    this._emit('dungeonEnded', result);

    return result;
  }

  /**
   * Save dungeon state
   * @returns {Object} Serialized state
   */
  save() {
    const store = useDungeonStore.getState();

    return {
      status: store.status,
      dungeonType: store.dungeonType,
      dungeonLevel: store.dungeonLevel,
      seed: store.seed,
      layout: store.layout,
      rooms: store.rooms,
      currentRoomId: store.currentRoomId,
      boss: this.activeBoss?.toJSON() || null,
      monsters: Array.from(this.activeMonsters.entries()),
      loot: store.loot,
      goldCollected: store.goldCollected,
      xpGained: store.xpGained,
      roomsExplored: store.roomsExplored,
      roomsCleared: store.roomsCleared
    };
  }

  /**
   * Load dungeon state
   * @param {Object} data - Saved state
   */
  load(data) {
    if (!data || data.status === 'INACTIVE') return;

    // Restore store state
    useDungeonStore.setState({
      status: data.status,
      dungeonType: data.dungeonType,
      dungeonLevel: data.dungeonLevel,
      seed: data.seed,
      layout: data.layout,
      rooms: data.rooms,
      currentRoomId: data.currentRoomId,
      loot: data.loot || [],
      goldCollected: data.goldCollected || 0,
      xpGained: data.xpGained || 0,
      roomsExplored: data.roomsExplored || 0,
      roomsCleared: data.roomsCleared || 0,
      roomsTotal: data.rooms?.length || 0
    });

    // Restore boss
    if (data.boss) {
      this.activeBoss = BossMonster.fromJSON(data.boss);
      this.activeBoss.on('death', this._onBossDeath);
      this.activeBoss.on('phase:transition', this._onBossPhaseChange);
    }

    // Restore monsters
    if (data.monsters) {
      this.activeMonsters = new Map(data.monsters);
    }
  }

  /**
   * Add event listener
   */
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event).add(callback);
  }

  /**
   * Remove event listener
   */
  off(event, callback) {
    this.eventListeners.get(event)?.delete(callback);
  }

  /**
   * Emit event
   * @private
   */
  _emit(event, data) {
    this.eventListeners.get(event)?.forEach(cb => cb(data));
  }
}

export default DungeonIntegration;
