import { Chunk, ChunkState } from '../Chunk';
import { BlockTypes } from '../blockTypes';
import { CHUNK_SIZE, CHUNK_SIZE_Y, CHUNK_SIZE_CUBED, CHUNK_SIZE_SQ } from '../coordinates';

describe('Chunk', () => {
  let chunk;

  beforeEach(() => {
    chunk = new Chunk(3, -2);
  });

  describe('constructor', () => {
    it('sets chunk coordinates', () => {
      expect(chunk.x).toBe(3);
      expect(chunk.z).toBe(-2);
    });

    it('creates unique key', () => {
      expect(chunk.key).toBe('3,-2');
    });

    it('initializes blocks array with correct size', () => {
      expect(chunk.blocks).toBeInstanceOf(Uint8Array);
      expect(chunk.blocks.length).toBe(CHUNK_SIZE_CUBED);
    });

    it('initializes heightmap', () => {
      expect(chunk.heightMap).toBeInstanceOf(Uint8Array);
      expect(chunk.heightMap.length).toBe(CHUNK_SIZE_SQ);
    });

    it('starts in EMPTY state', () => {
      expect(chunk.state).toBe(ChunkState.EMPTY);
    });

    it('initializes LOD fields', () => {
      expect(chunk.lodLevel).toBe(0);
      expect(chunk.lodMeshes).toEqual([null, null, null]);
    });
  });

  describe('getBlock / setBlock', () => {
    it('returns AIR for unset blocks', () => {
      expect(chunk.getBlock(0, 0, 0)).toBe(BlockTypes.AIR);
    });

    it('sets and gets a block', () => {
      chunk.setBlock(5, 10, 3, BlockTypes.STONE);
      expect(chunk.getBlock(5, 10, 3)).toBe(BlockTypes.STONE);
    });

    it('returns true when block changes', () => {
      expect(chunk.setBlock(0, 0, 0, BlockTypes.DIRT)).toBe(true);
    });

    it('returns false when setting same block type', () => {
      chunk.setBlock(0, 0, 0, BlockTypes.STONE);
      expect(chunk.setBlock(0, 0, 0, BlockTypes.STONE)).toBe(false);
    });

    it('returns AIR for out-of-bounds coordinates', () => {
      expect(chunk.getBlock(-1, 0, 0)).toBe(BlockTypes.AIR);
      expect(chunk.getBlock(0, CHUNK_SIZE_Y, 0)).toBe(BlockTypes.AIR);
      expect(chunk.getBlock(CHUNK_SIZE, 0, 0)).toBe(BlockTypes.AIR);
    });

    it('returns false for out-of-bounds set', () => {
      expect(chunk.setBlock(-1, 0, 0, BlockTypes.STONE)).toBe(false);
    });

    it('marks chunk dirty on block change', () => {
      chunk.isDirty = false;
      chunk.meshDirty = false;
      chunk.setBlock(0, 0, 0, BlockTypes.GRASS);
      expect(chunk.isDirty).toBe(true);
      expect(chunk.meshDirty).toBe(true);
    });

    it('updates lastModified on block change', () => {
      const before = chunk.lastModified;
      chunk.setBlock(0, 0, 0, BlockTypes.DIRT);
      expect(chunk.lastModified).toBeGreaterThan(before);
    });
  });

  describe('heightMap', () => {
    it('tracks highest non-air block per column', () => {
      chunk.setBlock(5, 0, 3, BlockTypes.BEDROCK);
      chunk.setBlock(5, 1, 3, BlockTypes.STONE);
      chunk.setBlock(5, 2, 3, BlockTypes.DIRT);
      chunk.setBlock(5, 3, 3, BlockTypes.GRASS);
      expect(chunk.getHeight(5, 3)).toBe(4); // height = highest Y + 1
    });

    it('returns 0 for empty columns', () => {
      expect(chunk.getHeight(0, 0)).toBe(0);
    });

    it('updates when block is removed', () => {
      chunk.setBlock(0, 5, 0, BlockTypes.STONE);
      expect(chunk.getHeight(0, 0)).toBe(6);
      chunk.setBlock(0, 5, 0, BlockTypes.AIR);
      expect(chunk.getHeight(0, 0)).toBe(0);
    });

    it('returns 0 for out-of-bounds queries', () => {
      expect(chunk.getHeight(-1, 0)).toBe(0);
      expect(chunk.getHeight(CHUNK_SIZE, 0)).toBe(0);
    });
  });

  describe('setBlocks (bulk)', () => {
    it('sets multiple blocks at once', () => {
      chunk.setBlocks([
        { x: 0, y: 0, z: 0, type: BlockTypes.STONE },
        { x: 1, y: 0, z: 0, type: BlockTypes.DIRT },
        { x: 2, y: 0, z: 0, type: BlockTypes.GRASS },
      ]);
      expect(chunk.getBlock(0, 0, 0)).toBe(BlockTypes.STONE);
      expect(chunk.getBlock(1, 0, 0)).toBe(BlockTypes.DIRT);
      expect(chunk.getBlock(2, 0, 0)).toBe(BlockTypes.GRASS);
    });

    it('marks dirty after bulk set', () => {
      chunk.isDirty = false;
      chunk.setBlocks([{ x: 0, y: 0, z: 0, type: BlockTypes.STONE }]);
      expect(chunk.isDirty).toBe(true);
      expect(chunk.meshDirty).toBe(true);
    });
  });

  describe('fill', () => {
    it('fills entire chunk with block type', () => {
      chunk.fill(BlockTypes.STONE);
      expect(chunk.getBlock(0, 0, 0)).toBe(BlockTypes.STONE);
      expect(chunk.getBlock(15, 15, 15)).toBe(BlockTypes.STONE);
    });
  });

  describe('isEmpty', () => {
    it('returns true for empty chunk', () => {
      expect(chunk.isEmpty()).toBe(true);
    });

    it('returns false after setting a block', () => {
      chunk.setBlock(0, 0, 0, BlockTypes.STONE);
      expect(chunk.isEmpty()).toBe(false);
    });
  });

  describe('getBlockCount', () => {
    it('returns 0 for empty chunk', () => {
      expect(chunk.getBlockCount()).toBe(0);
    });

    it('counts non-air blocks', () => {
      chunk.setBlock(0, 0, 0, BlockTypes.STONE);
      chunk.setBlock(1, 0, 0, BlockTypes.DIRT);
      expect(chunk.getBlockCount()).toBe(2);
    });
  });

  describe('serialization', () => {
    beforeEach(() => {
      chunk.setBlock(5, 10, 3, BlockTypes.STONE);
      chunk.setBlock(0, 0, 0, BlockTypes.BEDROCK);
    });

    it('serializes to JSON-compatible object', () => {
      const data = chunk.serialize();
      expect(data.x).toBe(3);
      expect(data.z).toBe(-2);
      expect(Array.isArray(data.blocks)).toBe(true);
      expect(data.blocks.length).toBe(CHUNK_SIZE_CUBED);
    });

    it('deserializes from JSON data', () => {
      const data = chunk.serialize();
      const restored = Chunk.deserialize(data);
      expect(restored.x).toBe(3);
      expect(restored.z).toBe(-2);
      expect(restored.getBlock(5, 10, 3)).toBe(BlockTypes.STONE);
      expect(restored.getBlock(0, 0, 0)).toBe(BlockTypes.BEDROCK);
      expect(restored.state).toBe(ChunkState.READY);
    });

    it('serializes to binary format', () => {
      const buffer = chunk.serializeBinary();
      expect(buffer).toBeInstanceOf(ArrayBuffer);
      // 8 bytes header + 4096 blocks + 256 heightmap
      expect(buffer.byteLength).toBe(8 + CHUNK_SIZE_CUBED + CHUNK_SIZE_SQ);
    });

    it('round-trips through binary serialization', () => {
      const buffer = chunk.serializeBinary();
      const restored = Chunk.deserializeBinary(buffer);
      expect(restored.x).toBe(3);
      expect(restored.z).toBe(-2);
      expect(restored.getBlock(5, 10, 3)).toBe(BlockTypes.STONE);
      expect(restored.getBlock(0, 0, 0)).toBe(BlockTypes.BEDROCK);
    });
  });

  describe('neighbors', () => {
    it('initializes with null neighbors', () => {
      expect(chunk.neighbors.north).toBeNull();
      expect(chunk.neighbors.south).toBeNull();
      expect(chunk.neighbors.east).toBeNull();
      expect(chunk.neighbors.west).toBeNull();
    });

    it('sets neighbor reference', () => {
      const neighbor = new Chunk(3, -1);
      chunk.setNeighbor('north', neighbor);
      expect(chunk.neighbors.north).toBe(neighbor);
    });

    it('marks mesh dirty when neighbor changes', () => {
      chunk.meshDirty = false;
      chunk.setNeighbor('north', new Chunk(3, -1));
      expect(chunk.meshDirty).toBe(true);
    });
  });

  describe('getBlockWithNeighbors', () => {
    it('returns blocks within bounds normally', () => {
      chunk.setBlock(5, 5, 5, BlockTypes.STONE);
      expect(chunk.getBlockWithNeighbors(5, 5, 5)).toBe(BlockTypes.STONE);
    });

    it('returns AIR for out-of-Y-bounds', () => {
      expect(chunk.getBlockWithNeighbors(0, -1, 0)).toBe(BlockTypes.AIR);
      expect(chunk.getBlockWithNeighbors(0, CHUNK_SIZE_Y, 0)).toBe(BlockTypes.AIR);
    });

    it('queries west neighbor for x < 0', () => {
      const west = new Chunk(2, -2);
      west.setBlock(CHUNK_SIZE - 1, 5, 5, BlockTypes.IRON_ORE);
      chunk.setNeighbor('west', west);
      expect(chunk.getBlockWithNeighbors(-1, 5, 5)).toBe(BlockTypes.IRON_ORE);
    });

    it('returns AIR when neighbor is missing', () => {
      expect(chunk.getBlockWithNeighbors(-1, 5, 5)).toBe(BlockTypes.AIR);
    });
  });

  describe('dispose', () => {
    it('clears blocks and neighbors', () => {
      chunk.setBlock(0, 0, 0, BlockTypes.STONE);
      chunk.dispose();
      expect(chunk.blocks).toBeNull();
      expect(chunk.heightMap).toBeNull();
      expect(chunk.state).toBe(ChunkState.UNLOADING);
    });
  });
});
