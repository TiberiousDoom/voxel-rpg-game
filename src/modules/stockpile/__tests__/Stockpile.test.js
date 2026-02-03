/**
 * Stockpile.test.js - Unit tests for Stockpile and StockpileManager
 *
 * Tests:
 * - Stockpile creation and configuration
 * - Slot management and reservations
 * - Resource deposit and withdrawal
 * - Resource filtering by type/category
 * - StockpileManager operations
 */

import {
  Stockpile,
  StockpileSlot,
  ResourceType,
  ResourceCategory,
  RESOURCE_CATEGORIES
} from '../Stockpile.js';
import { StockpileManager } from '../StockpileManager.js';

describe('StockpileSlot', () => {
  describe('Constructor and Basic State', () => {
    it('should create a slot with correct position', () => {
      const slot = new StockpileSlot(10, 20, 5);

      expect(slot.position.x).toBe(10);
      expect(slot.position.y).toBe(20);
      expect(slot.position.z).toBe(5);
    });

    it('should start empty', () => {
      const slot = new StockpileSlot(0, 0, 0);

      expect(slot.isEmpty()).toBe(true);
      expect(slot.resource).toBeNull();
      expect(slot.quantity).toBe(0);
    });

    it('should not be reserved initially', () => {
      const slot = new StockpileSlot(0, 0, 0);
      expect(slot.isReserved()).toBe(false);
    });
  });

  describe('Adding Resources', () => {
    it('should add resources to empty slot', () => {
      const slot = new StockpileSlot(0, 0, 0);

      const added = slot.add(ResourceType.WOOD, 50);

      expect(added).toBe(50);
      expect(slot.resource).toBe(ResourceType.WOOD);
      expect(slot.quantity).toBe(50);
      expect(slot.isEmpty()).toBe(false);
    });

    it('should add more of same resource type', () => {
      const slot = new StockpileSlot(0, 0, 0);

      slot.add(ResourceType.WOOD, 30);
      const added = slot.add(ResourceType.WOOD, 20);

      expect(added).toBe(20);
      expect(slot.quantity).toBe(50);
    });

    it('should not mix resource types', () => {
      const slot = new StockpileSlot(0, 0, 0);

      slot.add(ResourceType.WOOD, 30);
      const added = slot.add(ResourceType.STONE, 20);

      expect(added).toBe(0);
      expect(slot.quantity).toBe(30);
      expect(slot.resource).toBe(ResourceType.WOOD);
    });

    it('should respect max quantity', () => {
      const slot = new StockpileSlot(0, 0, 0);
      slot.maxQuantity = 50;

      const added = slot.add(ResourceType.WOOD, 100);

      expect(added).toBe(50);
      expect(slot.quantity).toBe(50);
      expect(slot.isFull()).toBe(true);
    });
  });

  describe('Removing Resources', () => {
    it('should remove resources', () => {
      const slot = new StockpileSlot(0, 0, 0);
      slot.add(ResourceType.WOOD, 50);

      const removed = slot.remove(30);

      expect(removed).toBe(30);
      expect(slot.quantity).toBe(20);
    });

    it('should clear resource type when empty', () => {
      const slot = new StockpileSlot(0, 0, 0);
      slot.add(ResourceType.WOOD, 30);

      slot.remove(30);

      expect(slot.isEmpty()).toBe(true);
      expect(slot.resource).toBeNull();
    });

    it('should not remove more than available', () => {
      const slot = new StockpileSlot(0, 0, 0);
      slot.add(ResourceType.WOOD, 30);

      const removed = slot.remove(50);

      expect(removed).toBe(30);
      expect(slot.isEmpty()).toBe(true);
    });
  });

  describe('Reservations', () => {
    it('should reserve slot for NPC', () => {
      const slot = new StockpileSlot(0, 0, 0);

      const success = slot.reserve('npc_1', 'pickup');

      expect(success).toBe(true);
      expect(slot.isReserved()).toBe(true);
      expect(slot.reservedBy).toBe('npc_1');
      expect(slot.reservationType).toBe('pickup');
    });

    it('should not allow double reservation', () => {
      const slot = new StockpileSlot(0, 0, 0);

      slot.reserve('npc_1', 'pickup');
      const success = slot.reserve('npc_2', 'pickup');

      expect(success).toBe(false);
      expect(slot.reservedBy).toBe('npc_1');
    });

    it('should release reservation', () => {
      const slot = new StockpileSlot(0, 0, 0);
      slot.reserve('npc_1', 'pickup');

      const success = slot.release('npc_1');

      expect(success).toBe(true);
      expect(slot.isReserved()).toBe(false);
    });

    it('should not release if wrong NPC', () => {
      const slot = new StockpileSlot(0, 0, 0);
      slot.reserve('npc_1', 'pickup');

      const success = slot.release('npc_2');

      expect(success).toBe(false);
      expect(slot.isReserved()).toBe(true);
    });
  });

  describe('Serialization', () => {
    it('should serialize and deserialize', () => {
      const slot = new StockpileSlot(5, 10, 2);
      slot.add(ResourceType.STONE, 75);

      const json = slot.toJSON();
      const restored = StockpileSlot.fromJSON(json);

      expect(restored.position.x).toBe(5);
      expect(restored.position.y).toBe(10);
      expect(restored.position.z).toBe(2);
      expect(restored.resource).toBe(ResourceType.STONE);
      expect(restored.quantity).toBe(75);
    });
  });
});

describe('Stockpile', () => {
  describe('Constructor and Configuration', () => {
    it('should create stockpile with correct bounds', () => {
      const stockpile = new Stockpile({
        x: 10,
        y: 20,
        z: 0,
        width: 5,
        depth: 3
      });

      expect(stockpile.bounds.x).toBe(10);
      expect(stockpile.bounds.y).toBe(20);
      expect(stockpile.bounds.z).toBe(0);
      expect(stockpile.bounds.width).toBe(5);
      expect(stockpile.bounds.depth).toBe(3);
    });

    it('should create slots for all positions', () => {
      const stockpile = new Stockpile({
        x: 0,
        y: 0,
        z: 0,
        width: 3,
        depth: 3
      });

      expect(stockpile.slots.size).toBe(9);
    });

    it('should set allowed resources', () => {
      const stockpile = new Stockpile({
        allowedResources: [ResourceType.WOOD, ResourceType.STONE]
      });

      expect(stockpile.acceptsResource(ResourceType.WOOD)).toBe(true);
      expect(stockpile.acceptsResource(ResourceType.STONE)).toBe(true);
      expect(stockpile.acceptsResource(ResourceType.GOLD_INGOT)).toBe(false);
    });

    it('should accept all resources by default', () => {
      const stockpile = new Stockpile({});

      expect(stockpile.acceptsResource(ResourceType.WOOD)).toBe(true);
      expect(stockpile.acceptsResource(ResourceType.ESSENCE)).toBe(true);
    });
  });

  describe('Position Checking', () => {
    it('should check if position is within bounds', () => {
      const stockpile = new Stockpile({
        x: 10,
        y: 10,
        width: 5,
        depth: 5
      });

      expect(stockpile.containsPosition(10, 10)).toBe(true);
      expect(stockpile.containsPosition(14, 14)).toBe(true);
      expect(stockpile.containsPosition(15, 10)).toBe(false);
      expect(stockpile.containsPosition(9, 10)).toBe(false);
    });
  });

  describe('Slot Operations', () => {
    it('should get slot at position', () => {
      const stockpile = new Stockpile({
        x: 0,
        y: 0,
        width: 3,
        depth: 3
      });

      const slot = stockpile.getSlot(1, 1);
      expect(slot).not.toBeNull();
      expect(slot.position.x).toBe(1);
      expect(slot.position.y).toBe(1);
    });

    it('should return null for invalid position', () => {
      const stockpile = new Stockpile({
        x: 0,
        y: 0,
        width: 3,
        depth: 3
      });

      const slot = stockpile.getSlot(5, 5);
      expect(slot).toBeNull();
    });

    it('should find empty slot for deposit', () => {
      const stockpile = new Stockpile({
        x: 0,
        y: 0,
        width: 3,
        depth: 3
      });

      const slot = stockpile.findEmptySlot(ResourceType.WOOD);
      expect(slot).not.toBeNull();
      expect(slot.isEmpty()).toBe(true);
    });

    it('should find slot with same resource first', () => {
      const stockpile = new Stockpile({
        x: 0,
        y: 0,
        width: 3,
        depth: 3
      });

      // Add some wood to first slot
      stockpile.deposit(0, 0, ResourceType.WOOD, 30);

      // Find slot for more wood should return the one with wood
      const slot = stockpile.findEmptySlot(ResourceType.WOOD);
      expect(slot.resource).toBe(ResourceType.WOOD);
    });
  });

  describe('Deposit and Withdraw', () => {
    it('should deposit resources', () => {
      const stockpile = new Stockpile({
        x: 0,
        y: 0,
        width: 3,
        depth: 3
      });

      const deposited = stockpile.deposit(1, 1, ResourceType.WOOD, 50);

      expect(deposited).toBe(50);
      expect(stockpile.getResourceQuantity(ResourceType.WOOD)).toBe(50);
    });

    it('should withdraw resources', () => {
      const stockpile = new Stockpile({
        x: 0,
        y: 0,
        width: 3,
        depth: 3
      });

      stockpile.deposit(1, 1, ResourceType.WOOD, 50);
      const result = stockpile.withdraw(1, 1, 30);

      expect(result.resource).toBe(ResourceType.WOOD);
      expect(result.quantity).toBe(30);
      expect(stockpile.getResourceQuantity(ResourceType.WOOD)).toBe(20);
    });

    it('should track total deposits', () => {
      const stockpile = new Stockpile({
        x: 0,
        y: 0,
        width: 3,
        depth: 3
      });

      stockpile.deposit(0, 0, ResourceType.WOOD, 30);
      stockpile.deposit(1, 0, ResourceType.STONE, 50);

      expect(stockpile.stats.totalDeposits).toBe(80);
    });
  });

  describe('Resource Queries', () => {
    it('should get all resources', () => {
      const stockpile = new Stockpile({
        x: 0,
        y: 0,
        width: 3,
        depth: 3
      });

      stockpile.deposit(0, 0, ResourceType.WOOD, 30);
      stockpile.deposit(1, 0, ResourceType.WOOD, 20);
      stockpile.deposit(2, 0, ResourceType.STONE, 50);

      const resources = stockpile.getAllResources();
      expect(resources.get(ResourceType.WOOD)).toBe(50);
      expect(resources.get(ResourceType.STONE)).toBe(50);
    });

    it('should get available space', () => {
      const stockpile = new Stockpile({
        x: 0,
        y: 0,
        width: 2,
        depth: 2
      });

      // 4 slots x 100 max = 400 capacity
      expect(stockpile.getAvailableSpace(ResourceType.WOOD)).toBe(400);

      stockpile.deposit(0, 0, ResourceType.WOOD, 50);
      expect(stockpile.getAvailableSpace(ResourceType.WOOD)).toBe(350);
    });
  });

  describe('Serialization', () => {
    it('should serialize and deserialize', () => {
      const stockpile = new Stockpile({
        id: 'test_stockpile',
        name: 'Test Stockpile',
        x: 10,
        y: 20,
        z: 0,
        width: 3,
        depth: 3,
        priority: 75
      });

      stockpile.deposit(10, 20, ResourceType.WOOD, 50);

      const json = stockpile.toJSON();
      const restored = Stockpile.fromJSON(json);

      expect(restored.id).toBe('test_stockpile');
      expect(restored.name).toBe('Test Stockpile');
      expect(restored.bounds.x).toBe(10);
      expect(restored.priority).toBe(75);
      expect(restored.getResourceQuantity(ResourceType.WOOD)).toBe(50);
    });
  });
});

describe('StockpileManager', () => {
  describe('Stockpile Management', () => {
    it('should create stockpiles', () => {
      const manager = new StockpileManager();

      const stockpile = manager.createStockpile({
        x: 0,
        y: 0,
        width: 5,
        depth: 5
      });

      expect(stockpile).not.toBeNull();
      expect(manager.getAllStockpiles().length).toBe(1);
    });

    it('should get stockpile by ID', () => {
      const manager = new StockpileManager();

      const created = manager.createStockpile({ x: 0, y: 0, width: 3, depth: 3 });
      const fetched = manager.getStockpile(created.id);

      expect(fetched).toBe(created);
    });

    it('should remove stockpiles', () => {
      const manager = new StockpileManager();

      const stockpile = manager.createStockpile({ x: 0, y: 0, width: 3, depth: 3 });
      manager.removeStockpile(stockpile.id);

      expect(manager.getAllStockpiles().length).toBe(0);
    });
  });

  describe('Finding Stockpiles', () => {
    it('should find best deposit stockpile', () => {
      const manager = new StockpileManager();

      // Far stockpile with high priority
      manager.createStockpile({
        x: 100,
        y: 100,
        width: 3,
        depth: 3,
        priority: 100
      });

      // Near stockpile with lower priority
      manager.createStockpile({
        x: 5,
        y: 5,
        width: 3,
        depth: 3,
        priority: 50
      });

      const result = manager.findBestDepositStockpile(
        { x: 0, y: 0 },
        ResourceType.WOOD
      );

      expect(result).not.toBeNull();
      // Higher priority should win despite distance
      expect(result.stockpile.priority).toBe(100);
    });

    it('should find nearest resource slot', () => {
      const manager = new StockpileManager();

      const farStockpile = manager.createStockpile({
        x: 100,
        y: 100,
        width: 3,
        depth: 3
      });
      farStockpile.deposit(100, 100, ResourceType.WOOD, 50);

      const nearStockpile = manager.createStockpile({
        x: 5,
        y: 5,
        width: 3,
        depth: 3
      });
      nearStockpile.deposit(5, 5, ResourceType.WOOD, 50);

      const result = manager.findNearestResourceSlot(
        { x: 0, y: 0 },
        ResourceType.WOOD
      );

      expect(result).not.toBeNull();
      expect(result.stockpile).toBe(nearStockpile);
    });
  });

  describe('Resource Tracking', () => {
    it('should get total resource quantity', () => {
      const manager = new StockpileManager();

      const s1 = manager.createStockpile({ x: 0, y: 0, width: 3, depth: 3 });
      s1.deposit(0, 0, ResourceType.WOOD, 30);

      const s2 = manager.createStockpile({ x: 10, y: 10, width: 3, depth: 3 });
      s2.deposit(10, 10, ResourceType.WOOD, 50);

      expect(manager.getTotalResourceQuantity(ResourceType.WOOD)).toBe(80);
    });

    it('should get all resources across stockpiles', () => {
      const manager = new StockpileManager();

      const s1 = manager.createStockpile({ x: 0, y: 0, width: 3, depth: 3 });
      s1.deposit(0, 0, ResourceType.WOOD, 30);
      s1.deposit(1, 0, ResourceType.STONE, 40);

      const s2 = manager.createStockpile({ x: 10, y: 10, width: 3, depth: 3 });
      s2.deposit(10, 10, ResourceType.WOOD, 50);

      const resources = manager.getAllResources();
      expect(resources.get(ResourceType.WOOD)).toBe(80);
      expect(resources.get(ResourceType.STONE)).toBe(40);
    });
  });

  describe('Serialization', () => {
    it('should serialize and deserialize', () => {
      const manager = new StockpileManager();

      const stockpile = manager.createStockpile({
        x: 10,
        y: 20,
        width: 5,
        depth: 5
      });
      stockpile.deposit(10, 20, ResourceType.WOOD, 100);

      const json = manager.toJSON();
      const restored = StockpileManager.fromJSON(json);

      expect(restored.getAllStockpiles().length).toBe(1);
      expect(restored.getTotalResourceQuantity(ResourceType.WOOD)).toBe(100);
    });
  });
});
