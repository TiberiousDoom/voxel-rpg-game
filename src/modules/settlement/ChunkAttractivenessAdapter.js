/**
 * ChunkAttractivenessAdapter.js — Wraps the chunk-scanning AttractivenessCalculator
 * so it fits the module interface (getScore/getWallCount pattern).
 */

import { calculateAttractiveness } from '../../systems/settlement/AttractivenessCalculator';

class ChunkAttractivenessAdapter {
  constructor() {
    this._score = 0;
    this._wallCount = 0;
  }

  /**
   * Recalculate attractiveness by scanning chunks near the settlement center.
   *
   * @param {number[]} center - [x, y, z] settlement center
   * @param {Object} chunkAdapter - Must expose getRawChunkManager()
   * @param {Object} storeSnapshot - Zustand store snapshot (for inventory, npcs, rifts)
   */
  recalculate(center, chunkAdapter, storeSnapshot) {
    const result = calculateAttractiveness(center, chunkAdapter.getRawChunkManager(), storeSnapshot);
    this._score = result.score;
    this._wallCount = result.wallCount;
  }

  getScore() {
    return this._score;
  }

  getWallCount() {
    return this._wallCount;
  }
}

export default ChunkAttractivenessAdapter;
