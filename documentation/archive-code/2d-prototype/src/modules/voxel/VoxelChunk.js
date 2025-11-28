/**
 * VoxelChunk.js - 3D chunk storage for voxel blocks
 *
 * Stores a 3D array of blocks within a chunk using memory-efficient typed arrays.
 * Each chunk is 32x32 tiles horizontally with 16 Z-levels (vertical layers).
 *
 * Part of Phase 1: Voxel Data Architecture
 *
 * Features:
 * - Memory-efficient Uint8Array storage (16KB per chunk)
 * - Fast block access by x, y, z coordinates
 * - Metadata storage for block rotation/state (separate array)
 * - Run-length encoding for save compression
 * - Layer-by-layer iteration for rendering
 *
 * Coordinate system:
 * - X: East-West (horizontal)
 * - Y: North-South (horizontal)
 * - Z: Up-Down (vertical layers, 0 = bottom)
 *
 * Usage:
 *   const chunk = new VoxelChunk(0, 0);
 *   chunk.setBlock(5, 5, 0, BlockType.STONE);
 *   const block = chunk.getBlock(5, 5, 0); // BlockType.STONE
 */

import { BlockType } from './BlockTypes.js';

export class VoxelChunk {
  /**
   * Create a voxel chunk
   * @param {number} chunkX - Chunk X coordinate (in chunk units)
   * @param {number} chunkY - Chunk Y coordinate (in chunk units)
   * @param {object} options - Configuration options
   */
  constructor(chunkX, chunkY, options = {}) {
    this.chunkX = chunkX;
    this.chunkY = chunkY;

    // Configuration
    this.config = {
      sizeX: options.sizeX || 32,      // Tiles in X direction
      sizeY: options.sizeY || 32,      // Tiles in Y direction
      sizeZ: options.sizeZ || 16,      // Z-levels (vertical layers)
      ...options
    };

    // Calculate total blocks
    this.totalBlocks = this.config.sizeX * this.config.sizeY * this.config.sizeZ;

    // Block data storage (Uint8Array for memory efficiency)
    // Index = z * (sizeX * sizeY) + y * sizeX + x
    this.blocks = new Uint8Array(this.totalBlocks);

    // Metadata storage (rotation, state, etc.) - only allocated when needed
    // Uses Uint8Array: bits 0-1 = rotation (0-3), bits 2-7 = state
    this.metadata = null;

    // Dirty flag for rendering optimization
    this.dirty = true;
    this.dirtyLayers = new Set();  // Track which Z-levels changed

    // Statistics
    this.stats = {
      nonAirBlocks: 0,
      lastModified: Date.now()
    };

    // Fill with air by default
    this.blocks.fill(BlockType.AIR);
  }

  /**
   * Convert local x, y, z coordinates to array index
   * @private
   * @param {number} x - Local X (0 to sizeX-1)
   * @param {number} y - Local Y (0 to sizeY-1)
   * @param {number} z - Z-level (0 to sizeZ-1)
   * @returns {number} Array index
   */
  _getIndex(x, y, z) {
    return z * (this.config.sizeX * this.config.sizeY) +
           y * this.config.sizeX +
           x;
  }

  /**
   * Check if coordinates are within chunk bounds
   * @private
   * @param {number} x - Local X
   * @param {number} y - Local Y
   * @param {number} z - Z-level
   * @returns {boolean}
   */
  _inBounds(x, y, z) {
    return x >= 0 && x < this.config.sizeX &&
           y >= 0 && y < this.config.sizeY &&
           z >= 0 && z < this.config.sizeZ;
  }

  /**
   * Get block type at local coordinates
   * @param {number} x - Local X (0 to sizeX-1)
   * @param {number} y - Local Y (0 to sizeY-1)
   * @param {number} z - Z-level (0 to sizeZ-1)
   * @returns {number} Block type (BlockType enum value)
   */
  getBlock(x, y, z) {
    if (!this._inBounds(x, y, z)) {
      return BlockType.AIR;
    }
    return this.blocks[this._getIndex(x, y, z)];
  }

  /**
   * Set block type at local coordinates
   * @param {number} x - Local X (0 to sizeX-1)
   * @param {number} y - Local Y (0 to sizeY-1)
   * @param {number} z - Z-level (0 to sizeZ-1)
   * @param {number} blockType - Block type (BlockType enum value)
   * @returns {boolean} True if block was set successfully
   */
  setBlock(x, y, z, blockType) {
    if (!this._inBounds(x, y, z)) {
      return false;
    }

    const index = this._getIndex(x, y, z);
    const oldBlock = this.blocks[index];

    // Skip if no change
    if (oldBlock === blockType) {
      return true;
    }

    // Update statistics
    if (oldBlock === BlockType.AIR && blockType !== BlockType.AIR) {
      this.stats.nonAirBlocks++;
    } else if (oldBlock !== BlockType.AIR && blockType === BlockType.AIR) {
      this.stats.nonAirBlocks--;
    }

    // Set block
    this.blocks[index] = blockType;

    // Mark as dirty
    this.dirty = true;
    this.dirtyLayers.add(z);
    this.stats.lastModified = Date.now();

    return true;
  }

  /**
   * Get block metadata at local coordinates
   * @param {number} x - Local X
   * @param {number} y - Local Y
   * @param {number} z - Z-level
   * @returns {number} Metadata byte (0 if not set)
   */
  getMetadata(x, y, z) {
    if (!this._inBounds(x, y, z) || !this.metadata) {
      return 0;
    }
    return this.metadata[this._getIndex(x, y, z)];
  }

  /**
   * Set block metadata at local coordinates
   * @param {number} x - Local X
   * @param {number} y - Local Y
   * @param {number} z - Z-level
   * @param {number} value - Metadata byte
   * @returns {boolean} True if metadata was set successfully
   */
  setMetadata(x, y, z, value) {
    if (!this._inBounds(x, y, z)) {
      return false;
    }

    // Allocate metadata array on first use
    if (!this.metadata) {
      this.metadata = new Uint8Array(this.totalBlocks);
    }

    this.metadata[this._getIndex(x, y, z)] = value;
    this.dirty = true;
    this.dirtyLayers.add(z);
    return true;
  }

  /**
   * Get block rotation (from metadata)
   * @param {number} x - Local X
   * @param {number} y - Local Y
   * @param {number} z - Z-level
   * @returns {number} Rotation (0-3, representing 0, 90, 180, 270 degrees)
   */
  getBlockRotation(x, y, z) {
    return this.getMetadata(x, y, z) & 0x03;  // Bits 0-1
  }

  /**
   * Set block rotation (in metadata)
   * @param {number} x - Local X
   * @param {number} y - Local Y
   * @param {number} z - Z-level
   * @param {number} rotation - Rotation (0-3)
   * @returns {boolean}
   */
  setBlockRotation(x, y, z, rotation) {
    const currentMeta = this.getMetadata(x, y, z);
    const newMeta = (currentMeta & 0xFC) | (rotation & 0x03);  // Clear bits 0-1, set new rotation
    return this.setMetadata(x, y, z, newMeta);
  }

  /**
   * Get all blocks in a specific Z-layer
   * @param {number} z - Z-level
   * @returns {Uint8Array} 2D array of blocks (sizeX * sizeY)
   */
  getLayer(z) {
    if (z < 0 || z >= this.config.sizeZ) {
      return new Uint8Array(this.config.sizeX * this.config.sizeY);
    }

    const layerSize = this.config.sizeX * this.config.sizeY;
    const startIndex = z * layerSize;
    return this.blocks.slice(startIndex, startIndex + layerSize);
  }

  /**
   * Set all blocks in a specific Z-layer
   * @param {number} z - Z-level
   * @param {Uint8Array} layerData - 2D array of blocks (sizeX * sizeY)
   * @returns {boolean}
   */
  setLayer(z, layerData) {
    if (z < 0 || z >= this.config.sizeZ) {
      return false;
    }

    const layerSize = this.config.sizeX * this.config.sizeY;
    const startIndex = z * layerSize;

    // Update statistics (count non-air blocks)
    let oldNonAir = 0;
    let newNonAir = 0;

    for (let i = 0; i < layerSize; i++) {
      if (this.blocks[startIndex + i] !== BlockType.AIR) oldNonAir++;
      if (layerData[i] !== BlockType.AIR) newNonAir++;
      this.blocks[startIndex + i] = layerData[i];
    }

    this.stats.nonAirBlocks += (newNonAir - oldNonAir);
    this.dirty = true;
    this.dirtyLayers.add(z);
    this.stats.lastModified = Date.now();

    return true;
  }

  /**
   * Fill entire chunk with a block type
   * @param {number} blockType - Block type
   */
  fill(blockType) {
    this.blocks.fill(blockType);
    this.stats.nonAirBlocks = blockType === BlockType.AIR ? 0 : this.totalBlocks;
    this.dirty = true;
    for (let z = 0; z < this.config.sizeZ; z++) {
      this.dirtyLayers.add(z);
    }
    this.stats.lastModified = Date.now();
  }

  /**
   * Fill a region within the chunk
   * @param {number} x1 - Start X
   * @param {number} y1 - Start Y
   * @param {number} z1 - Start Z
   * @param {number} x2 - End X (inclusive)
   * @param {number} y2 - End Y (inclusive)
   * @param {number} z2 - End Z (inclusive)
   * @param {number} blockType - Block type to fill with
   * @returns {number} Number of blocks changed
   */
  fillRegion(x1, y1, z1, x2, y2, z2, blockType) {
    let changed = 0;

    // Clamp to chunk bounds
    x1 = Math.max(0, Math.min(x1, this.config.sizeX - 1));
    y1 = Math.max(0, Math.min(y1, this.config.sizeY - 1));
    z1 = Math.max(0, Math.min(z1, this.config.sizeZ - 1));
    x2 = Math.max(0, Math.min(x2, this.config.sizeX - 1));
    y2 = Math.max(0, Math.min(y2, this.config.sizeY - 1));
    z2 = Math.max(0, Math.min(z2, this.config.sizeZ - 1));

    for (let z = z1; z <= z2; z++) {
      for (let y = y1; y <= y2; y++) {
        for (let x = x1; x <= x2; x++) {
          if (this.setBlock(x, y, z, blockType)) {
            changed++;
          }
        }
      }
    }

    return changed;
  }

  /**
   * Iterate over all blocks in the chunk
   * @param {function} callback - Called with (x, y, z, blockType, metadata)
   * @param {boolean} skipAir - Skip air blocks (default true)
   */
  forEach(callback, skipAir = true) {
    for (let z = 0; z < this.config.sizeZ; z++) {
      for (let y = 0; y < this.config.sizeY; y++) {
        for (let x = 0; x < this.config.sizeX; x++) {
          const blockType = this.getBlock(x, y, z);
          if (skipAir && blockType === BlockType.AIR) continue;

          const metadata = this.getMetadata(x, y, z);
          callback(x, y, z, blockType, metadata);
        }
      }
    }
  }

  /**
   * Iterate over blocks in a specific Z-layer
   * @param {number} z - Z-level
   * @param {function} callback - Called with (x, y, blockType, metadata)
   * @param {boolean} skipAir - Skip air blocks (default true)
   */
  forEachInLayer(z, callback, skipAir = true) {
    if (z < 0 || z >= this.config.sizeZ) return;

    for (let y = 0; y < this.config.sizeY; y++) {
      for (let x = 0; x < this.config.sizeX; x++) {
        const blockType = this.getBlock(x, y, z);
        if (skipAir && blockType === BlockType.AIR) continue;

        const metadata = this.getMetadata(x, y, z);
        callback(x, y, blockType, metadata);
      }
    }
  }

  /**
   * Find all blocks of a specific type
   * @param {number} blockType - Block type to find
   * @returns {Array<{x: number, y: number, z: number}>}
   */
  findBlocks(blockType) {
    const results = [];

    for (let z = 0; z < this.config.sizeZ; z++) {
      for (let y = 0; y < this.config.sizeY; y++) {
        for (let x = 0; x < this.config.sizeX; x++) {
          if (this.getBlock(x, y, z) === blockType) {
            results.push({ x, y, z });
          }
        }
      }
    }

    return results;
  }

  /**
   * Check if chunk has any non-air blocks
   * @returns {boolean}
   */
  isEmpty() {
    return this.stats.nonAirBlocks === 0;
  }

  /**
   * Check if a specific Z-layer has any non-air blocks
   * @param {number} z - Z-level
   * @returns {boolean}
   */
  isLayerEmpty(z) {
    if (z < 0 || z >= this.config.sizeZ) return true;

    const layerSize = this.config.sizeX * this.config.sizeY;
    const startIndex = z * layerSize;

    for (let i = 0; i < layerSize; i++) {
      if (this.blocks[startIndex + i] !== BlockType.AIR) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get the highest non-air block at a position
   * @param {number} x - Local X
   * @param {number} y - Local Y
   * @returns {number} Z-level of highest block, or -1 if column is empty
   */
  getHighestBlock(x, y) {
    if (x < 0 || x >= this.config.sizeX || y < 0 || y >= this.config.sizeY) {
      return -1;
    }

    for (let z = this.config.sizeZ - 1; z >= 0; z--) {
      if (this.getBlock(x, y, z) !== BlockType.AIR) {
        return z;
      }
    }

    return -1;
  }

  /**
   * Get the lowest non-air block at a position
   * @param {number} x - Local X
   * @param {number} y - Local Y
   * @returns {number} Z-level of lowest block, or -1 if column is empty
   */
  getLowestBlock(x, y) {
    if (x < 0 || x >= this.config.sizeX || y < 0 || y >= this.config.sizeY) {
      return -1;
    }

    for (let z = 0; z < this.config.sizeZ; z++) {
      if (this.getBlock(x, y, z) !== BlockType.AIR) {
        return z;
      }
    }

    return -1;
  }

  /**
   * Clear dirty flags
   */
  clearDirty() {
    this.dirty = false;
    this.dirtyLayers.clear();
  }

  /**
   * Check if chunk needs re-rendering
   * @returns {boolean}
   */
  isDirty() {
    return this.dirty;
  }

  /**
   * Get dirty layers that need re-rendering
   * @returns {Set<number>}
   */
  getDirtyLayers() {
    return this.dirtyLayers;
  }

  /**
   * Get world coordinates for a local position
   * @param {number} localX - Local X
   * @param {number} localY - Local Y
   * @returns {{x: number, y: number}}
   */
  localToWorld(localX, localY) {
    return {
      x: this.chunkX * this.config.sizeX + localX,
      y: this.chunkY * this.config.sizeY + localY
    };
  }

  /**
   * Get statistics about the chunk
   * @returns {object}
   */
  getStats() {
    return {
      ...this.stats,
      totalBlocks: this.totalBlocks,
      airBlocks: this.totalBlocks - this.stats.nonAirBlocks,
      fillPercentage: (this.stats.nonAirBlocks / this.totalBlocks) * 100,
      hasMetadata: this.metadata !== null,
      memoryUsage: this.blocks.byteLength + (this.metadata ? this.metadata.byteLength : 0)
    };
  }

  /**
   * Export chunk data for saving
   * Uses run-length encoding for compression
   * @returns {object}
   */
  toJSON() {
    // Run-length encode blocks for compression
    const rleBlocks = this._runLengthEncode(this.blocks);

    const data = {
      chunkX: this.chunkX,
      chunkY: this.chunkY,
      config: this.config,
      blocks: rleBlocks,
      stats: this.stats
    };

    // Only include metadata if it exists and has non-zero values
    if (this.metadata) {
      const hasData = this.metadata.some(v => v !== 0);
      if (hasData) {
        data.metadata = this._runLengthEncode(this.metadata);
      }
    }

    return data;
  }

  /**
   * Import chunk data from save
   * @param {object} data - Saved chunk data
   * @returns {VoxelChunk}
   */
  static fromJSON(data) {
    const chunk = new VoxelChunk(data.chunkX, data.chunkY, data.config);

    // Decode RLE blocks
    chunk.blocks = chunk._runLengthDecode(data.blocks, chunk.totalBlocks);

    // Decode metadata if present
    if (data.metadata) {
      chunk.metadata = chunk._runLengthDecode(data.metadata, chunk.totalBlocks);
    }

    // Restore stats
    if (data.stats) {
      chunk.stats = { ...chunk.stats, ...data.stats };
    } else {
      // Recalculate non-air blocks
      chunk.stats.nonAirBlocks = 0;
      for (let i = 0; i < chunk.blocks.length; i++) {
        if (chunk.blocks[i] !== BlockType.AIR) {
          chunk.stats.nonAirBlocks++;
        }
      }
    }

    chunk.dirty = true;
    return chunk;
  }

  /**
   * Run-length encode a Uint8Array
   * @private
   * @param {Uint8Array} data - Data to encode
   * @returns {Array<[number, number]>} Array of [value, count] pairs
   */
  _runLengthEncode(data) {
    const encoded = [];
    let currentValue = data[0];
    let count = 1;

    for (let i = 1; i < data.length; i++) {
      if (data[i] === currentValue && count < 255) {
        count++;
      } else {
        encoded.push([currentValue, count]);
        currentValue = data[i];
        count = 1;
      }
    }

    // Push final run
    encoded.push([currentValue, count]);

    return encoded;
  }

  /**
   * Decode run-length encoded data
   * @private
   * @param {Array<[number, number]>} encoded - Encoded data
   * @param {number} expectedLength - Expected output length
   * @returns {Uint8Array}
   */
  _runLengthDecode(encoded, expectedLength) {
    const data = new Uint8Array(expectedLength);
    let index = 0;

    for (const [value, count] of encoded) {
      for (let i = 0; i < count && index < expectedLength; i++) {
        data[index++] = value;
      }
    }

    return data;
  }
}

/**
 * Lightweight chunk reference for chunk management
 * Stores chunk coordinates and state without block data
 */
export class ChunkRef {
  constructor(chunkX, chunkY) {
    this.chunkX = chunkX;
    this.chunkY = chunkY;
    this.key = `${chunkX},${chunkY}`;
    this.loaded = false;
    this.lastAccess = Date.now();
    this.modified = false;
  }

  /**
   * Mark as accessed (for LRU cache)
   */
  touch() {
    this.lastAccess = Date.now();
  }
}
