/**
 * PositiveEvents.test.js - Tests for seasonal and positive events
 */

import HarvestFestivalEvent from '../events/HarvestFestivalEvent';
import WinterFreezeEvent from '../events/WinterFreezeEvent';
import SpringBloomEvent from '../events/SpringBloomEvent';
import MerchantVisitEvent from '../events/MerchantVisitEvent';
import GoodWeatherEvent from '../events/GoodWeatherEvent';
import WandererJoinsEvent from '../events/WandererJoinsEvent';
import { EventType, EventState } from '../Event';

// Mock game state helper
const createMockGameState = () => ({
  buildings: [
    { id: 'b1', type: 'FARM', state: 'COMPLETED', position: { x: 0, y: 0, z: 0 } },
    { id: 'b2', type: 'HOUSE', state: 'COMPLETED', position: { x: 5, y: 0, z: 0 } }
  ],
  storageManager: {
    getResource: jest.fn((type) => {
      if (type === 'wood') return 100;
      if (type === 'food') return 50;
      return 0;
    }),
    addResource: jest.fn(),
    removeResource: jest.fn()
  },
  townManager: {
    addMorale: jest.fn(),
    getHousingCapacity: jest.fn(() => 10),
    updatePopulation: jest.fn()
  },
  npcManager: {
    npcs: new Map([[1, { id: 1, name: 'Worker' }]]),
    spawnNPC: jest.fn((data) => ({
      id: 2,
      name: data.name || 'NPC',
      position: data.position
    }))
  },
  territoryManager: {
    getAllTerritories: jest.fn(() => [{
      center: { x: 50, y: 0, z: 50 }
    }])
  },
  eventMultipliers: {},
  eventConsumptionModifiers: {}
});

describe('HarvestFestivalEvent', () => {
  it('should create festival with correct properties', () => {
    const festival = new HarvestFestivalEvent();
    expect(festival.name).toBe('Harvest Festival');
    expect(festival.type).toBe(EventType.SEASONAL);
    expect(festival.duration).toBe(60);
    expect(festival.productionMultiplier).toBe(1.5);
  });

  it('should apply morale boost on start', () => {
    const festival = new HarvestFestivalEvent();
    const gameState = createMockGameState();

    festival.start(gameState);

    expect(gameState.townManager.addMorale).toHaveBeenCalledWith(20);
  });

  it('should apply production multiplier', () => {
    const festival = new HarvestFestivalEvent();
    const gameState = createMockGameState();

    festival.start(gameState);

    expect(gameState.eventMultipliers.food).toBe(1.5);
  });

  it('should remove production multiplier on end', () => {
    const festival = new HarvestFestivalEvent();
    const gameState = createMockGameState();

    festival.start(gameState);
    expect(gameState.eventMultipliers.food).toBe(1.5);

    festival.end(gameState);
    expect(gameState.eventMultipliers.food).toBe(1.0);
  });
});

describe('WinterFreezeEvent', () => {
  it('should create winter freeze with correct properties', () => {
    const winter = new WinterFreezeEvent();
    expect(winter.name).toBe('Winter Freeze');
    expect(winter.type).toBe(EventType.SEASONAL);
    expect(winter.duration).toBe(120);
    expect(winter.productionMultiplier).toBe(0.7);
  });

  it('should apply morale penalty on start', () => {
    const winter = new WinterFreezeEvent();
    const gameState = createMockGameState();

    winter.start(gameState);

    expect(gameState.townManager.addMorale).toHaveBeenCalledWith(-10);
  });

  it('should apply production penalty to all resources', () => {
    const winter = new WinterFreezeEvent();
    const gameState = createMockGameState();

    winter.start(gameState);

    expect(gameState.eventMultipliers.food).toBe(0.7);
    expect(gameState.eventMultipliers.wood).toBe(0.7);
    expect(gameState.eventMultipliers.stone).toBe(0.7);
  });

  it('should increase food consumption', () => {
    const winter = new WinterFreezeEvent();
    const gameState = createMockGameState();

    winter.start(gameState);

    expect(gameState.eventConsumptionModifiers.food).toBe(0.2);
  });

  it('should restore normal values on end', () => {
    const winter = new WinterFreezeEvent();
    const gameState = createMockGameState();

    winter.start(gameState);
    winter.end(gameState);

    expect(gameState.eventMultipliers.food).toBe(1.0);
    expect(gameState.eventConsumptionModifiers.food).toBe(0);
  });
});

describe('SpringBloomEvent', () => {
  it('should create spring bloom with correct properties', () => {
    const spring = new SpringBloomEvent();
    expect(spring.name).toBe('Spring Bloom');
    expect(spring.type).toBe(EventType.SEASONAL);
    expect(spring.duration).toBe(180);
    expect(spring.productionMultiplier).toBe(1.2);
  });

  it('should apply morale boost on start', () => {
    const spring = new SpringBloomEvent();
    const gameState = createMockGameState();

    spring.start(gameState);

    expect(gameState.townManager.addMorale).toHaveBeenCalledWith(10);
  });

  it('should apply food production bonus', () => {
    const spring = new SpringBloomEvent();
    const gameState = createMockGameState();

    spring.start(gameState);

    expect(gameState.eventMultipliers.food).toBe(1.2);
  });
});

describe('MerchantVisitEvent', () => {
  it('should create merchant visit with correct properties', () => {
    const merchant = new MerchantVisitEvent();
    expect(merchant.name).toBe('Merchant Visit');
    expect(merchant.type).toBe(EventType.POSITIVE);
    expect(merchant.duration).toBe(60);
    expect(merchant.probability).toBe(0.05);
  });

  it('should apply morale boost on start', () => {
    const merchant = new MerchantVisitEvent();
    const gameState = createMockGameState();

    merchant.start(gameState);

    expect(gameState.townManager.addMorale).toHaveBeenCalledWith(15);
  });

  it('should give free gold', () => {
    const merchant = new MerchantVisitEvent();
    const gameState = createMockGameState();

    merchant.start(gameState);

    expect(gameState.storageManager.addResource).toHaveBeenCalledWith('gold', 50);
  });

  it('should trade wood for gold', () => {
    const merchant = new MerchantVisitEvent();
    const gameState = createMockGameState();

    merchant.start(gameState);

    // Should remove wood
    expect(gameState.storageManager.removeResource).toHaveBeenCalledWith('wood', expect.any(Number));

    // Should add gold (from trade + free gold)
    expect(gameState.storageManager.addResource).toHaveBeenCalled();
  });

  it('should provide summary of trade', () => {
    const merchant = new MerchantVisitEvent();
    const gameState = createMockGameState();

    merchant.start(gameState);
    merchant.end(gameState);

    const summary = merchant.getSummary();
    expect(summary.name).toBe('Merchant Visit');
    expect(summary.woodTraded).toBeGreaterThan(0);
    expect(summary.goldGained).toBeGreaterThan(0);
  });
});

describe('GoodWeatherEvent', () => {
  it('should create good weather with correct properties', () => {
    const weather = new GoodWeatherEvent();
    expect(weather.name).toBe('Good Weather');
    expect(weather.type).toBe(EventType.POSITIVE);
    expect(weather.duration).toBe(120);
    expect(weather.probability).toBe(0.10);
  });

  it('should apply morale boost on start', () => {
    const weather = new GoodWeatherEvent();
    const gameState = createMockGameState();

    weather.start(gameState);

    expect(gameState.townManager.addMorale).toHaveBeenCalledWith(5);
  });

  it('should apply production bonus to all resources', () => {
    const weather = new GoodWeatherEvent();
    const gameState = createMockGameState();

    weather.start(gameState);

    expect(gameState.eventMultipliers.food).toBe(1.1);
    expect(gameState.eventMultipliers.wood).toBe(1.1);
    expect(gameState.eventMultipliers.stone).toBe(1.1);
  });

  it('should remove production bonus on end', () => {
    const weather = new GoodWeatherEvent();
    const gameState = createMockGameState();

    weather.start(gameState);
    weather.end(gameState);

    expect(gameState.eventMultipliers.food).toBeCloseTo(1.0, 5);
    expect(gameState.eventMultipliers.wood).toBeCloseTo(1.0, 5);
  });
});

describe('WandererJoinsEvent', () => {
  it('should create wanderer joins with correct properties', () => {
    const wanderer = new WandererJoinsEvent();
    expect(wanderer.name).toBe('Wanderer Joins');
    expect(wanderer.type).toBe(EventType.POSITIVE);
    expect(wanderer.probability).toBe(0.03);
  });

  it('should have population requirement', () => {
    const wanderer = new WandererJoinsEvent();
    expect(wanderer.conditions.minPopulation).toBe(1);
  });

  it('should apply morale boost on start', () => {
    const wanderer = new WandererJoinsEvent();
    const gameState = createMockGameState();

    wanderer.start(gameState);

    expect(gameState.townManager.addMorale).toHaveBeenCalledWith(10);
  });

  it('should spawn new NPC', () => {
    const wanderer = new WandererJoinsEvent();
    const gameState = createMockGameState();

    wanderer.start(gameState);

    expect(gameState.npcManager.spawnNPC).toHaveBeenCalled();
    expect(wanderer.npcSpawned).toBe(true);
    expect(wanderer.npcId).toBeDefined();
  });

  it('should not spawn if no housing capacity', () => {
    const wanderer = new WandererJoinsEvent();
    const gameState = createMockGameState();

    // Set housing capacity to current population
    gameState.townManager.getHousingCapacity = jest.fn(() => 1);
    gameState.npcManager.npcs = new Map([[1, { id: 1 }]]);

    wanderer.start(gameState);

    expect(gameState.npcManager.spawnNPC).not.toHaveBeenCalled();
    expect(wanderer.npcSpawned).toBe(false);
  });

  it('should generate wanderer name', () => {
    const wanderer = new WandererJoinsEvent();
    const gameState = createMockGameState();

    wanderer.start(gameState);

    const spawnCall = gameState.npcManager.spawnNPC.mock.calls[0];
    expect(spawnCall[0].name).toContain('Wanderer');
  });

  it('should update population', () => {
    const wanderer = new WandererJoinsEvent();
    const gameState = createMockGameState();

    wanderer.start(gameState);

    expect(gameState.townManager.updatePopulation).toHaveBeenCalled();
  });
});

describe('Seasonal & Positive Event Integration', () => {
  it('should complete full event lifecycle', () => {
    const festival = new HarvestFestivalEvent();
    const gameState = createMockGameState();

    expect(festival.state).toBe(EventState.QUEUED);

    festival.start(gameState);
    expect(festival.state).toBe(EventState.ACTIVE);

    festival.update(30, gameState);
    expect(festival.state).toBe(EventState.ACTIVE);

    festival.end(gameState);
    expect(festival.state).toBe(EventState.COMPLETED);
  });

  it('should stack multiple production multipliers', () => {
    const festival = new HarvestFestivalEvent();
    const weather = new GoodWeatherEvent();
    const gameState = createMockGameState();

    festival.start(gameState);
    weather.start(gameState);

    // 1.5 * 1.1 = 1.65
    expect(gameState.eventMultipliers.food).toBeCloseTo(1.65, 5);
  });

  it('should handle overlapping seasonal events', () => {
    const winter = new WinterFreezeEvent();
    const spring = new SpringBloomEvent();
    const gameState = createMockGameState();

    winter.start(gameState);
    expect(gameState.eventMultipliers.food).toBe(0.7);

    spring.start(gameState);
    // 0.7 * 1.2 = 0.84
    expect(gameState.eventMultipliers.food).toBeCloseTo(0.84, 5);

    winter.end(gameState);
    // Back to 1.2
    expect(gameState.eventMultipliers.food).toBeCloseTo(1.2, 5);

    spring.end(gameState);
    // Back to 1.0
    expect(gameState.eventMultipliers.food).toBeCloseTo(1.0, 5);
  });
});
