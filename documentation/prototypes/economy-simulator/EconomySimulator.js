/**
 * Economy Simulator
 *
 * Orchestrates production, consumption, and morale systems.
 * Runs a simulation of the game economy.
 */

const { ProductionSystem } = require('./ProductionSystem');
const { ConsumptionSystem } = require('./ConsumptionSystem');
const MoraleCalculator = require('./MoraleCalculator');

class EconomySimulator {
  constructor() {
    this.moraleCalculator = new MoraleCalculator();
    this.productionSystem = new ProductionSystem(this.moraleCalculator);
    this.consumptionSystem = new ConsumptionSystem();

    // Simulation state
    this.currentTick = 0;
    this.simulationHistory = [];
    this.startTime = null;
    this.endTime = null;

    // Configuration
    this.housingCapacity = 10; // Number of NPCs the houses can support
    this.expansionCount = 0;
  }

  /**
   * Setup the test scenario
   */
  setupScenario() {
    console.log('=== Setting up test economy scenario ===\n');

    // Create buildings
    this.productionSystem.createBuilding(1, 'CAMPFIRE', { x: 0, y: 0, z: 0 });
    this.productionSystem.createBuilding(2, 'FARM', { x: 1, y: 0, z: 0 });
    this.productionSystem.createBuilding(3, 'FARM', { x: 2, y: 0, z: 0 });
    this.productionSystem.createBuilding(4, 'WORKSHOP', { x: 3, y: 0, z: 0 });
    this.productionSystem.createBuilding(5, 'STORAGE', { x: 4, y: 0, z: 0 });

    // Create NPCs
    const npc1 = this.consumptionSystem.createNPC('FARMER');
    const npc2 = this.consumptionSystem.createNPC('FARMER');
    const npc3 = this.consumptionSystem.createNPC('WORKER');

    // Assign NPCs to buildings
    const farm1 = this.productionSystem.getBuilding(2);
    const farm2 = this.productionSystem.getBuilding(3);
    const workshop = this.productionSystem.getBuilding(4);

    this.productionSystem.assignNPC(npc1, farm1);
    npc1.setWorking(farm1.id);

    this.productionSystem.assignNPC(npc2, farm2);
    npc2.setWorking(farm2.id);

    this.productionSystem.assignNPC(npc3, workshop);
    npc3.setWorking(workshop.id);

    // Set starting resources (based on ECONOMY_BALANCE.md SURVIVAL tier)
    // Start with 50 food to bootstrap economy (NPCs need to eat before production ramps up)
    this.productionSystem.addResources(50, 'food');
    this.productionSystem.addResources(50, 'wood');
    this.productionSystem.addResources(620, 'gold');

    // Housing capacity
    this.productionSystem.setStorageCapacity(2000);
    this.housingCapacity = 10;

    console.log('Buildings created:');
    for (const building of this.productionSystem.getAllBuildings()) {
      console.log(`  - ${building.type} (${building.baseRate} production)`);
    }

    console.log(`\nNPCs created: ${this.consumptionSystem.npcs.length}`);
    for (const npc of this.consumptionSystem.npcs) {
      console.log(`  - ${npc.role} (ID: ${npc.id})`);
    }

    console.log('\nStarting resources:');
    const summary = this.productionSystem.getResourceSummary();
    console.log(`  - Food: ${summary.food.toFixed(0)}`);
    console.log(`  - Wood: ${summary.wood.toFixed(0)}`);
    console.log(`  - Gold: ${summary.gold.toFixed(0)}`);
    console.log(`  - Storage: ${summary.totalUsage}/${summary.storageCapacity}`);

    console.log('\n');
  }

  /**
   * Run one production tick (5 seconds)
   */
  executeTick() {
    this.currentTick++;

    // Step 1: Calculate morale
    const npcs = this.consumptionSystem.getAliveNPCs();
    const foodAvailable = this.productionSystem.resources.food;
    this.moraleCalculator.calculateTownMorale(
      npcs,
      foodAvailable,
      this.housingCapacity,
      this.expansionCount,
      0.5 / 12.0 // NPC consumption per minute
    );

    // Get the actual production multiplier (not the morale value)
    const moraleMultiplier = this.moraleCalculator.getMoraleMultiplier();

    // Step 2: Production
    const productionLog = this.productionSystem.executeProductionTick(moraleMultiplier);

    // Step 3: Consumption
    const consumptionResult = this.consumptionSystem.applyConsumptionTick(this.productionSystem.resources.food);
    this.productionSystem.resources.food = consumptionResult.foodRemaining;

    // Step 4: Update happiness
    const foodPerNPC = npcs.length > 0 ? this.productionSystem.resources.food / npcs.length : 0;
    this.consumptionSystem.updateHappiness(foodPerNPC);

    // Step 5: Check storage overflow
    const overflowCheck = this.productionSystem.checkStorageOverflow();

    // Record tick
    const tickRecord = {
      tick: this.currentTick,
      resources: { ...this.productionSystem.resources },
      morale: this.moraleCalculator.getMoraleState(),
      npcs: {
        alive: npcs.length,
        working: npcs.filter(n => n.isWorking).length,
        avgHappiness: npcs.length > 0
          ? (npcs.reduce((sum, n) => sum + n.happiness, 0) / npcs.length).toFixed(1)
          : 0
      },
      production: productionLog.totalProduction || {},
      consumption: consumptionResult.log.totalConsumption,
      overflow: overflowCheck
    };

    this.simulationHistory.push(tickRecord);
    return tickRecord;
  }

  /**
   * Run simulation for specified ticks
   * 1 in-game hour = 720 ticks (720 × 5s = 3600s = 1 hour)
   */
  runSimulation(tickCount = 720, verbose = true) {
    console.log(`=== Running simulation for ${tickCount} ticks (${(tickCount * 5 / 60).toFixed(1)} minutes) ===\n`);

    this.startTime = performance.now();
    this.simulationHistory = [];
    this.currentTick = 0;

    for (let i = 0; i < tickCount; i++) {
      const tickResult = this.executeTick();

      // Log periodically
      if (verbose && (this.currentTick % 144 === 0)) { // Log every ~12 minutes
        const minutes = (this.currentTick * 5 / 60).toFixed(1);
        console.log(
          `Tick ${this.currentTick}/​${tickCount} (${minutes}m) - ` +
          `Food: ${tickResult.resources.food.toFixed(0)}, ` +
          `Morale: ${tickResult.morale.townMorale}, ` +
          `NPCs: ${tickResult.npcs.alive}`
        );
      }

      // Stop if all NPCs dead
      if (tickResult.npcs.alive === 0) {
        console.log(`\n⚠️  All NPCs starved at tick ${this.currentTick}`);
        break;
      }
    }

    this.endTime = performance.now();

    console.log(`\n=== Simulation Complete ===`);
    console.log(`Real time elapsed: ${((this.endTime - this.startTime) / 1000).toFixed(2)}s`);
    console.log(`Simulation speed: ${((tickCount * 5) / ((this.endTime - this.startTime) / 1000)).toFixed(2)}x real-time`);
  }

  /**
   * Get final state
   */
  getFinalState() {
    const lastTick = this.simulationHistory[this.simulationHistory.length - 1];

    if (!lastTick) {
      return null;
    }

    return {
      totalTicks: this.currentTick,
      totalTime: this.endTime - this.startTime,
      resources: lastTick.resources,
      morale: lastTick.morale,
      npcs: lastTick.npcs,
      consumptionStats: this.consumptionSystem.getConsumptionStats(),
      productionStats: this.getProductionStats()
    };
  }

  /**
   * Get production statistics
   */
  getProductionStats() {
    let totalProduced = {
      food: 0,
      wood: 0,
      stone: 0
    };

    for (const tick of this.simulationHistory) {
      for (const [resource, amount] of Object.entries(tick.production || {})) {
        if (totalProduced.hasOwnProperty(resource)) {
          totalProduced[resource] += amount;
        }
      }
    }

    return totalProduced;
  }

  /**
   * Print summary
   */
  printSummary() {
    const finalState = this.getFinalState();

    if (!finalState) {
      console.log('No simulation data available');
      return;
    }

    console.log('\n' + '='.repeat(60));
    console.log('SIMULATION SUMMARY');
    console.log('='.repeat(60));

    console.log(`\nDuration: ${finalState.totalTicks} ticks (${(finalState.totalTicks * 5 / 60).toFixed(1)} minutes)`);

    console.log(`\nFinal Resources:`);
    console.log(`  Food: ${finalState.resources.food.toFixed(0)}`);
    console.log(`  Wood: ${finalState.resources.wood.toFixed(0)}`);
    console.log(`  Stone: ${finalState.resources.stone.toFixed(0)}`);
    console.log(`  Gold: ${finalState.resources.gold.toFixed(0)}`);

    console.log(`\nProduction Summary:`);
    console.log(`  Total Food: ${finalState.productionStats.food.toFixed(0)}`);
    console.log(`  Total Wood: ${finalState.productionStats.wood.toFixed(0)}`);

    console.log(`\nConsumption Summary:`);
    console.log(`  Total Consumed: ${finalState.consumptionStats.totalConsumedSoFar} food`);
    console.log(`  NPCs Starved: ${finalState.consumptionStats.totalStarved}`);
    console.log(`  Final NPC Count: ${finalState.npcs.alive}`);

    console.log(`\nFinal Morale:`);
    console.log(`  Town Morale: ${finalState.morale.townMorale}`);
    console.log(`  Production Multiplier: ${finalState.morale.productionMultiplier}x`);
    console.log(`  State: ${finalState.morale.state}`);

    console.log(`\nAverage Happiness: ${finalState.npcs.avgHappiness}`);

    console.log('\n' + '='.repeat(60));
  }

  /**
   * Validate against ECONOMY_BALANCE.md expectations
   */
  validateBalance() {
    const finalState = this.getFinalState();

    if (!finalState) {
      console.log('No data to validate');
      return { pass: false, issues: ['No simulation data'] };
    }

    const issues = [];
    const minutes = finalState.totalTicks * 5 / 60;

    // Validation 1: Food production should exceed consumption
    const foodBalance = finalState.resources.food;
    if (foodBalance < -10) {
      issues.push(`Food went negative: ${foodBalance.toFixed(0)}`);
    }

    // Validation 2: NPCs should survive
    if (finalState.npcs.alive === 0) {
      issues.push('All NPCs starved - consumption too high or production too low');
    }

    // Validation 3: Morale should be reasonable
    if (finalState.morale.townMorale < -100) {
      issues.push('Morale dropped below minimum threshold');
    }

    // Validation 4: Economy should be stable
    const avgMorale = this.simulationHistory
      .reduce((sum, tick) => sum + (tick.morale?.townMorale || 0), 0) / this.simulationHistory.length;

    if (Math.abs(avgMorale) > 100) {
      issues.push('Average morale unstable');
    }

    return {
      pass: issues.length === 0,
      issues,
      metrics: {
        minutes,
        foodBalance: finalState.resources.food.toFixed(0),
        npcsSurvived: finalState.npcs.alive,
        averageMorale: avgMorale.toFixed(1)
      }
    };
  }
}

module.exports = EconomySimulator;
