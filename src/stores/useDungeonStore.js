/**
 * useDungeonStore.js - Zustand store for dungeon exploration state
 *
 * Manages:
 * - Active dungeon layout
 * - Current room and player position
 * - Boss fight state
 * - Exploration progress
 * - Combat status
 */

import { create } from 'zustand';

/**
 * Dungeon exploration states
 */
const DUNGEON_STATES = {
  INACTIVE: 'INACTIVE',           // Not in a dungeon
  EXPLORING: 'EXPLORING',         // Moving between rooms
  IN_ROOM: 'IN_ROOM',            // Inside a room (may have enemies)
  COMBAT: 'COMBAT',              // Active combat
  BOSS_FIGHT: 'BOSS_FIGHT',      // Fighting a boss
  CLEARED: 'CLEARED',            // Dungeon completed
  FAILED: 'FAILED',              // Party wiped
  RETREATING: 'RETREATING'       // Leaving dungeon
};

/**
 * Initial state
 */
const initialState = {
  // Dungeon status
  status: DUNGEON_STATES.INACTIVE,

  // Dungeon info
  dungeonType: null,              // 'CAVE', 'CRYPT', 'RUINS'
  dungeonLevel: 1,
  seed: null,

  // Layout and rooms
  layout: null,                   // DungeonLayout instance data
  rooms: [],                      // Array of room data
  currentRoomId: null,
  previousRoomId: null,

  // Player position within dungeon
  playerPosition: { x: 0, y: 0 },
  playerFacing: 0,                // Radians

  // Boss state
  boss: null,                     // BossMonster instance data
  bossHealthPercent: 100,
  bossPhase: 0,
  bossEnraged: false,

  // Enemies in current room
  enemies: [],
  enemiesRemaining: 0,

  // Exploration progress
  roomsExplored: 0,
  roomsTotal: 0,
  roomsCleared: 0,

  // Loot collected
  loot: [],
  goldCollected: 0,
  xpGained: 0,

  // Combat stats
  damageDealt: 0,
  damageTaken: 0,
  abilitiesUsed: 0,

  // Timers
  dungeonStartTime: null,
  currentRoomEnterTime: null,
  bossStartTime: null,

  // UI state
  showMiniMap: true,
  showBossHealth: false,
  transitioningRoom: false,
  showLootPopup: false,
  pendingLoot: null
};

/**
 * Create the dungeon store
 */
const useDungeonStore = create((set, get) => ({
  ...initialState,

  // ============ Dungeon Lifecycle ============

  /**
   * Start a new dungeon
   */
  startDungeon: (dungeonType, level, layout, seed) => {
    const rooms = layout ? Array.from(layout.rooms.values()).map(r => r.toJSON ? r.toJSON() : r) : [];

    set({
      status: DUNGEON_STATES.EXPLORING,
      dungeonType,
      dungeonLevel: level,
      seed,
      layout: layout ? (layout.toJSON ? layout.toJSON() : layout) : null,
      rooms,
      currentRoomId: layout?.entranceRoomId || null,
      previousRoomId: null,
      roomsTotal: rooms.length,
      roomsExplored: 1,
      roomsCleared: 0,
      dungeonStartTime: Date.now(),
      currentRoomEnterTime: Date.now(),
      loot: [],
      goldCollected: 0,
      xpGained: 0,
      damageDealt: 0,
      damageTaken: 0,
      abilitiesUsed: 0,
      boss: null,
      enemies: [],
      showBossHealth: false
    });
  },

  /**
   * End the current dungeon
   */
  endDungeon: (success = true) => {
    const state = get();
    const result = {
      success,
      dungeonType: state.dungeonType,
      dungeonLevel: state.dungeonLevel,
      roomsExplored: state.roomsExplored,
      roomsCleared: state.roomsCleared,
      goldCollected: state.goldCollected,
      xpGained: state.xpGained,
      loot: [...state.loot],
      duration: Date.now() - (state.dungeonStartTime || Date.now()),
      damageDealt: state.damageDealt,
      damageTaken: state.damageTaken
    };

    set({
      ...initialState,
      status: success ? DUNGEON_STATES.CLEARED : DUNGEON_STATES.FAILED
    });

    return result;
  },

  /**
   * Reset dungeon state
   */
  resetDungeon: () => {
    set(initialState);
  },

  // ============ Room Navigation ============

  /**
   * Enter a room
   */
  enterRoom: (roomId, enemies = []) => {
    const state = get();
    const room = state.rooms.find(r => r.id === roomId);

    if (!room) return;

    const isBossRoom = room.type === 'BOSS';

    set({
      previousRoomId: state.currentRoomId,
      currentRoomId: roomId,
      currentRoomEnterTime: Date.now(),
      status: enemies.length > 0 ? DUNGEON_STATES.COMBAT : DUNGEON_STATES.IN_ROOM,
      enemies: enemies.map(e => e.toJSON ? e.toJSON() : e),
      enemiesRemaining: enemies.length,
      transitioningRoom: false,
      roomsExplored: state.roomsExplored + 1,
      showBossHealth: isBossRoom
    });
  },

  /**
   * Start room transition animation
   */
  startRoomTransition: () => {
    set({ transitioningRoom: true, status: DUNGEON_STATES.EXPLORING });
  },

  /**
   * Clear current room
   */
  clearRoom: () => {
    set(state => ({
      status: DUNGEON_STATES.IN_ROOM,
      enemies: [],
      enemiesRemaining: 0,
      roomsCleared: state.roomsCleared + 1
    }));
  },

  /**
   * Update explored rooms in layout
   */
  markRoomExplored: (roomId) => {
    set(state => ({
      rooms: state.rooms.map(room =>
        room.id === roomId ? { ...room, explored: true } : room
      )
    }));
  },

  // ============ Boss Fight ============

  /**
   * Start boss fight
   */
  startBossFight: (boss) => {
    set({
      status: DUNGEON_STATES.BOSS_FIGHT,
      boss: boss.toJSON ? boss.toJSON() : boss,
      bossHealthPercent: 100,
      bossPhase: 0,
      bossEnraged: false,
      bossStartTime: Date.now(),
      showBossHealth: true
    });
  },

  /**
   * Update boss state
   */
  updateBoss: (updates) => {
    set(state => ({
      boss: state.boss ? { ...state.boss, ...updates } : null,
      bossHealthPercent: updates.healthPercent !== undefined ? updates.healthPercent : state.bossHealthPercent,
      bossPhase: updates.phase !== undefined ? updates.phase : state.bossPhase,
      bossEnraged: updates.enraged !== undefined ? updates.enraged : state.bossEnraged
    }));
  },

  /**
   * Boss defeated
   */
  defeatBoss: (loot, xp, gold) => {
    set(state => ({
      status: DUNGEON_STATES.IN_ROOM,
      boss: null,
      showBossHealth: false,
      loot: [...state.loot, ...loot],
      xpGained: state.xpGained + xp,
      goldCollected: state.goldCollected + gold,
      roomsCleared: state.roomsCleared + 1
    }));
  },

  // ============ Combat ============

  /**
   * Update enemy in current room
   */
  updateEnemy: (enemyId, updates) => {
    set(state => ({
      enemies: state.enemies.map(enemy =>
        enemy.id === enemyId ? { ...enemy, ...updates } : enemy
      )
    }));
  },

  /**
   * Remove defeated enemy
   */
  removeEnemy: (enemyId) => {
    set(state => {
      const newEnemies = state.enemies.filter(e => e.id !== enemyId);
      return {
        enemies: newEnemies,
        enemiesRemaining: newEnemies.length,
        status: newEnemies.length === 0 ? DUNGEON_STATES.IN_ROOM : state.status
      };
    });
  },

  /**
   * Record damage dealt
   */
  recordDamageDealt: (amount) => {
    set(state => ({ damageDealt: state.damageDealt + amount }));
  },

  /**
   * Record damage taken
   */
  recordDamageTaken: (amount) => {
    set(state => ({ damageTaken: state.damageTaken + amount }));
  },

  /**
   * Record ability use
   */
  recordAbilityUsed: () => {
    set(state => ({ abilitiesUsed: state.abilitiesUsed + 1 }));
  },

  // ============ Loot ============

  /**
   * Add loot item
   */
  addLoot: (item) => {
    set(state => ({
      loot: [...state.loot, item],
      showLootPopup: true,
      pendingLoot: item
    }));
  },

  /**
   * Add gold
   */
  addGold: (amount) => {
    set(state => ({ goldCollected: state.goldCollected + amount }));
  },

  /**
   * Add XP
   */
  addXP: (amount) => {
    set(state => ({ xpGained: state.xpGained + amount }));
  },

  /**
   * Close loot popup
   */
  closeLootPopup: () => {
    set({ showLootPopup: false, pendingLoot: null });
  },

  // ============ Player ============

  /**
   * Update player position
   */
  updatePlayerPosition: (x, y) => {
    set({ playerPosition: { x, y } });
  },

  /**
   * Update player facing
   */
  updatePlayerFacing: (angle) => {
    set({ playerFacing: angle });
  },

  // ============ UI ============

  /**
   * Toggle mini-map visibility
   */
  toggleMiniMap: () => {
    set(state => ({ showMiniMap: !state.showMiniMap }));
  },

  // ============ Selectors ============

  /**
   * Get current room
   */
  getCurrentRoom: () => {
    const state = get();
    return state.rooms.find(r => r.id === state.currentRoomId);
  },

  /**
   * Get connected rooms from current
   */
  getConnectedRooms: () => {
    const state = get();
    const currentRoom = state.rooms.find(r => r.id === state.currentRoomId);
    if (!currentRoom || !currentRoom.connections) return [];

    const connections = currentRoom.connections;
    // Handle both Map and object formats
    const connectionIds = connections instanceof Map
      ? Array.from(connections.values())
      : Object.values(connections);

    return connectionIds
      .map(id => state.rooms.find(r => r.id === id))
      .filter(Boolean);
  },

  /**
   * Check if dungeon is active
   */
  isActive: () => {
    const status = get().status;
    return status !== DUNGEON_STATES.INACTIVE &&
           status !== DUNGEON_STATES.CLEARED &&
           status !== DUNGEON_STATES.FAILED;
  },

  /**
   * Check if in combat
   */
  isInCombat: () => {
    const status = get().status;
    return status === DUNGEON_STATES.COMBAT || status === DUNGEON_STATES.BOSS_FIGHT;
  },

  /**
   * Get exploration progress
   */
  getProgress: () => {
    const state = get();
    return {
      explored: state.roomsExplored,
      total: state.roomsTotal,
      cleared: state.roomsCleared,
      percent: state.roomsTotal > 0 ? (state.roomsExplored / state.roomsTotal) * 100 : 0
    };
  }
}));

export { DUNGEON_STATES };
export default useDungeonStore;
