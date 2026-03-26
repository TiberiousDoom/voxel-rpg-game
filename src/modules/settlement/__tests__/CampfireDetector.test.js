/**
 * CampfireDetector.test.js — Tests for campfire scanning and terrain Y lookup.
 */

import { scanForCampfire, getTerrainYAt } from '../CampfireDetector';

// Mock blockTypes module
vi.mock('../../../systems/chunks/blockTypes', () => ({
  BlockTypes: { CAMPFIRE: 42, STONE: 1, AIR: 0 },
  isSolid: (block) => block === 1, // only STONE is solid
}));

vi.mock('../../../systems/chunks/coordinates', () => ({
  CHUNK_SIZE: 16,
  CHUNK_SIZE_Y: 64,
  VOXEL_SIZE: 2,
}));

function makeChunkAdapter(chunks, getBlockFn) {
  return {
    iterateChunks: () => chunks[Symbol.iterator](),
    getBlock: getBlockFn || (() => 0),
  };
}

function makeEmptyBlocks() {
  return new Uint8Array(16 * 16 * 64); // all zeros (AIR)
}

describe('scanForCampfire', () => {
  test('returns null when no chunks have campfires', () => {
    const blocks = makeEmptyBlocks();
    const chunks = [{ x: 0, z: 0, blocks }];
    const adapter = makeChunkAdapter(chunks);
    expect(scanForCampfire(adapter)).toBeNull();
  });

  test('returns correct world position when campfire found', () => {
    const blocks = makeEmptyBlocks();
    // Place campfire at local x=2, z=3, y=5 in chunk (0,0)
    blocks[2 + (3 << 4) + (5 << 8)] = 42; // CAMPFIRE
    const chunks = [{ x: 0, z: 0, blocks }];
    const adapter = makeChunkAdapter(chunks);
    const result = scanForCampfire(adapter);
    expect(result).not.toBeNull();
    // wx = (0*16 + 2) * 2 + 1 = 5
    // wy = 5 * 2 + 1 = 11
    // wz = (0*16 + 3) * 2 + 1 = 7
    expect(result[0]).toBe(5);
    expect(result[1]).toBe(11);
    expect(result[2]).toBe(7);
  });

  test('returns first campfire found (early exit)', () => {
    const blocks1 = makeEmptyBlocks();
    const blocks2 = makeEmptyBlocks();
    blocks1[0 + (0 << 4) + (1 << 8)] = 42; // campfire at (0,1,0) in chunk 0
    blocks2[1 + (1 << 4) + (2 << 8)] = 42; // campfire at (1,2,1) in chunk 1
    const chunks = [
      { x: 0, z: 0, blocks: blocks1 },
      { x: 1, z: 0, blocks: blocks2 },
    ];
    const adapter = makeChunkAdapter(chunks);
    const result = scanForCampfire(adapter);
    // Should find the first chunk's campfire
    // wx = (0*16 + 0) * 2 + 1 = 1
    // wy = 1 * 2 + 1 = 3
    // wz = (0*16 + 0) * 2 + 1 = 1
    expect(result[0]).toBe(1);
    expect(result[1]).toBe(3);
    expect(result[2]).toBe(1);
  });

  test('handles chunk with null blocks', () => {
    const chunks = [{ x: 0, z: 0, blocks: null }];
    const adapter = makeChunkAdapter(chunks);
    expect(scanForCampfire(adapter)).toBeNull();
  });
});

describe('getTerrainYAt', () => {
  test('returns Y above highest solid block', () => {
    // Solid block at vy=4, air above
    const adapter = makeChunkAdapter([], (wx, wy, wz) => {
      // vy=4 → worldY = 4*2+1 = 9
      if (wy === 9) return 1; // STONE
      return 0; // AIR
    });
    const y = getTerrainYAt(adapter, 10, 10);
    // (4+1) * 2 = 10
    expect(y).toBe(10);
  });

  test('returns fallback 2 when no solid blocks', () => {
    const adapter = makeChunkAdapter([], () => 0);
    expect(getTerrainYAt(adapter, 10, 10)).toBe(2);
  });
});
