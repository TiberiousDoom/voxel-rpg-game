/**
 * Test Environment Setup
 *
 * Creates a 25x25x25 grid with:
 * - 5 buildings at corners/center
 * - Configurable number of NPCs
 * - Automatic pathfinding setup
 */

const NPCPathfinder = require('./NPCPathfinder');
const { NPCMovementSystem } = require('./NPCMovementSystem');

class Building {
  constructor(id, type, x, y, z) {
    this.id = id;
    this.type = type; // FARM, HOUSE, WATCHTOWER, MARKETPLACE, STORAGE
    this.position = { x, y, z };
    this.workSlots = 2;
    this.assignedNPCs = [];
  }
}

class TestEnvironment {
  constructor(gridSize = 25) {
    this.gridSize = gridSize;
    this.pathfinder = new NPCPathfinder(gridSize);
    this.movementSystem = new NPCMovementSystem(this.pathfinder, gridSize);
    this.buildings = [];
    this.npcs = [];
  }

  /**
   * Create buildings at strategic positions
   */
  createBuildings() {
    const buildings = [
      new Building(1, 'FARM', 2, 5, 2),
      new Building(2, 'HOUSE', 22, 5, 2),
      new Building(3, 'WATCHTOWER', 12, 5, 12),
      new Building(4, 'MARKETPLACE', 2, 5, 22),
      new Building(5, 'STORAGE', 22, 5, 22)
    ];

    // Add buildings as obstacles in pathfinder
    for (const building of buildings) {
      this.pathfinder.addObstacle(building.position.x, building.position.y, building.position.z);
      this.buildings.push(building);
    }

    console.log(`Created ${buildings.length} buildings`);
    return buildings;
  }

  /**
   * Spawn NPCs at random positions
   * @param {number} count Number of NPCs to spawn
   */
  spawnNPCs(count) {
    const spawnedNPCs = [];

    for (let i = 0; i < count; i++) {
      let x, y, z, attempts = 0;
      let validSpawn = false;

      // Find valid spawn position (not in a building, not out of bounds)
      while (!validSpawn && attempts < 100) {
        x = Math.floor(Math.random() * this.gridSize);
        y = Math.floor(Math.random() * this.gridSize);
        z = Math.floor(Math.random() * this.gridSize);

        if (this.pathfinder.isWalkable(x, y, z)) {
          validSpawn = true;
        }
        attempts++;
      }

      if (validSpawn) {
        const npc = this.movementSystem.spawnNPC(x, y, z);
        spawnedNPCs.push(npc);

        // Assign to random building
        const randomBuilding = this.buildings[Math.floor(Math.random() * this.buildings.length)];
        npc.assignToBuilding(randomBuilding.id, randomBuilding.position.x, randomBuilding.position.y, randomBuilding.position.z);
      }
    }

    console.log(`Spawned ${spawnedNPCs.length} NPCs`);
    return spawnedNPCs;
  }

  /**
   * Create a scenario with buildings and NPCs
   * @param {number} npcCount Number of NPCs to spawn
   */
  setupScenario(npcCount = 50) {
    console.log(`\n=== Setting up test environment (${this.gridSize}x${this.gridSize}x${this.gridSize} grid) ===`);

    this.createBuildings();
    this.spawnNPCs(npcCount);

    console.log(`\nEnvironment ready:`);
    console.log(`  - Grid size: ${this.gridSize}x${this.gridSize}x${this.gridSize}`);
    console.log(`  - Buildings: ${this.buildings.length}`);
    console.log(`  - NPCs: ${this.movementSystem.totalNPCs}`);
    console.log(`  - Free spaces: ${(this.gridSize ** 3) - (this.pathfinder.obstacles.size)}`);
  }

  /**
   * Run simulation for a given number of ticks
   * @param {number} ticks Number of 0.1s ticks to run
   * @param {boolean} verbose Log diagnostics every N ticks
   * @returns {object} Collected metrics
   */
  runSimulation(ticks = 600, verbose = true) {
    console.log(`\n=== Running simulation for ${ticks} ticks (${(ticks * 0.1).toFixed(1)}s) ===`);

    const metrics = {
      ticks: 0,
      frameTimeHistory: [],
      pathfindingTimeHistory: [],
      movementTimeHistory: [],
      npcMovedCount: 0,
      npcStuckCount: 0,
      averageFrameTime: 0,
      averagePathfindingTime: 0,
      averageMovementTime: 0,
      maxFrameTime: 0,
      minFrameTime: Infinity,
      stuckRecoveries: 0
    };

    const startTime = performance.now();

    for (let tick = 0; tick < ticks; tick++) {
      // Update NPC movement
      const result = this.movementSystem.updateAllNPCs();

      // Track metrics
      metrics.ticks++;
      metrics.frameTimeHistory.push(result.frameTime);
      metrics.pathfindingTimeHistory.push(result.pathfindingTime);
      metrics.movementTimeHistory.push(result.movementTime);
      metrics.npcMovedCount += result.movedCount;
      metrics.npcStuckCount += result.stuckCount;

      metrics.maxFrameTime = Math.max(metrics.maxFrameTime, result.frameTime);
      metrics.minFrameTime = Math.min(metrics.minFrameTime, result.frameTime);

      // Log periodic updates
      if (verbose && (tick + 1) % 100 === 0) {
        const elapsedSeconds = (tick + 1) * 0.1;
        const fps = tick > 0 ? (1000 / result.frameTime).toFixed(1) : 'N/A';
        console.log(
          `Tick ${tick + 1}/${ticks} (${elapsedSeconds.toFixed(1)}s) - ` +
          `FPS: ${fps}, Frame: ${result.frameTime.toFixed(2)}ms, ` +
          `Moved: ${result.movedCount}/${result.totalNPCs}`
        );
      }
    }

    const totalTime = performance.now() - startTime;

    // Calculate averages
    metrics.averageFrameTime = metrics.frameTimeHistory.reduce((a, b) => a + b, 0) / metrics.frameTimeHistory.length;
    metrics.averagePathfindingTime = metrics.pathfindingTimeHistory.reduce((a, b) => a + b, 0) / metrics.pathfindingTimeHistory.length;
    metrics.averageMovementTime = metrics.movementTimeHistory.reduce((a, b) => a + b, 0) / metrics.movementTimeHistory.length;

    // Calculate stuck recoveries
    metrics.stuckRecoveries = this.movementSystem.getAllNPCs().reduce((sum, npc) => sum + npc.stuckRecoveries, 0);

    // Calculate FPS metrics
    metrics.averageFPS = (1000 / metrics.averageFrameTime).toFixed(1);
    metrics.minFPS = (1000 / metrics.maxFrameTime).toFixed(1);
    metrics.maxFPS = metrics.minFrameTime === Infinity ? 'N/A' : (1000 / metrics.minFrameTime).toFixed(1);

    console.log(`\n=== Simulation Complete ===`);
    console.log(`Total elapsed time: ${totalTime.toFixed(0)}ms`);
    console.log(`Simulation speed: ${(totalTime / (ticks * 0.1)).toFixed(2)}x real-time`);

    return metrics;
  }

  /**
   * Print diagnostics
   */
  printDiagnostics() {
    const diagnostics = this.movementSystem.getDiagnostics();
    console.log('\n=== System Diagnostics ===');
    console.log(`Total NPCs: ${diagnostics.totalNPCs}`);
    console.log(`Moved last tick: ${diagnostics.movedLastTick}`);
    console.log(`Stuck NPCs: ${diagnostics.stuckCount}`);
    console.log(`Assigned to buildings: ${diagnostics.assignedCount}`);
    console.log(`\nLast frame timing:`);
    console.log(`  - Total: ${diagnostics.frameTime.toFixed(2)}ms`);
    console.log(`  - Pathfinding: ${diagnostics.pathfindingTime.toFixed(2)}ms`);
    console.log(`  - Movement: ${diagnostics.movementTime.toFixed(2)}ms`);
  }

  /**
   * Get all NPCs
   * @returns {Array<NPC>}
   */
  getAllNPCs() {
    return this.movementSystem.getAllNPCs();
  }

  /**
   * Get specific NPC
   * @param {number} id
   * @returns {NPC}
   */
  getNPC(id) {
    return this.movementSystem.getNPC(id);
  }

  /**
   * Reassign NPCs to different buildings (for testing)
   */
  reassignNPCs() {
    const npcs = this.getAllNPCs();
    for (const npc of npcs) {
      const randomBuilding = this.buildings[Math.floor(Math.random() * this.buildings.length)];
      npc.assignToBuilding(randomBuilding.id, randomBuilding.position.x, randomBuilding.position.y, randomBuilding.position.z);
    }
  }
}

module.exports = TestEnvironment;
