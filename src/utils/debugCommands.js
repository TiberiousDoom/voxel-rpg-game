/**
 * debugCommands.js - Debug commands for testing
 *
 * Adds helper functions to window.debug for testing gameplay features
 */

import { Monster } from '../entities/Monster.js';
import useGameStore from '../stores/useGameStore.js';

/**
 * Initialize debug commands
 * Call this in your main app initialization
 */
export function initDebugCommands() {
  if (typeof window === 'undefined') return;

  // Create debug namespace
  window.debug = window.debug || {};

  /**
   * Spawn a monster
   * @param {string} type - Monster type ('SLIME', 'GOBLIN', etc.)
   * @param {number} x - X position (optional, defaults to 10)
   * @param {number} z - Z position (optional, defaults to 10)
   * @param {number} level - Monster level (optional, defaults to 1)
   * @returns {Monster} The spawned monster
   */
  window.debug.spawnMonster = (type = 'SLIME', x = 10, z = 10, level = 1) => {
    try {
      const monster = new Monster(type, { x, z }, { level });
      useGameStore.getState().spawnMonster(monster);
      console.log(`✅ Spawned ${type} (Level ${level}) at (${x}, ${z})`, monster);
      return monster;
    } catch (error) {
      console.error('❌ Failed to spawn monster:', error);
      return null;
    }
  };

  /**
   * Spawn multiple monsters in a circle around a point
   * @param {string} type - Monster type
   * @param {number} count - Number of monsters
   * @param {number} centerX - Center X position
   * @param {number} centerZ - Center Z position
   * @param {number} radius - Spawn radius
   * @param {number} level - Monster level
   */
  window.debug.spawnMonsterCircle = (type = 'SLIME', count = 5, centerX = 15, centerZ = 15, radius = 5, level = 1) => {
    const monsters = [];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const x = centerX + Math.cos(angle) * radius;
      const z = centerZ + Math.sin(angle) * radius;
      const monster = window.debug.spawnMonster(type, x, z, level);
      if (monster) monsters.push(monster);
    }
    console.log(`✅ Spawned ${monsters.length} ${type}s in a circle`);
    return monsters;
  };

  /**
   * Damage a monster by ID
   * @param {string} monsterId - Monster ID (use getMonsters() to see IDs)
   * @param {number} damage - Damage amount
   */
  window.debug.damageMonster = (monsterId, damage = 10) => {
    const monsters = useGameStore.getState().enemies;
    const monster = monsters.find(m => m.id === monsterId || m.id.includes(monsterId));

    if (!monster) {
      console.error('❌ Monster not found. Use debug.getMonsters() to see active monsters.');
      return false;
    }

    const killed = monster.takeDamage(damage);
    console.log(`✅ Dealt ${damage} damage to ${monster.type} (${monster.health}/${monster.maxHealth} HP remaining)`);

    if (killed) {
      console.log(`💀 ${monster.type} was killed!`);
      // Set death time for fade animation
      useGameStore.getState().updateMonster(monster.id, { deathTime: Date.now() });

      // Remove after 1 second
      setTimeout(() => {
        useGameStore.getState().removeMonster(monster.id);
        console.log(`🗑️ Removed dead ${monster.type}`);
      }, 1000);
    }

    return true;
  };

  /**
   * Damage all monsters
   * @param {number} damage - Damage amount
   */
  window.debug.damageAllMonsters = (damage = 10) => {
    const monsters = useGameStore.getState().enemies;
    monsters.forEach(monster => {
      if (monster.alive) {
        window.debug.damageMonster(monster.id, damage);
      }
    });
  };

  /**
   * Get all active monsters
   * @returns {Array} List of monsters
   */
  window.debug.getMonsters = () => {
    const monsters = useGameStore.getState().enemies;
    console.log(`📊 Active monsters: ${monsters.length}`);
    monsters.forEach(m => {
      console.log(`  - ${m.type} (ID: ${m.id.slice(-8)}, HP: ${m.health}/${m.maxHealth}, State: ${m.aiState}, Level: ${m.level})`);
    });
    return monsters;
  };

  /**
   * Kill all monsters
   */
  window.debug.killAllMonsters = () => {
    const monsters = useGameStore.getState().enemies;
    monsters.forEach(monster => {
      monster.health = 0;
      monster.alive = false;
      monster.aiState = 'DEATH';
      useGameStore.getState().updateMonster(monster.id, { deathTime: Date.now() });
    });
    console.log(`💀 Killed ${monsters.length} monsters`);

    // Clean up after 1 second
    setTimeout(() => {
      useGameStore.getState().clearDeadMonsters();
      console.log('🗑️ Cleaned up dead monsters');
    }, 1000);
  };

  /**
   * Clear all monsters
   */
  window.debug.clearMonsters = () => {
    const count = useGameStore.getState().enemies.length;
    useGameStore.setState({ enemies: [] });
    console.log(`🗑️ Cleared ${count} monsters`);
  };

  /**
   * Teleport player near monsters for testing
   * @param {number} x - X position
   * @param {number} z - Z position
   */
  window.debug.teleportPlayer = (x = 10, z = 10) => {
    const player = useGameStore.getState().player;
    useGameStore.getState().setPlayerPosition([x, player.position[1], z]);
    console.log(`🚀 Teleported player to (${x}, ${z})`);
  };

  /**
   * Get player position
   * @returns {Object} Player position {x, z}
   */
  window.debug.getPlayerPos = () => {
    const player = useGameStore.getState().player;
    const pos = { x: player.position[0], z: player.position[2] };
    console.log(`📍 Player position: (${pos.x.toFixed(1)}, ${pos.z.toFixed(1)})`);
    return pos;
  };

  /**
   * Spawn monster near player
   * @param {string} type - Monster type
   * @param {number} distance - Distance from player (default 5)
   * @param {number} level - Monster level
   */
  window.debug.spawnNearPlayer = (type = 'SLIME', distance = 5, level = 1) => {
    const player = useGameStore.getState().player;
    const playerX = player.position[0];
    const playerZ = player.position[2];

    // Spawn in front of player (toward positive X)
    const x = playerX + distance;
    const z = playerZ;

    return window.debug.spawnMonster(type, x, z, level);
  };

  /**
   * Spawn test arena with various monsters
   */
  window.debug.spawnTestArena = () => {
    console.log('🏟️ Spawning test arena...');

    // Teleport player to center
    window.debug.teleportPlayer(25, 25);

    // Spawn different monster types in a circle
    const types = ['SLIME', 'GOBLIN'];
    const radius = 10;
    types.forEach((type, i) => {
      const angle = (i / types.length) * Math.PI * 2;
      const x = 25 + Math.cos(angle) * radius;
      const z = 25 + Math.sin(angle) * radius;
      window.debug.spawnMonster(type, x, z, 1);
    });

    console.log('✅ Test arena spawned! Monsters around player at (25, 25)');
  };

  /**
   * Test AI behavior - spawn a monster and watch it chase
   */
  window.debug.testAI = (type = 'SLIME') => {
    console.log(`🧠 Testing ${type} AI behavior...`);

    const player = useGameStore.getState().player;
    const playerX = player.position[0];
    const playerZ = player.position[2];

    // Spawn monster 15 tiles away (outside aggro range initially)
    const monster = window.debug.spawnMonster(type, playerX + 15, playerZ, 1);

    console.log(`✅ Spawned ${type} at (${monster.position.x}, ${monster.position.z})`);
    console.log(`📍 Player at (${playerX.toFixed(1)}, ${playerZ.toFixed(1)})`);
    console.log(`📏 Distance: ${Math.sqrt(Math.pow(15, 2)).toFixed(1)} tiles`);
    console.log(`\n🎯 Walk toward the monster to trigger aggro (range: ${monster.aggroRange} tiles)`);
    console.log(`⚔️  Monster will chase when you get close enough`);
    console.log(`🗡️  Attack range: ${monster.attackRange} tiles`);

    return monster;
  };

  // Show available commands
  console.log(`
🎮 Debug Commands Available:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Spawn Monsters:
  debug.spawnMonster(type, x, z, level)
  debug.spawnNearPlayer(type, distance, level)
  debug.spawnMonsterCircle(type, count, centerX, centerZ, radius, level)
  debug.spawnTestArena()
  debug.testAI(type)  👈 NEW! Test AI behavior

Manage Monsters:
  debug.getMonsters()
  debug.damageMonster(monsterId, damage)
  debug.damageAllMonsters(damage)
  debug.killAllMonsters()
  debug.clearMonsters()

Utility:
  debug.getPlayerPos()  👈 NEW! Get player position
  debug.teleportPlayer(x, z)

Examples:
  debug.testAI('SLIME')  // Watch monster chase and attack!
  debug.spawnNearPlayer('GOBLIN', 8, 2)  // Spawn 8 tiles away
  debug.spawnMonster('SLIME', 10, 10, 1)
  debug.spawnMonsterCircle('GOBLIN', 5, 15, 15, 8, 2)
  debug.getPlayerPos()
  debug.damageMonster('monster_123', 15)

Monster Types: SLIME, GOBLIN
AI States: IDLE → CHASE → ATTACK (FLEE for goblins at low HP)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
}

export default initDebugCommands;
