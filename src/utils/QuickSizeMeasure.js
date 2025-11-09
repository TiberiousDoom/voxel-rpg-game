/**
 * QuickSizeMeasure.js - Simpler save size measurement
 * Run: node src/utils/QuickSizeMeasure.js
 */

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function createMockGameState(buildings, npcs) {
  return {
    version: 1,
    timestamp: new Date().toISOString(),
    metadata: {
      gameTick: 1000,
      currentTier: 'SURVIVAL',
      isPaused: false,
      engineRunning: true,
      enginePaused: false
    },
    // Grid building data
    grid: {
      buildings: Array(buildings).fill(null).map((_, i) => ({
        id: `building-${i}`,
        type: ['FARM', 'HOUSE', 'WAREHOUSE', 'TOWN_CENTER', 'WATCHTOWER'][i % 5],
        position: { x: 100 + i, y: 50, z: 100 },
        health: 100
      })),
      width: 200,
      height: 100,
      depth: 200
    },
    // Spatial chunks (minimal)
    spatial: {
      chunkSize: 10,
      chunks: [],
      buildingChunks: []
    },
    // Resources
    storage: {
      storage: {
        food: 5000,
        wood: 2000,
        stone: 2000,
        gold: 500,
        essence: 100,
        crystal: 50
      },
      capacity: 5000,
      overflowPriority: ['wood', 'stone', 'gold', 'essence', 'crystal', 'food']
    },
    // Territories
    territory: {
      territories: [{
        id: 'territory-1',
        tier: 'SURVIVAL',
        center: { x: 100, y: 50, z: 100 },
        radius: 25,
        buildings: Array(buildings).fill(null).map((_, i) => `building-${i}`),
        expansionCount: 0
      }]
    },
    // NPCs
    npcs: {
      npcs: Array(npcs).fill(null).map((_, i) => ({
        id: `npc-${i}`,
        name: `NPC-${i}`,
        role: ['FARMER', 'CRAFTSMAN', 'GUARD'][i % 3],
        alive: true,
        health: 100,
        happiness: 50,
        morale: 0,
        position: { x: 100 + Math.random() * 20, y: 50, z: 100 },
        skills: {
          farming: 1.0 + (Math.random() * 0.5),
          crafting: 1.0,
          defense: 1.0,
          general: 1.0
        },
        assignedBuilding: `building-${i % buildings}`,
        status: 'working'
      })),
      totalSpawned: npcs,
      nextId: npcs + 1
    },
    // Additional state
    consumption: { npcs: [], happiness: 50 },
    morale: { currentMorale: 0, factors: {}, moraleState: 'NEUTRAL' },
    town: { npcs: [], buildingAssignments: [], happiness: 50 },
    tierProgression: {},
    buildingEffect: { activeEffects: [] },
    npcAssignments: { npcAssignments: [], buildingSlots: [] },
    engineState: {
      currentTier: 'SURVIVAL',
      buildings: [],
      npcs: [],
      storage: {},
      morale: 0,
      tick: 1000,
      frameCount: 60000,
      ticksElapsed: 1000
    }
  };
}

console.log('\n🎮 Voxel RPG Game - Save File Size Analysis\n');
console.log('='.repeat(70));

const scenarios = [
  { buildings: 10, npcs: 5, label: 'Small Game' },
  { buildings: 50, npcs: 20, label: 'Medium Game' },
  { buildings: 100, npcs: 50, label: 'Large Game' },
  { buildings: 200, npcs: 100, label: 'Very Large Game' }
];

const results = [];

for (const scenario of scenarios) {
  const gameState = createMockGameState(scenario.buildings, scenario.npcs);
  const jsonString = JSON.stringify(gameState);
  const jsonBytes = Buffer.byteLength(jsonString, 'utf8');

  results.push({
    label: scenario.label,
    buildings: scenario.buildings,
    npcs: scenario.npcs,
    jsonSize: jsonBytes,
    jsonFormatted: formatBytes(jsonBytes)
  });

  console.log(`\n📊 ${scenario.label}`);
  console.log('  Buildings: ' + scenario.buildings);
  console.log('  NPCs:      ' + scenario.npcs);
  console.log('  JSON Size: ' + formatBytes(jsonBytes) + ` (${jsonBytes.toLocaleString()} bytes)`);
  console.log('  Per Building: ' + formatBytes(jsonBytes / scenario.buildings).trim());
  console.log('  Per NPC:      ' + formatBytes(jsonBytes / scenario.npcs).trim());
}

console.log('\n' + '='.repeat(70));
console.log('\n📈 Storage Recommendations:\n');

const largestSave = results[results.length - 1];

console.log(`Largest Save (${largestSave.label}): ${largestSave.jsonFormatted}`);
console.log(`\nBrowser Storage Options:`);
console.log(`├─ localStorage: ${largestSave.jsonSize < 1024 * 1024 ? '✅ OK' : '❌ Too large'} (max 5-10MB)`);
console.log(`├─ IndexedDB:    ✅ OK (no size limit, async)`);
console.log(`└─ Compression:  ${largestSave.jsonSize > 500 * 1024 ? 'Highly Recommended' : 'Optional'}`);

console.log(`\n💾 Phase 0 Storage Strategy:`);
if (largestSave.jsonSize < 500 * 1024) {
  console.log(`  ✅ Use localStorage exclusively (simple, fast)`);
  console.log(`  ✅ No compression needed`);
  console.log(`  ✅ Good for MVP`);
} else if (largestSave.jsonSize < 5 * 1024 * 1024) {
  console.log(`  ✅ Use localStorage with compression (LZ4)`);
  console.log(`  ✅ Falls back to IndexedDB if > 5MB`);
  console.log(`  ✅ Balanced approach`);
} else {
  console.log(`  ✅ Use IndexedDB with compression`);
  console.log(`  ⚠️  Consider removing non-essential state from saves`);
}

console.log(`\n🚀 Estimated localStorage Capacity:`);
console.log(`  Saves possible: ${Math.floor((5 * 1024 * 1024) / largestSave.jsonSize)}`);
console.log(`  Recommended max: 3 slots (${formatBytes((3 * largestSave.jsonSize))})`);

console.log('\n' + '='.repeat(70) + '\n');
