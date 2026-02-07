/**
 * ActionSystem - Multiplayer-ready action-based state management
 *
 * All state mutations go through actions for:
 * 1. Validation before application
 * 2. Replay capability for rollback
 * 3. Network synchronization (future)
 * 4. State history for debugging
 */

// Action type constants
export const ActionTypes = {
  // Player actions
  PLAYER_MOVE: 'player/move',
  PLAYER_JUMP: 'player/jump',
  PLAYER_ATTACK: 'player/attack',
  PLAYER_TAKE_DAMAGE: 'player/takeDamage',
  PLAYER_HEAL: 'player/heal',
  PLAYER_USE_ITEM: 'player/useItem',
  PLAYER_EQUIP: 'player/equip',
  PLAYER_UNEQUIP: 'player/unequip',
  PLAYER_GAIN_XP: 'player/gainXP',
  PLAYER_LEVEL_UP: 'player/levelUp',

  // Block actions
  BLOCK_PLACE: 'block/place',
  BLOCK_BREAK: 'block/break',

  // Combat actions
  SPAWN_PROJECTILE: 'combat/spawnProjectile',
  ENEMY_TAKE_DAMAGE: 'combat/enemyTakeDamage',
  ENEMY_SPAWN: 'combat/enemySpawn',
  ENEMY_DESPAWN: 'combat/enemyDespawn',

  // Inventory actions
  INVENTORY_ADD: 'inventory/add',
  INVENTORY_REMOVE: 'inventory/remove',
  INVENTORY_GOLD_CHANGE: 'inventory/goldChange',

  // Game state actions
  GAME_STATE_CHANGE: 'game/stateChange',
  CAMERA_UPDATE: 'game/cameraUpdate',
};

/**
 * Create an action object
 * @param {string} type - Action type from ActionTypes
 * @param {Object} payload - Action payload data
 * @param {Object} [meta] - Optional metadata (timestamp, source, etc.)
 * @returns {Object} Action object
 */
export function createAction(type, payload, meta = {}) {
  return {
    type,
    payload,
    meta: {
      timestamp: Date.now(),
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...meta,
    },
  };
}

/**
 * Action validation result
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - Whether action is valid
 * @property {string} [reason] - Reason if invalid
 */

/**
 * Validate an action before application
 * @param {Object} action - Action to validate
 * @param {Object} state - Current game state
 * @returns {ValidationResult}
 */
export function validateAction(action, state) {
  const { type, payload } = action;

  switch (type) {
    case ActionTypes.PLAYER_MOVE:
      // Validate position is reasonable
      if (!payload.position || payload.position.length !== 3) {
        return { valid: false, reason: 'Invalid position format' };
      }
      return { valid: true };

    case ActionTypes.PLAYER_TAKE_DAMAGE:
      if (state.player.isInvincible) {
        return { valid: false, reason: 'Player is invincible' };
      }
      if (payload.damage <= 0) {
        return { valid: false, reason: 'Damage must be positive' };
      }
      return { valid: true };

    case ActionTypes.PLAYER_HEAL:
      if (payload.amount <= 0) {
        return { valid: false, reason: 'Heal amount must be positive' };
      }
      return { valid: true };

    case ActionTypes.BLOCK_PLACE:
      if (!payload.position || payload.position.length !== 3) {
        return { valid: false, reason: 'Invalid position' };
      }
      if (payload.blockType === undefined) {
        return { valid: false, reason: 'Block type required' };
      }
      return { valid: true };

    case ActionTypes.BLOCK_BREAK:
      if (!payload.position || payload.position.length !== 3) {
        return { valid: false, reason: 'Invalid position' };
      }
      return { valid: true };

    case ActionTypes.INVENTORY_GOLD_CHANGE:
      const newGold = state.inventory.gold + payload.amount;
      if (newGold < 0) {
        return { valid: false, reason: 'Insufficient gold' };
      }
      return { valid: true };

    default:
      // Allow unknown actions by default (for extensibility)
      return { valid: true };
  }
}

/**
 * ActionHistory - Maintains action history for replay/rollback
 */
export class ActionHistory {
  constructor(maxSize = 1000) {
    this.actions = [];
    this.maxSize = maxSize;
  }

  push(action) {
    this.actions.push(action);
    if (this.actions.length > this.maxSize) {
      this.actions.shift();
    }
  }

  getRecent(count) {
    return this.actions.slice(-count);
  }

  getSince(timestamp) {
    return this.actions.filter(a => a.meta.timestamp >= timestamp);
  }

  clear() {
    this.actions = [];
  }

  get length() {
    return this.actions.length;
  }
}

/**
 * StateSnapshot - Creates and restores state snapshots
 */
export class StateSnapshot {
  constructor(state) {
    this.timestamp = Date.now();
    this.state = this.deepClone(state);
  }

  deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Map) return new Map(obj);
    if (obj instanceof Set) return new Set(obj);
    if (Array.isArray(obj)) return obj.map(item => this.deepClone(item));
    const cloned = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        cloned[key] = this.deepClone(obj[key]);
      }
    }
    return cloned;
  }

  restore() {
    return this.deepClone(this.state);
  }
}

/**
 * Create action middleware for Zustand
 * Wraps set() to track actions and validate mutations
 */
export function createActionMiddleware(actionHistory) {
  return (set, get, api) => (fn) => {
    // If fn is an action object, process it
    if (fn && typeof fn === 'object' && fn.type) {
      const action = fn;
      const state = get();

      // Validate
      const validation = validateAction(action, state);
      if (!validation.valid) {
        console.warn(`Action ${action.type} rejected: ${validation.reason}`);
        return;
      }

      // Track in history
      actionHistory.push(action);

      // Apply action (reducer-style)
      return set(applyAction(action, state));
    }

    // Otherwise, pass through to regular set
    return set(fn);
  };
}

/**
 * Apply an action to state (reducer pattern)
 * @param {Object} action - Action to apply
 * @param {Object} state - Current state
 * @returns {Object} State updates
 */
export function applyAction(action, state) {
  const { type, payload } = action;

  switch (type) {
    case ActionTypes.PLAYER_MOVE:
      return {
        player: { ...state.player, position: payload.position },
      };

    case ActionTypes.PLAYER_TAKE_DAMAGE:
      const finalDamage = state.player.isBlocking
        ? payload.damage * 0.25
        : payload.damage;
      const newHealth = Math.max(0, state.player.health - finalDamage);
      return {
        player: {
          ...state.player,
          health: newHealth,
          rage: Math.min(state.player.maxRage, state.player.rage + 10),
        },
      };

    case ActionTypes.PLAYER_HEAL:
      return {
        player: {
          ...state.player,
          health: Math.min(state.player.maxHealth, state.player.health + payload.amount),
        },
      };

    case ActionTypes.PLAYER_GAIN_XP:
      let newXP = state.player.xp + payload.amount;
      let newLevel = state.player.level;
      let xpToNext = state.player.xpToNext;

      while (newXP >= xpToNext) {
        newXP -= xpToNext;
        newLevel++;
        xpToNext = Math.floor(xpToNext * 1.5);
      }

      return {
        player: {
          ...state.player,
          xp: newXP,
          level: newLevel,
          xpToNext,
        },
      };

    case ActionTypes.INVENTORY_GOLD_CHANGE:
      return {
        inventory: {
          ...state.inventory,
          gold: state.inventory.gold + payload.amount,
        },
      };

    case ActionTypes.GAME_STATE_CHANGE:
      return { gameState: payload.state };

    case ActionTypes.CAMERA_UPDATE:
      return {
        camera: { ...state.camera, ...payload },
      };

    default:
      console.warn(`Unknown action type: ${type}`);
      return {};
  }
}

export default {
  ActionTypes,
  createAction,
  validateAction,
  applyAction,
  ActionHistory,
  StateSnapshot,
  createActionMiddleware,
};
