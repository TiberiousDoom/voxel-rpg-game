/**
 * StructureInteractionSystem.test.js - Tests for structure interaction system
 */

import {
  StructureInteractionSystem,
  EXPLORATION_STATE,
  CHEST_TYPE,
} from '../StructureInteractionSystem.js';

// Mock StructureGenerator
class MockStructureGenerator {
  constructor() {
    this.structuresById = new Map();
  }

  addMockStructure(id, type, position = { x: 0, z: 0 }) {
    const structure = {
      id,
      type,
      position,
      template: {
        size: { width: 10, depth: 10 },
      },
    };
    this.structuresById.set(id, structure);
    return structure;
  }
}

// Mock player
const createMockPlayer = (position = { x: 0, z: 0 }) => ({
  id: 'player1',
  position: { ...position },
});

describe('StructureInteractionSystem', () => {
  let structureGenerator;
  let interactionSystem;
  let mockPlayer;

  beforeEach(() => {
    structureGenerator = new MockStructureGenerator();
    interactionSystem = new StructureInteractionSystem(structureGenerator);
    mockPlayer = createMockPlayer();
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with default configuration', () => {
      expect(interactionSystem.structureGenerator).toBe(structureGenerator);
      expect(interactionSystem.config.minChestsPerStructure).toBe(1);
      expect(interactionSystem.config.maxChestsPerStructure).toBe(3);
      expect(interactionSystem.config.interactionRadius).toBe(2);
      expect(interactionSystem.config.enableRespawn).toBe(true);
    });

    it('should accept custom configuration', () => {
      const customSystem = new StructureInteractionSystem(structureGenerator, {
        minChestsPerStructure: 2,
        maxChestsPerStructure: 5,
        interactionRadius: 5,
        enableRespawn: false,
      });

      expect(customSystem.config.minChestsPerStructure).toBe(2);
      expect(customSystem.config.maxChestsPerStructure).toBe(5);
      expect(customSystem.config.interactionRadius).toBe(5);
      expect(customSystem.config.enableRespawn).toBe(false);
    });

    it('should initialize empty state', () => {
      expect(interactionSystem.explorationStates.size).toBe(0);
      expect(interactionSystem.lootChests.size).toBe(0);
      expect(interactionSystem.playerInteractions.size).toBe(0);
    });

    it('should initialize statistics', () => {
      expect(interactionSystem.stats.structuresDiscovered).toBe(0);
      expect(interactionSystem.stats.structuresExplored).toBe(0);
      expect(interactionSystem.stats.chestsOpened).toBe(0);
      expect(interactionSystem.stats.totalLootCollected).toEqual({});
    });

    it('should initialize LootTableSystem', () => {
      expect(interactionSystem.lootSystem).toBeDefined();
    });
  });

  describe('Structure Discovery', () => {
    it('should discover a temple structure', () => {
      const structure = structureGenerator.addMockStructure('temple1', 'temple');
      const result = interactionSystem.discoverStructure('temple1', mockPlayer);

      expect(result.success).toBe(true);
      expect(result.state).toBeDefined();
      expect(result.state.structureType).toBe('temple');
      expect(result.state.explorationState).toBe(EXPLORATION_STATE.DISCOVERED);
    });

    it('should discover a ruins structure', () => {
      structureGenerator.addMockStructure('ruins1', 'ruins');
      const result = interactionSystem.discoverStructure('ruins1', mockPlayer);

      expect(result.success).toBe(true);
      expect(result.state.structureType).toBe('ruins');
    });

    it('should fail to discover non-existent structure', () => {
      const result = interactionSystem.discoverStructure('nonexistent', mockPlayer);

      expect(result.success).toBe(false);
      expect(result.reason).toBe('structure_not_found');
    });

    it('should fail to discover already discovered structure', () => {
      structureGenerator.addMockStructure('temple1', 'temple');
      interactionSystem.discoverStructure('temple1', mockPlayer);

      const result = interactionSystem.discoverStructure('temple1', mockPlayer);

      expect(result.success).toBe(false);
      expect(result.reason).toBe('already_discovered');
    });

    it('should generate chests when discovering structure', () => {
      structureGenerator.addMockStructure('temple1', 'temple');
      const result = interactionSystem.discoverStructure('temple1', mockPlayer);

      expect(result.chestCount).toBeGreaterThanOrEqual(1);
      expect(result.chestCount).toBeLessThanOrEqual(3);
      expect(interactionSystem.lootChests.size).toBe(result.chestCount);
    });

    it('should track discovery metadata', () => {
      structureGenerator.addMockStructure('temple1', 'temple');
      const result = interactionSystem.discoverStructure('temple1', mockPlayer);

      expect(result.state.structureId).toBe('temple1');
      expect(result.state.discoveredBy).toBe('player1');
      expect(result.state.discoveredAt).toBeDefined();
      expect(result.state.chestsOpened).toBe(0);
      expect(result.state.totalChests).toBeGreaterThan(0);
    });

    it('should increment discovery statistics', () => {
      structureGenerator.addMockStructure('temple1', 'temple');
      structureGenerator.addMockStructure('ruins1', 'ruins');

      interactionSystem.discoverStructure('temple1', mockPlayer);
      interactionSystem.discoverStructure('ruins1', mockPlayer);

      expect(interactionSystem.stats.structuresDiscovered).toBe(2);
    });

    it('should call onStructureDiscovered callback', () => {
      const callback = jest.fn();
      interactionSystem.on('onStructureDiscovered', callback);

      const structure = structureGenerator.addMockStructure('temple1', 'temple');
      interactionSystem.discoverStructure('temple1', mockPlayer);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback.mock.calls[0][0].structure).toEqual(structure);
      expect(callback.mock.calls[0][0].player).toEqual(mockPlayer);
    });
  });

  describe('Chest Generation', () => {
    it('should generate chests within configured range', () => {
      structureGenerator.addMockStructure('temple1', 'temple');
      interactionSystem.discoverStructure('temple1', mockPlayer);

      const chestCount = interactionSystem.lootChests.size;
      expect(chestCount).toBeGreaterThanOrEqual(interactionSystem.config.minChestsPerStructure);
      expect(chestCount).toBeLessThanOrEqual(interactionSystem.config.maxChestsPerStructure);
    });

    it('should assign unique IDs to chests', () => {
      structureGenerator.addMockStructure('temple1', 'temple');
      structureGenerator.addMockStructure('ruins1', 'ruins');

      interactionSystem.discoverStructure('temple1', mockPlayer);
      interactionSystem.discoverStructure('ruins1', mockPlayer);

      const chestIds = Array.from(interactionSystem.lootChests.keys());
      const uniqueIds = new Set(chestIds);

      expect(chestIds.length).toBe(uniqueIds.size); // All unique
    });

    it('should assign loot tables based on structure type', () => {
      structureGenerator.addMockStructure('temple1', 'temple');
      interactionSystem.discoverStructure('temple1', mockPlayer);

      const chests = Array.from(interactionSystem.lootChests.values());
      expect(chests.every(chest => chest.lootTable)).toBe(true);
    });

    it('should initialize chests as unopened', () => {
      structureGenerator.addMockStructure('temple1', 'temple');
      interactionSystem.discoverStructure('temple1', mockPlayer);

      const chests = Array.from(interactionSystem.lootChests.values());
      expect(chests.every(chest => !chest.opened)).toBe(true);
    });

    it('should assign chest types for temple structures', () => {
      structureGenerator.addMockStructure('temple1', 'temple');
      interactionSystem.discoverStructure('temple1', mockPlayer);

      const chests = Array.from(interactionSystem.lootChests.values());
      const validTypes = [CHEST_TYPE.RARE, CHEST_TYPE.EPIC, CHEST_TYPE.LEGENDARY];

      expect(chests.every(chest => validTypes.includes(chest.type))).toBe(true);
    });

    it('should assign chest types for village structures', () => {
      structureGenerator.addMockStructure('village1', 'village');
      interactionSystem.discoverStructure('village1', mockPlayer);

      const chests = Array.from(interactionSystem.lootChests.values());

      expect(chests.every(chest => chest.type === CHEST_TYPE.COMMON)).toBe(true);
    });

    it('should position chests within structure bounds', () => {
      const structure = structureGenerator.addMockStructure('temple1', 'temple', { x: 100, z: 200 });
      interactionSystem.discoverStructure('temple1', mockPlayer);

      const chests = Array.from(interactionSystem.lootChests.values());
      const width = structure.template.size.width;
      const depth = structure.template.size.depth;

      chests.forEach(chest => {
        expect(chest.position.x).toBeGreaterThanOrEqual(structure.position.x - width / 2);
        expect(chest.position.x).toBeLessThanOrEqual(structure.position.x + width / 2);
        expect(chest.position.z).toBeGreaterThanOrEqual(structure.position.z - depth / 2);
        expect(chest.position.z).toBeLessThanOrEqual(structure.position.z + depth / 2);
      });
    });
  });

  describe('Chest Interaction', () => {
    let chestId;

    beforeEach(() => {
      structureGenerator.addMockStructure('temple1', 'temple', { x: 0, z: 0 });
      interactionSystem.discoverStructure('temple1', mockPlayer);
      chestId = Array.from(interactionSystem.lootChests.keys())[0];

      // Position player near chest
      const chest = interactionSystem.lootChests.get(chestId);
      mockPlayer.position = { x: chest.position.x, z: chest.position.z };
    });

    it('should open a chest successfully', () => {
      const result = interactionSystem.openChest(chestId, mockPlayer);

      expect(result.success).toBe(true);
      expect(result.loot).toBeDefined();
      expect(result.chest).toBeDefined();
    });

    it('should fail to open non-existent chest', () => {
      const result = interactionSystem.openChest('nonexistent', mockPlayer);

      expect(result.success).toBe(false);
      expect(result.reason).toBe('chest_not_found');
    });

    it('should fail to open already opened chest', () => {
      interactionSystem.openChest(chestId, mockPlayer);
      const result = interactionSystem.openChest(chestId, mockPlayer);

      expect(result.success).toBe(false);
      expect(result.reason).toBe('already_opened');
    });

    it('should fail to open chest if player too far', () => {
      mockPlayer.position = { x: 1000, z: 1000 };
      const result = interactionSystem.openChest(chestId, mockPlayer);

      expect(result.success).toBe(false);
      expect(result.reason).toBe('too_far');
    });

    it('should generate loot when opening chest', () => {
      const result = interactionSystem.openChest(chestId, mockPlayer);

      expect(result.loot).toBeDefined();
      expect(Array.isArray(result.loot)).toBe(true);
    });

    it('should mark chest as opened', () => {
      interactionSystem.openChest(chestId, mockPlayer);
      const chest = interactionSystem.lootChests.get(chestId);

      expect(chest.opened).toBe(true);
      expect(chest.openedAt).toBeDefined();
      expect(chest.openedBy).toBe('player1');
    });

    it('should update structure exploration state', () => {
      const structureId = interactionSystem.lootChests.get(chestId).structureId;
      const stateBefore = interactionSystem.getExplorationState(structureId);
      const chestsOpenedBefore = stateBefore.chestsOpened;

      interactionSystem.openChest(chestId, mockPlayer);

      const stateAfter = interactionSystem.getExplorationState(structureId);
      expect(stateAfter.chestsOpened).toBe(chestsOpenedBefore + 1);
    });

    it('should increment statistics when opening chest', () => {
      const statsBefore = interactionSystem.stats.chestsOpened;
      interactionSystem.openChest(chestId, mockPlayer);

      expect(interactionSystem.stats.chestsOpened).toBe(statsBefore + 1);
    });

    it('should track loot collected in statistics', () => {
      interactionSystem.openChest(chestId, mockPlayer);

      expect(Object.keys(interactionSystem.stats.totalLootCollected).length).toBeGreaterThan(0);
    });

    it('should call onChestOpened callback', () => {
      const callback = jest.fn();
      interactionSystem.on('onChestOpened', callback);

      interactionSystem.openChest(chestId, mockPlayer);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback.mock.calls[0][0].chest).toBeDefined();
      expect(callback.mock.calls[0][0].player).toEqual(mockPlayer);
    });

    it('should call onLootCollected callback', () => {
      const callback = jest.fn();
      interactionSystem.on('onLootCollected', callback);

      interactionSystem.openChest(chestId, mockPlayer);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback.mock.calls[0][0].loot).toBeDefined();
    });
  });

  describe('Structure Clearing', () => {
    it('should mark structure as cleared when all chests opened', () => {
      structureGenerator.addMockStructure('temple1', 'temple', { x: 0, z: 0 });
      interactionSystem.discoverStructure('temple1', mockPlayer);

      const chests = interactionSystem.getStructureChests('temple1');

      // Open all chests
      chests.forEach(chest => {
        mockPlayer.position = { x: chest.position.x, z: chest.position.z };
        interactionSystem.openChest(chest.id, mockPlayer);
      });

      const state = interactionSystem.getExplorationState('temple1');
      expect(state.explorationState).toBe(EXPLORATION_STATE.CLEARED);
    });

    it('should not mark structure as cleared with unopened chests', () => {
      structureGenerator.addMockStructure('temple1', 'temple', { x: 0, z: 0 });
      interactionSystem.discoverStructure('temple1', mockPlayer);

      const chests = interactionSystem.getStructureChests('temple1');

      // Open only first chest
      if (chests.length > 1) {
        mockPlayer.position = { x: chests[0].position.x, z: chests[0].position.z };
        interactionSystem.openChest(chests[0].id, mockPlayer);

        const state = interactionSystem.getExplorationState('temple1');
        expect(state.explorationState).not.toBe(EXPLORATION_STATE.CLEARED);
      }
    });

    it('should increment structures explored when cleared', () => {
      structureGenerator.addMockStructure('temple1', 'temple', { x: 0, z: 0 });
      interactionSystem.discoverStructure('temple1', mockPlayer);

      const chests = interactionSystem.getStructureChests('temple1');
      const statsBefore = interactionSystem.stats.structuresExplored;

      // Open all chests
      chests.forEach(chest => {
        mockPlayer.position = { x: chest.position.x, z: chest.position.z };
        interactionSystem.openChest(chest.id, mockPlayer);
      });

      expect(interactionSystem.stats.structuresExplored).toBe(statsBefore + 1);
    });

    it('should call onStructureCleared callback', () => {
      const callback = jest.fn();
      interactionSystem.on('onStructureCleared', callback);

      structureGenerator.addMockStructure('temple1', 'temple', { x: 0, z: 0 });
      interactionSystem.discoverStructure('temple1', mockPlayer);

      const chests = interactionSystem.getStructureChests('temple1');

      // Open all chests
      chests.forEach(chest => {
        mockPlayer.position = { x: chest.position.x, z: chest.position.z };
        interactionSystem.openChest(chest.id, mockPlayer);
      });

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback.mock.calls[0][0].structureId).toBe('temple1');
    });
  });

  describe('Chest Queries', () => {
    beforeEach(() => {
      structureGenerator.addMockStructure('temple1', 'temple', { x: 0, z: 0 });
      structureGenerator.addMockStructure('ruins1', 'ruins', { x: 100, z: 100 });
      interactionSystem.discoverStructure('temple1', mockPlayer);
      interactionSystem.discoverStructure('ruins1', mockPlayer);
    });

    it('should get nearby chests within radius', () => {
      const nearby = interactionSystem.getNearbyChests({ x: 0, z: 0 }, 20);

      expect(nearby.length).toBeGreaterThan(0);
      expect(nearby.every(chest => chest.distance <= 20)).toBe(true);
    });

    it('should exclude far chests from nearby results', () => {
      const nearby = interactionSystem.getNearbyChests({ x: 0, z: 0 }, 5);

      expect(nearby.every(chest => chest.distance <= 5)).toBe(true);
    });

    it('should sort nearby chests by distance', () => {
      const nearby = interactionSystem.getNearbyChests({ x: 0, z: 0 }, 200);

      for (let i = 1; i < nearby.length; i++) {
        expect(nearby[i].distance).toBeGreaterThanOrEqual(nearby[i - 1].distance);
      }
    });

    it('should get chests for specific structure', () => {
      const templeChests = interactionSystem.getStructureChests('temple1');
      const ruinsChests = interactionSystem.getStructureChests('ruins1');

      expect(templeChests.every(chest => chest.structureId === 'temple1')).toBe(true);
      expect(ruinsChests.every(chest => chest.structureId === 'ruins1')).toBe(true);
    });

    it('should return empty array for non-existent structure', () => {
      const chests = interactionSystem.getStructureChests('nonexistent');
      expect(chests).toEqual([]);
    });
  });

  describe('Exploration State', () => {
    it('should get exploration state for discovered structure', () => {
      structureGenerator.addMockStructure('temple1', 'temple');
      interactionSystem.discoverStructure('temple1', mockPlayer);

      const state = interactionSystem.getExplorationState('temple1');

      expect(state).toBeDefined();
      expect(state.structureId).toBe('temple1');
      expect(state.explorationState).toBe(EXPLORATION_STATE.DISCOVERED);
    });

    it('should return null for undiscovered structure', () => {
      const state = interactionSystem.getExplorationState('nonexistent');
      expect(state).toBeNull();
    });

    it('should track loot collected in exploration state', () => {
      structureGenerator.addMockStructure('temple1', 'temple', { x: 0, z: 0 });
      interactionSystem.discoverStructure('temple1', mockPlayer);

      const chests = interactionSystem.getStructureChests('temple1');
      mockPlayer.position = { x: chests[0].position.x, z: chests[0].position.z };
      interactionSystem.openChest(chests[0].id, mockPlayer);

      const state = interactionSystem.getExplorationState('temple1');
      expect(state.lootCollected.length).toBeGreaterThan(0);
    });
  });

  describe('Statistics', () => {
    it('should get current statistics', () => {
      const stats = interactionSystem.getStats();

      expect(stats.structuresDiscovered).toBeDefined();
      expect(stats.structuresExplored).toBeDefined();
      expect(stats.chestsOpened).toBeDefined();
      expect(stats.totalChests).toBeDefined();
      expect(stats.chestsRemaining).toBeDefined();
    });

    it('should track total chests', () => {
      structureGenerator.addMockStructure('temple1', 'temple');
      interactionSystem.discoverStructure('temple1', mockPlayer);

      const stats = interactionSystem.getStats();
      expect(stats.totalChests).toBe(interactionSystem.lootChests.size);
    });

    it('should track chests remaining', () => {
      structureGenerator.addMockStructure('temple1', 'temple', { x: 0, z: 0 });
      interactionSystem.discoverStructure('temple1', mockPlayer);

      const chests = Array.from(interactionSystem.lootChests.values());
      mockPlayer.position = { x: chests[0].position.x, z: chests[0].position.z };
      interactionSystem.openChest(chests[0].id, mockPlayer);

      const stats = interactionSystem.getStats();
      expect(stats.chestsRemaining).toBe(chests.length - 1);
    });

    it('should reset statistics', () => {
      structureGenerator.addMockStructure('temple1', 'temple');
      interactionSystem.discoverStructure('temple1', mockPlayer);

      interactionSystem.resetStats();

      expect(interactionSystem.stats.structuresDiscovered).toBe(0);
      expect(interactionSystem.stats.structuresExplored).toBe(0);
      expect(interactionSystem.stats.chestsOpened).toBe(0);
    });
  });

  describe('Serialization', () => {
    beforeEach(() => {
      structureGenerator.addMockStructure('temple1', 'temple', { x: 0, z: 0 });
      interactionSystem.discoverStructure('temple1', mockPlayer);
    });

    it('should serialize state', () => {
      const serialized = interactionSystem.serialize();

      expect(serialized.explorationStates).toBeDefined();
      expect(serialized.lootChests).toBeDefined();
      expect(serialized.stats).toBeDefined();
      expect(serialized.nextChestId).toBeDefined();
    });

    it('should serialize exploration states', () => {
      const serialized = interactionSystem.serialize();

      expect(serialized.explorationStates.length).toBe(1);
      expect(serialized.explorationStates[0][0]).toBe('temple1');
    });

    it('should serialize loot chests', () => {
      const serialized = interactionSystem.serialize();

      expect(serialized.lootChests.length).toBeGreaterThan(0);
    });

    it('should serialize statistics', () => {
      const serialized = interactionSystem.serialize();

      expect(serialized.stats.structuresDiscovered).toBe(1);
    });

    it('should deserialize state', () => {
      const data = {
        explorationStates: [['temple1', {
          structureId: 'temple1',
          structureType: 'temple',
          discoveredAt: Date.now(),
          explorationState: EXPLORATION_STATE.DISCOVERED,
          chestsOpened: 1,
          totalChests: 3,
        }]],
        lootChests: [['chest1', {
          id: 'chest1',
          structureId: 'temple1',
          opened: true,
        }]],
        stats: {
          structuresDiscovered: 5,
          structuresExplored: 2,
          chestsOpened: 10,
        },
        nextChestId: 100,
      };

      interactionSystem.deserialize(data);

      expect(interactionSystem.explorationStates.size).toBe(1);
      expect(interactionSystem.lootChests.size).toBe(1);
      expect(interactionSystem.stats.structuresDiscovered).toBe(5);
      expect(interactionSystem.nextChestId).toBe(100);
    });

    it('should handle partial deserialization', () => {
      const data = {
        stats: { structuresDiscovered: 10 },
      };

      interactionSystem.deserialize(data);

      expect(interactionSystem.stats.structuresDiscovered).toBe(10);
    });

    it('should restore functionality after deserialization', () => {
      const chests = Array.from(interactionSystem.lootChests.values());
      mockPlayer.position = { x: chests[0].position.x, z: chests[0].position.z };
      interactionSystem.openChest(chests[0].id, mockPlayer);

      const serialized = interactionSystem.serialize();

      const newSystem = new StructureInteractionSystem(structureGenerator);
      newSystem.deserialize(serialized);

      const state = newSystem.getExplorationState('temple1');
      expect(state).toBeDefined();
      expect(state.chestsOpened).toBe(1);
    });
  });

  describe('Distance Calculation', () => {
    it('should calculate correct distance', () => {
      const pos1 = { x: 0, z: 0 };
      const pos2 = { x: 3, z: 4 };

      const distance = interactionSystem._getDistance(pos1, pos2);
      expect(distance).toBe(5); // 3-4-5 triangle
    });

    it('should calculate zero distance for same position', () => {
      const pos = { x: 10, z: 20 };
      const distance = interactionSystem._getDistance(pos, pos);
      expect(distance).toBe(0);
    });

    it('should calculate distance correctly for negative coordinates', () => {
      const pos1 = { x: -3, z: -4 };
      const pos2 = { x: 0, z: 0 };

      const distance = interactionSystem._getDistance(pos1, pos2);
      expect(distance).toBe(5);
    });
  });

  describe('Event Callbacks', () => {
    it('should register callbacks', () => {
      const callback = jest.fn();
      interactionSystem.on('onStructureDiscovered', callback);

      expect(interactionSystem.callbacks.onStructureDiscovered).toBe(callback);
    });

    it('should not register invalid callback events', () => {
      const callback = jest.fn();
      interactionSystem.on('invalidEvent', callback);

      expect(interactionSystem.callbacks.invalidEvent).toBeUndefined();
    });

    it('should handle missing callbacks gracefully', () => {
      structureGenerator.addMockStructure('temple1', 'temple');

      expect(() => {
        interactionSystem.discoverStructure('temple1', mockPlayer);
      }).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle structure with no template size', () => {
      const structure = {
        id: 'test1',
        type: 'temple',
        position: { x: 0, z: 0 },
        template: {},
      };
      structureGenerator.structuresById.set('test1', structure);

      const result = interactionSystem.discoverStructure('test1', mockPlayer);
      expect(result.success).toBe(true);
    });

    it('should handle player with no id', () => {
      const playerNoId = { position: { x: 0, z: 0 } };
      structureGenerator.addMockStructure('temple1', 'temple');

      const result = interactionSystem.discoverStructure('temple1', playerNoId);
      expect(result.success).toBe(true);
      expect(result.state.discoveredBy).toBe('player');
    });

    it('should handle empty loot from chest', () => {
      structureGenerator.addMockStructure('temple1', 'temple', { x: 0, z: 0 });
      interactionSystem.discoverStructure('temple1', mockPlayer);

      const chestId = Array.from(interactionSystem.lootChests.keys())[0];
      const chest = interactionSystem.lootChests.get(chestId);
      mockPlayer.position = { x: chest.position.x, z: chest.position.z };

      // Mock loot system to return empty array
      interactionSystem.lootSystem.generateLoot = jest.fn().mockReturnValue([]);

      const result = interactionSystem.openChest(chestId, mockPlayer);
      expect(result.success).toBe(true);
      expect(result.loot).toEqual([]);
    });

    it('should handle multiple structures of same type', () => {
      structureGenerator.addMockStructure('temple1', 'temple');
      structureGenerator.addMockStructure('temple2', 'temple');
      structureGenerator.addMockStructure('temple3', 'temple');

      interactionSystem.discoverStructure('temple1', mockPlayer);
      interactionSystem.discoverStructure('temple2', mockPlayer);
      interactionSystem.discoverStructure('temple3', mockPlayer);

      expect(interactionSystem.explorationStates.size).toBe(3);
    });
  });

  describe('Structure Types', () => {
    const structureTypes = ['temple', 'ruins', 'tower', 'dungeon', 'shrine', 'village', 'camp', 'fort'];

    structureTypes.forEach(type => {
      it(`should handle ${type} structure type`, () => {
        structureGenerator.addMockStructure(`${type}1`, type);
        const result = interactionSystem.discoverStructure(`${type}1`, mockPlayer);

        expect(result.success).toBe(true);
        expect(result.state.structureType).toBe(type);
      });
    });
  });
});
