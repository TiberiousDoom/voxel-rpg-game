/**
 * SharedManagers.test.js - Tests for SharedResourceManager and SharedInventoryManager
 */
import SharedResourceManager from '../SharedResourceManager.js';
import SharedInventoryManager from '../SharedInventoryManager.js';
import UnifiedGameState from '../../core/UnifiedGameState.js';

describe('SharedResourceManager', () => {
  let manager, mockStorage, unifiedState;

  beforeEach(() => {
    unifiedState = new UnifiedGameState();

    mockStorage = {
      storage: { gold: 100, wood: 50 },
      addResource: jest.fn((resource, amount) => {
        mockStorage.storage[resource] = (mockStorage.storage[resource] || 0) + amount;
      }),
      removeResource: jest.fn((resource, amount) => {
        mockStorage.storage[resource] -= amount;
      }),
      getResource: jest.fn((resource) => mockStorage.storage[resource] || 0),
      getStorage: jest.fn(() => ({ ...mockStorage.storage }))
    };

    manager = new SharedResourceManager(mockStorage, unifiedState);
  });

  test('adds resources from expedition', () => {
    manager.addResourceFromExpedition('gold', 50, 'exp1');

    expect(mockStorage.addResource).toHaveBeenCalledWith('gold', 50);
    expect(unifiedState.sharedResources.gold).toBe(50);
  });

  test('tracks resource sources', () => {
    manager.addResourceFromExpedition('gold', 30, 'exp1');
    manager.addResourceFromExpedition('gold', 20, 'exp2');

    const stats = manager.getResourceStats();

    expect(stats.sources.gold['expedition:exp1']).toBe(30);
    expect(stats.sources.gold['expedition:exp2']).toBe(20);
  });

  test('checks if can afford expedition', () => {
    const result = manager.canAffordExpedition({ gold: 50, wood: 30 });

    expect(result.canAfford).toBe(true);
    expect(result.missing).toEqual({});
  });

  test('detects insufficient resources', () => {
    const result = manager.canAffordExpedition({ gold: 200, wood: 100 });

    expect(result.canAfford).toBe(false);
    expect(result.missing.gold).toBe(100);
    expect(result.missing.wood).toBe(50);
  });

  test('consumes resources for expedition', () => {
    const result = manager.consumeForExpedition({ gold: 30, wood: 20 });

    expect(result).toBe(true);
    expect(mockStorage.removeResource).toHaveBeenCalledWith('gold', 30);
    expect(mockStorage.removeResource).toHaveBeenCalledWith('wood', 20);
  });

  test('prevents consuming if insufficient', () => {
    const result = manager.consumeForExpedition({ gold: 200 });

    expect(result).toBe(false);
    expect(mockStorage.removeResource).not.toHaveBeenCalled();
  });

  test('syncs resources to unified state', () => {
    manager.syncResources();

    expect(unifiedState.sharedResources.gold).toBe(100);
    expect(unifiedState.sharedResources.wood).toBe(50);
  });
});

describe('SharedInventoryManager', () => {
  let manager, unifiedState;

  beforeEach(() => {
    unifiedState = new UnifiedGameState();
    manager = new SharedInventoryManager(unifiedState);
  });

  describe('equipment', () => {
    test('adds equipment with ID', () => {
      const id = manager.addEquipment({ name: 'Sword', damage: 10 });

      expect(id).toContain('equip_');
      expect(unifiedState.sharedInventory.equipment).toHaveLength(1);
      expect(unifiedState.sharedInventory.equipment[0].name).toBe('Sword');
      expect(unifiedState.sharedInventory.equipment[0].addedAt).toBeDefined();
    });

    test('gets all equipment', () => {
      manager.addEquipment({ name: 'Sword' });
      manager.addEquipment({ name: 'Shield' });

      const equipment = manager.getEquipment();

      expect(equipment).toHaveLength(2);
    });
  });

  describe('consumables', () => {
    test('adds new consumable', () => {
      manager.addConsumable({ name: 'Potion', effect: 'heal' }, 3);

      expect(unifiedState.sharedInventory.consumables).toHaveLength(1);
      expect(unifiedState.sharedInventory.consumables[0].quantity).toBe(3);
    });

    test('stacks identical consumables', () => {
      manager.addConsumable({ name: 'Potion' }, 2);
      manager.addConsumable({ name: 'Potion' }, 3);

      expect(unifiedState.sharedInventory.consumables).toHaveLength(1);
      expect(unifiedState.sharedInventory.consumables[0].quantity).toBe(5);
    });

    test('uses consumable', () => {
      manager.addConsumable({ name: 'Potion' }, 2);
      const itemId = unifiedState.sharedInventory.consumables[0].id;

      const used = manager.useConsumable(itemId);

      expect(used).toBeDefined();
      expect(unifiedState.sharedInventory.consumables[0].quantity).toBe(1);
    });

    test('removes consumable when quantity reaches zero', () => {
      manager.addConsumable({ name: 'Potion' }, 1);
      const itemId = unifiedState.sharedInventory.consumables[0].id;

      manager.useConsumable(itemId);

      expect(unifiedState.sharedInventory.consumables).toHaveLength(0);
    });
  });

  describe('materials', () => {
    test('adds new material', () => {
      manager.addMaterial('iron', 10);

      expect(unifiedState.sharedInventory.materials).toHaveLength(1);
      expect(unifiedState.sharedInventory.materials[0].type).toBe('iron');
      expect(unifiedState.sharedInventory.materials[0].quantity).toBe(10);
    });

    test('stacks identical materials', () => {
      manager.addMaterial('iron', 5);
      manager.addMaterial('iron', 10);

      expect(unifiedState.sharedInventory.materials).toHaveLength(1);
      expect(unifiedState.sharedInventory.materials[0].quantity).toBe(15);
    });
  });

  describe('general operations', () => {
    test('removes item', () => {
      const id = manager.addEquipment({ name: 'Sword' });

      const result = manager.removeItem('equipment', id);

      expect(result).toBe(true);
      expect(unifiedState.sharedInventory.equipment).toHaveLength(0);
    });

    test('gets item by ID', () => {
      const id = manager.addEquipment({ name: 'Sword' });

      const item = manager.getItem(id);

      expect(item).toBeDefined();
      expect(item.name).toBe('Sword');
    });

    test('returns null for non-existent item', () => {
      const item = manager.getItem('nonexistent');

      expect(item).toBeNull();
    });

    test('gets all items', () => {
      manager.addEquipment({ name: 'Sword' });
      manager.addConsumable({ name: 'Potion' }, 2);
      manager.addMaterial('iron', 5);

      const all = manager.getAllItems();

      expect(all).toHaveLength(3);
    });

    test('gets inventory stats', () => {
      manager.addEquipment({ name: 'Sword' });
      manager.addEquipment({ name: 'Shield' });
      manager.addConsumable({ name: 'Potion' }, 5);
      manager.addMaterial('iron', 10);

      const stats = manager.getStats();

      expect(stats.equipmentCount).toBe(2);
      expect(stats.consumableCount).toBe(5);
      expect(stats.materialCount).toBe(10);
    });
  });
});
