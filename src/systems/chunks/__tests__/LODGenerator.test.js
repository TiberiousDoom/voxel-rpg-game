import {
  LOD_MERGE_FACTORS,
  LOD_SIZES,
  LOD_DISTANCES,
  getDominantBlock,
  generateLODBlocks,
  selectLODLevel,
  getLODVoxelScale,
} from '../LODGenerator';
import { BlockTypes } from '../blockTypes';
import { CHUNK_SIZE, CHUNK_SIZE_Y } from '../coordinates';

describe('LODGenerator', () => {
  describe('constants', () => {
    it('defines 3 LOD levels', () => {
      expect(LOD_MERGE_FACTORS).toHaveLength(3);
      expect(LOD_SIZES).toHaveLength(3);
      expect(LOD_DISTANCES).toHaveLength(3);
    });

    it('LOD 0 is full detail', () => {
      expect(LOD_MERGE_FACTORS[0]).toBe(1);
      expect(LOD_SIZES[0]).toBe(CHUNK_SIZE);
    });

    it('LOD 1 merges 2x2x2', () => {
      expect(LOD_MERGE_FACTORS[1]).toBe(2);
      expect(LOD_SIZES[1]).toBe(CHUNK_SIZE / 2);
    });

    it('LOD 2 merges 4x4x4', () => {
      expect(LOD_MERGE_FACTORS[2]).toBe(4);
      expect(LOD_SIZES[2]).toBe(CHUNK_SIZE / 4);
    });

    it('distances increase with LOD level', () => {
      expect(LOD_DISTANCES[0]).toBeLessThan(LOD_DISTANCES[1]);
      expect(LOD_DISTANCES[1]).toBeLessThan(LOD_DISTANCES[2]);
    });
  });

  describe('getDominantBlock', () => {
    it('returns AIR for all-air region', () => {
      const blocks = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE * CHUNK_SIZE_Y);
      expect(getDominantBlock(blocks, 0, 0, 0, 2)).toBe(BlockTypes.AIR);
    });

    it('returns the only non-air block type', () => {
      const blocks = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE * CHUNK_SIZE_Y);
      // Set a single stone block at (0,0,0)
      blocks[0] = BlockTypes.STONE;
      expect(getDominantBlock(blocks, 0, 0, 0, 2)).toBe(BlockTypes.STONE);
    });

    it('returns the most frequent block type', () => {
      const blocks = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE * CHUNK_SIZE_Y);
      // Fill a 2x2x2 region: 6 stone + 2 dirt → stone should win
      for (let dx = 0; dx < 2; dx++) {
        for (let dy = 0; dy < 2; dy++) {
          for (let dz = 0; dz < 2; dz++) {
            const idx = dx + (dz << 4) + (dy << 8);
            blocks[idx] = BlockTypes.STONE;
          }
        }
      }
      // Override 2 of them with dirt
      blocks[0] = BlockTypes.DIRT;
      blocks[1] = BlockTypes.DIRT;

      const result = getDominantBlock(blocks, 0, 0, 0, 2);
      expect(result).toBe(BlockTypes.STONE); // 6 stone vs 2 dirt
    });

    it('handles region at chunk boundary', () => {
      const blocks = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE * CHUNK_SIZE_Y);
      // Set block at (14,0,14)
      const idx = 14 + (14 << 4) + (0 << 8);
      blocks[idx] = BlockTypes.GRASS;
      expect(getDominantBlock(blocks, 14, 0, 14, 2)).toBe(BlockTypes.GRASS);
    });
  });

  describe('generateLODBlocks', () => {
    let blocks;

    beforeEach(() => {
      blocks = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE * CHUNK_SIZE_Y);
    });

    it('LOD 1 produces half-size output', () => {
      const result = generateLODBlocks(blocks, 1);
      const expectedSize = CHUNK_SIZE / 2;
      const expectedSizeY = Math.ceil(CHUNK_SIZE_Y / 2);
      expect(result.length).toBe(expectedSize * expectedSize * expectedSizeY);
    });

    it('LOD 2 produces quarter-size output', () => {
      const result = generateLODBlocks(blocks, 2);
      const expectedSize = CHUNK_SIZE / 4;
      const expectedSizeY = Math.ceil(CHUNK_SIZE_Y / 4);
      expect(result.length).toBe(expectedSize * expectedSize * expectedSizeY);
    });

    it('empty chunk produces all-air LOD', () => {
      const result = generateLODBlocks(blocks, 1);
      for (let i = 0; i < result.length; i++) {
        expect(result[i]).toBe(BlockTypes.AIR);
      }
    });

    it('solid chunk produces non-air LOD', () => {
      // Fill bottom layer with stone
      for (let x = 0; x < CHUNK_SIZE; x++) {
        for (let z = 0; z < CHUNK_SIZE; z++) {
          blocks[x + (z << 4) + (0 << 8)] = BlockTypes.STONE;
        }
      }

      const result = generateLODBlocks(blocks, 1);
      const lodSize = CHUNK_SIZE / 2;
      // Bottom LOD layer should have stone
      let hasStone = false;
      for (let x = 0; x < lodSize; x++) {
        for (let z = 0; z < lodSize; z++) {
          if (result[x + z * lodSize] === BlockTypes.STONE) {
            hasStone = true;
          }
        }
      }
      expect(hasStone).toBe(true);
    });

    it('preserves dominant block through LOD generation', () => {
      // Fill a 4x4x4 region with grass
      for (let x = 0; x < 4; x++) {
        for (let y = 0; y < 4; y++) {
          for (let z = 0; z < 4; z++) {
            blocks[x + (z << 4) + (y << 8)] = BlockTypes.GRASS;
          }
        }
      }

      // LOD 2 merges 4x4x4 → should produce grass at (0,0,0)
      const result = generateLODBlocks(blocks, 2);
      expect(result[0]).toBe(BlockTypes.GRASS);
    });
  });

  describe('selectLODLevel', () => {
    it('returns LOD 0 for nearby chunks', () => {
      expect(selectLODLevel(0, 0)).toBe(0);
      expect(selectLODLevel(2, 2)).toBe(0);
      expect(selectLODLevel(4, 0)).toBe(0);
      expect(selectLODLevel(0, 4)).toBe(0);
    });

    it('returns LOD 1 for medium-distance chunks', () => {
      expect(selectLODLevel(5, 0)).toBe(1);
      expect(selectLODLevel(0, 6)).toBe(1);
      expect(selectLODLevel(8, 0)).toBe(1);
    });

    it('returns LOD 2 for far chunks', () => {
      expect(selectLODLevel(9, 0)).toBe(2);
      expect(selectLODLevel(0, 10)).toBe(2);
      expect(selectLODLevel(20, 20)).toBe(2);
    });

    it('uses Chebyshev distance (max of abs)', () => {
      // dx=3, dz=8 → max=8 → LOD 1
      expect(selectLODLevel(3, 8)).toBe(1);
      // dx=8, dz=3 → max=8 → LOD 1
      expect(selectLODLevel(8, 3)).toBe(1);
    });

    it('handles negative coordinates', () => {
      expect(selectLODLevel(-3, -3)).toBe(0);
      expect(selectLODLevel(-6, 0)).toBe(1);
      expect(selectLODLevel(-10, -10)).toBe(2);
    });

    it('matches LOD_DISTANCES thresholds', () => {
      // At exactly the threshold
      expect(selectLODLevel(LOD_DISTANCES[0], 0)).toBe(0);
      expect(selectLODLevel(LOD_DISTANCES[1], 0)).toBe(1);
      // Beyond threshold
      expect(selectLODLevel(LOD_DISTANCES[0] + 1, 0)).toBe(1);
      expect(selectLODLevel(LOD_DISTANCES[1] + 1, 0)).toBe(2);
    });
  });

  describe('getLODVoxelScale', () => {
    it('returns 1 for LOD 0 (full detail)', () => {
      expect(getLODVoxelScale(0)).toBe(1);
    });

    it('returns 2 for LOD 1', () => {
      expect(getLODVoxelScale(1)).toBe(2);
    });

    it('returns 4 for LOD 2', () => {
      expect(getLODVoxelScale(2)).toBe(4);
    });

    it('matches LOD_MERGE_FACTORS', () => {
      for (let i = 0; i < LOD_MERGE_FACTORS.length; i++) {
        expect(getLODVoxelScale(i)).toBe(LOD_MERGE_FACTORS[i]);
      }
    });
  });
});
