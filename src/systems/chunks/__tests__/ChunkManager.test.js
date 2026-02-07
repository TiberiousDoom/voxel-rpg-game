import { ChunkManager } from '../ChunkManager';
import { Chunk, ChunkState } from '../Chunk';
import { chunkKey, CHUNK_SIZE, VOXEL_SIZE } from '../coordinates';
import { BlockTypes } from '../blockTypes';

describe('ChunkManager', () => {
  let manager;

  beforeEach(() => {
    manager = new ChunkManager({
      viewDistance: 2,
      seed: 12345,
    });
  });

  afterEach(() => {
    manager.dispose();
  });

  describe('constructor', () => {
    it('sets view distance', () => {
      expect(manager.viewDistance).toBe(2);
    });

    it('sets seed', () => {
      expect(manager.seed).toBe(12345);
    });

    it('uses default view distance when not specified', () => {
      const m = new ChunkManager();
      expect(m.viewDistance).toBe(8);
      m.dispose();
    });

    it('starts with no active chunks', () => {
      expect(manager.chunks.size).toBe(0);
    });
  });

  describe('updatePlayerPosition', () => {
    it('updates player chunk coordinates', () => {
      manager.updatePlayerPosition(0, 0);
      expect(manager.playerChunkX).toBe(0);
      expect(manager.playerChunkZ).toBe(0);
    });

    it('queues chunks for loading', () => {
      manager.updatePlayerPosition(0, 0);
      expect(manager.loadQueue.length).toBeGreaterThan(0);
    });

    it('does not re-queue when player stays in same chunk', () => {
      manager.updatePlayerPosition(0, 0);
      const initialQueueLength = manager.loadQueue.length;
      manager.updatePlayerPosition(1, 1); // still in chunk 0,0
      expect(manager.loadQueue.length).toBe(initialQueueLength);
    });
  });

  describe('getChunk', () => {
    it('returns undefined for unloaded chunks', () => {
      expect(manager.getChunk(0, 0)).toBeUndefined();
    });

    it('returns chunk after it is loaded', () => {
      const chunk = new Chunk(0, 0);
      chunk.state = ChunkState.READY;
      manager.chunks.set(chunk.key, chunk);
      expect(manager.getChunk(0, 0)).toBe(chunk);
    });
  });

  describe('getChunkByKey', () => {
    it('returns chunk by key string', () => {
      const chunk = new Chunk(1, 2);
      manager.chunks.set(chunk.key, chunk);
      expect(manager.getChunkByKey('1,2')).toBe(chunk);
    });
  });

  describe('getBlock / setBlock', () => {
    let chunk;

    beforeEach(() => {
      chunk = new Chunk(0, 0);
      chunk.state = ChunkState.READY;
      // Set a test block: local (5, 3, 7) → world position depends on VOXEL_SIZE
      chunk.setBlock(5, 3, 7, BlockTypes.STONE);
      manager.chunks.set(chunk.key, chunk);
    });

    it('gets block at world coordinates', () => {
      const worldX = 5 * VOXEL_SIZE;
      const worldY = 3 * VOXEL_SIZE;
      const worldZ = 7 * VOXEL_SIZE;
      expect(manager.getBlock(worldX, worldY, worldZ)).toBe(BlockTypes.STONE);
    });

    it('returns AIR for unloaded chunks', () => {
      expect(manager.getBlock(1000, 0, 1000)).toBe(0);
    });

    it('sets block at world coordinates', () => {
      const worldX = 10 * VOXEL_SIZE;
      const worldY = 5 * VOXEL_SIZE;
      const worldZ = 2 * VOXEL_SIZE;
      const result = manager.setBlock(worldX, worldY, worldZ, BlockTypes.DIRT);
      expect(result).toBe(true);
      expect(manager.getBlock(worldX, worldY, worldZ)).toBe(BlockTypes.DIRT);
    });

    it('returns false for unloaded chunk setBlock', () => {
      expect(manager.setBlock(1000, 0, 1000, BlockTypes.STONE)).toBe(false);
    });

    it('marks mesh dirty and adds to rebuild queue', () => {
      chunk.meshDirty = false;
      manager.meshRebuildQueue.clear();
      const worldX = 8 * VOXEL_SIZE;
      manager.setBlock(worldX, 0, 0, BlockTypes.GRASS);
      expect(chunk.meshDirty).toBe(true);
      expect(manager.meshRebuildQueue.has(chunk.key)).toBe(true);
    });

    it('marks neighbor dirty for edge blocks', () => {
      // Set up east neighbor
      const eastChunk = new Chunk(1, 0);
      eastChunk.state = ChunkState.READY;
      manager.chunks.set(eastChunk.key, eastChunk);
      chunk.setNeighbor('east', eastChunk);

      eastChunk.meshDirty = false;
      // Set block at local x=15 (east edge)
      const worldX = 15 * VOXEL_SIZE;
      manager.setBlock(worldX, 0, 0, BlockTypes.STONE);
      expect(eastChunk.meshDirty).toBe(true);
    });
  });

  describe('getDirtyChunks', () => {
    it('returns empty array when no dirty chunks', () => {
      const chunk = new Chunk(0, 0);
      chunk.meshDirty = false;
      manager.chunks.set(chunk.key, chunk);
      expect(manager.getDirtyChunks()).toHaveLength(0);
    });

    it('returns dirty chunks', () => {
      const chunk = new Chunk(0, 0);
      chunk.meshDirty = true;
      manager.chunks.set(chunk.key, chunk);
      const dirty = manager.getDirtyChunks();
      expect(dirty).toHaveLength(1);
      expect(dirty[0]).toBe(chunk);
    });
  });

  describe('generateChunkSync', () => {
    it('generates a chunk with terrain', () => {
      const chunk = manager.generateChunkSync(0, 0);
      expect(chunk).toBeInstanceOf(Chunk);
      expect(chunk.x).toBe(0);
      expect(chunk.z).toBe(0);
      // Should have some non-air blocks (terrain)
      expect(chunk.getBlockCount()).toBeGreaterThan(0);
    });

    it('includes bedrock at y=0', () => {
      const chunk = manager.generateChunkSync(0, 0);
      // At least some x,z positions should have bedrock at y=0
      let hasBedrock = false;
      for (let x = 0; x < CHUNK_SIZE; x++) {
        for (let z = 0; z < CHUNK_SIZE; z++) {
          if (chunk.getBlock(x, 0, z) === 8) { // BlockType 8 = BEDROCK
            hasBedrock = true;
            break;
          }
        }
        if (hasBedrock) break;
      }
      expect(hasBedrock).toBe(true);
    });
  });

  describe('updateNeighbors', () => {
    it('links chunks to their neighbors', () => {
      const center = new Chunk(0, 0);
      const north = new Chunk(0, 1);
      const south = new Chunk(0, -1);
      const east = new Chunk(1, 0);
      const west = new Chunk(-1, 0);

      manager.chunks.set(center.key, center);
      manager.chunks.set(north.key, north);
      manager.chunks.set(south.key, south);
      manager.chunks.set(east.key, east);
      manager.chunks.set(west.key, west);

      manager.updateNeighbors(center);

      expect(center.neighbors.north).toBe(north);
      expect(center.neighbors.south).toBe(south);
      expect(center.neighbors.east).toBe(east);
      expect(center.neighbors.west).toBe(west);

      // Bidirectional
      expect(north.neighbors.south).toBe(center);
      expect(south.neighbors.north).toBe(center);
    });
  });

  describe('markMeshDirty', () => {
    it('marks chunk mesh dirty and adds to rebuild queue', () => {
      const chunk = new Chunk(0, 0);
      chunk.meshDirty = false;
      manager.chunks.set(chunk.key, chunk);

      manager.markMeshDirty(chunk.key);
      expect(chunk.meshDirty).toBe(true);
      expect(manager.meshRebuildQueue.has(chunk.key)).toBe(true);
    });

    it('handles non-existent chunk key gracefully', () => {
      expect(() => manager.markMeshDirty('nonexistent')).not.toThrow();
    });
  });

  describe('getStats', () => {
    it('returns current statistics', () => {
      const stats = manager.getStats();
      expect(stats).toHaveProperty('activeChunks');
      expect(stats).toHaveProperty('loadQueueSize');
      expect(stats).toHaveProperty('loadingCount');
      expect(stats).toHaveProperty('chunksLoaded');
    });
  });

  describe('dispose', () => {
    it('clears all chunks and queues', () => {
      const chunk = new Chunk(0, 0);
      manager.chunks.set(chunk.key, chunk);
      manager.loadQueue.enqueue(1, 1, 0);
      manager.meshRebuildQueue.add(chunk.key);

      manager.dispose();

      expect(manager.chunks.size).toBe(0);
      expect(manager.loadQueue.length).toBe(0);
      expect(manager.meshRebuildQueue.size).toBe(0);
    });
  });
});
