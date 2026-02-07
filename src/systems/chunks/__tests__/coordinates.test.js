import {
  CHUNK_SIZE,
  CHUNK_SIZE_Y,
  VOXEL_SIZE,
  worldToChunk,
  worldToLocal,
  localToWorld,
  chunkOriginWorld,
  chunkKey,
  parseChunkKey,
  blockIndex,
  indexToLocal,
  chunkDistance,
  chunkDistanceSq,
  isInBounds,
  getChunksInRadius,
  getChunksInRadiusSorted,
} from '../coordinates';

describe('coordinates', () => {
  describe('constants', () => {
    it('has expected chunk dimensions', () => {
      expect(CHUNK_SIZE).toBe(16);
      expect(CHUNK_SIZE_Y).toBe(16);
      expect(VOXEL_SIZE).toBe(2);
    });
  });

  describe('worldToChunk', () => {
    it('converts origin to chunk 0,0', () => {
      expect(worldToChunk(0, 0)).toEqual({ chunkX: 0, chunkZ: 0 });
    });

    it('converts positive coordinates', () => {
      // VOXEL_SIZE=2, CHUNK_SIZE=16 → chunk size in world = 32
      expect(worldToChunk(33, 33)).toEqual({ chunkX: 1, chunkZ: 1 });
    });

    it('converts negative coordinates', () => {
      expect(worldToChunk(-1, -1)).toEqual({ chunkX: -1, chunkZ: -1 });
    });

    it('handles chunk boundary', () => {
      // At exactly 32 world units → voxel 16 → chunk 1
      expect(worldToChunk(32, 0)).toEqual({ chunkX: 1, chunkZ: 0 });
    });
  });

  describe('worldToLocal', () => {
    it('converts origin to local 0,0,0 in chunk 0,0', () => {
      const result = worldToLocal(0, 0, 0);
      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
      expect(result.z).toBe(0);
      expect(result.chunkX).toBe(0);
      expect(result.chunkZ).toBe(0);
    });

    it('wraps local coordinates correctly', () => {
      // World 34 → voxel 17 → chunk 1, local 1
      const result = worldToLocal(34, 4, 34);
      expect(result.chunkX).toBe(1);
      expect(result.chunkZ).toBe(1);
      expect(result.x).toBe(1);
      expect(result.z).toBe(1);
    });

    it('clamps Y to valid range', () => {
      const result = worldToLocal(0, -10, 0);
      expect(result.y).toBe(0);

      const high = worldToLocal(0, 100, 0);
      expect(high.y).toBe(CHUNK_SIZE_Y - 1);
    });
  });

  describe('localToWorld', () => {
    it('converts chunk 0,0 local 0,0,0 to world center of voxel', () => {
      const result = localToWorld(0, 0, 0, 0, 0);
      expect(result.x).toBe(VOXEL_SIZE / 2);
      expect(result.y).toBe(VOXEL_SIZE / 2);
      expect(result.z).toBe(VOXEL_SIZE / 2);
    });

    it('converts chunk 1,1 local 0,0,0', () => {
      const result = localToWorld(1, 1, 0, 0, 0);
      expect(result.x).toBe(CHUNK_SIZE * VOXEL_SIZE + VOXEL_SIZE / 2);
      expect(result.z).toBe(CHUNK_SIZE * VOXEL_SIZE + VOXEL_SIZE / 2);
    });
  });

  describe('chunkOriginWorld', () => {
    it('returns origin for chunk 0,0', () => {
      expect(chunkOriginWorld(0, 0)).toEqual({ x: 0, y: 0, z: 0 });
    });

    it('scales by chunk size and voxel size', () => {
      const result = chunkOriginWorld(1, 2);
      expect(result.x).toBe(CHUNK_SIZE * VOXEL_SIZE);
      expect(result.z).toBe(2 * CHUNK_SIZE * VOXEL_SIZE);
    });
  });

  describe('chunkKey / parseChunkKey', () => {
    it('creates key from coordinates', () => {
      expect(chunkKey(3, -5)).toBe('3,-5');
    });

    it('round-trips through parse', () => {
      const key = chunkKey(7, -2);
      expect(parseChunkKey(key)).toEqual({ chunkX: 7, chunkZ: -2 });
    });
  });

  describe('blockIndex / indexToLocal', () => {
    it('maps 0,0,0 to index 0', () => {
      expect(blockIndex(0, 0, 0)).toBe(0);
    });

    it('uses XZY order', () => {
      // x + z*16 + y*256
      expect(blockIndex(1, 0, 0)).toBe(1);
      expect(blockIndex(0, 0, 1)).toBe(16);
      expect(blockIndex(0, 1, 0)).toBe(256);
    });

    it('round-trips through indexToLocal', () => {
      const coords = { x: 5, y: 10, z: 3 };
      const idx = blockIndex(coords.x, coords.y, coords.z);
      expect(indexToLocal(idx)).toEqual(coords);
    });

    it('handles all corners', () => {
      expect(indexToLocal(blockIndex(0, 0, 0))).toEqual({ x: 0, y: 0, z: 0 });
      expect(indexToLocal(blockIndex(15, 15, 15))).toEqual({ x: 15, y: 15, z: 15 });
    });
  });

  describe('chunkDistance', () => {
    it('returns Manhattan distance', () => {
      expect(chunkDistance(0, 0, 3, 4)).toBe(7);
      expect(chunkDistance(0, 0, 0, 0)).toBe(0);
    });
  });

  describe('chunkDistanceSq', () => {
    it('returns squared Euclidean distance', () => {
      expect(chunkDistanceSq(0, 0, 3, 4)).toBe(25);
      expect(chunkDistanceSq(0, 0, 0, 0)).toBe(0);
    });
  });

  describe('isInBounds', () => {
    it('accepts valid coordinates', () => {
      expect(isInBounds(0, 0, 0)).toBe(true);
      expect(isInBounds(15, 15, 15)).toBe(true);
      expect(isInBounds(8, 8, 8)).toBe(true);
    });

    it('rejects out-of-bounds coordinates', () => {
      expect(isInBounds(-1, 0, 0)).toBe(false);
      expect(isInBounds(0, -1, 0)).toBe(false);
      expect(isInBounds(0, 0, -1)).toBe(false);
      expect(isInBounds(16, 0, 0)).toBe(false);
      expect(isInBounds(0, 16, 0)).toBe(false);
      expect(isInBounds(0, 0, 16)).toBe(false);
    });
  });

  describe('getChunksInRadius', () => {
    it('returns correct count for radius 1', () => {
      const chunks = getChunksInRadius(0, 0, 1);
      // (2*1+1)^2 = 9
      expect(chunks).toHaveLength(9);
    });

    it('includes center chunk', () => {
      const chunks = getChunksInRadius(5, 5, 1);
      expect(chunks).toContainEqual({ chunkX: 5, chunkZ: 5 });
    });
  });

  describe('getChunksInRadiusSorted', () => {
    it('sorts by distance from center', () => {
      const chunks = getChunksInRadiusSorted(0, 0, 2);
      // First should be center (distance 0)
      expect(chunks[0].chunkX).toBe(0);
      expect(chunks[0].chunkZ).toBe(0);
      expect(chunks[0].distanceSq).toBe(0);

      // Verify sorted order
      for (let i = 1; i < chunks.length; i++) {
        expect(chunks[i].distanceSq).toBeGreaterThanOrEqual(chunks[i - 1].distanceSq);
      }
    });
  });
});
