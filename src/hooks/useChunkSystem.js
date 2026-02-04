/**
 * useChunkSystem - Hook for managing the chunk-based world
 *
 * Sets up ChunkManager and WorkerPool, handles cleanup.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { ChunkManager } from '../systems/chunks/ChunkManager.js';
import { WorkerPool } from '../systems/workers/WorkerPool.js';

/**
 * Hook for using the chunk system
 * @param {Object} options
 * @param {number} options.seed - World seed
 * @param {number} options.viewDistance - View distance in chunks
 * @returns {Object} Chunk system state and controls
 */
export function useChunkSystem(options = {}) {
  const {
    seed = Math.floor(Math.random() * 2147483647),
    viewDistance = 6,
  } = options;

  const [isReady, setIsReady] = useState(false);
  const [stats, setStats] = useState(null);

  const chunkManagerRef = useRef(null);
  const workerPoolRef = useRef(null);
  const updateIntervalRef = useRef(null);

  // Initialize chunk system
  useEffect(() => {
    // Create worker pool
    const workerPool = new WorkerPool(
      new URL('../workers/chunkWorker.js', import.meta.url),
      Math.min(navigator.hardwareConcurrency || 4, 4)
    );
    workerPoolRef.current = workerPool;

    // Create chunk manager
    const chunkManager = new ChunkManager({
      seed,
      viewDistance,
    });
    chunkManager.setWorkerPool(workerPool);
    chunkManagerRef.current = chunkManager;

    setIsReady(true);

    // Stats update interval
    updateIntervalRef.current = setInterval(() => {
      if (chunkManagerRef.current) {
        setStats(chunkManagerRef.current.getStats());
      }
    }, 1000);

    // Cleanup
    return () => {
      setIsReady(false);

      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }

      if (chunkManagerRef.current) {
        chunkManagerRef.current.dispose();
        chunkManagerRef.current = null;
      }

      if (workerPoolRef.current) {
        workerPoolRef.current.terminate();
        workerPoolRef.current = null;
      }
    };
  }, [seed, viewDistance]);

  // Update player position
  const updatePlayerPosition = useCallback((x, z) => {
    if (chunkManagerRef.current) {
      // eslint-disable-next-line no-console
      console.log('[useChunkSystem] updatePlayerPosition:', x, z);
      chunkManagerRef.current.updatePlayerPosition(x, z);
    }
  }, []);

  // Update chunk system (call every frame)
  const update = useCallback((deltaTime) => {
    if (chunkManagerRef.current) {
      chunkManagerRef.current.update(deltaTime);
    }
  }, []);

  // Get block at world position
  const getBlock = useCallback((x, y, z) => {
    if (chunkManagerRef.current) {
      return chunkManagerRef.current.getBlock(x, y, z);
    }
    return 0;
  }, []);

  // Set block at world position
  const setBlock = useCallback((x, y, z, blockType) => {
    if (chunkManagerRef.current) {
      return chunkManagerRef.current.setBlock(x, y, z, blockType);
    }
    return false;
  }, []);

  // Get chunk at coordinates
  const getChunk = useCallback((chunkX, chunkZ) => {
    if (chunkManagerRef.current) {
      return chunkManagerRef.current.getChunk(chunkX, chunkZ);
    }
    return null;
  }, []);

  return {
    isReady,
    stats,
    chunkManager: chunkManagerRef.current,
    workerPool: workerPoolRef.current,
    updatePlayerPosition,
    update,
    getBlock,
    setBlock,
    getChunk,
  };
}

export default useChunkSystem;
