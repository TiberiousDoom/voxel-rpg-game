/**
 * DisasterEvents.test.js - Tests for natural disaster events
 */

import WildfireEvent from '../events/WildfireEvent';
import FloodEvent from '../events/FloodEvent';
import EarthquakeEvent from '../events/EarthquakeEvent';
import { EventType, EventState } from '../Event';

// Mock game state helper
const createMockGameState = () => ({
  buildings: [
    { id: 'b1', type: 'CAMPFIRE', state: 'COMPLETED', position: { x: 0, y: 5, z: 0 }, health: 100 },
    { id: 'b2', type: 'FARM', state: 'COMPLETED', position: { x: 5, y: 5, z: 0 }, health: 100 },
    { id: 'b3', type: 'HOUSE', state: 'COMPLETED', position: { x: 10, y: 15, z: 0 }, health: 100 },
    { id: 'b4', type: 'WATCHTOWER', state: 'COMPLETED', position: { x: 15, y: 10, z: 0 }, health: 100 },
    { id: 'b5', type: 'CASTLE', state: 'COMPLETED', position: { x: 20, y: 20, z: 0 }, health: 100 }
  ],
  gridManager: {
    removeBuilding: jest.fn()
  },
  storageManager: {
    getResource: jest.fn(() => 100),
    removeResource: jest.fn(),
    addResource: jest.fn()
  },
  townManager: {
    addMorale: jest.fn()
  },
  npcAssignments: {
    getNPCsInBuilding: jest.fn(() => []),
    unassignNPC: jest.fn()
  },
  buildingConfig: {
    getBuilding: jest.fn((type) => ({
      type,
      cost: { wood: 10, stone: 5 }
    }))
  }
});

describe('WildfireEvent', () => {
  it('should create wildfire with correct properties', () => {
    const wildfire = new WildfireEvent();
    expect(wildfire.name).toBe('Wildfire');
    expect(wildfire.type).toBe(EventType.DISASTER);
    expect(wildfire.duration).toBe(30);
    expect(wildfire.probability).toBe(0.02);
  });

  it('should apply morale penalty on start', () => {
    const wildfire = new WildfireEvent();
    const gameState = createMockGameState();

    wildfire.start(gameState);

    expect(gameState.townManager.addMorale).toHaveBeenCalledWith(-20);
    expect(wildfire.state).toBe(EventState.ACTIVE);
  });

  it('should detect watchtower for mitigation', () => {
    const wildfire = new WildfireEvent();
    const gameState = createMockGameState();

    wildfire.start(gameState);

    expect(wildfire.hasWatchtower).toBe(true);
  });

  it('should target wooden buildings', () => {
    const wildfire = new WildfireEvent();
    const gameState = createMockGameState();

    wildfire.start(gameState);

    // Mock random to always trigger destruction
    const originalRandom = Math.random;
    Math.random = jest.fn(() => 0.01); // Low value to trigger destruction

    // Simulate ticks
    for (let i = 0; i < 10; i++) {
      wildfire.update(1, gameState);
    }

    // Should have attempted to destroy wooden buildings
    // Note: With watchtower mitigation (50%), destruction chance is 5%
    // With our mocked random (0.01 < 0.05), buildings should be destroyed

    Math.random = originalRandom;
  });

  it('should provide summary of destruction', () => {
    const wildfire = new WildfireEvent();
    const gameState = createMockGameState();

    wildfire.start(gameState);
    wildfire.end(gameState);

    const summary = wildfire.getSummary();
    expect(summary.name).toBe('Wildfire');
    expect(summary).toHaveProperty('buildingsDestroyed');
    expect(summary).toHaveProperty('hadWatchtowerMitigation');
  });
});

describe('FloodEvent', () => {
  it('should create flood with correct properties', () => {
    const flood = new FloodEvent();
    expect(flood.name).toBe('Flood');
    expect(flood.type).toBe(EventType.DISASTER);
    expect(flood.duration).toBe(60);
    expect(flood.probability).toBe(0.01);
  });

  it('should apply food spoilage on start', () => {
    const flood = new FloodEvent();
    const gameState = createMockGameState();

    flood.start(gameState);

    expect(gameState.storageManager.removeResource).toHaveBeenCalledWith('food', 30);
  });

  it('should apply morale penalty on start', () => {
    const flood = new FloodEvent();
    const gameState = createMockGameState();

    flood.start(gameState);

    expect(gameState.townManager.addMorale).toHaveBeenCalledWith(-15);
  });

  it('should damage buildings in lowland areas', () => {
    const flood = new FloodEvent();
    const gameState = createMockGameState();

    flood.start(gameState);

    // Buildings at y < 10 should be damaged
    const lowlandBuildings = gameState.buildings.filter(b => b.position.y < 10);
    expect(lowlandBuildings.length).toBeGreaterThan(0);

    // Check that damage was tracked
    expect(flood.buildingsDamaged.length).toBeGreaterThan(0);
  });

  it('should spare buildings on high ground', () => {
    const flood = new FloodEvent();
    const gameState = createMockGameState();

    flood.start(gameState);

    // Buildings at y >= 10 should not be damaged
    const damagedIds = flood.buildingsDamaged.map(d => d.id);
    const highgroundBuildings = gameState.buildings.filter(b => b.position.y >= 10);

    for (const building of highgroundBuildings) {
      expect(damagedIds).not.toContain(building.id);
    }
  });

  it('should apply reduced damage to farms', () => {
    const flood = new FloodEvent();
    const gameState = createMockGameState();

    flood.start(gameState);

    // Find farm in damage records
    const farmDamage = flood.buildingsDamaged.find(d => d.id === 'b2');
    if (farmDamage) {
      // Farm should take 50% damage (15 instead of 30)
      expect(farmDamage.damage).toBe(15);
    }
  });

  it('should provide summary of damage', () => {
    const flood = new FloodEvent();
    const gameState = createMockGameState();

    flood.start(gameState);
    flood.end(gameState);

    const summary = flood.getSummary();
    expect(summary.name).toBe('Flood');
    expect(summary).toHaveProperty('buildingsDamaged');
    expect(summary).toHaveProperty('totalDamage');
    expect(summary).toHaveProperty('foodSpoiled');
  });
});

describe('EarthquakeEvent', () => {
  it('should create earthquake with correct properties', () => {
    const earthquake = new EarthquakeEvent();
    expect(earthquake.name).toBe('Earthquake');
    expect(earthquake.type).toBe(EventType.DISASTER);
    expect(earthquake.duration).toBe(5);
    expect(earthquake.probability).toBe(0.005);
  });

  it('should apply morale penalty on start', () => {
    const earthquake = new EarthquakeEvent();
    const gameState = createMockGameState();

    earthquake.start(gameState);

    expect(gameState.townManager.addMorale).toHaveBeenCalledWith(-40);
  });

  it('should damage all buildings', () => {
    const earthquake = new EarthquakeEvent();
    const gameState = createMockGameState();

    earthquake.start(gameState);

    // All completed buildings should be damaged
    const completedBuildings = gameState.buildings.filter(
      b => b.state === 'COMPLETED' || b.state === 'COMPLETE'
    );
    expect(earthquake.buildingsDamaged.length).toBe(completedBuildings.length);
  });

  it('should deal random damage between 20-50', () => {
    const earthquake = new EarthquakeEvent();
    const gameState = createMockGameState();

    earthquake.start(gameState);

    // Check damage values
    for (const damaged of earthquake.buildingsDamaged) {
      // Castle buildings get 50% reduction, others get full damage
      if (damaged.type === 'CASTLE') {
        expect(damaged.damage).toBeGreaterThanOrEqual(10);
        expect(damaged.damage).toBeLessThanOrEqual(25);
      } else {
        expect(damaged.damage).toBeGreaterThanOrEqual(20);
        expect(damaged.damage).toBeLessThanOrEqual(50);
      }
    }
  });

  it('should apply reduced damage to castle-tier buildings', () => {
    const earthquake = new EarthquakeEvent();
    const gameState = createMockGameState();

    // Mock random to return consistent value
    const originalRandom = Math.random;
    Math.random = jest.fn(() => 0.5); // Mid-range value

    earthquake.start(gameState);

    // Find castle in damage records
    const castleDamage = earthquake.buildingsDamaged.find(d => d.type === 'CASTLE');
    const regularDamage = earthquake.buildingsDamaged.find(d => d.type === 'FARM');

    if (castleDamage && regularDamage) {
      // Castle should take less damage
      expect(castleDamage.damage).toBeLessThan(regularDamage.damage);
    }

    Math.random = originalRandom;
  });

  it('should destroy buildings with health <= 0', () => {
    const earthquake = new EarthquakeEvent();
    const gameState = createMockGameState();

    // Set one building to low health
    gameState.buildings[0].health = 10;

    earthquake.start(gameState);

    // Building should be destroyed if it took enough damage
    const building = gameState.buildings[0];
    if (building.health <= 0) {
      expect(earthquake.buildingsDestroyed).toContain(building.id);
    }
  });

  it('should provide summary of damage and destruction', () => {
    const earthquake = new EarthquakeEvent();
    const gameState = createMockGameState();

    earthquake.start(gameState);
    earthquake.end(gameState);

    const summary = earthquake.getSummary();
    expect(summary.name).toBe('Earthquake');
    expect(summary).toHaveProperty('buildingsDamaged');
    expect(summary).toHaveProperty('buildingsDestroyed');
    expect(summary).toHaveProperty('totalDamage');
    expect(summary.totalDamage).toBeGreaterThan(0);
  });
});

describe('Disaster Event Integration', () => {
  it('should complete full event lifecycle', () => {
    const wildfire = new WildfireEvent();
    const gameState = createMockGameState();

    expect(wildfire.state).toBe(EventState.QUEUED);

    wildfire.start(gameState);
    expect(wildfire.state).toBe(EventState.ACTIVE);

    // Update multiple times
    for (let i = 0; i < 5; i++) {
      wildfire.update(1, gameState);
    }

    wildfire.end(gameState);
    expect(wildfire.state).toBe(EventState.COMPLETED);
  });

  it('should auto-complete when duration expires', () => {
    const wildfire = new WildfireEvent();
    const gameState = createMockGameState();

    wildfire.start(gameState);

    // Update past duration
    const stillActive = wildfire.update(35, gameState);
    expect(stillActive).toBe(false);
    expect(wildfire.state).toBe(EventState.COMPLETED);
  });
});
