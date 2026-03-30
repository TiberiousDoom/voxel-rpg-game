/**
 * debugCommands.js - Debug commands for testing
 *
 * Adds helper functions to window.debug for testing gameplay features
 */

/* eslint-disable no-console */

import { Monster } from '../entities/Monster.js';
import useGameStore from '../stores/useGameStore.js';
import './testMonsterAI.js'; // Import test suite

/**
 * Initialize debug commands
 * Call this in your main app initialization
 */
export function initDebugCommands() {
  if (typeof window === 'undefined') return;

  // Create debug namespace
  window.debug = window.debug || {};

  // Expose store for debugging
  window.useGameStore = useGameStore;

  /**
   * Debug: Check monster rendering pipeline
   */
  window.debug.checkMonsterPipeline = () => {
    const store = useGameStore.getState();
    console.log('🔍 Monster Rendering Pipeline Check:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('1. Store enemies:', store.enemies);
    console.log('   Count:', store.enemies?.length || 0);
    if (store.enemies && store.enemies.length > 0) {
      console.log('   First enemy:', store.enemies[0]);
      console.log('   Position:', store.enemies[0].position);
      console.log('   Type:', store.enemies[0].type);
      console.log('   Color:', store.enemies[0].color);
    }
    console.log('\n2. Player position:', store.player?.position);
    console.log('\n3. To check if rendering:');
    console.log('   - Open GameViewport component');
    console.log('   - Check if monsters prop is received');
    console.log('   - Check visibleMonsters filter');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  };

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

      // Create loot drops!
      useGameStore.getState().handleMonsterDeath(monster);

      // Remove after death animation (handled in store)
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

    // CRITICAL: Also update PlayerEntity if it exists (used by Monster AI!)
    if (window.playerEntity) {
      window.playerEntity.position.x = x;
      window.playerEntity.position.z = z;
    }

    console.log(`🚀 Teleported player to (${x}, ${z})`);
  };

  /**
   * Get player position
   * @returns {Object} Player position {x, z}
   */
  window.debug.getPlayerPos = () => {
    const player = useGameStore.getState().player;
    const storePos = { x: player.position[0], z: player.position[2] };

    console.log(`📍 Player Position:`);
    console.log(`   Store:  (${storePos.x.toFixed(1)}, ${storePos.z.toFixed(1)})`);

    if (window.playerEntity) {
      const entityPos = window.playerEntity.position;
      console.log(`   Entity: (${entityPos.x.toFixed(1)}, ${entityPos.z.toFixed(1)}) ← AI uses this!`);

      // Check if they match
      const diff = Math.sqrt(
        Math.pow(storePos.x - entityPos.x, 2) +
        Math.pow(storePos.z - entityPos.z, 2)
      );
      if (diff > 0.1) {
        console.warn(`   ⚠️  WARNING: Store and Entity positions differ by ${diff.toFixed(2)} tiles!`);
      } else {
        console.log(`   ✅ Synchronized`);
      }
    } else {
      console.warn(`   ⚠️  PlayerEntity not found (GameViewport not running?)`);
    }

    return storePos;
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
   * Spawn a patrolling monster
   * @param {string} type - Monster type
   * @param {number} x - Start X position
   * @param {number} z - Start Z position
   * @param {number} pathSize - Size of patrol path (default 5)
   * @param {number} level - Monster level
   */
  window.debug.spawnPatrolMonster = (type = 'GOBLIN', x = 15, z = 15, pathSize = 5, level = 1) => {
    const monster = new Monster(type, { x, z }, { level });

    // Create square patrol path
    monster.patrolPath = [
      { x: x, z: z },
      { x: x + pathSize, z: z },
      { x: x + pathSize, z: z + pathSize },
      { x: x, z: z + pathSize }
    ];

    monster.currentWaypointIndex = 0;
    // Set AI state to PATROL so it starts patrolling immediately
    monster.aiState = 'PATROL';

    useGameStore.getState().spawnMonster(monster);
    console.log(`✅ Spawned patrolling ${type} (Level ${level}) at (${x}, ${z})`);
    console.log(`   Path: ${pathSize}x${pathSize} square`);
    console.log(`   Waypoints: ${monster.patrolPath.length}`);
    console.log(`   💡 Monster will patrol until player gets within ${monster.aggroRange} tiles`);

    return monster;
  };

  /**
   * Test AI behavior - spawn a monster and watch it chase
   */
  window.debug.testAI = (type = 'SLIME') => {
    console.log(`🧠 Testing ${type} AI behavior...`);

    const player = useGameStore.getState().player;
    const playerX = player.position[0];
    const playerZ = player.position[2];

    // Spawn monster 20 tiles away (safely outside aggro range)
    const monster = window.debug.spawnMonster(type, playerX + 20, playerZ, 1);

    console.log(`✅ Spawned ${type} at (${monster.position.x}, ${monster.position.z})`);
    console.log(`📍 Player at (${playerX.toFixed(1)}, ${playerZ.toFixed(1)})`);
    console.log(`📏 Distance: 20 tiles`);
    console.log(`\n🎯 Walk toward the monster to trigger aggro (range: ${monster.aggroRange} tiles)`);
    console.log(`⚔️  Monster will chase when you get close enough`);
    console.log(`🗡️  Attack range: ${monster.attackRange} tiles`);

    return monster;
  };

  /**
   * Give materials to the player
   * @param {string} material - Material name (wood, stone, iron, coal, etc.) or 'all'
   * @param {number} amount - Amount to give (default 100)
   */
  window.debug.give = (material = 'all', amount = 100) => {
    const state = useGameStore.getState();
    const currentMaterials = state.inventory.materials;

    if (material === 'all') {
      const newMaterials = { ...currentMaterials };
      for (const mat of Object.keys(newMaterials)) {
        newMaterials[mat] = (newMaterials[mat] || 0) + amount;
      }
      useGameStore.setState({
        inventory: { ...state.inventory, materials: newMaterials },
      });
      console.log(`Added ${amount} of every material`);
      return;
    }

    if (!(material in currentMaterials)) {
      console.error(`Unknown material: "${material}". Available: ${Object.keys(currentMaterials).join(', ')}`);
      return;
    }

    useGameStore.setState({
      inventory: {
        ...state.inventory,
        materials: {
          ...currentMaterials,
          [material]: (currentMaterials[material] || 0) + amount,
        },
      },
    });
    console.log(`Added ${amount} ${material} (now: ${(currentMaterials[material] || 0) + amount})`);
  };

  /**
   * Give gold to the player
   * @param {number} amount - Amount of gold (default 500)
   */
  window.debug.giveGold = (amount = 500) => {
    const state = useGameStore.getState();
    const newGold = (state.inventory.gold || 0) + amount;
    useGameStore.setState({
      inventory: { ...state.inventory, gold: newGold },
    });
    console.log(`Added ${amount} gold (now: ${newGold})`);
  };

  /**
   * Give potions to the player
   * @param {number} amount - Number of potions (default 10)
   */
  window.debug.givePotions = (amount = 10) => {
    const state = useGameStore.getState();
    const newPotions = (state.inventory.potions || 0) + amount;
    useGameStore.setState({
      inventory: { ...state.inventory, potions: newPotions },
    });
    console.log(`Added ${amount} potions (now: ${newPotions})`);
  };

  /**
   * Show current inventory
   */
  window.debug.inventory = () => {
    const state = useGameStore.getState();
    console.log('Inventory:');
    console.log(`  Gold: ${state.inventory.gold}`);
    console.log(`  Potions: ${state.inventory.potions}`);
    console.log(`  Crystals: ${state.inventory.crystals}`);
    console.log('  Materials:');
    for (const [mat, qty] of Object.entries(state.inventory.materials)) {
      if (qty > 0) console.log(`    ${mat}: ${qty}`);
    }
  };

  // Show available commands
  console.log(`
🎮 Debug Commands Available:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Spawn Monsters:
  debug.spawnMonster(type, x, z, level)
  debug.spawnNearPlayer(type, distance, level)
  debug.spawnMonsterCircle(type, count, centerX, centerZ, radius, level)
  debug.spawnPatrolMonster(type, x, z, pathSize, level)
  debug.spawnTestArena()
  debug.testAI(type)

Manage Monsters:
  debug.getMonsters()
  debug.damageMonster(monsterId, damage)
  debug.damageAllMonsters(damage)
  debug.killAllMonsters()
  debug.clearMonsters()

Items & Inventory:
  debug.give(material, amount)     // e.g. debug.give('wood', 200)
  debug.give()                     // Give 100 of everything
  debug.giveGold(amount)           // e.g. debug.giveGold(500)
  debug.givePotions(amount)        // e.g. debug.givePotions(10)
  debug.inventory()                // Show current inventory

Utility:
  debug.getPlayerPos()
  debug.teleportPlayer(x, z)
  debug.checkMonsterPipeline()

Testing:
  testMonsterAI.quick()         // Quick verification test
  testMonsterAI.runAll()        // Full automated test suite
  testMonsterAI.aggro()         // Test aggro detection
  testMonsterAI.patrol()        // Test patrol behavior
  testMonsterAI.attack()        // Test attack behavior
  testMonsterAI.flee()          // Test flee behavior

Examples:
  testMonsterAI.quick()  // Run quick test
  debug.checkMonsterPipeline()  // Diagnose rendering issues
  debug.testAI('SLIME')  // Watch monster chase and attack!
  debug.spawnPatrolMonster('GOBLIN', 15, 15, 8, 2)  // Patrol in 8x8 square
  debug.spawnNearPlayer('GOBLIN', 8, 2)  // Spawn 8 tiles away

Monster Types: SLIME, GOBLIN, WOLF, SKELETON, ORC
Modifiers: ELITE, FAST, TANK, BERSERKER
AI States: IDLE → PATROL → CHASE → ATTACK → FLEE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
}

export default initDebugCommands;
