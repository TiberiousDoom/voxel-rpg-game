/**
 * VoxelBuildingIntegration.test.js - Integration tests for voxel building system
 *
 * Tests the complete integration of all voxel building modules:
 * - VoxelBuildingOrchestrator
 * - Stockpile management
 * - Construction workflow
 * - Hauling coordination
 * - Builder NPC behavior
 * - Job management
 *
 * Part of Phase 17: Integration Tests
 */

import { VoxelBuildingOrchestrator } from '../VoxelBuildingOrchestrator.js';
import { BlockType } from '../../voxel/BlockTypes.js';

describe('VoxelBuildingOrchestrator', () => {
  let orchestrator;

  beforeEach(() => {
    orchestrator = new VoxelBuildingOrchestrator({
      chunkSize: 32,
      maxHeight: 16
    });
    orchestrator.initialize({});
  });

  afterEach(() => {
    orchestrator.reset();
  });

  describe('Initialization', () => {
    test('should create with default config', () => {
      expect(orchestrator).toBeDefined();
      expect(orchestrator.voxelWorld).toBeDefined();
      expect(orchestrator.stockpileManager).toBeDefined();
      expect(orchestrator.constructionManager).toBeDefined();
      expect(orchestrator.haulingManager).toBeDefined();
      expect(orchestrator.builderManager).toBeDefined();
      expect(orchestrator.jobManager).toBeDefined();
    });

    test('should be enabled by default', () => {
      expect(orchestrator.enabled).toBe(true);
    });

    test('should initialize statistics', () => {
      const stats = orchestrator.getStats();
      expect(stats.totalBlocksPlaced).toBe(0);
      expect(stats.totalSitesCompleted).toBe(0);
    });
  });

  describe('Voxel World Operations', () => {
    test('should get and set blocks', () => {
      const result = orchestrator.setBlock(5, 5, 0, BlockType.STONE);
      expect(result).toBe(true);

      const block = orchestrator.getBlock(5, 5, 0);
      expect(block).toBe(BlockType.STONE);
    });

    test('should track blocks placed in statistics', () => {
      orchestrator.setBlock(0, 0, 0, BlockType.DIRT);
      orchestrator.setBlock(1, 0, 0, BlockType.DIRT);
      orchestrator.setBlock(2, 0, 0, BlockType.STONE);

      const stats = orchestrator.getStats();
      expect(stats.totalBlocksPlaced).toBe(3);
    });

    test('should place multiple blocks', () => {
      orchestrator.setBlock(0, 0, 0, BlockType.DIRT);
      orchestrator.setBlock(1, 0, 0, BlockType.STONE);
      orchestrator.setBlock(2, 0, 0, BlockType.GRASS);

      expect(orchestrator.getBlock(0, 0, 0)).toBe(BlockType.DIRT);
      expect(orchestrator.getBlock(1, 0, 0)).toBe(BlockType.STONE);
      expect(orchestrator.getBlock(2, 0, 0)).toBe(BlockType.GRASS);
    });
  });

  describe('Stockpile Management', () => {
    test('should create stockpile', () => {
      const stockpile = orchestrator.createStockpile({
        name: 'Test Stockpile',
        position: { x: 10, y: 10 },
        width: 5,
        height: 5
      });

      expect(stockpile).toBeDefined();
      expect(stockpile.name).toBe('Test Stockpile');
    });

    test('should remove stockpile', () => {
      const stockpile = orchestrator.createStockpile({
        name: 'To Remove',
        position: { x: 20, y: 20 },
        width: 3,
        height: 3
      });

      const removed = orchestrator.removeStockpile(stockpile.id);
      expect(removed).toBe(true);
    });

    test('should get all resources from stockpiles', () => {
      orchestrator.createStockpile({
        name: 'Resource Stockpile',
        position: { x: 0, y: 0 },
        width: 5,
        height: 5
      });

      const resources = orchestrator.getAllResources();
      expect(resources).toBeDefined();
    });
  });

  describe('Builder NPC Management', () => {
    test('should register builder', () => {
      const builder = orchestrator.registerBuilder('npc-1');
      expect(builder).toBeDefined();
    });

    test('should unregister builder', () => {
      orchestrator.registerBuilder('npc-2');
      orchestrator.unregisterBuilder('npc-2');

      const ids = orchestrator.getBuilderIds();
      expect(ids).not.toContain('npc-2');
    });

    test('should get builder IDs', () => {
      orchestrator.registerBuilder('builder-a');
      orchestrator.registerBuilder('builder-b');

      const ids = orchestrator.getBuilderIds();
      expect(ids).toContain('builder-a');
      expect(ids).toContain('builder-b');
    });
  });

  describe('Update Cycle', () => {
    test('should update when enabled', () => {
      orchestrator.initialize({});

      const result = orchestrator.update(1.0, {});
      expect(result.skipped).not.toBe(true);
    });

    test('should skip update when disabled', () => {
      orchestrator.setEnabled(false);

      const result = orchestrator.update(1.0, {});
      expect(result.skipped).toBe(true);
    });

    test('should return update results', () => {
      const result = orchestrator.update(1.0, {});

      expect(result.hauling).toBeDefined();
      expect(result.building).toBeDefined();
      expect(result.jobs).toBeDefined();
      expect(result.construction).toBeDefined();
    });
  });

  describe('State Management', () => {
    test('should enable/disable system', () => {
      orchestrator.setEnabled(false);
      expect(orchestrator.enabled).toBe(false);

      orchestrator.setEnabled(true);
      expect(orchestrator.enabled).toBe(true);
    });

    test('should export state to JSON', () => {
      orchestrator.setBlock(5, 5, 0, BlockType.STONE);
      orchestrator.createStockpile({
        name: 'Export Test',
        position: { x: 0, y: 0 },
        width: 3,
        height: 3
      });

      const json = orchestrator.toJSON();

      expect(json).toBeDefined();
      expect(json.voxelWorld).toBeDefined();
      expect(json.stockpileManager).toBeDefined();
      expect(json.stats).toBeDefined();
    });

    test('should reset to initial state', () => {
      orchestrator.setBlock(1, 1, 0, BlockType.STONE);
      orchestrator.createStockpile({
        name: 'To Reset',
        position: { x: 0, y: 0 },
        width: 3,
        height: 3
      });

      orchestrator.reset();

      // After reset, stats should be reset
      expect(orchestrator.stats.totalBlocksPlaced).toBe(0);
      expect(orchestrator.stats.totalSitesCompleted).toBe(0);
    });
  });

  describe('Statistics', () => {
    test('should track basic stats', () => {
      expect(orchestrator.stats.totalBlocksPlaced).toBeDefined();
      expect(orchestrator.stats.totalBlocksRemoved).toBeDefined();
      expect(orchestrator.stats.totalSitesCompleted).toBeDefined();
    });
  });
});

describe('Terrain Conversion Integration', () => {
  let orchestrator;

  beforeEach(() => {
    orchestrator = new VoxelBuildingOrchestrator({
      chunkSize: 32,
      maxHeight: 16
    });
  });

  test('should report no terrain converter when not initialized', () => {
    orchestrator.initialize({});
    expect(orchestrator.hasTerrainConverter()).toBe(false);
  });

  test('should return null for terrain conversion without converter', () => {
    orchestrator.initialize({});

    const result = orchestrator.convertTerrainRegion(0, 0, 10, 10);
    expect(result).toBeNull();
  });

  test('should return 0 for surface level without converter', () => {
    orchestrator.initialize({});

    const level = orchestrator.getVoxelSurfaceLevel(5, 5);
    expect(level).toBe(0);
  });
});
