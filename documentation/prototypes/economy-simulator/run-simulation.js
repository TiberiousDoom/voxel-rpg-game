/**
 * Economy Simulator Test Runner
 *
 * Runs a complete 1-hour (60-minute) in-game economy simulation
 * and validates results against ECONOMY_BALANCE.md expectations
 */

const EconomySimulator = require('./EconomySimulator');
const fs = require('fs');
const path = require('path');

console.log(`
${'#'.repeat(60)}
# ECONOMY SIMULATOR - 1 HOUR SIMULATION TEST
${'#'.repeat(60)}
`);

// Create simulator
const simulator = new EconomySimulator();

// Setup scenario
simulator.setupScenario();

// Run for 1 in-game hour
// 1 hour = 60 minutes = 3600 seconds
// Each tick = 5 seconds
// 3600 / 5 = 720 ticks
const TICKS_PER_HOUR = 720;
simulator.runSimulation(TICKS_PER_HOUR, true);

// Print summary
simulator.printSummary();

// Validate
console.log('\n' + '='.repeat(60));
console.log('VALIDATION');
console.log('='.repeat(60));

const validation = simulator.validateBalance();

if (validation.pass) {
  console.log('\n✓ VALIDATION PASSED\n');
} else {
  console.log('\n✗ VALIDATION FAILED\n');
  console.log('Issues:');
  for (const issue of validation.issues) {
    console.log(`  - ${issue}`);
  }
  console.log();
}

if (validation.metrics) {
  console.log('Key Metrics:');
  console.log(`  - Simulation duration: ${validation.metrics.minutes.toFixed(1)} minutes`);
  console.log(`  - Food balance: ${validation.metrics.foodBalance}`);
  console.log(`  - NPCs survived: ${validation.metrics.npcsSurvived}`);
  console.log(`  - Average morale: ${validation.metrics.averageMorale}`);
}

// Save detailed results
console.log('\n' + '='.repeat(60));
console.log('SAVING RESULTS');
console.log('='.repeat(60));

const finalState = simulator.getFinalState();
const results = {
  timestamp: new Date().toISOString(),
  duration: {
    ticks: simulator.currentTick,
    minutes: (simulator.currentTick * 5 / 60).toFixed(1),
    seconds: simulator.currentTick * 5
  },
  performance: {
    realTimeMs: simulator.endTime - simulator.startTime,
    simulationSpeedMultiplier: ((simulator.currentTick * 5 * 1000) / (simulator.endTime - simulator.startTime)).toFixed(2)
  },
  finalState,
  validation,
  history: simulator.simulationHistory
};

const resultsDir = path.dirname(__filename);
const outputPath = path.join(resultsDir, 'economy-simulation-results.json');

fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
console.log(`\nResults saved to: ${outputPath}`);

// Generate markdown report
generateReport(results, resultsDir);

console.log('\n' + '='.repeat(60));
console.log('SIMULATION COMPLETE');
console.log('='.repeat(60) + '\n');

if (validation.pass) {
  console.log('✓ Economy is BALANCED - ready for Phase 4');
} else {
  console.log('✗ Economy has ISSUES - may need adjustment');
}

/**
 * Generate markdown report
 */
function generateReport(results, resultsDir) {
  const lines = [
    '# Economy Simulator Results',
    '',
    `**Date**: ${results.timestamp}`,
    '',
    '## Summary',
    '',
    `- Duration: ${results.duration.minutes} minutes (${results.duration.ticks} ticks)`,
    `- Real time: ${(results.performance.realTimeMs / 1000).toFixed(2)}s`,
    `- Simulation speed: ${results.performance.simulationSpeedMultiplier}x`,
    '',
    '## Final State',
    '',
    '### Resources',
    `- Food: ${results.finalState.resources.food.toFixed(0)}`,
    `- Wood: ${results.finalState.resources.wood.toFixed(0)}`,
    `- Gold: ${results.finalState.resources.gold.toFixed(0)}`,
    '',
    '### NPCs',
    `- Alive: ${results.finalState.npcs.alive}`,
    `- Average Happiness: ${results.finalState.npcs.avgHappiness}`,
    `- Working: ${results.finalState.npcs.working}`,
    '',
    '### Morale',
    `- Town Morale: ${results.finalState.morale.townMorale}`,
    `- Production Multiplier: ${results.finalState.morale.productionMultiplier}x`,
    `- State: ${results.finalState.morale.state}`,
    '',
    '### Production',
    `- Total Food Produced: ${results.finalState.productionStats.food.toFixed(0)}`,
    `- Total Wood Produced: ${results.finalState.productionStats.wood.toFixed(0)}`,
    '',
    '### Consumption',
    `- Total Consumed: ${results.finalState.consumptionStats.totalConsumedSoFar} food`,
    `- NPCs Starved: ${results.finalState.consumptionStats.totalStarved}`,
    '',
    '## Validation',
    ''
  ];

  if (results.validation.pass) {
    lines.push('✓ **PASSED**');
  } else {
    lines.push('✗ **FAILED**');
    lines.push('');
    lines.push('Issues:');
    for (const issue of results.validation.issues) {
      lines.push(`- ${issue}`);
    }
  }

  lines.push('');
  lines.push('## Key Metrics');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('|--------|-------|');
  lines.push(`| Simulation Duration | ${results.duration.minutes} minutes |`);
  lines.push(`| Food Balance | ${results.finalState.resources.food.toFixed(0)} |`);
  lines.push(`| NPCs Survived | ${results.finalState.npcs.alive} |`);
  lines.push(`| Average Morale | ${results.validation.metrics.averageMorale} |`);
  lines.push(`| Production Multiplier | ${results.finalState.morale.productionMultiplier}x |`);
  lines.push('');

  const reportPath = path.join(resultsDir, 'ECONOMY_SIMULATOR_REPORT.md');
  fs.writeFileSync(reportPath, lines.join('\n'));
  console.log(`Report saved to: ${reportPath}`);
}

module.exports = { results, simulator };
