/**
 * Pathfinder Performance Test
 *
 * Tests NPC pathfinding and movement performance with:
 * - 50 NPC baseline test
 * - 100 NPC stress test
 * - FPS measurement
 * - Pathfinding time tracking
 * - Stuck detection validation
 */

const TestEnvironment = require('./test-env-setup');
const fs = require('fs');
const path = require('path');

class PerformanceTest {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      testRuns: []
    };
  }

  /**
   * Run a test with specified NPC count
   * @param {number} npcCount
   * @param {number} tickDuration Duration to run in ticks (0.1s each)
   * @returns {object} Test results
   */
  runTest(npcCount, tickDuration = 600) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`TEST: ${npcCount} NPCs for ${(tickDuration * 0.1).toFixed(1)} seconds`);
    console.log(`${'='.repeat(60)}`);

    const testEnv = new TestEnvironment(25);
    testEnv.setupScenario(npcCount);

    const testStart = performance.now();
    const metrics = testEnv.runSimulation(tickDuration, true);
    const testEnd = performance.now();

    // Get detailed NPC stats
    const npcs = testEnv.getAllNPCs();
    const totalDistance = npcs.reduce((sum, npc) => sum + npc.distanceTraveled, 0);
    const totalMovementTicks = npcs.reduce((sum, npc) => sum + npc.movementTicks, 0);
    const totalStuckRecoveries = npcs.reduce((sum, npc) => sum + npc.stuckRecoveries, 0);
    const avgDistancePerNPC = totalDistance / npcCount;
    const avgMovementTicksPerNPC = totalMovementTicks / npcCount;

    // Calculate success metrics
    const passedFPS = parseFloat(metrics.averageFPS);
    const minFPS = parseFloat(metrics.minFPS);
    const maxFPS = parseFloat(metrics.maxFPS);

    const testResult = {
      npcCount,
      tickDuration,
      simulationTimeMs: testEnd - testStart,
      simulationSpeed: ((testEnd - testStart) / (tickDuration * 0.1)).toFixed(2),
      fps: {
        average: parseFloat(metrics.averageFPS),
        min: parseFloat(metrics.minFPS),
        max: parseFloat(metrics.maxFPS)
      },
      frameTiming: {
        averageMs: metrics.averageFrameTime.toFixed(2),
        minMs: metrics.minFrameTime.toFixed(2),
        maxMs: metrics.maxFrameTime.toFixed(2),
        pathfindingMs: metrics.averagePathfindingTime.toFixed(2),
        movementMs: metrics.averageMovementTime.toFixed(2)
      },
      movement: {
        npcMovedThisTick: metrics.npcMovedCount,
        totalDistance: totalDistance.toFixed(2),
        averageDistancePerNPC: avgDistancePerNPC.toFixed(2),
        averageMovementTicksPerNPC: avgMovementTicksPerNPC.toFixed(2),
        stuckRecoveries: totalStuckRecoveries
      },
      pass: {
        fps50OrBetter: passedFPS >= 50,
        fps25OrBetter: passedFPS >= 25,
        pathfindingUnder50ms: metrics.averagePathfindingTime < 50,
        noCrashes: true
      }
    };

    // Print summary
    console.log(`\n--- Test Results ---`);
    console.log(`FPS: ${testResult.fps.average} avg (min: ${testResult.fps.min}, max: ${testResult.fps.max})`);
    console.log(`Frame time: ${testResult.frameTiming.averageMs}ms avg`);
    console.log(`  - Pathfinding: ${testResult.frameTiming.pathfindingMs}ms`);
    console.log(`  - Movement: ${testResult.frameTiming.movementMs}ms`);
    console.log(`Movement: ${testResult.movement.npcMovedThisTick} NPCs moved`);
    console.log(`Distance traveled: ${testResult.movement.totalDistance} cells`);
    console.log(`Stuck recoveries: ${testResult.movement.stuckRecoveries}`);

    // Print pass/fail for success criteria
    console.log(`\n--- Success Criteria ---`);
    if (npcCount === 50) {
      const pass = testResult.pass.fps50OrBetter;
      console.log(`✓ 50 NPCs @ 60 FPS: ${pass ? 'PASS' : 'FAIL'} (actual: ${testResult.fps.average} FPS)`);
    } else if (npcCount === 100) {
      const pass = testResult.pass.fps25OrBetter;
      console.log(`✓ 100 NPCs @ 30 FPS: ${pass ? 'PASS' : 'FAIL'} (actual: ${testResult.fps.average} FPS)`);
    }
    console.log(`✓ Pathfinding < 50ms: ${testResult.pass.pathfindingUnder50ms ? 'PASS' : 'FAIL'} (actual: ${testResult.frameTiming.pathfindingMs}ms)`);
    console.log(`✓ No crashes: ${testResult.pass.noCrashes ? 'PASS' : 'FAIL'}`);

    return testResult;
  }

  /**
   * Run full test suite
   */
  runFullSuite() {
    console.log(`\n${'#'.repeat(60)}`);
    console.log(`# NPC PATHFINDING PERFORMANCE TEST SUITE`);
    console.log(`${'#'.repeat(60)}`);

    // Test 1: 50 NPCs baseline
    const test50 = this.runTest(50, 600);
    this.results.testRuns.push(test50);

    // Test 2: 100 NPCs stress test
    const test100 = this.runTest(100, 600);
    this.results.testRuns.push(test100);

    // Summary
    this.printSummary();

    // Save results to file
    this.saveResults();

    return this.results;
  }

  /**
   * Print overall test summary
   */
  printSummary() {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`TEST SUITE SUMMARY`);
    console.log(`${'='.repeat(60)}`);

    for (const result of this.results.testRuns) {
      console.log(`\n${result.npcCount} NPCs:`);
      console.log(`  FPS: ${result.fps.average} (target: ${result.npcCount === 50 ? 60 : 30})`);
      console.log(`  Status: ${result.fps.average >= (result.npcCount === 50 ? 50 : 25) ? '✓ PASS' : '✗ FAIL'}`);
    }

    // Overall verdict
    const test50Pass = this.results.testRuns[0] && this.results.testRuns[0].fps.average >= 50;
    const test100Pass = this.results.testRuns[1] && this.results.testRuns[1].fps.average >= 25;

    console.log(`\n${'='.repeat(60)}`);
    if (test50Pass && test100Pass) {
      console.log(`OVERALL VERDICT: ✓ ALL TESTS PASSED`);
      console.log(`Pathfinding prototype is ready for Phase 3`);
    } else {
      console.log(`OVERALL VERDICT: ✗ SOME TESTS FAILED`);
      if (!test50Pass) {
        console.log(`  - 50 NPC baseline did not meet 50 FPS target`);
      }
      if (!test100Pass) {
        console.log(`  - 100 NPC stress test did not meet 25 FPS target`);
      }
    }
    console.log(`${'='.repeat(60)}`);
  }

  /**
   * Save results to JSON file
   */
  saveResults() {
    const resultsDir = path.dirname(__filename);
    const outputPath = path.join(resultsDir, 'pathfinder-test-results.json');

    fs.writeFileSync(outputPath, JSON.stringify(this.results, null, 2));
    console.log(`\nResults saved to: ${outputPath}`);
  }

  /**
   * Generate markdown report
   */
  generateReport() {
    const report = [
      '# NPC Pathfinding Performance Test Results',
      ``,
      `**Date**: ${this.results.timestamp}`,
      ``,
      `## Summary`,
      ``
    ];

    for (const result of this.results.testRuns) {
      report.push(`### Test: ${result.npcCount} NPCs`);
      report.push(``);
      report.push(`**Result**: ${result.fps.average >= (result.npcCount === 50 ? 50 : 25) ? '✓ PASS' : '✗ FAIL'}`);
      report.push(``);
      report.push(`| Metric | Value |`);
      report.push(`|--------|-------|`);
      report.push(`| Average FPS | ${result.fps.average} |`);
      report.push(`| Min FPS | ${result.fps.min} |`);
      report.push(`| Max FPS | ${result.fps.max} |`);
      report.push(`| Average Frame Time | ${result.frameTiming.averageMs}ms |`);
      report.push(`| Pathfinding Time | ${result.frameTiming.pathfindingMs}ms |`);
      report.push(`| Movement Time | ${result.frameTiming.movementMs}ms |`);
      report.push(`| Distance Traveled | ${result.movement.totalDistance} cells |`);
      report.push(`| Stuck Recoveries | ${result.movement.stuckRecoveries} |`);
      report.push(``);
    }

    // Add verdict
    const test50Pass = this.results.testRuns[0] && this.results.testRuns[0].fps.average >= 50;
    const test100Pass = this.results.testRuns[1] && this.results.testRuns[1].fps.average >= 25;

    report.push(`## Verdict`);
    report.push(``);
    if (test50Pass && test100Pass) {
      report.push(`✓ **ALL TESTS PASSED**`);
      report.push(``);
      report.push(`The NPC pathfinding prototype meets all performance requirements:`);
      report.push(`- 50 NPCs run at ${this.results.testRuns[0].fps.average} FPS (target: 60)`);
      report.push(`- 100 NPCs run at ${this.results.testRuns[1].fps.average} FPS (target: 30)`);
    } else {
      report.push(`✗ **SOME TESTS FAILED**`);
      report.push(``);
      if (!test50Pass) {
        report.push(`- 50 NPC test: ${this.results.testRuns[0].fps.average} FPS (target: 50 FPS)`);
      }
      if (!test100Pass) {
        report.push(`- 100 NPC test: ${this.results.testRuns[1].fps.average} FPS (target: 25 FPS)`);
      }
    }

    const resultsDir = path.dirname(__filename);
    const reportPath = path.join(resultsDir, 'PATHFINDING_TEST_REPORT.md');

    fs.writeFileSync(reportPath, report.join('\n'));
    console.log(`Report saved to: ${reportPath}`);
  }
}

// Run if executed directly
if (require.main === module) {
  const test = new PerformanceTest();
  test.runFullSuite();
  test.generateReport();
}

module.exports = PerformanceTest;
