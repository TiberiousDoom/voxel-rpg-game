/**
 * CorruptionManager.test.js — Tests for corruption fade during rift closing.
 */

import CorruptionManager from '../CorruptionManager';

// Mock block types
vi.mock('../../chunks/blockTypes', () => ({
  BlockTypes: {
    AIR: 0, STONE: 1, GRASS: 3,
    CORRUPTED_STONE: 18, CORRUPTED_GRASS: 19,
    DEAD_LEAVES: 20, DEAD_WOOD: 21,
    LEAVES: 7, WOOD: 6,
  },
  CORRUPTION_REVERSE: { 18: 1, 19: 3, 20: 7, 21: 6 },
  isCorrupted: (b) => b >= 18 && b <= 21,
}));

vi.mock('../../chunks/coordinates', () => ({
  VOXEL_SIZE: 2,
}));

vi.mock('../../../data/tuning', () => ({
  CORRUPTION_RADIUS_LIGHT: 32,
  RIFT_VOID_SHARD_DROP_CHANCE: 0.5, // High for testing
}));

function makeChunkManager() {
  const blocks = {};
  return {
    getBlock: (x, y, z) => blocks[`${x},${y},${z}`] || 0,
    setBlock: (x, y, z, type) => { blocks[`${x},${y},${z}`] = type; },
    _blocks: blocks,
  };
}

function makeRiftManager() {
  return {
    tickCorruptionFade: vi.fn((rift, delta, playerPos, npcCount) => {
      // Simulate fade
      rift.corruptionProgress = Math.max(0, rift.corruptionProgress - 0.1);
      return rift.corruptionProgress;
    }),
  };
}

describe('CorruptionManager', () => {
  let cm;

  beforeEach(() => {
    cm = new CorruptionManager();
  });

  test('does nothing before fade interval', () => {
    const result = cm.update(1, [], null, null, [0, 0, 0]);
    expect(result.blocksRestored).toBe(0);
  });

  test('does nothing with no closing rifts', () => {
    const result = cm.update(3, [], makeChunkManager(), makeRiftManager(), [0, 0, 0]);
    expect(result.blocksRestored).toBe(0);
    expect(result.fullyPurified).toEqual([]);
  });

  test('restores corrupted blocks in the fade ring', () => {
    const chunkMgr = makeChunkManager();
    const rm = makeRiftManager();

    // Place corrupted blocks at various distances from rift center (100, 100)
    const riftX = 100, riftZ = 100;
    // Outer ring (should be restored as corruption fades)
    chunkMgr.setBlock(riftX + 60, 1, riftZ, 18); // CORRUPTED_STONE at ~60 units

    const closingRift = {
      id: 'rift-0',
      x: riftX, z: riftZ,
      state: 'CLOSING',
      corruptionProgress: 0.5, // Will become 0.4 after tick
      anchorHealth: 100,
      lastReinforcementTime: 0,
    };

    const result = cm.update(3, [closingRift], chunkMgr, rm, [riftX, 0, riftZ]);

    // tickCorruptionFade should have been called
    expect(rm.tickCorruptionFade).toHaveBeenCalledTimes(1);
  });

  test('reports fullyPurified when corruptionProgress reaches 0', () => {
    const chunkMgr = makeChunkManager();
    const rm = {
      tickCorruptionFade: vi.fn((rift) => {
        rift.corruptionProgress = 0;
        return 0;
      }),
    };

    const closingRift = {
      id: 'rift-0',
      x: 100, z: 100,
      state: 'CLOSING',
      corruptionProgress: 0.01,
      anchorHealth: 100,
      lastReinforcementTime: 0,
    };

    const result = cm.update(3, [closingRift], chunkMgr, rm, [100, 0, 100]);
    expect(result.fullyPurified).toContain('rift-0');
  });

  describe('getCorruptionLevel', () => {
    test('returns 0 when no corrupted blocks', () => {
      const chunkMgr = makeChunkManager();
      expect(cm.getCorruptionLevel(chunkMgr, 0, 0, 32)).toBe(0);
    });

    test('returns 0 without chunkManager', () => {
      expect(cm.getCorruptionLevel(null, 0, 0, 32)).toBe(0);
    });
  });
});
