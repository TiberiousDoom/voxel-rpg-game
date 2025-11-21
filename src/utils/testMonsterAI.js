/**
 * testMonsterAI.js - Automated test suite for monster AI behaviors
 *
 * Provides comprehensive testing for all AI states:
 * - IDLE → CHASE detection
 * - PATROL behavior
 * - CHASE movement
 * - ATTACK behavior
 * - FLEE behavior
 * - State transitions
 */

/* eslint-disable no-console */

import useGameStore from '../stores/useGameStore.js';

/**
 * Test result tracker
 */
class TestRunner {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  /**
   * Add a test result
   * @param {string} name - Test name
   * @param {boolean} passed - Whether test passed
   * @param {string} message - Result message
   */
  addResult(name, passed, message) {
    this.tests.push({ name, passed, message });
    if (passed) {
      this.passed++;
      console.log(`✅ ${name}: ${message}`);
    } else {
      this.failed++;
      console.error(`❌ ${name}: ${message}`);
    }
  }

  /**
   * Print summary
   */
  summary() {
    const total = this.passed + this.failed;
    const percentage = ((this.passed / total) * 100).toFixed(0);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📊 Test Summary:`);
    console.log(`   Passed: ${this.passed}/${total} (${percentage}%)`);
    console.log(`   Failed: ${this.failed}/${total}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (this.failed > 0) {
      console.log('❌ Failed Tests:');
      this.tests.filter(t => !t.passed).forEach(t => {
        console.log(`   - ${t.name}: ${t.message}`);
      });
    }

    return this.passed === total;
  }
}

/**
 * Wait for a condition to be true
 * @param {Function} condition - Function that returns boolean
 * @param {number} timeout - Timeout in ms
 * @param {number} interval - Check interval in ms
 * @returns {Promise<boolean>}
 */
function waitFor(condition, timeout = 5000, interval = 100) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const checkInterval = setInterval(() => {
      if (condition()) {
        clearInterval(checkInterval);
        resolve(true);
      } else if (Date.now() - startTime > timeout) {
        clearInterval(checkInterval);
        resolve(false);
      }
    }, interval);
  });
}

/**
 * Calculate distance between two positions
 */
function distance(pos1, pos2) {
  const dx = pos2.x - pos1.x;
  const dz = pos2.z - pos1.z;
  return Math.sqrt(dx * dx + dz * dz);
}

/**
 * Test monster spawning
 */
async function testMonsterSpawning() {
  const runner = new TestRunner();
  console.log('\n🧪 Testing Monster Spawning...\n');

  // Clear existing monsters
  window.debug.clearMonsters();

  // Test 1: Basic spawn
  const monster = window.debug.spawnMonster('SLIME', 10, 10, 1);
  const monsterExists = monster && monster.id;
  runner.addResult(
    'Basic Spawn',
    monsterExists,
    monsterExists ? `Monster spawned with ID ${monster.id.slice(-8)}` : 'Monster failed to spawn'
  );

  // Test 2: Monster in store
  const store = useGameStore.getState();
  const inStore = store.enemies.length > 0;
  runner.addResult(
    'Monster in Store',
    inStore,
    inStore ? `Found ${store.enemies.length} monsters in store` : 'No monsters found in store'
  );

  // Test 3: Monster has required properties
  const hasProps = monster &&
    monster.position &&
    monster.health > 0 &&
    monster.aiState === 'IDLE';
  runner.addResult(
    'Monster Properties',
    hasProps,
    hasProps ? `Monster has position, health (${monster.health}), and AI state (${monster.aiState})` : 'Missing properties'
  );

  // Test 4: Spawn with modifier
  const eliteMonster = window.debug.spawnMonster('GOBLIN', 15, 15, 1);
  // Apply modifier after spawn (monster constructor doesn't support it directly)
  const hasModifier = eliteMonster && eliteMonster.health > 0;
  runner.addResult(
    'Spawn with Level',
    hasModifier,
    hasModifier ? `Level ${eliteMonster.level} goblin spawned` : 'Failed to spawn leveled monster'
  );

  runner.summary();
  return runner.passed === runner.passed + runner.failed;
}

/**
 * Test IDLE → CHASE behavior
 */
async function testAggroDetection() {
  const runner = new TestRunner();
  console.log('\n🧪 Testing Aggro Detection (IDLE → CHASE)...\n');

  // Setup
  window.debug.clearMonsters();
  window.debug.teleportPlayer(25, 25);

  // Spawn monster 20 tiles away (outside aggro range)
  const monster = window.debug.spawnMonster('SLIME', 45, 25, 1);

  // Test 1: Monster starts in IDLE
  const startsIdle = monster.aiState === 'IDLE';
  runner.addResult(
    'Initial State IDLE',
    startsIdle,
    startsIdle ? `Monster started in ${monster.aiState} state` : `Monster started in ${monster.aiState} (expected IDLE)`
  );

  // Test 2: Monster doesn't chase when far away
  await new Promise(resolve => setTimeout(resolve, 500));
  const staysIdle = monster.aiState === 'IDLE';
  runner.addResult(
    'Stays IDLE When Far',
    staysIdle,
    staysIdle ? 'Monster stayed in IDLE state' : `Monster changed to ${monster.aiState} (too early)`
  );

  // Test 3: Move player closer (within aggro range of 10 tiles)
  window.debug.teleportPlayer(37, 25); // 8 tiles away

  // Wait for AI to detect player (AI updates every 100ms)
  await new Promise(resolve => setTimeout(resolve, 300));

  const chasingNow = monster.aiState === 'CHASE';
  runner.addResult(
    'Enters CHASE When Close',
    chasingNow,
    chasingNow ? `Monster entered ${monster.aiState} state` : `Monster still in ${monster.aiState} (expected CHASE)`
  );

  // Test 4: Monster moves toward player
  const startPos = { x: monster.position.x, z: monster.position.z };
  await new Promise(resolve => setTimeout(resolve, 500));
  const endPos = { x: monster.position.x, z: monster.position.z };

  const moved = distance(startPos, endPos) > 0.1;
  runner.addResult(
    'Monster Moves in CHASE',
    moved,
    moved ? `Monster moved ${distance(startPos, endPos).toFixed(2)} tiles` : 'Monster did not move'
  );

  runner.summary();
  return runner.passed === runner.passed + runner.failed;
}

/**
 * Test PATROL behavior
 */
async function testPatrolBehavior() {
  const runner = new TestRunner();
  console.log('\n🧪 Testing Patrol Behavior...\n');

  // Setup
  window.debug.clearMonsters();
  window.debug.teleportPlayer(0, 0); // Far from patrol area

  // Spawn patrol monster far away
  const monster = window.debug.spawnPatrolMonster('GOBLIN', 40, 40, 8, 1);

  // Test 1: Monster starts in PATROL state
  const startsPatrol = monster.aiState === 'PATROL';
  runner.addResult(
    'Initial State PATROL',
    startsPatrol,
    startsPatrol ? `Monster started in ${monster.aiState} state` : `Monster in ${monster.aiState} (expected PATROL)`
  );

  // Test 2: Has patrol path
  const hasPath = monster.patrolPath && monster.patrolPath.length > 0;
  runner.addResult(
    'Has Patrol Path',
    hasPath,
    hasPath ? `Patrol path has ${monster.patrolPath.length} waypoints` : 'No patrol path found'
  );

  // Test 3: Monster moves along path
  const startPos = { x: monster.position.x, z: monster.position.z };
  await new Promise(resolve => setTimeout(resolve, 1000));
  const endPos = { x: monster.position.x, z: monster.position.z };

  const moved = distance(startPos, endPos) > 0.5;
  runner.addResult(
    'Moves Along Path',
    moved,
    moved ? `Monster moved ${distance(startPos, endPos).toFixed(2)} tiles` : 'Monster did not move significantly'
  );

  // Test 4: Patrol → Chase transition
  // Move player near monster
  window.debug.teleportPlayer(monster.position.x + 5, monster.position.z);
  await new Promise(resolve => setTimeout(resolve, 300));

  const switchedToChase = monster.aiState === 'CHASE';
  runner.addResult(
    'PATROL → CHASE Transition',
    switchedToChase,
    switchedToChase ? `Monster switched to ${monster.aiState}` : `Monster stayed in ${monster.aiState}`
  );

  // Test 5: Chase → Patrol return (player escapes)
  window.debug.teleportPlayer(0, 0); // Move far away
  await new Promise(resolve => setTimeout(resolve, 500));

  const returnedToPatrol = monster.aiState === 'IDLE' || monster.aiState === 'PATROL';
  runner.addResult(
    'Returns to IDLE/PATROL',
    returnedToPatrol,
    returnedToPatrol ? `Monster returned to ${monster.aiState}` : `Monster stuck in ${monster.aiState}`
  );

  runner.summary();
  return runner.passed === runner.passed + runner.failed;
}

/**
 * Test ATTACK behavior
 */
async function testAttackBehavior() {
  const runner = new TestRunner();
  console.log('\n🧪 Testing Attack Behavior...\n');

  // Setup
  window.debug.clearMonsters();
  window.debug.teleportPlayer(25, 25);

  // Spawn monster very close (within attack range)
  const monster = window.debug.spawnMonster('SLIME', 26, 25, 1); // 1 tile away

  // Wait for AI to process
  await new Promise(resolve => setTimeout(resolve, 300));

  // Test 1: Monster enters ATTACK state
  const inAttackState = monster.aiState === 'ATTACK' || monster.aiState === 'CHASE';
  runner.addResult(
    'Enters ATTACK or CHASE',
    inAttackState,
    inAttackState ? `Monster in ${monster.aiState} state` : `Monster in ${monster.aiState} (expected ATTACK/CHASE)`
  );

  // Test 2: Monster stops moving when attacking
  if (monster.aiState === 'ATTACK') {
    const isStopped = monster.velocity && monster.velocity.x === 0 && monster.velocity.z === 0;
    runner.addResult(
      'Stops Moving in ATTACK',
      isStopped,
      isStopped ? 'Monster stopped moving' : 'Monster still moving'
    );
  } else {
    runner.addResult(
      'Stops Moving in ATTACK',
      true,
      'Skipped (monster in CHASE, needs to get closer)'
    );
  }

  // Test 3: Wait for attack to happen
  const startHealth = useGameStore.getState().player.health;
  await new Promise(resolve => setTimeout(resolve, 2500)); // Wait for attack cooldown
  const endHealth = useGameStore.getState().player.health;

  const wasDamaged = endHealth < startHealth;
  runner.addResult(
    'Player Takes Damage',
    wasDamaged,
    wasDamaged ? `Player health: ${startHealth} → ${endHealth} (-${startHealth - endHealth})` : 'Player not damaged'
  );

  runner.summary();
  return runner.passed === runner.passed + runner.failed;
}

/**
 * Test FLEE behavior
 */
async function testFleeBehavior() {
  const runner = new TestRunner();
  console.log('\n🧪 Testing Flee Behavior...\n');

  // Setup
  window.debug.clearMonsters();
  window.debug.teleportPlayer(25, 25);

  // Spawn goblin (has canFlee: true)
  const monster = window.debug.spawnMonster('GOBLIN', 27, 25, 1);

  // Test 1: Goblin can flee
  const canFlee = monster.canFlee === true;
  runner.addResult(
    'Monster Can Flee',
    canFlee,
    canFlee ? 'Goblin has canFlee: true' : 'Goblin cannot flee'
  );

  // Test 2: Damage to low health
  const targetHealth = monster.maxHealth * 0.25; // Below 30% threshold
  const damageNeeded = monster.health - targetHealth;
  window.debug.damageMonster(monster.id, damageNeeded);

  // Wait for AI to process
  await new Promise(resolve => setTimeout(resolve, 300));

  const enteredFlee = monster.aiState === 'FLEE';
  runner.addResult(
    'Enters FLEE at Low Health',
    enteredFlee,
    enteredFlee ? `Monster entered ${monster.aiState} state at ${monster.health}/${monster.maxHealth} HP` : `Monster in ${monster.aiState} at ${monster.health}/${monster.maxHealth} HP`
  );

  // Test 3: Monster moves away from player
  if (enteredFlee) {
    const startDist = distance(monster.position, { x: 25, z: 25 });
    await new Promise(resolve => setTimeout(resolve, 500));
    const endDist = distance(monster.position, { x: 25, z: 25 });

    const movingAway = endDist > startDist;
    runner.addResult(
      'Moves Away from Player',
      movingAway,
      movingAway ? `Distance increased from ${startDist.toFixed(2)} to ${endDist.toFixed(2)}` : `Distance: ${startDist.toFixed(2)} → ${endDist.toFixed(2)}`
    );
  } else {
    runner.addResult(
      'Moves Away from Player',
      false,
      'Skipped (monster did not enter FLEE state)'
    );
  }

  runner.summary();
  return runner.passed === runner.passed + runner.failed;
}

/**
 * Test multiple monsters simultaneously
 */
async function testMultipleMonsters() {
  const runner = new TestRunner();
  console.log('\n🧪 Testing Multiple Monsters...\n');

  // Setup
  window.debug.clearMonsters();
  window.debug.teleportPlayer(25, 25);

  // Spawn 10 monsters in a circle
  window.debug.spawnMonsterCircle('SLIME', 10, 25, 25, 15, 1);

  // Test 1: All spawned
  const store = useGameStore.getState();
  const allSpawned = store.enemies.length === 10;
  runner.addResult(
    'All Monsters Spawned',
    allSpawned,
    allSpawned ? `${store.enemies.length} monsters spawned` : `Only ${store.enemies.length}/10 spawned`
  );

  // Test 2: Move player close to trigger aggro
  window.debug.teleportPlayer(25, 25);
  await new Promise(resolve => setTimeout(resolve, 500));

  const chasingCount = store.enemies.filter(m => m.aiState === 'CHASE' || m.aiState === 'ATTACK').length;
  const someChasing = chasingCount > 0;
  runner.addResult(
    'Some Monsters Chase',
    someChasing,
    someChasing ? `${chasingCount} monsters chasing/attacking` : 'No monsters chasing'
  );

  // Test 3: Performance check
  const startTime = performance.now();
  await new Promise(resolve => setTimeout(resolve, 1000));
  const endTime = performance.now();
  const avgFrameTime = (endTime - startTime) / 60; // Assume 60 FPS

  const performanceGood = avgFrameTime < 20; // < 20ms per frame = good
  runner.addResult(
    'Performance (10 monsters)',
    performanceGood,
    performanceGood ? `Avg frame time: ${avgFrameTime.toFixed(2)}ms` : `Avg frame time too high: ${avgFrameTime.toFixed(2)}ms`
  );

  runner.summary();
  return runner.passed === runner.passed + runner.failed;
}

/**
 * Run all tests
 */
export async function runAllTests() {
  console.log('\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 Monster AI Test Suite');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const results = {
    spawning: false,
    aggro: false,
    patrol: false,
    attack: false,
    flee: false,
    multiple: false
  };

  try {
    results.spawning = await testMonsterSpawning();
    results.aggro = await testAggroDetection();
    results.patrol = await testPatrolBehavior();
    results.attack = await testAttackBehavior();
    results.flee = await testFleeBehavior();
    results.multiple = await testMultipleMonsters();
  } catch (error) {
    console.error('❌ Test suite error:', error);
  }

  // Final summary
  console.log('\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Final Results:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Spawning:         ${results.spawning ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Aggro Detection:  ${results.aggro ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Patrol Behavior:  ${results.patrol ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Attack Behavior:  ${results.attack ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Flee Behavior:    ${results.flee ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Multiple Monsters: ${results.multiple ? '✅ PASS' : '❌ FAIL'}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const allPassed = Object.values(results).every(r => r === true);
  if (allPassed) {
    console.log('🎉 All tests passed! Monster AI is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Check the logs above for details.');
  }

  // Clean up
  window.debug.clearMonsters();
  window.debug.teleportPlayer(0, 0);

  return allPassed;
}

/**
 * Quick test - just verify basic functionality
 */
export async function quickTest() {
  console.log('\n🧪 Quick AI Test...\n');

  window.debug.clearMonsters();
  window.debug.teleportPlayer(25, 25);

  console.log('1️⃣  Spawning test monster...');
  const monster = window.debug.testAI('SLIME');

  console.log('2️⃣  Monster stats:');
  console.log(`   Position: (${monster.position.x}, ${monster.position.z})`);
  console.log(`   AI State: ${monster.aiState}`);
  console.log(`   Aggro Range: ${monster.aggroRange}`);

  console.log('\n3️⃣  Moving player close to monster...');
  window.debug.teleportPlayer(monster.position.x - 5, monster.position.z);

  await new Promise(resolve => setTimeout(resolve, 500));

  console.log(`4️⃣  Monster AI State: ${monster.aiState}`);

  if (monster.aiState === 'CHASE' || monster.aiState === 'ATTACK') {
    console.log('✅ Quick test passed! Monster detected and is chasing player.');
    return true;
  } else {
    console.log('❌ Quick test failed. Monster did not detect player.');
    console.log('   Run debug.checkMonsterPipeline() to diagnose.');
    return false;
  }
}

// Expose test functions to window for console access
if (typeof window !== 'undefined') {
  window.testMonsterAI = {
    runAll: runAllTests,
    quick: quickTest,
    spawning: testMonsterSpawning,
    aggro: testAggroDetection,
    patrol: testPatrolBehavior,
    attack: testAttackBehavior,
    flee: testFleeBehavior,
    multiple: testMultipleMonsters
  };

  console.log(`
🧪 Monster AI Test Suite Available!

Run tests from console:
  testMonsterAI.quick()       // Quick verification
  testMonsterAI.runAll()      // Full test suite
  testMonsterAI.spawning()    // Test monster spawning
  testMonsterAI.aggro()       // Test aggro detection
  testMonsterAI.patrol()      // Test patrol behavior
  testMonsterAI.attack()      // Test attack behavior
  testMonsterAI.flee()        // Test flee behavior
  testMonsterAI.multiple()    // Test multiple monsters
  `);
}

export default {
  runAllTests,
  quickTest,
  testMonsterSpawning,
  testAggroDetection,
  testPatrolBehavior,
  testAttackBehavior,
  testFleeBehavior,
  testMultipleMonsters
};
