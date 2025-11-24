const EconomySimulator = require('./EconomySimulator');

const simulator = new EconomySimulator();
simulator.setupScenario();

// Execute just ONE tick with debugging
console.log('\n=== DEBUGGING FIRST TICK ===\n');

const npcs = simulator.consumptionSystem.getAliveNPCs();
console.log(`NPCs: ${npcs.length}`);
npcs.forEach(npc => {
  console.log(`  - ${npc.id}: isWorking=${npc.isWorking}, assigned=${npc.assignedBuilding}`);
});

console.log(`\nBuildings:`);
simulator.productionSystem.getAllBuildings().forEach(b => {
  console.log(`  - ${b.type} (ID ${b.id}): baseRate=${b.baseRate}, assigned=${b.getAssignedNPCCount()} NPCs`);
});

console.log(`\nCalculating production for each building:`);
const moraleMultiplier = 0.975;

simulator.productionSystem.getAllBuildings().forEach(b => {
  if (!b.isProducing()) {
    console.log(`  ${b.type}: not producing`);
    return;
  }

  const npcCount = b.getAssignedNPCCount();
  const production = simulator.productionSystem.calculateProduction(b, npcCount, moraleMultiplier);

  console.log(`  ${b.type}:`);
  console.log(`    baseRate: ${b.baseRate}`);
  console.log(`    npcCount: ${npcCount}`);
  console.log(`    production: ${production}`);
});

console.log(`\nResources before tick: ${JSON.stringify(simulator.productionSystem.resources)}`);

// Manually execute production to see what's returned
const moraleResult = simulator.moraleCalculator.calculateTownMorale(
  simulator.consumptionSystem.getAliveNPCs(),
  simulator.productionSystem.resources.food,
  simulator.housingCapacity,
  simulator.expansionCount,
  0.5 / 12.0
);

console.log(`\nMorale multiplier: ${moraleResult}, ${moraleResult.toFixed(4)}`);

const productionLog = simulator.productionSystem.executeProductionTick(moraleResult);
console.log(`\nProductionLog from executeProductionTick: ${JSON.stringify(productionLog, null, 2)}`);

console.log(`\nResources after production: ${JSON.stringify(simulator.productionSystem.resources)}`);

// Now apply consumption
const consumptionResult = simulator.consumptionSystem.applyConsumptionTick(simulator.productionSystem.resources.food);
console.log(`\nConsumption result: ${JSON.stringify(consumptionResult, null, 2)}`);
