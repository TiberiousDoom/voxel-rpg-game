/**
 * useDungeonStore.js - Dungeon state management with real-time combat
 *
 * Manages:
 * - Active dungeon layout and current room
 * - Real-time combat state within dungeons
 * - Player state during dungeon runs
 * - Loot collection and rewards
 * - Dungeon completion tracking
 *
 * Combat system matches overworld mechanics:
 * - Enemies attack automatically based on attackSpeed
 * - Player attacks have cooldowns
 * - Damage numbers float up
 * - Same damage formulas as overworld
 */

import { create } from 'zustand';
import { DungeonLayout } from '../entities/DungeonLayout';
import { DungeonRoom, ROOM_TYPES } from '../entities/DungeonRoom';
import { LootGenerator } from '../systems/LootGenerator';
import { audioManager } from '../utils/AudioManager';

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
 */
function generateEnemyLoot(enemy, dungeonLevel) {
  let dropChance = 0.15;
  let rarityBonus = 0;

  if (enemy.isElite) {
    dropChance = 0.4;
    rarityBonus = 0.15;
  } else if (enemy.isBoss) {
    dropChance = 1.0;
    rarityBonus = 0.35;
  }

  if (Math.random() > dropChance) {
    return null;
  }

  const generator = getLootGenerator();
  const itemType = ITEM_TYPES[Math.floor(Math.random() * ITEM_TYPES.length)];
  const itemLevel = Math.max(1, dungeonLevel + (enemy.isBoss ? 2 : 0));

  try {
    return generator.generateItem(itemType, itemLevel, { rarityBonus });
  } catch (err) {
    return null;
  }
}

/**
 * Generate a dungeon layout
 */
function generateDungeonLayout(dungeonType, level, seed) {
  const layout = new DungeonLayout({
    type: dungeonType,
    level,
    seed
  });

  const roomCount = Math.min(15, 8 + Math.floor(level / 2));
  const gridSize = Math.ceil(Math.sqrt(roomCount * 2));

  const entranceRoom = new DungeonRoom({
    type: ROOM_TYPES.ENTRANCE,
    gridPosition: { x: Math.floor(gridSize / 2), y: 0 }
  });
  layout.addRoom(entranceRoom);

  let currentX = entranceRoom.gridPosition.x;
  let currentY = entranceRoom.gridPosition.y;
  let lastRoom = entranceRoom;

  for (let i = 1; i < roomCount - 1; i++) {
    const rng = ((seed + i * 7) % 100) / 100;
    if (rng < 0.6) {
      currentY++;
    } else if (rng < 0.8) {
      currentX++;
      currentY++;
    } else {
      currentX = Math.max(0, currentX - 1);
      currentY++;
    }

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
    layout.connectRooms(lastRoom.id, room.id, 'SOUTH');
    lastRoom = room;
  }

  const bossRoom = new DungeonRoom({
    type: ROOM_TYPES.BOSS,
    gridPosition: { x: currentX, y: currentY + 1 }
  });
  layout.addRoom(bossRoom);
  layout.connectRooms(lastRoom.id, bossRoom.id, 'SOUTH');

  return layout;
}

/**
 * Monster definitions with real-time combat stats
 * attackSpeed = attacks per second (matches overworld)
 * moveSpeed = units per second for movement
 */
const DUNGEON_MONSTERS = {
  CAVE: {
    common: [
      {
        type: 'CAVE_SPIDER',
        name: 'Cave Spider',
        health: 40,
        damage: 8,
        defense: 0,
        attackSpeed: 0.6,
        moveSpeed: 2.5,
        attackRange: 50,
        aggroRange: 200,
        xpReward: 25,
        goldReward: [5, 15]
      },
      {
        type: 'CAVE_BAT',
        name: 'Cave Bat',
        health: 25,
        damage: 6,
        defense: 0,
        attackSpeed: 0.8,
        moveSpeed: 4.0,
        attackRange: 40,
        aggroRange: 250,
        xpReward: 15,
        goldReward: [3, 10]
      }
    ],
    elite: [
      {
        type: 'CAVE_TROLL',
        name: 'Cave Troll',
        health: 120,
        damage: 18,
        defense: 5,
        attackSpeed: 0.4,
        moveSpeed: 1.5,
        attackRange: 60,
        aggroRange: 180,
        xpReward: 75,
        goldReward: [20, 50]
      }
    ],
    boss: {
      type: 'BROOD_MOTHER',
      name: 'Brood Mother',
      health: 500,
      damage: 25,
      defense: 8,
      attackSpeed: 0.5,
      moveSpeed: 1.0,
      attackRange: 80,
      aggroRange: 400,
      xpReward: 500,
      goldReward: [200, 500],
      phases: 3,
      abilities: ['spawn_spiders', 'web_spray', 'frenzy']
    }
  },
  FOREST: {
    common: [
      {
        type: 'FOREST_WOLF',
        name: 'Forest Wolf',
        health: 45,
        damage: 10,
        defense: 2,
        attackSpeed: 0.7,
        moveSpeed: 4.5,
        attackRange: 45,
        aggroRange: 200,
        xpReward: 30,
        goldReward: [8, 18]
      },
      {
        type: 'GOBLIN',
        name: 'Goblin',
        health: 35,
        damage: 7,
        defense: 1,
        attackSpeed: 0.9,
        moveSpeed: 3.0,
        attackRange: 40,
        aggroRange: 180,
        xpReward: 20,
        goldReward: [5, 12]
      }
    ],
    elite: [
      {
        type: 'ORC_WARRIOR',
        name: 'Orc Warrior',
        health: 150,
        damage: 22,
        defense: 8,
        attackSpeed: 0.45,
        moveSpeed: 2.0,
        attackRange: 55,
        aggroRange: 200,
        xpReward: 100,
        goldReward: [30, 70]
      }
    ],
    boss: {
      type: 'ANCIENT_TREANT',
      name: 'Ancient Treant',
      health: 600,
      damage: 30,
      defense: 12,
      attackSpeed: 0.35,
      moveSpeed: 0.8,
      attackRange: 100,
      aggroRange: 400,
      xpReward: 600,
      goldReward: [250, 600],
      phases: 3,
      abilities: ['root_slam', 'summon_saplings', 'nature_heal']
    }
  },
  RUINS: {
    common: [
      {
        type: 'SKELETON',
        name: 'Skeleton',
        health: 50,
        damage: 12,
        defense: 3,
        attackSpeed: 0.6,
        moveSpeed: 2.0,
        attackRange: 50,
        aggroRange: 200,
        xpReward: 35,
        goldReward: [10, 25]
      },
      {
        type: 'GHOST',
        name: 'Ghost',
        health: 30,
        damage: 15,
        defense: 0,
        attackSpeed: 0.7,
        moveSpeed: 3.5,
        attackRange: 60,
        aggroRange: 250,
        xpReward: 40,
        goldReward: [15, 30]
      }
    ],
    elite: [
      {
        type: 'UNDEAD_KNIGHT',
        name: 'Undead Knight',
        health: 180,
        damage: 28,
        defense: 15,
        attackSpeed: 0.4,
        moveSpeed: 1.8,
        attackRange: 55,
        aggroRange: 180,
        xpReward: 120,
        goldReward: [40, 90]
      }
    ],
    boss: {
      type: 'LICH_LORD',
      name: 'Lich Lord',
      health: 700,
      damage: 35,
      defense: 10,
      attackSpeed: 0.5,
      moveSpeed: 1.2,
      attackRange: 120,
      aggroRange: 400,
      xpReward: 800,
      goldReward: [300, 750],
      phases: 3,
      abilities: ['dark_bolt', 'summon_undead', 'life_drain']
    }
  }
};

/**
 * Arena dimensions for 2D combat
 */
const ARENA_WIDTH = 600;
const ARENA_HEIGHT = 400;
const PLAYER_SIZE = 40;
const ENEMY_SIZE = 35;

/**
 * AI States for enemies (matches overworld)
 */
const AI_STATE = {
  IDLE: 'IDLE',
  CHASE: 'CHASE',
  ATTACK: 'ATTACK',
  FLEE: 'FLEE',
  DEATH: 'DEATH',
  ABILITY: 'ABILITY'
};

/**
 * Format ability name for display
 */
function formatAbilityName(ability) {
  return ability.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Boss ability definitions
 */
const BOSS_ABILITIES = {
  // Brood Mother abilities
  spawn_spiders: {
    name: 'Spawn Spiders',
    type: 'summon',
    spawnCount: 2,
    spawnType: 'CAVE_SPIDER',
    message: 'The Brood Mother summons her children!'
  },
  web_spray: {
    name: 'Web Spray',
    type: 'damage',
    damageMultiplier: 1.5,
    aoe: true,
    message: 'The Brood Mother sprays venomous web!'
  },
  frenzy: {
    name: 'Frenzy',
    type: 'buff',
    attackSpeedBonus: 0.5,
    duration: 5,
    message: 'The Brood Mother enters a frenzy!'
  },
  // Ancient Treant abilities
  root_slam: {
    name: 'Root Slam',
    type: 'damage',
    damageMultiplier: 2.0,
    message: 'The Ancient Treant slams with massive roots!'
  },
  summon_saplings: {
    name: 'Summon Saplings',
    type: 'summon',
    spawnCount: 3,
    spawnType: 'GOBLIN',
    message: 'The Ancient Treant summons forest creatures!'
  },
  nature_heal: {
    name: 'Nature Heal',
    type: 'heal',
    healPercent: 0.1,
    message: 'The Ancient Treant draws power from nature!'
  },
  // Lich Lord abilities
  dark_bolt: {
    name: 'Dark Bolt',
    type: 'damage',
    damageMultiplier: 2.5,
    message: 'The Lich Lord hurls a bolt of dark energy!'
  },
  summon_undead: {
    name: 'Summon Undead',
    type: 'summon',
    spawnCount: 2,
    spawnType: 'SKELETON',
    message: 'The Lich Lord raises the dead!'
  },
  life_drain: {
    name: 'Life Drain',
    type: 'drain',
    damageMultiplier: 1.5,
    healPercent: 0.5,
    message: 'The Lich Lord drains your life force!'
  }
};

/**
 * Create enemies for a room with positions and real-time combat stats
 */
function createRoomEnemies(roomType, dungeonType, level) {
  const monsterConfig = DUNGEON_MONSTERS[dungeonType] || DUNGEON_MONSTERS.CAVE;
  const enemies = [];

  if (roomType === ROOM_TYPES.ENTRANCE || roomType === ROOM_TYPES.CORRIDOR) {
    return [];
  }

  if (roomType === ROOM_TYPES.BOSS) {
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
      defense: boss.defense,
      attackSpeed: boss.attackSpeed,
      moveSpeed: boss.moveSpeed,
      attackRange: boss.attackRange,
      aggroRange: boss.aggroRange,
      xpReward: Math.floor(boss.xpReward * (1 + level * 0.2)),
      goldReward: [
        Math.floor(boss.goldReward[0] * (1 + level * 0.15)),
        Math.floor(boss.goldReward[1] * (1 + level * 0.15))
      ],
      isBoss: true,
      currentPhase: 1,
      maxPhases: boss.phases,
      abilities: boss.abilities || [],
      alive: true,
      // Real-time combat state
      aiState: AI_STATE.IDLE,
      position: { x: ARENA_WIDTH / 2, y: 80 },
      lastAttackTime: 0,
      isAttacking: false,
      attackAnimTimer: 0,
      hitFlashTimer: 0
    });

    return enemies;
  }

  const enemyCount = roomType === ROOM_TYPES.TREASURE ? 2 : Math.min(4, 2 + Math.floor(level / 3));

  for (let i = 0; i < enemyCount; i++) {
    const isElite = roomType === ROOM_TYPES.CHAMBER && Math.random() < 0.2;
    const pool = isElite ? monsterConfig.elite : monsterConfig.common;
    const template = pool[Math.floor(Math.random() * pool.length)];

    const scaledHealth = Math.floor(template.health * (1 + level * 0.1));
    const scaledDamage = Math.floor(template.damage * (1 + level * 0.08));

    // Position enemies in formation
    const row = Math.floor(i / 3);
    const col = i % 3;
    const startX = ARENA_WIDTH / 2 - (Math.min(enemyCount, 3) - 1) * 80;
    const posX = startX + col * 160;
    const posY = 60 + row * 100;

    enemies.push({
      id: `enemy_${Date.now()}_${i}`,
      type: template.type,
      name: template.name,
      health: scaledHealth,
      maxHealth: scaledHealth,
      damage: scaledDamage,
      defense: template.defense || 0,
      attackSpeed: template.attackSpeed,
      moveSpeed: template.moveSpeed,
      attackRange: template.attackRange,
      aggroRange: template.aggroRange,
      xpReward: Math.floor(template.xpReward * (1 + level * 0.1)),
      goldReward: [
        Math.floor(template.goldReward[0] * (1 + level * 0.1)),
        Math.floor(template.goldReward[1] * (1 + level * 0.1))
      ],
      isElite: isElite,
      alive: true,
      // Real-time combat state
      aiState: AI_STATE.IDLE,
      position: { x: posX, y: posY },
      lastAttackTime: 0,
      isAttacking: false,
      attackAnimTimer: 0,
      hitFlashTimer: 0
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

  // Player dungeon state
  dungeonPlayerHealth: 100,
  dungeonPlayerMaxHealth: 100,
  dungeonPlayerMana: 100,
  dungeonPlayerMaxMana: 100,
  playerPosition: { x: ARENA_WIDTH / 2, y: ARENA_HEIGHT - 60 },
  playerAttackCooldown: 0,
  playerAttackSpeed: 1.0, // attacks per second

  // Damage numbers for visual feedback
  damageNumbers: [],

  // Skill cooldowns
  skillCooldowns: {},

  // Progress tracking
  bossDefeated: false,
  roomsCleared: 0,
  enemiesKilled: 0,
  killsByType: {}, // Track kills by enemy type for quests

  // Rewards (accumulated during dungeon run)
  collectedXP: 0,
  collectedGold: 0,
  collectedLoot: [],

  // Room transition state
  isTransitioning: false,
  transitionDirection: null,

  // === Actions ===

  /**
   * Enter a dungeon
   */
  enterDungeon: (dungeonType, level, playerStats) => {
    const seed = Date.now();
    const layout = generateDungeonLayout(dungeonType, level, seed);
    const entranceRoom = layout.getEntranceRoom();

    if (!entranceRoom) {
      console.error('[DungeonStore] Failed to create entrance room');
      return false;
    }

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
      combatLog: [{ type: 'system', message: `Entered ${dungeonType} Dungeon (Level ${level})`, timestamp: Date.now() }],
      selectedTargetId: enemies.length > 0 ? enemies[0].id : null,
      dungeonPlayerHealth: playerStats.health || 100,
      dungeonPlayerMaxHealth: playerStats.maxHealth || 100,
      dungeonPlayerMana: playerStats.mana || 100,
      dungeonPlayerMaxMana: playerStats.maxMana || 100,
      playerPosition: { x: ARENA_WIDTH / 2, y: ARENA_HEIGHT - 60 },
      playerAttackCooldown: 0,
      playerAttackSpeed: playerStats.attackSpeed || 1.0,
      damageNumbers: [],
      skillCooldowns: {},
      bossDefeated: false,
      roomsCleared: 0,
      enemiesKilled: 0,
      killsByType: {},
      collectedXP: 0,
      collectedGold: 0,
      collectedLoot: [],
      isTransitioning: false,
      transitionDirection: null
    });

    entranceRoom.setActive(true);
    return true;
  },

  /**
   * Move player position in the arena (real-time movement)
   */
  movePlayer: (dx, dy, deltaTime) => {
    const { playerPosition } = get();
    const moveSpeed = 200; // pixels per second

    const newX = Math.max(PLAYER_SIZE / 2, Math.min(ARENA_WIDTH - PLAYER_SIZE / 2,
      playerPosition.x + dx * moveSpeed * deltaTime
    ));
    const newY = Math.max(ARENA_HEIGHT / 2, Math.min(ARENA_HEIGHT - PLAYER_SIZE / 2,
      playerPosition.y + dy * moveSpeed * deltaTime
    ));

    set({ playerPosition: { x: newX, y: newY } });
  },

  /**
   * Move to an adjacent room
   */
  moveToRoom: (direction) => {
    const { activeDungeon, currentRoomId, dungeonType, dungeonLevel, currentEnemies } = get();

    if (!activeDungeon || !currentRoomId) return false;

    if (currentEnemies.some(e => e.alive)) {
      set((state) => ({
        combatLog: [...state.combatLog, { type: 'system', message: 'Clear all enemies before moving!', timestamp: Date.now() }]
      }));
      return false;
    }

    const currentRoom = activeDungeon.getRoom(currentRoomId);
    if (!currentRoom) return false;

    const targetRoomId = currentRoom.getConnection(direction);
    if (!targetRoomId) return false;

    const targetRoom = activeDungeon.getRoom(targetRoomId);
    if (!targetRoom) return false;

    // Start transition
    set({ isTransitioning: true, transitionDirection: direction });

    // After transition, update room
    setTimeout(() => {
      currentRoom.setActive(false);
      targetRoom.setActive(true);

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
        playerPosition: { x: ARENA_WIDTH / 2, y: ARENA_HEIGHT - 60 },
        damageNumbers: [],
        combatLog: [...state.combatLog, {
          type: 'system',
          message: `Entered ${targetRoom.type} room${enemies.length > 0 ? ` - ${enemies.length} enemies!` : ''}`,
          timestamp: Date.now()
        }],
        isTransitioning: false,
        transitionDirection: null
      }));
    }, 300); // Transition duration

    return true;
  },

  /**
   * Add a damage number to display
   */
  addDamageNumber: (x, y, damage, type = 'player', isCrit = false) => {
    const damageNum = {
      id: Date.now() + Math.random(),
      x,
      y,
      damage,
      type,
      isCrit,
      createdAt: Date.now()
    };

    set((state) => ({
      damageNumbers: [...state.damageNumbers, damageNum]
    }));
  },

  /**
   * Remove old damage numbers
   */
  cleanupDamageNumbers: () => {
    const now = Date.now();
    const maxAge = 1500; // 1.5 seconds

    set((state) => ({
      damageNumbers: state.damageNumbers.filter(d => now - d.createdAt < maxAge)
    }));
  },

  /**
   * Player attack - called when player clicks attack or presses attack key
   */
  attackEnemy: (enemyId, playerStats) => {
    const state = get();
    const { currentEnemies, dungeonPlayerHealth, playerAttackCooldown, dungeonLevel, playerPosition } = state;

    if (dungeonPlayerHealth <= 0) {
      return { success: false, message: 'You are defeated!' };
    }

    if (playerAttackCooldown > 0) {
      return { success: false, message: 'Attack on cooldown!' };
    }

    const enemyIndex = currentEnemies.findIndex(e => e.id === enemyId);
    if (enemyIndex === -1 || !currentEnemies[enemyIndex].alive) {
      return { success: false, message: 'Invalid target' };
    }

    const enemy = { ...currentEnemies[enemyIndex] };

    // Check attack range (distance to enemy)
    const dx = enemy.position.x - playerPosition.x;
    const dy = enemy.position.y - playerPosition.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const playerAttackRange = 100; // Player melee range

    if (distance > playerAttackRange) {
      return { success: false, message: 'Enemy too far!' };
    }

    // Calculate player damage (matches overworld formula)
    const baseDamage = playerStats.damage || 10;
    const isCrit = Math.random() * 100 < (playerStats.critChance || 5);
    const critMultiplier = isCrit ? (playerStats.critDamage || 150) / 100 : 1;
    const rawDamage = Math.floor(baseDamage * critMultiplier);

    // Apply enemy defense
    const actualDamage = Math.max(1, rawDamage - (enemy.defense || 0));

    // Apply damage to enemy
    enemy.health = Math.max(0, enemy.health - actualDamage);
    enemy.hitFlashTimer = 300; // Flash for 300ms

    const logEntries = [];
    logEntries.push({
      type: 'player',
      message: `You dealt ${actualDamage} damage to ${enemy.name}${isCrit ? ' (CRIT!)' : ''}`,
      timestamp: Date.now()
    });

    // Add damage number
    get().addDamageNumber(enemy.position.x, enemy.position.y, actualDamage, 'player', isCrit);

    let xpGained = 0;
    let goldGained = 0;
    let bossDefeated = false;
    let lootDropped = null;

    // Check boss phase transition
    if (enemy.isBoss && enemy.health > 0) {
      const healthPercent = enemy.health / enemy.maxHealth;
      const phaseThresholds = [0.66, 0.33, 0]; // Phase 2 at 66%, Phase 3 at 33%
      const maxPhases = enemy.maxPhases || 3;

      for (let phase = 2; phase <= maxPhases; phase++) {
        if (enemy.currentPhase < phase && healthPercent <= phaseThresholds[phase - 2]) {
          enemy.currentPhase = phase;
          enemy.attackSpeed = enemy.attackSpeed * 1.15; // 15% faster attacks each phase
          enemy.damage = Math.floor(enemy.damage * 1.1); // 10% more damage each phase

          // Play boss phase change sound
          audioManager.play('bossPhaseChange');

          logEntries.push({
            type: 'boss',
            message: `${enemy.name} enters Phase ${phase}! Attack increased!`,
            timestamp: Date.now()
          });

          // Trigger boss ability on phase change
          const ability = enemy.abilities?.[phase - 2];
          if (ability) {
            enemy.pendingAbility = ability;
            enemy.abilityTimer = 1.5; // 1.5 second delay before ability

            logEntries.push({
              type: 'boss',
              message: `${enemy.name} is preparing ${formatAbilityName(ability)}!`,
              timestamp: Date.now()
            });
          }
          break;
        }
      }
    }

    // Check if enemy died
    if (enemy.health <= 0) {
      enemy.alive = false;
      enemy.aiState = AI_STATE.DEATH;

      xpGained = enemy.xpReward;
      goldGained = Math.floor(
        enemy.goldReward[0] + Math.random() * (enemy.goldReward[1] - enemy.goldReward[0])
      );

      logEntries.push({
        type: 'reward',
        message: `${enemy.name} defeated! +${xpGained} XP, +${goldGained} gold`,
        timestamp: Date.now()
      });

      // Generate loot drop
      lootDropped = generateEnemyLoot(enemy, dungeonLevel);
      if (lootDropped) {
        logEntries.push({
          type: 'loot',
          message: `Loot dropped: ${lootDropped.name} (${lootDropped.rarity})`,
          timestamp: Date.now()
        });
      }

      if (enemy.isBoss) {
        bossDefeated = true;
        // Play boss defeated sound
        audioManager.play('bossDefeated');
        logEntries.push({
          type: 'boss',
          message: `BOSS DEFEATED! The dungeon is cleared!`,
          timestamp: Date.now()
        });
      }
    }

    // Calculate attack cooldown (matches overworld: 1000 / attackSpeed)
    const attackCooldownMs = 1000 / (playerStats.attackSpeed || 1.0);

    // Update state
    set((prevState) => {
      const newEnemies = [...prevState.currentEnemies];
      newEnemies[enemyIndex] = enemy;

      const aliveEnemies = newEnemies.filter(e => e.alive);

      let newRoomsCleared = prevState.roomsCleared;
      if (aliveEnemies.length === 0 && prevState.currentEnemies.some(e => e.alive)) {
        newRoomsCleared++;
      }

      const newLoot = lootDropped
        ? [...prevState.collectedLoot, lootDropped]
        : prevState.collectedLoot;

      // Track kills by type for quests
      const newKillsByType = { ...prevState.killsByType };
      if (enemy.health <= 0) {
        newKillsByType[enemy.type] = (newKillsByType[enemy.type] || 0) + 1;
      }

      return {
        currentEnemies: newEnemies,
        playerAttackCooldown: attackCooldownMs,
        combatLog: [...prevState.combatLog, ...logEntries],
        inCombat: aliveEnemies.length > 0,
        selectedTargetId: aliveEnemies.length > 0 ? aliveEnemies[0].id : null,
        collectedXP: prevState.collectedXP + xpGained,
        collectedGold: prevState.collectedGold + goldGained,
        collectedLoot: newLoot,
        enemiesKilled: prevState.enemiesKilled + (enemy.health <= 0 ? 1 : 0),
        killsByType: newKillsByType,
        roomsCleared: newRoomsCleared,
        bossDefeated: prevState.bossDefeated || bossDefeated
      };
    });

    return {
      success: true,
      lootDropped,
      damage: actualDamage,
      isCrit,
      enemyKilled: enemy.health <= 0,
      xpGained,
      goldGained
    };
  },

  /**
   * Main game loop update - called every frame
   * Updates enemy AI, attacks, cooldowns, etc.
   */
  update: (deltaTime, playerStats) => {
    const state = get();
    const {
      inDungeon,
      currentEnemies,
      dungeonPlayerHealth,
      playerPosition,
      playerAttackCooldown,
      dungeonType,
      dungeonLevel
    } = state;

    if (!inDungeon || dungeonPlayerHealth <= 0) return;

    // Update player attack cooldown
    const newPlayerCooldown = Math.max(0, playerAttackCooldown - deltaTime * 1000);

    // Track new enemies to spawn from boss abilities
    const enemiesToSpawn = [];
    const abilityLogs = [];

    // Update enemy AI and attacks
    const now = Date.now();
    const newEnemies = currentEnemies.map(enemy => {
      if (!enemy.alive) return enemy;

      const updatedEnemy = { ...enemy };

      // Process boss ability timer
      if (updatedEnemy.isBoss && updatedEnemy.pendingAbility && updatedEnemy.abilityTimer > 0) {
        updatedEnemy.abilityTimer -= deltaTime;

        if (updatedEnemy.abilityTimer <= 0) {
          // Execute the ability!
          const abilityName = updatedEnemy.pendingAbility;
          const ability = BOSS_ABILITIES[abilityName];

          if (ability) {
            updatedEnemy.aiState = AI_STATE.ABILITY;

            // Play boss ability sound
            audioManager.play('bossAbility');

            // Log the ability message
            abilityLogs.push({
              type: 'boss',
              message: ability.message,
              timestamp: Date.now()
            });

            // Execute based on ability type
            switch (ability.type) {
              case 'summon': {
                // Spawn minions
                const monsterConfig = DUNGEON_MONSTERS[dungeonType] || DUNGEON_MONSTERS.CAVE;
                const spawnTemplate = monsterConfig.common.find(m => m.type === ability.spawnType) || monsterConfig.common[0];

                for (let i = 0; i < ability.spawnCount; i++) {
                  const scaledHealth = Math.floor(spawnTemplate.health * (1 + dungeonLevel * 0.1));
                  const scaledDamage = Math.floor(spawnTemplate.damage * (1 + dungeonLevel * 0.08));

                  // Position spawns around boss
                  const angle = (i / ability.spawnCount) * Math.PI * 2;
                  const spawnDist = 80;
                  const spawnX = updatedEnemy.position.x + Math.cos(angle) * spawnDist;
                  const spawnY = updatedEnemy.position.y + Math.sin(angle) * spawnDist;

                  enemiesToSpawn.push({
                    id: `spawn_${Date.now()}_${i}`,
                    type: spawnTemplate.type,
                    name: spawnTemplate.name,
                    health: scaledHealth,
                    maxHealth: scaledHealth,
                    damage: scaledDamage,
                    defense: spawnTemplate.defense || 0,
                    attackSpeed: spawnTemplate.attackSpeed,
                    moveSpeed: spawnTemplate.moveSpeed,
                    attackRange: spawnTemplate.attackRange,
                    aggroRange: spawnTemplate.aggroRange,
                    xpReward: Math.floor(spawnTemplate.xpReward * 0.5), // Reduced XP for spawned adds
                    goldReward: [
                      Math.floor(spawnTemplate.goldReward[0] * 0.5),
                      Math.floor(spawnTemplate.goldReward[1] * 0.5)
                    ],
                    alive: true,
                    aiState: AI_STATE.CHASE,
                    position: {
                      x: Math.max(ENEMY_SIZE / 2, Math.min(ARENA_WIDTH - ENEMY_SIZE / 2, spawnX)),
                      y: Math.max(ENEMY_SIZE / 2, Math.min(ARENA_HEIGHT / 2, spawnY))
                    },
                    lastAttackTime: 0,
                    isAttacking: false,
                    attackAnimTimer: 0,
                    hitFlashTimer: 0
                  });
                }
                break;
              }

              case 'damage': {
                // Deal damage to player
                const baseDamage = updatedEnemy.damage * (ability.damageMultiplier || 1.5);
                const defenseReduction = (playerStats.defense || 0) * 0.5;
                const finalDamage = Math.max(1, Math.floor(baseDamage - defenseReduction));

                // Apply damage with slight delay for visual effect
                setTimeout(() => {
                  const currentState = get();
                  if (currentState.dungeonPlayerHealth > 0) {
                    get().addDamageNumber(
                      currentState.playerPosition.x,
                      currentState.playerPosition.y,
                      finalDamage,
                      'boss',
                      true // Boss abilities show as crits
                    );

                    set((s) => ({
                      dungeonPlayerHealth: Math.max(0, s.dungeonPlayerHealth - finalDamage)
                    }));
                  }
                }, 200);
                break;
              }

              case 'heal': {
                // Heal the boss
                const healAmount = Math.floor(updatedEnemy.maxHealth * ability.healPercent);
                updatedEnemy.health = Math.min(updatedEnemy.maxHealth, updatedEnemy.health + healAmount);

                // Show heal number on boss
                get().addDamageNumber(
                  updatedEnemy.position.x,
                  updatedEnemy.position.y,
                  healAmount,
                  'heal',
                  false
                );
                break;
              }

              case 'buff': {
                // Apply temporary buff to boss
                updatedEnemy.attackSpeed = updatedEnemy.attackSpeed * (1 + (ability.attackSpeedBonus || 0));
                updatedEnemy.buffDuration = ability.duration || 5;
                updatedEnemy.isBuffed = true;
                break;
              }

              case 'drain': {
                // Damage player and heal boss
                const drainDamage = Math.floor(updatedEnemy.damage * (ability.damageMultiplier || 1.5));
                const drainHeal = Math.floor(drainDamage * (ability.healPercent || 0.5));

                setTimeout(() => {
                  const currentState = get();
                  if (currentState.dungeonPlayerHealth > 0) {
                    get().addDamageNumber(
                      currentState.playerPosition.x,
                      currentState.playerPosition.y,
                      drainDamage,
                      'boss',
                      true
                    );

                    set((s) => ({
                      dungeonPlayerHealth: Math.max(0, s.dungeonPlayerHealth - drainDamage)
                    }));
                  }
                }, 200);

                updatedEnemy.health = Math.min(updatedEnemy.maxHealth, updatedEnemy.health + drainHeal);
                get().addDamageNumber(
                  updatedEnemy.position.x,
                  updatedEnemy.position.y,
                  drainHeal,
                  'heal',
                  false
                );
                break;
              }

              default:
                // Unknown ability type - no action
                break;
            }
          }

          // Clear the pending ability
          updatedEnemy.pendingAbility = null;
          updatedEnemy.abilityTimer = 0;
        }
      }

      // Update buff duration
      if (updatedEnemy.isBuffed && updatedEnemy.buffDuration > 0) {
        updatedEnemy.buffDuration -= deltaTime;
        if (updatedEnemy.buffDuration <= 0) {
          // Buff expired - reset attack speed (approximately)
          updatedEnemy.isBuffed = false;
        }
      }

      // Calculate distance to player
      const dx = playerPosition.x - enemy.position.x;
      const dy = playerPosition.y - enemy.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Update hit flash timer
      if (updatedEnemy.hitFlashTimer > 0) {
        updatedEnemy.hitFlashTimer = Math.max(0, updatedEnemy.hitFlashTimer - deltaTime * 1000);
      }

      // Update attack animation timer
      if (updatedEnemy.attackAnimTimer > 0) {
        updatedEnemy.attackAnimTimer = Math.max(0, updatedEnemy.attackAnimTimer - deltaTime * 1000);
        updatedEnemy.isAttacking = updatedEnemy.attackAnimTimer > 0;
      }

      // AI State Machine (simplified from overworld)
      if (distance <= enemy.attackRange) {
        // In attack range
        updatedEnemy.aiState = AI_STATE.ATTACK;

        // Check attack cooldown
        const attackCooldownMs = 1000 / enemy.attackSpeed;
        const timeSinceAttack = now - (enemy.lastAttackTime || 0);

        if (timeSinceAttack >= attackCooldownMs) {
          // Perform attack!
          updatedEnemy.lastAttackTime = now;
          updatedEnemy.isAttacking = true;
          updatedEnemy.attackAnimTimer = 300; // Attack animation duration

          // Calculate damage (with player defense and blocking)
          const rawDamage = enemy.damage;
          const defenseReduction = (playerStats.defense || 0) * 0.5;
          const finalDamage = Math.max(1, Math.floor(rawDamage - defenseReduction));

          // Apply damage after a small delay (animation)
          setTimeout(() => {
            const currentState = get();
            if (currentState.dungeonPlayerHealth > 0) {
              // Check dodge
              const dodged = Math.random() * 100 < (playerStats.dodgeChance || 5);

              if (dodged) {
                audioManager.play('dodge');
                get().addDamageNumber(currentState.playerPosition.x, currentState.playerPosition.y, 0, 'dodge', false);
                set((s) => ({
                  combatLog: [...s.combatLog, {
                    type: 'enemy',
                    message: `${enemy.name} attacks but you dodged!`,
                    timestamp: Date.now()
                  }]
                }));
              } else {
                audioManager.play('playerHit');
                get().addDamageNumber(currentState.playerPosition.x, currentState.playerPosition.y, finalDamage, 'enemy', false);

                set((s) => ({
                  dungeonPlayerHealth: Math.max(0, s.dungeonPlayerHealth - finalDamage),
                  combatLog: [...s.combatLog, {
                    type: 'enemy',
                    message: `${enemy.name} hits you for ${finalDamage} damage`,
                    timestamp: Date.now()
                  }]
                }));
              }
            }
          }, 150); // Damage applies 150ms after attack starts
        }
      } else if (distance <= enemy.aggroRange) {
        // Chase player
        updatedEnemy.aiState = AI_STATE.CHASE;

        // Move towards player
        const dirX = dx / distance;
        const dirY = dy / distance;
        const moveAmount = enemy.moveSpeed * deltaTime * 60; // Scale for 60fps baseline

        updatedEnemy.position = {
          x: Math.max(ENEMY_SIZE / 2, Math.min(ARENA_WIDTH - ENEMY_SIZE / 2,
            enemy.position.x + dirX * moveAmount
          )),
          y: Math.max(ENEMY_SIZE / 2, Math.min(ARENA_HEIGHT / 2,
            enemy.position.y + dirY * moveAmount
          ))
        };
      } else {
        // Idle
        updatedEnemy.aiState = AI_STATE.IDLE;
      }

      // Flee behavior for low health enemies (if configured)
      if (enemy.canFlee && updatedEnemy.health / updatedEnemy.maxHealth < 0.3) {
        updatedEnemy.aiState = AI_STATE.FLEE;

        // Move away from player
        const dirX = -dx / (distance || 1);
        const dirY = -dy / (distance || 1);
        const moveAmount = enemy.moveSpeed * 1.2 * deltaTime * 60;

        updatedEnemy.position = {
          x: Math.max(ENEMY_SIZE / 2, Math.min(ARENA_WIDTH - ENEMY_SIZE / 2,
            enemy.position.x + dirX * moveAmount
          )),
          y: Math.max(ENEMY_SIZE / 2, Math.min(ARENA_HEIGHT / 2,
            enemy.position.y + dirY * moveAmount
          ))
        };
      }

      return updatedEnemy;
    });

    // Update skill cooldowns
    const newSkillCooldowns = { ...state.skillCooldowns };
    for (const skillId in newSkillCooldowns) {
      if (newSkillCooldowns[skillId] > 0) {
        newSkillCooldowns[skillId] = Math.max(0, newSkillCooldowns[skillId] - deltaTime);
      }
    }

    // Cleanup old damage numbers
    get().cleanupDamageNumbers();

    // Combine existing enemies with newly spawned enemies from boss abilities
    const allEnemies = [...newEnemies, ...enemiesToSpawn];

    set((prevState) => ({
      currentEnemies: allEnemies,
      playerAttackCooldown: newPlayerCooldown,
      skillCooldowns: newSkillCooldowns,
      combatLog: abilityLogs.length > 0
        ? [...prevState.combatLog, ...abilityLogs]
        : prevState.combatLog,
      inCombat: allEnemies.some(e => e.alive)
    }));
  },

  /**
   * Use a skill in combat
   */
  useSkill: (skillId, skillData, playerStats) => {
    const { skillCooldowns, dungeonPlayerMana, currentEnemies, selectedTargetId, playerPosition } = get();

    const currentCooldown = skillCooldowns[skillId] || 0;
    if (currentCooldown > 0) {
      return { success: false, message: `Skill on cooldown (${currentCooldown.toFixed(1)}s)` };
    }

    const manaCost = skillData.manaCost || 0;
    if (dungeonPlayerMana < manaCost) {
      return { success: false, message: 'Not enough mana!' };
    }

    const logEntries = [];
    let totalDamage = 0;
    let healAmount = 0;

    // Play skill activation sound
    audioManager.play('skillActivate');

    if (skillData.type === 'damage') {
      const targets = skillData.aoe
        ? currentEnemies.filter(e => e.alive)
        : currentEnemies.filter(e => e.id === selectedTargetId && e.alive);

      const baseDamage = skillData.damage || playerStats.damage;
      const skillMultiplier = skillData.damageMultiplier || 1;

      targets.forEach((enemy) => {
        const damage = Math.max(1, Math.floor(baseDamage * skillMultiplier) - (enemy.defense || 0));
        enemy.health = Math.max(0, enemy.health - damage);
        enemy.hitFlashTimer = 300;
        totalDamage += damage;

        get().addDamageNumber(enemy.position.x, enemy.position.y, damage, 'skill', false);

        if (enemy.health <= 0) {
          enemy.alive = false;
          enemy.aiState = AI_STATE.DEATH;
        }
      });

      logEntries.push({
        type: 'skill',
        message: `${skillData.name} dealt ${totalDamage} total damage!`,
        timestamp: Date.now()
      });
    } else if (skillData.type === 'heal') {
      const { dungeonPlayerMaxHealth } = get();
      healAmount = Math.floor(skillData.healAmount || dungeonPlayerMaxHealth * 0.25);
      audioManager.play('heal');
      get().addDamageNumber(playerPosition.x, playerPosition.y, healAmount, 'heal', false);
      logEntries.push({
        type: 'skill',
        message: `${skillData.name} restored ${healAmount} health!`,
        timestamp: Date.now()
      });
    }

    set((state) => {
      const newEnemies = currentEnemies.map(e => ({ ...e }));
      const aliveEnemies = newEnemies.filter(e => e.alive);

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
   * Update skill cooldowns (legacy - now handled in update())
   */
  updateCooldowns: (deltaTime) => {
    // Cooldowns now updated in main update() function
  },

  /**
   * Heal player in dungeon
   */
  healPlayer: (amount) => {
    const { playerPosition } = get();
    get().addDamageNumber(playerPosition.x, playerPosition.y, amount, 'heal', false);
    set((state) => ({
      dungeonPlayerHealth: Math.min(state.dungeonPlayerMaxHealth, state.dungeonPlayerHealth + amount),
      combatLog: [...state.combatLog, { type: 'heal', message: `Healed for ${amount} HP`, timestamp: Date.now() }]
    }));
  },

  /**
   * Restore mana in dungeon
   */
  restoreMana: (amount) => {
    set((state) => ({
      dungeonPlayerMana: Math.min(state.dungeonPlayerMaxMana, state.dungeonPlayerMana + amount)
    }));
  },

  /**
   * Select a target enemy
   */
  selectTarget: (enemyId) => {
    set({ selectedTargetId: enemyId });
  },

  /**
   * Collect loot
   */
  collectLoot: (item) => {
    set((state) => ({
      collectedLoot: [...state.collectedLoot, item],
      combatLog: [...state.combatLog, { type: 'loot', message: `Found ${item.name}!`, timestamp: Date.now() }]
    }));
  },

  /**
   * Exit dungeon and collect rewards
   */
  exitDungeon: () => {
    const { collectedXP, collectedGold, collectedLoot, bossDefeated, roomsCleared, enemiesKilled, killsByType } = get();

    const rewards = {
      xp: collectedXP,
      gold: collectedGold,
      loot: collectedLoot,
      bossDefeated,
      roomsCleared,
      enemiesKilled,
      killsByType,
      completed: bossDefeated
    };

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
      playerPosition: { x: ARENA_WIDTH / 2, y: ARENA_HEIGHT - 60 },
      playerAttackCooldown: 0,
      damageNumbers: [],
      skillCooldowns: {},
      bossDefeated: false,
      roomsCleared: 0,
      enemiesKilled: 0,
      killsByType: {},
      collectedXP: 0,
      collectedGold: 0,
      collectedLoot: [],
      isTransitioning: false,
      transitionDirection: null
    });

    return rewards;
  },

  /**
   * Handle player death in dungeon
   */
  handlePlayerDeath: () => {
    const { collectedXP, collectedGold, roomsCleared, enemiesKilled, killsByType } = get();

    const rewards = {
      xp: Math.floor(collectedXP * 0.5),
      gold: Math.floor(collectedGold * 0.25),
      loot: [],
      bossDefeated: false,
      roomsCleared,
      enemiesKilled,
      killsByType,
      completed: false,
      died: true
    };

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
      playerPosition: { x: ARENA_WIDTH / 2, y: ARENA_HEIGHT - 60 },
      playerAttackCooldown: 0,
      damageNumbers: [],
      skillCooldowns: {},
      bossDefeated: false,
      roomsCleared: 0,
      enemiesKilled: 0,
      killsByType: {},
      collectedXP: 0,
      collectedGold: 0,
      collectedLoot: [],
      isTransitioning: false,
      transitionDirection: null
    });

    return rewards;
  },

  /**
   * Get available directions from current room
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
   */
  getCurrentRoom: () => {
    const { activeDungeon, currentRoomId } = get();
    if (!activeDungeon || !currentRoomId) return null;
    return activeDungeon.getRoom(currentRoomId);
  },

  /**
   * Check if player is dead
   */
  isPlayerDead: () => {
    return get().dungeonPlayerHealth <= 0;
  },

  /**
   * Clear combat log
   */
  clearCombatLog: () => {
    set({ combatLog: [] });
  },

  /**
   * Get arena dimensions
   */
  getArenaDimensions: () => ({
    width: ARENA_WIDTH,
    height: ARENA_HEIGHT,
    playerSize: PLAYER_SIZE,
    enemySize: ENEMY_SIZE
  }),

  /**
   * Save dungeon progress to localStorage
   * Called when player exits to menu or saves game
   */
  saveDungeonProgress: () => {
    const state = get();

    // Only save if in dungeon
    if (!state.inDungeon || !state.activeDungeon) {
      return false;
    }

    // Serialize dungeon layout
    const layoutData = state.activeDungeon.toJSON ? state.activeDungeon.toJSON() : {
      type: state.dungeonType,
      level: state.dungeonLevel,
      rooms: state.activeDungeon.rooms ? Array.from(state.activeDungeon.rooms.values()).map(r => ({
        id: r.id,
        type: r.type,
        gridPosition: r.gridPosition,
        connections: r.connections
      })) : []
    };

    const saveData = {
      version: 1,
      timestamp: Date.now(),

      // Dungeon info
      dungeonType: state.dungeonType,
      dungeonLevel: state.dungeonLevel,
      currentRoomId: state.currentRoomId,
      exploredRooms: Array.from(state.exploredRooms),
      layoutData,

      // Player state
      dungeonPlayerHealth: state.dungeonPlayerHealth,
      dungeonPlayerMaxHealth: state.dungeonPlayerMaxHealth,
      dungeonPlayerMana: state.dungeonPlayerMana,
      dungeonPlayerMaxMana: state.dungeonPlayerMaxMana,
      playerPosition: state.playerPosition,

      // Combat state (enemies need to be serializable)
      currentEnemies: state.currentEnemies.map(e => ({
        ...e,
        // Exclude functions and non-serializable data
        position: e.position,
        alive: e.alive,
        health: e.health,
        maxHealth: e.maxHealth
      })),

      // Progress tracking
      bossDefeated: state.bossDefeated,
      roomsCleared: state.roomsCleared,
      enemiesKilled: state.enemiesKilled,
      killsByType: state.killsByType,

      // Rewards
      collectedXP: state.collectedXP,
      collectedGold: state.collectedGold,
      collectedLoot: state.collectedLoot
    };

    try {
      localStorage.setItem('dungeonProgress', JSON.stringify(saveData));
      console.log('[DungeonStore] Dungeon progress saved');
      return true;
    } catch (err) {
      console.error('[DungeonStore] Failed to save dungeon progress:', err);
      return false;
    }
  },

  /**
   * Load dungeon progress from localStorage
   * Returns true if valid save found and loaded
   */
  loadDungeonProgress: (playerStats) => {
    try {
      const savedData = localStorage.getItem('dungeonProgress');
      if (!savedData) {
        return false;
      }

      const data = JSON.parse(savedData);

      // Validate save version
      if (data.version !== 1) {
        console.warn('[DungeonStore] Incompatible save version, clearing...');
        localStorage.removeItem('dungeonProgress');
        return false;
      }

      // Check if save is too old (24 hours)
      const maxAge = 24 * 60 * 60 * 1000;
      if (Date.now() - data.timestamp > maxAge) {
        console.warn('[DungeonStore] Save too old, clearing...');
        localStorage.removeItem('dungeonProgress');
        return false;
      }

      // Regenerate dungeon layout
      const layout = generateDungeonLayout(
        data.dungeonType,
        data.dungeonLevel,
        data.timestamp // Use timestamp as seed for consistency
      );

      // Restore explored rooms Set
      const exploredRooms = new Set(data.exploredRooms);

      // Restore enemies with full combat state
      const enemies = data.currentEnemies.map((e) => ({
        ...e,
        aiState: e.alive ? AI_STATE.IDLE : AI_STATE.DEATH,
        lastAttackTime: 0,
        isAttacking: false,
        attackAnimTimer: 0,
        hitFlashTimer: 0
      }));

      set({
        activeDungeon: layout,
        currentRoomId: data.currentRoomId,
        exploredRooms,
        inDungeon: true,
        dungeonType: data.dungeonType,
        dungeonLevel: data.dungeonLevel,

        currentEnemies: enemies,
        inCombat: enemies.some(e => e.alive),
        selectedTargetId: enemies.find(e => e.alive)?.id || null,

        dungeonPlayerHealth: data.dungeonPlayerHealth,
        dungeonPlayerMaxHealth: data.dungeonPlayerMaxHealth,
        dungeonPlayerMana: data.dungeonPlayerMana,
        dungeonPlayerMaxMana: data.dungeonPlayerMaxMana,
        playerPosition: data.playerPosition,
        playerAttackCooldown: 0,
        playerAttackSpeed: playerStats?.attackSpeed || 1.0,

        damageNumbers: [],
        skillCooldowns: {},
        combatLog: [{ type: 'system', message: 'Dungeon progress restored!', timestamp: Date.now() }],

        bossDefeated: data.bossDefeated,
        roomsCleared: data.roomsCleared,
        enemiesKilled: data.enemiesKilled,
        killsByType: data.killsByType,

        collectedXP: data.collectedXP,
        collectedGold: data.collectedGold,
        collectedLoot: data.collectedLoot,

        isTransitioning: false,
        transitionDirection: null
      });

      console.log('[DungeonStore] Dungeon progress loaded');
      return true;
    } catch (err) {
      console.error('[DungeonStore] Failed to load dungeon progress:', err);
      localStorage.removeItem('dungeonProgress');
      return false;
    }
  },

  /**
   * Clear saved dungeon progress
   */
  clearDungeonProgress: () => {
    try {
      localStorage.removeItem('dungeonProgress');
      console.log('[DungeonStore] Dungeon progress cleared');
      return true;
    } catch (err) {
      console.error('[DungeonStore] Failed to clear dungeon progress:', err);
      return false;
    }
  },

  /**
   * Check if there is saved dungeon progress
   */
  hasSavedProgress: () => {
    try {
      const savedData = localStorage.getItem('dungeonProgress');
      if (!savedData) return false;

      const data = JSON.parse(savedData);
      const maxAge = 24 * 60 * 60 * 1000;
      if (Date.now() - data.timestamp > maxAge) {
        localStorage.removeItem('dungeonProgress');
        return false;
      }

      return true;
    } catch (err) {
      return false;
    }
  }
}));

export default useDungeonStore;
