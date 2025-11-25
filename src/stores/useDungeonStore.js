/**
 * useDungeonStore.js - Dungeon state management
 *
 * Manages:
 * - Active dungeon layout and current room
 * - Combat state within dungeons
 * - Player state during dungeon runs
 * - Loot collection and rewards
 * - Dungeon completion tracking
 */

import { create } from 'zustand';
import { DungeonLayout } from '../entities/DungeonLayout';
import { DungeonRoom, ROOM_TYPES } from '../entities/DungeonRoom';
import { LootGenerator } from '../systems/LootGenerator';

// Create a singleton loot generator for dungeon rewards
let lootGenerator = null;
function getLootGenerator() {
  if (!lootGenerator) {
    lootGenerator = new LootGenerator();
  }
  return lootGenerator;
}

/**
 * Item types for loot generation
 */
const ITEM_TYPES = ['WEAPON', 'ARMOR', 'HELMET', 'BOOTS', 'RING', 'AMULET'];

/**
 * Generate loot for a defeated enemy
 * @param {Object} enemy - The defeated enemy
 * @param {number} dungeonLevel - Current dungeon level
 * @returns {Object|null} Generated item or null
 */
function generateEnemyLoot(enemy, dungeonLevel) {
  // Loot drop chance based on enemy type
  let dropChance = 0.15; // 15% base chance
  let rarityBonus = 0;

  if (enemy.isElite) {
    dropChance = 0.4; // 40% for elites
    rarityBonus = 0.15;
  } else if (enemy.isBoss) {
    dropChance = 1.0; // 100% for boss
    rarityBonus = 0.35;
  }

  // Roll for loot
  if (Math.random() > dropChance) {
    return null;
  }

  // Generate the item
  const generator = getLootGenerator();
  const itemType = ITEM_TYPES[Math.floor(Math.random() * ITEM_TYPES.length)];
  const itemLevel = Math.max(1, dungeonLevel + (enemy.isBoss ? 2 : 0));

  try {
    return generator.generateItem(itemType, itemLevel, { rarityBonus });
  } catch (err) {
    // Fallback if loot generator fails
    return null;
  }
}

/**
 * Generate a simple dungeon layout for MVP
 * @param {string} dungeonType - Type of dungeon (CAVE, FOREST, RUINS)
 * @param {number} level - Difficulty level
 * @param {number} seed - Random seed
 * @returns {DungeonLayout}
 */
function generateDungeonLayout(dungeonType, level, seed) {
  const layout = new DungeonLayout({
    type: dungeonType,
    level,
    seed
  });

  // Calculate room count based on level (8-15 rooms)
  const roomCount = Math.min(15, 8 + Math.floor(level / 2));

  // Generate rooms in a simple linear + branching pattern
  const rooms = [];
  const gridSize = Math.ceil(Math.sqrt(roomCount * 2));

  // Create entrance room at center
  const entranceRoom = new DungeonRoom({
    type: ROOM_TYPES.ENTRANCE,
    gridPosition: { x: Math.floor(gridSize / 2), y: 0 }
  });
  layout.addRoom(entranceRoom);
  rooms.push(entranceRoom);

  // Create main path rooms
  let currentX = entranceRoom.gridPosition.x;
  let currentY = entranceRoom.gridPosition.y;
  let lastRoom = entranceRoom;

  for (let i = 1; i < roomCount - 1; i++) {
    // Move in a direction (mostly forward, sometimes sideways)
    const rng = ((seed + i * 7) % 100) / 100;
    if (rng < 0.6) {
      currentY++; // Move forward
    } else if (rng < 0.8) {
      currentX++; // Move right
      currentY++;
    } else {
      currentX = Math.max(0, currentX - 1); // Move left
      currentY++;
    }

    // Determine room type
    let roomType = ROOM_TYPES.CHAMBER;
    if (i % 3 === 0) {
      roomType = ROOM_TYPES.CORRIDOR;
    }
    if (i === roomCount - 3 && Math.random() < 0.5) {
      roomType = ROOM_TYPES.TREASURE;
    }

    const room = new DungeonRoom({
      type: roomType,
      gridPosition: { x: currentX, y: currentY }
    });

    layout.addRoom(room);
    rooms.push(room);

    // Connect to previous room
    layout.connectRooms(lastRoom.id, room.id, 'SOUTH');
    lastRoom = room;
  }

  // Create boss room at the end
  const bossRoom = new DungeonRoom({
    type: ROOM_TYPES.BOSS,
    gridPosition: { x: currentX, y: currentY + 1 }
  });
  layout.addRoom(bossRoom);
  layout.connectRooms(lastRoom.id, bossRoom.id, 'SOUTH');

  return layout;
}

/**
 * Monster definitions for dungeons
 */
const DUNGEON_MONSTERS = {
  CAVE: {
    common: [
      { type: 'CAVE_SPIDER', name: 'Cave Spider', health: 40, damage: 8, xpReward: 25, goldReward: [5, 15] },
      { type: 'CAVE_BAT', name: 'Cave Bat', health: 25, damage: 6, xpReward: 15, goldReward: [3, 10] }
    ],
    elite: [
      { type: 'CAVE_TROLL', name: 'Cave Troll', health: 120, damage: 18, xpReward: 75, goldReward: [20, 50] }
    ],
    boss: {
      type: 'BROOD_MOTHER',
      name: 'Brood Mother',
      health: 500,
      damage: 25,
      xpReward: 500,
      goldReward: [200, 500],
      phases: 3
    }
  },
  FOREST: {
    common: [
      { type: 'FOREST_WOLF', name: 'Forest Wolf', health: 45, damage: 10, xpReward: 30, goldReward: [8, 18] },
      { type: 'GOBLIN', name: 'Goblin', health: 35, damage: 7, xpReward: 20, goldReward: [5, 12] }
    ],
    elite: [
      { type: 'ORC_WARRIOR', name: 'Orc Warrior', health: 150, damage: 22, xpReward: 100, goldReward: [30, 70] }
    ],
    boss: {
      type: 'ANCIENT_TREANT',
      name: 'Ancient Treant',
      health: 600,
      damage: 30,
      xpReward: 600,
      goldReward: [250, 600],
      phases: 3
    }
  },
  RUINS: {
    common: [
      { type: 'SKELETON', name: 'Skeleton', health: 50, damage: 12, xpReward: 35, goldReward: [10, 25] },
      { type: 'GHOST', name: 'Ghost', health: 30, damage: 15, xpReward: 40, goldReward: [15, 30] }
    ],
    elite: [
      { type: 'UNDEAD_KNIGHT', name: 'Undead Knight', health: 180, damage: 28, xpReward: 120, goldReward: [40, 90] }
    ],
    boss: {
      type: 'LICH_LORD',
      name: 'Lich Lord',
      health: 700,
      damage: 35,
      xpReward: 800,
      goldReward: [300, 750],
      phases: 3
    }
  }
};

/**
 * Create enemies for a room
 * @param {string} roomType - Room type
 * @param {string} dungeonType - Dungeon type
 * @param {number} level - Dungeon level
 * @returns {Array} Array of enemy objects
 */
function createRoomEnemies(roomType, dungeonType, level) {
  const monsterConfig = DUNGEON_MONSTERS[dungeonType] || DUNGEON_MONSTERS.CAVE;
  const enemies = [];

  if (roomType === ROOM_TYPES.ENTRANCE || roomType === ROOM_TYPES.CORRIDOR) {
    return []; // No enemies in entrance or corridors
  }

  if (roomType === ROOM_TYPES.BOSS) {
    // Create boss enemy
    const boss = monsterConfig.boss;
    const scaledHealth = Math.floor(boss.health * (1 + level * 0.15));
    const scaledDamage = Math.floor(boss.damage * (1 + level * 0.1));

    enemies.push({
      id: `boss_${Date.now()}`,
      type: boss.type,
      name: boss.name,
      health: scaledHealth,
      maxHealth: scaledHealth,
      damage: scaledDamage,
      xpReward: Math.floor(boss.xpReward * (1 + level * 0.2)),
      goldReward: [
        Math.floor(boss.goldReward[0] * (1 + level * 0.15)),
        Math.floor(boss.goldReward[1] * (1 + level * 0.15))
      ],
      isBoss: true,
      currentPhase: 1,
      maxPhases: boss.phases,
      alive: true
    });

    return enemies;
  }

  // Regular rooms get common enemies, treasure rooms get fewer
  const enemyCount = roomType === ROOM_TYPES.TREASURE ? 2 : Math.min(4, 2 + Math.floor(level / 3));

  for (let i = 0; i < enemyCount; i++) {
    // 20% chance for elite enemy in chambers
    const isElite = roomType === ROOM_TYPES.CHAMBER && Math.random() < 0.2;
    const pool = isElite ? monsterConfig.elite : monsterConfig.common;
    const template = pool[Math.floor(Math.random() * pool.length)];

    const scaledHealth = Math.floor(template.health * (1 + level * 0.1));
    const scaledDamage = Math.floor(template.damage * (1 + level * 0.08));

    enemies.push({
      id: `enemy_${Date.now()}_${i}`,
      type: template.type,
      name: template.name,
      health: scaledHealth,
      maxHealth: scaledHealth,
      damage: scaledDamage,
      xpReward: Math.floor(template.xpReward * (1 + level * 0.1)),
      goldReward: [
        Math.floor(template.goldReward[0] * (1 + level * 0.1)),
        Math.floor(template.goldReward[1] * (1 + level * 0.1))
      ],
      isElite: isElite,
      alive: true
    });
  }

  return enemies;
}

const useDungeonStore = create((set, get) => ({
  // === State ===

  // Dungeon layout
  activeDungeon: null,
  currentRoomId: null,
  exploredRooms: new Set(),

  // Session state
  inDungeon: false,
  dungeonType: null,
  dungeonLevel: 1,

  // Combat state
  currentEnemies: [],
  inCombat: false,
  combatLog: [],
  selectedTargetId: null,

  // Player dungeon state (separate from main game state)
  dungeonPlayerHealth: 100,
  dungeonPlayerMaxHealth: 100,
  dungeonPlayerMana: 100,
  dungeonPlayerMaxMana: 100,
  skillCooldowns: {},

  // Progress tracking
  bossDefeated: false,
  roomsCleared: 0,
  enemiesKilled: 0,

  // Rewards (accumulated during dungeon run)
  collectedXP: 0,
  collectedGold: 0,
  collectedLoot: [],

  // === Actions ===

  /**
   * Enter a dungeon
   * @param {string} dungeonType - Type of dungeon
   * @param {number} level - Difficulty level
   * @param {Object} playerStats - Player stats to use in dungeon
   */
  enterDungeon: (dungeonType, level, playerStats) => {
    const seed = Date.now();
    const layout = generateDungeonLayout(dungeonType, level, seed);
    const entranceRoom = layout.getEntranceRoom();

    if (!entranceRoom) {
      console.error('[DungeonStore] Failed to create entrance room');
      return false;
    }

    // Generate enemies for entrance room (should be empty)
    const enemies = createRoomEnemies(entranceRoom.type, dungeonType, level);

    set({
      activeDungeon: layout,
      currentRoomId: entranceRoom.id,
      exploredRooms: new Set([entranceRoom.id]),
      inDungeon: true,
      dungeonType,
      dungeonLevel: level,
      currentEnemies: enemies,
      inCombat: enemies.length > 0,
      combatLog: [{ type: 'system', message: `Entered ${dungeonType} Dungeon (Level ${level})` }],
      selectedTargetId: null,
      dungeonPlayerHealth: playerStats.health || 100,
      dungeonPlayerMaxHealth: playerStats.maxHealth || 100,
      dungeonPlayerMana: playerStats.mana || 100,
      dungeonPlayerMaxMana: playerStats.maxMana || 100,
      skillCooldowns: {},
      bossDefeated: false,
      roomsCleared: 0,
      enemiesKilled: 0,
      collectedXP: 0,
      collectedGold: 0,
      collectedLoot: []
    });

    entranceRoom.setActive(true);
    return true;
  },

  /**
   * Move to an adjacent room
   * @param {string} direction - Direction (NORTH, SOUTH, EAST, WEST)
   * @returns {boolean} Success
   */
  moveToRoom: (direction) => {
    const { activeDungeon, currentRoomId, dungeonType, dungeonLevel, currentEnemies } = get();

    if (!activeDungeon || !currentRoomId) return false;

    // Can't move while enemies are alive
    if (currentEnemies.some(e => e.alive)) {
      set((state) => ({
        combatLog: [...state.combatLog, { type: 'system', message: 'Clear all enemies before moving!' }]
      }));
      return false;
    }

    const currentRoom = activeDungeon.getRoom(currentRoomId);
    if (!currentRoom) return false;

    const targetRoomId = currentRoom.getConnection(direction);
    if (!targetRoomId) return false;

    const targetRoom = activeDungeon.getRoom(targetRoomId);
    if (!targetRoom) return false;

    // Update room states
    currentRoom.setActive(false);
    targetRoom.setActive(true);

    // Generate enemies for new room if not explored
    const { exploredRooms } = get();
    let enemies = [];
    if (!exploredRooms.has(targetRoomId)) {
      enemies = createRoomEnemies(targetRoom.type, dungeonType, dungeonLevel);
    }

    const newExplored = new Set(exploredRooms);
    newExplored.add(targetRoomId);

    set((state) => ({
      currentRoomId: targetRoomId,
      exploredRooms: newExplored,
      currentEnemies: enemies,
      inCombat: enemies.length > 0,
      selectedTargetId: enemies.length > 0 ? enemies[0].id : null,
      combatLog: [...state.combatLog, {
        type: 'system',
        message: `Entered ${targetRoom.type} room${enemies.length > 0 ? ` - ${enemies.length} enemies!` : ''}`
      }]
    }));

    return true;
  },

  /**
   * Attack an enemy
   * @param {string} enemyId - Enemy ID to attack
   * @param {Object} playerStats - Player combat stats
   * @returns {Object} Attack result
   */
  attackEnemy: (enemyId, playerStats) => {
    const { currentEnemies, dungeonPlayerHealth } = get();

    if (dungeonPlayerHealth <= 0) {
      return { success: false, message: 'You are defeated!' };
    }

    const enemyIndex = currentEnemies.findIndex(e => e.id === enemyId);
    if (enemyIndex === -1 || !currentEnemies[enemyIndex].alive) {
      return { success: false, message: 'Invalid target' };
    }

    const enemy = currentEnemies[enemyIndex];

    // Calculate player damage
    const baseDamage = playerStats.damage || 10;
    const isCrit = Math.random() * 100 < (playerStats.critChance || 5);
    const critMultiplier = isCrit ? (playerStats.critDamage || 150) / 100 : 1;
    const playerDamage = Math.floor(baseDamage * critMultiplier);

    // Apply damage to enemy
    enemy.health = Math.max(0, enemy.health - playerDamage);

    const logEntries = [];
    logEntries.push({
      type: 'player',
      message: `You dealt ${playerDamage} damage to ${enemy.name}${isCrit ? ' (CRIT!)' : ''}`
    });

    let xpGained = 0;
    let goldGained = 0;
    let bossDefeated = false;
    let lootDropped = null;

    // Check if enemy died
    if (enemy.health <= 0) {
      enemy.alive = false;

      // Calculate rewards
      xpGained = enemy.xpReward;
      goldGained = Math.floor(
        enemy.goldReward[0] + Math.random() * (enemy.goldReward[1] - enemy.goldReward[0])
      );

      logEntries.push({
        type: 'reward',
        message: `${enemy.name} defeated! +${xpGained} XP, +${goldGained} gold`
      });

      // Generate loot drop
      const { dungeonLevel } = get();
      lootDropped = generateEnemyLoot(enemy, dungeonLevel);
      if (lootDropped) {
        logEntries.push({
          type: 'loot',
          message: `Loot dropped: ${lootDropped.name} (${lootDropped.rarity})`
        });
      }

      if (enemy.isBoss) {
        bossDefeated = true;
        logEntries.push({
          type: 'boss',
          message: `BOSS DEFEATED! The dungeon is cleared!`
        });
      }
    }

    // Enemy counterattack (if still alive)
    let playerDamageTaken = 0;
    if (enemy.alive && enemy.health > 0) {
      // Dodge check
      const dodged = Math.random() * 100 < (playerStats.dodgeChance || 5);

      if (dodged) {
        logEntries.push({
          type: 'enemy',
          message: `${enemy.name} attacks but you dodged!`
        });
      } else {
        // Calculate enemy damage
        const enemyBaseDamage = enemy.damage;
        const defenseReduction = (playerStats.defense || 0) * 0.5;
        playerDamageTaken = Math.max(1, Math.floor(enemyBaseDamage - defenseReduction));

        logEntries.push({
          type: 'enemy',
          message: `${enemy.name} hits you for ${playerDamageTaken} damage`
        });
      }
    }

    // Update state
    set((state) => {
      const newEnemies = [...state.currentEnemies];
      newEnemies[enemyIndex] = { ...enemy };

      const newHealth = Math.max(0, state.dungeonPlayerHealth - playerDamageTaken);
      const aliveEnemies = newEnemies.filter(e => e.alive);

      // Check if room is cleared
      let newRoomsCleared = state.roomsCleared;
      if (aliveEnemies.length === 0 && state.currentEnemies.some(e => e.alive)) {
        newRoomsCleared++;
      }

      // Add loot to collected items
      const newLoot = lootDropped
        ? [...state.collectedLoot, lootDropped]
        : state.collectedLoot;

      return {
        currentEnemies: newEnemies,
        dungeonPlayerHealth: newHealth,
        combatLog: [...state.combatLog, ...logEntries],
        inCombat: aliveEnemies.length > 0,
        selectedTargetId: aliveEnemies.length > 0 ? aliveEnemies[0].id : null,
        collectedXP: state.collectedXP + xpGained,
        collectedGold: state.collectedGold + goldGained,
        collectedLoot: newLoot,
        enemiesKilled: state.enemiesKilled + (enemy.health <= 0 ? 1 : 0),
        roomsCleared: newRoomsCleared,
        bossDefeated: state.bossDefeated || bossDefeated
      };
    });

    return {
      success: true,
      lootDropped,
      playerDamage,
      isCrit,
      enemyKilled: enemy.health <= 0,
      playerDamageTaken,
      xpGained,
      goldGained
    };
  },

  /**
   * Use a skill in combat
   * @param {string} skillId - Skill ID
   * @param {Object} skillData - Skill configuration
   * @param {Object} playerStats - Player stats
   * @returns {Object} Skill result
   */
  useSkill: (skillId, skillData, playerStats) => {
    const { skillCooldowns, dungeonPlayerMana, currentEnemies, selectedTargetId } = get();

    // Check cooldown
    const currentCooldown = skillCooldowns[skillId] || 0;
    if (currentCooldown > 0) {
      return { success: false, message: `Skill on cooldown (${currentCooldown.toFixed(1)}s)` };
    }

    // Check mana
    const manaCost = skillData.manaCost || 0;
    if (dungeonPlayerMana < manaCost) {
      return { success: false, message: 'Not enough mana!' };
    }

    // Apply skill effects
    const logEntries = [];
    let totalDamage = 0;
    let healAmount = 0;

    if (skillData.type === 'damage') {
      // Damage skill - hits selected target or all enemies
      const targets = skillData.aoe
        ? currentEnemies.filter(e => e.alive)
        : currentEnemies.filter(e => e.id === selectedTargetId && e.alive);

      const baseDamage = skillData.damage || playerStats.damage;
      const skillMultiplier = skillData.damageMultiplier || 1;

      targets.forEach((enemy, idx) => {
        const damage = Math.floor(baseDamage * skillMultiplier);
        enemy.health = Math.max(0, enemy.health - damage);
        totalDamage += damage;

        if (enemy.health <= 0) {
          enemy.alive = false;
        }
      });

      logEntries.push({
        type: 'skill',
        message: `${skillData.name} dealt ${totalDamage} total damage!`
      });
    } else if (skillData.type === 'heal') {
      // Healing skill
      healAmount = Math.floor(skillData.healAmount || playerStats.maxHealth * 0.25);
      logEntries.push({
        type: 'skill',
        message: `${skillData.name} restored ${healAmount} health!`
      });
    }

    // Update state
    set((state) => {
      const newEnemies = currentEnemies.map(e => ({ ...e }));
      const aliveEnemies = newEnemies.filter(e => e.alive);

      // Calculate rewards for killed enemies
      let xpGained = 0;
      let goldGained = 0;
      state.currentEnemies.forEach((oldEnemy, idx) => {
        if (oldEnemy.alive && !newEnemies[idx].alive) {
          xpGained += newEnemies[idx].xpReward;
          goldGained += Math.floor(
            newEnemies[idx].goldReward[0] +
            Math.random() * (newEnemies[idx].goldReward[1] - newEnemies[idx].goldReward[0])
          );
        }
      });

      return {
        currentEnemies: newEnemies,
        dungeonPlayerMana: Math.max(0, state.dungeonPlayerMana - manaCost),
        dungeonPlayerHealth: Math.min(
          state.dungeonPlayerMaxHealth,
          state.dungeonPlayerHealth + healAmount
        ),
        skillCooldowns: {
          ...state.skillCooldowns,
          [skillId]: skillData.cooldown || 5
        },
        combatLog: [...state.combatLog, ...logEntries],
        inCombat: aliveEnemies.length > 0,
        selectedTargetId: aliveEnemies.length > 0 ? aliveEnemies[0].id : null,
        collectedXP: state.collectedXP + xpGained,
        collectedGold: state.collectedGold + goldGained
      };
    });

    return { success: true, totalDamage, healAmount };
  },

  /**
   * Update skill cooldowns (called from game loop)
   * @param {number} deltaTime - Time elapsed in seconds
   */
  updateCooldowns: (deltaTime) => {
    set((state) => {
      const newCooldowns = { ...state.skillCooldowns };
      let changed = false;

      for (const skillId in newCooldowns) {
        if (newCooldowns[skillId] > 0) {
          newCooldowns[skillId] = Math.max(0, newCooldowns[skillId] - deltaTime);
          changed = true;
        }
      }

      if (!changed) return state;
      return { skillCooldowns: newCooldowns };
    });
  },

  /**
   * Heal player in dungeon
   * @param {number} amount - Amount to heal
   */
  healPlayer: (amount) => {
    set((state) => ({
      dungeonPlayerHealth: Math.min(state.dungeonPlayerMaxHealth, state.dungeonPlayerHealth + amount),
      combatLog: [...state.combatLog, { type: 'heal', message: `Healed for ${amount} HP` }]
    }));
  },

  /**
   * Restore mana in dungeon
   * @param {number} amount - Amount to restore
   */
  restoreMana: (amount) => {
    set((state) => ({
      dungeonPlayerMana: Math.min(state.dungeonPlayerMaxMana, state.dungeonPlayerMana + amount)
    }));
  },

  /**
   * Select a target enemy
   * @param {string} enemyId - Enemy ID
   */
  selectTarget: (enemyId) => {
    set({ selectedTargetId: enemyId });
  },

  /**
   * Add loot to collected items
   * @param {Object} item - Item object
   */
  collectLoot: (item) => {
    set((state) => ({
      collectedLoot: [...state.collectedLoot, item],
      combatLog: [...state.combatLog, { type: 'loot', message: `Found ${item.name}!` }]
    }));
  },

  /**
   * Exit dungeon and collect rewards
   * @returns {Object} Final rewards
   */
  exitDungeon: () => {
    const { collectedXP, collectedGold, collectedLoot, bossDefeated, roomsCleared, enemiesKilled } = get();

    const rewards = {
      xp: collectedXP,
      gold: collectedGold,
      loot: collectedLoot,
      bossDefeated,
      roomsCleared,
      enemiesKilled,
      completed: bossDefeated
    };

    // Reset state
    set({
      activeDungeon: null,
      currentRoomId: null,
      exploredRooms: new Set(),
      inDungeon: false,
      dungeonType: null,
      dungeonLevel: 1,
      currentEnemies: [],
      inCombat: false,
      combatLog: [],
      selectedTargetId: null,
      dungeonPlayerHealth: 100,
      dungeonPlayerMaxHealth: 100,
      dungeonPlayerMana: 100,
      dungeonPlayerMaxMana: 100,
      skillCooldowns: {},
      bossDefeated: false,
      roomsCleared: 0,
      enemiesKilled: 0,
      collectedXP: 0,
      collectedGold: 0,
      collectedLoot: []
    });

    return rewards;
  },

  /**
   * Handle player death in dungeon
   * @returns {Object} Partial rewards (with penalty)
   */
  handlePlayerDeath: () => {
    const { collectedXP, collectedGold, roomsCleared, enemiesKilled } = get();

    // Player keeps 50% of XP, 25% of gold on death
    const rewards = {
      xp: Math.floor(collectedXP * 0.5),
      gold: Math.floor(collectedGold * 0.25),
      loot: [], // Lose all loot on death
      bossDefeated: false,
      roomsCleared,
      enemiesKilled,
      completed: false,
      died: true
    };

    // Reset state
    set({
      activeDungeon: null,
      currentRoomId: null,
      exploredRooms: new Set(),
      inDungeon: false,
      dungeonType: null,
      dungeonLevel: 1,
      currentEnemies: [],
      inCombat: false,
      combatLog: [],
      selectedTargetId: null,
      dungeonPlayerHealth: 100,
      dungeonPlayerMaxHealth: 100,
      dungeonPlayerMana: 100,
      dungeonPlayerMaxMana: 100,
      skillCooldowns: {},
      bossDefeated: false,
      roomsCleared: 0,
      enemiesKilled: 0,
      collectedXP: 0,
      collectedGold: 0,
      collectedLoot: []
    });

    return rewards;
  },

  /**
   * Get available directions from current room
   * @returns {Array<string>} Available directions
   */
  getAvailableDirections: () => {
    const { activeDungeon, currentRoomId } = get();
    if (!activeDungeon || !currentRoomId) return [];

    const room = activeDungeon.getRoom(currentRoomId);
    if (!room) return [];

    return room.getConnectionDirections();
  },

  /**
   * Get current room info
   * @returns {Object|null} Room info
   */
  getCurrentRoom: () => {
    const { activeDungeon, currentRoomId } = get();
    if (!activeDungeon || !currentRoomId) return null;
    return activeDungeon.getRoom(currentRoomId);
  },

  /**
   * Check if player is dead
   * @returns {boolean}
   */
  isPlayerDead: () => {
    return get().dungeonPlayerHealth <= 0;
  },

  /**
   * Clear combat log
   */
  clearCombatLog: () => {
    set({ combatLog: [] });
  }
}));

export default useDungeonStore;
