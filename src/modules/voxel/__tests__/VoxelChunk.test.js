/**
 * VoxelChunk.test.js - Unit tests for VoxelChunk
 *
 * Tests:
 * - Block get/set operations
 * - Metadata operations
 * - Layer operations
 * - Region filling
 * - Dirty tracking
 * - RLE compression for save/load
 */

import { VoxelChunk, ChunkRef } from '../VoxelChunk.js';
import { BlockType } from '../BlockTypes.js';

describe('VoxelChunk', () => {
  describe('Constructor and Initialization', () => {
    it('should create a chunk with correct properties', () => {
      const chunk = new VoxelChunk(5, 10);

      expect(chunk.chunkX).toBe(5);
      expect(chunk.chunkY).toBe(10);
      expect(chunk.config.sizeX).toBe(32);
      expect(chunk.config.sizeY).toBe(32);
      expect(chunk.config.sizeZ).toBe(16);
    });

    it('should initialize with all air blocks', () => {
      const chunk = new VoxelChunk(0, 0);

      for (let z = 0; z < 16; z++) {
        for (let y = 0; y < 32; y++) {
          for (let x = 0; x < 32; x++) {
            expect(chunk.getBlock(x, y, z)).toBe(BlockType.AIR);
          }
        }
      }
    });

    it('should calculate correct total blocks', () => {
      const chunk = new VoxelChunk(0, 0);
      expect(chunk.totalBlocks).toBe(32 * 32 * 16);
    });

    it('should use typed array for memory efficiency', () => {
      const chunk = new VoxelChunk(0, 0);
      expect(chunk.blocks).toBeInstanceOf(Uint8Array);
      expect(chunk.blocks.length).toBe(32 * 32 * 16);
    });
  });

  describe('Block Get/Set', () => {
    it('should set and get blocks correctly', () => {
      const chunk = new VoxelChunk(0, 0);

      chunk.setBlock(5, 10, 3, BlockType.STONE);
      expect(chunk.getBlock(5, 10, 3)).toBe(BlockType.STONE);

      chunk.setBlock(0, 0, 0, BlockType.DIRT);
      expect(chunk.getBlock(0, 0, 0)).toBe(BlockType.DIRT);

      chunk.setBlock(31, 31, 15, BlockType.WOOD_LOG);
      expect(chunk.getBlock(31, 31, 15)).toBe(BlockType.WOOD_LOG);
    });

    it('should return AIR for out-of-bounds reads', () => {
      const chunk = new VoxelChunk(0, 0);

      expect(chunk.getBlock(-1, 0, 0)).toBe(BlockType.AIR);
      expect(chunk.getBlock(0, -1, 0)).toBe(BlockType.AIR);
      expect(chunk.getBlock(0, 0, -1)).toBe(BlockType.AIR);
      expect(chunk.getBlock(32, 0, 0)).toBe(BlockType.AIR);
      expect(chunk.getBlock(0, 32, 0)).toBe(BlockType.AIR);
      expect(chunk.getBlock(0, 0, 16)).toBe(BlockType.AIR);
    });

    it('should return false for out-of-bounds writes', () => {
      const chunk = new VoxelChunk(0, 0);

      expect(chunk.setBlock(-1, 0, 0, BlockType.STONE)).toBe(false);
      expect(chunk.setBlock(32, 0, 0, BlockType.STONE)).toBe(false);
      expect(chunk.setBlock(0, 0, 16, BlockType.STONE)).toBe(false);
    });

    it('should track non-air block count', () => {
      const chunk = new VoxelChunk(0, 0);

      expect(chunk.stats.nonAirBlocks).toBe(0);

      chunk.setBlock(0, 0, 0, BlockType.STONE);
      expect(chunk.stats.nonAirBlocks).toBe(1);

      chunk.setBlock(1, 0, 0, BlockType.DIRT);
      expect(chunk.stats.nonAirBlocks).toBe(2);

      chunk.setBlock(0, 0, 0, BlockType.AIR);
      expect(chunk.stats.nonAirBlocks).toBe(1);
    });
  });

  describe('Metadata Operations', () => {
    it('should store and retrieve metadata', () => {
      const chunk = new VoxelChunk(0, 0);

      chunk.setMetadata(5, 5, 5, 42);
      expect(chunk.getMetadata(5, 5, 5)).toBe(42);
    });

    it('should return 0 for unset metadata', () => {
      const chunk = new VoxelChunk(0, 0);
      expect(chunk.getMetadata(0, 0, 0)).toBe(0);
    });

    it('should store block rotation in metadata', () => {
      const chunk = new VoxelChunk(0, 0);

      chunk.setBlockRotation(10, 10, 5, 2);
      expect(chunk.getBlockRotation(10, 10, 5)).toBe(2);

      chunk.setBlockRotation(10, 10, 5, 3);
      expect(chunk.getBlockRotation(10, 10, 5)).toBe(3);
    });

    it('should only allocate metadata array when needed', () => {
      const chunk = new VoxelChunk(0, 0);

      expect(chunk.metadata).toBeNull();

      chunk.setMetadata(0, 0, 0, 1);
      expect(chunk.metadata).toBeInstanceOf(Uint8Array);
    });
  });

  describe('Layer Operations', () => {
    it('should get a layer as Uint8Array', () => {
      const chunk = new VoxelChunk(0, 0);

      chunk.setBlock(5, 5, 3, BlockType.STONE);
      chunk.setBlock(10, 10, 3, BlockType.DIRT);

      const layer = chunk.getLayer(3);
      expect(layer).toBeInstanceOf(Uint8Array);
      expect(layer.length).toBe(32 * 32);
      expect(layer[5 * 32 + 5]).toBe(BlockType.STONE);
      expect(layer[10 * 32 + 10]).toBe(BlockType.DIRT);
    });

    it('should return empty layer for invalid Z', () => {
      const chunk = new VoxelChunk(0, 0);

      const layer = chunk.getLayer(-1);
      expect(layer.length).toBe(32 * 32);
      expect(layer.every(b => b === 0)).toBe(true);
    });

    it('should check if layer is empty', () => {
      const chunk = new VoxelChunk(0, 0);

      expect(chunk.isLayerEmpty(0)).toBe(true);

      chunk.setBlock(5, 5, 0, BlockType.STONE);
      expect(chunk.isLayerEmpty(0)).toBe(false);
      expect(chunk.isLayerEmpty(1)).toBe(true);
    });
  });

  describe('Region Operations', () => {
    it('should fill a region', () => {
      const chunk = new VoxelChunk(0, 0);

      chunk.fillRegion(0, 0, 0, 3, 3, 2, BlockType.STONE);

      for (let z = 0; z <= 2; z++) {
        for (let y = 0; y <= 3; y++) {
          for (let x = 0; x <= 3; x++) {
            expect(chunk.getBlock(x, y, z)).toBe(BlockType.STONE);
          }
        }
      }

      // Outside region should be air
      expect(chunk.getBlock(4, 0, 0)).toBe(BlockType.AIR);
    });

    it('should fill entire chunk', () => {
      const chunk = new VoxelChunk(0, 0);

      chunk.fill(BlockType.DIRT);

      expect(chunk.stats.nonAirBlocks).toBe(32 * 32 * 16);
      expect(chunk.getBlock(15, 15, 8)).toBe(BlockType.DIRT);
    });
  });

  describe('Block Finding', () => {
    it('should find highest block in column', () => {
      const chunk = new VoxelChunk(0, 0);

      chunk.setBlock(5, 5, 0, BlockType.STONE);
      chunk.setBlock(5, 5, 5, BlockType.DIRT);
      chunk.setBlock(5, 5, 10, BlockType.GRASS);

      expect(chunk.getHighestBlock(5, 5)).toBe(10);
    });

    it('should return -1 for empty column', () => {
      const chunk = new VoxelChunk(0, 0);
      expect(chunk.getHighestBlock(0, 0)).toBe(-1);
    });

    it('should find lowest block in column', () => {
      const chunk = new VoxelChunk(0, 0);

      chunk.setBlock(5, 5, 3, BlockType.STONE);
      chunk.setBlock(5, 5, 7, BlockType.DIRT);

      expect(chunk.getLowestBlock(5, 5)).toBe(3);
    });

    it('should find all blocks of a type', () => {
      const chunk = new VoxelChunk(0, 0);

      chunk.setBlock(1, 1, 1, BlockType.STONE);
      chunk.setBlock(5, 5, 5, BlockType.STONE);
      chunk.setBlock(10, 10, 10, BlockType.DIRT);

      const stoneBlocks = chunk.findBlocks(BlockType.STONE);
      expect(stoneBlocks.length).toBe(2);
      expect(stoneBlocks).toContainEqual({ x: 1, y: 1, z: 1 });
      expect(stoneBlocks).toContainEqual({ x: 5, y: 5, z: 5 });
    });
  });

  describe('Dirty Tracking', () => {
    it('should mark chunk as dirty on block change', () => {
      const chunk = new VoxelChunk(0, 0);
      chunk.clearDirty();

      expect(chunk.isDirty()).toBe(false);

      chunk.setBlock(0, 0, 0, BlockType.STONE);
      expect(chunk.isDirty()).toBe(true);
    });

    it('should track dirty layers', () => {
      const chunk = new VoxelChunk(0, 0);
      chunk.clearDirty();

      chunk.setBlock(5, 5, 3, BlockType.STONE);
      chunk.setBlock(5, 5, 7, BlockType.DIRT);

      const dirtyLayers = chunk.getDirtyLayers();
      expect(dirtyLayers.has(3)).toBe(true);
      expect(dirtyLayers.has(7)).toBe(true);
      expect(dirtyLayers.has(0)).toBe(false);
    });

    it('should clear dirty flags', () => {
      const chunk = new VoxelChunk(0, 0);

      chunk.setBlock(0, 0, 0, BlockType.STONE);
      expect(chunk.isDirty()).toBe(true);

      chunk.clearDirty();
      expect(chunk.isDirty()).toBe(false);
      expect(chunk.getDirtyLayers().size).toBe(0);
    });
  });

  describe('Serialization', () => {
    it('should serialize and deserialize correctly', () => {
      const chunk = new VoxelChunk(5, 10);

      chunk.setBlock(1, 2, 3, BlockType.STONE);
      chunk.setBlock(10, 10, 5, BlockType.WOOD_LOG);
      chunk.setMetadata(10, 10, 5, 2);

      const json = chunk.toJSON();
      const restored = VoxelChunk.fromJSON(json);

      expect(restored.chunkX).toBe(5);
      expect(restored.chunkY).toBe(10);
      expect(restored.getBlock(1, 2, 3)).toBe(BlockType.STONE);
      expect(restored.getBlock(10, 10, 5)).toBe(BlockType.WOOD_LOG);
      expect(restored.getMetadata(10, 10, 5)).toBe(2);
    });

    it('should use RLE compression for blocks', () => {
      const chunk = new VoxelChunk(0, 0);

      // Fill with mostly air (should compress well)
      chunk.setBlock(0, 0, 0, BlockType.STONE);

      const json = chunk.toJSON();

      // RLE should reduce array size
      expect(json.blocks.length).toBeLessThan(chunk.totalBlocks);
    });

    it('should restore stats after deserialization', () => {
      const chunk = new VoxelChunk(0, 0);

      chunk.setBlock(0, 0, 0, BlockType.STONE);
      chunk.setBlock(1, 0, 0, BlockType.DIRT);

      const json = chunk.toJSON();
      const restored = VoxelChunk.fromJSON(json);

      expect(restored.stats.nonAirBlocks).toBe(2);
    });
  });

  describe('Iteration', () => {
    it('should iterate over all non-air blocks', () => {
      const chunk = new VoxelChunk(0, 0);

      chunk.setBlock(1, 1, 1, BlockType.STONE);
      chunk.setBlock(2, 2, 2, BlockType.DIRT);

      const blocks = [];
      chunk.forEach((x, y, z, blockType) => {
        blocks.push({ x, y, z, blockType });
      });

      expect(blocks.length).toBe(2);
    });

    it('should iterate over a specific layer', () => {
      const chunk = new VoxelChunk(0, 0);

      chunk.setBlock(1, 1, 0, BlockType.STONE);
      chunk.setBlock(2, 2, 0, BlockType.DIRT);
      chunk.setBlock(1, 1, 1, BlockType.GRASS);

      const blocks = [];
      chunk.forEachInLayer(0, (x, y, blockType) => {
        blocks.push({ x, y, blockType });
      });

      expect(blocks.length).toBe(2);
    });
  });

  describe('World Coordinate Conversion', () => {
    it('should convert local to world coordinates', () => {
      const chunk = new VoxelChunk(3, 5);

      const world = chunk.localToWorld(10, 15);
      expect(world.x).toBe(3 * 32 + 10);
      expect(world.y).toBe(5 * 32 + 15);
    });
  });
});

describe('ChunkRef', () => {
  it('should create a reference with correct properties', () => {
    const ref = new ChunkRef(5, 10);

    expect(ref.chunkX).toBe(5);
    expect(ref.chunkY).toBe(10);
    expect(ref.key).toBe('5,10');
    expect(ref.loaded).toBe(false);
  });

  it('should update lastAccess on touch', () => {
    const ref = new ChunkRef(0, 0);
    const initialAccess = ref.lastAccess;

    // Wait a bit and touch
    return new Promise(resolve => {
      setTimeout(() => {
        ref.touch();
        expect(ref.lastAccess).toBeGreaterThanOrEqual(initialAccess);
        resolve();
      }, 10);
    });
  });
});
