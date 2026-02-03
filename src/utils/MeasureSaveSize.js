/**
 * MeasureSaveSize.js - Measure realistic save file sizes
 * Run: node src/utils/MeasureSaveSize.js
 */

const GameStateSerializer = require('../persistence/GameStateSerializer');
const GridManager = require('../modules/foundation/GridManager');
const SpatialPartitioning = require('../modules/foundation/SpatialPartitioning');
const BuildingConfig = require('../modules/building-types/BuildingConfig');
const TierProgression = require('../modules/building-types/TierProgression');
const BuildingEffect = require('../modules/building-types/BuildingEffect');
const ProductionTick = require('../modules/resource-economy/ProductionTick');
const StorageManager = require('../modules/resource-economy/StorageManager');
const ConsumptionSystem = require('../modules/resource-economy/ConsumptionSystem');
const MoraleCalculator = require('../modules/resource-economy/MoraleCalculator');
const { TerritoryManager } = require('../modules/territory-town/TerritoryManager');
const TownManager = require('../modules/territory-town/TownManager');
const { NPCManager } = require('../modules/npc-system/NPCManager');
const { NPCAssignment } = require('../modules/npc-system/NPCAssignment');
const ModuleOrchestrator = require('../core/ModuleOrchestrator');
const GameEngine = require('../core/GameEngine');

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function createTestOrchestrator(buildingCount, npcCount) {
  const grid = new GridManager();
  const spatial = new SpatialPartitioning();
  const buildingConfig = new BuildingConfig();
  const tierProgression = new TierProgression(buildingConfig);
  const buildingEffect = new BuildingEffect(spatial, buildingConfig);
  const storage = new StorageManager();
  const productionTick = new ProductionTick(buildingConfig, buildingEffect, storage);
  const consumption = new ConsumptionSystem();
  const morale = new MoraleCalculator();
  const territoryManager = new TerritoryManager(buildingConfig);
  const townManager = new TownManager(buildingConfig);
  const npcManager = new NPCManager(townManager);
  const npcAssignment = new NPCAssignment(buildingConfig);

  const orchestrator = new ModuleOrchestrator({
    grid, spatial, buildingConfig, tierProgression, buildingEffect,
    productionTick, storage, consumption, morale,
    territoryManager, townManager, npcManager, npcAssignment
  });

  // Create initial territory
  orchestrator.territoryManager.createTerritory('territory-1', { x: 100, y: 50, z: 100 });

  // Place buildings
  const buildingTypes = ['FARM', 'HOUSE', 'WAREHOUSE', 'TOWN_CENTER', 'WATCHTOWER'];
  let buildingId = 0;

  for (let i = 0; i < buildingCount; i++) {
    const type = buildingTypes[i % buildingTypes.length];
    const building = {
      id: `building-${buildingId++}`,
      type,
      position: {
        x: 100 + (i % 10) * 5,
        y: 50 + Math.floor(i / 10) * 5,
        z: 100
      },
      health: 100
    };
    orchestrator.placeBuilding(building);
  }

  // Spawn NPCs
  for (let i = 0; i < npcCount; i++) {
    const roles = ['FARMER', 'CRAFTSMAN', 'GUARD', 'WORKER'];
    orchestrator.spawnNPC(
      roles[i % roles.length],
      { x: 100 + Math.random() * 20, y: 50, z: 100 + Math.random() * 20 }
    );
  }

  // Set resources
  storage.setResources({
    food: 5000,
    wood: 2000,
    stone: 2000,
    gold: 500,
    essence: 100,
    crystal: 50
  });

  return { orchestrator, engine: new GameEngine(orchestrator) };
}

// Test scenarios
const scenarios = [
  { buildings: 10, npcs: 5, label: 'Small Game' },
  { buildings: 50, npcs: 20, label: 'Medium Game' },
  { buildings: 100, npcs: 50, label: 'Large Game' },
  { buildings: 200, npcs: 100, label: 'Very Large Game' }
];

console.log('\n🎮 Voxel RPG Game - Save File Size Analysis\n');
console.log('=' .repeat(70));

const results = [];

for (const scenario of scenarios) {
  const { orchestrator, engine } = createTestOrchestrator(
    scenario.buildings,
    scenario.npcs
  );

  const serialized = GameStateSerializer.serialize(orchestrator, engine);
  const jsonString = JSON.stringify(serialized);
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
const storageTarget = 5 * 1024 * 1024; // 5MB limit for good UX

console.log(`Largest Save (${largestSave.label}): ${largestSave.jsonFormatted}`);
console.log(`Browser Storage Options:`);
console.log(`├─ localStorage: ${largestSave.jsonSize < 1024 * 1024 ? '✅ OK' : '❌ Too large'} (max 5-10MB)`);
console.log(`├─ IndexedDB:    ✅ OK (no size limit)`);
console.log(`└─ Compression:  ${largestSave.jsonSize > 500 * 1024 ? 'Recommended' : 'Optional'}`);

console.log(`\n💾 Storage Strategy for Phase 0:`);
if (largestSave.jsonSize < 1024 * 1024) {
  console.log(`  ✅ Use localStorage for saves < 1MB`);
  console.log(`  ✅ Use IndexedDB for saves > 1MB`);
  console.log(`  ⚠️  Add compression if save exceeds 500KB`);
} else {
  console.log(`  ✅ Use IndexedDB exclusively (with compression)`);
  console.log(`  💡 Consider removing history tracking in saves`);
}

console.log('\n' + '='.repeat(70) + '\n');
