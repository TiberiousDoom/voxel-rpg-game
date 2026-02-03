/**
 * Chunk - A 16x16x16 voxel container
 *
 * Stores block data in a flat Uint8Array for memory efficiency.
 * Includes heightmap for fast surface queries.
 */

import {
  CHUNK_SIZE,
  CHUNK_SIZE_Y,
  CHUNK_SIZE_SQ,
  CHUNK_SIZE_CUBED,
  blockIndex,
  isInBounds,
} from './coordinates.js';
import { BlockTypes } from './blockTypes.js';

// Chunk states
export const ChunkState = {
  EMPTY: 'empty',
  LOADING: 'loading',
  READY: 'ready',
  DIRTY: 'dirty',
  UNLOADING: 'unloading',
};

/**
 * Chunk class - represents a 16³ section of the world
 */
export class Chunk {
  /**
   * Create a new chunk
   * @param {number} chunkX - Chunk X coordinate
   * @param {number} chunkZ - Chunk Z coordinate
   */
  constructor(chunkX, chunkZ) {
    // Chunk coordinates (not world coordinates)
    this.x = chunkX;
    this.z = chunkZ;

    // Unique key for this chunk
    this.key = `${chunkX},${chunkZ}`;

    // Block data - flat Uint8Array (4KB for 16³)
    this.blocks = new Uint8Array(CHUNK_SIZE_CUBED);

    // Heightmap for fast surface queries (256 bytes for 16x16)
    this.heightMap = new Uint8Array(CHUNK_SIZE_SQ);

    // State tracking
    this.state = ChunkState.EMPTY;
    this.isDirty = false;
    this.meshDirty = true;
    this.lastModified = 0;

    // Rendering - will be set by ChunkMeshBuilder
    this.mesh = null;
    this.lodLevel = 0;
    this.lodMeshes = [null, null, null]; // LOD 0, 1, 2

    // Neighbor references (for seamless meshing)
    this.neighbors = {
      north: null,  // +Z
      south: null,  // -Z
      east: null,   // +X
      west: null,   // -X
    };
  }

  /**
   * Get block at local coordinates
   * @param {number} x - Local X (0-15)
   * @param {number} y - Local Y (0-15)
   * @param {number} z - Local Z (0-15)
   * @returns {number} Block type ID
   */
  getBlock(x, y, z) {
    if (!isInBounds(x, y, z)) {
      return BlockTypes.AIR;
    }
    return this.blocks[blockIndex(x, y, z)];
  }

  /**
   * Set block at local coordinates
   * @param {number} x - Local X (0-15)
   * @param {number} y - Local Y (0-15)
   * @param {number} z - Local Z (0-15)
   * @param {number} blockType - Block type ID
   * @returns {boolean} True if block was changed
   */
  setBlock(x, y, z, blockType) {
    if (!isInBounds(x, y, z)) {
      return false;
    }

    const index = blockIndex(x, y, z);
    const oldBlock = this.blocks[index];

    if (oldBlock !== blockType) {
      this.blocks[index] = blockType;
      this.isDirty = true;
      this.meshDirty = true;
      this.lastModified = Date.now();

      // Update heightmap
      this.updateHeightMapColumn(x, z);

      return true;
    }
    return false;
  }

  /**
   * Set multiple blocks at once (more efficient for terrain generation)
   * @param {Array<{x: number, y: number, z: number, type: number}>} blocks
   */
  setBlocks(blocks) {
    for (const { x, y, z, type } of blocks) {
      if (isInBounds(x, y, z)) {
        this.blocks[blockIndex(x, y, z)] = type;
      }
    }
    this.isDirty = true;
    this.meshDirty = true;
    this.lastModified = Date.now();
    this.rebuildHeightMap();
  }

  /**
   * Fill entire chunk with a block type
   * @param {number} blockType - Block type ID
   */
  fill(blockType) {
    this.blocks.fill(blockType);
    this.isDirty = true;
    this.meshDirty = true;
    this.rebuildHeightMap();
  }

  /**
   * Update heightmap for a single column
   * @param {number} x - Local X (0-15)
   * @param {number} z - Local Z (0-15)
   */
  updateHeightMapColumn(x, z) {
    const hmIndex = x + z * CHUNK_SIZE;
    let height = 0;

    // Scan from top down to find highest non-air block
    for (let y = CHUNK_SIZE_Y - 1; y >= 0; y--) {
      if (this.blocks[blockIndex(x, y, z)] !== BlockTypes.AIR) {
        height = y + 1;
        break;
      }
    }

    this.heightMap[hmIndex] = height;
  }

  /**
   * Rebuild entire heightmap (after bulk operations)
   */
  rebuildHeightMap() {
    for (let x = 0; x < CHUNK_SIZE; x++) {
      for (let z = 0; z < CHUNK_SIZE; z++) {
        this.updateHeightMapColumn(x, z);
      }
    }
  }

  /**
   * Get highest solid block Y in a column
   * @param {number} x - Local X (0-15)
   * @param {number} z - Local Z (0-15)
   * @returns {number} Height (0 if column is empty)
   */
  getHeight(x, z) {
    if (x < 0 || x >= CHUNK_SIZE || z < 0 || z >= CHUNK_SIZE) {
      return 0;
    }
    return this.heightMap[x + z * CHUNK_SIZE];
  }

  /**
   * Check if chunk is completely empty (all air)
   * @returns {boolean}
   */
  isEmpty() {
    for (let i = 0; i < CHUNK_SIZE_CUBED; i++) {
      if (this.blocks[i] !== BlockTypes.AIR) {
        return false;
      }
    }
    return true;
  }

  /**
   * Count non-air blocks
   * @returns {number}
   */
  getBlockCount() {
    let count = 0;
    for (let i = 0; i < CHUNK_SIZE_CUBED; i++) {
      if (this.blocks[i] !== BlockTypes.AIR) {
        count++;
      }
    }
    return count;
  }

  /**
   * Serialize chunk data for saving/network
   * @returns {Object}
   */
  serialize() {
    return {
      x: this.x,
      z: this.z,
      // Convert Uint8Array to regular array for JSON
      blocks: Array.from(this.blocks),
      heightMap: Array.from(this.heightMap),
      lastModified: this.lastModified,
    };
  }

  /**
   * Serialize to binary format (more compact)
   * @returns {ArrayBuffer}
   */
  serializeBinary() {
    // Header: 2 int32s for coordinates + blocks + heightmap
    const headerSize = 8; // 2 * 4 bytes
    const buffer = new ArrayBuffer(headerSize + CHUNK_SIZE_CUBED + CHUNK_SIZE_SQ);
    const view = new DataView(buffer);

    // Write coordinates
    view.setInt32(0, this.x, true);
    view.setInt32(4, this.z, true);

    // Copy blocks
    const blocksView = new Uint8Array(buffer, headerSize, CHUNK_SIZE_CUBED);
    blocksView.set(this.blocks);

    // Copy heightmap
    const heightView = new Uint8Array(buffer, headerSize + CHUNK_SIZE_CUBED, CHUNK_SIZE_SQ);
    heightView.set(this.heightMap);

    return buffer;
  }

  /**
   * Deserialize chunk from saved data
   * @param {Object} data - Serialized chunk data
   * @returns {Chunk}
   */
  static deserialize(data) {
    const chunk = new Chunk(data.x, data.z);
    chunk.blocks = new Uint8Array(data.blocks);
    chunk.heightMap = new Uint8Array(data.heightMap);
    chunk.lastModified = data.lastModified || 0;
    chunk.state = ChunkState.READY;
    chunk.isDirty = false;
    chunk.meshDirty = true;
    return chunk;
  }

  /**
   * Deserialize from binary format
   * @param {ArrayBuffer} buffer
   * @returns {Chunk}
   */
  static deserializeBinary(buffer) {
    const view = new DataView(buffer);
    const headerSize = 8;

    const x = view.getInt32(0, true);
    const z = view.getInt32(4, true);

    const chunk = new Chunk(x, z);
    chunk.blocks = new Uint8Array(buffer, headerSize, CHUNK_SIZE_CUBED);
    chunk.heightMap = new Uint8Array(buffer, headerSize + CHUNK_SIZE_CUBED, CHUNK_SIZE_SQ);
    chunk.state = ChunkState.READY;
    chunk.isDirty = false;
    chunk.meshDirty = true;

    return chunk;
  }

  /**
   * Set neighbor reference
   * @param {'north' | 'south' | 'east' | 'west'} direction
   * @param {Chunk | null} chunk
   */
  setNeighbor(direction, chunk) {
    this.neighbors[direction] = chunk;
    // Mark mesh dirty when neighbors change (for seamless edges)
    this.meshDirty = true;
  }

  /**
   * Get block from neighbor if coordinates are out of bounds
   * @param {number} x - Local X (can be -1 or 16)
   * @param {number} y - Local Y
   * @param {number} z - Local Z (can be -1 or 16)
   * @returns {number} Block type
   */
  getBlockWithNeighbors(x, y, z) {
    // Out of Y bounds
    if (y < 0 || y >= CHUNK_SIZE_Y) {
      return BlockTypes.AIR;
    }

    // Check X bounds
    if (x < 0) {
      return this.neighbors.west?.getBlock(CHUNK_SIZE - 1, y, z) ?? BlockTypes.AIR;
    }
    if (x >= CHUNK_SIZE) {
      return this.neighbors.east?.getBlock(0, y, z) ?? BlockTypes.AIR;
    }

    // Check Z bounds
    if (z < 0) {
      return this.neighbors.south?.getBlock(x, y, CHUNK_SIZE - 1) ?? BlockTypes.AIR;
    }
    if (z >= CHUNK_SIZE) {
      return this.neighbors.north?.getBlock(x, y, 0) ?? BlockTypes.AIR;
    }

    // In bounds
    return this.blocks[blockIndex(x, y, z)];
  }

  /**
   * Cleanup resources when unloading
   */
  dispose() {
    // Dispose Three.js meshes
    if (this.mesh) {
      this.mesh.geometry?.dispose();
      this.mesh.material?.dispose();
      this.mesh = null;
    }

    for (let i = 0; i < this.lodMeshes.length; i++) {
      if (this.lodMeshes[i]) {
        this.lodMeshes[i].geometry?.dispose();
        this.lodMeshes[i].material?.dispose();
        this.lodMeshes[i] = null;
      }
    }

    // Clear neighbor references
    this.neighbors = { north: null, south: null, east: null, west: null };

    // Help GC
    this.blocks = null;
    this.heightMap = null;
    this.state = ChunkState.UNLOADING;
  }
}

export default Chunk;
